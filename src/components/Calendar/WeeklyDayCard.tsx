import React from 'react';
import { CalendarPlus, CalendarX2, PencilLine } from 'lucide-react';
import type { Weekday, WeeklyDayPlan } from '../../types';

interface WeeklyDayCardProps {
  day: Weekday;
  label: string;
  plan: WeeklyDayPlan;
  isActive: boolean;
  isToday: boolean;
  hasCompletedSession?: boolean;
  sequenceLabel?: string;
  contextLabel?: string;
  onEdit: () => void;
  onToggleActive: (nextActive: boolean) => void;
}

const WeeklyDayCard: React.FC<WeeklyDayCardProps> = ({
  label,
  plan,
  isActive,
  isToday,
  hasCompletedSession = false,
  sequenceLabel,
  contextLabel,
  onEdit,
  onToggleActive,
}) => {
  const visibleSubjects = plan.subjectLabels.slice(0, 3);
  const overflowCount = Math.max(0, plan.subjectLabels.length - visibleSubjects.length);

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition-all ${
        isToday
          ? 'border-sky-300 bg-sky-50/70 dark:border-sky-700 dark:bg-sky-950/20'
          : ''
      } ${
        isActive
          ? 'opacity-100'
          : 'bg-slate-50 opacity-75 dark:bg-slate-900/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
              <span>{label}</span>
              {hasCompletedSession ? (
                <span className="text-xs text-emerald-500" aria-label="Sessao concluida neste dia">
                  ●
                </span>
              ) : null}
            </h4>
            {isToday && (
              <span className="inline-flex rounded-full border border-sky-200 bg-sky-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                Hoje
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isActive ? 'Dia ativo' : 'Dia desativado'}
          </p>
          {sequenceLabel ? (
            <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {sequenceLabel}
            </p>
          ) : null}
          {isToday && contextLabel ? (
            <p className="mt-1 text-[11px] font-medium text-sky-700 dark:text-sky-300">
              {contextLabel}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onToggleActive(!isActive)}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            isActive
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {isActive ? <CalendarPlus className="h-3.5 w-3.5" /> : <CalendarX2 className="h-3.5 w-3.5" />}
          {isActive ? 'Ativo' : 'Inativo'}
        </button>
      </div>

      <div className="mt-4 min-h-[110px]">
        {plan.subjectLabels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            {isActive ? (
              <>
                <p className="font-medium text-slate-700 dark:text-slate-200">Nenhuma disciplina definida</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Defina para este dia entrar no seu plano</p>
              </>
            ) : (
              <>
                <p className="font-medium text-slate-700 dark:text-slate-200">Dia desativado</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Este dia não entra no seu plano</p>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {visibleSubjects.map((subject) => (
              <span
                key={subject}
                className="inline-flex rounded-full border border-slate-200 bg-slate-50/70 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
              >
                {subject}
              </span>
            ))}
            {overflowCount > 0 && (
              <p className="inline-flex items-center rounded-full bg-slate-100/80 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                +{overflowCount} disciplinas
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <PencilLine className="h-4 w-4" />
        Editar dia
      </button>
    </article>
  );
};

export default WeeklyDayCard;
