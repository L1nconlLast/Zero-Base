import React from 'react';
import { Clock3, Timer } from 'lucide-react';

type StudyMode = 'pomodoro' | 'livre';

interface ModeSelectorProps {
  currentMode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex justify-center mb-6">
      <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex shadow-inner w-full max-w-md border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onModeChange('pomodoro')}
          className={`
            flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200
            ${currentMode === 'pomodoro'
              ? 'text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}
          `}
          style={currentMode === 'pomodoro' ? { backgroundColor: 'var(--color-primary)' } : undefined}
        >
          <Clock3 className="w-4 h-4" /> Pomodoro
        </button>

        <button
          onClick={() => onModeChange('livre')}
          className={`
            flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200
            ${currentMode === 'livre'
              ? 'text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}
          `}
          style={currentMode === 'livre' ? { backgroundColor: 'var(--color-primary)' } : undefined}
        >
          <Timer className="w-4 h-4" /> Livre
        </button>
      </div>
    </div>
  );
};

export default ModeSelector;
