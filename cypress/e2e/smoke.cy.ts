describe('Smoke - Zero Base', () => {
  it('carrega tela inicial de login', () => {
    cy.visit('/');
    cy.contains('Entrar').should('be.visible');
    cy.contains('Não tem conta?').should('be.visible');
  });

  it('abre tela de cadastro', () => {
    cy.visit('/');
    cy.contains('Cadastre-se').click();
    cy.contains('Criar Conta').should('be.visible');
  });
});

