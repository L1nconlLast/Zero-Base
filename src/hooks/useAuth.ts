/**
 * useAuth — Autenticação via Supabase Auth
 *
 * Fonte primária: supabase.auth (signUp / signInWithPassword / signOut)
 * Perfil na tabela public.users é garantido pela trigger SQL em auth.users.
 * Mantém compatibilidade com o tipo local `User` (nome, email, foto, etc.)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase.client';
import { logger } from '../utils/logger';
import { STORAGE_KEYS } from '../constants';
import { validateStrongPassword } from '../utils/passwordPolicy';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

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

interface LocalSessionPayload {
  user: User;
  userId: string;
}

// ─── helpers ────────────────────────────────────────────────────

/** Converte o objeto Supabase Auth → tipo local User */
const mapSupabaseUser = (su: SupabaseUser): User => ({
  nome: su.user_metadata?.name || su.email?.split('@')[0] || 'Usuário',
  email: su.email || '',
  dataCadastro: su.created_at || new Date().toISOString(),
  foto: su.user_metadata?.avatar_url || '🧑‍⚕️',
  examGoal: su.user_metadata?.exam_goal || 'ENEM',
  examDate: su.user_metadata?.exam_date || '',
  preferredTrack: su.user_metadata?.preferred_track || 'enem',
});

const buildLocalUserId = (email: string) => `local:${email.trim().toLowerCase()}`;

const createLocalUser = (email: string, name?: string): User => {
  const normalizedEmail = email.trim().toLowerCase();

  return {
    nome: name?.trim() || normalizedEmail.split('@')[0] || 'Usuário',
    email: normalizedEmail,
    dataCadastro: new Date().toISOString(),
    foto: '🧑‍⚕️',
    examGoal: 'ENEM',
    examDate: '',
    preferredTrack: 'enem',
  };
};

const persistLocalSession = (session: LocalSessionPayload) => {
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  localStorage.removeItem('medicinaSession');
};

const readLocalSession = (): LocalSessionPayload | null => {
  try {
    const rawSession = localStorage.getItem(STORAGE_KEYS.SESSION) || localStorage.getItem('medicinaSession');
    if (!rawSession) return null;

    const parsed = JSON.parse(rawSession) as Partial<LocalSessionPayload>;
    if (!parsed.user || !parsed.userId || !parsed.user.email) {
      return null;
    }

    return {
      user: parsed.user,
      userId: parsed.userId,
    };
  } catch {
    return null;
  }
};

// ─── hook ───────────────────────────────────────────────────────

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // Evita corrida de efeitos
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true; // Reset no remount (StrictMode)
    return () => { mountedRef.current = false; };
  }, []);

  // ── Listener principal: onAuthStateChange ──
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      const localSession = readLocalSession();
      if (localSession && mountedRef.current) {
        setUser(localSession.user);
        setSupabaseUserId(localSession.userId);
        setIsLoggedIn(true);
      }
      setLoading(false);
      return;
    }

    const client = supabase; // narrow para non-null

    // 1) Hidratar sessão existente
    const hydrateSession = async () => {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user && mountedRef.current) {
          setUser(mapSupabaseUser(session.user));
          setSupabaseUserId(session.user.id);
          setIsLoggedIn(true);
        }
      } catch (err) {
        logger.warn('Erro ao hidratar sessão', 'Auth', err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    void hydrateSession();

    // 2) Escutar mudanças de auth
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (!mountedRef.current) return;

        if (session?.user) {
          setUser(mapSupabaseUser(session.user));
          setSupabaseUserId(session.user.id);
          setIsLoggedIn(true);
        } else {
          setUser(null);
          setSupabaseUserId(null);
          setIsLoggedIn(false);
        }
      },
    );

    return () => { subscription.unsubscribe(); };
  }, []);

  // ── Login ──
  const login = useCallback(
    async (email: string, senha: string): Promise<{ success: boolean; message: string }> => {
      if (!supabase) {
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanEmail || !senha.trim()) {
          return { success: false, message: 'Preencha e-mail e senha.' };
        }

        const localUser = createLocalUser(cleanEmail);
        const localSession = {
          user: localUser,
          userId: buildLocalUserId(cleanEmail),
        };

        persistLocalSession(localSession);
        setUser(localUser);
        setSupabaseUserId(localSession.userId);
        setIsLoggedIn(true);

        return { success: true, message: 'Entrando em modo local.' };
      }

      const cleanEmail = email.trim().toLowerCase();

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: senha,
      });

      if (error) {
        logger.warn('Falha no login', 'Auth', { error: error.message });

        // Mensagens amigáveis
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, message: 'Email ou senha incorretos.' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { success: false, message: 'Confirme seu email antes de entrar.' };
        }
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Login realizado com sucesso!' };
    },
    [],
  );

  // ── Cadastro ──
  const register = useCallback(
    async (
      nome: string,
      email: string,
      senha: string,
    ): Promise<{ success: boolean; message: string }> => {
      if (!supabase) {
        const cleanName = nome.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanName.length < 3) {
          return { success: false, message: 'Nome deve ter no mínimo 3 caracteres.' };
        }
        const passwordValidation = validateStrongPassword(senha);
        if (!passwordValidation.valid) {
          return { success: false, message: passwordValidation.message };
        }

        const localUser = createLocalUser(cleanEmail, cleanName);
        const localSession = {
          user: localUser,
          userId: buildLocalUserId(cleanEmail),
        };

        persistLocalSession(localSession);
        setUser(localUser);
        setSupabaseUserId(localSession.userId);
        setIsLoggedIn(true);

        return { success: true, message: 'Conta local criada com sucesso!' };
      }

      const cleanName = nome.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (cleanName.length < 3) {
        return { success: false, message: 'Nome deve ter no mínimo 3 caracteres.' };
      }
      const passwordValidation = validateStrongPassword(senha);
      if (!passwordValidation.valid) {
        return { success: false, message: passwordValidation.message };
      }

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
        logger.warn('Falha no cadastro', 'Auth', { error: error.message });

        const lowerError = error.message.toLowerCase();

        if (lowerError.includes('already registered') || lowerError.includes('already been registered')) {
          logger.info('signUp already_registered', 'Auth', { email: cleanEmail });
          return { success: false, message: 'Este email já está cadastrado.' };
        }
        if (lowerError.includes('invalid api key')) {
          return {
            success: false,
            message: 'Erro de configuração do Supabase. Verifique as variáveis de ambiente.',
          };
        }
        if (lowerError.includes('over_email_send_rate_limit') || lowerError.includes('email rate limit exceeded')) {
          logger.warn('signUp rate_limit', 'Auth', { email: cleanEmail, error: error.message });
          return {
            success: false,
            message: 'Limite de envio de email temporariamente atingido. Tente novamente em alguns minutos.',
          };
        }
        return { success: false, message: error.message };
      }

      if (data?.user) {
        logger.info('signUp success', 'Auth', {
          email: cleanEmail,
          userId: data.user.id,
          emailConfirmationRequired: !data.session,
        });

        if (!data.session) {
          return {
            success: true,
            message: 'Conta criada! Verifique seu email para confirmar.',
          };
        }

        return {
          success: true,
          message: 'Cadastro realizado com sucesso!',
        };
      }

      return {
        success: false,
        message: 'Não foi possível concluir o cadastro. Tente novamente.',
      };
    },
    [],
  );

  // ── Logout ──
  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSupabaseUserId(null);
    setIsLoggedIn(false);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }, []);

  // ── Esqueci minha senha ──
  const resetPassword = useCallback(
    async (email: string): Promise<{ success: boolean; message: string }> => {
      if (!supabase) {
        return {
          success: false,
          message: 'Recuperação de senha indisponível no modo local.',
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
        message: 'Email de recuperação enviado! Verifique sua caixa de entrada.',
      };
    },
    [],
  );

  // ── Manter compatibilidade ──
  const updateActivity = useCallback(() => {
    // No-op: a sessão é gerenciada pelo Supabase (auto-refresh)
  }, []);

  const loginWithOAuth = useCallback(
    async (provider: OAuthProvider): Promise<{ success: boolean; message: string }> => {
      if (!supabase) {
        return {
          success: false,
          message: 'Login social indisponível enquanto o Supabase não estiver configurado.',
        };
      }

      if (!ENABLED_OAUTH_PROVIDERS.includes(provider)) {
        return {
          success: false,
          message: `${OAUTH_PROVIDER_LABEL[provider]} não está habilitado. Ative o provider no Supabase (Authentication > Providers) e adicione em VITE_SUPABASE_OAUTH_PROVIDERS.`,
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
        message: `Redirecionando para autenticação com ${OAUTH_PROVIDER_LABEL[provider]}...`,
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
