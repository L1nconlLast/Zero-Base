import React from 'react';
import { Play, RefreshCw } from 'lucide-react';

interface StudyPrimaryCTAProps {
  onContinue: () => void;
  onRecalculate?: () => void;
  label?: string;
}

export const StudyPrimaryCTA: React.FC<StudyPrimaryCTAProps> = ({
  onContinue,
  onRecalculate,
  label = 'Continuar estudo',
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-5">
      <button
        type="button"
        onClick={onContinue}
        aria-label="Continuar estudo"
        className="flex items-center gap-2 py-3 px-6 rounded-xl font-bold text-sm text-white transition hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 shadow-[0_4px_14px_rgba(37,99,235,0.3)]"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        <Play size={14} fill="white" />
        {label}
      </button>

      {onRecalculate && (
        <button
          type="button"
          onClick={onRecalculate}
          aria-label="Recalcular próximo tópico com IA"
          className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <RefreshCw size={12} />
          Recalcular com IA
        </button>
      )}
    </div>
  );
};
