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

  cy.window().then((win) => {
    win.localStorage.setItem(`mdzOnboardingCompleted_${email.toLowerCase()}`, 'true');
  });
  cy.reload();
});

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('button', /entrar/i).click();

  cy.window().then((win) => {
    win.localStorage.setItem(`mdzOnboardingCompleted_${email.toLowerCase()}`, 'true');
  });
  cy.reload();
});

Cypress.Commands.add('logout', () => {
  cy.contains('button', /sair/i).click({ force: true });
});

Cypress.Commands.add('clearAppData', () => {
  cy.clearLocalStorage();
  cy.reload();
});

Cypress.Commands.add('navigateTo', (tab: string) => {
  const tabToDomain: Record<string, string> = {
    foco: 'Estudo',
    cronograma: 'Estudo',
    métodos: 'Estudo',
    metodos: 'Estudo',
    questões: 'Estudo',
    questoes: 'Estudo',
    dashboard: 'Progresso',
    conquistas: 'Progresso',
    dados: 'Dados',
    configurações: 'Configurações',
    configuracoes: 'Configurações',
  };

  const normalized = tab.trim().toLowerCase();

  const clickLabel = (label: string) =>
    cy.contains('button', new RegExp(label, 'i'), { timeout: 12000 })
      .scrollIntoView()
      .click({ force: true, waitForAnimations: false });

  cy.get('body').then(($body) => {
    const hasDirectTab = $body
      .find('button')
      .toArray()
      .some((btn) => new RegExp(tab, 'i').test(btn.textContent || ''));

    if (hasDirectTab) {
      clickLabel(tab);
      return;
    }

    const domain = tabToDomain[normalized];
    if (domain && !new RegExp(domain, 'i').test(tab)) {
      clickLabel(domain);
      clickLabel(tab);
      return;
    }

    clickLabel(tab);
  });
});

export {};
