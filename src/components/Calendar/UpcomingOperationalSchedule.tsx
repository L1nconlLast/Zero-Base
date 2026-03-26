import React from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  PlayCircle,
} from 'lucide-react';
import type {
  OperationalScheduleWindowDay,
  ScheduledStudyFocusStatus,
} from '../../services/studySchedule.service';
import type { Weekday } from '../../types';

interface UpcomingOperationalScheduleProps {
  days: OperationalScheduleWindowDay[];
  itemActionLabel: string;
  emptyActionLabel: string;
  onStartOfficialStudy?: (() => void) | null;
  onEditDay: (day: Weekday) => void;
}

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: 'Segunda',
  tuesday: 'Terca',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sabado',
  sunday: 'Domingo',
};

const STATUS_META: Record<
  ScheduledStudyFocusStatus,
  { label: string; tone: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pendente',
    tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200',
    icon: <Clock3 className="h-3.5 w-3.5" />,
  },
  completed: {
    label: 'Concluido',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  overdue: {
    label: 'Atrasado',
    tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
};

const formatDateLabel = (date: string): string => {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
};

const getStudyTypeLabel = (studyType?: string): string => {
  if (studyType === 'teoria_questoes') return 'Teoria + Questoes';
  if (studyType === 'questoes') return 'Questoes';
  if (studyType === 'revisao') return 'Revisao';
  if (studyType === 'simulado') return 'Simulado';
  return 'Estudo';
};

const UpcomingOperationalSchedule: React.FC<UpcomingOperationalScheduleProps> = ({
  days,
  itemActionLabel,
  emptyActionLabel,
  onStartOfficialStudy,
  onEditDay,
}) => (
  <section
    data-testid="upcoming-schedule-panel"
    className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
  >
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Semana operacional
        </p>
        <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
          Transforme os proximos dias em uma fila viva de estudo
        </h3>
      </div>
      <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
        Cada item usa o mesmo loop oficial para manter cronograma, home e progresso no mesmo trilho.
      </p>
    </div>

    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {days.map((day) => (
        <article
          key={day.date}
          data-testid="upcoming-schedule-day"
          data-day-offset={day.offsetDays}
          className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                D+{day.offsetDays}
              </p>
              <h4 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                {WEEKDAY_LABELS[day.weekday]}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">{formatDateLabel(day.date)}</p>
            </div>
            <button
              type="button"
              onClick={() => onEditDay(day.weekday)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Ajustar
            </button>
          </div>

          {day.items.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
              <p>Nenhum item planejado para esse dia ainda.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {onStartOfficialStudy ? (
                  <button
                    data-testid="upcoming-schedule-empty-cta"
                    type="button"
                    onClick={onStartOfficialStudy}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    {emptyActionLabel}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {day.items.map((item) => {
                const statusMeta = STATUS_META[item.status];
                return (
                  <div
                    key={item.id}
                    data-testid="upcoming-schedule-item"
                    data-item-status={item.status}
                    data-item-source={item.source}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.subject}</p>
                          <span
                            data-testid="schedule-item-status"
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.tone}`}
                          >
                            {statusMeta.icon}
                            {statusMeta.label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          {item.topic || 'Topico alinhado ao plano semanal'}
                        </p>
                      </div>
                      {onStartOfficialStudy ? (
                        <button
                          data-testid="upcoming-schedule-item-cta"
                          type="button"
                          onClick={onStartOfficialStudy}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          {itemActionLabel}
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                        {getStudyTypeLabel(item.studyType)}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                        {item.source === 'entry' ? 'Bloco real' : 'Plano semanal'}
                      </span>
                      {item.startTime ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                          {item.startTime} {item.endTime ? `- ${item.endTime}` : ''}
                        </span>
                      ) : null}
                    </div>

                    {item.reason ? (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{item.reason}</p>
                    ) : item.note ? (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{item.note}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </article>
      ))}
    </div>
  </section>
);

export default UpcomingOperationalSchedule;
