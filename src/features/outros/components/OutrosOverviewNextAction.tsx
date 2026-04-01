import React from 'react';
import { ArrowRight, Clock3, Rocket, Target } from 'lucide-react';

import type { OutrosOverviewNextActionSnapshot } from '../../../services/outrosDashboard.service';
import { OutrosOverviewCard } from './OutrosOverviewCard';

interface OutrosOverviewNextActionProps {
  darkMode?: boolean;
  data: OutrosOverviewNextActionSnapshot;
  onPrimaryAction: () => void;
  onSecondaryAction?: (() => void) | null;
}

export const OutrosOverviewNextAction: React.FC<OutrosOverviewNextActionProps> = ({
  darkMode = false,
  data,
  onPrimaryAction,
  onSecondaryAction = null,
}) => (
  <OutrosOverviewCard
    darkMode={darkMode}
    title="Faca isso agora"
    description="Esse e o bloco dominante da tela: a melhor acao para manter o foco andando sem pensar demais."
    badge={data.type}
    featured
  >
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.16fr)_minmax(0,0.84fr)]">
      <div className={`rounded-2xl border p-4 ${
        darkMode ? 'border-slate-800/80 bg-slate-950/84' : 'border-white/80 bg-white/88'
      }`}>
        <div className="flex items-center gap-2">
          <Rocket className={`h-4 w-4 ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`} />
          <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Proximo passo recomendado
          </span>
        </div>
        <h3 className={`mt-3 text-2xl font-black tracking-[-0.04em] ${
          darkMode ? 'text-slate-50' : 'text-slate-900'
        }`}>
          {data.title}
        </h3>
        <p className={`mt-3 text-sm leading-6 ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        }`}>
          {data.reason}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className={`rounded-2xl border p-3.5 ${
            darkMode ? 'border-slate-800/80 bg-slate-900/80' : 'border-slate-200/80 bg-slate-50/88'
          }`}>
            <div className="flex items-center gap-2">
              <Target className={`h-4 w-4 ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`} />
              <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Tipo
              </span>
            </div>
            <p className={`mt-2 text-sm font-semibold ${
              darkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              {data.type}
            </p>
          </div>

          <div className={`rounded-2xl border p-3.5 ${
            darkMode ? 'border-slate-800/80 bg-slate-900/80' : 'border-slate-200/80 bg-slate-50/88'
          }`}>
            <div className="flex items-center gap-2">
              <Clock3 className={`h-4 w-4 ${darkMode ? 'text-amber-300' : 'text-amber-700'}`} />
              <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Duracao
              </span>
            </div>
            <p className={`mt-2 text-sm font-semibold ${
              darkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              {data.estimatedMinutes} min
            </p>
          </div>

          <div className={`rounded-2xl border p-3.5 ${
            darkMode ? 'border-slate-800/80 bg-slate-900/80' : 'border-slate-200/80 bg-slate-50/88'
          }`}>
            <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Impacto
            </span>
            <p className={`mt-2 text-sm font-semibold ${
              darkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              {data.impact}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <div className={`rounded-2xl border p-4 ${
          darkMode ? 'border-slate-800/80 bg-slate-900/80' : 'border-slate-200/80 bg-slate-50/88'
        }`}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            O que essa acao libera
          </p>
          <p className={`mt-2 text-sm leading-6 ${
            darkMode ? 'text-slate-200' : 'text-slate-700'
          }`}>
            {data.impact}
          </p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={onPrimaryAction}
            className={`inline-flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
              darkMode
                ? 'border-cyan-700/70 bg-cyan-500/18 text-cyan-100 hover:bg-cyan-500/24'
                : 'border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
            }`}
          >
            <span>{data.ctaLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {data.secondaryLabel && onSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className={`inline-flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                darkMode
                  ? 'border-slate-700 bg-slate-900/82 text-slate-100 hover:bg-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{data.secondaryLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  </OutrosOverviewCard>
);

export default OutrosOverviewNextAction;
