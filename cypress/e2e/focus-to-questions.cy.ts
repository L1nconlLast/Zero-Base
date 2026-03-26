const createQaEmail = () => `focus_questions_${Date.now()}@local.test`;

const buildWeeklySchedule = (subjectLabels: string[]) => ({
  weekPlan: {
    monday: { subjectLabels: [] },
    tuesday: { subjectLabels: [] },
    wednesday: { subjectLabels: [] },
    thursday: { subjectLabels: [] },
    friday: { subjectLabels: subjectLabels },
    saturday: { subjectLabels: [] },
    sunday: { subjectLabels: [] },
  },
  availability: {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: true,
    saturday: false,
    sunday: false,
  },
  preferences: {
    defaultSessionDurationMinutes: 25,
    sessionsPerDay: 1,
  },
  updatedAt: new Date().toISOString(),
});

const seedFocusToQuestionsState = (
  win: Window,
  {
    email,
    targetQuestions = 10,
  }: {
    email: string;
    targetQuestions?: number;
  },
) => {
  const scope = email.toLowerCase();

  win.localStorage.clear();
  win.localStorage.setItem(
    'zeroBaseSession',
    JSON.stringify({
      user: {
        nome: 'QA Focus Questions',
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

  win.localStorage.setItem(
    `zeroBaseData_${scope}`,
    JSON.stringify({
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
    }),
  );

  win.localStorage.setItem(`mdzOnboardingCompleted_${email}`, 'true');
  win.localStorage.setItem(`profileDisplayName_${scope}`, JSON.stringify('QA Focus Questions'));
  win.localStorage.setItem(`preferredStudyTrack_${scope}`, JSON.stringify('enem'));
  win.localStorage.setItem(`selectedStudyMethodId_${scope}`, JSON.stringify('pomodoro'));
  win.localStorage.setItem(`plannedFocusDuration_${scope}`, JSON.stringify(25));
  win.localStorage.setItem(`activeStudyMode_${scope}`, JSON.stringify('livre'));
  win.localStorage.setItem(`hybridEnemWeight_${scope}`, JSON.stringify(70));
  win.localStorage.setItem(`weeklyGoalMinutes_${scope}`, JSON.stringify(900));
  win.localStorage.setItem(`academyCompletedContentIds_${scope}`, JSON.stringify([]));
  win.localStorage.setItem(`zb_internal_access`, JSON.stringify(true));
  win.localStorage.setItem(`zb_phase_override`, JSON.stringify('intermediate'));
  win.localStorage.setItem(
    `weeklyStudySchedule_${scope}`,
    JSON.stringify(buildWeeklySchedule(['Matematica'])),
  );
  win.localStorage.setItem(
    `studyExecutionState_${scope}`,
    JSON.stringify({
      currentBlock: {
        subject: 'Matematica',
        topicName: 'Porcentagem',
        objective: 'Executar o bloco principal do plano de hoje.',
        type: 'focus',
        duration: 25,
        targetQuestions,
      },
      recommendedMethodId: 'pomodoro',
      source: 'ai',
      updatedAt: new Date().toISOString(),
    }),
  );
};

describe('fluxo foco -> questões', () => {
  beforeEach(() => {
    const email = createQaEmail();

    cy.visit('/', {
      onBeforeLoad(win) {
        seedFocusToQuestionsState(win, { email, targetQuestions: 10 });
      },
    });

    cy.closeOptionalOverlays();
    cy.contains('button', /^Estudo$/i).click({ force: true });
  });

  it('completa foco e continua para questões', () => {
    cy.get('[data-testid="study-focus-container"]').should('be.visible');
    cy.get('[data-testid="study-focus-timer-ready"]').should('be.visible');

    cy.finishFocusSession();

    cy.contains('Sessão concluída').should('be.visible');
    cy.contains('button', /Validar agora/i).click();

    cy.contains('Preparando suas questões...').should('be.visible');
    cy.tick(500);

    cy.contains(/Questões de/i).should('be.visible');
    cy.contains(/Banco de Quest/i).should('be.visible');
  });
});
