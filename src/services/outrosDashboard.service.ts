import { isSupabaseConfigured, supabase } from './supabase.client';

export interface LearningTopicSummary {
  id: string;
  name: string;
  category: string | null;
  level: 'iniciante' | 'intermediario' | 'avancado';
  status: 'ativo' | 'pausado' | 'concluido';
}

export interface LearningGoalSummary {
  id: string;
  topicId: string;
  goalType: 'aprender_do_zero' | 'praticar' | 'rotina' | 'aprofundar';
  description: string | null;
  status: 'ativo' | 'concluido' | 'arquivado';
}

export interface LearningPathSummary {
  id: string;
  topicId: string;
  title: string;
  progressPercent: number;
  status: 'ativa' | 'pausada' | 'concluida';
}

export interface PathStepSummary {
  id: string;
  pathId: string;
  title: string;
  description: string | null;
  stepOrder: number;
  status: 'nao_iniciado' | 'em_andamento' | 'concluido';
}

export interface PersonalGoalEventSummary {
  id: string;
  topicId: string | null;
  topicName: string | null;
  title: string;
  startAt: string;
  endAt: string | null;
  type: 'meta' | 'estudo' | 'revisao';
  status: 'pendente' | 'concluido' | 'cancelado';
}

export interface OutrosRecentSessionSummary {
  id: string;
  topicName: string | null;
  minutes: number;
  happenedAt: string;
}

export interface OutrosRankSnapshot {
  studyContextId: string | null;
  scopeMode: 'outros';
  scopeTopicIds: string[];
  streakCurrent: number;
  streakBest: number;
  totalMinutes: number;
  totalHoursLabel: string;
  completedSessions: number;
  processedReviews: number;
  weeklyMinutes: number;
  weeklyTargetMinutes: number;
  activeDaysLast7: number;
  activeDaysHistory: number;
  paceStatus: 'abaixo' | 'estavel' | 'acima';
  pendingReviewsCount: number;
  nextReviewDueAt: string | null;
  lastSessionCompletedAt: string | null;
}

export interface OutrosRhythmDailyBar {
  day: string;
  date: string;
  minutes: number;
  isToday: boolean;
}

export interface OutrosRhythmDistributionEntry {
  label: string;
  minutes: number;
  sessions: number;
  sharePercent: number;
}

export interface OutrosRhythmBestDay {
  date: string;
  label: string;
  minutes: number;
}

export interface OutrosRhythmNextBestAction {
  origin: 'review' | 'step' | 'event';
  title: string;
  type: string;
  estimatedMinutes: number;
  reason: string;
}

export interface OutrosRhythmSnapshot {
  todayMinutes: number;
  weekMinutes: number;
  previousWeekMinutes: number;
  weekTargetMinutes: number;
  streakCurrent: number;
  streakBest: number;
  evolutionPercent: number;
  dailyBars: OutrosRhythmDailyBar[];
  distributionByFocus: OutrosRhythmDistributionEntry[];
  bestDay: OutrosRhythmBestDay | null;
  dominantFocus: OutrosRhythmDistributionEntry | null;
  nextBestAction: OutrosRhythmNextBestAction | null;
}

export type OutrosOverviewActionTarget =
  | 'departamento'
  | 'arvore'
  | 'cronograma'
  | 'dashboard'
  | 'perfil';

export interface OutrosOverviewHeroSnapshot {
  focusTitle: string;
  focusDetail: string;
  whyItMatters: string;
  stageLabel: string;
  stageDetail: string;
}

export interface OutrosOverviewNextActionSnapshot {
  title: string;
  type: string;
  estimatedMinutes: number;
  impact: string;
  reason: string;
  ctaLabel: string;
  ctaTarget: OutrosOverviewActionTarget;
  secondaryLabel: string | null;
  secondaryTarget: OutrosOverviewActionTarget | null;
}

export interface OutrosOverviewPlanStateSnapshot {
  topicLabel: string;
  topicDetail: string;
  goalLabel: string;
  goalDetail: string;
  pathLabel: string;
  pathDetail: string;
  progressPercent: number | null;
  nextReviewLabel: string;
  nextReviewDetail: string;
}

export interface OutrosOverviewWeeklyRhythmSnapshot {
  streakCurrent: number;
  streakBest: number;
  weekMinutes: number;
  weekTargetMinutes: number;
  paceStatus: OutrosRankSnapshot['paceStatus'];
  paceStatusLabel: string;
  activeDaysLast7: number;
  lastSessionGapDays: number | null;
  recentSessions: OutrosRecentSessionSummary[];
}

export interface OutrosOverviewAlertSnapshot {
  id: string;
  title: string;
  detail: string;
  tone: 'info' | 'warning' | 'positive';
  actionLabel: string | null;
  actionTarget: OutrosOverviewActionTarget | null;
}

export interface OutrosOverviewSnapshot {
  hero: OutrosOverviewHeroSnapshot;
  nextAction: OutrosOverviewNextActionSnapshot;
  planState: OutrosOverviewPlanStateSnapshot;
  weeklyRhythm: OutrosOverviewWeeklyRhythmSnapshot;
  alerts: OutrosOverviewAlertSnapshot[];
}

export interface OutrosShellMetricSnapshot {
  label: string;
  value: string;
  detail: string;
}

export interface OutrosFocusIdentitySnapshot {
  topicLabel: string;
  topicDetail: string;
  goalLabel: string;
  goalDetail: string;
  whyItMatters: string;
}

export interface OutrosFocusCommitmentSnapshot {
  stageLabel: string;
  stageDetail: string;
  rhythmLabel: string;
  rhythmDetail: string;
  continuityLabel: string;
  continuityDetail: string;
}

export interface OutrosFocusManagementSnapshot {
  statusLabel: string;
  statusDetail: string;
  metrics: OutrosShellMetricSnapshot[];
}

export interface OutrosFocusSnapshot {
  identity: OutrosFocusIdentitySnapshot;
  commitment: OutrosFocusCommitmentSnapshot;
  management: OutrosFocusManagementSnapshot;
}

export interface OutrosPlanStructureSnapshot {
  pathLabel: string;
  pathDetail: string;
  progressPercent: number | null;
  statusLabel: string;
  nextStepLabel: string;
  nextStepDetail: string;
}

export interface OutrosPlanBacklogLaneSnapshot {
  id: 'in_progress' | 'queued' | 'completed';
  label: string;
  count: number;
  detail: string;
  items: string[];
  tone: 'active' | 'queue' | 'history';
}

export interface OutrosPlanBacklogSnapshot {
  currentStepLabel: string;
  currentStepDetail: string;
  lanes: OutrosPlanBacklogLaneSnapshot[];
}

export interface OutrosPlanReviewStateSnapshot {
  pendingLabel: string;
  pendingDetail: string;
  processedLabel: string;
  processedDetail: string;
  supportLabel: string;
  supportDetail: string;
}

export interface OutrosPlanManagementSnapshot {
  statusLabel: string;
  statusDetail: string;
  metrics: OutrosShellMetricSnapshot[];
}

export interface OutrosPlanSnapshot {
  structure: OutrosPlanStructureSnapshot;
  backlog: OutrosPlanBacklogSnapshot;
  reviewState: OutrosPlanReviewStateSnapshot;
  management: OutrosPlanManagementSnapshot;
}

export interface OutrosDashboardData {
  activeContext: {
    id: string;
    summary: string | null;
    description: string | null;
  } | null;
  profile: {
    mainTopic: string | null;
    goal: string | null;
    level: string | null;
    rhythm: string | null;
    dailyMinutes: number | null;
  };
  topics: LearningTopicSummary[];
  goals: LearningGoalSummary[];
  paths: LearningPathSummary[];
  steps: PathStepSummary[];
  events: PersonalGoalEventSummary[];
  activeTopic: LearningTopicSummary | null;
  activeGoal: LearningGoalSummary | null;
  activePath: LearningPathSummary | null;
  nextStep: PathStepSummary | null;
  weeklyGoal: PersonalGoalEventSummary | null;
  upcomingEvents: PersonalGoalEventSummary[];
  recentSessions: OutrosRecentSessionSummary[];
  rank: OutrosRankSnapshot;
  rhythm: OutrosRhythmSnapshot;
  overview: OutrosOverviewSnapshot;
  focus: OutrosFocusSnapshot;
  plan: OutrosPlanSnapshot;
}

interface StudyContextRow {
  id: string;
  context_summary: string | null;
  context_description: string | null;
  context_payload: {
    outros?: {
      topicName?: string | null;
      goalType?: string | null;
      level?: string | null;
      pace?: string | null;
      dailyMinutes?: number | null;
    } | null;
  } | null;
}

interface LearningTopicRow {
  id: string;
  name: string;
  category: string | null;
  level: LearningTopicSummary['level'];
  status: LearningTopicSummary['status'];
}

interface LearningGoalRow {
  id: string;
  topic_id: string;
  goal_type: LearningGoalSummary['goalType'];
  description: string | null;
  status: LearningGoalSummary['status'];
}

interface LearningPathRow {
  id: string;
  topic_id: string;
  title: string;
  progress_percent: number;
  status: LearningPathSummary['status'];
}

interface LearningPathStepRow {
  id: string;
  path_id: string;
  title: string;
  description: string | null;
  step_order: number;
  status: PathStepSummary['status'];
}

interface PersonalGoalEventRow {
  id: string;
  topic_id: string | null;
  title: string;
  start_at: string;
  end_at: string | null;
  event_type: PersonalGoalEventSummary['type'];
  status: PersonalGoalEventSummary['status'];
}

interface StudySessionRow {
  id: string;
  date: string;
  minutes: number;
  status: 'active' | 'finished' | null;
  subject: string | null;
  session_type: string | null;
  created_at: string;
  completed_at: string | null;
  learning_topic_id: string | null;
  context_mode: string | null;
}

interface ReviewPlanItemRow {
  id: string;
  scheduled_for: string;
  completed: boolean;
  review_type: 'aula' | 'topico' | 'prova' | 'resumo' | 'conceito' | 'pratica' | null;
  content_title: string | null;
  learning_topic_id: string | null;
  context_mode: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_SHORT_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const;
const REVIEW_TYPE_LABELS = {
  aula: 'Revisao',
  topico: 'Revisao',
  prova: 'Pratica',
  resumo: 'Resumo',
  conceito: 'Conceito',
  pratica: 'Pratica',
} as const;
const EVENT_TYPE_LABELS = {
  meta: 'Meta',
  estudo: 'Bloco',
  revisao: 'Revisao',
} as const;
const GOAL_TYPE_LABELS = {
  aprender_do_zero: 'Aprender do zero',
  praticar: 'Praticar',
  rotina: 'Criar rotina',
  aprofundar: 'Aprofundar',
} as const;
const RHYTHM_LABELS = {
  leve: 'Ritmo leve',
  moderado: 'Ritmo moderado',
  intenso: 'Ritmo intenso',
} as const;
const PACE_STATUS_LABELS = {
  abaixo: 'Abaixo do esperado',
  estavel: 'Ritmo estavel',
  acima: 'Acima do alvo',
} as const;

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao configurado.');
  }

  return supabase;
};

const toLocalDateKey = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toDateKey = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toLocalDateKey(parsed);
};

const fromDateKey = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
};

const addDays = (value: Date, amount: number): Date => {
  const next = new Date(value.getTime());
  next.setDate(next.getDate() + amount);
  return next;
};

const getDayDiff = (later: Date, earlier: Date): number =>
  Math.round((later.getTime() - earlier.getTime()) / DAY_MS);

const formatHoursLabel = (totalMinutes: number): string => {
  const hours = totalMinutes / 60;
  return `${hours.toFixed(hours >= 10 ? 0 : 1).replace('.', ',')}h`;
};

const clampMinutes = (value?: number | null): number => Math.max(Number(value) || 0, 0);

const calculateMinutesInWindow = (
  sessions: StudySessionRow[],
  rangeStart: Date,
  rangeEnd: Date,
): number =>
  sessions.reduce((sum, session) => {
    const sessionKey = toDateKey(session.completed_at || session.date || session.created_at);
    if (!sessionKey) {
      return sum;
    }

    const sessionDate = fromDateKey(sessionKey);
    if (sessionDate < rangeStart || sessionDate >= rangeEnd) {
      return sum;
    }

    return sum + clampMinutes(session.minutes);
  }, 0);

const calculateBestStreak = (dateKeys: string[]): number => {
  if (dateKeys.length === 0) {
    return 0;
  }

  const ascending = [...dateKeys].sort((left, right) => fromDateKey(left).getTime() - fromDateKey(right).getTime());
  let best = 1;
  let current = 1;

  for (let index = 1; index < ascending.length; index += 1) {
    const diff = getDayDiff(fromDateKey(ascending[index]), fromDateKey(ascending[index - 1]));
    if (diff === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
};

const calculateCurrentStreak = (dateKeys: string[], today = new Date()): number => {
  if (dateKeys.length === 0) {
    return 0;
  }

  const descending = [...dateKeys].sort((left, right) => fromDateKey(right).getTime() - fromDateKey(left).getTime());
  const todayKey = toLocalDateKey(today);
  const todayDate = fromDateKey(todayKey);
  const latestDate = fromDateKey(descending[0]);
  const gapFromToday = getDayDiff(todayDate, latestDate);

  if (gapFromToday > 1) {
    return 0;
  }

  let streak = 1;
  let previousDate = latestDate;
  for (let index = 1; index < descending.length; index += 1) {
    const currentDate = fromDateKey(descending[index]);
    const diff = getDayDiff(previousDate, currentDate);
    if (diff !== 1) {
      break;
    }
    streak += 1;
    previousDate = currentDate;
  }

  return streak;
};

const calculateWeeklyMinutes = (sessions: StudySessionRow[], today = new Date()): number => {
  const todayKey = toLocalDateKey(today);
  const todayDate = fromDateKey(todayKey);
  return sessions.reduce((sum, session) => {
    const sessionKey = toDateKey(session.completed_at || session.date || session.created_at);
    if (!sessionKey) {
      return sum;
    }

    const diff = getDayDiff(todayDate, fromDateKey(sessionKey));
    return diff >= 0 && diff < 7 ? sum + Math.max(session.minutes || 0, 0) : sum;
  }, 0);
};

const buildOutrosRankSnapshot = ({
  activeContextId,
  topicIds,
  dailyMinutes,
  studySessions,
  reviewItems,
}: {
  activeContextId: string | null;
  topicIds: string[];
  dailyMinutes: number | null;
  studySessions: StudySessionRow[];
  reviewItems: ReviewPlanItemRow[];
}): OutrosRankSnapshot => {
  const today = new Date();
  const completedSessions = studySessions.filter((session) => session.status !== 'active');
  const dateKeys = Array.from(
    new Set(
      completedSessions
        .map((session) => toDateKey(session.completed_at || session.date || session.created_at))
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const totalMinutes = completedSessions.reduce((sum, session) => sum + Math.max(session.minutes || 0, 0), 0);
  const weeklyMinutes = calculateWeeklyMinutes(completedSessions, today);
  const weeklyTargetMinutes = dailyMinutes ? dailyMinutes * 5 : 0;
  const processedReviews = reviewItems.filter((item) => item.completed).length;
  const pendingReviews = reviewItems
    .filter((item) => !item.completed)
    .sort((left, right) => Date.parse(left.scheduled_for) - Date.parse(right.scheduled_for));
  const recentCompletedSessions = [...completedSessions].sort((left, right) => {
    const rightTime = Date.parse(right.completed_at || right.date || right.created_at);
    const leftTime = Date.parse(left.completed_at || left.date || left.created_at);
    return rightTime - leftTime;
  });
  const activeDaysLast7 = dateKeys.filter((key) => {
    const diff = getDayDiff(fromDateKey(toDateKey(today.toISOString()) || key), fromDateKey(key));
    return diff >= 0 && diff < 7;
  }).length;

  let paceStatus: OutrosRankSnapshot['paceStatus'] = 'estavel';
  if (weeklyTargetMinutes > 0) {
    if (weeklyMinutes >= weeklyTargetMinutes) {
      paceStatus = 'acima';
    } else if (weeklyMinutes < weeklyTargetMinutes * 0.7) {
      paceStatus = 'abaixo';
    }
  } else if (weeklyMinutes === 0 && pendingReviews.length > 0) {
    paceStatus = 'abaixo';
  }

  return {
    studyContextId: activeContextId,
    scopeMode: 'outros',
    scopeTopicIds: topicIds,
    streakCurrent: calculateCurrentStreak(dateKeys, today),
    streakBest: calculateBestStreak(dateKeys),
    totalMinutes,
    totalHoursLabel: formatHoursLabel(totalMinutes),
    completedSessions: completedSessions.length,
    processedReviews,
    weeklyMinutes,
    weeklyTargetMinutes,
    activeDaysLast7,
    activeDaysHistory: dateKeys.length,
    paceStatus,
    pendingReviewsCount: pendingReviews.length,
    nextReviewDueAt: pendingReviews[0]?.scheduled_for || null,
    lastSessionCompletedAt: recentCompletedSessions[0]?.completed_at || recentCompletedSessions[0]?.date || recentCompletedSessions[0]?.created_at || null,
  };
};

const calculateEvolutionPercent = (currentMinutes: number, previousMinutes: number): number => {
  if (currentMinutes <= 0 && previousMinutes <= 0) {
    return 0;
  }

  if (previousMinutes <= 0) {
    return currentMinutes > 0 ? 100 : 0;
  }

  return Math.round(((currentMinutes - previousMinutes) / previousMinutes) * 100);
};

const resolveFocusLabel = ({
  session,
  topicNameById,
  activeTopicName,
}: {
  session: StudySessionRow;
  topicNameById: Map<string, string>;
  activeTopicName: string | null;
}): string => {
  if (session.learning_topic_id && topicNameById.has(session.learning_topic_id)) {
    return topicNameById.get(session.learning_topic_id) || activeTopicName || 'Foco atual';
  }

  if (activeTopicName) {
    return activeTopicName;
  }

  const rawSubject = String(session.subject || '').trim();
  return rawSubject || 'Foco atual';
};

const buildDailyBars = (
  sessions: StudySessionRow[],
  today: Date,
): OutrosRhythmDailyBar[] => {
  const windowStart = addDays(fromDateKey(toLocalDateKey(today)), -6);
  const totalsByDay = sessions.reduce<Map<string, number>>((acc, session) => {
    const sessionKey = toDateKey(session.completed_at || session.date || session.created_at);
    if (!sessionKey) {
      return acc;
    }

    acc.set(sessionKey, (acc.get(sessionKey) || 0) + clampMinutes(session.minutes));
    return acc;
  }, new Map());

  return Array.from({ length: 7 }, (_, index) => {
    const currentDate = addDays(windowStart, index);
    const dateKey = toLocalDateKey(currentDate);
    return {
      day: WEEKDAY_SHORT_LABELS[currentDate.getDay()],
      date: dateKey,
      minutes: totalsByDay.get(dateKey) || 0,
      isToday: dateKey === toLocalDateKey(today),
    };
  });
};

const buildDistributionByFocus = ({
  sessions,
  weekMinutes,
  topicNameById,
  activeTopicName,
}: {
  sessions: StudySessionRow[];
  weekMinutes: number;
  topicNameById: Map<string, string>;
  activeTopicName: string | null;
}): OutrosRhythmDistributionEntry[] => {
  const totals = sessions.reduce<Map<string, { minutes: number; sessions: number }>>((acc, session) => {
    const label = resolveFocusLabel({ session, topicNameById, activeTopicName });
    const current = acc.get(label) || { minutes: 0, sessions: 0 };
    current.minutes += clampMinutes(session.minutes);
    current.sessions += 1;
    acc.set(label, current);
    return acc;
  }, new Map());

  return Array.from(totals.entries())
    .map(([label, value]) => ({
      label,
      minutes: value.minutes,
      sessions: value.sessions,
      sharePercent: weekMinutes > 0 ? Math.round((value.minutes / weekMinutes) * 100) : 0,
    }))
    .sort((left, right) => right.minutes - left.minutes)
    .slice(0, 6);
};

const buildBestDay = (sessions: StudySessionRow[]): OutrosRhythmBestDay | null => {
  const totalsByDay = sessions.reduce<Map<string, number>>((acc, session) => {
    const sessionKey = toDateKey(session.completed_at || session.date || session.created_at);
    if (!sessionKey) {
      return acc;
    }

    acc.set(sessionKey, (acc.get(sessionKey) || 0) + clampMinutes(session.minutes));
    return acc;
  }, new Map());

  const bestEntry = Array.from(totalsByDay.entries()).sort((left, right) => right[1] - left[1])[0];
  if (!bestEntry) {
    return null;
  }

  return {
    date: bestEntry[0],
    label: bestEntry[0],
    minutes: bestEntry[1],
  };
};

const estimateMinutesFromEvent = (event: PersonalGoalEventSummary, fallbackMinutes: number): number => {
  if (!event.endAt) {
    return fallbackMinutes;
  }

  const start = Date.parse(event.startAt);
  const end = Date.parse(event.endAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return fallbackMinutes;
  }

  return Math.max(15, Math.round((end - start) / (60 * 1000)));
};

const buildOutrosNextBestAction = ({
  reviewItems,
  nextStep,
  activePath,
  upcomingEvents,
  topicNameById,
  activeTopicName,
  fallbackMinutes,
}: {
  reviewItems: ReviewPlanItemRow[];
  nextStep: PathStepSummary | null;
  activePath: LearningPathSummary | null;
  upcomingEvents: PersonalGoalEventSummary[];
  topicNameById: Map<string, string>;
  activeTopicName: string | null;
  fallbackMinutes: number;
}): OutrosRhythmNextBestAction | null => {
  const pendingReview = [...reviewItems]
    .filter((item) => !item.completed)
    .sort((left, right) => Date.parse(left.scheduled_for) - Date.parse(right.scheduled_for))[0];

  if (pendingReview) {
    const focusLabel = pendingReview.learning_topic_id
      ? topicNameById.get(pendingReview.learning_topic_id) || activeTopicName || 'foco atual'
      : activeTopicName || 'foco atual';
    return {
      origin: 'review',
      title: pendingReview.content_title || `Revisar ${focusLabel}`,
      type: pendingReview.review_type ? REVIEW_TYPE_LABELS[pendingReview.review_type] || 'Revisao' : 'Revisao',
      estimatedMinutes: Math.max(15, Math.min(fallbackMinutes, 45)),
      reason: `Existe revisao pendente no foco atual${focusLabel ? ` em ${focusLabel}` : ''}.`,
    };
  }

  if (nextStep) {
    return {
      origin: 'step',
      title: nextStep.title,
      type: 'Passo',
      estimatedMinutes: Math.max(20, fallbackMinutes),
      reason: activePath
        ? `Este passo destrava a trilha ${activePath.title}.`
        : 'Este e o proximo passo mais claro para manter o foco andando.',
    };
  }

  const nextEvent = upcomingEvents[0] || null;
  if (nextEvent) {
    return {
      origin: 'event',
      title: nextEvent.title,
      type: EVENT_TYPE_LABELS[nextEvent.type] || 'Bloco',
      estimatedMinutes: estimateMinutesFromEvent(nextEvent, fallbackMinutes),
      reason: 'Ha um compromisso agendado para manter a constancia do foco atual.',
    };
  }

  return null;
};

export const buildOutrosRhythmSnapshot = ({
  rank,
  dailyMinutes,
  studySessions,
  reviewItems,
  upcomingEvents,
  nextStep,
  activePath,
  topicNameById,
  activeTopicName,
}: {
  rank: OutrosRankSnapshot;
  dailyMinutes: number | null;
  studySessions: StudySessionRow[];
  reviewItems: ReviewPlanItemRow[];
  upcomingEvents: PersonalGoalEventSummary[];
  nextStep: PathStepSummary | null;
  activePath: LearningPathSummary | null;
  topicNameById: Map<string, string>;
  activeTopicName: string | null;
}): OutrosRhythmSnapshot => {
  const today = new Date();
  const todayDate = fromDateKey(toLocalDateKey(today));
  const completedSessions = studySessions.filter((session) => session.status !== 'active');
  const weekStart = addDays(todayDate, -6);
  const previousWeekStart = addDays(weekStart, -7);
  const previousWeekEnd = weekStart;
  const dailyBars = buildDailyBars(completedSessions, today);
  const todayMinutes = dailyBars.find((bar) => bar.isToday)?.minutes || 0;
  const weekMinutes = dailyBars.reduce((sum, bar) => sum + bar.minutes, 0);
  const previousWeekMinutes = calculateMinutesInWindow(completedSessions, previousWeekStart, previousWeekEnd);
  const distributionWindowSessions = completedSessions.filter((session) => {
    const sessionKey = toDateKey(session.completed_at || session.date || session.created_at);
    if (!sessionKey) {
      return false;
    }

    const diff = getDayDiff(todayDate, fromDateKey(sessionKey));
    return diff >= 0 && diff < 7;
  });
  const distributionByFocus = buildDistributionByFocus({
    sessions: distributionWindowSessions,
    weekMinutes,
    topicNameById,
    activeTopicName,
  });
  const fallbackMinutes = Math.max(20, Math.min(dailyMinutes || 30, 90));

  return {
    todayMinutes,
    weekMinutes,
    previousWeekMinutes,
    weekTargetMinutes: rank.weeklyTargetMinutes,
    streakCurrent: rank.streakCurrent,
    streakBest: rank.streakBest,
    evolutionPercent: calculateEvolutionPercent(weekMinutes, previousWeekMinutes),
    dailyBars,
    distributionByFocus,
    bestDay: buildBestDay(completedSessions),
    dominantFocus: distributionByFocus[0] || null,
    nextBestAction: buildOutrosNextBestAction({
      reviewItems,
      nextStep,
      activePath,
      upcomingEvents,
      topicNameById,
      activeTopicName,
      fallbackMinutes,
    }),
  };
};

const getDaysSinceIso = (value?: string | null, today = new Date()): number | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Math.max(0, Math.floor((today.getTime() - parsed.getTime()) / DAY_MS));
};

const buildOverviewHeroSnapshot = ({
  activeTopic,
  activeGoal,
  activePath,
  nextStep,
  fallbackFocusTitle,
  contextSummary,
}: {
  activeTopic: LearningTopicSummary | null;
  activeGoal: LearningGoalSummary | null;
  activePath: LearningPathSummary | null;
  nextStep: PathStepSummary | null;
  fallbackFocusTitle: string;
  contextSummary: string | null;
}): OutrosOverviewHeroSnapshot => {
  const focusDetail = activeTopic
    ? [
        activeTopic.category ? `Categoria ${activeTopic.category}` : null,
        activeTopic.level ? `Nivel ${activeTopic.level}` : null,
      ].filter(Boolean).join(' - ')
    : 'O foco livre ainda esta em setup.';

  const whyItMatters =
    activeGoal?.description
    || contextSummary
    || 'Esse foco concentra o que voce quer transformar em progresso real agora.';

  if (activePath) {
    if (activePath.status === 'concluida' || activePath.progressPercent >= 100) {
      return {
        focusTitle: activeTopic?.name || fallbackFocusTitle,
        focusDetail,
        whyItMatters,
        stageLabel: 'Trilha concluida',
        stageDetail: `${activePath.title} ja foi fechada. O proximo passo agora e manter continuidade com novos blocos ou revisoes.`,
      };
    }

    return {
      focusTitle: activeTopic?.name || fallbackFocusTitle,
      focusDetail,
      whyItMatters,
      stageLabel: nextStep ? 'Trilha em andamento' : 'Trilha montada',
      stageDetail: nextStep
        ? `${activePath.title} esta ativa e o proximo passo e ${nextStep.title}.`
        : `${activePath.title} ja existe, mas ainda precisa de um proximo passo claro.`,
    };
  }

  if (activeGoal) {
    return {
      focusTitle: activeTopic?.name || fallbackFocusTitle,
      focusDetail,
      whyItMatters,
      stageLabel: 'Objetivo definido',
      stageDetail: 'Seu foco ja tem direcao, mas ainda precisa virar trilha executavel.',
    };
  }

  if (activeTopic) {
    return {
      focusTitle: activeTopic.name,
      focusDetail,
      whyItMatters,
      stageLabel: 'Foco definido',
      stageDetail: 'O tema esta salvo. Agora vale transformar isso em objetivo e proximo passo.',
    };
  }

  return {
    focusTitle: fallbackFocusTitle,
    focusDetail,
    whyItMatters,
    stageLabel: 'Setup inicial',
    stageDetail: 'Defina tema, objetivo e trilha para a Visao geral virar um centro de comando completo.',
  };
};

const buildOverviewNextActionSnapshot = ({
  activeTopic,
  activeGoal,
  activePath,
  nextStep,
  rhythm,
}: {
  activeTopic: LearningTopicSummary | null;
  activeGoal: LearningGoalSummary | null;
  activePath: LearningPathSummary | null;
  nextStep: PathStepSummary | null;
  rhythm: OutrosRhythmSnapshot;
}): OutrosOverviewNextActionSnapshot => {
  if (rhythm.nextBestAction) {
    if (rhythm.nextBestAction.origin === 'review') {
      return {
        title: rhythm.nextBestAction.title,
        type: rhythm.nextBestAction.type,
        estimatedMinutes: rhythm.nextBestAction.estimatedMinutes,
        impact: 'Protege a retencao do foco antes do proximo bloco da trilha.',
        reason: rhythm.nextBestAction.reason,
        ctaLabel: 'Comecar agora',
        ctaTarget: 'cronograma',
        secondaryLabel: activePath ? 'Abrir plano' : null,
        secondaryTarget: activePath ? 'arvore' : null,
      };
    }

    if (rhythm.nextBestAction.origin === 'step') {
      return {
        title: rhythm.nextBestAction.title,
        type: rhythm.nextBestAction.type,
        estimatedMinutes: rhythm.nextBestAction.estimatedMinutes,
        impact: activePath
          ? `Destrava a trilha ${activePath.title} e mantem o foco andando.`
          : 'Transforma o foco atual em acao concreta.',
        reason: rhythm.nextBestAction.reason,
        ctaLabel: activePath ? 'Continuar trilha' : 'Comecar agora',
        ctaTarget: 'cronograma',
        secondaryLabel: activePath ? 'Abrir plano' : 'Refinar foco',
        secondaryTarget: activePath ? 'arvore' : 'departamento',
      };
    }

    return {
      title: rhythm.nextBestAction.title,
      type: rhythm.nextBestAction.type,
      estimatedMinutes: rhythm.nextBestAction.estimatedMinutes,
      impact: 'Mantem a semana em movimento com um compromisso ja previsto.',
      reason: rhythm.nextBestAction.reason,
      ctaLabel: 'Abrir execucao',
      ctaTarget: 'cronograma',
      secondaryLabel: 'Ver ritmo',
      secondaryTarget: 'dashboard',
    };
  }

  if (activeTopic && !activeGoal) {
    return {
      title: 'Definir objetivo do foco',
      type: 'Objetivo',
      estimatedMinutes: 10,
      impact: 'Diz para o sistema por que esse foco importa e o que voce quer destravar.',
      reason: 'Ainda nao existe objetivo ativo conectado ao tema principal.',
      ctaLabel: 'Refinar foco',
      ctaTarget: 'departamento',
      secondaryLabel: null,
      secondaryTarget: null,
    };
  }

  if (activeTopic && !activePath) {
    return {
      title: `Montar trilha para ${activeTopic.name}`,
      type: 'Plano',
      estimatedMinutes: 15,
      impact: 'Transforma o foco em sequencia executavel com proximo passo claro.',
      reason: 'Seu tema ja existe, mas ainda nao tem trilha ativa.',
      ctaLabel: 'Montar trilha',
      ctaTarget: 'arvore',
      secondaryLabel: 'Refinar foco',
      secondaryTarget: 'departamento',
    };
  }

  return {
    title: 'Definir o foco principal',
    type: 'Setup',
    estimatedMinutes: 10,
    impact: 'Sem um foco salvo, o restante da Visao geral fica sem centro.',
    reason: 'Ainda nao existe tema ativo para este contexto.',
    ctaLabel: 'Criar foco',
    ctaTarget: 'departamento',
    secondaryLabel: null,
    secondaryTarget: null,
  };
};

const buildOverviewPlanStateSnapshot = ({
  activeTopic,
  activeGoal,
  activePath,
  nextStep,
  rank,
  steps,
}: {
  activeTopic: LearningTopicSummary | null;
  activeGoal: LearningGoalSummary | null;
  activePath: LearningPathSummary | null;
  nextStep: PathStepSummary | null;
  rank: OutrosRankSnapshot;
  steps: PathStepSummary[];
}): OutrosOverviewPlanStateSnapshot => {
  const activePathSteps = steps.filter((step) => step.pathId === activePath?.id);
  const activePathCompleted = activePathSteps.filter((step) => step.status === 'concluido').length;

  return {
    topicLabel: activeTopic?.name || 'Tema ainda nao definido',
    topicDetail: activeTopic
      ? [
          activeTopic.category ? activeTopic.category : null,
          activeTopic.level ? `nivel ${activeTopic.level}` : null,
        ].filter(Boolean).join(' - ')
      : 'Crie um tema para dar identidade ao estudo livre.',
    goalLabel: activeGoal?.description || (activeGoal ? GOAL_TYPE_LABELS[activeGoal.goalType] : 'Objetivo ainda nao definido'),
    goalDetail: activeGoal
      ? `Objetivo ${GOAL_TYPE_LABELS[activeGoal.goalType]} ligado ao foco atual.`
      : 'Sem objetivo ativo conectado ao tema principal.',
    pathLabel: activePath?.title || 'Sem trilha ativa',
    pathDetail: activePath
      ? `${activePath.progressPercent}% concluido - ${activePathCompleted}/${activePathSteps.length || 0} passos fechados${nextStep ? ` - proximo: ${nextStep.title}` : ''}`
      : 'Monte uma trilha para sair do resumo e entrar em execucao repetivel.',
    progressPercent: activePath?.progressPercent ?? null,
    nextReviewLabel: rank.pendingReviewsCount ? `Proxima revisao em ${rank.nextReviewDueAt ? toDateKey(rank.nextReviewDueAt) || 'breve' : 'breve'}` : 'Sem revisao pendente',
    nextReviewDetail: rank.pendingReviewsCount
      ? `${rank.pendingReviewsCount} revisao(oes) aguardando no foco atual.`
      : 'Nenhuma revisao esta pedindo atencao agora.',
  };
};

const buildOverviewAlerts = ({
  rank,
  activePath,
  nextStep,
  nextAction,
}: {
  rank: OutrosRankSnapshot;
  activePath: LearningPathSummary | null;
  nextStep: PathStepSummary | null;
  nextAction: OutrosOverviewNextActionSnapshot;
}): OutrosOverviewAlertSnapshot[] => {
  const alerts: OutrosOverviewAlertSnapshot[] = [];
  const daysSinceLastSession = getDaysSinceIso(rank.lastSessionCompletedAt);

  if (rank.pendingReviewsCount > 0) {
    alerts.push({
      id: 'pending-review',
      title: 'Revisao vencendo',
      detail: `${rank.pendingReviewsCount} revisao(oes) pedem atencao antes que o foco esfrie.`,
      tone: 'warning',
      actionLabel: 'Abrir execucao',
      actionTarget: 'cronograma',
    });
  }

  if (!nextStep) {
    alerts.push({
      id: 'missing-next-step',
      title: activePath ? 'Trilha sem proximo passo' : 'Foco sem trilha ativa',
      detail: activePath
        ? `${activePath.title} precisa de continuidade clara para nao virar plano parado.`
        : 'Seu foco atual ainda nao tem trilha montada para sustentar a execucao.',
      tone: 'warning',
      actionLabel: activePath ? 'Abrir plano' : 'Montar trilha',
      actionTarget: 'arvore',
    });
  }

  if (rank.weeklyTargetMinutes <= 0) {
    alerts.push({
      id: 'missing-week-target',
      title: 'Semana sem meta',
      detail: 'Defina minutos diarios no contexto para o ritmo da semana deixar de ficar cego.',
      tone: 'info',
      actionLabel: 'Rever foco',
      actionTarget: 'departamento',
    });
  }

  if (daysSinceLastSession !== null && daysSinceLastSession >= 2) {
    alerts.push({
      id: 'stalled-focus',
      title: `Foco parado ha ${daysSinceLastSession} dia(s)`,
      detail: 'Um bloco curto agora ja evita que a retomada fique mais pesada depois.',
      tone: 'warning',
      actionLabel: 'Comecar agora',
      actionTarget: 'cronograma',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'all-good',
      title: 'Tudo em movimento',
      detail: 'Foco, trilha e ritmo estao coerentes. O melhor proximo passo agora e continuar o plano.',
      tone: 'positive',
      actionLabel: nextAction.ctaLabel,
      actionTarget: nextAction.ctaTarget,
    });
  }

  return alerts;
};

export const buildOutrosOverviewSnapshot = ({
  activeTopic,
  activeGoal,
  activePath,
  nextStep,
  rank,
  rhythm,
  steps,
  recentSessions,
  fallbackFocusTitle,
  contextSummary,
}: {
  activeTopic: LearningTopicSummary | null;
  activeGoal: LearningGoalSummary | null;
  activePath: LearningPathSummary | null;
  nextStep: PathStepSummary | null;
  rank: OutrosRankSnapshot;
  rhythm: OutrosRhythmSnapshot;
  steps: PathStepSummary[];
  recentSessions: OutrosRecentSessionSummary[];
  fallbackFocusTitle: string;
  contextSummary: string | null;
}): OutrosOverviewSnapshot => {
  const nextAction = buildOverviewNextActionSnapshot({
    activeTopic,
    activeGoal,
    activePath,
    nextStep,
    rhythm,
  });

  return {
    hero: buildOverviewHeroSnapshot({
      activeTopic,
      activeGoal,
      activePath,
      nextStep,
      fallbackFocusTitle,
      contextSummary,
    }),
    nextAction,
    planState: buildOverviewPlanStateSnapshot({
      activeTopic,
      activeGoal,
      activePath,
      nextStep,
      rank,
      steps,
    }),
    weeklyRhythm: {
      streakCurrent: rank.streakCurrent,
      streakBest: rank.streakBest,
      weekMinutes: rhythm.weekMinutes,
      weekTargetMinutes: rhythm.weekTargetMinutes,
      paceStatus: rank.paceStatus,
      paceStatusLabel: PACE_STATUS_LABELS[rank.paceStatus],
      activeDaysLast7: rank.activeDaysLast7,
      lastSessionGapDays: getDaysSinceIso(rank.lastSessionCompletedAt),
      recentSessions: recentSessions.slice(0, 4),
    },
    alerts: buildOverviewAlerts({
      rank,
      activePath,
      nextStep,
      nextAction,
    }),
  };
};

const formatStepReference = (step: PathStepSummary): string => `Etapa ${step.stepOrder}`;

export const buildOutrosFocusSnapshot = ({
  activeTopic,
  activeGoal,
  activePath,
  nextStep,
  topics,
  goals,
  paths,
  events,
  contextSummary,
  dailyMinutes,
  profileRhythm,
  rank,
}: {
  activeTopic: LearningTopicSummary | null;
  activeGoal: LearningGoalSummary | null;
  activePath: LearningPathSummary | null;
  nextStep: PathStepSummary | null;
  topics: LearningTopicSummary[];
  goals: LearningGoalSummary[];
  paths: LearningPathSummary[];
  events: PersonalGoalEventSummary[];
  contextSummary: string | null;
  dailyMinutes: number | null;
  profileRhythm: string | null;
  rank: OutrosRankSnapshot;
}): OutrosFocusSnapshot => {
  const rhythmLabel = profileRhythm && profileRhythm in RHYTHM_LABELS
    ? RHYTHM_LABELS[profileRhythm as keyof typeof RHYTHM_LABELS]
    : 'Ritmo ainda nao definido';

  let stageLabel = 'Setup inicial';
  let stageDetail = 'Tema, objetivo e trilha ainda precisam ganhar forma para o foco virar rotina real.';

  if (activePath) {
    stageLabel = nextStep ? 'Foco com trilha ativa' : 'Foco com trilha montada';
    stageDetail = nextStep
      ? `${activePath.title} ja organiza o foco e segue para ${nextStep.title}.`
      : `${activePath.title} ja existe, mas precisa de um proximo passo claro para nao esfriar.`;
  } else if (activeGoal) {
    stageLabel = 'Foco com direcao';
    stageDetail = 'O objetivo ja esta claro. O proximo salto e transformar isso em trilha executavel.';
  } else if (activeTopic) {
    stageLabel = 'Foco definido';
    stageDetail = 'O tema principal ja existe. Agora vale amarrar objetivo e continuidade.';
  }

  let managementStatusLabel = 'Base ainda em montagem';
  let managementStatusDetail = 'Comece pelo primeiro tema para liberar objetivo, trilha e manutencao do dominio.';

  if (topics.length > 0) {
    managementStatusLabel = paths.length > 0 ? 'Base viva do foco' : 'Foco pronto para virar plano';
    managementStatusDetail = paths.length > 0
      ? 'Tema, objetivo e trilha ja podem ser mantidos no mesmo lugar sem perder a coerencia do shell.'
      : 'O foco ja tem identidade. Falta consolidar a trilha para a execucao nao depender de memoria.';
  }

  return {
    identity: {
      topicLabel: activeTopic?.name || 'Tema ainda nao definido',
      topicDetail: activeTopic
        ? [
            activeTopic.category ? activeTopic.category : null,
            activeTopic.level ? `nivel ${activeTopic.level}` : null,
          ].filter(Boolean).join(' - ')
        : 'Escolha um tema principal para dar identidade ao estudo livre.',
      goalLabel: activeGoal
        ? GOAL_TYPE_LABELS[activeGoal.goalType]
        : 'Objetivo ainda nao definido',
      goalDetail: activeGoal?.description
        || (activeGoal
          ? `Objetivo ${GOAL_TYPE_LABELS[activeGoal.goalType]} ligado ao foco atual.`
          : 'Sem objetivo ativo conectado ao tema principal.'),
      whyItMatters: activeGoal?.description
        || contextSummary
        || 'Esse foco concentra o tema que voce quer transformar em progresso real agora.',
    },
    commitment: {
      stageLabel,
      stageDetail,
      rhythmLabel,
      rhythmDetail: dailyMinutes
        ? `${dailyMinutes} min por dia previstos - ${PACE_STATUS_LABELS[rank.paceStatus]}.`
        : `${PACE_STATUS_LABELS[rank.paceStatus]}. Defina minutos diarios para o ritmo parar de depender de memoria.`,
      continuityLabel: nextStep
        ? nextStep.title
        : activePath
          ? 'Trilha sem proximo passo'
          : 'Sem continuidade pronta',
      continuityDetail: nextStep
        ? `${formatStepReference(nextStep)} da trilha ${activePath?.title || 'atual'} segue como melhor continuidade do foco.`
        : activePath
          ? `${activePath.title} precisa de uma nova etapa para a execucao voltar a andar.`
          : 'Crie uma trilha com passos curtos para tirar o foco do campo abstrato.',
    },
    management: {
      statusLabel: managementStatusLabel,
      statusDetail: managementStatusDetail,
      metrics: [
        {
          label: 'Temas',
          value: String(topics.length),
          detail: activeTopic ? `Ativo: ${activeTopic.name}.` : 'Nenhum tema ativo salvo agora.',
        },
        {
          label: 'Objetivos',
          value: String(goals.length),
          detail: activeGoal
            ? `Objetivo atual: ${GOAL_TYPE_LABELS[activeGoal.goalType]}.`
            : 'Sem objetivo ativo ligado ao tema principal.',
        },
        {
          label: 'Trilhas',
          value: String(paths.length),
          detail: activePath
            ? `${activePath.title} segue como trilha principal.`
            : 'Ainda sem trilha ativa para sustentar o foco.',
        },
        {
          label: 'Agenda',
          value: String(events.length),
          detail: events.length > 0
            ? 'Metas, blocos e revisoes ja aparecem no radar do dominio.'
            : 'Sem eventos ligados ao foco neste momento.',
        },
      ],
    },
  };
};

export const buildOutrosPlanSnapshot = ({
  activeTopic,
  activePath,
  nextStep,
  paths,
  steps,
  events,
  upcomingEvents,
  rank,
}: {
  activeTopic: LearningTopicSummary | null;
  activePath: LearningPathSummary | null;
  nextStep: PathStepSummary | null;
  paths: LearningPathSummary[];
  steps: PathStepSummary[];
  events: PersonalGoalEventSummary[];
  upcomingEvents: PersonalGoalEventSummary[];
  rank: OutrosRankSnapshot;
}): OutrosPlanSnapshot => {
  const activePathSteps = steps.filter((step) => step.pathId === activePath?.id);
  const inProgressSteps = activePathSteps.filter((step) => step.status === 'em_andamento');
  const queuedSteps = activePathSteps.filter((step) => step.status === 'nao_iniciado');
  const completedSteps = activePathSteps.filter((step) => step.status === 'concluido');
  const currentStep = inProgressSteps[0] || nextStep || null;
  const nextEvent = upcomingEvents[0] || null;

  let managementStatusLabel = 'Plano em montagem';
  let managementStatusDetail = 'Monte a primeira trilha com passos claros para o foco ganhar continuidade de verdade.';

  if (paths.length > 0) {
    managementStatusLabel = nextStep ? 'Plano administravel' : 'Plano pede continuidade';
    managementStatusDetail = nextStep
      ? 'Trilha, backlog e agenda ja podem ser mantidos de forma deliberada sem colar tudo em uma unica lista.'
      : 'A trilha existe, mas ainda precisa de um proximo passo claro para nao virar plano parado.';
  }

  return {
    structure: {
      pathLabel: activePath?.title || 'Sem trilha ativa',
      pathDetail: activePath
        ? `${activePath.progressPercent}% concluido - ${completedSteps.length}/${activePathSteps.length || 0} passos fechados${activeTopic ? ` - foco: ${activeTopic.name}` : ''}.`
        : 'Monte uma trilha para transformar o foco em sequencia executavel com backlog e revisao claros.',
      progressPercent: activePath?.progressPercent ?? null,
      statusLabel: activePath?.status || 'setup',
      nextStepLabel: currentStep?.title || 'Nenhum passo em andamento',
      nextStepDetail: currentStep
        ? `${formatStepReference(currentStep)} - ${currentStep.description || 'Melhor continuidade do plano agora.'}`
        : activePath
          ? `${activePath.title} esta sem proxima etapa definida.`
          : 'Sem trilha ativa, o plano ainda nao consegue ordenar o que vem agora.',
    },
    backlog: {
      currentStepLabel: currentStep?.title || 'Backlog sem passo atual',
      currentStepDetail: currentStep
        ? `${formatStepReference(currentStep)} da trilha ${activePath?.title || 'atual'}.`
        : activePath
          ? `${activePath.title} precisa de um passo em andamento ou uma fila clara.`
          : 'Crie uma trilha e adicione passos para liberar backlog real.',
      lanes: [
        {
          id: 'in_progress',
          label: 'Em progresso',
          count: inProgressSteps.length,
          detail: inProgressSteps.length > 0
            ? 'Passos que ja estao abertos e puxam a execucao do momento.'
            : 'Nenhum passo esta em andamento agora.',
          items: inProgressSteps.slice(0, 3).map((step) => `${formatStepReference(step)} - ${step.title}`),
          tone: 'active',
        },
        {
          id: 'queued',
          label: 'Fila imediata',
          count: queuedSteps.length,
          detail: queuedSteps.length > 0
            ? 'O que vem depois do passo atual sem precisar redecidir a trilha.'
            : 'Nao existe fila imediata pronta para a trilha atual.',
          items: queuedSteps.slice(0, 3).map((step) => `${formatStepReference(step)} - ${step.title}`),
          tone: 'queue',
        },
        {
          id: 'completed',
          label: 'Historico',
          count: completedSteps.length,
          detail: completedSteps.length > 0
            ? 'Passos que ja sairam do backlog principal e contam a evolucao da trilha.'
            : 'Ainda nao ha passos concluidos nesta trilha.',
          items: completedSteps.slice(-3).reverse().map((step) => `${formatStepReference(step)} - ${step.title}`),
          tone: 'history',
        },
      ],
    },
    reviewState: {
      pendingLabel: rank.pendingReviewsCount > 0
        ? `${rank.pendingReviewsCount} revisao(oes) pendente(s)`
        : 'Sem revisoes pendentes',
      pendingDetail: rank.pendingReviewsCount > 0
        ? `A proxima fila vence em ${rank.nextReviewDueAt ? toDateKey(rank.nextReviewDueAt) || 'breve' : 'breve'}.`
        : 'Nenhuma revisao esta pressionando o plano agora.',
      processedLabel: `${rank.processedReviews} revisao(oes) processada(s)`,
      processedDetail: rank.processedReviews > 0
        ? 'A trilha ja tem historico de retencao e nao so execucao.'
        : 'Ainda nao houve revisao concluida dentro deste foco.',
      supportLabel: nextEvent?.title || 'Sem evento de apoio',
      supportDetail: nextEvent
        ? `${EVENT_TYPE_LABELS[nextEvent.type] || 'Compromisso'} em ${toDateKey(nextEvent.startAt) || 'breve'}${nextEvent.topicName ? ` - ${nextEvent.topicName}` : ''}.`
        : 'Quando houver meta, estudo ou revisao agendada, ela aparece aqui como suporte do plano.',
    },
    management: {
      statusLabel: managementStatusLabel,
      statusDetail: managementStatusDetail,
      metrics: [
        {
          label: 'Trilhas',
          value: String(paths.length),
          detail: activePath ? `Principal: ${activePath.title}.` : 'Nenhuma trilha ativa definida.',
        },
        {
          label: 'Passos',
          value: String(steps.length),
          detail: nextStep ? `Proximo: ${nextStep.title}.` : 'Sem proximo passo destacado agora.',
        },
        {
          label: 'Agenda',
          value: String(events.length),
          detail: upcomingEvents.length > 0
            ? `${upcomingEvents.length} compromisso(s) ainda no radar da trilha.`
            : 'Sem agenda futura ligada ao plano.',
        },
        {
          label: 'Revisoes',
          value: String(rank.pendingReviewsCount),
          detail: rank.processedReviews > 0
            ? `${rank.processedReviews} revisao(oes) ja processada(s) no foco atual.`
            : 'Ainda sem revisoes concluidas na trilha.',
        },
      ],
    },
  };
};

class OutrosDashboardService {
  async getOutrosDashboardData(userId: string): Promise<OutrosDashboardData> {
    const client = assertClient();
    const nowIso = new Date().toISOString();

    const [{ data: contextRow, error: contextError }, { data: topicRows, error: topicError }] = await Promise.all([
      client
        .from('user_study_contexts')
        .select('id, context_summary, context_description, context_payload')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('mode', 'outros')
        .maybeSingle(),
      client
        .from('learning_topics')
        .select('id, name, category, level, status')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
    ]);

    if (contextError) {
      throw new Error(`Erro ao carregar contexto de estudo livre: ${contextError.message}`);
    }

    if (topicError) {
      throw new Error(`Erro ao carregar temas: ${topicError.message}`);
    }

    const activeContext = (contextRow as StudyContextRow | null) || null;
    const payload = activeContext?.context_payload?.outros || null;
    const topics = ((topicRows || []) as LearningTopicRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category ?? null,
      level: row.level,
      status: row.status,
    }));

    const activeTopic =
      topics.find((topic) => topic.status === 'ativo')
      || topics.find((topic) => topic.status !== 'concluido')
      || topics[0]
      || null;
    const topicIds = topics.map((topic) => topic.id);
    const topicIdSet = new Set(topicIds);
    const topicNameById = new Map(topics.map((topic) => [topic.id, topic.name]));

    const [
      { data: goalRows, error: goalError },
      { data: pathRows, error: pathError },
      { data: eventRows, error: eventError },
      { data: sessionRows, error: sessionError },
      { data: reviewRows, error: reviewError },
    ] = await Promise.all([
      client
        .from('learning_goals')
        .select('id, topic_id, goal_type, description, status')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      client
        .from('learning_paths')
        .select('id, topic_id, title, progress_percent, status')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      client
        .from('personal_goal_events')
        .select('id, topic_id, title, start_at, end_at, event_type, status')
        .eq('user_id', userId)
        .neq('status', 'cancelado')
        .order('start_at', { ascending: true }),
      client
        .from('study_sessions')
        .select('id, date, minutes, status, subject, session_type, created_at, completed_at, learning_topic_id, context_mode')
        .eq('user_id', userId)
        .eq('context_mode', 'outros')
        .order('created_at', { ascending: false }),
      client
        .from('review_plan_items')
        .select('id, scheduled_for, completed, review_type, content_title, learning_topic_id, context_mode')
        .eq('user_id', userId)
        .eq('context_mode', 'outros')
        .order('scheduled_for', { ascending: true }),
    ]);

    if (goalError) {
      throw new Error(`Erro ao carregar objetivos do modo livre: ${goalError.message}`);
    }

    if (pathError) {
      throw new Error(`Erro ao carregar trilhas: ${pathError.message}`);
    }

    if (eventError) {
      throw new Error(`Erro ao carregar calendario leve: ${eventError.message}`);
    }

    if (sessionError) {
      throw new Error(`Erro ao carregar sessoes do modo livre: ${sessionError.message}`);
    }

    if (reviewError) {
      throw new Error(`Erro ao carregar revisoes do modo livre: ${reviewError.message}`);
    }

    const goals = ((goalRows || []) as LearningGoalRow[]).map((row) => ({
      id: row.id,
      topicId: row.topic_id,
      goalType: row.goal_type,
      description: row.description ?? null,
      status: row.status,
    }));

    const paths = ((pathRows || []) as LearningPathRow[]).map((row) => ({
      id: row.id,
      topicId: row.topic_id,
      title: row.title,
      progressPercent: row.progress_percent,
      status: row.status,
    }));

    const pathIds = paths.map((path) => path.id);
    let steps: PathStepSummary[] = [];

    if (pathIds.length > 0) {
      const { data: stepRows, error: stepError } = await client
        .from('learning_path_steps')
        .select('id, path_id, title, description, step_order, status')
        .eq('user_id', userId)
        .in('path_id', pathIds)
        .order('step_order', { ascending: true });

      if (stepError) {
        throw new Error(`Erro ao carregar passos da trilha: ${stepError.message}`);
      }

      steps = ((stepRows || []) as LearningPathStepRow[]).map((row) => ({
        id: row.id,
        pathId: row.path_id,
        title: row.title,
        description: row.description ?? null,
        stepOrder: row.step_order,
        status: row.status,
      }));
    }

    const activeGoal =
      goals.find((goal) => goal.status === 'ativo' && goal.topicId === activeTopic?.id)
      || goals.find((goal) => goal.status === 'ativo')
      || goals.find((goal) => goal.status !== 'arquivado')
      || goals[0]
      || null;
    const activePath =
      paths.find((path) => path.status === 'ativa' && path.topicId === activeTopic?.id)
      || paths.find((path) => path.status === 'ativa')
      || paths.find((path) => path.status !== 'concluida')
      || paths[0]
      || null;
    const nextStep =
      steps.find((step) => step.pathId === activePath?.id && step.status !== 'concluido')
      || steps.find((step) => step.pathId === activePath?.id)
      || null;

    const events = ((eventRows || []) as PersonalGoalEventRow[]).map((row) => ({
      id: row.id,
      topicId: row.topic_id ?? null,
      topicName: row.topic_id ? topicNameById.get(row.topic_id) || null : null,
      title: row.title,
      startAt: row.start_at,
      endAt: row.end_at ?? null,
      type: row.event_type,
      status: row.status,
    }));

    const scopedEvents = events.filter((event) =>
      topicIdSet.size === 0
        ? true
        : Boolean(event.topicId && topicIdSet.has(event.topicId)),
    );
    const upcomingEvents = scopedEvents.filter((event) => event.startAt >= nowIso).slice(0, 5);
    const weeklyGoal = upcomingEvents.find((event) => event.type === 'meta') || upcomingEvents[0] || null;
    const scopedStudySessions = ((sessionRows || []) as StudySessionRow[]).filter((session) =>
      topicIdSet.size === 0
        ? true
        : Boolean(session.learning_topic_id && topicIdSet.has(session.learning_topic_id)),
    );
    const scopedReviewItems = ((reviewRows || []) as ReviewPlanItemRow[]).filter((item) =>
      topicIdSet.size === 0
        ? true
        : Boolean(item.learning_topic_id && topicIdSet.has(item.learning_topic_id)),
    );
    const recentSessions = scopedStudySessions
      .filter((session) => session.status !== 'active')
      .sort((left, right) => {
        const rightTime = Date.parse(right.completed_at || right.date || right.created_at);
        const leftTime = Date.parse(left.completed_at || left.date || left.created_at);
        return rightTime - leftTime;
      })
      .slice(0, 4)
      .map((session) => ({
        id: session.id,
        topicName: session.learning_topic_id ? topicNameById.get(session.learning_topic_id) || null : activeTopic?.name || null,
        minutes: Math.max(session.minutes || 0, 0),
        happenedAt: session.completed_at || session.date || session.created_at,
      }));
    const rank = buildOutrosRankSnapshot({
      activeContextId: activeContext?.id || null,
      topicIds,
      dailyMinutes: payload?.dailyMinutes ?? null,
      studySessions: scopedStudySessions,
      reviewItems: scopedReviewItems,
    });
    const rhythm = buildOutrosRhythmSnapshot({
      rank,
      dailyMinutes: payload?.dailyMinutes ?? null,
      studySessions: scopedStudySessions,
      reviewItems: scopedReviewItems,
      upcomingEvents,
      nextStep,
      activePath,
      topicNameById,
      activeTopicName: activeTopic?.name || payload?.topicName || null,
    });
    const overview = buildOutrosOverviewSnapshot({
      activeTopic,
      activeGoal,
      activePath,
      nextStep,
      rank,
      rhythm,
      steps,
      recentSessions,
      fallbackFocusTitle: payload?.topicName || activeTopic?.name || 'Tema principal',
      contextSummary: activeContext?.context_summary || activeContext?.context_description || null,
    });
    const focus = buildOutrosFocusSnapshot({
      activeTopic,
      activeGoal,
      activePath,
      nextStep,
      topics,
      goals,
      paths,
      events: scopedEvents,
      contextSummary: activeContext?.context_summary || activeContext?.context_description || null,
      dailyMinutes: payload?.dailyMinutes ?? null,
      profileRhythm: payload?.pace || null,
      rank,
    });
    const plan = buildOutrosPlanSnapshot({
      activeTopic,
      activePath,
      nextStep,
      paths,
      steps,
      events: scopedEvents,
      upcomingEvents,
      rank,
    });

    return {
      activeContext: activeContext
        ? {
            id: activeContext.id,
            summary: activeContext.context_summary || null,
            description: activeContext.context_description || null,
          }
        : null,
      profile: {
        mainTopic: payload?.topicName || activeTopic?.name || null,
        goal: payload?.goalType || null,
        level: payload?.level || null,
        rhythm: payload?.pace || null,
        dailyMinutes: payload?.dailyMinutes ?? null,
      },
      topics,
      goals,
      paths,
      steps,
      events: scopedEvents,
      activeTopic,
      activeGoal,
      activePath,
      nextStep,
      weeklyGoal,
      upcomingEvents,
      recentSessions,
      rank,
      rhythm,
      overview,
      focus,
      plan,
    };
  }
}

export const outrosDashboardService = new OutrosDashboardService();
