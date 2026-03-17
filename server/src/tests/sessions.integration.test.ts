import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import { app } from '../app';
import { studyPlatformCompatService } from '../services/studyPlatformCompat.service';
import { queueJobsService } from '../services/queueJobs.service';

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

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_JWT_SECRET = 'test-secret';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sessions integration', () => {
  it('executa start -> finish e enfileira jobs', async () => {
    const token = await createAuthToken();

    vi.spyOn(studyPlatformCompatService, 'startSession').mockResolvedValue({ sessionId: '22222222-2222-4222-8222-222222222222' });
    vi.spyOn(studyPlatformCompatService, 'finishSession').mockResolvedValue({
      duration: 55,
      xpGained: 95,
      newLevel: 'INICIANTE',
      streak: 3,
    });
    const enqueueSpy = vi.spyOn(queueJobsService, 'enqueueAfterSessionFinish').mockResolvedValue();

    const startResponse = await request(app)
      .post('/api/sessions/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ subjectId: '33333333-3333-4333-8333-333333333333', startTime: '2026-03-16T17:00:00.000Z' })
      .expect(201);

    expect(startResponse.body).toEqual({ sessionId: '22222222-2222-4222-8222-222222222222' });

    const finishResponse = await request(app)
      .post('/api/sessions/22222222-2222-4222-8222-222222222222/finish')
      .set('Authorization', `Bearer ${token}`)
      .send({ endTime: '2026-03-16T17:55:00.000Z', questionsDone: 8, correctAnswers: 8 })
      .expect(200);

    expect(finishResponse.body).toEqual({
      duration: 55,
      xpGained: 95,
      newLevel: 'INICIANTE',
      streak: 3,
    });
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
  });
});