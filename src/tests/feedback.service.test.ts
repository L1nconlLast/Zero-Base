import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock do Supabase client ──────────────────────────────────
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock('../services/supabase.client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: () => ({
      insert: (...args: unknown[]) => mockInsert(...args),
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return {
              order: (...orderArgs: unknown[]) => {
                mockOrder(...orderArgs);
                return {
                  limit: (...limitArgs: unknown[]) => mockLimit(...limitArgs),
                };
              },
            };
          },
        };
      },
    }),
  },
}));

import { feedbackService } from '../services/feedback.service';

// ─────────────────────────────────────────────────────────────
describe('feedbackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── submit ────────────────────────────────────────────────
  describe('submit', () => {
    it('envia feedback com sucesso', async () => {
      mockInsert.mockResolvedValue({ error: null });

      await expect(
        feedbackService.submit('user-1', {
          type: 'bug',
          message: 'Botão não funciona',
          page: 'dashboard',
          rating: 3,
        }),
      ).resolves.toBeUndefined();

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-1',
        type: 'bug',
        message: 'Botão não funciona',
        page: 'dashboard',
        rating: 3,
      });
    });

    it('envia feedback sem campos opcionais', async () => {
      mockInsert.mockResolvedValue({ error: null });

      await feedbackService.submit('user-2', {
        type: 'feature',
        message: 'Quero dark mode',
      });

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-2',
        type: 'feature',
        message: 'Quero dark mode',
        page: null,
        rating: null,
      });
    });

    it('lança erro quando Supabase retorna erro', async () => {
      mockInsert.mockResolvedValue({
        error: { message: 'Row too large' },
      });

      await expect(
        feedbackService.submit('user-1', {
          type: 'elogio',
          message: 'Ótimo app!',
        }),
      ).rejects.toThrow('Erro ao enviar feedback: Row too large');
    });
  });

  // ── listByUser ────────────────────────────────────────────
  describe('listByUser', () => {
    it('retorna lista de feedback do usuário', async () => {
      const mockData = [
        {
          id: 'fb-1',
          user_id: 'user-1',
          type: 'bug',
          message: 'Erro X',
          page: null,
          rating: null,
          created_at: '2026-01-01',
        },
      ];
      mockLimit.mockResolvedValue({ data: mockData, error: null });

      const result = await feedbackService.listByUser('user-1');

      expect(result).toEqual(mockData);
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('retorna array vazio quando sem dados', async () => {
      mockLimit.mockResolvedValue({ data: null, error: null });

      const result = await feedbackService.listByUser('user-1');

      expect(result).toEqual([]);
    });

    it('lança erro quando Supabase falha', async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: 'Connection lost' },
      });

      await expect(feedbackService.listByUser('user-1')).rejects.toThrow(
        'Erro ao buscar feedback: Connection lost',
      );
    });
  });
});
