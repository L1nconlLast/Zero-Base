import { describe, it, expect } from 'vitest';
import { validateImport, validateUserData, safeParseAndValidate } from '../utils/validation';

const expectErrorMessage = (result: { success: boolean; error?: string }, pattern?: RegExp) => {
  expect(result.success).toBe(false);
  if (pattern) {
    expect(result.error ?? '').toMatch(pattern);
  } else {
    expect(typeof result.error).toBe('string');
    expect((result.error ?? '').length).toBeGreaterThan(0);
  }
};

// ── Fixture: UserData mínimo válido ───────────────────────────
const validUserData = {
  weekProgress: {
    domingo: { studied: false, minutes: 0 },
    segunda: { studied: true,  minutes: 60 },
    terca:   { studied: false, minutes: 0 },
    quarta:  { studied: false, minutes: 0 },
    quinta:  { studied: false, minutes: 0 },
    sexta:   { studied: false, minutes: 0 },
    sabado:  { studied: false, minutes: 0 },
  },
  completedTopics: {},
  totalPoints: 300,
  streak: 2,
  bestStreak: 5,
  achievements: ['primeiro_dia'],
  level: 2,
  studyHistory: [
    {
      date: '2024-06-10T10:00:00.000Z',
      minutes: 60,
      points: 600,
      subject: 'Anatomia',
      duration: 60,
    },
  ],
  dailyGoal: 90,
  sessions: [],
  currentStreak: 2,
};

const validBackup = {
  version: '2.0',
  exportedAt: '2024-06-10T10:00:00.000Z',
  user: {
    nome: 'João Silva',
    email: 'joao@medicina.com',
    dataCadastro: '2024-01-01',
    foto: '',
  },
  data: validUserData,
};

// ── validateUserData ──────────────────────────────────────────
describe('validateUserData', () => {
  it('aceita UserData válido', () => {
    const result = validateUserData(validUserData);
    expect(result.success).toBe(true);
  });

  it('rejeita matéria inválida', () => {
    const invalid = {
      ...validUserData,
      studyHistory: [
        { ...validUserData.studyHistory[0], subject: 'MatériaFalsa' },
      ],
    };
    const result = validateUserData(invalid);
    expectErrorMessage(result, /subject/i);
  });

  it('rejeita dailyGoal negativo', () => {
    const result = validateUserData({ ...validUserData, dailyGoal: -1 });
    expect(result.success).toBe(false);
  });

  it('rejeita minutes > 1440 (mais de 24h)', () => {
    const invalid = {
      ...validUserData,
      weekProgress: {
        ...validUserData.weekProgress,
        segunda: { studied: true, minutes: 9999 },
      },
    };
    const result = validateUserData(invalid);
    expect(result.success).toBe(false);
  });

  it('rejeita objeto vazio', () => {
    const result = validateUserData({});
    expect(result.success).toBe(false);
  });
});

// ── validateImport ────────────────────────────────────────────
describe('validateImport', () => {
  it('aceita backup completo válido', () => {
    const result = validateImport(validBackup);
    expect(result.success).toBe(true);
  });

  it('rejeita e-mail inválido no user', () => {
    const invalid = {
      ...validBackup,
      user: { ...validBackup.user, email: 'nao-é-email' },
    };
    const result = validateImport(invalid);
    expectErrorMessage(result, /email/i);
  });

  it('rejeita backup sem campo data', () => {
    const semData: Partial<typeof validBackup> = { ...validBackup };
    delete semData.data;
    const result = validateImport(semData);
    expect(result.success).toBe(false);
  });

  it('retorna mensagem legível em português', () => {
    const result = validateImport({ user: { email: 'x' }, data: {} });
    expectErrorMessage(result);
  });
});

// ── safeParseAndValidate ──────────────────────────────────────
describe('safeParseAndValidate', () => {
  it('valida JSON string válido', () => {
    const json = JSON.stringify(validBackup);
    const result = safeParseAndValidate(json);
    expect(result.success).toBe(true);
  });

  it('captura JSON mal-formado sem lançar exceção', () => {
    const result = safeParseAndValidate('{ broken json >>>');
    expectErrorMessage(result, /corrompido|inválido/i);
  });

  it('captura unicode escape inválido', () => {
    const result = safeParseAndValidate('{"nome": "teste\\uXXXX"}');
    expect(result.success).toBe(false);
  });

  it('captura string vazia', () => {
    const result = safeParseAndValidate('');
    expect(result.success).toBe(false);
  });

  it('captura JSON válido mas schema inválido', () => {
    const result = safeParseAndValidate(JSON.stringify({ foo: 'bar' }));
    expect(result.success).toBe(false);
  });
});
