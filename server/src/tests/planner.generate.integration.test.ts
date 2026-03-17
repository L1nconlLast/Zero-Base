import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import { app } from '../app';
import { aiServiceClient } from '../services/aiClient.service';

afterEach(() => {
  vi.restoreAllMocks();
});

const createAuthToken = async (): Promise<string> => {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://example.supabase.co';
  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'test-secret';
  const issuer = `${supabaseUrl}/auth/v1`;
  return await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('11111111-1111-4111-8111-111111111111')
    .setAudience('authenticated')
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(Buffer.from(jwtSecret, 'utf-8'));
};

describe('POST /api/planner/generate', () => {
  const payload = {
    availableHoursPerDay: [1, 1, 1, 1, 1, 1, 1],
    goals: ['Matematica', 'Portugues'],
    weakSkills: ['Equacao 1 grau'],
  };

  it('funciona com AI_ENABLED=false usando fallback local', async () => {
    process.env.AI_ENABLED = 'false';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_JWT_SECRET = 'test-secret';
    const token = await createAuthToken();

    const response = await request(app)
      .post('/api/planner/generate')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(200);

    expect(Array.isArray(response.body.weeklyPlan)).toBe(true);
    expect(response.body.weeklyPlan).toHaveLength(7);
  });

  it('funciona com AI_ENABLED=true usando client de IA', async () => {
    process.env.AI_ENABLED = 'true';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_JWT_SECRET = 'test-secret';
    const token = await createAuthToken();

    vi.spyOn(aiServiceClient, 'isEnabled').mockReturnValue(true);
    vi.spyOn(aiServiceClient, 'generatePlanner').mockResolvedValue({
      source: 'ai-service',
      weeklyPlan: [
        { date: '2026-03-16', subject: 'Matematica', skill: 'Funcao', durationMin: 90 },
      ],
    });

    const response = await request(app)
      .post('/api/planner/generate')
      .set('x-request-id', '67b0f7f7-18cf-4e17-b520-139ec61691f0')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(200);

    expect(response.body.source).toBe('ai-service');
    expect(response.body.weeklyPlan[0].subject).toBe('Matematica');
  });
});
