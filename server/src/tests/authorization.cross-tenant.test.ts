import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';

import { app } from '../app';
import { onboardingService } from '../services/onboarding.service';
import { profileService } from '../services/profile.service';
import { rankingService } from '../services/ranking.service';

const USER_A_ID = '11111111-1111-4111-8111-111111111111';
const USER_B_ID = '33333333-3333-4333-8333-333333333333';

const createAuthToken = async (userId: string): Promise<string> => {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://example.supabase.co';
  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'test-secret';
  const issuer = `${supabaseUrl}/auth/v1`;

  return await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
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

describe('Authorization - Cross-Tenant Isolation', () => {
  it('profile load always resolves data for the authenticated user only', async () => {
    const tokenA = await createAuthToken(USER_A_ID);

    const loadProfileSpy = vi.spyOn(profileService, 'loadProfile').mockResolvedValue({
      profile: null,
      notifications: null,
      stats: {
        totalMinutes365: 0,
        totalSessions365: 0,
        totalLogins365: 0,
        activeDays365: 0,
        currentStreakDays: 0,
      },
      achievements: [],
      heatmap: [],
    });

    await request(app)
      .get('/api/profile/load')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(loadProfileSpy).toHaveBeenCalledWith(USER_A_ID);
  });

  it('profile save ignores spoofed user ids in the payload', async () => {
    const tokenA = await createAuthToken(USER_A_ID);

    const saveProfileSpy = vi.spyOn(profileService, 'saveProfile').mockResolvedValue({
      displayName: 'Alice',
      email: 'alice@example.com',
      avatarIcon: 'brain',
      avatarUrl: null,
      theme: 'dark',
      language: 'pt',
      density: 'normal',
      preferredPeriod: 'morning',
      updatedAt: null,
    });

    await request(app)
      .post('/api/profile/save')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        userId: USER_B_ID,
        displayName: 'Alice',
        theme: 'dark',
      })
      .expect(200);

    expect(saveProfileSpy).toHaveBeenCalledWith(USER_A_ID, {
      displayName: 'Alice',
      theme: 'dark',
    });
  });

  it('onboarding save uses the authenticated user even when the body mentions another user', async () => {
    const tokenA = await createAuthToken(USER_A_ID);

    const mergeSpy = vi.spyOn(onboardingService, 'mergeAndSaveStreak').mockResolvedValue({
      streakDays: 5,
      streakLastDay: '2026-03-31',
    });

    await request(app)
      .post('/api/onboarding/save')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        userId: USER_B_ID,
        streakDays: 5,
        streakLastDay: '2026-03-31',
      })
      .expect(200);

    expect(mergeSpy).toHaveBeenCalledWith({
      userId: USER_A_ID,
      incomingDays: 5,
      incomingLastDay: '2026-03-31',
    });
  });

  it('ranking end session never accepts a cross-tenant user id from the request body', async () => {
    const tokenA = await createAuthToken(USER_A_ID);

    const endSessionSpy = vi.spyOn(rankingService, 'endSession').mockImplementationOnce(async (input) => {
      expect(input.userId).toBe(USER_A_ID);
      return { durationMin: 30, eligible: true };
    });

    await request(app)
      .post('/api/ranking/sessions/end')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        userId: USER_B_ID,
        started_at: '2026-03-17T10:00:00Z',
        ended_at: '2026-03-17T10:30:00Z',
        category: 'REP-ENEM',
        camera_on: false,
      })
      .expect(200);

    expect(endSessionSpy).toHaveBeenCalled();
  });

  it('ranking me resolves the snapshot for the caller only', async () => {
    const tokenA = await createAuthToken(USER_A_ID);

    const getMeSpy = vi.spyOn(rankingService, 'getMe').mockResolvedValue({
      period: 'weekly',
      refDate: '2026-03-17',
      position_global: 100,
      percentile_global: 45,
      position_category: 10,
      percentile_category: 60,
      total_users_global: 10000,
      total_users_category: 500,
      total_valid_min: 300,
      formatted_time: '5:00:00',
      now_studying: 42,
    });

    await request(app)
      .get('/api/ranking/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ period: 'weekly' })
      .expect(200);

    expect(getMeSpy).toHaveBeenCalledWith(USER_A_ID, 'weekly');
  });
});
