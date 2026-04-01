import React from 'react';
import { CalendarPlus2, PencilLine } from 'lucide-react';
import type { DayPlan } from '../types';
import { StudyBlockCard } from './StudyBlockCard';

interface DayColumnProps {
  darkMode?: boolean;
  day: DayPlan;
  onEditDay?: (dayId: DayPlan['id']) => void;
}

export const DayColumn: React.FC<DayColumnProps> = ({ darkMode = false, day, onEditDay }) => {
  const hasOperationalBlocks = day.blocks.length > 0;
  const actionLabel = day.isActive || hasOperationalBlocks ? 'Ajustar' : 'Ativar';

  return (
    <div
      className={`flex min-h-[232px] min-w-0 flex-col overflow-hidden rounded-[20px] border p-2.5 shadow-[0_10px_20px_rgba(15,23,42,0.05)] ${
        day.isToday
          ? darkMode
            ? 'border-cyan-900/70 bg-[linear-gradient(180deg,rgba(8,145,178,0.16)_0%,rgba(15,23,42,0.92)_62%)]'
            : 'border-cyan-200/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.98)_0%,rgba(248,250,252,0.94)_62%)]'
          : day.isActive || hasOperationalBlocks
            ? darkMode
              ? 'border-slate-800 bg-slate-950/88'
              : 'border-slate-200/80 bg-slate-50/92'
            : darkMode
              ? 'border-slate-800 bg-slate-900/80'
              : 'border-slate-200/80 bg-slate-100/72'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm font-black tracking-[0.12em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{day.date}</p>
            {day.isToday ? (
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                darkMode ? 'bg-cyan-950/40 text-cyan-200' : 'bg-cyan-100/90 text-cyan-700'
              }`}>
                Hoje
              </span>
            ) : null}
            {!day.isActive && !hasOperationalBlocks ? (
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200/85 text-slate-500'
              }`}>
                Livre
              </span>
            ) : null}
          </div>
          <h3 className={`mt-2 truncate text-base font-black tracking-[-0.03em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} title={day.fullLabel}>
            {day.fullLabel}
          </h3>
          <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {day.blocks.length > 0
              ? `${day.blocks.length} bloco${day.blocks.length === 1 ? '' : 's'} · ${day.totalMinutes} min`
              : day.isActive
                ? 'Dia ativo sem blocos'
                : 'Dia fora do ciclo atual'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onEditDay?.(day.id)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition ${
            darkMode
              ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
              : 'border-slate-200/80 bg-slate-50/88 text-slate-600 hover:bg-slate-100/85'
          }`}
        >
          <PencilLine className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      </div>

      <div className="mt-3 flex-1 space-y-2.5">
        {day.blocks.length > 0 ? (
          day.blocks.map((block) => (
            <StudyBlockCard key={block.id} darkMode={darkMode} block={block} />
          ))
        ) : (
          <div className={`flex h-full min-h-[96px] items-center justify-center rounded-[18px] border border-dashed p-3 text-center ${
            darkMode
              ? 'border-slate-700 bg-slate-900/55'
              : 'border-slate-300/80 bg-slate-50/72'
          }`}>
            <div>
              <div className={`mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full ${
                darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100/90 text-slate-500'
              }`}>
                <CalendarPlus2 className="h-4 w-4" />
              </div>
              <p className={`mt-2.5 text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                {day.isActive ? 'Dia ativo sem blocos' : 'Dia livre'}
              </p>
              <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {day.isActive
                  ? 'Abra este dia para distribuir disciplinas sem mexer no resto da semana.'
                  : 'Ative este dia se quiser aliviar a carga dos outros blocos.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayColumn;
