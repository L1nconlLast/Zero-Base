/* eslint-disable @typescript-eslint/no-namespace */

declare global {
  namespace Cypress {
    interface Chainable {
      register(name: string, email: string, password: string): Chainable<void>;
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      clearAppData(): Chainable<void>;
      navigateTo(tab: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('register', (name: string, email: string, password: string) => {
  cy.visit('/');
  cy.contains('Cadastre-se').click();
  cy.get('input[placeholder*="nome"], input[id*="name"], input[type="text"]').first().type(name);
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').first().type(password);
  cy.get('input[type="password"]').last().type(password);
  cy.contains('button', /criar conta/i).click();
});

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('button', /entrar/i).click();
});

Cypress.Commands.add('logout', () => {
  cy.contains('button', /sair/i).click();
});

Cypress.Commands.add('clearAppData', () => {
  cy.clearLocalStorage();
  cy.reload();
});

Cypress.Commands.add('navigateTo', (tab: string) => {
  cy.contains('button', new RegExp(tab, 'i')).click();
});

export {};
