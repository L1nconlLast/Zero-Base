import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildOutrosOverviewSnapshot,
  buildOutrosRhythmSnapshot,
  type OutrosRankSnapshot,
} from '../services/outrosDashboard.service';

const baseRank = (): OutrosRankSnapshot => ({
  studyContextId: 'ctx-outros-1',
  scopeMode: 'outros',
  scopeTopicIds: ['topic-js', 'topic-en'],
  streakCurrent: 3,
  streakBest: 5,
  totalMinutes: 120,
  totalHoursLabel: '2,0h',
  completedSessions: 4,
  processedReviews: 2,
  weeklyMinutes: 95,
  weeklyTargetMinutes: 250,
  activeDaysLast7: 3,
  activeDaysHistory: 4,
  paceStatus: 'abaixo',
  pendingReviewsCount: 1,
  nextReviewDueAt: '2026-03-31T18:00:00.000-03:00',
  lastSessionCompletedAt: '2026-03-31T10:40:00.000-03:00',
});

describe('outros dashboard rhythm snapshot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-31T12:00:00.000-03:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mantem distribuicao por foco e ignora rotulo legado de materia na recomendacao', () => {
    const result = buildOutrosRhythmSnapshot({
      rank: baseRank(),
      dailyMinutes: 50,
      studySessions: [
        {
          id: 'session-1',
          date: '2026-03-31T10:00:00.000-03:00',
          minutes: 40,
          status: 'finished',
          subject: 'Humanas',
          session_type: 'praticar',
          created_at: '2026-03-31T10:00:00.000-03:00',
          completed_at: '2026-03-31T10:40:00.000-03:00',
          learning_topic_id: 'topic-js',
          context_mode: 'outros',
        },
        {
          id: 'session-2',
          date: '2026-03-30T09:00:00.000-03:00',
          minutes: 35,
          status: 'finished',
          subject: 'Natureza',
          session_type: 'aprender',
          created_at: '2026-03-30T09:00:00.000-03:00',
          completed_at: '2026-03-30T09:35:00.000-03:00',
          learning_topic_id: 'topic-en',
          context_mode: 'outros',
        },
        {
          id: 'session-3',
          date: '2026-03-27T19:00:00.000-03:00',
          minutes: 20,
          status: 'finished',
          subject: 'Linguagens',
          session_type: 'livre',
          created_at: '2026-03-27T19:00:00.000-03:00',
          completed_at: '2026-03-27T19:20:00.000-03:00',
          learning_topic_id: 'topic-js',
          context_mode: 'outros',
        },
        {
          id: 'session-4',
          date: '2026-03-23T08:00:00.000-03:00',
          minutes: 25,
          status: 'finished',
          subject: 'Redacao',
          session_type: 'livre',
          created_at: '2026-03-23T08:00:00.000-03:00',
          completed_at: '2026-03-23T08:25:00.000-03:00',
          learning_topic_id: 'topic-js',
          context_mode: 'outros',
        },
      ],
      reviewItems: [
        {
          id: 'review-1',
          scheduled_for: '2026-03-31T18:00:00.000-03:00',
          completed: false,
          review_type: 'topico',
          content_title: 'Revisar utilitarios',
          learning_topic_id: 'topic-js',
          context_mode: 'outros',
        },
      ],
      upcomingEvents: [],
      nextStep: {
        id: 'step-1',
        pathId: 'path-1',
        title: 'Aplicar generics no app',
        description: 'Subir um passo pratico da trilha.',
        stepOrder: 2,
        status: 'em_andamento',
      },
      activePath: {
        id: 'path-1',
        topicId: 'topic-js',
        title: 'Roadmap TS Real',
        progressPercent: 42,
        status: 'ativa',
      },
      topicNameById: new Map([
        ['topic-js', 'JavaScript pratico'],
        ['topic-en', 'Conversacao em ingles'],
      ]),
      activeTopicName: 'JavaScript pratico',
    });

    expect(result.todayMinutes).toBe(40);
    expect(result.weekMinutes).toBe(95);
    expect(result.previousWeekMinutes).toBe(25);
    expect(result.evolutionPercent).toBe(280);
    expect(result.distributionByFocus.map((entry) => entry.label)).toEqual([
      'JavaScript pratico',
      'Conversacao em ingles',
    ]);
    expect(result.distributionByFocus.map((entry) => entry.label)).not.toContain('Humanas');
    expect(result.distributionByFocus.map((entry) => entry.label)).not.toContain('Natureza');
    expect(result.dominantFocus).toMatchObject({
      label: 'JavaScript pratico',
      minutes: 60,
      sessions: 2,
    });
    expect(result.nextBestAction).toMatchObject({
      origin: 'review',
      title: 'Revisar utilitarios',
      type: 'Revisao',
    });
  });

  it('monta a visao geral como central de comando do foco atual', () => {
    const rank = {
      ...baseRank(),
      weeklyTargetMinutes: 0,
    };
    const rhythm = buildOutrosRhythmSnapshot({
      rank,
      dailyMinutes: 50,
      studySessions: [
        {
          id: 'session-1',
          date: '2026-03-31T10:00:00.000-03:00',
          minutes: 40,
          status: 'finished',
          subject: 'Humanas',
          session_type: 'praticar',
          created_at: '2026-03-31T10:00:00.000-03:00',
          completed_at: '2026-03-31T10:40:00.000-03:00',
          learning_topic_id: 'topic-js',
          context_mode: 'outros',
        },
      ],
      reviewItems: [
        {
          id: 'review-1',
          scheduled_for: '2026-03-31T18:00:00.000-03:00',
          completed: false,
          review_type: 'topico',
          content_title: 'Revisar utilitarios',
          learning_topic_id: 'topic-js',
          context_mode: 'outros',
        },
      ],
      upcomingEvents: [],
      nextStep: {
        id: 'step-1',
        pathId: 'path-1',
        title: 'Aplicar generics no app',
        description: 'Subir um passo pratico da trilha.',
        stepOrder: 2,
        status: 'em_andamento',
      },
      activePath: {
        id: 'path-1',
        topicId: 'topic-js',
        title: 'Roadmap TS Real',
        progressPercent: 42,
        status: 'ativa',
      },
      topicNameById: new Map([['topic-js', 'JavaScript pratico']]),
      activeTopicName: 'JavaScript pratico',
    });

    const overview = buildOutrosOverviewSnapshot({
      activeTopic: {
        id: 'topic-js',
        name: 'JavaScript pratico',
        category: 'Front-end',
        level: 'avancado',
        status: 'ativo',
      },
      activeGoal: {
        id: 'goal-1',
        topicId: 'topic-js',
        goalType: 'aprofundar',
        description: 'Aprofundar TypeScript com refatoracao real.',
        status: 'ativo',
      },
      activePath: {
        id: 'path-1',
        topicId: 'topic-js',
        title: 'Roadmap TS Real',
        progressPercent: 42,
        status: 'ativa',
      },
      nextStep: {
        id: 'step-1',
        pathId: 'path-1',
        title: 'Aplicar generics no app',
        description: 'Subir um passo pratico da trilha.',
        stepOrder: 2,
        status: 'em_andamento',
      },
      rank,
      rhythm,
      steps: [
        {
          id: 'step-0',
          pathId: 'path-1',
          title: 'Mapear tipos',
          description: null,
          stepOrder: 1,
          status: 'concluido',
        },
        {
          id: 'step-1',
          pathId: 'path-1',
          title: 'Aplicar generics no app',
          description: 'Subir um passo pratico da trilha.',
          stepOrder: 2,
          status: 'em_andamento',
        },
      ],
      recentSessions: [
        {
          id: 'session-1',
          topicName: 'JavaScript pratico',
          minutes: 40,
          happenedAt: '2026-03-31T10:40:00.000-03:00',
        },
      ],
      fallbackFocusTitle: 'JavaScript pratico',
      contextSummary: 'Transformar TypeScript em entrega concreta dentro do app.',
    });

    expect(overview.hero).toMatchObject({
      focusTitle: 'JavaScript pratico',
      stageLabel: 'Trilha em andamento',
    });
    expect(overview.nextAction).toMatchObject({
      title: 'Revisar utilitarios',
      ctaLabel: 'Comecar agora',
      ctaTarget: 'cronograma',
    });
    expect(overview.planState).toMatchObject({
      topicLabel: 'JavaScript pratico',
      pathLabel: 'Roadmap TS Real',
      progressPercent: 42,
    });
    expect(overview.weeklyRhythm).toMatchObject({
      weekMinutes: 40,
      paceStatusLabel: 'Abaixo do esperado',
    });
    expect(overview.alerts.map((alert) => alert.title)).toContain('Revisao vencendo');
    expect(overview.alerts.map((alert) => alert.title)).toContain('Semana sem meta');
    expect(overview.alerts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Tudo em movimento' }),
      ]),
    );
  });
});
