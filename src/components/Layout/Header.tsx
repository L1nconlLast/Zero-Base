import React from 'react';
import { History, LogOut, Moon, RefreshCw, Sun, User } from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import { ZeroBaseLogo } from './ZeroBaseLogo';
import { StudyModeToggle } from '../Dashboard/StudyModeToggle';
import type { StudyMode } from '../../hooks/useStudyMode';

interface HeaderProps {
  userName: string;
  userAvatar?: string;
  darkMode: boolean;
  currentTheme: string;
  syncStatusLabel?: string;
  syncStatusTone?: 'success' | 'warning' | 'danger' | 'neutral';
  onSyncNow?: () => void;
  disableSyncNow?: boolean;
  onShowConflictHistory?: () => void;
  onToggleDarkMode: () => void;
  onSelectTheme: (theme: string) => void;
  onLogout: () => void;
  studyMode?: StudyMode;
  onToggleStudyMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  userAvatar,
  darkMode,
  currentTheme,
  syncStatusLabel,
  syncStatusTone = 'neutral',
  onSyncNow,
  disableSyncNow = false,
  onShowConflictHistory,
  onToggleDarkMode,
  onSelectTheme,
  onLogout,
  studyMode = 'exploration',
  onToggleStudyMode,
}) => {
  const isFocused = studyMode === 'focus';
  const avatarIsImage = Boolean(userAvatar && (/^data:image\//i.test(userAvatar) || /^https?:\/\//i.test(userAvatar) || /^blob:/i.test(userAvatar)));
  const syncClass =
    syncStatusTone === 'success'
      ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/30'
      : syncStatusTone === 'warning'
        ? 'text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/30'
        : syncStatusTone === 'danger'
          ? 'text-rose-700 bg-rose-100 dark:text-rose-200 dark:bg-rose-900/30'
          : 'text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-700';

  return (
    <header className="sticky top-0 z-50 bg-transparent">
      <div className="mx-auto max-w-[1500px] px-3 pt-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between gap-3 rounded-[28px] border border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.10),transparent_24%),linear-gradient(135deg,rgba(244,247,251,0.96)_0%,rgba(236,242,248,0.94)_100%)] px-4 py-3 shadow-[0_20px_42px_rgba(148,163,184,0.20)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_24%),linear-gradient(135deg,rgba(2,6,23,0.96)_0%,rgba(15,23,42,0.94)_100%)]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-[22px] bg-white/52 px-2.5 py-2 backdrop-blur-sm dark:bg-slate-900/80">
              <ZeroBaseLogo compact />
            </div>

            {!isFocused && (
              <div className="hidden xl:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-400">
                  Workspace do aluno
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Painel claro, modular e pronto para o próximo bloco.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {onToggleStudyMode && (
              <div className="hidden lg:block">
                <StudyModeToggle mode={studyMode} onToggle={onToggleStudyMode} />
              </div>
            )}

            {!isFocused && syncStatusLabel && (
              <span className={`hidden rounded-full px-3 py-1.5 text-[11px] font-semibold md:inline-flex ${syncClass}`}>
                {syncStatusLabel}
              </span>
            )}

            {!isFocused && onShowConflictHistory && (
              <button
                onClick={onShowConflictHistory}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/55 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-white/72 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900"
                title="Ver conflitos resolvidos"
                aria-label="Ver conflitos resolvidos"
              >
                <History size={14} />
                <span className="hidden sm:inline">Conflitos</span>
              </button>
            )}

            {!isFocused && onSyncNow && (
              <button
                onClick={onSyncNow}
                disabled={disableSyncNow}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/55 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-white/72 disabled:opacity-50 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900"
                title="Sincronizar agora"
                aria-label="Sincronizar agora"
              >
                <RefreshCw size={14} />
                <span className="hidden sm:inline">Sincronizar</span>
              </button>
            )}

            {!isFocused && (
              <ThemeSelector currentTheme={currentTheme} onSelectTheme={onSelectTheme} />
            )}

            <button
              onClick={onToggleDarkMode}
              className="rounded-full border border-white/60 bg-white/55 p-2.5 text-slate-700 transition-colors hover:bg-white/72 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900"
              title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
              aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {darkMode ? (
                <Sun className="text-amber-500" size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>

            <div className="hidden items-center gap-2 rounded-full border border-white/60 bg-white/52 px-2 py-1.5 shadow-sm backdrop-blur-sm md:flex dark:border-slate-700 dark:bg-slate-900/80">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/65 bg-white/72 text-sm dark:border-slate-700 dark:bg-slate-800">
                {avatarIsImage ? (
                  <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
                ) : userAvatar ? (
                  userAvatar
                ) : (
                  <User size={16} className="text-slate-500 dark:text-slate-300" />
                )}
              </span>
              <div className="pr-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Conta</p>
                <p className="max-w-[140px] truncate text-sm font-semibold text-slate-900 dark:text-white">{userName}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              aria-label="Sair da conta"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
