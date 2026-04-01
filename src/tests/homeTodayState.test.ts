import { describe, expect, it } from 'vitest';
import { buildHomeTodayState } from '../components/Home/homeTodayState';
import type { HomeReviewQueueState } from '../features/review';

const buildReviewState = (overrides: Partial<HomeReviewQueueState> = {}): HomeReviewQueueState => ({
  status: 'empty',
  dueTodayCount: 0,
  completedTodayCount: 0,
  upcomingCount: 0,
  totalPendingCount: 0,
  items: [],
  nextItem: null,
  ...overrides,
});

describe('buildHomeTodayState', () => {
  it('prioriza revisao vencida antes do estudo pronto', () => {
    const state = buildHomeTodayState({
      firstName: 'QA',
      isActivationHome: false,
      todayMinutes: 0,
      dailyGoalMinutes: 60,
      weeklyCompletedSessions: 1,
      weeklyPlannedSessions: 4,
      reviewQueueState: buildReviewState({
        status: 'pending_today',
        dueTodayCount: 2,
        totalPendingCount: 2,
        items: [{ id: 'review-1', title: 'Biologia - Citologia', when: 'Hoje', tag: '24h', featured: true }],
        nextItem: { id: 'review-1', title: 'Biologia - Citologia', when: 'Hoje', tag: '24h', featured: true },
      }),
      officialStudyCard: {
        status: 'ready',
        discipline: 'Biologia',
        topic: 'Citologia',
        estimatedDurationMinutes: 18,
        progressLabel: 'Revisao curta + pratica',
        ctaLabel: 'Comecar sessao',
      },
    });

    expect(state.priority).toBe('review');
    expect(state.phase).toBe('inicio');
    expect(state.isDone).toBe(false);
    expect(state.hero.title).toBe('Comece pelas revisoes do dia');
    expect(state.hero.primaryActionTarget).toBe('reviews');
    expect(state.primaryPanel.title).toBe('Revisar agora');
    expect(state.dayStatus.value).toBe('Revisao pronta');
  });

  it('mantem continuidade como acao principal quando nao ha revisao vencida', () => {
    const state = buildHomeTodayState({
      firstName: 'QA',
      isActivationHome: false,
      todayMinutes: 0,
      dailyGoalMinutes: 60,
      weeklyCompletedSessions: 0,
      weeklyPlannedSessions: 3,
      reviewQueueState: buildReviewState(),
      officialStudyCard: {
        status: 'ready',
        discipline: 'Matematica',
        topic: 'Porcentagem',
        estimatedDurationMinutes: 5,
        progressLabel: 'Faltam so 3 questoes para fechar o dia',
      },
      continuationMission: {
        subject: 'Matematica',
        topic: 'Porcentagem',
        questionsDone: 0,
        totalQuestions: 3,
        estimatedMinutesRemaining: 5,
      },
    });

    expect(state.priority).toBe('continue');
    expect(state.phase).toBe('inicio');
    expect(state.isDone).toBe(false);
    expect(state.hero.title).toBe('Hoje voce continua daqui');
    expect(state.hero.primaryActionTarget).toBe('study');
    expect(state.primaryPanel.title).toBe('Continuar agora');
    expect(state.dayStatus.value).toBe('Continuacao pronta');
  });

  it('cai para planejamento quando nao existe acao executavel pronta', () => {
    const state = buildHomeTodayState({
      firstName: 'QA',
      isActivationHome: false,
      todayMinutes: 0,
      dailyGoalMinutes: 60,
      weeklyCompletedSessions: 0,
      weeklyPlannedSessions: 3,
      reviewQueueState: buildReviewState(),
      officialStudyCard: {
        status: 'empty',
        title: 'Sem sessoes planejadas hoje',
        description: 'Abra o cronograma para definir o proximo passo.',
      },
    });

    expect(state.priority).toBe('plan');
    expect(state.phase).toBe('inicio');
    expect(state.isDone).toBe(false);
    expect(state.hero.primaryActionTarget).toBe('planning');
    expect(state.hero.title).toBe('Sem sessoes planejadas hoje');
    expect(state.dayStatus.value).toBe('Planejamento aberto');
  });

  it('marca revisao como em_andamento somente quando a propria fila ja foi iniciada', () => {
    const state = buildHomeTodayState({
      firstName: 'QA',
      isActivationHome: false,
      todayMinutes: 0,
      dailyGoalMinutes: 60,
      weeklyCompletedSessions: 1,
      weeklyPlannedSessions: 4,
      reviewQueueState: buildReviewState({
        status: 'pending_today',
        dueTodayCount: 1,
        completedTodayCount: 1,
        totalPendingCount: 2,
        items: [{ id: 'review-1', title: 'Biologia - Citologia', when: 'Hoje', tag: '24h', featured: true }],
        nextItem: { id: 'review-1', title: 'Biologia - Citologia', when: 'Hoje', tag: '24h', featured: true },
      }),
      officialStudyCard: {
        status: 'ready',
        discipline: 'Biologia',
        topic: 'Citologia',
        estimatedDurationMinutes: 18,
      },
    });

    expect(state.priority).toBe('review');
    expect(state.phase).toBe('em_andamento');
    expect(state.isDone).toBe(false);
    expect(state.hero.title).toBe('Continue pelas revisoes do dia');
    expect(state.dayStatus.value).toBe('Revisao em andamento');
  });

  it('nunca marca revisao como concluida quando ainda existem itens pendentes', () => {
    const state = buildHomeTodayState({
      firstName: 'QA',
      isActivationHome: false,
      todayMinutes: 42,
      dailyGoalMinutes: 60,
      weeklyCompletedSessions: 2,
      weeklyPlannedSessions: 4,
      reviewQueueState: buildReviewState({
        status: 'pending_today',
        dueTodayCount: 1,
        completedTodayCount: 2,
        totalPendingCount: 3,
        items: [{ id: 'review-1', title: 'Historia - Republica', when: 'Hoje', tag: '7d', featured: true }],
        nextItem: { id: 'review-1', title: 'Historia - Republica', when: 'Hoje', tag: '7d', featured: true },
      }),
      officialStudyCard: {
        status: 'ready',
        discipline: 'Historia',
        topic: 'Republica',
        estimatedDurationMinutes: 20,
      },
    });

    expect(state.priority).toBe('review');
    expect(state.phase).not.toBe('concluido');
    expect(state.dayStatus.value).toBe('Revisao em andamento');
  });

  it('nao usa progresso global do dia para marcar estudo como em_andamento', () => {
    const state = buildHomeTodayState({
      firstName: 'QA',
      isActivationHome: false,
      todayMinutes: 25,
      dailyGoalMinutes: 60,
      weeklyCompletedSessions: 2,
      weeklyPlannedSessions: 4,
      reviewQueueState: buildReviewState(),
      officialStudyCard: {
        status: 'ready',
        discipline: 'Biologia',
        topic: 'Citologia',
        estimatedDurationMinutes: 18,
        progressLabel: 'Revisao curta + pratica',
        ctaLabel: 'Estudar agora',
      },
    });

    expect(state.priority).toBe('study');
    expect(state.phase).toBe('inicio');
    expect(state.isDone).toBe(false);
    expect(state.dayStatus.value).toBe('Estudo pronto');
    expect(state.dayStatus.value).not.toBe('Estudo em andamento');
  });

  it('marca continuidade como em_andamento quando a propria missao ja avancou', () => {
    const state = buildHomeTodayState({
      firstName: 'QA',
      isActivationHome: false,
      todayMinutes: 0,
      dailyGoalMinutes: 60,
      weeklyCompletedSessions: 0,
      weeklyPlannedSessions: 3,
      reviewQueueState: buildReviewState(),
      officialStudyCard: {
        status: 'ready',
        discipline: 'Matematica',
        topic: 'Porcentagem',
        estimatedDurationMinutes: 5,
      },
      continuationMission: {
        subject: 'Matematica',
        topic: 'Porcentagem',
        questionsDone: 1,
        totalQuestions: 3,
        estimatedMinutesRemaining: 5,
      },
    });

    expect(state.priority).toBe('continue');
    expect(state.phase).toBe('em_andamento');
    expect(state.isDone).toBe(false);
    expect(state.hero.title).toBe('Voce ja retomou este bloco');
    expect(state.dayStatus.value).toBe('Continuacao em andamento');
  });
});
