/**
 * ranking.integration.test.ts
 *
 * Testes de integração para os endpoints de ranking.
 * Requer database (Supabase) ser mock via vi.spyOn na rankingService.
 */

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import { app } from '../app';
import { rankingService } from '../services/ranking.service';

const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';

const createAuthToken = async (userId = TEST_USER_ID): Promise<string> => {
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
  process.env.WORKER_SECRET = 'worker-secret-123';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ranking API', () => {
  describe('POST /api/ranking/sessions/start', () => {
    it('inicia sessão com categoria válida', async () => {
      const token = await createAuthToken();
      const startedAt = new Date().toISOString();

      vi.spyOn(rankingService, 'startSession').mockResolvedValue({
        startedAt,
        active: true,
      });

      const response = await request(app)
        .post('/api/ranking/sessions/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ category: 'REP-ENEM', camera_on: true })
        .expect(200);

      expect(response.body).toEqual({ ok: true, data: { startedAt, active: true }, requestId: expect.any(String) });
    });

    it('rejeita sem autenticação', async () => {
      const response = await request(app)
        .post('/api/ranking/sessions/start')
        .send({ category: 'REP-ENEM', camera_on: false })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejeita categoria inválida', async () => {
      const token = await createAuthToken();

      const response = await request(app)
        .post('/api/ranking/sessions/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ category: 'INVALID_CATEGORY', camera_on: false })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/ranking/sessions/end', () => {
    it('encerra sessão com tempos válidos', async () => {
      const token = await createAuthToken();
      const startedAt = new Date(Date.now() - 1800_000).toISOString(); // 30 min atrás
      const endedAt   = new Date().toISOString();

      vi.spyOn(rankingService, 'endSession').mockResolvedValue({
        durationMin: 30,
        eligible:    true,
      });

      const response = await request(app)
        .post('/api/ranking/sessions/end')
        .set('Authorization', `Bearer ${token}`)
        .send({
          started_at: startedAt,
          ended_at:   endedAt,
          category:   'EM3-ENEM',
          camera_on:  false,
        })
        .expect(200);

      expect(response.body.data).toEqual({
        durationMin: 30,
        eligible:    true,
      });
    });

    it('rejeita ended_at antes de started_at', async () => {
      const token = await createAuthToken();
      const endedAt   = new Date(Date.now() - 1800_000).toISOString();
      const startedAt = new Date().toISOString();

      const response = await request(app)
        .post('/api/ranking/sessions/end')
        .set('Authorization', `Bearer ${token}`)
        .send({
          started_at: startedAt,
          ended_at:   endedAt,
          category:   'REP-ITA/IME',
          camera_on:  false,
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('retorna ineligível se sessão > 9h', async () => {
      const token = await createAuthToken();
      const startedAt = new Date(Date.now() - 540 * 60 * 1000).toISOString(); // 9h atrás
      const endedAt   = new Date().toISOString();

      vi.spyOn(rankingService, 'endSession').mockResolvedValue({
        durationMin: 546,
        eligible:    false,
        reason:      'Sessão contínua acima de 9 horas não conta para o ranking.',
      });

      const response = await request(app)
        .post('/api/ranking/sessions/end')
        .set('Authorization', `Bearer ${token}`)
        .send({
          started_at: startedAt,
          ended_at:   endedAt,
          category:   'Graduação',
          camera_on:  true,
        })
        .expect(200);

      expect(response.body.data.eligible).toBe(false);
      expect(response.body.data.reason).toContain('9 horas');
    });
  });

  describe('GET /api/ranking — lista pública', () => {
    it('retorna ranking geral paginado', async () => {
      vi.spyOn(rankingService, 'getList').mockResolvedValue({
        period:      'weekly',
        ref_date:    '2026-03-16',
        top3: [
          { user_id: 'user-1', position: 1, percentile_global: 100, total_valid_min: 600, formatted_time: '10:00:00' },
          { user_id: 'user-2', position: 2, percentile_global: 95, total_valid_min: 550, formatted_time: '9:10:00' },
          { user_id: 'user-3', position: 3, percentile_global: 90, total_valid_min: 500, formatted_time: '8:20:00' },
        ],
        list: [],
        total:        1000,
        page:         1,
        limit:        50,
        now_studying: 42,
      });

      const response = await request(app)
        .get('/api/ranking')
        .query({ period: 'weekly', page: 1, limit: 50 })
        .expect(200);

      expect(response.body.data.top3).toHaveLength(3);
      expect(response.body.data.period).toBe('weekly');
      expect(response.body.data.now_studying).toBe(42);
    });

    it('filtra por categoria', async () => {
      vi.spyOn(rankingService, 'getList').mockResolvedValue({
        period:      'daily',
        ref_date:    '2026-03-17',
        top3: [{ user_id: 'user-1', position: 1, percentile_global: 95, total_valid_min: 300, formatted_time: '5:00:00' }],
        list: [],
        total:       500,
        page:        1,
        limit:       50,
        now_studying: 0,
      });

      const response = await request(app)
        .get('/api/ranking')
        .query({ period: 'daily', category: 'REP-ENEM', page: 1, limit: 50 })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(rankingService.getList).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'REP-ENEM' }),
      );
    });
  });

  describe('GET /api/ranking/me', () => {
    it('retorna meu ranking com rate limit', async () => {
      const token = await createAuthToken();

      vi.spyOn(rankingService, 'getMe').mockResolvedValue({
        period:             'weekly',
        refDate:            '2026-03-16',
        position_global:    152,
        percentile_global:  42,
        position_category:  15,
        percentile_category: 87,
        total_users_global: 5000,
        total_users_category: 200,
        total_valid_min:    450,
        formatted_time:     '7:30:00',
        now_studying:       42,
      });

      const response = await request(app)
        .get('/api/ranking/me')
        .query({ period: 'weekly' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toEqual({
        period:             'weekly',
        refDate:            '2026-03-16',
        position_global:    152,
        percentile_global:  42,
        position_category:  15,
        percentile_category: 87,
        total_users_global: 5000,
        total_users_category: 200,
        total_valid_min:    450,
        formatted_time:     '7:30:00',
        now_studying:       42,
      });
    });

    it('rate limits: apenas 1 req a cada 10s', async () => {
      const token = await createAuthToken('22222222-2222-4222-8222-222222222222');

      vi.spyOn(rankingService, 'getMe').mockResolvedValue({
        period: 'weekly',
        refDate: '2026-03-16',
        position_global: 1,
        percentile_global: 100,
        position_category: 1,
        percentile_category: 100,
        total_users_global: 100,
        total_users_category: 10,
        total_valid_min: 500,
        formatted_time: '8:20:00',
        now_studying: 1,
      });

      // Primeira requisição: OK
      await request(app)
        .get('/api/ranking/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Segunda requisição imediata: Rate limited
      await request(app)
        .get('/api/ranking/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(429);
    });
  });

  describe('GET /api/ranking/now-studying', () => {
    it('retorna count de usuários estudando agora', async () => {
      vi.spyOn(rankingService, 'getNowStudying').mockResolvedValue(123);

      const response = await request(app)
        .get('/api/ranking/now-studying')
        .expect(200);

      expect(response.body.data.now_studying).toBe(123);
    });
  });

  describe('POST /api/ranking/recalculate — worker', () => {
    it('recalcula snapshot com worker secret válido', async () => {
      vi.spyOn(rankingService, 'recalculate').mockResolvedValue({
        period:    'weekly',
        refDate:   '2026-03-16',
        durationMs: 850,
        rows:       5000,
      });

      const response = await request(app)
        .post('/api/ranking/recalculate')
        .set('x-worker-secret', 'worker-secret-123')
        .send({
          period:   'weekly',
          ref_date: '2026-03-16',
        })
        .expect(200);

      expect(response.body.data.rows).toBe(5000);
      expect(response.body.data.durationMs).toBeLessThan(10000);
    });

    it('rejeita sem worker secret', async () => {
      const response = await request(app)
        .post('/api/ranking/recalculate')
        .send({ period: 'daily' })
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejeita com worker secret inválido', async () => {
      const response = await request(app)
        .post('/api/ranking/recalculate')
        .set('x-worker-secret', 'wrong-secret')
        .send({ period: 'daily' })
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('categoria enum validation', () => {
    const validCategories = ['REP-ENEM', 'EM3-ENEM', 'REP-ITA/IME', 'Graduação', 'Outros'];

    validCategories.forEach((cat) => {
      it(`aceita categoria válida: ${cat}`, async () => {
        const token = await createAuthToken();

        vi.spyOn(rankingService, 'startSession').mockResolvedValue({
          startedAt: new Date().toISOString(),
          active: true,
        });

        const response = await request(app)
          .post('/api/ranking/sessions/start')
          .set('Authorization', `Bearer ${token}`)
          .send({ category: cat, camera_on: false })
          .expect(200);

        expect(response.body.ok).toBe(true);
      });
    });
  });
});
