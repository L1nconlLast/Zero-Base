import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock do Supabase client ──────────────────────────────────
const mockInsert = vi.fn();
const mockSelectAfterInsert = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockDelete = vi.fn();
const mockDeleteEq = vi.fn();
const mockRpc = vi.fn();

vi.mock('../services/supabase.client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: () => ({
      insert: (...args: unknown[]) => {
        mockInsert(...args);
        return {
          select: (...selArgs: unknown[]) => {
            mockSelectAfterInsert(...selArgs);
            return {
              single: () => mockSingle(),
            };
          },
        };
      },
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return {
              order: (...orderArgs: unknown[]) => mockOrder(...orderArgs),
            };
          },
        };
      },
      delete: () => {
        mockDelete();
        return {
          eq: (...eqArgs: unknown[]) => mockDeleteEq(...eqArgs),
        };
      },
    }),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { sessionService } from '../services/session.service';

// ─────────────────────────────────────────────────────────────
describe('sessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── listByUser ────────────────────────────────────────────
  describe('listByUser', () => {
    it('retorna sessões do usuário mapeadas', async () => {
      const rows = [
        {
          id: 's-1',
          user_id: 'u1',
          date: '2026-02-20',
          minutes: 30,
          points: 300,
          subject: 'anatomy',
          duration: 1800,
          method_id: 'pomodoro',
          goal_met: true,
          timestamp: '2026-02-20T10:00:00Z',
          created_at: '2026-02-20T10:30:00Z',
        },
      ];
      mockOrder.mockResolvedValue({ data: rows, error: null });

      const result = await sessionService.listByUser('u1');

      expect(result).toEqual([
        {
          date: '2026-02-20',
          minutes: 30,
          points: 300,
          subject: 'anatomy',
          duration: 1800,
          methodId: 'pomodoro',
          goalMet: true,
          timestamp: '2026-02-20T10:00:00Z',
        },
      ]);
    });

    it('lança erro quando Supabase falha', async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'Timeout' },
      });

      await expect(sessionService.listByUser('u1')).rejects.toThrow(
        'Erro ao buscar sessões: Timeout',
      );
    });
  });

  // ── create ────────────────────────────────────────────────
  describe('create', () => {
    it('cria sessão e retorna dados mapeados', async () => {
      const returnedRow = {
        id: 's-new',
        user_id: 'u1',
        date: '2026-02-26',
        minutes: 45,
        points: 450,
        subject: 'Fisiologia',
        duration: 2700,
        method_id: null,
        goal_met: null,
        timestamp: null,
        created_at: '2026-02-26T12:00:00Z',
      };
      mockSingle.mockResolvedValue({ data: returnedRow, error: null });

      const result = await sessionService.create('u1', {
        date: '2026-02-26',
        minutes: 45,
        points: 450,
        subject: 'Fisiologia',
        duration: 2700,
      });

      expect(result.subject).toBe('Fisiologia');
      expect(result.minutes).toBe(45);
      expect(result.methodId).toBeUndefined();
    });

    it('lança erro quando insert falha', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Duplicate' },
      });

      await expect(
        sessionService.create('u1', {
          date: '2026-02-26',
          minutes: 10,
          points: 100,
          subject: 'Anatomia',
          duration: 600,
        }),
      ).rejects.toThrow('Erro ao criar sessão: Duplicate');
    });
  });

  // ── createServerSide ──────────────────────────────────────
  describe('createServerSide', () => {
    it('chama RPC award_session_xp e retorna resultado', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          points: 300,
          total_points: 5000,
          level: 8,
        },
        error: null,
      });

      const result = await sessionService.createServerSide(
        'u1',
        30,
        'anatomy',
        'pomodoro',
      );

      expect(result).toEqual({
        success: true,
        points: 300,
        totalPoints: 5000,
        level: 8,
        error: undefined,
      });
      expect(mockRpc).toHaveBeenCalledWith('award_session_xp', {
        p_user_id: 'u1',
        p_minutes: 30,
        p_subject: 'anatomy',
        p_method_id: 'pomodoro',
        p_session_date: expect.any(String),
      });
    });

    it('lança erro quando RPC falha', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Anti-cheat: too many hours' },
      });

      await expect(
        sessionService.createServerSide('u1', 999, 'anatomy'),
      ).rejects.toThrow('Erro ao registrar sessão server-side: Anti-cheat: too many hours');
    });

    it('retorna success=false do servidor', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: false,
          error: 'Daily limit exceeded',
        },
        error: null,
      });

      const result = await sessionService.createServerSide('u1', 50, 'bio');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Daily limit exceeded');
    });
  });

  // ── deleteAllByUser ───────────────────────────────────────
  describe('deleteAllByUser', () => {
    it('deleta todas as sessões do usuário', async () => {
      mockDeleteEq.mockResolvedValue({ error: null });

      await expect(
        sessionService.deleteAllByUser('u1'),
      ).resolves.toBeUndefined();

      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockDeleteEq).toHaveBeenCalledWith('user_id', 'u1');
    });

    it('lança erro quando delete falha', async () => {
      mockDeleteEq.mockResolvedValue({
        error: { message: 'RLS violation' },
      });

      await expect(sessionService.deleteAllByUser('u1')).rejects.toThrow(
        'Erro ao limpar sessões: RLS violation',
      );
    });
  });
});
