import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

// ── Mock do localStorage ──────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ── Mock do DOMPurify ─────────────────────────────────────────
vi.mock('dompurify', () => ({
  default: { sanitize: (s: string) => s },
}));

// ── Mock do logger (não queremos logs nos testes) ─────────────
vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info:  vi.fn(),
    warn:  vi.fn(),
    error: vi.fn(),
    getStoredLogs: vi.fn(() => []),
    clearLogs: vi.fn(),
    exportLogs: vi.fn(() => '[]'),
  },
}));

// Limpa mocks e localStorage entre cada teste
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
