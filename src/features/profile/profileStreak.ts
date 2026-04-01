import type { ScheduleEntry, StudySession } from '../../types';
import type { ProfileStreakData, ProfileStreakDayData } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 7;

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const resolveDateKey = (rawValue?: string | null): string | null => {
  if (!rawValue) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toDateKey(parsed);
};

const getSessionDateKey = (session: StudySession): string | null =>
  resolveDateKey(session.timestamp || session.date);

const getReviewDateKey = (entry: ScheduleEntry): string | null => {
  if (entry.studyType !== 'revisao') {
    return null;
  }

  if (entry.lastReviewedAt) {
    return resolveDateKey(entry.lastReviewedAt);
  }

  if (entry.done || entry.status === 'concluido') {
    return resolveDateKey(entry.updatedAt || entry.date);
  }

  return null;
};

const buildCurrentStreak = (activeDateKeys: string[]): number => {
  if (activeDateKeys.length === 0) {
    return 0;
  }

  const activeDates = new Set(activeDateKeys);
  const lastActiveDateKey = activeDateKeys[activeDateKeys.length - 1];
  let cursor = new Date(`${lastActiveDateKey}T12:00:00`);
  cursor.setHours(12, 0, 0, 0);

  let streak = 0;
  while (true) {
    const key = toDateKey(cursor);
    if (!activeDates.has(key)) {
      break;
    }

    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  return streak;
};

const buildBestStreak = (activeDateKeys: string[]): number => {
  if (activeDateKeys.length === 0) {
    return 0;
  }

  const sorted = [...new Set(activeDateKeys)].sort((left, right) => left.localeCompare(right));
  let best = 0;
  let current = 0;
  let previousTime = 0;

  sorted.forEach((dateKey, index) => {
    const currentTime = new Date(`${dateKey}T12:00:00`).getTime();
    if (index === 0) {
      current = 1;
      previousTime = currentTime;
      best = 1;
      return;
    }

    const diffDays = Math.round((currentTime - previousTime) / DAY_MS);
    current = diffDays === 1 ? current + 1 : 1;
    previousTime = currentTime;
    best = Math.max(best, current);
  });

  return best;
};

const buildRecentDays = (activeDateKeys: Set<string>, now: Date): ProfileStreakDayData[] => {
  const recentDays: ProfileStreakDayData[] = [];
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);

  for (let offset = RECENT_WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() - offset);
    const dateKey = toDateKey(currentDate);

    recentDays.push({
      date: dateKey,
      label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(currentDate).replace('.', ''),
      active: activeDateKeys.has(dateKey),
      isToday: offset === 0,
    });
  }

  return recentDays;
};

const buildConsistencyLabel = (
  currentStreak: number,
  activeToday: boolean,
  recentActiveCount: number,
): string => {
  if (recentActiveCount === 0) {
    return 'Sua consistencia comeca na primeira sessao ou revisao concluida.';
  }

  if (activeToday) {
    return `Hoje ja entrou na sequencia. Voce manteve atividade em ${recentActiveCount} dos ultimos 7 dias.`;
  }

  if (currentStreak > 0) {
    return `Hoje ainda nao entrou na sequencia. Voce manteve atividade em ${recentActiveCount} dos ultimos 7 dias.`;
  }

  return `A sequencia esta pausada. Voce ativou ${recentActiveCount} dos ultimos 7 dias.`;
};

export const buildProfileStreakData = (
  sessions: StudySession[],
  scheduleEntries: ScheduleEntry[] = [],
  now: Date = new Date(),
): ProfileStreakData => {
  const activeDateSet = new Set<string>();

  sessions.forEach((session) => {
    const dateKey = getSessionDateKey(session);
    if (dateKey) {
      activeDateSet.add(dateKey);
    }
  });

  scheduleEntries.forEach((entry) => {
    const dateKey = getReviewDateKey(entry);
    if (dateKey) {
      activeDateSet.add(dateKey);
    }
  });

  const activeDateKeys = [...activeDateSet].sort((left, right) => left.localeCompare(right));
  const recentDays = buildRecentDays(activeDateSet, now);
  const activeToday = recentDays.some((day) => day.isToday && day.active);
  const recentActiveCount = recentDays.filter((day) => day.active).length;
  const currentStreak = buildCurrentStreak(activeDateKeys);
  const bestStreak = buildBestStreak(activeDateKeys);

  return {
    currentStreak,
    bestStreak,
    activeToday,
    recentActiveCount,
    consistencyLabel: buildConsistencyLabel(currentStreak, activeToday, recentActiveCount),
    recentDays,
  };
};
