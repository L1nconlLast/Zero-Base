import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { STORAGE_KEYS } from '../constants';

// ─────────────────────────────────────────────────────────────
// Mock do Supabase client
// ─────────────────────────────────────────────────────────────

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const supabaseClientState = vi.hoisted(() => ({
  isConfigured: true,
}));

vi.mock('../services/supabase.client', () => ({
  get isSupabaseConfigured() {
    return supabaseClientState.isConfigured;
  },
  get supabase() {
    if (!supabaseClientState.isConfigured) {
      return null;
    }

    return {
      auth: {
        signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
        signUp: (...args: unknown[]) => mockSignUp(...args),
        signOut: (...args: unknown[]) => mockSignOut(...args),
        getSession: (...args: unknown[]) => mockGetSession(...args),
        onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      },
    };
  },
}));

// Import depois do mock
import { useAuth } from '../hooks/useAuth';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const FAKE_USER = {
  id: 'uuid-123',
  email: 'joao@medicina.com',
  created_at: '2026-01-01T00:00:00Z',
  user_metadata: { name: 'João Silva' },
};

const FAKE_SESSION = { user: FAKE_USER, access_token: 'token', refresh_token: 'rt' };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  supabaseClientState.isConfigured = true;
  // Por padrão: sem sessão existente, listener retorna unsubscribe
  mockGetSession.mockResolvedValue({ data: { session: null } });
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mockSignOut.mockResolvedValue({ error: null });
});

// ─────────────────────────────────────────────────────────────
// Estado inicial
// ─────────────────────────────────────────────────────────────

describe('useAuth — estado inicial', () => {
  it('começa sem usuário logado após loading', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.supabaseUserId).toBeNull();
  });

  it('expõe funções de login, register e logout', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.register).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });

  it('hidrata sessão existente do Supabase ao montar', async () => {
    mockGetSession.mockResolvedValue({ data: { session: FAKE_SESSION } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.email).toBe('joao@medicina.com');
    expect(result.current.user?.nome).toBe('João Silva');
    expect(result.current.supabaseUserId).toBe('uuid-123');
  });

  it('hidrata sessão local quando Supabase não está configurado', async () => {
    supabaseClientState.isConfigured = false;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({
      user: {
        nome: 'João Local',
        email: 'joao@local.com',
        dataCadastro: '2026-03-14T00:00:00.000Z',
        foto: '🧑‍⚕️',
        examGoal: 'ENEM Medicina',
        examDate: '',
        preferredTrack: 'enem',
      },
      userId: 'local:joao@local.com',
    }));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.email).toBe('joao@local.com');
    expect(result.current.supabaseUserId).toBe('local:joao@local.com');
  });
});

// ─────────────────────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────────────────────

describe('useAuth — register', () => {
  it('registra usuário com dados válidos (sessão auto)', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: FAKE_USER, session: FAKE_SESSION },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { success: boolean; message: string } = { success: false, message: '' };
    await act(async () => {
      res = await result.current.register('João Silva', 'joao@medicina.com', 'Senha@123');
    });

    expect(res.success).toBe(true);
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'joao@medicina.com',
      password: 'Senha@123',
      options: { data: { name: 'João Silva' } },
    });
  });

  it('retorna mensagem amigável quando email já cadastrado', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { success: boolean; message: string } = { success: false, message: '' };
    await act(async () => {
      res = await result.current.register('João', 'joao@med.com', 'Senha@123');
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain('já está cadastrado');
  });

  it('rejeita nome curto (< 3 chars)', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { success: boolean; message: string } = { success: false, message: '' };
    await act(async () => {
      res = await result.current.register('Jo', 'joao@med.com', 'Senha@123');
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain('3 caracteres');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('rejeita senha fraca no cadastro', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { success: boolean; message: string } = { success: false, message: '' };
    await act(async () => {
      res = await result.current.register('João Silva', 'joao@med.com', '123');
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain('8 caracteres');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('lida com signup que exige confirmação por email', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: FAKE_USER, session: null }, // sem sessão = confirmar email
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { success: boolean; message: string } = { success: false, message: '' };
    await act(async () => {
      res = await result.current.register('João Silva', 'joao@med.com', 'Senha@123');
    });

    expect(res.success).toBe(true);
    expect(res.message).toContain('email');
  });

  it('cria conta local quando Supabase não está configurado', async () => {
    supabaseClientState.isConfigured = false;

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { success: boolean; message: string } = { success: false, message: '' };
    await act(async () => {
      res = await result.current.register('João Local', 'joao@local.com', 'Senha@123');
    });

    expect(res.success).toBe(true);
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.nome).toBe('João Local');
    expect(localStorage.getItem(STORAGE_KEYS.SESSION)).toContain('joao@local.com');
  });
});

// ─────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────

describe('useAuth — login', () => {
  it('loga com credenciais corretas', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: FAKE_USER, session: FAKE_SESSION },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { success: boolean; message: string } = { success: false, message: '' };
    await act(async () => {
      res = await result.current.login('joao@medicina.com', 'Senha@123');
    });

    expect(res.success).toBe(true);
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'joao@medicina.com',
      password: 'Senha@123',
    });
  });

  it('retorna erro amigável para credenciais inválidas', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { success: boolean; message: string } = { success: false, message: '' };
    await act(async () => {
      res = await result.current.login('joao@med.com', 'SenhaErrada');
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain('incorretos');
  });

  it('retorna erro para email não confirmado', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email not confirmed' },
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { success: boolean; message: string } = { success: false, message: '' };
    await act(async () => {
      res = await result.current.login('joao@med.com', 'Senha@123');
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain('email');
  });

  it('entra em modo local quando Supabase não está configurado', async () => {
    supabaseClientState.isConfigured = false;

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { success: boolean; message: string } = { success: false, message: '' };
    await act(async () => {
      res = await result.current.login('joao@local.com', 'Senha@123');
    });

    expect(res.success).toBe(true);
    expect(res.message).toContain('modo local');
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.email).toBe('joao@local.com');
    expect(result.current.supabaseUserId).toBe('local:joao@local.com');
  });
});

// ─────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────

describe('useAuth — logout', () => {
  it('limpa o estado após logout', async () => {
    // Começa logado
    mockGetSession.mockResolvedValue({ data: { session: FAKE_SESSION } });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoggedIn).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.supabaseUserId).toBeNull();
    expect(mockSignOut).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// onAuthStateChange listener
// ─────────────────────────────────────────────────────────────

describe('useAuth — onAuthStateChange', () => {
  it('atualiza estado quando sessão muda via listener', async () => {
    let authChangeCallback: (event: string, session: unknown) => void = () => {};
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      authChangeCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simula login via onAuthStateChange
    act(() => {
      authChangeCallback('SIGNED_IN', FAKE_SESSION);
    });

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.email).toBe('joao@medicina.com');
    expect(result.current.supabaseUserId).toBe('uuid-123');

    // Simula logout via onAuthStateChange
    act(() => {
      authChangeCallback('SIGNED_OUT', null);
    });

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('faz unsubscribe no cleanup', async () => {
    const unsubscribe = vi.fn();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });

    const { unmount } = renderHook(() => useAuth());
    await waitFor(() => true);

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
