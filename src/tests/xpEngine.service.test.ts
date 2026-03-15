import { describe, expect, it } from 'vitest';
import { xpEngineService } from '../services/xpEngine.service';
import type { UserData } from '../types';

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
  streak: 0,
  bestStreak: 0,
  achievements: [],
  level: 1,
  studyHistory: [],
  dailyGoal: 90,
  sessions: [],
  currentStreak: 0,
});

describe('xpEngineService', () => {
  it('aplica delta de XP e recalcula nível', () => {
    const result = xpEngineService.applyXpDelta(makeUserData(), 150);
    expect(result.totalPoints).toBe(150);
    expect(result.level).toBeGreaterThanOrEqual(1);
  });

  it('não duplica recompensa de conquista já desbloqueada', () => {
    const first = xpEngineService.applyAchievementReward(makeUserData(), 'first_session', 10);
    const second = xpEngineService.applyAchievementReward(first, 'first_session', 10);

    expect(second.totalPoints).toBe(first.totalPoints);
    expect(second.achievements).toHaveLength(1);
  });

  it('aplica sessões e atualiza streak/points/weekProgress', () => {
    const base = makeUserData();
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    const today = todayObj.toISOString();

    const result = xpEngineService.applyStudySessions(base, [
      {
        date: today,
        minutes: 25,
        points: 250,
        subject: 'Anatomia',
        duration: 25,
      },
    ]);

    expect(result.totalPoints).toBe(250);
    expect(result.sessions).toHaveLength(1);
    expect(result.studyHistory).toHaveLength(1);
    expect(result.currentStreak).toBeGreaterThanOrEqual(1);

    const dayIndex = new Date(today).getDay();
    const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;
    const dayName = dayNames[dayIndex];
    expect(result.weekProgress[dayName].minutes).toBe(25);
  });
});
