const USER = {
  name: 'Lin Medicina',
  email: `lin_${Date.now()}@medicina.com`,
  password: 'Senha@123',
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

    it('cadastra com dados válidos', () => {
      cy.get('input[placeholder*="nome"], input[id*="name"], input[type="text"]').first().type(USER.name);
      cy.get('input[type="email"]').type(USER.email);
      cy.get('input[type="password"]').first().type(USER.password);
      cy.get('input[type="password"]').last().type(USER.password);
      cy.contains('button', /criar conta/i).click();

      cy.contains('button', /sair/i).should('be.visible');
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
    beforeEach(() => {
      cy.clearLocalStorage();
      cy.register(USER.name, USER.email, USER.password);
      cy.logout();
    });

    it('faz login com credenciais corretas', () => {
      cy.login(USER.email, USER.password);
      cy.contains('button', /sair/i).should('be.visible');
    });

    it('rejeita senha incorreta', () => {
      cy.visit('/');
      cy.get('input[type="email"]').type(USER.email);
      cy.get('input[type="password"]').type('SenhaErrada@99');
      cy.contains('button', /entrar/i).click();

      cy.contains('button', /entrar/i).should('be.visible');
      cy.contains('button', /sair/i).should('not.exist');
    });

    it('desloga e volta para login', () => {
      cy.login(USER.email, USER.password);
      cy.logout();
      cy.get('input[type="email"]').should('be.visible');
    });
  });
});
