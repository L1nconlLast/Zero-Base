import React from 'react';
import { CalendarRange, Clock3, Sparkles } from 'lucide-react';
import { truncatePresentationLabel } from '../../utils/uiLabels';

export interface PlanningDaySequence {
  id: string;
  label: string;
  shortLabel: string;
  isToday: boolean;
  isActive: boolean;
  subjects: string[];
  totalMinutes: number;
}

interface StudySequenceListProps {
  days: PlanningDaySequence[];
  sessionsPerDay: number;
  defaultSessionDurationMinutes: number;
}

export const StudySequenceList: React.FC<StudySequenceListProps> = ({
  days,
  sessionsPerDay,
  defaultSessionDurationMinutes,
}) => {
  return (
    <section className="motion-enter motion-card overflow-hidden rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Sequencia de estudos</div>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-900">
            A semana traduzida em ordem de execucao
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Cada linha mostra o que ja esta planejado. Os ajustes finos continuam no cronograma logo abaixo.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
          <Clock3 className="h-4 w-4 text-cyan-500" />
          {sessionsPerDay} sessao{sessionsPerDay === 1 ? '' : 'es'} base de {defaultSessionDurationMinutes} min
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {days.map((day) => (
          <article
            key={day.id}
            className={`overflow-hidden rounded-[26px] border px-4 py-4 transition-all duration-200 ${
              day.isToday
                ? 'border-cyan-200 bg-[linear-gradient(135deg,#f4feff_0%,#ffffff_70%)] shadow-[0_12px_26px_rgba(14,165,233,0.08)]'
                : day.isActive
                  ? 'border-slate-200 bg-slate-50/80'
                  : 'border-slate-200 bg-slate-50/40 opacity-80'
            }`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black ${
                  day.isToday
                    ? 'bg-slate-900 text-white'
                    : day.isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'bg-white text-slate-400'
                }`}>
                  {day.shortLabel}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-lg font-black tracking-[-0.03em] text-slate-900" title={day.label}>{day.label}</p>
                    {day.isToday ? (
                      <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
                        Hoje
                      </span>
                    ) : null}
                    {!day.isActive ? (
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Livre
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {day.isActive
                      ? day.subjects.length > 0
                        ? `${day.subjects.length} disciplina${day.subjects.length === 1 ? '' : 's'} distribuida${day.subjects.length === 1 ? '' : 's'}`
                        : 'Dia ativo, mas ainda sem disciplinas definidas'
                      : 'Dia fora do ciclo atual'}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
                  <CalendarRange className="h-4 w-4 text-violet-500" />
                  {day.totalMinutes} min
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {day.subjects.length > 0 ? (
                day.subjects.map((subject) => (
                  <span
                    key={`${day.id}-${subject}`}
                    title={subject}
                    className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-[0_6px_14px_rgba(15,23,42,0.04)]"
                  >
                    <span className="truncate">{truncatePresentationLabel(subject, 22, subject)}</span>
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-500">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Ajuste este dia no cronograma abaixo
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default StudySequenceList;
