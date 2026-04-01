import React from 'react';
import { Globe, Target } from 'lucide-react';

import type { StudyMode } from '../../hooks/useStudyMode';

interface StudyModeToggleProps {
  mode: StudyMode;
  onToggle: () => void;
}

export const StudyModeToggle: React.FC<StudyModeToggleProps> = ({ mode, onToggle }) => {
  return (
    <div
      role="group"
      aria-label="Modo de estudo"
      className="inline-flex items-center gap-0.5 rounded-[18px] border border-slate-200/90 bg-slate-100/88 p-1 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-900/88 dark:shadow-none"
    >
      <button
        type="button"
        onClick={() => mode !== 'exploration' && onToggle()}
        aria-label="Modo Exploracao"
        aria-pressed={mode === 'exploration'}
        className={`flex items-center gap-1.5 rounded-[14px] px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
          mode === 'exploration'
            ? 'bg-white text-slate-900 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.18)] dark:bg-slate-800 dark:text-white dark:shadow-none'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
      >
        <Globe size={12} />
        Exploracao
      </button>

      <button
        type="button"
        onClick={() => mode !== 'focus' && onToggle()}
        aria-label="Modo Focado"
        aria-pressed={mode === 'focus'}
        className={`flex items-center gap-1.5 rounded-[14px] px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
          mode === 'focus'
            ? 'text-white shadow-[0_8px_18px_-16px_rgba(14,165,233,0.34)]'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
        style={mode === 'focus' ? { backgroundColor: 'var(--color-primary)' } : undefined}
      >
        <Target size={12} />
        Focado
      </button>
    </div>
  );
};
