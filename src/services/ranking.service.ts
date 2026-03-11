import { isSupabaseConfigured, supabase } from './supabase.client';
import type { RankingPeriod, RankingRow } from '../types/social';

interface RankingRowDb {
  id: string;
  user_id: string;
  group_id: string | null;
  period: RankingPeriod;
  period_start: string;
  period_end: string;
  total_points: number;
  rank_position: number | null;
  updated_at: string;
}

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado.');
  }

  return supabase;
};

const toRankingRow = (row: RankingRowDb): RankingRow => ({
  id: row.id,
  userId: row.user_id,
  groupId: row.group_id,
  period: row.period,
  periodStart: row.period_start,
  periodEnd: row.period_end,
  totalPoints: row.total_points,
  rankPosition: row.rank_position,
  updatedAt: row.updated_at,
});

class RankingService {
  async listRanking(params: {
    period: RankingPeriod;
    periodStart: string;
    periodEnd: string;
    groupId?: string;
    limit?: number;
  }): Promise<RankingRow[]> {
    const client = assertClient();

    let query = client
      .from('rankings_periodic')
      .select('*')
      .eq('period', params.period)
      .eq('period_start', params.periodStart)
      .eq('period_end', params.periodEnd)
      .order('total_points', { ascending: false })
      .limit(params.limit || 50);

    if (params.groupId) {
      query = query.eq('group_id', params.groupId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao listar ranking: ${error.message}`);
    }

    return ((data || []) as RankingRowDb[]).map(toRankingRow);
  }

  async upsertUserRanking(payload: {
    userId: string;
    period: RankingPeriod;
    periodStart: string;
    periodEnd: string;
    totalPoints: number;
    groupId?: string | null;
    rankPosition?: number | null;
  }): Promise<void> {
    const client = assertClient();

    const { error } = await client.from('rankings_periodic').upsert(
      {
        user_id: payload.userId,
        period: payload.period,
        period_start: payload.periodStart,
        period_end: payload.periodEnd,
        total_points: payload.totalPoints,
        group_id: payload.groupId || null,
        rank_position: payload.rankPosition || null,
      },
      { onConflict: 'user_id,group_id,period,period_start,period_end' },
    );

    if (error) {
      throw new Error(`Erro ao salvar ranking: ${error.message}`);
    }
  }

  // ============================================================
  // Category-based Global Ranking Methods
  // ============================================================

  async getCategoryRanking(
    category: string,
    limit = 50
  ): Promise<Array<{
    rank_position: number;
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    total_correct: number;
    total_answered: number;
    accuracy: number;
  }>> {
    const client = assertClient();

    try {
      const { data, error } = await client.rpc(
        'get_category_ranking',
        {
          p_category: category,
          p_limit: limit,
        }
      );

      if (error) {
        console.error('Error fetching category ranking:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Unexpected error in getCategoryRanking:', err);
      return [];
    }
  }

  async getUserRankInCategory(
    userId: string,
    category: string
  ): Promise<{
    rank_position: number;
    total_correct: number;
    total_answered: number;
    accuracy: number;
    percentile: number;
  } | null> {
    const client = assertClient();

    try {
      const { data, error } = await client.rpc(
        'get_user_rank_in_category',
        {
          p_user_id: userId,
          p_category: category,
        }
      );

      if (error) {
        console.error('Error fetching user rank:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('Unexpected error in getUserRankInCategory:', err);
      return null;
    }
  }

  async recalculateRankings(category?: string): Promise<boolean> {
    const client = assertClient();

    try {
      const { error } = await client.rpc(
        'recalc_category_ranking',
        {
          p_category: category || null,
        }
      );

      if (error) {
        console.error('Error recalculating rankings:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Unexpected error in recalculateRankings:', err);
      return false;
    }
  }

  async getAllCategories(): Promise<string[]> {
    const client = assertClient();

    try {
      const { data, error } = await client
        .from('user_ranking_global')
        .select('category');

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      const categories = data ? data.map((item: { category: string }) => item.category) : [];
      return Array.from(new Set(categories));
    } catch (err) {
      console.error('Unexpected error in getAllCategories:', err);
      return [];
    }
  }
}

export const rankingService = new RankingService();
