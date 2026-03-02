import type { StudySession, UserData } from '../types';
import { calculateLevel } from '../utils/helpers';

const WEEK_DAYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;

const toDayKey = (isoDate: string) => isoDate.slice(0, 10);

const buildDayKeys = (sessions: StudySession[]) =>
  new Set<string>(sessions.map((session) => toDayKey(session.date)));

const calculateCurrentStreak = (dayKeys: Set<string>): number => {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < 3650; offset += 1) {
    const target = new Date(today);
    target.setDate(today.getDate() - offset);
    const key = target.toISOString().slice(0, 10);

    if (!dayKeys.has(key)) {
      break;
    }

    streak += 1;
  }

  return streak;
};

const calculateBestStreak = (dayKeys: Set<string>, fallback = 0): number => {
  const sorted = [...dayKeys].sort();
  if (sorted.length === 0) {
    return fallback;
  }

  let running = 1;
  let best = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(`${sorted[index - 1]}T00:00:00`);
    const current = new Date(`${sorted[index]}T00:00:00`);
    const diffDays = Math.round((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 1;
    }
  }

  return Math.max(best, fallback);
};

const applyXpSnapshot = (userData: UserData, newTotalPoints: number): UserData => {
  const totalPoints = Math.max(0, Math.round(newTotalPoints));
  return {
    ...userData,
    totalPoints,
    level: calculateLevel(totalPoints),
  };
};

const applyStreakSnapshot = (userData: UserData, sessions: StudySession[]): UserData => {
  const dayKeys = buildDayKeys(sessions);
  const currentStreak = calculateCurrentStreak(dayKeys);
  const bestStreak = calculateBestStreak(dayKeys, userData.bestStreak || 0);

  return {
    ...userData,
    streak: currentStreak,
    currentStreak,
    bestStreak,
  };
};

const applyWeekProgressDelta = (weekProgress: UserData['weekProgress'], sessions: StudySession[]) => {
  const next = { ...weekProgress };

  sessions.forEach((session) => {
    const day = WEEK_DAYS[new Date(session.date).getDay()];
    const current = next[day] || { studied: false, minutes: 0 };
    next[day] = {
      studied: true,
      minutes: current.minutes + session.minutes,
    };
  });

  return next;
};

export const xpEngineService = {
  applyXpDelta(userData: UserData, delta: number): UserData {
    return applyXpSnapshot(userData, userData.totalPoints + delta);
  },

  applyXpAbsolute(userData: UserData, absoluteXp: number): UserData {
    return applyXpSnapshot(userData, absoluteXp);
  },

  applyAchievementReward(userData: UserData, achievementId: string, points: number): UserData {
    if (userData.achievements.includes(achievementId)) {
      return userData;
    }

    const withAchievement = {
      ...userData,
      achievements: [...userData.achievements, achievementId],
    };

    return applyXpSnapshot(withAchievement, withAchievement.totalPoints + points);
  },

  applyStudySessions(userData: UserData, sessionsToAdd: StudySession[]): UserData {
    if (sessionsToAdd.length === 0) {
      return userData;
    }

    const existingSessions = userData.sessions || userData.studyHistory || [];
    const mergedSessions = [...existingSessions, ...sessionsToAdd];
    const pointsToAdd = sessionsToAdd.reduce((sum, session) => sum + session.points, 0);

    const withSessions: UserData = {
      ...userData,
      sessions: mergedSessions,
      studyHistory: mergedSessions,
      weekProgress: applyWeekProgressDelta(userData.weekProgress, sessionsToAdd),
    };

    const withXp = applyXpSnapshot(withSessions, withSessions.totalPoints + pointsToAdd);
    return applyStreakSnapshot(withXp, mergedSessions);
  },
};
