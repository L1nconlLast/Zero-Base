import type {
  BeginnerAssessmentEntry,
  BeginnerDropStep,
  BeginnerPlan,
  BeginnerProgressStage,
  BeginnerStats,
  BeginnerWeekSummary,
} from '../types';

type Track = BeginnerPlan['track'];

type SessionStartedInput = {
  day: number;
  missionId: string;
  plannedMinutes: number;
  at?: string;
};

type SessionCompletedInput = {
  day: number;
  duration: number;
  completed: boolean;
  at?: string;
};

type AssessmentCompletedInput = {
  day: number;
  missionId: string;
  subject: string;
  correct: number;
  total: number;
  xpGained: number;
  at?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateKey = (value: string | Date): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
};

const diffDays = (later: string, earlier: string): number => {
  const laterDate = new Date(`${toDateKey(later)}T12:00:00`);
  const earlierDate = new Date(`${toDateKey(earlier)}T12:00:00`);
  return Math.round((laterDate.getTime() - earlierDate.getTime()) / DAY_MS);
};

const sortDateKeys = (dates: string[]): string[] =>
  [...dates].sort((a, b) => new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime());

const getCurrentStreak = (dates: string[]): number => {
  const sorted = sortDateKeys(Array.from(new Set(dates)));
  if (sorted.length === 0) return 0;

  let streak = 1;
  for (let index = sorted.length - 1; index > 0; index -= 1) {
    const current = sorted[index];
    const previous = sorted[index - 1];
    if (diffDays(current, previous) === 1) {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
};

const getAccuracyAvg = (totalCorrect: number, totalQuestions: number): number =>
  totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

const getStrongestWeakest = (assessments: BeginnerAssessmentEntry[]): { strongest: string | null; weakest: string | null } => {
  if (assessments.length === 0) {
    return { strongest: null, weakest: null };
  }

  const bySubject = new Map<string, { correct: number; total: number }>();
  assessments.forEach((entry) => {
    const current = bySubject.get(entry.subject) || { correct: 0, total: 0 };
    current.correct += entry.correct;
    current.total += entry.total;
    bySubject.set(entry.subject, current);
  });

  const ranked = [...bySubject.entries()]
    .map(([subject, value]) => ({
      subject,
      accuracy: value.total > 0 ? value.correct / value.total : 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  return {
    strongest: ranked[0]?.subject || null,
    weakest: ranked[ranked.length - 1]?.subject || null,
  };
};

const getConsistencyLabel = (streak: number, sessionsCompleted: number): string => {
  if (streak >= 3 && sessionsCompleted >= 3) {
    return 'Voce foi consistente - isso e o mais importante.';
  }

  if (sessionsCompleted >= 2) {
    return 'Voce ja saiu da inercia e criou os primeiros sinais de rotina.';
  }

  return 'Voce comecou. O proximo passo ja esta pronto e precisa continuar simples.';
};

const evaluateStage = (stats: BeginnerStats): BeginnerProgressStage => {
  const now = new Date().toISOString();
  const daysSinceLastActive = stats.lastActiveAt ? diffDays(now, stats.lastActiveAt) : 0;

  if (stats.lastActiveAt && daysSinceLastActive >= 2) {
    return 'recovery_mode';
  }

  if (stats.sessionsCompleted >= 3 && stats.streak >= 3 && stats.activeDates.length >= 3) {
    return 'ready_for_intermediate';
  }

  if (stats.sessionsCompleted >= 2) {
    return 'engaged_beginner';
  }

  return 'early_beginner';
};

const withStage = (stats: BeginnerStats): BeginnerStats => {
  const progressStage = evaluateStage(stats);
  return {
    ...stats,
    progressStage,
    promotedAt: progressStage === 'ready_for_intermediate' ? stats.promotedAt || new Date().toISOString() : null,
  };
};

export const beginnerProgressService = {
  createInitialStats(): BeginnerStats {
    return {
      startedAt: new Date().toISOString(),
      onboardingCompletedAt: null,
      focus: null,
      timeAvailable: null,
      lastActiveAt: null,
      lastReturnTrackedDate: null,
      sessionsStarted: 0,
      sessionsCompleted: 0,
      activeDates: [],
      streak: 0,
      returnedNextDayCount: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      accuracyAvg: 0,
      assessments: [],
      lastDropPoint: null,
      progressStage: 'early_beginner',
      promotedAt: null,
      weekSummarySeenAt: null,
    };
  },

  completeOnboarding(stats: BeginnerStats | null | undefined, focus: Track, timeAvailable: 30 | 60 | 120, at = new Date().toISOString()): BeginnerStats {
    const base = stats || this.createInitialStats();
    return withStage({
      ...base,
      onboardingCompletedAt: at,
      focus,
      timeAvailable,
      lastActiveAt: at,
      lastDropPoint: null,
    });
  },

  recordSessionStarted(stats: BeginnerStats | null | undefined, input: SessionStartedInput): BeginnerStats {
    const base = stats || this.createInitialStats();
    return withStage({
      ...base,
      sessionsStarted: base.sessionsStarted + 1,
      lastActiveAt: input.at || new Date().toISOString(),
      lastDropPoint: null,
    });
  },

  recordSessionCompleted(stats: BeginnerStats | null | undefined, input: SessionCompletedInput): BeginnerStats {
    const base = stats || this.createInitialStats();
    const at = input.at || new Date().toISOString();
    const dateKey = toDateKey(at);
    const activeDates = Array.from(new Set([...base.activeDates, dateKey]));

    return withStage({
      ...base,
      sessionsCompleted: base.sessionsCompleted + (input.completed ? 1 : 0),
      activeDates,
      streak: getCurrentStreak(activeDates),
      lastActiveAt: at,
      lastDropPoint: null,
    });
  },

  recordAssessmentCompleted(stats: BeginnerStats | null | undefined, input: AssessmentCompletedInput): BeginnerStats {
    const base = stats || this.createInitialStats();
    const at = input.at || new Date().toISOString();
    const entry: BeginnerAssessmentEntry = {
      at,
      day: input.day,
      missionId: input.missionId,
      subject: input.subject,
      correct: input.correct,
      total: input.total,
      accuracy: input.total > 0 ? input.correct / input.total : 0,
      xpGained: input.xpGained,
    };

    const totalQuestions = base.totalQuestions + input.total;
    const totalCorrect = base.totalCorrect + input.correct;

    return withStage({
      ...base,
      totalQuestions,
      totalCorrect,
      accuracyAvg: getAccuracyAvg(totalCorrect, totalQuestions),
      assessments: [...base.assessments, entry].slice(-30),
      lastActiveAt: at,
      lastDropPoint: null,
    });
  },

  recordReturnedNextDay(stats: BeginnerStats | null | undefined, at = new Date().toISOString()): BeginnerStats {
    const base = stats || this.createInitialStats();
    return withStage({
      ...base,
      returnedNextDayCount: base.returnedNextDayCount + 1,
      lastReturnTrackedDate: toDateKey(at),
      lastActiveAt: at,
      lastDropPoint: null,
    });
  },

  recordDropOff(stats: BeginnerStats | null | undefined, step: BeginnerDropStep, at = new Date().toISOString()): BeginnerStats {
    const base = stats || this.createInitialStats();
    return withStage({
      ...base,
      lastDropPoint: step,
      lastActiveAt: base.lastActiveAt || at,
    });
  },

  shouldTrackReturnNextDay(stats: BeginnerStats | null | undefined, at = new Date().toISOString()): boolean {
    if (!stats?.lastActiveAt) {
      return false;
    }

    const todayKey = toDateKey(at);
    if (stats.lastReturnTrackedDate === todayKey) {
      return false;
    }

    return diffDays(at, stats.lastActiveAt) === 1;
  },

  evaluateBeginnerState(stats: BeginnerStats | null | undefined): BeginnerProgressStage {
    return evaluateStage(stats || this.createInitialStats());
  },

  shouldShowWeekSummary(stats: BeginnerStats | null | undefined): boolean {
    if (!stats || stats.weekSummarySeenAt) {
      return false;
    }

    return stats.progressStage === 'ready_for_intermediate';
  },

  markWeekSummarySeen(stats: BeginnerStats | null | undefined, at = new Date().toISOString()): BeginnerStats {
    const base = stats || this.createInitialStats();
    return {
      ...base,
      weekSummarySeenAt: at,
    };
  },

  generateWeekSummary(stats: BeginnerStats | null | undefined, userSessions: Array<{ duration?: number; minutes?: number }> = []): BeginnerWeekSummary {
    const base = stats || this.createInitialStats();
    const totalTimeMinutes = userSessions.reduce((sum, session) => sum + (session.duration || session.minutes || 0), 0);
    const { strongest, weakest } = getStrongestWeakest(base.assessments);

    return {
      totalTimeMinutes,
      totalQuestions: base.totalQuestions,
      accuracy: Math.round(base.accuracyAvg * 100),
      strongest,
      weakest,
      consistencyLabel: getConsistencyLabel(base.streak, base.sessionsCompleted),
      readyForIntermediate: base.progressStage === 'ready_for_intermediate',
    };
  },
};
