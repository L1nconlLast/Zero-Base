const makeWeekProgress = () => ({
  domingo: { studied: false, minutes: 0 },
  segunda: { studied: false, minutes: 0 },
  terca: { studied: false, minutes: 0 },
  quarta: { studied: false, minutes: 0 },
  quinta: { studied: false, minutes: 0 },
  sexta: { studied: false, minutes: 0 },
  sabado: { studied: false, minutes: 0 },
});

const missionTemplates = [
  {
    focus: 'Primeiro movimento',
    tasks: [
      { discipline: 'Matematica', topic: 'Porcentagem' },
      { discipline: 'Linguagens', topic: 'Interpretacao de texto' },
      { discipline: 'Humanas', topic: 'Brasil Colonia' },
    ],
    target: 'questoes',
  },
  {
    focus: 'Ganho de ritmo',
    tasks: [
      { discipline: 'Matematica', topic: 'Regra de 3' },
      { discipline: 'Linguagens', topic: 'Figuras de linguagem' },
      { discipline: 'Humanas', topic: 'Brasil Imperio' },
    ],
    target: 'questoes',
  },
  {
    focus: 'Base de resolucao',
    tasks: [
      { discipline: 'Matematica', topic: 'Equacao de 1 grau' },
      { discipline: 'Linguagens', topic: 'Classes gramaticais' },
      { discipline: 'Humanas', topic: 'Republica Velha' },
    ],
    target: 'questoes',
  },
  {
    focus: 'Consistencia',
    tasks: [
      { discipline: 'Matematica', topic: 'Fracoes' },
      { discipline: 'Linguagens', topic: 'Concordancia' },
      { discipline: 'Humanas', topic: 'Era Vargas' },
    ],
    target: 'questoes',
  },
  {
    focus: 'Ajuste fino',
    tasks: [
      { discipline: 'Matematica', topic: 'Razao e proporcao' },
      { discipline: 'Linguagens', topic: 'Coesao e coerencia' },
      { discipline: 'Humanas', topic: 'Ditadura militar' },
    ],
    target: 'questoes',
  },
  {
    focus: 'Revisao guiada',
    tasks: [
      { discipline: 'Matematica', topic: 'Erros da semana' },
      { discipline: 'Linguagens', topic: 'Erros da semana' },
      { discipline: 'Humanas', topic: 'Erros da semana' },
    ],
    target: 'questoes',
  },
  {
    focus: 'Simulado leve',
    tasks: [
      { discipline: 'Matematica', topic: 'Bloco misto' },
      { discipline: 'Linguagens', topic: 'Bloco misto' },
      { discipline: 'Humanas', topic: 'Bloco misto' },
    ],
    target: 'simulado',
  },
] as const;

const buildPlan = (readyDay = 1, completedDays = 0) => ({
  track: 'enem',
  generatedAt: new Date().toISOString(),
  focusAreas: ['Matematica', 'Linguagens', 'Humanas'],
  missions: missionTemplates.map((template, index) => {
    const dayNumber = index + 1;
    const isCompleted = dayNumber <= completedDays;
    const isReady = !isCompleted && dayNumber === readyDay;

    return {
      id: `enem-day-${dayNumber}`,
      dayNumber,
      dayLabel: `Dia ${dayNumber}`,
      focus: template.focus,
      tasks: [...template.tasks],
      studyMinutes: dayNumber <= 2 ? 15 : 25,
      questionCount: dayNumber === 6 ? 20 : dayNumber === 7 ? 30 : 10,
      reviewMinutes: dayNumber === 7 ? 0 : 5,
      target: template.target,
      status: isCompleted ? 'completed' : isReady ? 'ready' : 'locked',
      completedAt: isCompleted ? new Date(Date.now() - (completedDays - dayNumber) * 86400000).toISOString() : null,
    };
  }),
});

const buildUserData = (sessions: Array<{ date: string; minutes: number; points: number; subject: string; duration: number }> = []) => ({
  weekProgress: makeWeekProgress(),
  completedTopics: {},
  totalPoints: sessions.reduce((sum, session) => sum + session.points, 0),
  streak: 0,
  bestStreak: 0,
  achievements: [],
  level: sessions.length > 0 ? 2 : 1,
  studyHistory: sessions,
  dailyGoal: 90,
  sessions,
  currentStreak: 0,
});

const buildAnalyticsEvents = () => {
  const now = new Date();
  const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

  return [
    { name: 'onboarding_completed', timestamp: iso(5), userEmail: 'qa-data@local.test', payload: { focus: 'enem' } },
    { name: 'beginner_mission_viewed', timestamp: iso(5), userEmail: 'qa-data@local.test', payload: { day: 1 } },
    { name: 'beginner_session_started', timestamp: iso(5), userEmail: 'qa-data@local.test', payload: { day: 1 } },
    { name: 'beginner_session_completed', timestamp: iso(5), userEmail: 'qa-data@local.test', payload: { day: 1, duration: 15 } },
    { name: 'beginner_questions_started', timestamp: iso(5), userEmail: 'qa-data@local.test', payload: { day: 1 } },
    { name: 'beginner_questions_completed', timestamp: iso(5), userEmail: 'qa-data@local.test', payload: { day: 1 } },
    { name: 'beginner_week_summary_viewed', timestamp: iso(4), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'beginner_week_summary_completed', timestamp: iso(4), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'beginner_blocked_feature_clicked', timestamp: iso(4), userEmail: 'qa-data@local.test', payload: { tabId: 'dashboard' } },
    { name: 'intermediate_home_viewed', timestamp: iso(3), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'intermediate_plan_viewed', timestamp: iso(3), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'intermediate_continue_automatic_clicked', timestamp: iso(3), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'intermediate_recommended_tool_used', timestamp: iso(3), userEmail: 'qa-data@local.test', payload: { tool: 'questoes' } },
    { name: 'intermediate_day_plan_completed', timestamp: iso(3), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'intermediate_returned_next_day', timestamp: iso(2), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'advanced_home_viewed', timestamp: iso(2), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'advanced_plan_built', timestamp: iso(2), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'advanced_strategy_review_viewed', timestamp: iso(2), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'advanced_strategy_review_applied', timestamp: iso(1), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'advanced_mock_exam_started', timestamp: iso(1), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'advanced_mock_exam_completed', timestamp: iso(1), userEmail: 'qa-data@local.test', payload: {} },
  ];
};

type SeedOptions = {
  email: string;
  name?: string;
  onboardingCompleted?: boolean;
  beginnerState?: string | null;
  beginnerPlan?: Record<string, unknown> | null;
  beginnerStats?: Record<string, unknown> | null;
  userData?: Record<string, unknown>;
  analyticsEvents?: Array<Record<string, unknown>>;
  phaseOverride?: 'beginner' | 'intermediate' | 'advanced' | null;
  adminMode?: boolean;
  internalAccess?: boolean;
};

const seedAppState = (win: Window, options: SeedOptions) => {
  const {
    email,
    name = 'QA Produto',
    onboardingCompleted = true,
    beginnerState = null,
    beginnerPlan = null,
    beginnerStats = null,
    userData = buildUserData(),
    analyticsEvents = [],
    phaseOverride = null,
    adminMode = false,
    internalAccess = false,
  } = options;

  const scope = email.toLowerCase();

  win.localStorage.clear();
  win.localStorage.setItem(
    'zeroBaseSession',
    JSON.stringify({
      user: {
        nome: name,
        email,
        dataCadastro: new Date().toISOString(),
        foto: 'QA',
        examGoal: 'ENEM',
        examDate: '',
        preferredTrack: 'enem',
      },
      userId: `local:${scope}`,
    }),
  );
  win.localStorage.setItem(`zeroBaseData_${scope}`, JSON.stringify(userData));
  win.localStorage.setItem(`profileDisplayName_${scope}`, name);
  win.localStorage.setItem(`preferredStudyTrack_${scope}`, 'enem');
  win.localStorage.setItem(`selectedStudyMethodId_${scope}`, 'pomodoro');
  win.localStorage.setItem(`plannedFocusDuration_${scope}`, '15');
  win.localStorage.setItem(`activeStudyMode_${scope}`, 'pomodoro');

  if (onboardingCompleted) {
    win.localStorage.setItem(`mdzOnboardingCompleted_${email}`, 'true');
  }

  if (beginnerState) {
    win.localStorage.setItem(`beginnerState_${scope}`, JSON.stringify(beginnerState));
  }

  if (beginnerPlan) {
    win.localStorage.setItem(`beginnerPlan_${scope}`, JSON.stringify(beginnerPlan));
  }

  if (beginnerStats) {
    win.localStorage.setItem(`beginnerStats_${scope}`, JSON.stringify(beginnerStats));
  }

  if (analyticsEvents.length > 0) {
    win.localStorage.setItem('mdz_analytics_events', JSON.stringify(analyticsEvents));
  }

  if (phaseOverride) {
    win.localStorage.setItem('zb_phase_override', JSON.stringify(phaseOverride));
  }

  if (adminMode) {
    win.localStorage.setItem('zb_admin_mode', 'true');
  }

  if (internalAccess) {
    win.localStorage.setItem('zb_internal_access', 'true');
  }
};

const visitSeeded = (options: SeedOptions, path = '/') => {
  cy.visit(path, {
    onBeforeLoad(win) {
      seedAppState(win, options);
    },
  });
};

describe('QA de produto - fases e fluxo principal', () => {
  it('onboarding -> primeira missao -> estudo -> questoes', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        seedAppState(win, {
          email: 'qa-onboarding@local.test',
          onboardingCompleted: false,
          userData: buildUserData(),
        });
      },
    });

    cy.contains(/modo iniciante/i).should('be.visible');
    cy.contains('button', /^Continuar$/).click();
    cy.contains('button', /30 min por dia/i).click();
    cy.contains('button', /Liberar minha 1a missao/i).click();

    cy.contains(/primeiro movimento/i).should('be.visible');
    cy.contains(/dia 1/i).should('be.visible');
    cy.screenshot('qa-01-onboarding-primeira-missao');

    cy.contains('button', /Comecar agora/i).click();
    cy.contains(/sessao de foco/i).should('be.visible');
    cy.contains(/valide o que voce acabou de estudar/i).should('be.visible');

    cy.contains('button', /Validar com questoes/i).click();
    cy.contains(/Banco de Quest/i).should('be.visible');
    cy.contains(/Matem/i).should('be.visible');
    cy.contains('button', /Iniciar Quiz/i).should('be.visible');
    cy.screenshot('qa-02-estudo-questoes');
  });

  it('modo interno troca fases e reseta sem contaminar o fluxo real', () => {
    const beginnerPlan = buildPlan(1, 0);
    const beginnerStats = {
      startedAt: new Date().toISOString(),
      onboardingCompletedAt: new Date().toISOString(),
      focus: 'enem',
      timeAvailable: 30,
      lastActiveAt: new Date().toISOString(),
      lastReturnTrackedDate: null,
      sessionsStarted: 1,
      sessionsCompleted: 1,
      activeDates: [new Date().toISOString().slice(0, 10)],
      streak: 1,
      returnedNextDayCount: 0,
      totalQuestions: 10,
      totalCorrect: 6,
      accuracyAvg: 0.6,
      assessments: [],
      lastDropPoint: null,
      progressStage: 'early_beginner',
      promotedAt: null,
      weekSummarySeenAt: null,
    };

    visitSeeded({
      email: 'qa-phase@local.test',
      beginnerState: 'ready_for_first_session',
      beginnerPlan,
      beginnerStats,
      onboardingCompleted: true,
      userData: buildUserData(),
    }, '/?internal=1');

    cy.contains(/modo interno/i).should('be.visible');

    cy.contains('button', /^Intermediario$/).click();
    cy.contains(/AUTONOMIA GUIADA/i).should('be.visible');
    cy.contains(/Continuar automatico/i).should('be.visible');
    cy.screenshot('qa-03-fase-intermediario');

    cy.contains('button', /^Avancado$/).click();
    cy.contains(/Sua estrategia/i).should('be.visible');
    cy.contains(/Hoje e dia|Recuperar ritmo|Voltar ao plano central/i).should('be.visible');
    cy.screenshot('qa-04-fase-avancado');

    cy.contains('button', /Resetar modo interno/i).click();
    cy.contains(/primeiro movimento/i).should('be.visible');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('zb_phase_override')).to.equal(null);
      expect(win.localStorage.getItem('zb_admin_mode')).to.equal(null);
      expect(win.localStorage.getItem('zb_internal_access')).to.equal(null);
    });
    cy.screenshot('qa-05-reset-modo-interno');
  });

  it('iniciante mostra bloqueios e week summary quando a semana foi concluida', () => {
    const beginnerPlanLocked = buildPlan(1, 0);
    const beginnerStatsLocked = {
      startedAt: new Date().toISOString(),
      onboardingCompletedAt: new Date().toISOString(),
      focus: 'enem',
      timeAvailable: 30,
      lastActiveAt: new Date().toISOString(),
      lastReturnTrackedDate: null,
      sessionsStarted: 1,
      sessionsCompleted: 1,
      activeDates: [new Date().toISOString().slice(0, 10)],
      streak: 1,
      returnedNextDayCount: 0,
      totalQuestions: 10,
      totalCorrect: 5,
      accuracyAvg: 0.5,
      assessments: [],
      lastDropPoint: null,
      progressStage: 'early_beginner',
      promotedAt: null,
      weekSummarySeenAt: null,
    };

    visitSeeded({
      email: 'qa-beginner-lock@local.test',
      beginnerState: 'ready_for_first_session',
      beginnerPlan: beginnerPlanLocked,
      beginnerStats: beginnerStatsLocked,
      onboardingCompleted: true,
      userData: buildUserData(),
    });

    cy.contains('button', /^Dados$/).click();
    cy.contains(/entra logo depois que voce ganhar ritmo/i).should('be.visible');
    cy.screenshot('qa-06-bloqueio-iniciante');

    const completedPlan = buildPlan(7, 7);
    const today = new Date();
    const sessionDates = [0, 1, 2].map((daysAgo) => {
      const date = new Date(today.getTime() - daysAgo * 86400000).toISOString();
      return {
        date,
        minutes: 25,
        points: 250,
        subject: 'Anatomia',
        duration: 25,
      };
    });

    const beginnerStatsWeek = {
      startedAt: new Date(today.getTime() - 6 * 86400000).toISOString(),
      onboardingCompletedAt: new Date(today.getTime() - 6 * 86400000).toISOString(),
      focus: 'enem',
      timeAvailable: 30,
      lastActiveAt: today.toISOString(),
      lastReturnTrackedDate: null,
      sessionsStarted: 3,
      sessionsCompleted: 3,
      activeDates: sessionDates.map((session) => session.date.slice(0, 10)).reverse(),
      streak: 3,
      returnedNextDayCount: 1,
      totalQuestions: 30,
      totalCorrect: 22,
      accuracyAvg: 22 / 30,
      assessments: [
        {
          at: sessionDates[2].date,
          day: 1,
          missionId: 'enem-day-1',
          subject: 'Matematica',
          correct: 8,
          total: 10,
          accuracy: 0.8,
          xpGained: 80,
        },
        {
          at: sessionDates[1].date,
          day: 2,
          missionId: 'enem-day-2',
          subject: 'Linguagens',
          correct: 7,
          total: 10,
          accuracy: 0.7,
          xpGained: 70,
        },
        {
          at: sessionDates[0].date,
          day: 3,
          missionId: 'enem-day-3',
          subject: 'Humanas',
          correct: 7,
          total: 10,
          accuracy: 0.7,
          xpGained: 70,
        },
      ],
      lastDropPoint: null,
      progressStage: 'ready_for_intermediate',
      promotedAt: today.toISOString(),
      weekSummarySeenAt: null,
    };

    visitSeeded({
      email: 'qa-week-summary@local.test',
      beginnerState: 'week_complete',
      beginnerPlan: completedPlan,
      beginnerStats: beginnerStatsWeek,
      onboardingCompleted: true,
      userData: buildUserData(sessionDates),
    });

    cy.contains(/Resumo da primeira semana/i).should('be.visible');
    cy.contains(/Voce completou sua primeira semana/i).should('be.visible');
    cy.contains(/Continuar guiado/i).should('be.visible');
    cy.screenshot('qa-07-week-summary');
  });

  it('data management carrega snapshots, prioridades e scorecards', () => {
    const beginnerPlan = buildPlan(2, 1);
    const beginnerStats = {
      startedAt: new Date().toISOString(),
      onboardingCompletedAt: new Date().toISOString(),
      focus: 'enem',
      timeAvailable: 60,
      lastActiveAt: new Date().toISOString(),
      lastReturnTrackedDate: null,
      sessionsStarted: 2,
      sessionsCompleted: 2,
      activeDates: [new Date().toISOString().slice(0, 10)],
      streak: 1,
      returnedNextDayCount: 0,
      totalQuestions: 15,
      totalCorrect: 10,
      accuracyAvg: 10 / 15,
      assessments: [],
      lastDropPoint: null,
      progressStage: 'engaged_beginner',
      promotedAt: null,
      weekSummarySeenAt: null,
    };

    visitSeeded({
      email: 'qa-data@local.test',
      beginnerState: 'day_2',
      beginnerPlan,
      beginnerStats,
      onboardingCompleted: true,
      analyticsEvents: buildAnalyticsEvents(),
      adminMode: true,
      internalAccess: true,
      userData: buildUserData(),
    }, '/?internal=1');

    cy.contains('button', /^Dados$/).click();
    cy.contains(/Central de operacao/i).should('be.visible');
    cy.contains(/Prioridade do Produto \(Geral\)/i).should('be.visible');
    cy.contains(/Top 3 para corrigir esta semana/i).should('be.visible');
    cy.contains(/Scorecard semanal/i).should('be.visible');
    cy.contains(/Prioridade do intermediario/i).should('be.visible');
    cy.contains(/Scorecard semanal do avancado/i).should('be.visible');
    cy.screenshot('qa-08-data-management');
  });
});
