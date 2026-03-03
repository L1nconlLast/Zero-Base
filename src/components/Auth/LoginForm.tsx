// ============================================================
// src/components/Auth/LoginForm.tsx
//  Sem "import React" desnecessário (React 17+ JSX transform)
// ============================================================

import { useEffect, useState } from 'react';
import { Mail, Lock, LogIn, Stethoscope, KeyRound, Sparkles, ShieldCheck } from 'lucide-react';

type SocialProvider = 'google' | 'facebook';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void> | void;
  onSocialLogin?: (provider: SocialProvider) => Promise<void> | void;
  onResetPassword?: (email: string) => Promise<{ success: boolean; message: string }>;
  onSwitchToRegister: () => void;
}

export const LoginForm = ({ onLogin, onSocialLogin, onResetPassword, onSwitchToRegister }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);

  useEffect(() => {
    const prefillEmail = localStorage.getItem('auth_prefill_email');
    if (prefillEmail) {
      setEmail(prefillEmail);
      localStorage.removeItem('auth_prefill_email');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!onResetPassword) return;
    setError('');

    if (!email.trim()) {
      setError('Digite seu e-mail acima para recuperar a senha.');
      return;
    }

    setLoading(true);
    try {
      const result = await onResetPassword(email.trim());
      if (result.success) {
        setResetSent(true);
        setShowResetForm(false);
      } else {
        setError(result.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (provider: SocialProvider) => {
    if (!onSocialLogin) return;
    setError('');
    setLoading(true);
    try {
      await onSocialLogin(provider);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar login social.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-blue-100 dark:border-gray-700 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-blue-700 dark:text-blue-200" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">Entrar</h1>
          <p className="text-gray-600 dark:text-gray-400">Acesse sua jornada rumo à medicina com foco e consistência</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <ShieldCheck className="w-3 h-3" /> Acesso seguro
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              <Sparkles className="w-3 h-3" /> Plataforma inteligente
            </span>
          </div>
        </div>

        {resetSent && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
            📧 Email de recuperação enviado! Verifique sua caixa de entrada.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate aria-label="Formulário de login" className="space-y-5">
          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="seu@email.com"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
                disabled={loading}
                required
              />
            </div>
          </div>

          {onResetPassword && (
            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResetForm(!showResetForm);
                  setResetSent(false);
                  setError('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <KeyRound size={14} aria-hidden="true" />
                Esqueci minha senha
              </button>
            </div>
          )}

          {showResetForm && onResetPassword && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Digite seu e-mail acima e clique em &quot;Enviar&quot; para receber o link de recuperação.
              </p>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar email de recuperação'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn size={20} aria-hidden="true" />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          {onSocialLogin && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">ou continuar com</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSocial('google')}
                  disabled={loading}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleSocial('facebook')}
                  disabled={loading}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Facebook
                </button>
              </div>
            </>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Não tem conta?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Cadastre-se
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
