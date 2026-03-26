import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase.client';
import type { User } from '../types';
import { validateStrongPassword } from '../utils/passwordPolicy';
import { logger } from '../utils/logger';

type OAuthProvider = 'google' | 'facebook';

const OAUTH_PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
};

const parseEnabledOAuthProviders = (): OAuthProvider[] => {
  const rawProviders = String(import.meta.env.VITE_SUPABASE_OAUTH_PROVIDERS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const providerSet = new Set<OAuthProvider>();
  rawProviders.forEach((provider) => {
    if (provider === 'google' || provider === 'facebook') {
      providerSet.add(provider);
    }
  });

  return Array.from(providerSet);
};

const ENABLED_OAUTH_PROVIDERS = parseEnabledOAuthProviders();

const mapSupabaseUser = (supabaseUser: SupabaseUser): User => ({
  nome: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuario',
  email: supabaseUser.email || '',
  dataCadastro: supabaseUser.created_at || new Date().toISOString(),
  foto: supabaseUser.user_metadata?.avatar_url || '🧑‍⚕️',
  examGoal: supabaseUser.user_metadata?.exam_goal || 'ENEM',
  examDate: supabaseUser.user_metadata?.exam_date || '',
  preferredTrack: supabaseUser.user_metadata?.preferred_track || 'enem',
});

const extractApiMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const payload = await response.json() as {
      success?: boolean;
      error?: { message?: string };
    };
    return payload.error?.message || fallback;
  } catch {
    return fallback;
  }
};

const parseSessionPayload = async (response: Response): Promise<{
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
}> => {
  const payload = await response.json().catch(() => null) as {
    success?: boolean;
    error?: { message?: string };
    session?: {
      accessToken?: string;
      refreshToken?: string;
    };
  } | null;

  if (!response.ok || !payload) {
    return {
      success: false,
      message: payload?.error?.message || 'Falha ao autenticar usuario.',
    };
  }

  return {
    success: true,
    message: 'ok',
    accessToken: payload.session?.accessToken,
    refreshToken: payload.session?.refreshToken,
  };
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;

    const hydrateSession = async () => {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (!mountedRef.current) {
          return;
        }

        if (session?.user) {
          setUser(mapSupabaseUser(session.user));
          setSupabaseUserId(session.user.id);
          setIsLoggedIn(true);
        } else {
          setUser(null);
          setSupabaseUserId(null);
          setIsLoggedIn(false);
        }
      } catch (error) {
        logger.warn('Erro ao hidratar sessao', 'Auth', error);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    void hydrateSession();

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (!mountedRef.current) {
          return;
        }

        if (session?.user) {
          setUser(mapSupabaseUser(session.user));
          setSupabaseUserId(session.user.id);
          setIsLoggedIn(true);
          return;
        }

        setUser(null);
        setSupabaseUserId(null);
        setIsLoggedIn(false);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, senha: string): Promise<{ success: boolean; message: string }> => {
    if (!supabase) {
      return { success: false, message: 'Supabase nao configurado para login.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !senha.trim()) {
      return { success: false, message: 'Preencha e-mail e senha.' };
    }

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cleanEmail,
        password: senha,
      }),
    });

    const payload = await parseSessionPayload(response);
    if (!payload.success || !payload.accessToken || !payload.refreshToken) {
      logger.warn('Falha no login', 'Auth', { error: payload.message });
      return { success: false, message: payload.message || 'Email ou senha incorretos.' };
    }

    const { error } = await supabase.auth.setSession({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
    });

    if (error) {
      logger.warn('Falha ao persistir sessao', 'Auth', { error: error.message });
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Login realizado com sucesso!' };
  }, []);

  const register = useCallback(
    async (nome: string, email: string, senha: string): Promise<{ success: boolean; message: string }> => {
      if (!supabase) {
        return { success: false, message: 'Supabase nao configurado para cadastro.' };
      }

      const cleanName = nome.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (cleanName.length < 3) {
        return { success: false, message: 'Nome deve ter no minimo 3 caracteres.' };
      }

      const passwordValidation = validateStrongPassword(senha);
      if (!passwordValidation.valid) {
        return { success: false, message: passwordValidation.message };
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password: senha,
        }),
      });

      if (!response.ok) {
        const message = await extractApiMessage(response, 'Nao foi possivel concluir o cadastro.');
        logger.warn('Falha no cadastro', 'Auth', { error: message });
        return { success: false, message };
      }

      const payload = await response.json().catch(() => null) as {
        session?: {
          accessToken?: string;
          refreshToken?: string;
        };
      } | null;

      const accessToken = payload?.session?.accessToken;
      const refreshToken = payload?.session?.refreshToken;
      if (!accessToken || !refreshToken) {
        return { success: false, message: 'Cadastro criado, mas a sessao nao foi retornada.' };
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        logger.warn('Falha ao persistir sessao apos cadastro', 'Auth', { error: error.message });
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Cadastro realizado com sucesso!' };
    },
    [],
  );

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setUser(null);
    setSupabaseUserId(null);
    setIsLoggedIn(false);
  }, []);

  const resetPassword = useCallback(
    async (email: string): Promise<{ success: boolean; message: string }> => {
      if (!supabase) {
        return {
          success: false,
          message: 'Recuperacao de senha indisponivel sem Supabase configurado.',
        };
      }

      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        return { success: false, message: 'Informe seu email.' };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        logger.warn('Erro ao enviar reset de senha', 'Auth', { error: error.message });
        return { success: false, message: error.message };
      }

      return {
        success: true,
        message: 'Email de recuperacao enviado! Verifique sua caixa de entrada.',
      };
    },
    [],
  );

  const updateActivity = useCallback(() => {
    // No-op: sessao gerenciada pelo Supabase
  }, []);

  const loginWithOAuth = useCallback(
    async (provider: OAuthProvider): Promise<{ success: boolean; message: string }> => {
      if (!supabase) {
        return {
          success: false,
          message: 'Login social indisponivel enquanto o Supabase nao estiver configurado.',
        };
      }

      if (!ENABLED_OAUTH_PROVIDERS.includes(provider)) {
        return {
          success: false,
          message: `${OAUTH_PROVIDER_LABEL[provider]} nao esta habilitado. Ative o provider no Supabase e adicione em VITE_SUPABASE_OAUTH_PROVIDERS.`,
        };
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });

      if (error) {
        logger.warn('Falha no OAuth login', 'Auth', { provider, error: error.message });
        return { success: false, message: error.message };
      }

      return {
        success: true,
        message: `Redirecionando para autenticacao com ${OAUTH_PROVIDER_LABEL[provider]}...`,
      };
    },
    [],
  );

  return {
    user,
    supabaseUserId,
    isLoggedIn,
    loading,
    login,
    register,
    logout,
    resetPassword,
    loginWithOAuth,
    enabledOAuthProviders: ENABLED_OAUTH_PROVIDERS,
    updateActivity,
  };
};
