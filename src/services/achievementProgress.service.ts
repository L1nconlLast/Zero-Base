import type {
  AchievementContext,
  AchievementProgressSnapshot,
  AchievementUnlockMetaEntry,
  MockExamHistoryEntry,
  StudySession,
  UserData,
} from '../types';

interface BuildAchievementContextOptions {
  weeklyGoalMinutes?: number;
  mockExamHistory?: MockExamHistoryEntry[];
  now?: Date;
}

export type AchievementUnlockMeta = Record<string, AchievementUnlockMetaEntry>;

const DEFAULT_WEEKLY_GOAL_MINUTES = 900;
const MOCK_EXAM_HISTORY_KEY = 'mock_exam_history';
const RECENT_UNLOCK_WINDOW_MS = 72 * 60 * 60 * 1000;

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const toDayKey = (value: string) => value.slice(0, 10);

const getSessions = (userData: UserData): StudySession[] => {
  if (Array.isArray(userData.sessions) && userData.sessions.length > 0) {
    return userData.sessions;
  }

  return userData.studyHistory || [];
};

const getSessionMinutes = (session: StudySession) => Math.max(0, session.minutes || session.duration || 0);

const getMockExamAccuracy = (entry: MockExamHistoryEntry) => {
  if (!entry.totalQuestions) return 0;
  return (entry.correctCount / entry.totalQuestions) * 100;
};

export const getAchievementUnlockMetaStorageKey = (storageScope: string) =>
  `achievement_unlock_meta_${(storageScope || 'default').toLowerCase()}`;

export const readMockExamHistory = (): MockExamHistoryEntry[] => {
  if (typeof window === 'undefined') return [];
  return safeParse<MockExamHistoryEntry[]>(window.localStorage.getItem(MOCK_EXAM_HISTORY_KEY), []);
};

export const readAchievementUnlockMeta = (storageScope: string): AchievementUnlockMeta => {
  if (typeof window === 'undefined') return {};
  return safeParse<AchievementUnlockMeta>(
    window.localStorage.getItem(getAchievementUnlockMetaStorageKey(storageScope)),
    {},
  );
};

export const writeAchievementUnlockMeta = (
  storageScope: string,
  achievementId: string,
  unlockedAt = new Date().toISOString(),
): AchievementUnlockMeta => {
  if (typeof window === 'undefined') return {};

  const key = getAchievementUnlockMetaStorageKey(storageScope);
  const current = readAchievementUnlockMeta(storageScope);
  const next = {
    ...current,
    [achievementId]: { unlockedAt },
  };

  window.localStorage.setItem(key, JSON.stringify(next));
  return next;
};

export const isAchievementRecentlyUnlocked = (
  meta: AchievementUnlockMetaEntry | null | undefined,
  now = Date.now(),
) => {
  if (!meta?.unlockedAt) return false;

  const unlockedAt = Date.parse(meta.unlockedAt);
  if (Number.isNaN(unlockedAt)) return false;
  return now - unlockedAt <= RECENT_UNLOCK_WINDOW_MS;
};

export const getAchievementProgressRatio = (
  progress: AchievementProgressSnapshot | null | undefined,
) => {
  if (!progress || progress.target <= 0) return 0;
  return Math.max(0, Math.min(progress.current / progress.target, 1));
};

export const buildAchievementContext = (
  userData: UserData,
  options: BuildAchievementContextOptions = {},
): AchievementContext => {
  const sessions = getSessions(userData);
  const now = options.now ?? new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const resolvedWeeklyGoalMinutes = options.weeklyGoalMinutes ?? userData.dailyGoal * 7;
  const weeklyGoalMinutes = Math.max(0, resolvedWeeklyGoalMinutes || DEFAULT_WEEKLY_GOAL_MINUTES);
  const mockExamHistory = options.mockExamHistory ?? [];

  const minutesByDay = new Map<string, number>();
  let totalMinutes = 0;
  let longestSessionMinutes = 0;
  let nightSessionCount = 0;
  let goalMetDaysLast30 = 0;
  const goalMetDaysSet = new Set<string>();

  sessions.forEach((session) => {
    const minutes = getSessionMinutes(session);
    const dayKey = toDayKey(session.date);
    const timestampValue = session.timestamp || session.date;
    const hour = new Date(timestampValue).getHours();
    const daysDiff = Math.floor((now.getTime() - new Date(session.date).getTime()) / (1000 * 60 * 60 * 24));

    totalMinutes += minutes;
    longestSessionMinutes = Math.max(longestSessionMinutes, minutes);
    minutesByDay.set(dayKey, (minutesByDay.get(dayKey) || 0) + minutes);

    if (hour >= 22 || hour < 6) {
      nightSessionCount += 1;
    }

    if (session.goalMet && daysDiff >= 0 && daysDiff < 30) {
      goalMetDaysSet.add(dayKey);
    }
  });

  goalMetDaysLast30 = goalMetDaysSet.size;

  let studyDaysLast7 = 0;
  let studyDaysLast30 = 0;
  let weeklyStudiedMinutes = 0;
  let bestSingleDayMinutes = 0;

  minutesByDay.forEach((minutes, dayKey) => {
    const daysDiff = Math.floor((now.getTime() - new Date(dayKey).getTime()) / (1000 * 60 * 60 * 24));

    bestSingleDayMinutes = Math.max(bestSingleDayMinutes, minutes);

    if (daysDiff >= 0 && daysDiff < 7) {
      studyDaysLast7 += 1;
      weeklyStudiedMinutes += minutes;
    }

    if (daysDiff >= 0 && daysDiff < 30) {
      studyDaysLast30 += 1;
    }
  });

  const completedMockExams = mockExamHistory.length;
  const highScoreMockExams = mockExamHistory.filter((entry) => getMockExamAccuracy(entry) >= 80).length;
  const bestMockExamAccuracy = mockExamHistory.reduce(
    (best, entry) => Math.max(best, getMockExamAccuracy(entry)),
    0,
  );

  return {
    userData,
    sessions,
    sessionCount: sessions.length,
    totalMinutes,
    totalHours: totalMinutes / 60,
    currentStreak: Math.max(userData.currentStreak || 0, userData.streak || 0),
    bestStreak: Math.max(userData.bestStreak || 0, userData.currentStreak || 0, userData.streak || 0),
    longestSessionMinutes,
    bestSingleDayMinutes,
    studyDaysLast7,
    studyDaysLast30,
    nightSessionCount,
    goalMetDaysLast30,
    todayMinutes: minutesByDay.get(todayKey) || 0,
    weeklyGoalMinutes,
    weeklyStudiedMinutes,
    weeklyGoalReached: weeklyStudiedMinutes >= weeklyGoalMinutes,
    mockExamHistory,
    completedMockExams,
    highScoreMockExams,
    bestMockExamAccuracy,
  };
};

export const buildAchievementContextFromStorage = (
  userData: UserData,
  options: Omit<BuildAchievementContextOptions, 'mockExamHistory'> = {},
) =>
  buildAchievementContext(userData, {
    ...options,
    mockExamHistory: readMockExamHistory(),
  });
