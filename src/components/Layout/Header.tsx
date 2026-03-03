import React from 'react';
import { LogOut, Moon, Sun, User } from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import { ZeroBaseLogo } from './ZeroBaseLogo';

interface HeaderProps {
  userName: string;
  userAvatar?: string;
  darkMode: boolean;
  currentTheme: string;
  syncStatusLabel?: string;
  syncStatusTone?: 'success' | 'warning' | 'danger' | 'neutral';
  onSyncNow?: () => void;
  disableSyncNow?: boolean;
  onToggleDarkMode: () => void;
  onSelectTheme: (theme: string) => void;
  onLogout: () => void;
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
  onToggleDarkMode,
  onSelectTheme,
  onLogout 
}) => {
  const avatarIsImage = Boolean(userAvatar && (/^data:image\//i.test(userAvatar) || /^https?:\/\//i.test(userAvatar)));
  const syncClass =
    syncStatusTone === 'success'
      ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/30'
      : syncStatusTone === 'warning'
        ? 'text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/30'
        : syncStatusTone === 'danger'
          ? 'text-rose-700 bg-rose-100 dark:text-rose-200 dark:bg-rose-900/30'
          : 'text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-700';

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo e Título */}
        <ZeroBaseLogo />

        {/* Usuário e Ações */}
        <div className="flex items-center gap-4">
          {/* Nome do Usuário */}
          <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
            <span className="h-7 w-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-sm">
              {avatarIsImage ? (
                <img src={userAvatar} alt={userName} className="h-full w-full rounded-full object-cover" />
              ) : userAvatar ? (
                userAvatar
              ) : (
                <User size={16} className="text-gray-600 dark:text-gray-400" />
              )}
            </span>
            <span className="font-semibold text-gray-800 dark:text-white">
              {userName}
            </span>
          </div>

          {/* Seletor de Tema */}
          <ThemeSelector currentTheme={currentTheme} onSelectTheme={onSelectTheme} />

          {syncStatusLabel && (
            <span className={`hidden lg:inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${syncClass}`}>
              {syncStatusLabel}
            </span>
          )}

          {onSyncNow && (
            <button
              onClick={onSyncNow}
              disabled={disableSyncNow}
              className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-xs font-semibold disabled:opacity-50"
              title="Sincronizar agora"
            >
              Sincronizar agora
            </button>
          )}

          {/* Toggle Dark Mode */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
          >
            {darkMode ? (
              <Sun className="text-yellow-500" size={24} />
            ) : (
              <Moon className="text-gray-600" size={24} />
            )}
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-semibold"
          >
            <LogOut size={20} />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};
