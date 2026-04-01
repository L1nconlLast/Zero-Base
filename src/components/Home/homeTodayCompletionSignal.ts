import type { HomePriority, HomeTodayState } from './homeTodayState';

export const HOME_COMPLETION_SIGNAL_TTL_MS = 3 * 60 * 1000;

export interface HomeCompletionSignal {
  priority: HomePriority;
  completedAt: string;
  expiresAt: string;
}

const PRIORITY_LABELS: Record<HomePriority, string> = {
  review: 'Revisao',
  continue: 'Continuidade',
  study: 'Estudo',
  plan: 'Planejamento',
};

const toSafeDate = (value?: string | null) => {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const buildNextStepDetail = (state: HomeTodayState) => {
  const subtitle = state.hero.subtitle.trim();
  const insight = state.hero.insight.trim();

  if (subtitle && insight) {
    return `${subtitle}. ${insight}`;
  }

  if (insight) {
    return insight;
  }

  if (state.dayStatus.remainder) {
    return state.dayStatus.remainder;
  }

  return state.primaryPanel.description;
};

export const createHomeCompletionSignal = (
  priority: HomePriority,
  completedAt?: string,
  ttlMs = HOME_COMPLETION_SIGNAL_TTL_MS,
): HomeCompletionSignal => {
  const safeCompletedAt = toSafeDate(completedAt);
  const expiresAt = new Date(safeCompletedAt.getTime() + Math.max(ttlMs, 1));

  return {
    priority,
    completedAt: safeCompletedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
};

export const isHomeCompletionSignalActive = (
  signal?: HomeCompletionSignal | null,
  now = new Date(),
) => {
  if (!signal) {
    return false;
  }

  return toSafeDate(signal.expiresAt).getTime() > now.getTime();
};

export const matchesHomeCompletionSignalPriority = (
  signal: HomeCompletionSignal | null | undefined,
  priority: HomePriority,
) => Boolean(signal && signal.priority === priority);

export const applyHomeTodayCompletionSignal = (
  state: HomeTodayState,
  signal?: HomeCompletionSignal | null,
  now = new Date(),
): HomeTodayState => {
  if (!signal || !isHomeCompletionSignalActive(signal, now)) {
    return state;
  }

  const completedPriority = signal.priority;
  const priorityLabel = PRIORITY_LABELS[completedPriority];
  const nextStepRow = {
    id: 'completion-next-step',
    label: 'Proximo passo',
    detail: buildNextStepDetail(state),
    badge: state.primaryPanel.sessionLabel,
  };
  const followUpRows = state.continuityPanel.rows.slice(0, 1).map((row, index) => ({
    ...row,
    id: `completion-followup-${index}-${row.id}`,
  }));

  return {
    ...state,
    priority: completedPriority,
    phase: 'concluido',
    isDone: true,
    dayStatus: {
      label: 'Hoje',
      value: `${priorityLabel} concluida`,
      detail: `${priorityLabel} foi concluida e nao precisa mais disputar sua atencao agora.`,
      summary: 'Concluido',
      remainder: nextStepRow.detail,
    },
    primaryPanel: {
      ...state.primaryPanel,
      sessionLabel: priorityLabel,
    },
    continuityPanel: {
      eyebrow: 'depois',
      title: 'Proximo passo',
      actionLabel: state.hero.primaryActionLabel,
      actionTarget: state.hero.primaryActionTarget,
      rows: [nextStepRow, ...followUpRows],
    },
  };
};

export default applyHomeTodayCompletionSignal;
