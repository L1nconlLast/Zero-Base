import { beforeEach, describe, expect, it } from 'vitest';
import type { AdaptiveSnapshot } from '../services/adaptiveLearning.service';
import { applyMentorWriteBackToMemory, buildMentorMemoryRuntime } from '../services/mentorMemory.service';
import { buildMentorDecisionInput } from '../features/mentor/context/buildMentorDecisionInput';
import { mentorDecisionEngine } from '../features/mentor/decision/mentorDecisionEngine';
import { buildMentorChatPayload } from '../features/mentor/generation/buildMentorChatPayload';
import { buildMentorMemoryWriteBack } from '../features/mentor/generation/buildMentorMemoryWriteBack';
import type { UserData } from '../types';

const makeUserData = (
  sessions: UserData['studyHistory'],
  weekProgress: UserData['weekProgress'],
  currentStreak = 0,
): UserData => ({
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

describe('mentor chat and write-back', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('monta payload de chat com o mesmo snapshot da decisao', () => {
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
      ],
      {
        domingo: { studied: false, minutes: 0 },
        segunda: { studied: true, minutes: 25 },
        terca: { studied: false, minutes: 0 },
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
      daysToExam: 12,
      trigger: 'chat_opened',
      previousMemory: null,
    });

    const input = buildMentorDecisionInput({
      userKey: 'mentor-chat-final',
      examGoal: 'ENEM',
      examDate: '2026-04-09',
      preferredTrack: 'enem',
      userData,
      weeklyGoalMinutes: 300,
      daysToExam: 12,
      trigger: 'chat_opened',
      memory: runtime.memory,
      runtime,
      adaptiveSnapshot: emptyAdaptiveSnapshot(),
      now,
    });

    const decision = mentorDecisionEngine.decide(input);
    const payload = buildMentorChatPayload({
      message: 'o que fazer hoje?',
      history: [],
      userName: 'Lina',
      input,
      decision,
      previousFocus: runtime.memory.previousFocus,
    });

    expect(payload.studentContext.userName).toBe('Lina');
    expect(payload.studentContext.todayMinutes).toBe(0);
    expect(payload.studentContext.examName).toBe('ENEM');
    expect(payload.decisionContext.moment).toBe('final_sprint');
    expect(payload.decisionContext.summary).toBe(decision.summary);
    expect(payload.decisionContext.response.nextStep).toBe(decision.response.nextStep);
    expect(payload.decisionContext.response.whyNow).toBe(decision.response.whyNow);
    expect(payload.decisionContext.actions[0]?.label).toBe(decision.actions[0]?.label);
  });

  it('aplica write-back estruturado sem duplicar fatos por chave', () => {
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
      ],
      {
        domingo: { studied: false, minutes: 0 },
        segunda: { studied: true, minutes: 15 },
        terca: { studied: false, minutes: 0 },
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
      ],
    };

    const input = buildMentorDecisionInput({
      userKey: 'mentor-writeback-review',
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
    const writeBack = buildMentorMemoryWriteBack(input, decision);
    const once = applyMentorWriteBackToMemory(runtime.memory, writeBack);
    const twice = applyMentorWriteBackToMemory(once, writeBack);
    const factKeys = twice.facts?.map((fact) => fact.key) || [];

    expect(twice.lastDecisionSummary).toBe(decision.summary);
    expect(twice.currentRisk?.level).toBe(decision.classification.risk.level);
    expect(twice.lastRecommendations[0]).toBe(decision.response.nextStep);
    expect(factKeys.filter((key) => key === 'focus_of_week')).toHaveLength(1);
    expect(factKeys.filter((key) => key === 'last_recommendation')).toHaveLength(1);
    expect(factKeys.filter((key) => key === 'current_risk')).toHaveLength(1);
  });
});
