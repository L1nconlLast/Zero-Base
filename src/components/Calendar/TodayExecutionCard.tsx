import React from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  PlayCircle,
} from 'lucide-react';
import type { ScheduledStudyFocusResolution } from '../../services/studySchedule.service';

type TodayExecutionAction = {
  label: string;
  onAction: () => void;
};

type TodayExecutionCardState =
  | {
      status: 'loading';
      title: string;
      description: string;
    }
  | {
      status: 'error';
      title: string;
      description: string;
      actionLabel: string;
      onAction: () => void;
    }
  | {
      status: 'empty';
      title: string;
      description: string;
      supportingText?: string;
      actionLabel: string;
      onAction: () => void;
    }
  | {
      status: 'ready';
      title: string;
      discipline: string;
      topic: string;
      reason: string;
      estimatedDurationMinutes: number;
      sessionTypeLabel: string;
      progressLabel?: string;
      supportingText?: string;
      ctaLabel: string;
      busy?: boolean;
      onAction: () => void;
    };

interface TodayExecutionCardProps {
  card: TodayExecutionCardState;
  scheduleStatus: ScheduledStudyFocusResolution | null;
  onAdjustToday: () => void;
}

const STATUS_COPY: Record<
  ScheduledStudyFocusResolution['status'],
  { label: string; tone: string; hint: string }
> = {
  pending: {
    label: 'Pendente',
    tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200',
    hint: 'Esse bloco continua aberto no plano de hoje.',
  },
  completed: {
    label: 'Concluido',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
    hint: 'Esse bloco ja foi refletido como concluido no cronograma.',
  },
  overdue: {
    label: 'Atrasado',
    tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
    hint: 'Ainda existe atraso ligado a esse foco dentro do cronograma.',
  },
};

const buildScheduleHint = (scheduleStatus: ScheduledStudyFocusResolution | null): string | null => {
  if (!scheduleStatus) {
    return null;
  }

  if (scheduleStatus.status === 'completed' && scheduleStatus.overdueCount > 0) {
    return `Este bloco foi concluido, mas ainda existem ${scheduleStatus.overdueCount} bloco${scheduleStatus.overdueCount > 1 ? 's' : ''} atrasado${scheduleStatus.overdueCount > 1 ? 's' : ''} desse foco.`;
  }

  if (scheduleStatus.matchedEntrySource === 'today') {
    return STATUS_COPY[scheduleStatus.status].hint;
  }

  if (scheduleStatus.matchedEntrySource === 'backlog') {
    return `O cronograma encontrou ${scheduleStatus.overdueCount} bloco${scheduleStatus.overdueCount > 1 ? 's' : ''} atrasado${scheduleStatus.overdueCount > 1 ? 's' : ''} para esse foco.`;
  }

  return 'Esse bloco foi sincronizado com a recomendacao oficial atual para manter o dia acionavel.';
};

const ActionRow: React.FC<{
  primary: TodayExecutionAction;
  secondary?: TodayExecutionAction;
  busy?: boolean;
}> = ({ primary, secondary, busy = false }) => (
  <div className="flex flex-col gap-2 sm:min-w-[220px]">
    <button
      type="button"
      disabled={busy}
      onClick={primary.onAction}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
      {primary.label}
    </button>
    {secondary ? (
      <button
        type="button"
        onClick={secondary.onAction}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <CalendarDays className="h-4 w-4" />
        {secondary.label}
      </button>
    ) : null}
  </div>
);

const TodayExecutionCard: React.FC<TodayExecutionCardProps> = ({
  card,
  scheduleStatus,
  onAdjustToday,
}) => {
  if (card.status === 'loading') {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Hoje em execucao
        </p>
        <h3 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{card.title}</h3>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{card.description}</p>
      </section>
    );
  }

  if (card.status === 'error') {
    return (
      <section className="rounded-[28px] border border-rose-200 bg-rose-50/70 p-5 shadow-sm dark:border-rose-900 dark:bg-rose-950/20 sm:p-6">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4" />
          Hoje em execucao
        </p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{card.description}</p>
          </div>
          <ActionRow
            primary={{ label: card.actionLabel, onAction: card.onAction }}
            secondary={{ label: 'Editar hoje', onAction: onAdjustToday }}
          />
        </div>
      </section>
    );
  }

  if (card.status === 'empty') {
    return (
      <section className="rounded-[28px] border border-amber-200 bg-amber-50/70 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/20 sm:p-6">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
          <CalendarDays className="h-4 w-4" />
          Hoje em execucao
        </p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{card.description}</p>
            {card.supportingText ? (
              <p className="mt-2 text-sm font-medium text-amber-900/80 dark:text-amber-100/80">{card.supportingText}</p>
            ) : null}
          </div>
          <ActionRow
            primary={{ label: card.actionLabel, onAction: card.onAction }}
            secondary={{ label: 'Editar hoje', onAction: onAdjustToday }}
          />
        </div>
      </section>
    );
  }

  const resolvedStatus = scheduleStatus ?? {
    status: 'pending' as const,
    matchedEntry: null,
    matchedEntrySource: 'none' as const,
    overdueCount: 0,
    todayPendingCount: 0,
    todayCompletedCount: 0,
  };
  const statusCopy = STATUS_COPY[resolvedStatus.status];
  const scheduleHint = buildScheduleHint(resolvedStatus);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Hoje em execucao
            </p>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusCopy.tone}`}>
              {statusCopy.label}
            </span>
          </div>

          <h3 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{card.title}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {card.discipline} {'•'} {card.topic}
          </p>
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{card.reason}</p>
          {card.supportingText ? (
            <p className="mt-2 text-sm font-medium text-slate-900/75 dark:text-slate-100/75">{card.supportingText}</p>
          ) : null}
          {scheduleHint ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{scheduleHint}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Clock3 className="h-3.5 w-3.5" />
              {card.estimatedDurationMinutes} min estimados
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {card.sessionTypeLabel}
            </span>
            {card.progressLabel ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {card.progressLabel}
              </span>
            ) : null}
            {resolvedStatus.status === 'completed' ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Refletido no cronograma
              </span>
            ) : null}
          </div>
        </div>

        <ActionRow
          primary={{ label: card.ctaLabel, onAction: card.onAction }}
          secondary={{ label: 'Editar hoje', onAction: onAdjustToday }}
          busy={Boolean(card.busy)}
        />
      </div>
    </section>
  );
};

export default TodayExecutionCard;
