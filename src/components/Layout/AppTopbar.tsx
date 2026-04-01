import React from 'react';
import {
  Bell,
  ChevronDown,
  Database,
  HelpCircle,
  History,
  LogOut,
  Moon,
  RefreshCw,
  Settings,
  Sun,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useNotifications } from '../../hooks/useNotifications';
import type { StudyMode } from '../../hooks/useStudyMode';
import { pushApiService } from '../../services/pushApi.service';
import { StudyModeToggle } from '../Dashboard/StudyModeToggle';

type SyncTone = 'success' | 'warning' | 'danger' | 'neutral';
const SHELL_TRANSITION = '240ms cubic-bezier(0.22, 1, 0.36, 1)';
const MICRO_TRANSITION = '180ms ease';

interface AppTopbarProps {
  darkMode: boolean;
  contextEyebrow: string;
  contextTitle: string;
  contextMeta: string;
  syncStatusLabel?: string;
  syncStatusTone?: SyncTone;
  studyMode?: StudyMode;
  onToggleStudyMode?: () => void;
  userName: string;
  userAvatar?: string;
  onOpenHelp?: () => void;
  onToggleDarkMode: () => void;
  onOpenSettings?: () => void;
  onOpenData?: () => void;
  onSyncNow?: () => void;
  disableSyncNow?: boolean;
  onShowConflictHistory?: () => void;
  onLogout: () => void;
}

interface TopbarActionButtonProps {
  darkMode: boolean;
  ariaLabel: string;
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
  indicatorTone?: 'active' | 'attention' | 'muted';
  isActive?: boolean;
}

const getSyncToneClass = (tone: SyncTone, darkMode: boolean): string => {
  if (tone === 'success') {
    return darkMode
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
      : 'border-emerald-300 bg-emerald-50/90 text-emerald-700';
  }

  if (tone === 'warning') {
    return darkMode
      ? 'border-amber-400/20 bg-amber-400/10 text-amber-200'
      : 'border-amber-300 bg-amber-50/90 text-amber-700';
  }

  if (tone === 'danger') {
    return darkMode
      ? 'border-rose-400/20 bg-rose-400/10 text-rose-200'
      : 'border-rose-300 bg-rose-50/90 text-rose-700';
  }

  return darkMode
    ? 'border-slate-700 bg-slate-900/80 text-slate-300'
    : 'border-slate-200 bg-slate-100/85 text-slate-600';
};

const TopbarActionButton = ({
  darkMode,
  ariaLabel,
  title,
  onClick,
  children,
  indicatorTone,
  isActive = false,
}: TopbarActionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    title={title}
    className={`relative inline-flex h-10 w-10 items-center justify-center rounded-[18px] border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 ${
      darkMode
        ? 'border-slate-800/90 bg-slate-950/80 text-slate-100 hover:-translate-y-[1px] hover:bg-slate-900 focus-visible:ring-cyan-400 focus-visible:ring-offset-slate-950'
        : 'border-slate-200/90 bg-white/84 text-slate-700 hover:-translate-y-[1px] hover:bg-white focus-visible:ring-cyan-500 focus-visible:ring-offset-slate-100'
    } ${isActive ? (darkMode ? 'shadow-[0_12px_20px_-16px_rgba(34,211,238,0.28)]' : 'shadow-[0_12px_20px_-16px_rgba(14,165,233,0.22)]') : ''} focus-visible:ring-offset-2`}
    style={{ transition: `transform ${MICRO_TRANSITION}, box-shadow ${MICRO_TRANSITION}, background-color ${MICRO_TRANSITION}, border-color ${MICRO_TRANSITION}, color ${MICRO_TRANSITION}` }}
  >
    {children}
    {indicatorTone ? (
      <span
        className={`absolute right-[7px] top-[7px] h-2.5 w-2.5 rounded-full ${
          indicatorTone === 'active'
            ? 'bg-emerald-400'
            : indicatorTone === 'attention'
              ? 'bg-amber-400'
              : darkMode
                ? 'bg-slate-500'
                : 'bg-slate-300'
        }`}
      />
    ) : null}
  </button>
);

const resolveNotificationIndicator = (
  permission: NotificationPermission | 'unsupported',
): 'active' | 'attention' | 'muted' => {
  if (permission === 'granted') {
    return 'active';
  }

  if (permission === 'default') {
    return 'attention';
  }

  return 'muted';
};

export const AppTopbar = ({
  darkMode,
  contextEyebrow,
  contextTitle,
  contextMeta,
  syncStatusLabel,
  syncStatusTone = 'neutral',
  studyMode = 'exploration',
  onToggleStudyMode,
  userName,
  userAvatar,
  onOpenHelp,
  onToggleDarkMode,
  onOpenSettings,
  onOpenData,
  onSyncNow,
  disableSyncNow = false,
  onShowConflictHistory,
  onLogout,
}: AppTopbarProps) => {
  const avatarIsImage = Boolean(userAvatar && (/^data:image\//i.test(userAvatar) || /^https?:\/\//i.test(userAvatar) || /^blob:/i.test(userAvatar)));
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const [notificationPermission, setNotificationPermission] = React.useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const { isSupported, requestPermission } = useNotifications();

  React.useEffect(() => {
    const syncPermission = () => {
      if (typeof Notification === 'undefined') {
        setNotificationPermission('unsupported');
        return;
      }

      setNotificationPermission(Notification.permission);
    };

    syncPermission();
    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);

    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
    };
  }, []);

  React.useEffect(() => {
    if (!profileMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [profileMenuOpen]);

  React.useEffect(() => {
    if (!profileMenuOpen) {
      return undefined;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [profileMenuOpen]);

  const handleNotificationsClick = React.useCallback(async () => {
    if (!isSupported) {
      toast.error('Notificacoes indisponiveis neste navegador.');
      setNotificationPermission('unsupported');
      return;
    }

    if (notificationPermission === 'denied') {
      toast.error('As notificacoes estao bloqueadas. Ajuste a permissao no navegador.');
      onOpenSettings?.();
      return;
    }

    if (notificationPermission === 'granted') {
      const subscribed = await pushApiService.subscribeUser();
      toast.success(subscribed ? 'Lembretes ativos para continuar amanha.' : 'Permissao ativa. Nao consegui registrar a assinatura agora.');
      setNotificationPermission('granted');
      return;
    }

    const granted = await requestPermission();
    const nextPermission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
    setNotificationPermission(nextPermission);

    if (!granted) {
      toast.error('Permissao de notificacao nao concedida.');
      return;
    }

    const subscribed = await pushApiService.subscribeUser();
    toast.success(subscribed ? 'Lembretes ativados. Sua continuidade fica pronta por aqui.' : 'Permissao concedida. Falhou ao registrar a assinatura agora.');
  }, [isSupported, notificationPermission, onOpenSettings, requestPermission]);

  const runMenuAction = (action?: () => void) => () => {
    setProfileMenuOpen(false);
    action?.();
  };

  return (
    <header className="sticky top-2 z-40 mb-3.5">
      <div
        className={`rounded-[24px] border px-3.5 py-2.5 shadow-[0_16px_34px_rgba(148,163,184,0.14)] backdrop-blur-xl transition-colors sm:px-4 ${
          darkMode
            ? 'border-slate-800/85 bg-[linear-gradient(135deg,rgba(2,6,23,0.95)_0%,rgba(15,23,42,0.93)_100%)]'
            : 'border-white/75 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.08),transparent_22%),linear-gradient(135deg,rgba(244,247,251,0.95)_0%,rgba(236,242,248,0.93)_100%)]'
        }`}
        style={{ transition: `box-shadow ${SHELL_TRANSITION}, background-color ${SHELL_TRANSITION}, border-color ${SHELL_TRANSITION}` }}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between xl:flex-1 xl:pr-4">
            <div className="min-w-0">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {contextEyebrow}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className={`truncate text-[17px] font-black tracking-[-0.03em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {contextTitle}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                    darkMode ? 'border-slate-700 bg-slate-950/80 text-slate-300' : 'border-white/70 bg-white/82 text-slate-500'
                  }`}
                >
                  {contextMeta}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {onToggleStudyMode ? <StudyModeToggle mode={studyMode} onToggle={onToggleStudyMode} /> : null}
              {syncStatusLabel ? (
                <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold ${getSyncToneClass(syncStatusTone, darkMode)}`}>
                  {syncStatusLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5">
            <TopbarActionButton
              darkMode={darkMode}
              ariaLabel="Abrir ajuda e suporte"
              title="Ajuda e suporte"
              onClick={onOpenHelp}
            >
              <HelpCircle className="h-4 w-4" />
            </TopbarActionButton>

            <TopbarActionButton
              darkMode={darkMode}
              ariaLabel="Notificacoes"
              title="Notificacoes"
              onClick={() => {
                void handleNotificationsClick();
              }}
              indicatorTone={resolveNotificationIndicator(notificationPermission)}
              isActive={notificationPermission === 'granted'}
            >
              <Bell className="h-4 w-4" />
            </TopbarActionButton>

            <TopbarActionButton
              darkMode={darkMode}
              ariaLabel={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
              onClick={onToggleDarkMode}
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </TopbarActionButton>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((current) => !current)}
                className={`inline-flex items-center gap-2 rounded-[18px] border px-2.5 py-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 ${
                  darkMode
                    ? 'border-slate-800/90 bg-slate-950/80 text-slate-100 hover:bg-slate-900 focus-visible:ring-cyan-400 focus-visible:ring-offset-slate-950'
                    : 'border-slate-200/90 bg-white/84 text-slate-700 hover:bg-white focus-visible:ring-cyan-500 focus-visible:ring-offset-slate-100'
                } focus-visible:ring-offset-2`}
                style={{ transition: `transform ${MICRO_TRANSITION}, box-shadow ${MICRO_TRANSITION}, background-color ${MICRO_TRANSITION}, border-color ${MICRO_TRANSITION}, color ${MICRO_TRANSITION}` }}
                aria-expanded={profileMenuOpen}
                aria-label="Abrir menu do perfil"
                title="Perfil"
              >
                <span className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-100/90'}`}>
                  {avatarIsImage ? (
                    <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
                  ) : userAvatar ? (
                    <span className="text-sm">{userAvatar}</span>
                  ) : (
                    <User className={`h-4 w-4 ${darkMode ? 'text-slate-300' : 'text-slate-500'}`} />
                  )}
                </span>
                <span className="hidden max-w-[116px] truncate text-sm font-semibold md:inline">{userName}</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <div
                aria-hidden={!profileMenuOpen}
                className={`absolute right-0 top-[calc(100%+0.55rem)] w-[246px] rounded-[22px] border p-2 shadow-[0_20px_34px_-22px_rgba(15,23,42,0.28)] transition-all duration-200 ${
                  darkMode ? 'border-slate-800 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
                } ${
                  profileMenuOpen ? 'pointer-events-auto translate-y-0 opacity-100 scale-100' : 'pointer-events-none -translate-y-1.5 opacity-0 scale-[0.98]'
                }`}
                style={{ transition: `opacity ${MICRO_TRANSITION}, transform ${MICRO_TRANSITION}` }}
              >
                  <div className={`rounded-[18px] px-3.5 py-3 ${darkMode ? 'bg-slate-900/85' : 'bg-slate-50'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Conta</p>
                    <p className="mt-1 truncate text-sm font-semibold">{userName}</p>
                  </div>

                  <div className="mt-2 space-y-1">
                    <button
                      type="button"
                      onClick={runMenuAction(onOpenSettings)}
                      className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                        darkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                      }`}
                    >
                      <Settings className="h-4 w-4" />
                      Ajustes
                    </button>
                    <button
                      type="button"
                      onClick={runMenuAction(onOpenData)}
                      className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                        darkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                      }`}
                    >
                      <Database className="h-4 w-4" />
                      Dados
                    </button>
                    {onSyncNow ? (
                      <button
                        type="button"
                        onClick={runMenuAction(disableSyncNow ? undefined : onSyncNow)}
                        disabled={disableSyncNow}
                        className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                          darkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Sincronizar agora
                      </button>
                    ) : null}
                    {onShowConflictHistory ? (
                      <button
                        type="button"
                        onClick={runMenuAction(onShowConflictHistory)}
                        className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                          darkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                        }`}
                      >
                        <History className="h-4 w-4" />
                        Ver conflitos
                      </button>
                    ) : null}
                  </div>

                  <div className={`mt-2 border-t pt-2 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <button
                      type="button"
                      onClick={runMenuAction(onLogout)}
                      className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                        darkMode ? 'text-rose-200 hover:bg-rose-950/40' : 'text-rose-600 hover:bg-rose-50'
                      }`}
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
