import { beforeEach, describe, expect, it } from 'vitest';
import type { AdaptiveSnapshot } from '../services/adaptiveLearning.service';
import { mentorBriefingService } from '../services/mentorBriefing.service';
import { buildMentorMemoryRuntime } from '../services/mentorMemory.service';
import { buildMentorDecisionInput } from '../features/mentor/context/buildMentorDecisionInput';
import { mentorDecisionEngine } from '../features/mentor/decision/mentorDecisionEngine';
import { buildMentorBriefingRequest } from '../features/mentor/generation/buildMentorBriefingRequest';
import { composeMentorFallbackReply } from '../features/mentor/generation/mentorFallbackComposer';
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

describe('mentor consumers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('gera briefing coerente para usuario zerado hoje em reta final', async () => {
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
      userKey: 'mentor-briefing-final',
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
    const request = buildMentorBriefingRequest({
      userKey: 'mentor-briefing-final',
      input,
      decision,
    });
    const result = await mentorBriefingService.getBriefing(request);

    expect(request.engineDecision.prioridadeAtual).toBe(decision.classification.primarySubject);
    expect(result.output.prioridade).toBe(decision.classification.primarySubject);
    expect(result.output.tom).toBe('reta_final');
    expect(result.output.acao_semana[0]).toBe(decision.actions[0].label);
  });

  it('usa a mesma classificacao no fallback quando ha revisao pendente', () => {
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
      userKey: 'mentor-fallback-review',
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
    const reply = composeMentorFallbackReply({
      text: 'o que revisar hoje?',
      input,
      decision,
    });

    expect(decision.classification.moment).toBe('review_pressure');
    expect(reply).toContain(decision.summary);
    expect(reply).toContain(decision.actions[0].label);
  });

  it('mantem consistencia entre classificacao e briefing no ritmo estavel', async () => {
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
      ],
      {
        domingo: { studied: false, minutes: 0 },
        segunda: { studied: true, minutes: 40 },
        terca: { studied: true, minutes: 45 },
        quarta: { studied: true, minutes: 35 },
        quinta: { studied: false, minutes: 0 },
        sexta: { studied: false, minutes: 0 },
        sabado: { studied: false, minutes: 0 },
      },
      4,
    );

    const runtime = buildMentorMemoryRuntime({
      userData,
      weeklyGoalMinutes: 100,
      daysToExam: 90,
      trigger: 'chat_opened',
      previousMemory: null,
    });

    const input = buildMentorDecisionInput({
      userKey: 'mentor-briefing-steady',
      examGoal: 'ENEM',
      preferredTrack: 'enem',
      userData,
      weeklyGoalMinutes: 100,
      daysToExam: 90,
      trigger: 'chat_opened',
      memory: runtime.memory,
      runtime,
      adaptiveSnapshot: emptyAdaptiveSnapshot(),
      now,
    });

    const decision = mentorDecisionEngine.decide(input);
    const request = buildMentorBriefingRequest({
      userKey: 'mentor-briefing-steady',
      input,
      decision,
    });
    const result = await mentorBriefingService.getBriefing(request);

    expect(decision.classification.moment).toBe('steady_progress');
    expect(request.weakPoints[0]).toBe(decision.classification.primarySubject);
    expect(result.output.prioridade).toBe(decision.classification.primarySubject);
    expect(result.output.acao_semana.every((action) => request.engineDecision.acoesSemana.includes(action))).toBe(true);
  });
});
