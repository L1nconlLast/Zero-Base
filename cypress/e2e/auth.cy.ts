const USER = {
  name: 'Lin Medicina',
  email: `lin_${Date.now()}@medicina.com`,
  password: 'Senha@123',
};

const E2E_LOGIN_EMAIL = Cypress.env('E2E_LOGIN_EMAIL') as string | undefined;
const E2E_LOGIN_PASSWORD = Cypress.env('E2E_LOGIN_PASSWORD') as string | undefined;

const assertPostRegisterOutcome = () => {
  cy.get('body', { timeout: 12000 }).then(($body) => {
    const text = ($body.text() || '').toLowerCase();
    const hasLogoutButton = /sair/.test(text);
    const isSubmitting = /cadastrando/.test(text);
    const requiresEmailConfirmation =
      /verifique seu email/.test(text) ||
      /confirme seu email/.test(text) ||
      /confirmação/.test(text) ||
      /confirmacao/.test(text);
    const isAuthProviderRateLimited =
      /limite de envio de email/.test(text) ||
      /email rate limit exceeded/.test(text) ||
      /over_email_send_rate_limit/.test(text);
    const isAlreadyRegistered = /ja esta cadastrado/.test(text) || /already registered/.test(text);

    const hasExpectedOutcome =
      hasLogoutButton ||
      isSubmitting ||
      requiresEmailConfirmation ||
      isAuthProviderRateLimited ||
      isAlreadyRegistered;

    expect(hasExpectedOutcome).to.equal(true);
  });
};

describe('Autenticação', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/');
  });

  describe('Cadastro', () => {
    beforeEach(() => {
      cy.contains('Cadastre-se').click();
    });

    it('exibe formulário de cadastro', () => {
      cy.contains(/criar conta/i).should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('have.length.at.least', 2);
    });

    it('submete cadastro com dados válidos sem quebrar a UI', () => {
      cy.get('input[placeholder*="nome"], input[id*="name"], input[type="text"]').first().type(USER.name);
      cy.get('input[type="email"]').type(USER.email);
      cy.get('input[type="password"]').first().type(USER.password);
      cy.get('input[type="password"]').last().type(USER.password);
      cy.contains('button', /criar conta/i).click();

      assertPostRegisterOutcome();
    });

    it('rejeita senhas diferentes', () => {
      cy.get('input[placeholder*="nome"], input[id*="name"], input[type="text"]').first().type(USER.name);
      cy.get('input[type="email"]').type(USER.email);
      cy.get('input[type="password"]').first().type(USER.password);
      cy.get('input[type="password"]').last().type('SenhaErrada@99');
      cy.contains('button', /criar conta/i).click();

      cy.contains(/senhas.*não coincidem|coincidem/i).should('be.visible');
    });

    it('rejeita campos vazios', () => {
      cy.contains('button', /criar conta/i).click();
      cy.contains(/preencha|campos/i).should('be.visible');
    });
  });

  describe('Login e logout', () => {
    it('faz login com credenciais corretas', function () {
      if (!E2E_LOGIN_EMAIL || !E2E_LOGIN_PASSWORD) {
        this.skip();
      }

      cy.login(E2E_LOGIN_EMAIL!, E2E_LOGIN_PASSWORD!);
      cy.contains('button', /sair/i).should('be.visible');
    });

    it('rejeita senha incorreta', () => {
      cy.visit('/');
      cy.get('input[type="email"]').type(E2E_LOGIN_EMAIL || USER.email);
      cy.get('input[type="password"]').type('SenhaErrada@99');
      cy.contains('button', /entrar/i).click();

      cy.contains('button', /entrar/i).should('be.visible');
      cy.contains('button', /sair/i).should('not.exist');
    });

    it('desloga e volta para login', function () {
      if (!E2E_LOGIN_EMAIL || !E2E_LOGIN_PASSWORD) {
        this.skip();
      }

      cy.login(E2E_LOGIN_EMAIL!, E2E_LOGIN_PASSWORD!);
      cy.logout();
      cy.get('input[type="email"]').should('be.visible');
    });
  });
});
