import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    env: {
      // Credenciais para testes de login/logout em producao.
      // Configure via: $env:CYPRESS_E2E_LOGIN_EMAIL='...' $env:CYPRESS_E2E_LOGIN_PASSWORD='...'
      // Ou popule com: npx tsx scripts/setup-e2e-user.ts
      E2E_LOGIN_EMAIL: process.env.CYPRESS_E2E_LOGIN_EMAIL || process.env.E2E_LOGIN_EMAIL || '',
      E2E_LOGIN_PASSWORD: process.env.CYPRESS_E2E_LOGIN_PASSWORD || process.env.E2E_LOGIN_PASSWORD || '',
    },
    setupNodeEvents(_on, config) {
      return config;
    },
  },
});
