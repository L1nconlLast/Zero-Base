import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase.client';
import { STORAGE_KEYS } from '../constants';
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
const LOCAL_PREVIEW_HOSTS = new Set(['localhost', '127.0.0.1']);

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

type LocalSessionPayload = {
  user: User;
  userId: string;
};

const isLocalPreviewHost = (): boolean =>
  typeof window !== 'undefined' && LOCAL_PREVIEW_HOSTS.has(window.location.hostname);

const shouldUseClientSideAuth = (): boolean =>
  import.meta.env.MODE === 'test' || (import.meta.env.DEV && isLocalPreviewHost());

const buildLocalUserId = (email: string): string => `local:${email.trim().toLowerCase()}`;

const buildLocalUser = (email: string, nome?: string): User => {
  const cleanEmail = email.trim().toLowerCase();
  const derivedName = nome?.trim() || cleanEmail.split('@')[0] || 'Usuario';

  return {
    nome: derivedName,
    email: cleanEmail,
    dataCadastro: new Date().toISOString(),
    foto: 'local-user',
    examGoal: 'ENEM',
    examDate: '',
    preferredTrack: 'enem',
  };
};

const readLocalSession = (): LocalSessionPayload | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawSession = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!rawSession) {
      return null;
    }

    const parsed = JSON.parse(rawSession) as Partial<LocalSessionPayload> | null;
    if (!parsed?.user || typeof parsed.userId !== 'string' || typeof parsed.user.email !== 'string') {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      return null;
    }

    return {
      user: parsed.user,
      userId: parsed.userId,
    };
  } catch (error) {
    logger.warn('Falha ao ler sessao local', 'Auth', error);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    return null;
  }
};

const persistLocalSession = (session: LocalSessionPayload) => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
};

const clearLocalSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(STORAGE_KEYS.SESSION);
};

const mapLoginErrorMessage = (message: string): string => {
  if (/invalid login credentials/i.test(message)) {
    return 'Email ou senha incorretos.';
  }

  if (/email not confirmed/i.test(message)) {
    return 'Confirme seu email antes de entrar.';
  }

  return message;
};

const mapRegisterErrorMessage = (message: string): string => {
  if (/already registered|already exists|user already/i.test(message)) {
    return 'Este e-mail já está cadastrado.';
  }

  return message;
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
      const localSession = readLocalSession();
      if (localSession) {
        setUser(localSession.user);
        setSupabaseUserId(localSession.userId);
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setSupabaseUserId(null);
        setIsLoggedIn(false);
      }

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
          clearLocalSession();
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
          clearLocalSession();
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
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !senha.trim()) {
      return { success: false, message: 'Preencha e-mail e senha.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      const localUser = buildLocalUser(cleanEmail);
      const localSession = {
        user: localUser,
        userId: buildLocalUserId(cleanEmail),
      };

      persistLocalSession(localSession);

      if (mountedRef.current) {
        setUser(localUser);
        setSupabaseUserId(localSession.userId);
        setIsLoggedIn(true);
      }

      return { success: true, message: 'Login realizado em modo local.' };
    }

    if (shouldUseClientSideAuth()) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: senha,
      });

      if (error) {
        const message = mapLoginErrorMessage(error.message);
        logger.warn('Falha no login cliente', 'Auth', { error: message });
        return { success: false, message };
      }

      if (data.user && mountedRef.current) {
        clearLocalSession();
        setUser(mapSupabaseUser(data.user));
        setSupabaseUserId(data.user.id);
        setIsLoggedIn(true);
      }

      return { success: true, message: 'Login realizado com sucesso!' };
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
      const cleanName = nome.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (cleanName.length < 3) {
        return { success: false, message: 'Nome deve ter no minimo 3 caracteres.' };
      }

      const passwordValidation = validateStrongPassword(senha);
      if (!passwordValidation.valid) {
        return { success: false, message: passwordValidation.message };
      }

      if (!isSupabaseConfigured || !supabase) {
        const localUser = buildLocalUser(cleanEmail, cleanName);
        const localSession = {
          user: localUser,
          userId: buildLocalUserId(cleanEmail),
        };

        persistLocalSession(localSession);

        if (mountedRef.current) {
          setUser(localUser);
          setSupabaseUserId(localSession.userId);
          setIsLoggedIn(true);
        }

        return { success: true, message: 'Cadastro realizado com sucesso em modo local!' };
      }

      if (shouldUseClientSideAuth()) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: senha,
          options: {
            data: {
              name: cleanName,
              language: 'pt',
            },
          },
        });

        if (error) {
          const message = mapRegisterErrorMessage(error.message);
          logger.warn('Falha no cadastro cliente', 'Auth', { error: message });
          return { success: false, message };
        }

        if (data.session?.user && mountedRef.current) {
          clearLocalSession();
          setUser(mapSupabaseUser(data.session.user));
          setSupabaseUserId(data.session.user.id);
          setIsLoggedIn(true);
          return { success: true, message: 'Cadastro realizado com sucesso!' };
        }

        if (data.user) {
          return {
            success: true,
            message: 'Cadastro realizado! Verifique seu email para confirmar a conta.',
          };
        }

        return { success: false, message: 'Nao foi possivel concluir o cadastro.' };
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

    clearLocalSession();
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
