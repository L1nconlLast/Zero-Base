import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../data/achievements';
import { buildAchievementContext, getAchievementProgressRatio } from '../services/achievementProgress.service';
import type { MockExamHistoryEntry, UserData } from '../types';

const makeUserData = (): UserData => ({
  weekProgress: {
    domingo: { studied: false, minutes: 0 },
    segunda: { studied: false, minutes: 0 },
    terca: { studied: false, minutes: 0 },
    quarta: { studied: false, minutes: 0 },
    quinta: { studied: false, minutes: 0 },
    sexta: { studied: false, minutes: 0 },
    sabado: { studied: false, minutes: 0 },
  },
  completedTopics: {},
  totalPoints: 0,
  streak: 3,
  bestStreak: 3,
  achievements: [],
  level: 1,
  studyHistory: [
    {
      date: '2026-03-21T08:00:00.000Z',
      minutes: 60,
      points: 100,
      subject: 'Anatomia',
      duration: 60,
      goalMet: true,
      timestamp: '2026-03-21T08:00:00.000Z',
    },
    {
      date: '2026-03-20T23:15:00.000Z',
      minutes: 90,
      points: 150,
      subject: 'Anatomia',
      duration: 90,
      goalMet: true,
      timestamp: '2026-03-20T23:15:00.000Z',
    },
    {
      date: '2026-03-19T09:00:00.000Z',
      minutes: 120,
      points: 180,
      subject: 'Fisiologia',
      duration: 120,
      goalMet: true,
      timestamp: '2026-03-19T09:00:00.000Z',
    },
  ],
  dailyGoal: 60,
  sessions: [],
  currentStreak: 3,
});

const mockExamHistory: MockExamHistoryEntry[] = [
  {
    date: '2026-03-20T18:00:00.000Z',
    mistakesByTopic: { funcoes: 2 },
    totalQuestions: 20,
    correctCount: 17,
    track: 'enem',
    avgTimePerQuestionSec: 75,
  },
  {
    date: '2026-03-18T18:00:00.000Z',
    mistakesByTopic: { fisica: 4 },
    totalQuestions: 20,
    correctCount: 12,
    track: 'concurso',
    avgTimePerQuestionSec: 82,
  },
];

describe('achievement progress context', () => {
  it('calcula metricas centrais de estudo e simulados', () => {
    const context = buildAchievementContext(makeUserData(), {
      weeklyGoalMinutes: 240,
      mockExamHistory,
      now: new Date('2026-03-21T12:00:00.000Z'),
    });

    expect(context.totalMinutes).toBe(270);
    expect(context.sessionCount).toBe(3);
    expect(context.currentStreak).toBe(3);
    expect(context.nightSessionCount).toBe(1);
    expect(context.weeklyStudiedMinutes).toBe(270);
    expect(context.weeklyGoalReached).toBe(true);
    expect(context.completedMockExams).toBe(2);
    expect(context.highScoreMockExams).toBe(1);
    expect(Math.round(context.bestMockExamAccuracy)).toBe(85);
  });

  it('desbloqueia conquistas coerentes com o contexto enriquecido', () => {
    const context = buildAchievementContext(makeUserData(), {
      weeklyGoalMinutes: 240,
      mockExamHistory,
      now: new Date('2026-03-21T12:00:00.000Z'),
    });

    const unlockedIds = ACHIEVEMENTS.filter((achievement) => achievement.condition(context)).map(
      (achievement) => achievement.id,
    );

    expect(unlockedIds).toContain('first_session');
    expect(unlockedIds).toContain('streak_3');
    expect(unlockedIds).toContain('time_1h');
    expect(unlockedIds).toContain('weekly_goal_1');
    expect(unlockedIds).toContain('exam_first');
    expect(unlockedIds).toContain('exam_ace');
    expect(unlockedIds).not.toContain('exam_5');
  });

  it('clampa progresso em 100% para cards quase concluidos', () => {
    expect(getAchievementProgressRatio({ current: 13, target: 10 })).toBe(1);
    expect(getAchievementProgressRatio({ current: 0, target: 10 })).toBe(0);
  });
});
