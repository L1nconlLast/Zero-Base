import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',       // simula o browser (localStorage, DOM)
    environmentMatchGlobs: [['server/src/tests/**', 'node']],
    globals: true,              // describe/it/expect sem import
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**', 'src/hooks/**'],
    },
  },
});
