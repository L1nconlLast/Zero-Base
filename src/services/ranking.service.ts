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
}

export const rankingService = new RankingService();
