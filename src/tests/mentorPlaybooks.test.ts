import { beforeEach, describe, expect, it } from 'vitest';
import type { AdaptiveSnapshot } from '../services/adaptiveLearning.service';
import { buildMentorMemoryRuntime } from '../services/mentorMemory.service';
import { buildMentorDecisionInput } from '../features/mentor/context/buildMentorDecisionInput';
import { mentorDecisionEngine } from '../features/mentor/decision/mentorDecisionEngine';
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

const buildDecision = ({
  userKey,
  userData,
  weeklyGoalMinutes,
  daysToExam,
  trigger,
  adaptiveSnapshot,
  examGoal = 'ENEM',
  preferredTrack = 'enem' as const,
  now = new Date('2026-03-29T10:00:00.000Z'),
}: {
  userKey: string;
  userData: UserData;
  weeklyGoalMinutes: number;
  daysToExam: number;
  trigger: 'weekly_start' | 'inactivity_48h' | 'goal_below_70' | 'chat_opened' | 'final_30_days';
  adaptiveSnapshot?: AdaptiveSnapshot;
  examGoal?: string;
  preferredTrack?: 'enem' | 'concursos' | 'hibrido';
  now?: Date;
}) => {
  const runtime = buildMentorMemoryRuntime({
    userData,
    weeklyGoalMinutes,
    daysToExam,
    trigger,
    previousMemory: null,
    now,
  });

  const input = buildMentorDecisionInput({
    userKey,
    examGoal,
    preferredTrack,
    userData,
    weeklyGoalMinutes,
    daysToExam,
    trigger,
    memory: runtime.memory,
    runtime,
    adaptiveSnapshot: adaptiveSnapshot || emptyAdaptiveSnapshot(),
    now,
  });

  return {
    input,
    decision: mentorDecisionEngine.decide(input),
  };
};

describe('mentor playbooks', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('usa playbook de reta final com dia zerado', () => {
    const { decision } = buildDecision({
      userKey: 'playbook-final-sprint',
      weeklyGoalMinutes: 300,
      daysToExam: 14,
      trigger: 'chat_opened',
      userData: makeUserData(
        [
          {
            date: '2026-03-27T10:00:00.000Z',
            minutes: 25,
            points: 0,
            subject: 'Matematica',
            duration: 25,
          },
          {
            date: '2026-03-26T10:00:00.000Z',
            minutes: 35,
            points: 0,
            subject: 'Linguagens',
            duration: 35,
          },
        ],
        {
          domingo: { studied: false, minutes: 0 },
          segunda: { studied: true, minutes: 25 },
          terca: { studied: true, minutes: 35 },
          quarta: { studied: false, minutes: 0 },
          quinta: { studied: false, minutes: 0 },
          sexta: { studied: false, minutes: 0 },
          sabado: { studied: false, minutes: 0 },
        },
        1,
      ),
    });

    expect(decision.playbookId).toBe('final_sprint_zeroed');
    expect(decision.response.type).toBe('next_step');
    expect(decision.response.nextStep).toContain('Revisar');
    expect(decision.response.caution).toContain('revisao');
  });

  it('usa playbook de revisao atrasada com semana fraca', () => {
    const { decision } = buildDecision({
      userKey: 'playbook-review-pressure',
      weeklyGoalMinutes: 300,
      daysToExam: 60,
      trigger: 'goal_below_70',
      adaptiveSnapshot: {
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
      },
      userData: makeUserData(
        [
          {
            date: '2026-03-28T09:00:00.000Z',
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
      ),
    });

    expect(decision.playbookId).toBe('review_backlog_recovery');
    expect(decision.response.type).toBe('review_alert');
    expect(decision.response.nextStep).toContain('Quitar revisao prioritaria');
    expect(decision.response.whyNow).toContain('backlog');
  });

  it('usa playbook de ritmo estavel sem alarmismo', () => {
    const { decision } = buildDecision({
      userKey: 'playbook-steady',
      weeklyGoalMinutes: 180,
      daysToExam: 90,
      trigger: 'chat_opened',
      userData: makeUserData(
        [
          {
            date: '2026-03-29T08:30:00.000Z',
            minutes: 35,
            points: 0,
            subject: 'Redacao',
            duration: 35,
          },
          {
            date: '2026-03-28T08:30:00.000Z',
            minutes: 45,
            points: 0,
            subject: 'Matematica',
            duration: 45,
          },
          {
            date: '2026-03-27T08:30:00.000Z',
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
      ),
    });

    expect(decision.playbookId).toBe('steady_progress_clear');
    expect(decision.response.tone).toBe('supportive');
    expect(decision.response.whyNow).toContain('ritmo');
    expect(decision.response.caution.toLowerCase()).not.toContain('critico');
  });

  it('usa playbook de mudanca de foco quando ha materia dominante demais', () => {
    const { input, decision } = buildDecision({
      userKey: 'playbook-focus-shift',
      weeklyGoalMinutes: 240,
      daysToExam: 80,
      trigger: 'chat_opened',
      userData: makeUserData(
        [
          {
            date: '2026-03-29T08:00:00.000Z',
            minutes: 60,
            points: 0,
            subject: 'Matematica',
            duration: 60,
          },
          {
            date: '2026-03-28T08:00:00.000Z',
            minutes: 50,
            points: 0,
            subject: 'Matematica',
            duration: 50,
          },
          {
            date: '2026-03-27T08:00:00.000Z',
            minutes: 45,
            points: 0,
            subject: 'Matematica',
            duration: 45,
          },
          {
            date: '2026-03-26T08:00:00.000Z',
            minutes: 15,
            points: 0,
            subject: 'Redacao',
            duration: 15,
          },
          {
            date: '2026-03-25T08:00:00.000Z',
            minutes: 10,
            points: 0,
            subject: 'Linguagens',
            duration: 10,
          },
        ],
        {
          domingo: { studied: false, minutes: 0 },
          segunda: { studied: true, minutes: 45 },
          terca: { studied: true, minutes: 50 },
          quarta: { studied: true, minutes: 15 },
          quinta: { studied: true, minutes: 10 },
          sexta: { studied: true, minutes: 60 },
          sabado: { studied: false, minutes: 0 },
        },
        2,
      ),
    });

    expect(input.studyState.dominantSubjectSharePct).toBeGreaterThanOrEqual(55);
    expect(decision.playbookId).toBe('subject_imbalance_shift');
    expect(decision.response.type).toBe('focus_shift');
    expect(decision.response.nextStep).toContain('Virar o proximo bloco');
  });

  it('usa playbook de retomada apos quebra de ritmo', () => {
    const { decision } = buildDecision({
      userKey: 'playbook-restart',
      weeklyGoalMinutes: 300,
      daysToExam: 75,
      trigger: 'goal_below_70',
      userData: makeUserData(
        [
          {
            date: '2026-03-27T08:00:00.000Z',
            minutes: 20,
            points: 0,
            subject: 'Matematica',
            duration: 20,
          },
          {
            date: '2026-03-25T08:00:00.000Z',
            minutes: 15,
            points: 0,
            subject: 'Linguagens',
            duration: 15,
          },
        ],
        {
          domingo: { studied: false, minutes: 0 },
          segunda: { studied: true, minutes: 20 },
          terca: { studied: false, minutes: 0 },
          quarta: { studied: true, minutes: 15 },
          quinta: { studied: false, minutes: 0 },
          sexta: { studied: false, minutes: 0 },
          sabado: { studied: false, minutes: 0 },
        },
        0,
      ),
    });

    expect(decision.playbookId).toBe('restart_after_break');
    expect(decision.response.type).toBe('recovery');
    expect(decision.response.nextStep).toContain('20 min');
    expect(decision.response.caution).toContain('bloco');
  });

  it('usa playbook de direcao quando o aluno nao sabe por onde comecar', () => {
    const { decision } = buildDecision({
      userKey: 'playbook-direction-reset',
      weeklyGoalMinutes: 300,
      daysToExam: 120,
      trigger: 'chat_opened',
      now: new Date('2026-03-29T10:00:00.000Z'),
      userData: makeUserData(
        [
          {
            date: '2026-03-10T08:00:00.000Z',
            minutes: 20,
            points: 0,
            subject: 'Historia',
            duration: 20,
          },
        ],
        {
          domingo: { studied: false, minutes: 0 },
          segunda: { studied: false, minutes: 0 },
          terca: { studied: false, minutes: 0 },
          quarta: { studied: false, minutes: 0 },
          quinta: { studied: false, minutes: 0 },
          sexta: { studied: false, minutes: 0 },
          sabado: { studied: false, minutes: 0 },
        },
        0,
      ),
    });

    expect(decision.playbookId).toBe('lost_starting_point');
    expect(decision.response.type).toBe('direction_reset');
    expect(decision.response.tone).toBe('supportive');
    expect(decision.response.nextStep).toContain('15 min');
  });
});
