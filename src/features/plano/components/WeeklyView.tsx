import React from 'react';
import type { WeekPlan } from '../types';
import { DayColumn } from './DayColumn';

interface WeeklyViewProps {
  darkMode?: boolean;
  plan: WeekPlan;
  onEditDay?: (dayId: WeekPlan[number]['id']) => void;
}

export const WeeklyView: React.FC<WeeklyViewProps> = ({ darkMode = false, plan, onEditDay }) => {
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());

  return (
    <section className={`motion-enter motion-card overflow-hidden rounded-[28px] border p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)] ${
      darkMode
        ? 'border-slate-800 bg-slate-950/92 shadow-[0_16px_34px_rgba(2,6,23,0.45)]'
        : 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(241,245,249,0.94)_100%)] shadow-[0_16px_34px_rgba(148,163,184,0.18)]'
    }`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Visao semanal</div>
          <h2 className={`mt-1.5 text-[26px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            A semana inteira em um unico quadro
          </h2>
          <p className={`mt-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Ajuste um dia por vez e deixe o cronograma operacional logo abaixo cuidar dos detalhes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold capitalize ${
            darkMode
              ? 'border-slate-700 bg-slate-900 text-slate-300'
              : 'border-slate-200/80 bg-slate-100/82 text-slate-600'
          }`}>
            {monthLabel}
          </div>
          <div className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
            darkMode
              ? 'border-cyan-900/70 bg-cyan-950/30 text-cyan-200'
              : 'border-cyan-200/80 bg-cyan-50/80 text-cyan-700'
          }`}>
            {plan.filter((day) => day.isActive).length} dias ativos
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <div className={`grid min-w-[1040px] grid-cols-7 gap-2.5 rounded-[24px] border p-2.5 ${
          darkMode
            ? 'border-slate-800 bg-slate-900/70'
            : 'border-slate-200/80 bg-slate-100/74'
        }`}>
          {plan.map((day) => (
            <DayColumn key={day.id} darkMode={darkMode} day={day} onEditDay={onEditDay} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default WeeklyView;
