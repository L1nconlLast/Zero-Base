import type { OperationalScheduleWindowDay, OperationalScheduleWindowItem } from './studySchedule.service';

export type WeeklyLoadLevel = 'low' | 'ok' | 'high';

export interface DailyLoadMetrics {
  date: string;
  totalMinutes: number;
  plannedMinutes: number;
  completedMinutes: number;
  sessions: number;
  plannedSessions: number;
  completedSessions: number;
  level: WeeklyLoadLevel;
  ratio: number;
  message: string;
}

export interface WeeklyLoadSummary {
  averageMinutes: number;
  summaryCopy: string;
  highDaysCount: number;
  lowDaysCount: number;
  days: DailyLoadMetrics[];
}

export interface WeeklyLoadMoveSuggestion {
  item: OperationalScheduleWindowItem;
  fromDate: string;
  toDate: string;
}

const DEFAULT_SESSION_DURATION_MINUTES = 25;

const LOW_LOAD_MESSAGE = 'Dia com pouca carga';
const OK_LOAD_MESSAGE = 'Dia equilibrado';
const HIGH_LOAD_MESSAGE = 'Dia com carga alta';

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const parseClockToMinutes = (value?: string): number | null => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
};

const getItemDurationMinutes = (
  item: OperationalScheduleWindowItem,
  defaultSessionDurationMinutes: number,
): number => {
  if (typeof item.durationMinutes === 'number' && Number.isFinite(item.durationMinutes)) {
    return clamp(Math.round(item.durationMinutes), 5, 180);
  }

  const startMinutes = parseClockToMinutes(item.startTime);
  const endMinutes = parseClockToMinutes(item.endTime);

  if (typeof startMinutes === 'number' && typeof endMinutes === 'number' && endMinutes > startMinutes) {
    return clamp(endMinutes - startMinutes, 5, 180);
  }

  return clamp(defaultSessionDurationMinutes, 5, 180);
};

const buildLoadMessage = (level: WeeklyLoadLevel): string => {
  if (level === 'high') return HIGH_LOAD_MESSAGE;
  if (level === 'low') return LOW_LOAD_MESSAGE;
  return OK_LOAD_MESSAGE;
};

const classifyDailyLoad = (totalMinutes: number, averageMinutes: number): WeeklyLoadLevel => {
  if (averageMinutes <= 0) {
    return totalMinutes > 0 ? 'ok' : 'low';
  }

  if (totalMinutes < averageMinutes * 0.7) {
    return 'low';
  }

  if (totalMinutes > averageMinutes * 1.3) {
    return 'high';
  }

  return 'ok';
};

const isMovableItem = (item: OperationalScheduleWindowItem): boolean =>
  item.status !== 'completed' && item.priority !== 'alta';

export const getDailyLoad = (
  day: OperationalScheduleWindowDay,
  defaultSessionDurationMinutes = DEFAULT_SESSION_DURATION_MINUTES,
): Omit<DailyLoadMetrics, 'level' | 'ratio' | 'message'> => {
  const plannedItems = day.items.filter((item) => item.status !== 'completed');
  const completedItems = day.items.filter((item) => item.status === 'completed');
  const plannedMinutes = plannedItems.reduce(
    (sum, item) => sum + getItemDurationMinutes(item, defaultSessionDurationMinutes),
    0,
  );
  const completedMinutes = completedItems.reduce(
    (sum, item) => sum + getItemDurationMinutes(item, defaultSessionDurationMinutes),
    0,
  );

  return {
    date: day.date,
    totalMinutes: plannedMinutes + completedMinutes,
    plannedMinutes,
    completedMinutes,
    sessions: day.items.length,
    plannedSessions: plannedItems.length,
    completedSessions: completedItems.length,
  };
};

export const getWeeklyLoadSummary = (
  days: OperationalScheduleWindowDay[],
  defaultSessionDurationMinutes = DEFAULT_SESSION_DURATION_MINUTES,
): WeeklyLoadSummary => {
  const relevantDays = days.filter((day) => day.isActive);
  const averageSourceDays = relevantDays.length > 0 ? relevantDays : days;
  const rawDays = days.map((day) =>
    getDailyLoad(day, defaultSessionDurationMinutes),
  );
  const averageMinutes = averageSourceDays.length > 0
    ? averageSourceDays
      .map((day) => getDailyLoad(day, defaultSessionDurationMinutes).totalMinutes)
      .reduce((sum, totalMinutes) => sum + totalMinutes, 0) / averageSourceDays.length
    : 0;
  const maxMinutes = rawDays.reduce((max, day) => Math.max(max, day.totalMinutes), 0);
  const daysWithLevels: DailyLoadMetrics[] = rawDays.map((day) => {
    const level = classifyDailyLoad(day.totalMinutes, averageMinutes);
    return {
      ...day,
      level,
      ratio: maxMinutes > 0 ? Math.min(1, day.totalMinutes / maxMinutes) : 0,
      message: buildLoadMessage(level),
    };
  });

  const highDaysCount = daysWithLevels.filter((day) => day.level === 'high').length;
  const lowDaysCount = daysWithLevels.filter((day) => day.level === 'low').length;
  const summaryCopy = highDaysCount > 0
    ? `Carga concentrada em ${highDaysCount} ${highDaysCount === 1 ? 'dia' : 'dias'}`
    : 'Semana equilibrada';

  return {
    averageMinutes,
    summaryCopy,
    highDaysCount,
    lowDaysCount,
    days: daysWithLevels,
  };
};

export const suggestRebalanceDay = (
  days: OperationalScheduleWindowDay[],
  date: string,
  defaultSessionDurationMinutes = DEFAULT_SESSION_DURATION_MINUTES,
): WeeklyLoadMoveSuggestion | null => {
  const loadSummary = getWeeklyLoadSummary(days, defaultSessionDurationMinutes);
  const loadByDate = new Map(loadSummary.days.map((day) => [day.date, day]));
  const targetDay = days.find((day) => day.date === date);
  const targetLoad = loadByDate.get(date);

  if (!targetDay || !targetLoad || targetDay.items.length === 0) {
    return null;
  }

  const movableItem = [...targetDay.items].reverse().find(isMovableItem) ?? null;
  if (!movableItem) {
    return null;
  }

  const futureDays = days
    .filter((day) => day.date > date && day.isActive)
    .map((day) => ({
      day,
      load: loadByDate.get(day.date)?.totalMinutes ?? 0,
    }))
    .sort((left, right) => {
      if (left.load !== right.load) {
        return left.load - right.load;
      }

      return left.day.date.localeCompare(right.day.date);
    });

  const destination = futureDays.find(({ day }) => day.date !== date) ?? null;
  if (!destination) {
    return null;
  }

  if (destination.load >= targetLoad.totalMinutes) {
    return null;
  }

  return {
    item: movableItem,
    fromDate: date,
    toDate: destination.day.date,
  };
};

export const suggestReinforceDay = (
  days: OperationalScheduleWindowDay[],
  date: string,
  defaultSessionDurationMinutes = DEFAULT_SESSION_DURATION_MINUTES,
): WeeklyLoadMoveSuggestion | null => {
  const loadSummary = getWeeklyLoadSummary(days, defaultSessionDurationMinutes);
  const loadByDate = new Map(loadSummary.days.map((day) => [day.date, day]));
  const targetLoad = loadByDate.get(date);
  if (!targetLoad) {
    return null;
  }

  const sourceDay = days.find((day) =>
    day.date > date
    && day.isActive
    && day.items.some(isMovableItem),
  );

  if (!sourceDay) {
    return null;
  }

  const sourceLoad = loadByDate.get(sourceDay.date);
  if (!sourceLoad) {
    return null;
  }

  if (sourceLoad.totalMinutes <= targetLoad.totalMinutes) {
    return null;
  }

  const movableItem = [...sourceDay.items].reverse().find(isMovableItem) ?? null;
  if (!movableItem) {
    return null;
  }

  return {
    item: movableItem,
    fromDate: sourceDay.date,
    toDate: date,
  };
};
