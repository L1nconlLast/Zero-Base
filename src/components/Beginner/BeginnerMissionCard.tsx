import React from 'react';
import type { BeginnerMission, BeginnerState } from '../../types';

interface BeginnerMissionCardProps {
  beginnerState?: BeginnerState | null;
  mission: BeginnerMission;
  completedCount: number;
  totalCount: number;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
}

const getPrimaryLabel = (beginnerState: BeginnerState | null | undefined, mission: BeginnerMission): string => {
  if (beginnerState === 'week_complete') {
    return 'Ver resumo da semana';
  }

  if (beginnerState === 'ready_for_first_session') {
    return `Comecar agora (${mission.studyMinutes} min)`;
  }

  if (beginnerState === 'post_session' || beginnerState === 'day_2') {
    return `Ir para o ${mission.dayLabel} (${mission.studyMinutes} min)`;
  }

  return `Abrir ${mission.dayLabel} (${mission.studyMinutes} min)`;
};

const getStatusLabel = (beginnerState: BeginnerState | null | undefined): string => {
  if (beginnerState === 'week_complete') {
    return 'semana concluida';
  }

  if (beginnerState === 'post_session' || beginnerState === 'day_2') {
    return 'proxima missao liberada';
  }

  return 'missao do dia';
};

export const BeginnerMissionCard: React.FC<BeginnerMissionCardProps> = ({
  beginnerState,
  mission,
  completedCount,
  totalCount,
  onPrimaryAction,
  onSecondaryAction,
}) => {
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const progressLabel =
    beginnerState === 'week_complete'
      ? 'Semana concluida'
      : beginnerState === 'post_session' || beginnerState === 'day_2'
        ? `${mission.dayLabel} • proxima missao liberada`
        : `${mission.dayLabel} • primeiro passo`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{progressLabel}</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{mission.focus}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {mission.studyMinutes} min • {mission.questionCount} questoes
            {mission.reviewMinutes ? ` • ${mission.reviewMinutes} min revisao` : ''}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-700">
            {mission.studyMinutes} min -&gt; {mission.questionCount} questoes -&gt; {mission.reviewMinutes ? 'revisao rapida' : 'fechamento'}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {beginnerState === 'week_complete'
            ? getStatusLabel(beginnerState)
            : mission.target === 'simulado'
              ? 'simulado'
              : getStatusLabel(beginnerState)}
        </span>
      </div>

      <div className="mt-4 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progressPercent}%` }} />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {beginnerState === 'week_complete' ? `${completedCount} de ${totalCount} missoes concluidas` : 'So precisa comecar. O resto o app ajusta.'}
      </p>

      {(beginnerState === 'post_session' || beginnerState === 'day_2' || beginnerState === 'week_complete') && (
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          {beginnerState === 'week_complete' ? 'Semana concluida.' : 'Proxima missao liberada.'}
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {mission.tasks.map((task) => (
          <div key={`${mission.id}-${task.discipline}-${task.topic}`} className="rounded-xl border bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">{task.discipline}</p>
            <p className="mt-1 text-xs text-slate-600">{task.topic}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={onPrimaryAction}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:min-w-[260px]"
        >
          {getPrimaryLabel(beginnerState, mission)}
        </button>
        {onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Abrir bloco de questoes
          </button>
        )}
      </div>
    </section>
  );
};
