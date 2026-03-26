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

const TABLE = 'study_blocks';
export const STUDY_SCHEDULE_STORAGE_KEY = 'mdz_study_schedule';
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
  } catch {
    // ignore local persistence failures
  }
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
  priority: row.reason ? 'alta' : 'normal',
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
