import { beforeEach, describe, expect, it } from 'vitest';
import type { AdaptiveSnapshot } from '../services/adaptiveLearning.service';
import { buildMentorMemoryRuntime } from '../services/mentorMemory.service';
import { buildMentorDecisionInput } from '../features/mentor/context/buildMentorDecisionInput';
import { mentorDecisionEngine } from '../features/mentor/decision/mentorDecisionEngine';
import type { UserData } from '../types';

const makeUserData = (sessions: UserData['studyHistory'], weekProgress: UserData['weekProgress'], currentStreak = 0): UserData => ({
  weekProgress,
  completedTopics: {},
  totalPoints: 0,
  streak: currentStreak,
  bestStreak: currentStreak,
  achievements: [],
  level: 3,
  studyHistory: sessions,
  dailyGoal: 60,
  sessions: [],
  currentStreak,
});

const emptyAdaptiveSnapshot = (): AdaptiveSnapshot => ({
  attempts: [],
  topicMetrics: [],
  reviewPlan: [],
  weeklyEvolution: [],
  summary: {
    totalAttempts: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    globalAccuracyRate: 0,
    averageResponseTimeSeconds: 0,
    weakTopics: 0,
    inconsistencyRate: 0,
    estimatedEnemScore: 0,
  },
});

describe('buildMentorDecisionInput + mentorDecisionEngine', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('classifica reta final com hoje zerado e prova proxima', () => {
    const now = new Date('2026-03-28T10:00:00.000Z');
    const userData = makeUserData(
      [
        {
          date: '2026-03-26T10:00:00.000Z',
          minutes: 25,
          points: 0,
          subject: 'Matematica',
          duration: 25,
        },
        {
          date: '2026-03-25T10:00:00.000Z',
          minutes: 40,
          points: 0,
          subject: 'Linguagens',
          duration: 40,
        },
      ],
      {
        domingo: { studied: false, minutes: 0 },
        segunda: { studied: true, minutes: 25 },
        terca: { studied: true, minutes: 40 },
        quarta: { studied: false, minutes: 0 },
        quinta: { studied: false, minutes: 0 },
        sexta: { studied: false, minutes: 0 },
        sabado: { studied: false, minutes: 0 },
      },
      2,
    );

    const runtime = buildMentorMemoryRuntime({
      userData,
      weeklyGoalMinutes: 300,
      daysToExam: 14,
      trigger: 'chat_opened',
      previousMemory: null,
    });

    const input = buildMentorDecisionInput({
      userKey: 'mentor-final-sprint',
      examGoal: 'ENEM',
      examDate: '2026-04-11',
      preferredTrack: 'enem',
      userData,
      weeklyGoalMinutes: 300,
      daysToExam: 14,
      trigger: 'chat_opened',
      memory: runtime.memory,
      runtime,
      adaptiveSnapshot: emptyAdaptiveSnapshot(),
      now,
    });

    const decision = mentorDecisionEngine.decide(input);

    expect(input.execution.todayMinutes).toBe(0);
    expect(input.profile.objective).toBe('enem');
    expect(decision.classification.moment).toBe('final_sprint');
    expect(decision.classification.responseKind).toBe('next_step');
    expect(decision.actions[0].subject).toBe(input.studyState.weakSubjects[0]);
  });

  it('prioriza revisao quando ha backlog e a semana esta fraca', () => {
    const now = new Date('2026-03-28T10:00:00.000Z');
    const userData = makeUserData(
      [
        {
          date: '2026-03-27T09:00:00.000Z',
          minutes: 15,
          points: 0,
          subject: 'Matematica',
          duration: 15,
        },
        {
          date: '2026-03-26T09:00:00.000Z',
          minutes: 20,
          points: 0,
          subject: 'Linguagens',
          duration: 20,
        },
      ],
      {
        domingo: { studied: false, minutes: 0 },
        segunda: { studied: true, minutes: 15 },
        terca: { studied: true, minutes: 20 },
        quarta: { studied: false, minutes: 0 },
        quinta: { studied: false, minutes: 0 },
        sexta: { studied: false, minutes: 0 },
        sabado: { studied: false, minutes: 0 },
      },
      1,
    );

    const runtime = buildMentorMemoryRuntime({
      userData,
      weeklyGoalMinutes: 300,
      daysToExam: 60,
      trigger: 'goal_below_70',
      previousMemory: null,
    });

    const adaptiveSnapshot: AdaptiveSnapshot = {
      ...emptyAdaptiveSnapshot(),
      topicMetrics: [
        {
          key: 'Matematica:porcentagem',
          subject: 'Matematica',
          topic: 'Porcentagem',
          totalAttempts: 8,
          correctAttempts: 2,
          incorrectAttempts: 6,
          accuracyRate: 25,
          errorRate: 75,
          averageResponseTimeSeconds: 80,
          averageDifficultyWeight: 1,
          weightedDomainScore: 28,
          lastReviewedAt: '2026-03-22T08:00:00.000Z',
          recencyFactor: 1.4,
          priorityScore: 88,
          status: 'weak',
        },
      ],
      reviewPlan: [
        {
          id: 'review-1',
          subject: 'Matematica',
          topic: 'Porcentagem',
          reviewStage: 1,
          scheduledFor: '2026-03-26T08:00:00.000Z',
          reason: 'Erro recorrente.',
        },
        {
          id: 'review-2',
          subject: 'Matematica',
          topic: 'Regra de 3',
          reviewStage: 1,
          scheduledFor: '2026-03-28T12:00:00.000Z',
          reason: 'Erro recorrente.',
        },
      ],
    };

    const input = buildMentorDecisionInput({
      userKey: 'mentor-review-pressure',
      examGoal: 'ENEM',
      preferredTrack: 'enem',
      userData,
      weeklyGoalMinutes: 300,
      daysToExam: 60,
      trigger: 'goal_below_70',
      memory: runtime.memory,
      runtime,
      adaptiveSnapshot,
      now,
    });

    const decision = mentorDecisionEngine.decide(input);

    expect(input.studyState.pendingReviews).toBe(2);
    expect(input.studyState.overdueReviews).toBe(1);
    expect(decision.classification.moment).toBe('review_pressure');
    expect(decision.classification.responseKind).toBe('review_intervention');
    expect(decision.actions[0].type).toBe('review_block');
  });

  it('mantem proximo passo claro quando a consistencia esta boa', () => {
    const now = new Date('2026-03-28T10:00:00.000Z');
    const userData = makeUserData(
      [
        {
          date: '2026-03-28T08:30:00.000Z',
          minutes: 35,
          points: 0,
          subject: 'Redacao',
          duration: 35,
        },
        {
          date: '2026-03-27T08:30:00.000Z',
          minutes: 45,
          points: 0,
          subject: 'Matematica',
          duration: 45,
        },
        {
          date: '2026-03-26T08:30:00.000Z',
          minutes: 50,
          points: 0,
          subject: 'Linguagens',
          duration: 50,
        },
      ],
      {
        domingo: { studied: false, minutes: 0 },
        segunda: { studied: true, minutes: 40 },
        terca: { studied: true, minutes: 45 },
        quarta: { studied: true, minutes: 50 },
        quinta: { studied: true, minutes: 35 },
        sexta: { studied: false, minutes: 0 },
        sabado: { studied: false, minutes: 0 },
      },
      5,
    );

    const runtime = buildMentorMemoryRuntime({
      userData,
      weeklyGoalMinutes: 180,
      daysToExam: 90,
      trigger: 'chat_opened',
      previousMemory: null,
    });

    const input = buildMentorDecisionInput({
      userKey: 'mentor-steady-progress',
      examGoal: 'ENEM',
      preferredTrack: 'enem',
      userData,
      weeklyGoalMinutes: 180,
      daysToExam: 90,
      trigger: 'chat_opened',
      memory: runtime.memory,
      runtime,
      adaptiveSnapshot: emptyAdaptiveSnapshot(),
      now,
    });

    const decision = mentorDecisionEngine.decide(input);

    expect(input.execution.todayMinutes).toBe(35);
    expect(input.execution.currentStreak).toBe(5);
    expect(decision.classification.moment).toBe('steady_progress');
    expect(decision.classification.responseKind).toBe('next_step');
    expect(decision.actions[0].durationMin).toBeGreaterThanOrEqual(20);
  });
});
