import React from 'react';
import { Sun, Moon, Smartphone } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const ThemeSelector: React.FC = () => {
  const { settings, updateSettings, currentTheme } = useTheme();
  
  return (
    <div className="theme-selector space-y-6 bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
      <div>
        <h3 className="font-semibold mb-3">Modo de Aparência</h3>
        <div className="grid grid-cols-3 gap-3">
          <ThemeOption
            active={settings.theme === 'light'}
            onClick={() => updateSettings({ theme: 'light' })}
            icon={<Sun className="w-6 h-6" />}
            label="Claro"
          />
          <ThemeOption
            active={settings.theme === 'dark'}
            onClick={() => updateSettings({ theme: 'dark' })}
            icon={<Moon className="w-6 h-6" />}
            label="Escuro"
          />
          <ThemeOption
            active={settings.theme === 'auto'}
            onClick={() => updateSettings({ theme: 'auto' })}
            icon={<Smartphone className="w-6 h-6" />}
            label="Auto"
          />
        </div>
      </div>
      
      {(settings.theme === 'dark' || (settings.theme === 'auto' && currentTheme === 'dark')) && (
        <div>
          <h3 className="font-semibold mb-3">Estilo do Modo Escuro</h3>
          <div className="grid grid-cols-3 gap-3">
            <DarkThemeOption
              active={settings.darkTheme === 'default'}
              onClick={() => updateSettings({ darkTheme: 'default' })}
              label="Padrão"
              preview="bg-gray-800"
            />
            <DarkThemeOption
              active={settings.darkTheme === 'oled'}
              onClick={() => updateSettings({ darkTheme: 'oled' })}
              label="OLED"
              preview="bg-black"
            />
            <DarkThemeOption
              active={settings.darkTheme === 'sepia'}
              onClick={() => updateSettings({ darkTheme: 'sepia' })}
              label="Sépia"
              preview="bg-amber-900"
            />
          </div>
        </div>
      )}
      
      {settings.theme === 'auto' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Agendamento Automático</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoSchedule}
                onChange={(e) => updateSettings({ autoSchedule: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {settings.autoSchedule && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Iniciar às</label>
                <input
                  type="time"
                  value={settings.scheduleStart}
                  onChange={(e) => updateSettings({ scheduleStart: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Terminar às</label>
                <input
                  type="time"
                  value={settings.scheduleEnd}
                  onChange={(e) => updateSettings({ scheduleEnd: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ThemeOption: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center justify-center p-4 rounded-lg border-2 transition
      ${active 
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
        : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
      }
    `}
  >
    <div className="mb-2">{icon}</div>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const DarkThemeOption: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  preview: string;
}> = ({ active, onClick, label, preview }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center justify-center p-4 rounded-lg border-2 transition
      ${active 
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
        : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
      }
    `}
  >
    <div className={`w-12 h-12 ${preview} rounded mb-2`} />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default ThemeSelector;
