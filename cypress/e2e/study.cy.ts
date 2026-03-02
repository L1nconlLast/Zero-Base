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
        totalPoints: sessions * minutes * 10,
        sessions: fakeSessions,
        studyHistory: fakeSessions,
        level: Math.floor((sessions * minutes * 10) / 1000) + 1,
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
    cy.navigateTo('Cronômetro');
    cy.contains(/cronômetro de estudos/i).should('be.visible');

    cy.navigateTo('Pomodoro');
    cy.contains(/matéria do ciclo/i).should('be.visible');

    cy.navigateTo('Dashboard');
    cy.contains(/progresso semanal/i).should('be.visible');

    cy.navigateTo('Conquistas');
    cy.contains(/conquistas/i).should('be.visible');

    cy.navigateTo('Configurações');
    cy.contains(/configurações/i).should('be.visible');

    cy.navigateTo('Dados');
    cy.contains(/gerenciamento de dados/i).should('be.visible');
  });

  it('cronômetro inicia, pausa e reseta', () => {
    cy.navigateTo('Cronômetro');
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
    cy.navigateTo('Pomodoro');
    cy.contains('button', /pausa curta/i).click();
    cy.contains('05:00').should('be.visible');

    cy.contains('button', /pausa longa/i).click();
    cy.contains('15:00').should('be.visible');

    cy.contains('button', /foco/i).click();
    cy.get('button[aria-label="Iniciar"]').click();
    cy.contains(/rodando/i).should('be.visible');
  });

  it('dashboard mostra dados com sessões injetadas', () => {
    seedStudyData(USER.email, 5, 30);
    cy.navigateTo('Dashboard');

    cy.contains(/pontos totais/i).should('be.visible');
    cy.contains(/progresso semanal/i).should('be.visible');
    cy.contains(/distribuição por matéria/i).should('be.visible');
  });

  it('conquistas exibe filtros', () => {
    cy.navigateTo('Conquistas');
    cy.contains('button', /todas/i).first().click();
    cy.contains('button', /desbloqueadas/i).click();
    cy.contains('button', /bloqueadas/i).click();
  });
});
