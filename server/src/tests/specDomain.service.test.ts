import { describe, expect, it } from 'vitest';
import {
  calculateXpGained,
  computeNextStreak,
  getLevelLabelFromXp,
  getLevelNumberFromXp,
  summarizeAccuracyBySubject,
  summarizeTodayStats,
  summarizeWeekStats,
} from '../services/specDomain.service';

describe('specDomain.service', () => {
  it('calcula XP, nivel e streak corretamente', () => {
    expect(calculateXpGained({ durationMinutes: 50, correctAnswers: 8 })).toBe(90);
    expect(getLevelLabelFromXp(900)).toBe('INICIANTE');
    expect(getLevelLabelFromXp(2500)).toBe('ESTUDANTE');
    expect(getLevelNumberFromXp(9001)).toBe(4);
    expect(computeNextStreak({ previousStreak: 3, previousSessionDate: '2026-03-15T12:00:00.000Z', currentDate: '2026-03-16T08:00:00.000Z' })).toBe(4);
    expect(computeNextStreak({ previousStreak: 3, previousSessionDate: '2026-03-10T12:00:00.000Z', currentDate: '2026-03-16T08:00:00.000Z' })).toBe(1);
  });

  it('resume stats today/week e accuracy', () => {
    expect(summarizeTodayStats([
      { duration: 40, points: 80 },
      { duration: 20, points: 30 },
    ], 90, 5)).toEqual({
      studiedMinutes: 60,
      dailyGoalMinutes: 90,
      goalProgressPct: 67,
      xp: 110,
      streak: 5,
    });

    expect(summarizeWeekStats([
      { date: '2026-03-10T10:00:00.000Z', duration: 30, points: 30 },
      { date: '2026-03-12T10:00:00.000Z', duration: 40, points: 50 },
      { date: '2026-03-16T10:00:00.000Z', duration: 60, points: 90 },
    ], new Date('2026-03-16T12:00:00.000Z'))).toMatchObject({
      totalMinutes: 130,
      totalXp: 170,
      days: expect.any(Array),
    });

    expect(summarizeAccuracyBySubject([
      { subject: 'Matematica', isCorrect: true },
      { subject: 'Matematica', isCorrect: false },
      { subject: 'Portugues', isCorrect: true },
    ])).toEqual([
      { subject: 'Matematica', accuracy: 50, totalAnswers: 2 },
      { subject: 'Portugues', accuracy: 100, totalAnswers: 1 },
    ]);
  });
});