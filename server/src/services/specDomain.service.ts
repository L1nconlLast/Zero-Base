export interface SessionPointsInput {
  durationMinutes: number;
  correctAnswers: number;
}

export interface SessionAggregateRow {
  duration?: number | null;
  points?: number | null;
  date?: string | null;
}

export interface AccuracyAggregateRow {
  subject: string;
  isCorrect: boolean;
}

const startOfUtcDay = (date: Date): Date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

export const calculateXpGained = ({ durationMinutes, correctAnswers }: SessionPointsInput): number => {
  return Math.max(1, durationMinutes) + (Math.max(0, correctAnswers) * 5);
};

export const getLevelLabelFromXp = (xp: number): 'INICIANTE' | 'ESTUDANTE' | 'FOCADO' | 'MESTRE' => {
  if (xp <= 1000) return 'INICIANTE';
  if (xp <= 3000) return 'ESTUDANTE';
  if (xp <= 8000) return 'FOCADO';
  return 'MESTRE';
};

export const getLevelNumberFromXp = (xp: number): number => {
  if (xp <= 1000) return 1;
  if (xp <= 3000) return 2;
  if (xp <= 8000) return 3;
  return 4;
};

export const computeNextStreak = (params: { previousStreak: number; previousSessionDate?: string | Date | null; currentDate: string | Date }): number => {
  const currentDay = startOfUtcDay(new Date(params.currentDate));
  const previousStreak = Math.max(0, params.previousStreak || 0);

  if (!params.previousSessionDate) {
    return Math.max(1, previousStreak || 1);
  }

  const previousDay = startOfUtcDay(new Date(params.previousSessionDate));
  const diffDays = Math.round((currentDay.getTime() - previousDay.getTime()) / 86400000);

  if (diffDays <= 0) {
    return Math.max(1, previousStreak || 1);
  }

  if (diffDays === 1) {
    return Math.max(1, previousStreak + 1);
  }

  return 1;
};

export const summarizeTodayStats = (sessions: SessionAggregateRow[], dailyGoalMinutes: number, streak: number) => {
  const studiedMinutes = sessions.reduce((sum, row) => sum + Number(row.duration || 0), 0);
  const xp = sessions.reduce((sum, row) => sum + Number(row.points || 0), 0);
  const safeGoal = Math.max(1, dailyGoalMinutes || 90);

  return {
    studiedMinutes,
    dailyGoalMinutes: safeGoal,
    goalProgressPct: Math.min(100, Math.round((studiedMinutes / safeGoal) * 100)),
    xp,
    streak,
  };
};

export const summarizeWeekStats = (sessions: SessionAggregateRow[], endDate: Date = new Date()) => {
  const endDay = startOfUtcDay(endDate);
  const startDay = new Date(endDay);
  startDay.setUTCDate(endDay.getUTCDate() - 6);

  const byDay = new Map<string, { minutes: number; xp: number }>();
  sessions.forEach((row) => {
    if (!row.date) return;
    const day = toIsoDate(new Date(row.date));
    const current = byDay.get(day) || { minutes: 0, xp: 0 };
    current.minutes += Number(row.duration || 0);
    current.xp += Number(row.points || 0);
    byDay.set(day, current);
  });

  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(startDay);
    date.setUTCDate(startDay.getUTCDate() + index);
    const key = toIsoDate(date);
    const values = byDay.get(key) || { minutes: 0, xp: 0 };
    return { day: key, minutes: values.minutes, xp: values.xp };
  });

  return {
    totalMinutes: days.reduce((sum, row) => sum + row.minutes, 0),
    totalXp: days.reduce((sum, row) => sum + row.xp, 0),
    days,
  };
};

export const summarizeAccuracyBySubject = (rows: AccuracyAggregateRow[]) => {
  const aggregate = new Map<string, { hits: number; total: number }>();

  rows.forEach((row) => {
    const current = aggregate.get(row.subject) || { hits: 0, total: 0 };
    current.total += 1;
    current.hits += row.isCorrect ? 1 : 0;
    aggregate.set(row.subject, current);
  });

  return Array.from(aggregate.entries()).map(([subject, metrics]) => ({
    subject,
    accuracy: metrics.total > 0 ? Math.round((metrics.hits / metrics.total) * 100) : 0,
    totalAnswers: metrics.total,
  }));
};