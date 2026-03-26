import React from 'react';
import { CalendarDays, Settings2, Sparkles } from 'lucide-react';

interface CronogramaHeaderProps {
  onAutoAdjust: () => void;
  onEditPreferences: () => void;
}

const CronogramaHeader: React.FC<CronogramaHeaderProps> = ({
  onAutoAdjust,
  onEditPreferences,
}) => (
  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          <CalendarDays className="h-4 w-4" />
          Cronograma
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Seu cronograma da semana
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Defina quando estudar. O app organiza a execução sem te fazer pensar em cada próxima etapa.
        </p>
        <p className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          Seu estudo desta semana está organizado
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:min-w-[240px]">
        <button
          type="button"
          onClick={onAutoAdjust}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Sparkles className="h-4 w-4" />
          Reorganizar minha semana
        </button>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Reorganize sua semana com base nas suas disciplinas
        </p>
        <button
          type="button"
          onClick={onEditPreferences}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Settings2 className="h-4 w-4" />
          Preferências
        </button>
      </div>
    </div>
  </section>
);

export default CronogramaHeader;
