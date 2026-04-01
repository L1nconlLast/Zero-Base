import type { StudySession } from '../types';
import { sanitizeSubjectLabel } from './sanitizeSubject';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export interface WeeklyStudyDaySubject {
  subject: string;
  minutes: number;
}

export interface WeeklyStudyDaySnapshot {
  date: Date;
  dateKey: string;
  shortLabel: string;
  minutes: number;
  sessions: number;
  subjects: WeeklyStudyDaySubject[];
  isToday: boolean;
}

export interface WeeklyStudySubjectSnapshot {
  subject: string;
  minutes: number;
  sessions: number;
  share: number;
}

export interface WeeklyStudySnapshot {
  weekStart: Date;
  weekEnd: Date;
  previousWeekStart: Date;
  previousWeekEnd: Date;
  currentWeekSessions: StudySession[];
  previousWeekSessions: StudySession[];
  daily: WeeklyStudyDaySnapshot[];
  totalMinutes: number;
  previousTotalMinutes: number;
  activeDays: number;
  longestSession: number;
  subjectBreakdown: WeeklyStudySubjectSnapshot[];
  bestDay: {
    key: string;
    minutes: number;
    label: string;
  } | null;
}

const startOfLocalDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfLocalDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getSessionMinutes = (
  session: Pick<StudySession, 'minutes' | 'duration'>,
): number => {
  const minutes = Number(session.minutes || session.duration || 0);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
};

export const parseStudySessionDate = (
  session: Pick<StudySession, 'date' | 'timestamp'>,
): Date | null => {
  if (session.timestamp) {
    const parsedTimestamp = new Date(session.timestamp);
    if (!Number.isNaN(parsedTimestamp.getTime())) {
      return parsedTimestamp;
    }
  }

  const rawDate = String(session.date || '').trim();
  if (!rawDate) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return new Date(`${rawDate}T12:00:00`);
  }

  const parsedDate = new Date(rawDate);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  return null;
};

export const getWeekRange = (referenceDate: Date = new Date()) => {
  const today = startOfLocalDay(referenceDate);
  const weekStart = startOfLocalDay(referenceDate);
  const currentDay = weekStart.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  weekStart.setDate(weekStart.getDate() + diffToMonday);

  const weekEnd = endOfLocalDay(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const previousWeekStart = startOfLocalDay(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const previousWeekEnd = endOfLocalDay(previousWeekStart);
  previousWeekEnd.setDate(previousWeekStart.getDate() + 6);

  return {
    today,
    weekStart,
    weekEnd,
    previousWeekStart,
    previousWeekEnd,
  };
};

export const buildWeeklyStudySnapshot = (
  sessions: StudySession[],
  referenceDate: Date = new Date(),
): WeeklyStudySnapshot => {
  const { today, weekStart, weekEnd, previousWeekStart, previousWeekEnd } = getWeekRange(referenceDate);
  const todayKey = toLocalDateKey(today);

  const dailySeed = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dateKey = toLocalDateKey(date);
    return {
      date,
      dateKey,
      shortLabel: DAY_LABELS[date.getDay()],
      minutes: 0,
      sessions: 0,
      subjectMap: new Map<string, number>(),
    };
  });

  const dailyMap = new Map(dailySeed.map((day) => [day.dateKey, day]));
  const currentWeekSessions: StudySession[] = [];
  const previousWeekSessions: StudySession[] = [];
  const subjectMinutesMap = new Map<string, number>();
  const subjectSessionsMap = new Map<string, number>();

  let totalMinutes = 0;
  let previousTotalMinutes = 0;
  let longestSession = 0;

  sessions.forEach((session) => {
    const parsedDate = parseStudySessionDate(session);
    const minutes = getSessionMinutes(session);

    if (!parsedDate || minutes <= 0) {
      return;
    }

    const sessionDay = startOfLocalDay(parsedDate);
    const safeSubject = sanitizeSubjectLabel(session.subject, 'Outra');

    if (sessionDay >= weekStart && sessionDay <= weekEnd) {
      const dayKey = toLocalDateKey(sessionDay);
      const day = dailyMap.get(dayKey);
      if (!day) {
        return;
      }

      currentWeekSessions.push(session);
      totalMinutes += minutes;
      longestSession = Math.max(longestSession, minutes);
      day.minutes += minutes;
      day.sessions += 1;
      day.subjectMap.set(safeSubject, (day.subjectMap.get(safeSubject) || 0) + minutes);
      subjectMinutesMap.set(safeSubject, (subjectMinutesMap.get(safeSubject) || 0) + minutes);
      subjectSessionsMap.set(safeSubject, (subjectSessionsMap.get(safeSubject) || 0) + 1);
      return;
    }

    if (sessionDay >= previousWeekStart && sessionDay <= previousWeekEnd) {
      previousWeekSessions.push(session);
      previousTotalMinutes += minutes;
    }
  });

  const daily = dailySeed.map((day) => ({
    date: day.date,
    dateKey: day.dateKey,
    shortLabel: day.shortLabel,
    minutes: day.minutes,
    sessions: day.sessions,
    subjects: Array.from(day.subjectMap.entries())
      .map(([subject, minutes]) => ({ subject, minutes }))
      .sort((left, right) => right.minutes - left.minutes),
    isToday: day.dateKey === todayKey,
  }));

  const activeDays = daily.filter((day) => day.minutes > 0).length;
  const bestDay = daily
    .filter((day) => day.minutes > 0)
    .sort((left, right) => right.minutes - left.minutes)[0];

  const subjectBreakdown = Array.from(subjectMinutesMap.entries())
    .map(([subject, minutes]) => ({
      subject,
      minutes,
      sessions: subjectSessionsMap.get(subject) || 0,
      share: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
    }))
    .sort((left, right) => right.minutes - left.minutes);

  return {
    weekStart,
    weekEnd,
    previousWeekStart,
    previousWeekEnd,
    currentWeekSessions,
    previousWeekSessions,
    daily,
    totalMinutes,
    previousTotalMinutes,
    activeDays,
    longestSession,
    subjectBreakdown,
    bestDay: bestDay
      ? {
          key: bestDay.dateKey,
          minutes: bestDay.minutes,
          label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
            .format(new Date(`${bestDay.dateKey}T12:00:00`))
            .replace('.', ''),
        }
      : null,
  };
};
