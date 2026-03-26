import { describe, expect, it } from 'vitest';
import type { OperationalScheduleWindowDay, OperationalScheduleWindowItem } from '../services/studySchedule.service';
import {
  getDailyLoad,
  getWeeklyLoadSummary,
  suggestRebalanceDay,
  suggestReinforceDay,
} from '../services/weeklyLoad.service';

const createItem = (overrides: Partial<OperationalScheduleWindowItem> = {}): OperationalScheduleWindowItem => ({
  id: overrides.id || 'item-1',
  subject: overrides.subject || 'Matematica',
  topic: overrides.topic ?? 'Porcentagem',
  note: overrides.note,
  reason: overrides.reason,
  studyType: overrides.studyType ?? 'questoes',
  priority: overrides.priority ?? 'normal',
  source: overrides.source ?? 'entry',
  status: overrides.status ?? 'pending',
  startTime: overrides.startTime,
  endTime: overrides.endTime,
});

const createDay = (overrides: Partial<OperationalScheduleWindowDay> & { date: string; offsetDays: number }): OperationalScheduleWindowDay => ({
  date: overrides.date,
  weekday: overrides.weekday || 'monday',
  offsetDays: overrides.offsetDays,
  isToday: overrides.isToday ?? false,
  isActive: overrides.isActive ?? true,
  items: overrides.items ?? [],
});

describe('weeklyLoad.service', () => {
  it('aggregates planned and completed load for a day', () => {
    const day = createDay({
      date: '2026-03-27',
      offsetDays: 1,
      items: [
        createItem({ id: 'planned', startTime: '08:00', endTime: '08:25', status: 'pending' }),
        createItem({ id: 'done', startTime: '09:00', endTime: '09:25', status: 'completed' }),
      ],
    });

    expect(getDailyLoad(day, 25)).toEqual({
      date: '2026-03-27',
      totalMinutes: 50,
      plannedMinutes: 25,
      completedMinutes: 25,
      sessions: 2,
      plannedSessions: 1,
      completedSessions: 1,
    });
  });

  it('classifies the week as low, ok and high based on average load', () => {
    const days = [
      createDay({
        date: '2026-03-27',
        offsetDays: 1,
        weekday: 'friday',
        items: [createItem({ id: 'a' }), createItem({ id: 'b' })],
      }),
      createDay({
        date: '2026-03-28',
        offsetDays: 2,
        weekday: 'saturday',
        items: [createItem({ id: 'c' })],
      }),
      createDay({
        date: '2026-03-29',
        offsetDays: 3,
        weekday: 'sunday',
        items: [],
      }),
    ];

    const result = getWeeklyLoadSummary(days, 25);

    expect(result.averageMinutes).toBeCloseTo(25, 5);
    expect(result.summaryCopy).toBe('Carga concentrada em 1 dia');
    expect(result.days.map((day) => ({
      date: day.date,
      totalMinutes: day.totalMinutes,
      level: day.level,
    }))).toEqual([
      { date: '2026-03-27', totalMinutes: 50, level: 'high' },
      { date: '2026-03-28', totalMinutes: 25, level: 'ok' },
      { date: '2026-03-29', totalMinutes: 0, level: 'low' },
    ]);
  });

  it('suggests rebalancing by moving the last movable item to the lighter future day', () => {
    const days = [
      createDay({
        date: '2026-03-27',
        offsetDays: 1,
        weekday: 'friday',
        items: [
          createItem({ id: 'mat' }),
          createItem({ id: 'manual-high', subject: 'Humanas', priority: 'alta' }),
          createItem({ id: 'ling', subject: 'Linguagens' }),
        ],
      }),
      createDay({
        date: '2026-03-28',
        offsetDays: 2,
        weekday: 'saturday',
        items: [],
      }),
      createDay({
        date: '2026-03-29',
        offsetDays: 3,
        weekday: 'sunday',
        items: [createItem({ id: 'hist', subject: 'Historia' })],
      }),
    ];

    expect(suggestRebalanceDay(days, '2026-03-27', 25)).toEqual({
      item: expect.objectContaining({ id: 'ling', subject: 'Linguagens' }),
      fromDate: '2026-03-27',
      toDate: '2026-03-28',
    });
  });

  it('suggests reinforcement by pulling a movable item from the next heavier day', () => {
    const days = [
      createDay({
        date: '2026-03-27',
        offsetDays: 1,
        weekday: 'friday',
        items: [],
      }),
      createDay({
        date: '2026-03-28',
        offsetDays: 2,
        weekday: 'saturday',
        items: [
          createItem({ id: 'manual-high', subject: 'Humanas', priority: 'alta' }),
          createItem({ id: 'hist', subject: 'Historia' }),
        ],
      }),
    ];

    expect(suggestReinforceDay(days, '2026-03-27', 25)).toEqual({
      item: expect.objectContaining({ id: 'hist', subject: 'Historia' }),
      fromDate: '2026-03-28',
      toDate: '2026-03-27',
    });
  });
});
