import { beforeEach, describe, expect, it } from 'vitest';
import type { ScheduleEntry, WeeklyStudySchedule } from '../types';
import {
  autoDistributeSubjects,
  buildOperationalScheduleWindow,
  buildStudyContextForToday,
  createDefaultWeeklyAvailability,
  createDefaultWeeklyStudySchedule,
  createEmptyWeeklyPlan,
  getActiveDaysCount,
  getNextStudyCopy,
  getNextStudySuggestion,
  getPaceCopy,
  getPlannedSubjectsCount,
  getRecentPaceState,
  getSuggestionDisplayKey,
  hideSuggestedAdjustmentForToday,
  getSuggestedAdjustment,
  getWeekdayFromDate,
  resolveScheduledStudyFocus,
  shouldShowSuggestedAdjustment,
  resolveTodayStudyState,
  sanitizeWeeklyStudySchedule,
  toggleWeeklyDayAvailability,
  updateWeeklyDayPlan,
} from '../services/studySchedule.service';

const atUtcNoon = (date: string): Date => new Date(`${date}T12:00:00.000Z`);
const createEntry = (overrides: Partial<ScheduleEntry>): ScheduleEntry => ({
  id: overrides.id || 'entry',
  date: overrides.date || '2026-03-16',
  subject: overrides.subject || 'Matematica',
  done: overrides.done ?? false,
  status: overrides.status,
  topic: overrides.topic,
  studyType: overrides.studyType,
  priority: overrides.priority,
  aiReason: overrides.aiReason,
  source: overrides.source,
  note: overrides.note,
  startTime: overrides.startTime,
  endTime: overrides.endTime,
});

describe('studySchedule.service', () => {
  describe('sanitizeWeeklyStudySchedule', () => {
    it('returns a safe default schedule for undefined input', () => {
      const result = sanitizeWeeklyStudySchedule(undefined);

      expect(result.weekPlan).toEqual(createEmptyWeeklyPlan());
      expect(result.availability).toEqual(createDefaultWeeklyAvailability());
      expect(result.preferences.defaultSessionDurationMinutes).toBe(25);
      expect(result.preferences.sessionsPerDay).toBe(1);
    });

    it('fills missing weekdays in availability with defaults', () => {
      const result = sanitizeWeeklyStudySchedule({
        availability: {
          monday: false,
          tuesday: true,
        },
      });

      expect(result.availability.monday).toBe(false);
      expect(result.availability.tuesday).toBe(true);
      expect(result.availability.wednesday).toBe(true);
      expect(result.availability.saturday).toBe(false);
      expect(result.availability.sunday).toBe(false);
    });

    it('fills missing weekdays in weekPlan with empty subject lists', () => {
      const result = sanitizeWeeklyStudySchedule({
        weekPlan: {
          monday: {
            subjectLabels: ['Matemática'],
          },
        },
      });

      expect(result.weekPlan.monday.subjectLabels).toEqual(['Matemática']);
      expect(result.weekPlan.tuesday.subjectLabels).toEqual([]);
      expect(result.weekPlan.sunday.subjectLabels).toEqual([]);
    });

    it('sanitizes invalid preferences and clamps numeric values', () => {
      const result = sanitizeWeeklyStudySchedule({
        preferences: {
          defaultSessionDurationMinutes: -10,
          sessionsPerDay: 999,
          weeklyGoalSessions: 0,
        },
      });

      expect(result.preferences.defaultSessionDurationMinutes).toBe(25);
      expect(result.preferences.sessionsPerDay).toBe(10);
      expect(result.preferences.weeklyGoalSessions).toBeUndefined();
    });

    it('deduplicates and trims subject labels', () => {
      const result = sanitizeWeeklyStudySchedule({
        weekPlan: {
          monday: {
            subjectLabels: ['  Matemática ', 'Matemática', '', 'Biologia'],
          },
        },
      });

      expect(result.weekPlan.monday.subjectLabels).toEqual(['Matemática', 'Biologia']);
    });

    it('falls back when updatedAt is invalid', () => {
      const result = sanitizeWeeklyStudySchedule({
        updatedAt: 'not-a-date',
      });

      expect(Number.isNaN(Date.parse(result.updatedAt))).toBe(false);
    });

    it('is idempotent for valid data', () => {
      const initial = sanitizeWeeklyStudySchedule({
        weekPlan: {
          monday: { subjectLabels: ['Matemática'] },
        },
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        preferences: {
          defaultSessionDurationMinutes: 30,
          sessionsPerDay: 2,
          weeklyGoalSessions: 8,
        },
        updatedAt: '2026-03-19T10:00:00.000Z',
      });

      const result = sanitizeWeeklyStudySchedule(initial);

      expect(result).toEqual(initial);
    });
  });

  describe('getWeekdayFromDate', () => {
    it('maps monday correctly', () => {
      expect(getWeekdayFromDate(atUtcNoon('2026-03-16'))).toBe('monday');
    });

    it('maps sunday correctly', () => {
      expect(getWeekdayFromDate(atUtcNoon('2026-03-15'))).toBe('sunday');
    });
  });

  describe('weekly counters', () => {
    it('counts active days correctly', () => {
      const count = getActiveDaysCount({
        monday: true,
        tuesday: true,
        wednesday: false,
        thursday: true,
        friday: false,
        saturday: false,
        sunday: false,
      });

      expect(count).toBe(3);
    });

    it('counts planned subject allocations across the week', () => {
      const schedule = updateWeeklyDayPlan(
        updateWeeklyDayPlan(createDefaultWeeklyStudySchedule(), 'monday', ['Matemática', 'Biologia']),
        'tuesday',
        ['Química'],
      );

      expect(getPlannedSubjectsCount(schedule.weekPlan)).toBe(3);
    });
  });

  describe('getRecentPaceState', () => {
    it('returns on_track when there is a recent completed active day', () => {
      const schedule = createDefaultWeeklyStudySchedule();

      const state = getRecentPaceState(
        schedule,
        ['2026-03-18'],
        atUtcNoon('2026-03-19'),
      );

      expect(state).toBe('on_track');
    });

    it('returns falling_behind after two missed active days', () => {
      const schedule = createDefaultWeeklyStudySchedule();

      const state = getRecentPaceState(
        schedule,
        ['2026-03-16'],
        atUtcNoon('2026-03-19'),
      );

      expect(state).toBe('falling_behind');
    });

    it('returns inactive_streak after three missed active days', () => {
      const schedule = createDefaultWeeklyStudySchedule();

      const state = getRecentPaceState(
        schedule,
        ['2026-03-13'],
        atUtcNoon('2026-03-19'),
      );

      expect(state).toBe('inactive_streak');
    });
  });

  describe('getPaceCopy', () => {
    it('rotates copy variants based on the date', () => {
      const copyA = getPaceCopy({
        state: 'falling_behind',
        date: atUtcNoon('2026-03-01'),
      });
      const copyB = getPaceCopy({
        state: 'falling_behind',
        date: atUtcNoon('2026-03-02'),
      });

      expect(copyA).not.toEqual(copyB);
    });

    it('returns the same variant for the same state and day', () => {
      const copyA = getPaceCopy({
        state: 'inactive_streak',
        date: atUtcNoon('2026-03-11'),
      });
      const copyB = getPaceCopy({
        state: 'inactive_streak',
        date: atUtcNoon('2026-03-11'),
      });

      expect(copyA).toEqual(copyB);
    });
  });

  describe('getSuggestedAdjustment', () => {
    it('suggests reducing load after an inactive streak', () => {
      expect(getSuggestedAdjustment('inactive_streak')).toEqual({
        type: 'reduce_load',
        message: 'Podemos recomeçar com um dia mais leve.',
        actionLabel: 'Ajustar hoje',
      });
    });

    it('suggests redistributing when falling behind', () => {
      expect(getSuggestedAdjustment('falling_behind')).toEqual({
        type: 'redistribute',
        message: 'Podemos reorganizar a semana para facilitar.',
        actionLabel: 'Ajustar semana',
      });
    });

    it('returns no suggestion when on track', () => {
      expect(getSuggestedAdjustment('on_track')).toBeNull();
    });
  });

  describe('suggested adjustment display', () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    it('creates a stable daily key per state', () => {
      expect(
        getSuggestionDisplayKey('falling_behind', atUtcNoon('2026-03-20')),
      ).toBe('suggested-adjustment:falling_behind:2026-03-20');
    });

    it('shows suggestion by default for inactive_streak', () => {
      expect(
        shouldShowSuggestedAdjustment('inactive_streak', atUtcNoon('2026-03-20')),
      ).toBe(true);
    });

    it('hides suggestion after dismissing it for the same day and state', () => {
      const date = atUtcNoon('2026-03-20');

      hideSuggestedAdjustmentForToday('falling_behind', date);

      expect(shouldShowSuggestedAdjustment('falling_behind', date)).toBe(false);
    });

    it('keeps suggestion visible on another day', () => {
      hideSuggestedAdjustmentForToday('falling_behind', atUtcNoon('2026-03-20'));

      expect(
        shouldShowSuggestedAdjustment('falling_behind', atUtcNoon('2026-03-21')),
      ).toBe(true);
    });

    it('does not show suggestion for on_track', () => {
      expect(
        shouldShowSuggestedAdjustment('on_track', atUtcNoon('2026-03-20')),
      ).toBe(false);
    });
  });

  describe('updateWeeklyDayPlan', () => {
    it('sanitizes subject labels when updating a day plan', () => {
      const base = createDefaultWeeklyStudySchedule();

      const result = updateWeeklyDayPlan(base, 'monday', [
        ' Matemática ',
        'Matemática',
        '',
        'Biologia',
      ]);

      expect(result.weekPlan.monday.subjectLabels).toEqual(['Matemática', 'Biologia']);
    });

    it('updates updatedAt when changing a day plan', () => {
      const base: WeeklyStudySchedule = {
        ...createDefaultWeeklyStudySchedule(),
        updatedAt: '2026-03-01T00:00:00.000Z',
      };

      const result = updateWeeklyDayPlan(base, 'monday', ['Matemática']);

      expect(Number.isNaN(Date.parse(result.updatedAt))).toBe(false);
      expect(result.updatedAt).not.toBe(base.updatedAt);
    });
  });

  describe('resolveTodayStudyState', () => {
    it('returns inactive when the current day is disabled', () => {
      const base = createDefaultWeeklyStudySchedule();
      const schedule = toggleWeeklyDayAvailability(base, 'monday', false);

      const state = resolveTodayStudyState(schedule, atUtcNoon('2026-03-16'));

      expect(state).toEqual({
        type: 'inactive',
        day: 'monday',
      });
    });

    it('returns empty when the current day is active but has no subjects', () => {
      const schedule = createDefaultWeeklyStudySchedule();

      const state = resolveTodayStudyState(schedule, atUtcNoon('2026-03-16'));

      expect(state).toEqual({
        type: 'empty',
        day: 'monday',
      });
    });

    it('returns planned when the current day is active and has subjects', () => {
      const schedule = updateWeeklyDayPlan(
        createDefaultWeeklyStudySchedule(),
        'monday',
        ['Matemática', 'Biologia'],
      );

      const state = resolveTodayStudyState(schedule, atUtcNoon('2026-03-16'));

      expect(state).toEqual({
        type: 'planned',
        day: 'monday',
        subjectLabels: ['Matemática', 'Biologia'],
      });
    });
  });

  describe('getNextStudySuggestion', () => {
    it('suggests the next subject on the same day when there is another block after the current one', () => {
      const schedule = updateWeeklyDayPlan(
        createDefaultWeeklyStudySchedule(),
        'monday',
        ['Matemática', 'Português', 'História'],
      );

      expect(
        getNextStudySuggestion({
          weeklySchedule: schedule,
          today: 'monday',
          currentSubjectLabel: 'Matemática',
        }),
      ).toEqual({
        type: 'next_today',
        subjectLabel: 'Português',
      });
    });

    it('falls back to the next active day when there is no next subject today', () => {
      const schedule = updateWeeklyDayPlan(
        updateWeeklyDayPlan(createDefaultWeeklyStudySchedule(), 'monday', ['Matemática']),
        'tuesday',
        ['História'],
      );

      expect(
        getNextStudySuggestion({
          weeklySchedule: schedule,
          today: 'monday',
          currentSubjectLabel: 'Matemática',
        }),
      ).toEqual({
        type: 'next_day',
        subjectLabel: 'História',
      });
    });

    it('returns null suggestion when no next study is available', () => {
      const schedule = toggleWeeklyDayAvailability(
        updateWeeklyDayPlan(createDefaultWeeklyStudySchedule(), 'monday', ['Matemática']),
        'tuesday',
        false,
      );

      const noOtherDays = {
        ...schedule,
        availability: {
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
        },
      } as WeeklyStudySchedule;

      expect(
        getNextStudySuggestion({
          weeklySchedule: noOtherDays,
          today: 'monday',
          currentSubjectLabel: 'Matemática',
        }),
      ).toEqual({ type: null });
    });
  });

  describe('getNextStudyCopy', () => {
    it('formats next subject on the same day', () => {
      expect(
        getNextStudyCopy({
          type: 'next_today',
          subjectLabel: 'Português',
        }),
      ).toBe('Se quiser continuar hoje: Português');
    });

    it('formats next subject on a following day', () => {
      expect(
        getNextStudyCopy({
          type: 'next_day',
          subjectLabel: 'História',
        }),
      ).toBe('A seguir: História');
    });
  });

  describe('buildStudyContextForToday', () => {
    it('returns eligible subjects only for planned days', () => {
      const schedule = updateWeeklyDayPlan(
        createDefaultWeeklyStudySchedule(),
        'monday',
        ['História'],
      );

      const context = buildStudyContextForToday(schedule, atUtcNoon('2026-03-16'));

      expect(context.state.type).toBe('planned');
      expect(context.eligibleSubjects).toEqual(['História']);
      expect(context.defaultSessionDurationMinutes).toBe(25);
    });

    it('returns empty eligible subjects for inactive days', () => {
      const schedule = toggleWeeklyDayAvailability(
        createDefaultWeeklyStudySchedule(),
        'monday',
        false,
      );

      const context = buildStudyContextForToday(schedule, atUtcNoon('2026-03-16'));

      expect(context.state.type).toBe('inactive');
      expect(context.eligibleSubjects).toEqual([]);
    });

    it('returns empty eligible subjects for active days without subjects', () => {
      const schedule = createDefaultWeeklyStudySchedule();

      const context = buildStudyContextForToday(schedule, atUtcNoon('2026-03-16'));

      expect(context.state.type).toBe('empty');
      expect(context.eligibleSubjects).toEqual([]);
    });
  });

  describe('toggleWeeklyDayAvailability', () => {
    it('does not erase saved subjects when disabling a day', () => {
      const withSubjects = updateWeeklyDayPlan(
        createDefaultWeeklyStudySchedule(),
        'monday',
        ['Matemática'],
      );

      const disabled = toggleWeeklyDayAvailability(withSubjects, 'monday', false);

      expect(disabled.availability.monday).toBe(false);
      expect(disabled.weekPlan.monday.subjectLabels).toEqual(['Matemática']);
    });

    it('preserves saved subjects when re-enabling a day', () => {
      const withSubjects = updateWeeklyDayPlan(
        createDefaultWeeklyStudySchedule(),
        'monday',
        ['Matemática'],
      );

      const disabled = toggleWeeklyDayAvailability(withSubjects, 'monday', false);
      const enabledAgain = toggleWeeklyDayAvailability(disabled, 'monday', true);

      expect(enabledAgain.availability.monday).toBe(true);
      expect(enabledAgain.weekPlan.monday.subjectLabels).toEqual(['Matemática']);
    });
  });

  describe('autoDistributeSubjects', () => {
    it('does nothing when there are no subjects', () => {
      const schedule = createDefaultWeeklyStudySchedule();

      const result = autoDistributeSubjects(schedule, []);

      expect(result).toEqual(schedule);
    });

    it('does nothing when there are no active days', () => {
      let schedule = createDefaultWeeklyStudySchedule();

      schedule = toggleWeeklyDayAvailability(schedule, 'monday', false);
      schedule = toggleWeeklyDayAvailability(schedule, 'tuesday', false);
      schedule = toggleWeeklyDayAvailability(schedule, 'wednesday', false);
      schedule = toggleWeeklyDayAvailability(schedule, 'thursday', false);
      schedule = toggleWeeklyDayAvailability(schedule, 'friday', false);

      const result = autoDistributeSubjects(schedule, ['Matemática']);

      expect(result).toEqual(schedule);
    });

    it('distributes subjects only across active days', () => {
      let schedule = createDefaultWeeklyStudySchedule();
      schedule = toggleWeeklyDayAvailability(schedule, 'tuesday', false);
      schedule = updateWeeklyDayPlan(schedule, 'tuesday', ['Física']);

      const result = autoDistributeSubjects(schedule, ['Matemática', 'Biologia']);

      expect(result.weekPlan.monday.subjectLabels.length).toBeGreaterThan(0);
      expect(result.weekPlan.tuesday.subjectLabels).toEqual(['Física']);
    });

    it('respects sessionsPerDay across active days', () => {
      const base: WeeklyStudySchedule = {
        ...createDefaultWeeklyStudySchedule(),
        preferences: {
          defaultSessionDurationMinutes: 25,
          sessionsPerDay: 2,
        },
      };

      const result = autoDistributeSubjects(base, ['Matemática', 'Biologia', 'Química']);

      expect(result.weekPlan.monday.subjectLabels).toHaveLength(2);

      const activeDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
      activeDays.forEach((day) => {
        expect(result.weekPlan[day].subjectLabels.length).toBeLessThanOrEqual(2);
      });
    });

    it('is deterministic for the same input', () => {
      const schedule = createDefaultWeeklyStudySchedule();
      const subjects = ['Matemática', 'Biologia', 'Química'];

      const resultA = autoDistributeSubjects(schedule, subjects);
      const resultB = autoDistributeSubjects(schedule, subjects);

      expect(resultA.weekPlan).toEqual(resultB.weekPlan);
    });

    it('replaces active-day allocations while preserving inactive days', () => {
      let schedule = createDefaultWeeklyStudySchedule();
      schedule = updateWeeklyDayPlan(schedule, 'monday', ['Antiga']);
      schedule = updateWeeklyDayPlan(schedule, 'saturday', ['Redação']);
      schedule = toggleWeeklyDayAvailability(schedule, 'saturday', false);

      const result = autoDistributeSubjects(schedule, ['Matemática']);

      expect(result.weekPlan.monday.subjectLabels).toEqual(['Matemática']);
      expect(result.weekPlan.saturday.subjectLabels).toEqual(['Redação']);
    });
  });

  describe('resolveScheduledStudyFocus', () => {
    it('returns pending when a matching block exists today and is still open', () => {
      const result = resolveScheduledStudyFocus(
        [
          createEntry({
            id: 'today-open',
            date: '2026-03-16',
            subject: 'Matematica',
            topic: 'Porcentagem',
            status: 'pendente',
          }),
        ],
        {
          subject: 'Matematica',
          topic: 'Porcentagem',
          date: atUtcNoon('2026-03-16'),
        },
      );

      expect(result).toMatchObject({
        status: 'pending',
        matchedEntrySource: 'today',
        todayPendingCount: 1,
        overdueCount: 0,
      });
      expect(result.matchedEntry?.id).toBe('today-open');
    });

    it('returns completed when the matching block for today is already done', () => {
      const result = resolveScheduledStudyFocus(
        [
          createEntry({
            id: 'today-done',
            date: '2026-03-16',
            subject: 'Matematica',
            topic: 'Porcentagem',
            done: true,
            status: 'concluido',
          }),
        ],
        {
          subject: 'Matematica',
          topic: 'Porcentagem',
          date: atUtcNoon('2026-03-16'),
        },
      );

      expect(result).toMatchObject({
        status: 'completed',
        matchedEntrySource: 'today',
        todayCompletedCount: 1,
      });
      expect(result.matchedEntry?.id).toBe('today-done');
    });

    it('returns overdue when the focus still has backlog before today', () => {
      const result = resolveScheduledStudyFocus(
        [
          createEntry({
            id: 'backlog',
            date: '2026-03-15',
            subject: 'Matematica',
            topic: 'Porcentagem',
            status: 'pendente',
          }),
        ],
        {
          subject: 'Matematica',
          topic: 'Porcentagem',
          date: atUtcNoon('2026-03-16'),
        },
      );

      expect(result).toMatchObject({
        status: 'overdue',
        matchedEntrySource: 'backlog',
        overdueCount: 1,
      });
      expect(result.matchedEntry?.id).toBe('backlog');
    });
  });

  describe('buildOperationalScheduleWindow', () => {
    it('returns real future entries with their operational statuses', () => {
      const schedule = createDefaultWeeklyStudySchedule();

      const result = buildOperationalScheduleWindow(
        schedule,
        [
          createEntry({
            id: 'future-pending',
            date: '2026-03-17',
            subject: 'Linguagens',
            topic: 'Interpretacao',
            startTime: '09:00',
            endTime: '10:00',
            status: 'pendente',
            priority: 'normal',
          }),
          createEntry({
            id: 'future-completed',
            date: '2026-03-17',
            subject: 'Redacao',
            topic: 'Competencia 1',
            startTime: '08:00',
            endTime: '09:00',
            done: true,
            status: 'concluido',
            priority: 'alta',
          }),
          createEntry({
            id: 'future-postponed',
            date: '2026-03-18',
            subject: 'Humanas',
            topic: 'Brasil Colonia',
            status: 'adiado',
          }),
        ],
        {
          startDate: atUtcNoon('2026-03-16'),
          offsetDays: 1,
          dayCount: 2,
        },
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        date: '2026-03-17',
        weekday: 'tuesday',
        offsetDays: 1,
      });
      expect(result[0]?.items).toEqual([
        expect.objectContaining({
          id: 'future-completed',
          subject: 'Redacao',
          source: 'entry',
          status: 'completed',
        }),
        expect.objectContaining({
          id: 'future-pending',
          subject: 'Linguagens',
          source: 'entry',
          status: 'pending',
        }),
      ]);
      expect(result[1]?.items).toEqual([
        expect.objectContaining({
          id: 'future-postponed',
          subject: 'Humanas',
          source: 'entry',
          status: 'overdue',
        }),
      ]);
    });

    it('falls back to the weekly plan when a future day has no real entries', () => {
      let schedule = createDefaultWeeklyStudySchedule();
      schedule = updateWeeklyDayPlan(schedule, 'tuesday', ['Linguagens', 'Humanas']);

      const result = buildOperationalScheduleWindow(schedule, [], {
        startDate: atUtcNoon('2026-03-16'),
        offsetDays: 1,
        dayCount: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: '2026-03-17',
        weekday: 'tuesday',
        isActive: true,
      });
      expect(result[0]?.items).toEqual([
        expect.objectContaining({
          subject: 'Linguagens',
          source: 'weekly_plan',
          status: 'pending',
        }),
        expect.objectContaining({
          subject: 'Humanas',
          source: 'weekly_plan',
          status: 'pending',
        }),
      ]);
    });

    it('marks backlog matches from the weekly plan as overdue for upcoming days', () => {
      let schedule = createDefaultWeeklyStudySchedule();
      schedule = updateWeeklyDayPlan(schedule, 'wednesday', ['Matematica']);

      const result = buildOperationalScheduleWindow(
        schedule,
        [
          createEntry({
            id: 'math-backlog',
            date: '2026-03-17',
            subject: 'Matematica',
            topic: 'Porcentagem',
            status: 'pendente',
          }),
        ],
        {
          startDate: atUtcNoon('2026-03-16'),
          offsetDays: 2,
          dayCount: 1,
        },
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: '2026-03-18',
        weekday: 'wednesday',
      });
      expect(result[0]?.items).toEqual([
        expect.objectContaining({
          subject: 'Matematica',
          source: 'weekly_plan',
          status: 'overdue',
          topic: 'Porcentagem',
        }),
      ]);
    });
  });
});
