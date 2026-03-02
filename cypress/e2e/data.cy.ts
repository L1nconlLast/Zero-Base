const USER = {
  name: 'Lin Data',
  email: `data_${Date.now()}@medicina.com`,
  password: 'Senha@123',
};

const VALID_BACKUP = {
  version: '2.0',
  exportedAt: new Date().toISOString(),
  user: {
    nome: USER.name,
    email: USER.email,
    dataCadastro: new Date().toISOString(),
    foto: '',
  },
  data: {
    weekProgress: {
      domingo: { studied: false, minutes: 0 },
      segunda: { studied: true, minutes: 60 },
      terca: { studied: false, minutes: 0 },
      quarta: { studied: false, minutes: 0 },
      quinta: { studied: false, minutes: 0 },
      sexta: { studied: false, minutes: 0 },
      sabado: { studied: false, minutes: 0 },
    },
    completedTopics: {},
    totalPoints: 600,
    streak: 1,
    bestStreak: 1,
    achievements: [],
    level: 1,
    studyHistory: [
      {
        date: new Date().toISOString(),
        minutes: 60,
        points: 600,
        subject: 'Anatomia',
        duration: 60,
      },
    ],
    dailyGoal: 90,
    sessions: [
      {
        date: new Date().toISOString(),
        minutes: 60,
        points: 600,
        subject: 'Anatomia',
        duration: 60,
      },
    ],
    currentStreak: 1,
  },
};

describe('Gerenciamento de Dados', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.register(USER.name, USER.email, USER.password);
    cy.navigateTo('Dados');
  });

  it('exibe página de dados', () => {
    cy.contains(/gerenciamento de dados/i).should('be.visible');
    cy.contains(/exportar dados/i).should('be.visible');
    cy.contains(/importar dados/i).should('be.visible');
  });

  it('exporta backup JSON', () => {
    cy.contains('button', /baixar backup|exportar/i).click();
    cy.contains(/erro/i).should('not.exist');
  });

  it('importa backup JSON válido', () => {
    const fileContent = JSON.stringify(VALID_BACKUP);

    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from(fileContent),
        fileName: 'backup_valido.json',
        mimeType: 'application/json',
      },
      { force: true }
    );

    cy.contains(/importados com sucesso|importado com sucesso/i).should('be.visible');

    cy.navigateTo('Dashboard');
    cy.contains('600').should('be.visible');
  });

  it('rejeita JSON inválido', () => {
    cy.navigateTo('Dados');
    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('{ broken json >>>>'),
        fileName: 'invalido.json',
        mimeType: 'application/json',
      },
      { force: true }
    );

    cy.contains(/inválido|erro|corrompido/i).should('be.visible');
  });

  it('rejeita JSON com schema inválido', () => {
    const invalidBackup = {
      ...VALID_BACKUP,
      data: {
        ...VALID_BACKUP.data,
        studyHistory: [
          {
            date: new Date().toISOString(),
            minutes: 30,
            points: 300,
            subject: 'MateriaFalsa',
            duration: 30,
          },
        ],
      },
    };

    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from(JSON.stringify(invalidBackup)),
        fileName: 'invalido_schema.json',
        mimeType: 'application/json',
      },
      { force: true }
    );

    cy.contains(/campo|inválido|erro/i).should('be.visible');
  });

  it('pede confirmação ao limpar dados', () => {
    cy.contains('button', /limpar todos os dados/i).click();
    cy.contains(/tem certeza/i).should('be.visible');
  });

  it('limpa dados e volta para zero', () => {
    cy.contains('button', /limpar todos os dados/i).click();
    cy.contains('button', /sim, limpar tudo/i).click();
    cy.contains(/dados foram limpos/i).should('be.visible');

    cy.navigateTo('Dashboard');
    cy.contains(/pontos totais/i).should('be.visible');
    cy.contains('0').should('be.visible');
  });
});
