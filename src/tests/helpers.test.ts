import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateName,
  formatTime,
  formatDate,
  calculateLevel,
  calculateDailyProgress,
  getDayOfWeek,
  checkRateLimit,
  resetRateLimit,
  generateSessionToken,
  isSessionValid,
} from '../utils/helpers';

// ── validateEmail ─────────────────────────────────────────────
describe('validateEmail', () => {
  it('aceita e-mail válido', () => {
    expect(validateEmail('joao@medicina.com')).toBe(true);
  });

  it('rejeita e-mail sem @', () => {
    expect(validateEmail('joaomedicina.com')).toBe(false);
  });

  it('rejeita e-mail sem domínio', () => {
    expect(validateEmail('joao@')).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(validateEmail('')).toBe(false);
  });
});

// ── validatePassword ──────────────────────────────────────────
describe('validatePassword', () => {
  it('aceita senha forte com maiúscula, número e símbolo', () => {
    expect(validatePassword('Senha@123').valid).toBe(true);
  });

  it('rejeita senha sem letra maiúscula', () => {
    expect(validatePassword('senha@123').valid).toBe(false);
  });

  it('rejeita senha sem número', () => {
    expect(validatePassword('Senha@abc').valid).toBe(false);
  });

  it('rejeita senha sem símbolo', () => {
    expect(validatePassword('Senha1234').valid).toBe(false);
  });

  it('rejeita senha vazia', () => {
    expect(validatePassword('').valid).toBe(false);
  });
});

// ── validateName ──────────────────────────────────────────────
describe('validateName', () => {
  it('aceita nome válido', () => {
    expect(validateName('João Silva')).toBe(true);
  });

  it('rejeita nome muito curto', () => {
    expect(validateName('Jo')).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(validateName('')).toBe(false);
  });
});

// ── formatTime ────────────────────────────────────────────────
describe('formatTime', () => {
  it('formata 5400 segundos como 1h 30min', () => {
    // 5400 segundos = 1 hora 30 minutos
    expect(formatTime(5400)).toBe('01:30:00');
  });

  it('formata 3600 segundos como 1h', () => {
    // 3600 segundos = 1 hora
    expect(formatTime(3600)).toBe('01:00:00');
  });

  it('formata 2700 segundos com minutos e segundos', () => {
    // 2700 segundos = 45 minutos
    expect(formatTime(2700)).toBe('00:45:00');
  });

  it('formata 0 segundos', () => {
    expect(formatTime(0)).toBe('00:00:00');
  });
});

// ── formatDate ────────────────────────────────────────────────
describe('formatDate', () => {
  it('retorna string não vazia para data válida', () => {
    expect(formatDate('2024-01-15')).toBeTruthy();
  });

  it('retorna string para ISO date', () => {
    expect(typeof formatDate(new Date().toISOString())).toBe('string');
  });
});

// ── calculateLevel ────────────────────────────────────────────
describe('calculateLevel', () => {
  it('nível 1 com 0 pontos', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('nível aumenta com mais pontos', () => {
    expect(calculateLevel(1000)).toBeGreaterThan(calculateLevel(100));
  });

  it('retorna número positivo', () => {
    expect(calculateLevel(500)).toBeGreaterThan(0);
  });
});

// ── calculateDailyProgress ────────────────────────────────────
describe('calculateDailyProgress', () => {
  it('0% quando não estudou', () => {
    expect(calculateDailyProgress(0, 90)).toBe(0);
  });

  it('100% quando atingiu a meta', () => {
    expect(calculateDailyProgress(90, 90)).toBe(100);
  });

  it('não ultrapassa 100%', () => {
    expect(calculateDailyProgress(200, 90)).toBeLessThanOrEqual(100);
  });

  it('50% na metade da meta', () => {
    expect(calculateDailyProgress(45, 90)).toBe(50);
  });
});

// ── getDayOfWeek ──────────────────────────────────────────────
describe('getDayOfWeek', () => {
  it('retorna um dos 7 dias em português', () => {
    const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const result = getDayOfWeek();
    expect(dias).toContain(result);
  });

  it('retorna o dia da semana atual', () => {
    const result = getDayOfWeek();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ── checkRateLimit / resetRateLimit ───────────────────────────
describe('checkRateLimit / resetRateLimit', () => {
  const email = 'teste@medicina.com';

  beforeEach(() => {
    resetRateLimit(email);
  });

  it('permite primeiras 3 tentativas', () => {
    expect(checkRateLimit(email).allowed).toBe(true); // não bloqueado
    expect(checkRateLimit(email).allowed).toBe(true);
    expect(checkRateLimit(email).allowed).toBe(true);
  });

  it('bloqueia na 4ª tentativa', () => {
    checkRateLimit(email);
    checkRateLimit(email);
    checkRateLimit(email);
    expect(checkRateLimit(email).allowed).toBe(false); // bloqueado
  });

  it('resetRateLimit libera o acesso', () => {
    checkRateLimit(email);
    checkRateLimit(email);
    checkRateLimit(email);
    checkRateLimit(email); // bloqueado
    resetRateLimit(email);
    expect(checkRateLimit(email).allowed).toBe(true); // liberado
  });
});

// ── generateSessionToken / isSessionValid ─────────────────────
describe('Sessões', () => {
  it('generateSessionToken retorna string não vazia', () => {
    const token = generateSessionToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('sessão recém-criada é válida', () => {
    // isSessionValid recebe timestamp de criação, não token
    const now = Date.now();
    expect(isSessionValid(now)).toBe(true);
  });

  it('sessão expirada é inválida', () => {
    // Simular sessão de 2 dias atrás (além do timeout de 24h)
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    expect(isSessionValid(twoDaysAgo)).toBe(false);
  });
});
