import React from 'react';
import { LogOut, Moon, Sun, User } from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import { ZeroBaseLogo } from './ZeroBaseLogo';

interface HeaderProps {
  userName: string;
  userAvatar?: string;
  darkMode: boolean;
  currentTheme: string;
  onToggleDarkMode: () => void;
  onSelectTheme: (theme: string) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  userName, 
  userAvatar,
  darkMode,
  currentTheme,
  onToggleDarkMode,
  onSelectTheme,
  onLogout 
}) => {
  const avatarIsImage = Boolean(userAvatar && (/^data:image\//i.test(userAvatar) || /^https?:\/\//i.test(userAvatar)));

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
