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
      className="inline-flex items-center gap-0.5 p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
    >
      <button
        type="button"
        onClick={() => mode !== 'exploration' && onToggle()}
        aria-label="Modo Exploração"
        aria-pressed={mode === 'exploration'}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          mode === 'exploration'
            ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
      >
        <Globe size={12} />
        Exploração
      </button>

      <button
        type="button"
        onClick={() => mode !== 'focus' && onToggle()}
        aria-label="Modo Focado"
        aria-pressed={mode === 'focus'}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          mode === 'focus'
            ? 'shadow-sm text-white'
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
