import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIServiceClient } from '../services/aiClient.service';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe('AIServiceClient', () => {
  it('retorna sucesso quando ai-service responde 200', async () => {
    process.env.AI_ENABLED = 'true';
    process.env.AI_MAX_RETRIES = '1';

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        weeklyPlan: [{ date: '2026-03-16', subject: 'Matematica', skill: 'Funcao', durationMin: 90 }],
      }),
    })) as unknown as typeof fetch;

    const client = new AIServiceClient({ fetchImpl });
    const result = await client.generatePlanner({
      availableHoursPerDay: [1, 1, 1, 1, 1, 1, 1],
      goals: ['Matematica'],
    });

    expect(result.source).toBe('ai-service');
    expect(result.weeklyPlan).toHaveLength(1);
  });

  it('faz fallback em timeout', async () => {
    process.env.AI_ENABLED = 'true';
    process.env.AI_TIMEOUT_MS = '10';
    process.env.AI_MAX_RETRIES = '1';

    const fetchImpl = vi.fn((_: RequestInfo | URL, init?: RequestInit) => new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })) as unknown as typeof fetch;

    const client = new AIServiceClient({ fetchImpl, sleep: async () => undefined });

    const result = await client.explainTutor({
      topic: 'Funcao exponencial',
      context: 'ENEM',
      userLevel: 'intermediario',
    });

    expect(result.source).toBe('fallback');
    expect(result.explanation.length).toBeGreaterThan(10);
  });

  it('faz fallback quando ai-service retorna erro', async () => {
    process.env.AI_ENABLED = 'true';
    process.env.AI_MAX_RETRIES = '1';

    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => 'service unavailable',
    })) as unknown as typeof fetch;

    const client = new AIServiceClient({ fetchImpl, sleep: async () => undefined });

    const result = await client.generatePlanner({
      availableHoursPerDay: [2, 2, 2, 2, 2, 2, 2],
      goals: ['Redacao'],
      weakSkills: ['Competencia 1'],
    });

    expect(result.source).toBe('fallback');
    expect(result.weeklyPlan).toHaveLength(7);
  });
});
