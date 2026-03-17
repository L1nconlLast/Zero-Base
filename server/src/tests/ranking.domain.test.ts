/**
 * ranking.domain.test.ts
 *
 * Testes de unidade para regras de domínio e cálculos do ranking.
 * Sem dependência de banco de dados.
 */

import { describe, expect, it } from 'vitest';

// ── Anti-abuse rules ─────────────────────────────────────────

const isSessionValid = (durationMin: number): boolean => {
  // Sessão contínua >= 9h é inválida
  return durationMin < 540;
};

const isDailyTotalValid = (accumulatedMin: number, sessionMin: number): boolean => {
  // Acumular >= 20h/dia é inválido
  return accumulatedMin + sessionMin < 1200;
};

// ── Tests ────────────────────────────────────────────────────

describe('ranking domain rules', () => {
  describe('isSessionValid — duração de sessão individual', () => {
    it('sessão de 25 min é válida', () => {
      expect(isSessionValid(25)).toBe(true);
    });

    it('sessão de 120 min é válida', () => {
      expect(isSessionValid(120)).toBe(true);
    });

    it('sessão de 540 min (9h) é inválida', () => {
      expect(isSessionValid(540)).toBe(false);
    });

    it('sessão de 600 min (10h) é inválida', () => {
      expect(isSessionValid(600)).toBe(false);
    });

    it('sessão de 539 min é válida (edge case)', () => {
      expect(isSessionValid(539)).toBe(true);
    });
  });

  describe('isDailyTotalValid — acúmulo diário', () => {
    it('1000 acumulado + 100 nova = 1100, válido', () => {
      expect(isDailyTotalValid(1000, 100)).toBe(true);
    });

    it('1100 acumulado + 100 nova = 1200, inválido (boundary)', () => {
      expect(isDailyTotalValid(1100, 100)).toBe(false);
    });

    it('1199 acumulado + 1 nova = 1200, inválido (boundary)', () => {
      expect(isDailyTotalValid(1199, 1)).toBe(false);
    });

    it('0 acumulado + 1200 nova = 1200, inválido (full day)', () => {
      expect(isDailyTotalValid(0, 1200)).toBe(false);
    });

    it('0 acumulado + 1199 nova = 1199, válido', () => {
      expect(isDailyTotalValid(0, 1199)).toBe(true);
    });

    it('600 acumulado + 600 nova = 1200, inválido', () => {
      expect(isDailyTotalValid(600, 600)).toBe(false);
    });

    it('600 acumulado + 599 nova = 1199, válido', () => {
      expect(isDailyTotalValid(600, 599)).toBe(true);
    });
  });

  describe('elegibilidade combinada', () => {
    it('sessão válida + acúmulo válido', () => {
      expect(isSessionValid(120) && isDailyTotalValid(500, 120)).toBe(true);
    });

    it('sessão inválida (9h+) + acúmulo válido → inválida globalmente', () => {
      expect(isSessionValid(600) && isDailyTotalValid(0, 600)).toBe(false);
    });

    it('sessão válida + acúmulo inválido (>20h/dia) → inválida globalmente', () => {
      expect(isSessionValid(100) && isDailyTotalValid(1100, 100)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('sessão 0 min é válida por duração mas pode falhar em lógica superior', () => {
      expect(isSessionValid(0)).toBe(true);
    });

    it('sessão muito longa 6000 min (100h) é inválida', () => {
      expect(isSessionValid(6000)).toBe(false);
    });

    it('acúmulo exatamente 20h (1200 min) com 0 nova é inválido', () => {
      expect(isDailyTotalValid(1200, 0)).toBe(false);
    });
  });
});
