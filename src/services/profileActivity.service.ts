import type { StudySession } from '../types';

export type ProfileActivityHeatLevel = 0 | 1 | 2 | 3 | 4;

export interface ProfileActivityHeatmapDay {
  date: string;
  minutes: number;
  sessions: number;
  logins: number;
  level: ProfileActivityHeatLevel;
}

export interface ProfileActivitySnapshot {
  totalMinutes: number;
  totalHours: number;
  totalSessions: number;
  daysWithActivity: number;
  currentStreak: number;
  heatmap: ProfileActivityHeatmapDay[];
}

type DailyAggregate = {
  minutes: number;
  sessions: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const clampHeatLevel = (minutes: number): ProfileActivityHeatLevel => {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
};

const toDateKey = (rawDate: string): string | null => {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
};

const normalizeMinutes = (session: StudySession): number => {
  return Math.max(0, Number(session.minutes || session.duration || 0));
};

const buildCurrentStreak = (activeDates: string[], now: Date): number => {
  if (activeDates.length === 0) {
    return 0;
  }

  const activeSet = new Set(activeDates);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let cursor = new Date(today);

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (activeSet.has(key)) {
      streak += 1;
      cursor = new Date(cursor.getTime() - DAY_MS);
      continue;
    }

    if (streak === 0) {
      cursor = new Date(cursor.getTime() - DAY_MS);
      const yesterdayKey = cursor.toISOString().slice(0, 10);
      if (activeSet.has(yesterdayKey)) {
        streak += 1;
        cursor = new Date(cursor.getTime() - DAY_MS);
        continue;
      }
    }

    break;
  }

  return streak;
};

export const buildProfileActivitySnapshot = (
  sessions: StudySession[],
  now: Date = new Date(),
): ProfileActivitySnapshot => {
  const grouped = new Map<string, DailyAggregate>();
  let totalMinutes = 0;
  let totalSessions = 0;

  sessions.forEach((session) => {
    const dateKey = toDateKey(session.date);
    if (!dateKey) {
      return;
    }

    const minutes = normalizeMinutes(session);
    const current = grouped.get(dateKey) || { minutes: 0, sessions: 0 };
    grouped.set(dateKey, {
      minutes: current.minutes + minutes,
      sessions: current.sessions + 1,
    });

    totalMinutes += minutes;
    totalSessions += 1;
  });

  const activeDates = [...grouped.keys()].sort((left, right) => left.localeCompare(right));
  const currentStreak = buildCurrentStreak(activeDates, now);

  const heatmap: ProfileActivityHeatmapDay[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (let offset = 364; offset >= 0; offset -= 1) {
    const target = new Date(today);
    target.setDate(today.getDate() - offset);
    const dateKey = target.toISOString().slice(0, 10);
    const aggregate = grouped.get(dateKey);
    const minutes = aggregate?.minutes || 0;
    const sessionsCount = aggregate?.sessions || 0;

    heatmap.push({
      date: dateKey,
      minutes,
      sessions: sessionsCount,
      logins: sessionsCount > 0 ? 1 : 0,
      level: clampHeatLevel(minutes),
    });
  }

  return {
    totalMinutes,
    totalHours: Math.floor(totalMinutes / 60),
    totalSessions,
    daysWithActivity: activeDates.length,
    currentStreak,
    heatmap,
  };
};
