import { isSupabaseConfigured, supabase } from './supabase.client';
import { offlineSyncService } from './offlineSync.service';
import type {
  ScheduleEntry,
  StudyContextForToday,
  TodayStudyState,
  Weekday,
  WeeklyAvailabilityMap,
  WeeklyDayPlan,
  WeeklyPlan,
  WeeklyStudyPreferences,
  WeeklyStudySchedule,
} from '../types';

interface StudyBlockRow {
  id: string;
  user_id: string;
  study_date: string;
  start_time: string;
  end_time: string;
  subject: string;
  topic: string | null;
  note: string | null;
  type: string | null;
  status: 'pendente' | 'concluido' | 'adiado';
  reason: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export type WeeklyConfidenceState =
  | 'on_track'
  | 'below_pace'
  | 'not_started';

export type RecentPaceState =
  | 'on_track'
  | 'falling_behind'
  | 'inactive_streak';

export interface PaceCopyVariant {
  today: string;
  postFocus: string;
}

export type SuggestedAdjustment =
  | {
      type: 'reduce_load';
      message: string;
      actionLabel: string;
    }
  | {
      type: 'redistribute';
      message: string;
      actionLabel: string;
    }
  | null;

export interface NextStudySuggestion {
  type: 'next_today' | 'next_day' | null;
  subjectLabel?: string;
  frontLabel?: string;
  topicLabel?: string;
}

export type ScheduledStudyFocusStatus = 'pending' | 'completed' | 'overdue';

export interface ScheduledStudyFocusResolution {
  status: ScheduledStudyFocusStatus;
  matchedEntry: ScheduleEntry | null;
  matchedEntrySource: 'today' | 'backlog' | 'none';
  overdueCount: number;
  todayPendingCount: number;
  todayCompletedCount: number;
}

export interface OperationalScheduleWindowItem {
  id: string;
  subject: string;
  topic?: string | null;
  note?: string;
  reason?: string;
  studyType?: ScheduleEntry['studyType'];
  priority?: ScheduleEntry['priority'];
  durationMinutes?: number;
  source: 'entry' | 'weekly_plan';
  status: ScheduledStudyFocusStatus;
  startTime?: string;
  endTime?: string;
}

export interface OperationalScheduleWindowDay {
  date: string;
  weekday: Weekday;
  offsetDays: number;
  isToday: boolean;
  isActive: boolean;
  items: OperationalScheduleWindowItem[];
}

export interface StudyPrioritizationRecentSession {
  subject: string;
  topic?: string | null;
  completedAt: string;
  accuracy?: number | null;
}

export interface StudyPrioritizationContext {
  today?: Date;
  schedule?: WeeklyStudySchedule;
  recentSessions?: StudyPrioritizationRecentSession[];
  currentWeakPoint?: string | null;
  weeklyCompletedSessions?: number;
  weeklyGoalSessions?: number;
}

export interface StudyPrioritizationBreakdown {
  overdueScore: number;
  manualPriorityScore: number;
  weaknessScore: number;
  weeklyLoadScore: number;
  recencyAdjustment: number;
  recentPerformanceAdjustment: number;
}

export interface PrioritizedScheduledStudyFocus {
  entry: ScheduleEntry;
  score: number;
  reasonSummary: string;
  breakdown: StudyPrioritizationBreakdown;
}

export type ScheduleEntryReorderDirection = 'up' | 'down';

export interface CreateManualScheduleEntryInput {
  id: string;
  date: string;
  subject: string;
  durationMinutes?: number;
  topic?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_OPERATIONAL_WINDOW_DAYS = 6;

const TABLE = 'study_blocks';
export const STUDY_SCHEDULE_STORAGE_KEY = 'mdz_study_schedule';
export const STUDY_SCHEDULE_UPDATED_EVENT = 'zb-study-schedule-updated';
const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DEFAULT_WEEKLY_PREFERENCES: WeeklyStudyPreferences = {
  defaultSessionDurationMinutes: 25,
  sessionsPerDay: 1,
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const createEmptyWeeklyDayPlan = (): WeeklyDayPlan => ({
  subjectLabels: [],
});

const sanitizeSubjectLabels = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return [...new Set(
    value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean),
  )];
};

const sanitizeWeeklyDayPlan = (value: unknown): WeeklyDayPlan => {
  const source = value && typeof value === 'object' ? value as Partial<WeeklyDayPlan> : {};

  return {
    subjectLabels: sanitizeSubjectLabels(source.subjectLabels),
  };
};

const sanitizeUpdatedAt = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return Number.isNaN(Date.parse(value)) ? fallback : value;
};

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const normalizeCompletedDateKey = (value: string): string | null => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toDateKey(parsed);
};

const normalizeScheduleMatcher = (value?: string | null): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

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

const toClockLabel = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getPriorityRank = (value?: ScheduleEntry['priority']): number =>
  value === 'alta' ? 0 : 1;

const getOrderRank = (value?: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : Number.MAX_SAFE_INTEGER;

const normalizeDateKeyInput = (value: string): string | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toDateKey(parsed);
};

const getOperationalWindowEndDateKey = (
  startDate: Date,
  dayCount = DEFAULT_OPERATIONAL_WINDOW_DAYS,
): string => {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + Math.max(1, dayCount));
  return toDateKey(endDate);
};

const removeFirstMatchingSubject = (subjectLabels: string[], subject: string): string[] => {
  const subjectKey = normalizeScheduleMatcher(subject);
  let removed = false;

  return subjectLabels.filter((label) => {
    if (removed) {
      return true;
    }

    if (normalizeScheduleMatcher(label) === subjectKey) {
      removed = true;
      return false;
    }

    return true;
  });
};

const insertSubjectAtTop = (subjectLabels: string[], subject: string): string[] => {
  const withoutTarget = removeFirstMatchingSubject(subjectLabels, subject);
  return sanitizeSubjectLabels([subject, ...withoutTarget]);
};

const appendSubjectToDay = (subjectLabels: string[], subject: string): string[] => {
  const next = [...subjectLabels];
  if (!next.some((label) => normalizeScheduleMatcher(label) === normalizeScheduleMatcher(subject))) {
    next.push(subject);
  }
  return sanitizeSubjectLabels(next);
};

const loadLocalScheduleEntries = (): ScheduleEntry[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STUDY_SCHEDULE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as ScheduleEntry[] : [];
  } catch {
    return [];
  }
};

const persistLocalScheduleEntries = (entries: ScheduleEntry[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STUDY_SCHEDULE_STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(
      new CustomEvent(STUDY_SCHEDULE_UPDATED_EVENT, {
        detail: {
          entries,
        },
      }),
    );
  } catch {
    // ignore local persistence failures
  }
};

export const readPersistedScheduleEntries = (): ScheduleEntry[] => loadLocalScheduleEntries();

export const persistScheduleEntriesSnapshot = (entries: ScheduleEntry[]): void => {
  persistLocalScheduleEntries(entries);
};

const sanitizeWeeklyPreferences = (value: unknown): WeeklyStudyPreferences => {
  const source = value && typeof value === 'object' ? value as Partial<WeeklyStudyPreferences> : {};

  const defaultSessionDurationMinutes =
    typeof source.defaultSessionDurationMinutes === 'number'
    && Number.isFinite(source.defaultSessionDurationMinutes)
    && source.defaultSessionDurationMinutes > 0
      ? clamp(Math.round(source.defaultSessionDurationMinutes), 1, 300)
      : DEFAULT_WEEKLY_PREFERENCES.defaultSessionDurationMinutes;

  const sessionsPerDay =
    typeof source.sessionsPerDay === 'number' && Number.isFinite(source.sessionsPerDay)
      ? clamp(Math.round(source.sessionsPerDay), 1, 10)
      : DEFAULT_WEEKLY_PREFERENCES.sessionsPerDay;

  const weeklyGoalSessions =
    typeof source.weeklyGoalSessions === 'number' && Number.isFinite(source.weeklyGoalSessions) && source.weeklyGoalSessions > 0
      ? clamp(Math.round(source.weeklyGoalSessions), 1, 70)
      : undefined;

  return {
    defaultSessionDurationMinutes,
    sessionsPerDay,
    weeklyGoalSessions,
  };
};

export const createEmptyWeeklyPlan = (): WeeklyPlan =>
  WEEKDAYS.reduce((acc, day) => {
    acc[day] = createEmptyWeeklyDayPlan();
    return acc;
  }, {} as WeeklyPlan);

export const createDefaultWeeklyAvailability = (): WeeklyAvailabilityMap =>
  WEEKDAYS.reduce((acc, day) => {
    acc[day] = day !== 'saturday' && day !== 'sunday';
    return acc;
  }, {} as WeeklyAvailabilityMap);

export const createDefaultWeeklyStudySchedule = (): WeeklyStudySchedule => ({
  weekPlan: createEmptyWeeklyPlan(),
  availability: createDefaultWeeklyAvailability(),
  preferences: { ...DEFAULT_WEEKLY_PREFERENCES },
  updatedAt: new Date().toISOString(),
});

export const sanitizeWeeklyStudySchedule = (value: unknown): WeeklyStudySchedule => {
  const fallback = createDefaultWeeklyStudySchedule();
  const source = value && typeof value === 'object' ? value as Partial<WeeklyStudySchedule> : {};
  const rawWeekPlan = source.weekPlan && typeof source.weekPlan === 'object' ? source.weekPlan : {};
  const rawAvailability = source.availability && typeof source.availability === 'object' ? source.availability : {};

  const weekPlan = WEEKDAYS.reduce((acc, day) => {
    acc[day] = sanitizeWeeklyDayPlan((rawWeekPlan as Partial<Record<Weekday, unknown>>)[day]);
    return acc;
  }, createEmptyWeeklyPlan());

  const availability = WEEKDAYS.reduce((acc, day) => {
    const rawValue = (rawAvailability as Partial<Record<Weekday, unknown>>)[day];
    acc[day] = typeof rawValue === 'boolean' ? rawValue : fallback.availability[day];
    return acc;
  }, createDefaultWeeklyAvailability());

  return {
    weekPlan,
    availability,
    preferences: sanitizeWeeklyPreferences(source.preferences),
    updatedAt: sanitizeUpdatedAt(source.updatedAt, fallback.updatedAt),
  };
};

export const getWeekdayFromDate = (date = new Date()): Weekday => {
  const day = date.getDay();

  if (day === 0) return 'sunday';
  if (day === 1) return 'monday';
  if (day === 2) return 'tuesday';
  if (day === 3) return 'wednesday';
  if (day === 4) return 'thursday';
  if (day === 5) return 'friday';
  return 'saturday';
};

export const getActiveDaysCount = (availability: WeeklyAvailabilityMap): number =>
  WEEKDAYS.filter((day) => availability[day]).length;

export const getPlannedSubjectsCount = (weekPlan: WeeklyPlan): number =>
  WEEKDAYS.reduce((total, day) => total + weekPlan[day].subjectLabels.length, 0);

const isCompletedEntry = (entry: ScheduleEntry): boolean =>
  entry.done || entry.status === 'concluido';

export const compareScheduleEntries = (left: ScheduleEntry, right: ScheduleEntry): number => {
  if (left.date !== right.date) {
    return left.date.localeCompare(right.date);
  }

  const orderDiff = getOrderRank(left.orderIndex) - getOrderRank(right.orderIndex);
  if (orderDiff !== 0) {
    return orderDiff;
  }

  const priorityDiff = getPriorityRank(left.priority) - getPriorityRank(right.priority);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const leftTime = left.startTime || '99:99';
  const rightTime = right.startTime || '99:99';
  if (leftTime !== rightTime) {
    return leftTime.localeCompare(rightTime);
  }

  const subjectDiff = left.subject.localeCompare(right.subject);
  if (subjectDiff !== 0) {
    return subjectDiff;
  }

  return left.id.localeCompare(right.id);
};

export const sortScheduleEntries = (entries: ScheduleEntry[]): ScheduleEntry[] =>
  [...entries].sort(compareScheduleEntries);

const getEntryDurationMinutes = (
  entry: Pick<ScheduleEntry, 'durationMinutes' | 'startTime' | 'endTime'>,
  fallbackDurationMinutes = DEFAULT_WEEKLY_PREFERENCES.defaultSessionDurationMinutes,
): number => {
  if (typeof entry.durationMinutes === 'number' && Number.isFinite(entry.durationMinutes)) {
    return clamp(Math.round(entry.durationMinutes), 5, 180);
  }

  const startMinutes = parseClockToMinutes(entry.startTime);
  const endMinutes = parseClockToMinutes(entry.endTime);
  if (typeof startMinutes === 'number' && typeof endMinutes === 'number' && endMinutes > startMinutes) {
    return clamp(endMinutes - startMinutes, 5, 180);
  }

  return clamp(fallbackDurationMinutes, 5, 180);
};

const buildEndTimeFromDuration = (startTime: string | undefined, durationMinutes: number): string | undefined => {
  const startMinutes = parseClockToMinutes(startTime);
  if (typeof startMinutes !== 'number') {
    return undefined;
  }

  return toClockLabel(startMinutes + clamp(durationMinutes, 5, 180));
};

const getEntriesForDateSorted = (entries: ScheduleEntry[], date: string): ScheduleEntry[] =>
  entries
    .filter((entry) => entry.date === date)
    .sort(compareScheduleEntries);

const getNextOrderIndexForDate = (entries: ScheduleEntry[], date: string): number => {
  const sameDayEntries = entries.filter((entry) => entry.date === date);
  if (sameDayEntries.length === 0) {
    return 0;
  }

  const highestOrderIndex = sameDayEntries.reduce((max, entry) =>
    Math.max(max, typeof entry.orderIndex === 'number' ? entry.orderIndex : -1), -1);

  if (highestOrderIndex >= 0) {
    return highestOrderIndex + 1;
  }

  return sameDayEntries.length;
};

const applyUpdatedDayEntries = (
  entries: ScheduleEntry[],
  date: string,
  orderedDayEntries: ScheduleEntry[],
): ScheduleEntry[] => {
  const dayEntryIds = new Set(orderedDayEntries.map((entry) => entry.id));
  const reorderedDayEntries = orderedDayEntries.map((entry, index) => ({
    ...entry,
    orderIndex: index,
  }));

  return entries.map((entry) => {
    if (entry.date !== date || !dayEntryIds.has(entry.id)) {
      return entry;
    }

    return reorderedDayEntries.find((candidate) => candidate.id === entry.id) || entry;
  });
};

const PRIORITIZATION_WEIGHT = {
  overdue: 100,
  overdueCritical: 130,
  manualPriority: 70,
  manualMovedToToday: 40,
  weaknessHigh: 50,
  weaknessMedium: 20,
  weeklyUnderloaded: 20,
  weeklyOverloaded: -10,
  recentTopicPenalty: -25,
  recentSubjectPenalty: -12,
  notSeenRecently: 10,
  weakRecentPerformance: 15,
  strongRecentPerformance: -10,
} as const;

const toDateAtNoon = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const differenceInCalendarDays = (left: Date, right: Date): number => {
  const leftCopy = new Date(left);
  leftCopy.setHours(12, 0, 0, 0);
  const rightCopy = new Date(right);
  rightCopy.setHours(12, 0, 0, 0);
  return Math.round((leftCopy.getTime() - rightCopy.getTime()) / (24 * 60 * 60 * 1000));
};

const isManualPriorityEntry = (entry: ScheduleEntry): boolean =>
  entry.manualPriority === true;

const wasManuallyMovedToToday = (entry: ScheduleEntry, todayDateKey: string): boolean =>
  entry.lastManualTargetDate === todayDateKey;

const getEntryUpdatedAt = (entry: ScheduleEntry): number =>
  Date.parse(entry.lastManualEditAt || entry.updatedAt || entry.createdAt || '') || 0;

const buildWeaknessScore = (entry: ScheduleEntry, currentWeakPoint?: string | null): number => {
  const normalizedWeakPoint = normalizeScheduleMatcher(currentWeakPoint);
  if (!normalizedWeakPoint) {
    return 0;
  }

  const entrySubject = normalizeScheduleMatcher(entry.subject);
  const entryTopic = normalizeScheduleMatcher(entry.topic);
  if (entrySubject === normalizedWeakPoint || entryTopic === normalizedWeakPoint) {
    return PRIORITIZATION_WEIGHT.weaknessHigh;
  }

  if (entrySubject.includes(normalizedWeakPoint) || normalizedWeakPoint.includes(entrySubject)) {
    return PRIORITIZATION_WEIGHT.weaknessMedium;
  }

  return 0;
};

const buildWeeklyLoadScore = (
  entry: ScheduleEntry,
  entries: ScheduleEntry[],
  today: Date,
  schedule?: WeeklyStudySchedule,
): number => {
  const windowEndDateKey = getOperationalWindowEndDateKey(today, DEFAULT_OPERATIONAL_WINDOW_DAYS);
  const subjectKey = normalizeScheduleMatcher(entry.subject);
  const sameSubjectEntries = entries.filter((candidate) => {
    if (isCompletedEntry(candidate)) {
      return false;
    }

    const candidateDate = candidate.date.slice(0, 10);
    return candidateDate >= toDateKey(today)
      && candidateDate <= windowEndDateKey
      && normalizeScheduleMatcher(candidate.subject) === subjectKey;
  }).length;

  const weeklyPlannedSessions = schedule
    ? Object.values(schedule.weekPlan).reduce((sum, day) => sum + day.subjectLabels.length, 0)
    : 0;
  const activeDays = schedule ? getActiveDaysCount(schedule.availability) : 0;
  const expectedSessionsPerSubject = weeklyPlannedSessions > 0
    ? Math.max(1, Math.round(weeklyPlannedSessions / Math.max(1, activeDays || 1)))
    : 1;

  if (sameSubjectEntries <= Math.max(1, expectedSessionsPerSubject - 1)) {
    return PRIORITIZATION_WEIGHT.weeklyUnderloaded;
  }

  if (sameSubjectEntries > expectedSessionsPerSubject + 1) {
    return PRIORITIZATION_WEIGHT.weeklyOverloaded;
  }

  return 0;
};

const buildRecencyAdjustment = (
  entry: ScheduleEntry,
  recentSessions: StudyPrioritizationRecentSession[],
): number => {
  const recentMatch = recentSessions.find((session) => {
    const sameSubject = normalizeScheduleMatcher(session.subject) === normalizeScheduleMatcher(entry.subject);
    if (!sameSubject) {
      return false;
    }

    if (entry.topic && session.topic) {
      return normalizeScheduleMatcher(session.topic) === normalizeScheduleMatcher(entry.topic);
    }

    return true;
  });

  if (!recentMatch) {
    return PRIORITIZATION_WEIGHT.notSeenRecently;
  }

  const completedAt = toDateAtNoon(recentMatch.completedAt);
  if (!completedAt) {
    return 0;
  }

  const daysSinceCompletion = Math.abs(differenceInCalendarDays(new Date(), completedAt));
  if (daysSinceCompletion <= 1) {
    return entry.topic && recentMatch.topic
      ? PRIORITIZATION_WEIGHT.recentTopicPenalty
      : PRIORITIZATION_WEIGHT.recentSubjectPenalty;
  }

  if (daysSinceCompletion >= 3) {
    return PRIORITIZATION_WEIGHT.notSeenRecently;
  }

  return 0;
};

const buildRecentPerformanceAdjustment = (
  entry: ScheduleEntry,
  recentSessions: StudyPrioritizationRecentSession[],
): number => {
  const performanceMatch = recentSessions.find((session) =>
    normalizeScheduleMatcher(session.subject) === normalizeScheduleMatcher(entry.subject)
    && typeof session.accuracy === 'number');

  if (!performanceMatch || typeof performanceMatch.accuracy !== 'number') {
    return 0;
  }

  if (performanceMatch.accuracy < 0.6) {
    return PRIORITIZATION_WEIGHT.weakRecentPerformance;
  }

  if (performanceMatch.accuracy >= 0.8) {
    return PRIORITIZATION_WEIGHT.strongRecentPerformance;
  }

  return 0;
};

const buildReasonSummary = (breakdown: StudyPrioritizationBreakdown): string => {
  const positiveSignals = [
    breakdown.overdueScore > 0 ? { label: 'Atrasado', weight: breakdown.overdueScore } : null,
    breakdown.manualPriorityScore >= PRIORITIZATION_WEIGHT.manualPriority
      ? { label: 'Prioridade alta', weight: breakdown.manualPriorityScore }
      : breakdown.manualPriorityScore > 0
        ? { label: 'Remarcado para hoje', weight: breakdown.manualPriorityScore }
        : null,
    breakdown.weaknessScore >= PRIORITIZATION_WEIGHT.weaknessHigh
      ? { label: 'Tema fraco', weight: breakdown.weaknessScore }
      : breakdown.weaknessScore > 0
        ? { label: 'Ponto de atencao', weight: breakdown.weaknessScore }
        : null,
    breakdown.weeklyLoadScore > 0 ? { label: 'Baixa cobertura na semana', weight: breakdown.weeklyLoadScore } : null,
    breakdown.recencyAdjustment > 0 ? { label: 'Nao apareceu recentemente', weight: breakdown.recencyAdjustment } : null,
    breakdown.recentPerformanceAdjustment > 0
      ? { label: 'Desempenho recente fraco', weight: breakdown.recentPerformanceAdjustment }
      : null,
  ]
    .filter(Boolean)
    .sort((left, right) => (right?.weight || 0) - (left?.weight || 0)) as Array<{ label: string; weight: number }>;

  if (positiveSignals.length >= 2) {
    return `${positiveSignals[0].label} e ${positiveSignals[1].label}`;
  }

  if (positiveSignals.length === 1) {
    return positiveSignals[0].label;
  }

  if (breakdown.recencyAdjustment < 0) {
    return 'Ainda assim e o melhor bloco disponivel agora';
  }

  return 'Melhor equilibrio atual do cronograma';
};

export const scoreScheduledStudyEntry = (
  entry: ScheduleEntry,
  entries: ScheduleEntry[],
  context: StudyPrioritizationContext = {},
): PrioritizedScheduledStudyFocus => {
  const today = context.today ?? new Date();
  const todayDateKey = toDateKey(today);
  const entryDateKey = entry.date.slice(0, 10);
  const overdueDays = Math.max(0, differenceInCalendarDays(today, new Date(`${entryDateKey}T12:00:00`)));
  const recentSessions = context.recentSessions ?? [];
  const overdueScore = overdueDays >= 2
    ? PRIORITIZATION_WEIGHT.overdueCritical
    : overdueDays >= 1 || entry.status === 'adiado'
      ? PRIORITIZATION_WEIGHT.overdue
      : 0;
  const manualPriorityScore = isManualPriorityEntry(entry)
    ? PRIORITIZATION_WEIGHT.manualPriority
    : wasManuallyMovedToToday(entry, todayDateKey)
      ? PRIORITIZATION_WEIGHT.manualMovedToToday
      : 0;
  const weaknessScore = buildWeaknessScore(entry, context.currentWeakPoint);
  const weeklyLoadScore = buildWeeklyLoadScore(entry, entries, today, context.schedule);
  const recencyAdjustment = buildRecencyAdjustment(entry, recentSessions);
  const recentPerformanceAdjustment = buildRecentPerformanceAdjustment(entry, recentSessions);
  const breakdown = {
    overdueScore,
    manualPriorityScore,
    weaknessScore,
    weeklyLoadScore,
    recencyAdjustment,
    recentPerformanceAdjustment,
  } satisfies StudyPrioritizationBreakdown;
  const score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

  return {
    entry,
    score,
    reasonSummary: buildReasonSummary(breakdown),
    breakdown,
  };
};

export const chooseNextScheduledStudyFocus = (
  entries: ScheduleEntry[],
  context: StudyPrioritizationContext = {},
): PrioritizedScheduledStudyFocus | null => {
  const today = context.today ?? new Date();
  const todayDateKey = toDateKey(today);

  const candidates = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => {
      if (isCompletedEntry(entry)) {
        return false;
      }

      return entry.date.slice(0, 10) <= todayDateKey;
    })
    .map(({ entry, index }) => ({
      ...scoreScheduledStudyEntry(entry, entries, context),
      index,
    }));

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }

    const leftDateDistance = Math.abs(differenceInCalendarDays(today, new Date(`${left.entry.date}T12:00:00`)));
    const rightDateDistance = Math.abs(differenceInCalendarDays(today, new Date(`${right.entry.date}T12:00:00`)));
    if (leftDateDistance !== rightDateDistance) {
      return leftDateDistance - rightDateDistance;
    }

    const leftManualPriority = Number(isManualPriorityEntry(left.entry));
    const rightManualPriority = Number(isManualPriorityEntry(right.entry));
    if (leftManualPriority !== rightManualPriority) {
      return rightManualPriority - leftManualPriority;
    }

    if (left.breakdown.weaknessScore !== right.breakdown.weaknessScore) {
      return right.breakdown.weaknessScore - left.breakdown.weaknessScore;
    }

    const leftManualMoveToTodayAt = wasManuallyMovedToToday(left.entry, todayDateKey) ? getEntryUpdatedAt(left.entry) : 0;
    const rightManualMoveToTodayAt = wasManuallyMovedToToday(right.entry, todayDateKey) ? getEntryUpdatedAt(right.entry) : 0;
    if (leftManualMoveToTodayAt !== rightManualMoveToTodayAt) {
      return rightManualMoveToTodayAt - leftManualMoveToTodayAt;
    }

    const stableOrder = compareScheduleEntries(left.entry, right.entry);
    if (stableOrder !== 0) {
      return stableOrder;
    }

    return left.index - right.index;
  });

  const winner = candidates[0];
  return winner
    ? {
        entry: winner.entry,
        score: winner.score,
        reasonSummary: winner.reasonSummary,
        breakdown: winner.breakdown,
      }
    : null;
};

const toComparableEntryDate = (value: string): Date | null => {
  if (!value) return null;

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const getWeeklyCompletedSessions = (
  entries: ScheduleEntry[],
  startOfWeek: Date,
  endOfWeek: Date,
): number => {
  const start = new Date(startOfWeek);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endOfWeek);
  end.setHours(23, 59, 59, 999);

  return entries.filter((entry) => {
    if (!isCompletedEntry(entry)) {
      return false;
    }

    const entryDate = toComparableEntryDate(entry.date);
    if (!entryDate) {
      return false;
    }

    return entryDate >= start && entryDate <= end;
  }).length;
};

export const getTodayCompletedSessions = (
  entries: ScheduleEntry[],
  today = new Date(),
): number => {
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return entries.filter((entry) => {
    if (!isCompletedEntry(entry)) {
      return false;
    }

    return entry.date.slice(0, 10) === todayKey;
  }).length;
};

export const getWeeklyPlannedSessions = (
  entries: ScheduleEntry[],
  startOfWeek: Date,
  endOfWeek: Date,
): number => {
  const start = new Date(startOfWeek);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endOfWeek);
  end.setHours(23, 59, 59, 999);

  return entries.filter((entry) => {
    const parsed = toComparableEntryDate(entry.date);
    if (!parsed) {
      return false;
    }

    return parsed >= start && parsed <= end;
  }).length;
};

export const getWeeklyPlanConfidenceState = (
  weeklyCompletedSessions: number,
  weeklyGoalSessions?: number,
): WeeklyConfidenceState => {
  if (weeklyCompletedSessions <= 0) {
    return 'not_started';
  }

  if (typeof weeklyGoalSessions === 'number' && weeklyGoalSessions > 0) {
    return weeklyCompletedSessions / weeklyGoalSessions >= 0.6 ? 'on_track' : 'below_pace';
  }

  return 'on_track';
};

export const getRecentPaceState = (
  schedule: WeeklyStudySchedule,
  completedDateKeys: string[],
  today = new Date(),
): RecentPaceState => {
  const completedDates = new Set(
    completedDateKeys
      .map((value) => normalizeCompletedDateKey(value))
      .filter(Boolean) as string[],
  );

  let checkedActiveDays = 0;
  let consecutiveMissedActiveDays = 0;

  for (let offset = 1; offset <= 14 && checkedActiveDays < 3; offset += 1) {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);

    const weekday = getWeekdayFromDate(date);
    if (!schedule.availability[weekday]) {
      continue;
    }

    checkedActiveDays += 1;

    if (completedDates.has(toDateKey(date))) {
      break;
    }

    consecutiveMissedActiveDays += 1;
  }

  if (consecutiveMissedActiveDays >= 3) {
    return 'inactive_streak';
  }

  if (consecutiveMissedActiveDays >= 2) {
    return 'falling_behind';
  }

  return 'on_track';
};

const PACE_COPY_MAP: Record<RecentPaceState, PaceCopyVariant[]> = {
  on_track: [
    {
      today: 'Seu plano segue no ritmo certo.',
      postFocus: 'Voce manteve o ritmo do plano hoje.',
    },
    {
      today: 'Tudo alinhado com o seu plano.',
      postFocus: 'Mais um passo dentro do ritmo.',
    },
  ],
  falling_behind: [
    {
      today: 'Voce estava no ritmo. Vamos retomar hoje.',
      postFocus: 'Hoje ja esta colocando seu plano de volta em movimento.',
    },
    {
      today: 'O ritmo caiu um pouco. Vamos retomar com leveza.',
      postFocus: 'Retomar hoje ja faz diferenca no seu plano.',
    },
  ],
  inactive_streak: [
    {
      today: 'Faz alguns dias sem estudo. Vamos recomecar leve.',
      postFocus: 'Recomecar leve tambem e voltar ao plano.',
    },
    {
      today: 'Sem estudar ha alguns dias. Podemos recomecar sem pressao.',
      postFocus: 'Esse recomeco ja reacende o seu ritmo.',
    },
  ],
};

export const getPaceCopy = ({
  state,
  date,
}: {
  state: RecentPaceState;
  date: Date;
}): PaceCopyVariant | null => {
  const variants = PACE_COPY_MAP[state];

  if (!variants.length) {
    return null;
  }

  const index = date.getDate() % variants.length;
  return variants[index] ?? variants[0] ?? null;
};

export const getSuggestedAdjustment = (
  state: RecentPaceState,
): SuggestedAdjustment => {
  if (state === 'inactive_streak') {
    return {
      type: 'reduce_load',
      message: 'Podemos recomeçar com um dia mais leve.',
      actionLabel: 'Ajustar hoje',
    };
  }

  if (state === 'falling_behind') {
    return {
      type: 'redistribute',
      message: 'Podemos reorganizar a semana para facilitar.',
      actionLabel: 'Ajustar semana',
    };
  }

  return null;
};

export const getSuggestionDisplayKey = (
  state: RecentPaceState,
  date: Date = new Date(),
): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `suggested-adjustment:${state}:${yyyy}-${mm}-${dd}`;
};

export const shouldShowSuggestedAdjustment = (
  state: RecentPaceState,
  date: Date = new Date(),
): boolean => {
  if (state === 'on_track') {
    return false;
  }

  if (!getSuggestedAdjustment(state)) {
    return false;
  }

  if (typeof window === 'undefined') {
    return true;
  }

  try {
    return window.localStorage.getItem(getSuggestionDisplayKey(state, date)) !== 'hidden';
  } catch {
    return true;
  }
};

export const hideSuggestedAdjustmentForToday = (
  state: RecentPaceState,
  date: Date = new Date(),
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getSuggestionDisplayKey(state, date), 'hidden');
  } catch {
    // ignore storage failures and keep the suggestion visible on next render
  }
};

export const getNextStudySuggestion = ({
  weeklySchedule,
  today,
  currentSubjectLabel,
}: {
  weeklySchedule: WeeklyStudySchedule;
  today: Weekday;
  currentSubjectLabel?: string;
}): NextStudySuggestion => {
  const todayIndex = WEEKDAYS.indexOf(today);
  const todaySubjects = weeklySchedule.weekPlan[today]?.subjectLabels ?? [];
  const normalizedCurrentSubject = currentSubjectLabel?.trim().toLowerCase();

  if (todaySubjects.length > 1) {
    if (normalizedCurrentSubject) {
      const currentIndex = todaySubjects.findIndex(
        (subjectLabel) => subjectLabel.trim().toLowerCase() === normalizedCurrentSubject,
      );

      if (currentIndex >= 0 && todaySubjects[currentIndex + 1]) {
        return {
          type: 'next_today',
          subjectLabel: todaySubjects[currentIndex + 1],
        };
      }
    }

    if (todaySubjects[1]) {
      return {
        type: 'next_today',
        subjectLabel: todaySubjects[1],
      };
    }
  }

  for (let offset = 1; offset < WEEKDAYS.length; offset += 1) {
    const nextDay = WEEKDAYS[(todayIndex + offset) % WEEKDAYS.length];

    if (!weeklySchedule.availability[nextDay]) {
      continue;
    }

    const nextSubjects = weeklySchedule.weekPlan[nextDay]?.subjectLabels ?? [];
    if (nextSubjects[0]) {
      return {
        type: 'next_day',
        subjectLabel: nextSubjects[0],
      };
    }
  }

  return { type: null };
};

export const getNextStudyCopy = (
  suggestion: NextStudySuggestion,
): string => {
  if (!suggestion.type || !suggestion.subjectLabel) {
    return '';
  }

  if (suggestion.type === 'next_today') {
    return `Se quiser continuar hoje: ${suggestion.subjectLabel}`;
  }

  return `A seguir: ${suggestion.subjectLabel}`;
};

export const updateWeeklyDayPlan = (
  schedule: WeeklyStudySchedule,
  day: Weekday,
  subjectLabels: string[],
): WeeklyStudySchedule => ({
  ...schedule,
  weekPlan: {
    ...schedule.weekPlan,
    [day]: {
      subjectLabels: sanitizeSubjectLabels(subjectLabels),
    },
  },
  updatedAt: new Date().toISOString(),
});

export const moveSubjectInWeeklyPlan = (
  schedule: WeeklyStudySchedule,
  input: {
    subject: string;
    fromDate: string;
    toDate: string;
  },
): WeeklyStudySchedule => {
  const fromDateKey = normalizeDateKeyInput(input.fromDate);
  const toDateKey = normalizeDateKeyInput(input.toDate);
  if (!fromDateKey || !toDateKey || fromDateKey === toDateKey) {
    return schedule;
  }

  const fromDay = getWeekdayFromDate(new Date(`${fromDateKey}T12:00:00`));
  const toDay = getWeekdayFromDate(new Date(`${toDateKey}T12:00:00`));
  const fromLabels = schedule.weekPlan[fromDay]?.subjectLabels ?? [];
  const hasSubjectInOrigin = fromLabels.some(
    (label) => normalizeScheduleMatcher(label) === normalizeScheduleMatcher(input.subject),
  );

  if (!hasSubjectInOrigin) {
    return schedule;
  }

  return {
    ...schedule,
    weekPlan: {
      ...schedule.weekPlan,
      [fromDay]: {
        subjectLabels: sanitizeSubjectLabels(removeFirstMatchingSubject(fromLabels, input.subject)),
      },
      [toDay]: {
        subjectLabels: appendSubjectToDay(schedule.weekPlan[toDay]?.subjectLabels ?? [], input.subject),
      },
    },
    updatedAt: new Date().toISOString(),
  };
};

export const prioritizeSubjectInWeeklyPlan = (
  schedule: WeeklyStudySchedule,
  input: {
    subject: string;
    date: string;
  },
): WeeklyStudySchedule => {
  const dateKey = normalizeDateKeyInput(input.date);
  if (!dateKey) {
    return schedule;
  }

  const day = getWeekdayFromDate(new Date(`${dateKey}T12:00:00`));
  const subjectLabels = schedule.weekPlan[day]?.subjectLabels ?? [];
  const hasSubject = subjectLabels.some(
    (label) => normalizeScheduleMatcher(label) === normalizeScheduleMatcher(input.subject),
  );

  if (!hasSubject) {
    return schedule;
  }

  return {
    ...schedule,
    weekPlan: {
      ...schedule.weekPlan,
      [day]: {
        subjectLabels: insertSubjectAtTop(subjectLabels, input.subject),
      },
    },
    updatedAt: new Date().toISOString(),
  };
};

export const reorderSubjectInWeeklyPlan = (
  schedule: WeeklyStudySchedule,
  input: {
    subject: string;
    date: string;
    direction: ScheduleEntryReorderDirection;
  },
): WeeklyStudySchedule => {
  const dateKey = normalizeDateKeyInput(input.date);
  if (!dateKey) {
    return schedule;
  }

  const day = getWeekdayFromDate(new Date(`${dateKey}T12:00:00`));
  const subjectLabels = [...(schedule.weekPlan[day]?.subjectLabels ?? [])];
  const currentIndex = subjectLabels.findIndex(
    (label) => normalizeScheduleMatcher(label) === normalizeScheduleMatcher(input.subject),
  );
  if (currentIndex === -1) {
    return schedule;
  }

  const nextIndex = input.direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= subjectLabels.length) {
    return schedule;
  }

  const [subjectLabel] = subjectLabels.splice(currentIndex, 1);
  subjectLabels.splice(nextIndex, 0, subjectLabel);

  return {
    ...schedule,
    weekPlan: {
      ...schedule.weekPlan,
      [day]: {
        subjectLabels,
      },
    },
    updatedAt: new Date().toISOString(),
  };
};

export const toggleWeeklyDayAvailability = (
  schedule: WeeklyStudySchedule,
  day: Weekday,
  nextActive: boolean,
): WeeklyStudySchedule => ({
  ...schedule,
  availability: {
    ...schedule.availability,
    [day]: nextActive,
  },
  updatedAt: new Date().toISOString(),
});

export const resolveTodayStudyState = (
  schedule: WeeklyStudySchedule,
  date = new Date(),
): TodayStudyState => {
  const day = getWeekdayFromDate(date);

  if (!schedule.availability[day]) {
    return { type: 'inactive', day };
  }

  const subjectLabels = schedule.weekPlan[day].subjectLabels;
  if (subjectLabels.length === 0) {
    return { type: 'empty', day };
  }

  return {
    type: 'planned',
    day,
    subjectLabels,
  };
};

export const getEligibleSubjectsForDate = (
  schedule: WeeklyStudySchedule,
  date = new Date(),
): string[] => {
  const state = resolveTodayStudyState(schedule, date);
  return state.type === 'planned' ? state.subjectLabels : [];
};

export const buildStudyContextForToday = (
  schedule: WeeklyStudySchedule,
  date = new Date(),
): StudyContextForToday => {
  const state = resolveTodayStudyState(schedule, date);

  return {
    state,
    eligibleSubjects: state.type === 'planned' ? state.subjectLabels : [],
    defaultSessionDurationMinutes: schedule.preferences.defaultSessionDurationMinutes,
  };
};

export const resolveScheduledStudyFocus = (
  entries: ScheduleEntry[],
  input: {
    subject: string;
    topic?: string | null;
    date?: Date;
  },
): ScheduledStudyFocusResolution => {
  const date = input.date ?? new Date();
  const dateKey = toDateKey(date);
  const subjectKey = normalizeScheduleMatcher(input.subject);
  const topicKey = normalizeScheduleMatcher(input.topic);

  const rankedEntries = entries
    .map((entry) => {
      const entryDateKey = entry.date.slice(0, 10);
      const entrySubjectKey = normalizeScheduleMatcher(entry.subject);
      const entryTopicKey = normalizeScheduleMatcher(entry.topic);
      const subjectMatch = Boolean(subjectKey)
        && (entrySubjectKey === subjectKey || entrySubjectKey.includes(subjectKey) || subjectKey.includes(entrySubjectKey));
      const topicMatch = Boolean(topicKey)
        && Boolean(entryTopicKey)
        && (entryTopicKey === topicKey || entryTopicKey.includes(topicKey) || topicKey.includes(entryTopicKey));

      return {
        entry,
        entryDateKey,
        subjectMatch,
        topicMatch,
      };
    })
    .filter(({ subjectMatch }) => subjectMatch);

  const todayEntries = rankedEntries.filter(({ entryDateKey }) => entryDateKey === dateKey);
  const todayPendingEntries = todayEntries
    .filter(({ entry }) => !isCompletedEntry(entry))
    .sort((left, right) => Number(right.topicMatch) - Number(left.topicMatch));
  const todayCompletedEntries = todayEntries
    .filter(({ entry }) => isCompletedEntry(entry))
    .sort((left, right) => Number(right.topicMatch) - Number(left.topicMatch));
  const overdueEntries = rankedEntries
    .filter(({ entry, entryDateKey }) => !isCompletedEntry(entry) && entryDateKey < dateKey)
    .sort((left, right) => {
      if (left.entryDateKey !== right.entryDateKey) {
        return left.entryDateKey.localeCompare(right.entryDateKey);
      }

      return Number(right.topicMatch) - Number(left.topicMatch);
    });

  const firstPendingToday = todayPendingEntries[0]?.entry ?? null;
  if (firstPendingToday) {
    return {
      status: overdueEntries.length > 0 || firstPendingToday.status === 'adiado' ? 'overdue' : 'pending',
      matchedEntry: firstPendingToday,
      matchedEntrySource: 'today',
      overdueCount: overdueEntries.length,
      todayPendingCount: todayPendingEntries.length,
      todayCompletedCount: todayCompletedEntries.length,
    };
  }

  const firstCompletedToday = todayCompletedEntries[0]?.entry ?? null;
  if (firstCompletedToday) {
    return {
      status: 'completed',
      matchedEntry: firstCompletedToday,
      matchedEntrySource: 'today',
      overdueCount: overdueEntries.length,
      todayPendingCount: 0,
      todayCompletedCount: todayCompletedEntries.length,
    };
  }

  const firstOverdueEntry = overdueEntries[0]?.entry ?? null;
  if (firstOverdueEntry) {
    return {
      status: 'overdue',
      matchedEntry: firstOverdueEntry,
      matchedEntrySource: 'backlog',
      overdueCount: overdueEntries.length,
      todayPendingCount: 0,
      todayCompletedCount: 0,
    };
  }

  return {
    status: 'pending',
    matchedEntry: null,
    matchedEntrySource: 'none',
    overdueCount: 0,
    todayPendingCount: 0,
    todayCompletedCount: 0,
  };
};

const resolveOperationalEntryStatus = (
  entry: ScheduleEntry,
  todayDateKey: string,
): ScheduledStudyFocusStatus => {
  if (isCompletedEntry(entry)) {
    return 'completed';
  }

  if (entry.status === 'adiado' || entry.date.slice(0, 10) < todayDateKey) {
    return 'overdue';
  }

  return 'pending';
};

const sortOperationalEntries = (left: ScheduleEntry, right: ScheduleEntry): number =>
  compareScheduleEntries(left, right);

export const moveScheduleEntry = (
  entries: ScheduleEntry[],
  entryId: string,
  toDate: string,
  editedAt = new Date().toISOString(),
): ScheduleEntry[] => {
  const normalizedTargetDate = normalizeDateKeyInput(toDate);
  if (!normalizedTargetDate) {
    return entries;
  }

  let changed = false;
  const nextOrderIndex = getNextOrderIndexForDate(
    entries.filter((entry) => entry.id !== entryId),
    normalizedTargetDate,
  );
  const nextEntries = entries.map((entry) => {
    if (entry.id !== entryId || entry.date === normalizedTargetDate) {
      return entry;
    }

    changed = true;
    return {
      ...entry,
      date: normalizedTargetDate,
      orderIndex: nextOrderIndex,
      updatedAt: editedAt,
      lastManualEditAt: editedAt,
      lastManualTargetDate: normalizedTargetDate,
    };
  });

  return changed ? sortScheduleEntries(nextEntries) : entries;
};

export const postponeScheduleEntry = (
  entries: ScheduleEntry[],
  entryId: string,
  {
    startDate = new Date(),
    dayCount = DEFAULT_OPERATIONAL_WINDOW_DAYS,
  }: {
    startDate?: Date;
    dayCount?: number;
  } = {},
): ScheduleEntry[] => {
  const targetEntry = entries.find((entry) => entry.id === entryId);
  if (!targetEntry) {
    return entries;
  }

  const entryDate = new Date(`${targetEntry.date}T12:00:00`);
  if (Number.isNaN(entryDate.getTime())) {
    return entries;
  }

  entryDate.setDate(entryDate.getDate() + 1);
  const proposedDateKey = toDateKey(entryDate);
  const windowEndDateKey = getOperationalWindowEndDateKey(startDate, dayCount);
  const clampedTargetDate = proposedDateKey > windowEndDateKey ? windowEndDateKey : proposedDateKey;

  return moveScheduleEntry(entries, entryId, clampedTargetDate);
};

export const prioritizeScheduleEntry = (
  entries: ScheduleEntry[],
  entryId: string,
  editedAt = new Date().toISOString(),
): ScheduleEntry[] => {
  const targetEntry = entries.find((entry) => entry.id === entryId);
  if (!targetEntry) {
    return entries;
  }

  const dayEntries = getEntriesForDateSorted(entries, targetEntry.date);
  const targetIndex = dayEntries.findIndex((entry) => entry.id === entryId);
  if (targetIndex === -1) {
    return entries;
  }

  const nextDayEntries = [...dayEntries];
  const [target] = nextDayEntries.splice(targetIndex, 1);
  nextDayEntries.unshift({
    ...target,
    priority: 'alta',
    manualPriority: true,
    updatedAt: editedAt,
    lastManualEditAt: editedAt,
  });

  return sortScheduleEntries(applyUpdatedDayEntries(entries, targetEntry.date, nextDayEntries));
};

export const reorderScheduleEntry = (
  entries: ScheduleEntry[],
  entryId: string,
  direction: ScheduleEntryReorderDirection,
  editedAt = new Date().toISOString(),
): ScheduleEntry[] => {
  const targetEntry = entries.find((entry) => entry.id === entryId);
  if (!targetEntry) {
    return entries;
  }

  const dayEntries = getEntriesForDateSorted(entries, targetEntry.date);
  const targetIndex = dayEntries.findIndex((entry) => entry.id === entryId);
  if (targetIndex === -1) {
    return entries;
  }

  const swapIndex = direction === 'up' ? targetIndex - 1 : targetIndex + 1;
  if (swapIndex < 0 || swapIndex >= dayEntries.length) {
    return entries;
  }

  const nextDayEntries = [...dayEntries];
  const currentEntry = nextDayEntries[targetIndex];
  const swapEntry = nextDayEntries[swapIndex];
  nextDayEntries[targetIndex] = {
    ...swapEntry,
    updatedAt: swapEntry.updatedAt ?? editedAt,
  };
  nextDayEntries[swapIndex] = {
    ...currentEntry,
    updatedAt: editedAt,
    lastManualEditAt: editedAt,
  };

  return sortScheduleEntries(applyUpdatedDayEntries(entries, targetEntry.date, nextDayEntries));
};

export const updateScheduleEntryDuration = (
  entries: ScheduleEntry[],
  entryId: string,
  durationMinutes: number,
  editedAt = new Date().toISOString(),
): ScheduleEntry[] => {
  const clampedDuration = clamp(Math.round(durationMinutes || 0), 5, 180);
  let changed = false;
  const nextEntries = entries.map((entry) => {
    if (entry.id !== entryId) {
      return entry;
    }

    if (entry.durationMinutes === clampedDuration) {
      return entry;
    }

    changed = true;
    return {
      ...entry,
      durationMinutes: clampedDuration,
      endTime: buildEndTimeFromDuration(entry.startTime, clampedDuration) ?? entry.endTime,
      updatedAt: editedAt,
      lastManualEditAt: editedAt,
    };
  });

  return changed ? sortScheduleEntries(nextEntries) : entries;
};

export const createManualScheduleEntry = (
  entries: ScheduleEntry[],
  input: CreateManualScheduleEntryInput,
): ScheduleEntry[] => {
  const normalizedDate = normalizeDateKeyInput(input.date);
  if (!normalizedDate) {
    return entries;
  }

  const createdAt = input.createdAt ?? new Date().toISOString();
  const updatedAt = input.updatedAt ?? createdAt;
  const subject = String(input.subject || '').trim();
  if (!subject) {
    return entries;
  }

  const nextEntry: ScheduleEntry = {
    id: input.id,
    date: normalizedDate,
    subject,
    topic: input.topic?.trim() || undefined,
    note: input.note?.trim() || undefined,
    durationMinutes: input.durationMinutes ? clamp(Math.round(input.durationMinutes), 5, 180) : undefined,
    orderIndex: getNextOrderIndexForDate(entries, normalizedDate),
    done: false,
    status: 'pendente',
    priority: 'normal',
    source: 'manual',
    createdAt,
    updatedAt,
    lastManualEditAt: updatedAt,
    lastManualTargetDate: normalizedDate,
  };

  return sortScheduleEntries([...entries, nextEntry]);
};

export const buildOperationalScheduleWindow = (
  schedule: WeeklyStudySchedule,
  entries: ScheduleEntry[],
  {
    startDate = new Date(),
    offsetDays = 1,
    dayCount = DEFAULT_OPERATIONAL_WINDOW_DAYS,
  }: {
    startDate?: Date;
    offsetDays?: number;
    dayCount?: number;
  } = {},
): OperationalScheduleWindowDay[] => {
  const todayDateKey = toDateKey(startDate);
  const safeDayCount = Math.max(0, dayCount);
  const safeOffset = Math.max(0, offsetDays);

  return Array.from({ length: safeDayCount }, (_, index) => {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + safeOffset + index);

    const dateKey = toDateKey(currentDate);
    const weekday = getWeekdayFromDate(currentDate);
    const isActive = schedule.availability[weekday];
    const dayEntries = entries
      .filter((entry) => entry.date.slice(0, 10) === dateKey)
      .sort(sortOperationalEntries);

    const items: OperationalScheduleWindowItem[] = dayEntries.length > 0
      ? dayEntries.map((entry) => ({
          id: entry.id,
          subject: entry.subject,
          topic: entry.topic ?? null,
          note: entry.note,
          reason: entry.aiReason,
          studyType: entry.studyType,
          priority: entry.priority,
          durationMinutes: getEntryDurationMinutes(entry),
          source: 'entry',
          status: resolveOperationalEntryStatus(entry, todayDateKey),
          startTime: entry.startTime,
          endTime: entry.endTime,
        }))
      : isActive
        ? schedule.weekPlan[weekday].subjectLabels.map((subjectLabel, subjectIndex) => {
            const resolution = resolveScheduledStudyFocus(entries, {
              subject: subjectLabel,
              date: currentDate,
            });

            return {
              id: `weekly-plan-${dateKey}-${subjectIndex}-${subjectLabel}`,
              subject: subjectLabel,
              topic: resolution.matchedEntry?.topic ?? null,
              note: resolution.matchedEntry?.note,
              reason: resolution.matchedEntry?.aiReason,
              studyType: resolution.matchedEntry?.studyType,
              priority: resolution.matchedEntry?.priority ?? 'normal',
              durationMinutes: resolution.matchedEntry
                ? getEntryDurationMinutes(resolution.matchedEntry)
                : schedule.preferences.defaultSessionDurationMinutes,
              source: 'weekly_plan' as const,
              status: resolution.matchedEntrySource === 'backlog' ? 'overdue' : resolution.status,
              startTime: undefined,
              endTime: undefined,
            };
          })
        : [];

    return {
      date: dateKey,
      weekday,
      offsetDays: safeOffset + index,
      isToday: dateKey === todayDateKey,
      isActive,
      items,
    };
  });
};

export const autoDistributeSubjects = (
  schedule: WeeklyStudySchedule,
  subjectLabels: string[],
): WeeklyStudySchedule => {
  const sanitizedSubjects = sanitizeSubjectLabels(subjectLabels);
  if (sanitizedSubjects.length === 0) {
    return schedule;
  }

  const activeDays = WEEKDAYS.filter((day) => schedule.availability[day]);
  if (activeDays.length === 0) {
    return schedule;
  }

  const sessionsPerDay = clamp(schedule.preferences.sessionsPerDay, 1, 10);
  const nextWeekPlan = createEmptyWeeklyPlan();

  // Active days are fully redistributed.
  // Inactive days preserve their existing saved subjects.
  WEEKDAYS.forEach((day) => {
    if (!schedule.availability[day]) {
      nextWeekPlan[day] = {
        subjectLabels: [...schedule.weekPlan[day].subjectLabels],
      };
      return;
    }

    nextWeekPlan[day] = { subjectLabels: [] };
  });

  let cursor = 0;

  activeDays.forEach((day) => {
    const allocations: string[] = [];

    for (let i = 0; i < sessionsPerDay; i += 1) {
      allocations.push(sanitizedSubjects[cursor % sanitizedSubjects.length]);
      cursor += 1;
    }

    nextWeekPlan[day] = { subjectLabels: allocations };
  });

  return {
    ...schedule,
    weekPlan: nextWeekPlan,
    updatedAt: new Date().toISOString(),
  };
};

const normalizeTime = (value?: string): string => {
  if (!value) return '08:00';
  return value.length >= 5 ? value.slice(0, 5) : value;
};

const defaultEndTime = (startTime?: string): string => {
  const start = normalizeTime(startTime);
  const [hourRaw] = start.split(':');
  const hour = Number(hourRaw || 8);
  return `${String(Math.min(23, hour + 1)).padStart(2, '0')}:00`;
};

const toRow = (userId: string, entry: ScheduleEntry) => {
  const status = entry.status || (entry.done ? 'concluido' : 'pendente');
  const startTime = normalizeTime(entry.startTime);
  const endTime = normalizeTime(entry.endTime || defaultEndTime(startTime));

  return {
    id: entry.id,
    user_id: userId,
    study_date: entry.date,
    start_time: startTime,
    end_time: endTime,
    subject: entry.subject,
    topic: entry.topic ?? null,
    note: entry.note ?? null,
    type: entry.studyType ?? null,
    status,
    reason: entry.aiReason ?? null,
    source: entry.source ?? null,
  };
};

const toOfflinePayload = (entry: ScheduleEntry) => {
  const status = entry.status || (entry.done ? 'concluido' : 'pendente');
  const startTime = normalizeTime(entry.startTime);
  const endTime = normalizeTime(entry.endTime || defaultEndTime(startTime));

  return {
    id: entry.id,
    study_date: entry.date,
    start_time: startTime,
    end_time: endTime,
    subject: entry.subject,
    topic: entry.topic ?? null,
    note: entry.note ?? null,
    type: entry.studyType ?? null,
    status,
    reason: entry.aiReason ?? null,
    source: entry.source ?? null,
    local_updated_at: new Date().toISOString(),
  };
};

const fromRow = (row: StudyBlockRow): ScheduleEntry => ({
  id: row.id,
  date: row.study_date,
  startTime: normalizeTime(row.start_time),
  endTime: normalizeTime(row.end_time),
  subject: row.subject,
  topic: row.topic ?? undefined,
  note: row.note ?? undefined,
  studyType: (row.type as ScheduleEntry['studyType']) ?? undefined,
  status: row.status,
  done: row.status === 'concluido',
  aiReason: row.reason ?? undefined,
  source: (row.source as ScheduleEntry['source']) ?? undefined,
  priority:
    (row.source === 'motor' || row.source === 'ia') && row.reason
      ? 'alta'
      : 'normal',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

class StudyScheduleService {
  async listEntries(userId: string): Promise<ScheduleEntry[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('study_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Erro ao carregar cronograma: ${error.message}`);
    }

    return ((data || []) as StudyBlockRow[]).map(fromRow);
  }

  async upsertEntry(userId: string, entry: ScheduleEntry): Promise<void> {
    const offlinePayload = toOfflinePayload(entry);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await offlineSyncService.enqueue({
        action: 'CREATE',
        table: 'study_blocks',
        recordId: entry.id,
        data: offlinePayload,
      });

      return;
    }

    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase
      .from(TABLE)
      .upsert(toRow(userId, entry), { onConflict: 'id' });

    if (error) {
      const message = `Erro ao salvar bloco do cronograma: ${error.message}`;
      if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
        await offlineSyncService.enqueue({
          action: 'CREATE',
          table: 'study_blocks',
          recordId: entry.id,
          data: offlinePayload,
        });
        return;
      }

      throw new Error(message);
    }
  }

  async upsertEntries(userId: string, entries: ScheduleEntry[]): Promise<void> {
    if (entries.length === 0) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      for (const entry of entries) {
        await offlineSyncService.enqueue({
          action: 'CREATE',
          table: 'study_blocks',
          recordId: entry.id,
          data: toOfflinePayload(entry),
        });
      }
      return;
    }

    if (!isSupabaseConfigured || !supabase) return;

    const payload = entries.map((entry) => toRow(userId, entry));

    const { error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      const message = `Erro ao salvar blocos em lote: ${error.message}`;
      if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
        for (const entry of entries) {
          await offlineSyncService.enqueue({
            action: 'CREATE',
            table: 'study_blocks',
            recordId: entry.id,
            data: toOfflinePayload(entry),
          });
        }
        return;
      }

      throw new Error(message);
    }
  }

  async deleteEntry(userId: string, entryId: string): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await offlineSyncService.enqueue({
        action: 'DELETE',
        table: 'study_blocks',
        recordId: entryId,
        data: {
          local_updated_at: new Date().toISOString(),
        },
      });
      return;
    }

    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) {
      const message = `Erro ao remover bloco do cronograma: ${error.message}`;
      if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
        await offlineSyncService.enqueue({
          action: 'DELETE',
          table: 'study_blocks',
          recordId: entryId,
          data: {
            local_updated_at: new Date().toISOString(),
          },
        });
        return;
      }

      throw new Error(message);
    }
  }

  async deleteAllEntries(userId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao limpar cronograma: ${error.message}`);
    }
  }

  async completeEntryForToday(
    userId: string | null | undefined,
    input: {
      subject: string;
      topic?: string | null;
      completedAt?: string | null;
    },
  ): Promise<ScheduleEntry | null> {
    const completedDateKey = normalizeCompletedDateKey(input.completedAt || new Date().toISOString());
    if (!completedDateKey) {
      return null;
    }

    const subjectKey = normalizeScheduleMatcher(input.subject);
    const topicKey = normalizeScheduleMatcher(input.topic);
    const localEntries = loadLocalScheduleEntries();

    const rankedEntries = localEntries
      .map((entry, index) => {
        const entrySubjectKey = normalizeScheduleMatcher(entry.subject);
        const entryTopicKey = normalizeScheduleMatcher(entry.topic);
        const subjectMatch = Boolean(subjectKey)
          && (entrySubjectKey === subjectKey || entrySubjectKey.includes(subjectKey) || subjectKey.includes(entrySubjectKey));
        const topicMatch = Boolean(topicKey)
          && Boolean(entryTopicKey)
          && (entryTopicKey === topicKey || entryTopicKey.includes(topicKey) || topicKey.includes(entryTopicKey));

        return {
          entry,
          index,
          subjectMatch,
          topicMatch,
        };
      })
      .filter(({ entry, subjectMatch }) =>
        entry.date.slice(0, 10) === completedDateKey
        && !isCompletedEntry(entry)
        && subjectMatch)
      .sort((left, right) => Number(right.topicMatch) - Number(left.topicMatch));

    const target = rankedEntries[0];
    if (!target) {
      return null;
    }

    const updatedEntry: ScheduleEntry = {
      ...target.entry,
      done: true,
      status: 'concluido',
      updatedAt: new Date().toISOString(),
    };
    const nextEntries = [...localEntries];
    nextEntries[target.index] = updatedEntry;
    persistLocalScheduleEntries(nextEntries);

    if (userId) {
      await this.upsertEntry(userId, updatedEntry).catch(() => undefined);
    }

    return updatedEntry;
  }
}

export const studyScheduleService = new StudyScheduleService();
