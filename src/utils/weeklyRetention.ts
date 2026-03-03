import type { StudySession } from '../types';

export interface WeeklyRetentionSnapshot {
  weekStart: string;
  studiedDays: number;
  targetDays: number;
  remainingDays: number;
  isMaintained: boolean;
  studiedDayIndexes: number[];
}

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getWeekStartDate = (referenceDate: Date = new Date()) => {
  const local = new Date(referenceDate);
  local.setHours(0, 0, 0, 0);
  const day = local.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  local.setDate(local.getDate() + diffToMonday);
  return local;
};

const getWeekStartKey = (referenceDate: Date = new Date()) => toIsoDate(getWeekStartDate(referenceDate));

const getDayIndexFromMonday = (date: Date) => {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
};

export const buildWeeklyRetentionSnapshot = (
  sessions: StudySession[],
  targetDays = 4,
  now: Date = new Date(),
): WeeklyRetentionSnapshot => {
  const safeTarget = Math.max(1, targetDays);
  const weekStart = getWeekStartDate(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const dayIndexes = new Set<number>();

  sessions.forEach((session) => {
    const sessionDate = new Date(session.date);
    if (Number.isNaN(sessionDate.getTime())) {
      return;
    }

    if (sessionDate >= weekStart && sessionDate < weekEnd) {
      dayIndexes.add(getDayIndexFromMonday(sessionDate));
    }
  });

  const studiedDays = dayIndexes.size;
  const isMaintained = studiedDays >= safeTarget;
  const remainingDays = Math.max(0, safeTarget - studiedDays);

  return {
    weekStart: getWeekStartKey(now),
    studiedDays,
    targetDays: safeTarget,
    remainingDays,
    isMaintained,
    studiedDayIndexes: [...dayIndexes].sort((a, b) => a - b),
  };
};
