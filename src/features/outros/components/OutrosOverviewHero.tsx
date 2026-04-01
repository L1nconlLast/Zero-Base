import React from 'react';
import { Compass, Flag, Sparkles } from 'lucide-react';

import type { OutrosOverviewHeroSnapshot } from '../../../services/outrosDashboard.service';
import { OutrosOverviewCard } from './OutrosOverviewCard';

interface OutrosOverviewHeroProps {
  darkMode?: boolean;
  data: OutrosOverviewHeroSnapshot;
}

export const OutrosOverviewHero: React.FC<OutrosOverviewHeroProps> = ({
  darkMode = false,
  data,
}) => (
  <OutrosOverviewCard
    darkMode={darkMode}
    title="Hero contextual"
    description="Qual e o foco atual, por que ele importa e em que estagio voce esta agora."
    badge={data.stageLabel}
    featured
  >
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className={`rounded-2xl border p-4 ${
        darkMode ? 'border-slate-800/80 bg-slate-950/84' : 'border-white/80 bg-white/88'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className={`h-4 w-4 ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`} />
          <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Foco atual
          </span>
        </div>
        <h2 className={`mt-3 text-2xl font-black tracking-[-0.04em] ${
          darkMode ? 'text-slate-50' : 'text-slate-900'
        }`}>
          {data.focusTitle}
        </h2>
        <p className={`mt-2 text-sm leading-6 ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        }`}>
          {data.focusDetail}
        </p>
      </div>

      <div className="grid gap-3">
        <div className={`rounded-2xl border p-4 ${
          darkMode ? 'border-slate-800/80 bg-slate-900/80' : 'border-slate-200/80 bg-slate-50/88'
        }`}>
          <div className="flex items-center gap-2">
            <Compass className={`h-4 w-4 ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Por que importa
            </span>
          </div>
          <p className={`mt-2 text-sm leading-6 ${
            darkMode ? 'text-slate-200' : 'text-slate-700'
          }`}>
            {data.whyItMatters}
          </p>
        </div>

        <div className={`rounded-2xl border p-4 ${
          darkMode ? 'border-slate-800/80 bg-slate-900/80' : 'border-slate-200/80 bg-slate-50/88'
        }`}>
          <div className="flex items-center gap-2">
            <Flag className={`h-4 w-4 ${darkMode ? 'text-amber-300' : 'text-amber-700'}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Estagio atual
            </span>
          </div>
          <p className={`mt-2 text-sm font-semibold ${
            darkMode ? 'text-slate-100' : 'text-slate-900'
          }`}>
            {data.stageLabel}
          </p>
          <p className={`mt-2 text-sm leading-6 ${
            darkMode ? 'text-slate-300' : 'text-slate-600'
          }`}>
            {data.stageDetail}
          </p>
        </div>
      </div>
    </div>
  </OutrosOverviewCard>
);

export default OutrosOverviewHero;
