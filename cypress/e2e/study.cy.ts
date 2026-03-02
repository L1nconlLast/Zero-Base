const USER = {
  name: 'Lin Testes',
  email: `study_${Date.now()}@medicina.com`,
  password: 'Senha@123',
};

function seedStudyData(email: string, sessions: number, minutes: number) {
  cy.window().then((win) => {
    const key = `medicinaData_${email}`;
    const raw = win.localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};

    const weekProgress = {
      domingo: { studied: false, minutes: 0 },
      segunda: { studied: false, minutes: 0 },
      terca: { studied: false, minutes: 0 },
      quarta: { studied: false, minutes: 0 },
      quinta: { studied: false, minutes: 0 },
      sexta: { studied: false, minutes: 0 },
      sabado: { studied: false, minutes: 0 },
      ...(data.weekProgress || {}),
    };

    const fakeSessions = Array.from({ length: sessions }, (_, index) => ({
      date: new Date(Date.now() - index * 86400000).toISOString(),
      minutes,
      points: minutes * 10,
      subject: 'Anatomia',
      duration: minutes,
    }));

    win.localStorage.setItem(
      key,
      JSON.stringify({
        ...data,
        completedTopics: data.completedTopics || {},
        achievements: data.achievements || [],
        streak: data.streak || 0,
        bestStreak: data.bestStreak || 0,
        currentStreak: data.currentStreak || 0,
        dailyGoal: data.dailyGoal || 90,
        totalPoints: sessions * minutes * 10,
        sessions: fakeSessions,
        studyHistory: fakeSessions,
        level: Math.floor((sessions * minutes * 10) / 1000) + 1,
        weekProgress,
      })
    );
  });
  cy.reload();
}

describe('Navegação e estudo', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.register(USER.name, USER.email, USER.password);
  });

  it('navega pelas abas principais', () => {
    cy.navigateTo('Estudo');
    cy.navigateTo('Foco');
    cy.contains(/matéria do ciclo|pomodoro/i).should('be.visible');

    cy.navigateTo('Progresso');
    cy.navigateTo('Dashboard');
    cy.contains(/progresso semanal/i).should('be.visible');

    cy.navigateTo('Progresso');
    cy.navigateTo('Conquistas');
    cy.contains(/conquistas/i).should('be.visible');

    cy.navigateTo('Configurações');
    cy.contains(/configurações/i).should('be.visible');

    cy.navigateTo('Dados');
    cy.contains(/gerenciamento de dados/i).should('be.visible');
  });

  it('cronômetro inicia, pausa e reseta', () => {
    cy.navigateTo('Estudo');
    cy.navigateTo('Foco');
    cy.contains('button', /livre/i).click({ force: true });
    cy.contains('Fisiologia').click();
    cy.contains(/estudando:.*fisiologia/i).should('be.visible');

    cy.contains('button', /iniciar/i).click();
    cy.wait(2000);
    cy.contains(/estudando|pausar/i).should('be.visible');

    cy.contains('button', /pausar/i).click();
    cy.contains(/pausado/i).should('be.visible');

    cy.on('window:confirm', () => true);
    cy.contains('button', /resetar/i).click();
    cy.contains('00:00:00').should('be.visible');
  });

  it('pomodoro troca modo e inicia', () => {
    cy.navigateTo('Estudo');
    cy.navigateTo('Foco');
    cy.contains('button', /pomodoro/i).click({ force: true });
    cy.contains('button', /pausa curta/i).click();
    cy.contains('05:00').should('be.visible');

    cy.contains('button', /pausa longa/i).click();
    cy.contains('15:00').should('be.visible');

    cy.contains('button', /foco/i).click();
    cy.contains('button', /iniciar/i).click();
    cy.contains(/foco|pausar/i).should('be.visible');
  });

  it('dashboard mostra dados com sessões injetadas', () => {
    seedStudyData(USER.email, 5, 30);
    cy.navigateTo('Progresso');
    cy.navigateTo('Dashboard');

    cy.contains(/pontos totais/i).should('be.visible');
    cy.contains(/progresso semanal/i).should('be.visible');
    cy.contains(/distribuição por matéria/i).should('be.visible');
  });

  it('conquistas exibe filtros', () => {
    cy.navigateTo('Progresso');
    cy.navigateTo('Conquistas');
    cy.contains('button', /todas/i).first().click();
    cy.contains('button', /desbloqueadas/i).click();
    cy.contains('button', /bloqueadas/i).click();
  });
});
