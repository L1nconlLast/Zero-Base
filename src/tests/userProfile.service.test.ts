import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock do Supabase client ──────────────────────────────────
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpsert = vi.fn();
const mockRpc = vi.fn();

vi.mock('../services/supabase.client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return {
              maybeSingle: () => mockMaybeSingle(),
            };
          },
        };
      },
      upsert: (...args: unknown[]) => mockUpsert(...args),
    }),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { userProfileService } from '../services/userProfile.service';

// ─────────────────────────────────────────────────────────────
describe('userProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── get ───────────────────────────────────────────────────
  describe('get', () => {
    it('retorna perfil mapeado com sucesso', async () => {
      const row = {
        user_id: 'u1',
        total_points: 1500,
        level: 5,
        current_streak: 3,
        best_streak: 10,
        daily_goal: 60,
        week_progress: { mon: 45 },
        updated_at: '2026-02-26T00:00:00Z',
      };
      mockMaybeSingle.mockResolvedValue({ data: row, error: null });

      const result = await userProfileService.get('u1');

      expect(result).toEqual({
        totalPoints: 1500,
        level: 5,
        currentStreak: 3,
        bestStreak: 10,
        dailyGoal: 60,
        weekProgress: { mon: 45 },
        updatedAt: '2026-02-26T00:00:00Z',
      });
    });

    it('retorna null quando perfil não existe', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await userProfileService.get('u-inexistente');

      expect(result).toBeNull();
    });

    it('lança erro quando Supabase falha', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Internal error' },
      });

      await expect(userProfileService.get('u1')).rejects.toThrow(
        'Erro ao buscar perfil: Internal error',
      );
    });

    it('trata week_progress nulo como objeto vazio', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: {
          user_id: 'u1',
          total_points: 0,
          level: 1,
          current_streak: 0,
          best_streak: 0,
          daily_goal: 30,
          week_progress: null,
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      });

      const result = await userProfileService.get('u1');
      expect(result?.weekProgress).toEqual({});
    });
  });

  // ── upsert ────────────────────────────────────────────────
  describe('upsert', () => {
    it('faz upsert com campos parciais', async () => {
      mockUpsert.mockResolvedValue({ error: null });

      await userProfileService.upsert('u1', {
        totalPoints: 200,
        level: 3,
      });

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      const payload = mockUpsert.mock.calls[0][0];
      expect(payload.user_id).toBe('u1');
      expect(payload.total_points).toBe(200);
      expect(payload.level).toBe(3);
      expect(payload.updated_at).toBeDefined();
    });

    it('mapeia weekProgress para week_progress', async () => {
      mockUpsert.mockResolvedValue({ error: null });

      await userProfileService.upsert('u1', {
        weekProgress: { tue: { studied: true, minutes: 120 } },
      });

      const payload = mockUpsert.mock.calls[0][0];
      expect(payload.week_progress).toEqual({ tue: { studied: true, minutes: 120 } });
    });

    it('lança erro quando Supabase falha no upsert', async () => {
      mockUpsert.mockResolvedValue({
        error: { message: 'Unique constraint' },
      });

      await expect(
        userProfileService.upsert('u1', { totalPoints: 100 }),
      ).rejects.toThrow('Erro ao salvar perfil: Unique constraint');
    });
  });

  // ── recalculate ───────────────────────────────────────────
  describe('recalculate', () => {
    it('chama RPC recalculate_user_profile', async () => {
      mockRpc.mockResolvedValue({ error: null });

      await userProfileService.recalculate('u1');

      expect(mockRpc).toHaveBeenCalledWith('recalculate_user_profile', {
        p_user_id: 'u1',
      });
    });

    it('lança erro quando RPC falha', async () => {
      mockRpc.mockResolvedValue({
        error: { message: 'Function not found' },
      });

      await expect(userProfileService.recalculate('u1')).rejects.toThrow(
        'Erro ao recalcular perfil: Function not found',
      );
    });
  });
});
