import React, { useEffect, useRef, useState } from 'react';
import { Palette } from 'lucide-react';

interface ThemeSelectorProps {
  onSelectTheme: (theme: string) => void;
  currentTheme: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ onSelectTheme, currentTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const themes = [
    { id: 'blue', name: 'Azul', primary: '#3b82f6', secondary: '#8b5cf6' },
    { id: 'green', name: 'Verde', primary: '#10b981', secondary: '#059669' },
    { id: 'purple', name: 'Roxo', primary: '#8b5cf6', secondary: '#7c3aed' },
    { id: 'pink', name: 'Rosa', primary: '#ec4899', secondary: '#db2777' },
    { id: 'orange', name: 'Laranja', primary: '#f97316', secondary: '#ea580c' },
    { id: 'red', name: 'Vermelho', primary: '#ef4444', secondary: '#dc2626' },
    { id: 'teal', name: 'Azul-Verde', primary: '#14b8a6', secondary: '#0d9488' },
    { id: 'indigo', name: 'Índigo', primary: '#6366f1', secondary: '#4f46e5' },
  ];

  const currentThemeData = themes.find((theme) => theme.id === currentTheme) || themes[0];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <Palette size={24} style={{ color: currentThemeData.primary }} />
      </button>

      <div className={`absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 transition-all z-50 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <h3 className="font-bold text-gray-800 dark:text-white mb-3">Escolher Tema</h3>
        
        <div className="grid grid-cols-4 gap-2">
          {themes.map((theme) => (
            <button
              type="button"
              key={theme.id}
              onClick={() => {
                onSelectTheme(theme.id);
                setIsOpen(false);
              }}
              className="relative h-12 rounded-lg transition-all hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                boxShadow: currentTheme === theme.id ? `0 0 0 2px white, 0 0 0 4px ${theme.primary}` : undefined,
              }}
              title={theme.name}
            >
              {currentTheme === theme.id && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-2xl">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
