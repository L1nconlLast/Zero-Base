import { isSupabaseConfigured, supabase } from './supabase.client';

interface WeeklyRow {
  week_start: string;
  completed_users: number;
  total_users: number;
  completion_rate: number;
}

interface TopUserRow {
  rank: number;
  user_id: string;
  name: string;
  email: string;
  total_weeks: number;
  current_streak: number;
  max_streak: number;
  consistency_rate: number;
}

interface CohortRow {
  cohort_week: string;
  week_start: string;
  retained_users: number;
}

interface RetentionSummary {
  current_week_completion_rate: number;
  avg_4_weeks_completion_rate: number;
  users_with_3plus_weeks: number;
  active_users_latest_week: number;
}

export interface AdminRetentionDashboard {
  summary: RetentionSummary;
  weekly: WeeklyRow[];
  topUsers: TopUserRow[];
  cohorts: CohortRow[];
}

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY).');
  }

  return supabase;
};

class AdminRetentionService {
  async getDashboard(weeksLimit = 12, topLimit = 10): Promise<AdminRetentionDashboard> {
    const client = assertClient();

    const { data, error } = await client.rpc('admin_get_retention_dashboard', {
      p_weeks_limit: weeksLimit,
      p_top_limit: topLimit,
    });

    if (error) {
      throw new Error(`Erro ao carregar dashboard de retenção: ${error.message}`);
    }

    const payload = data as {
      success?: boolean;
      error?: string;
      summary?: RetentionSummary;
      weekly?: WeeklyRow[];
      top_users?: TopUserRow[];
      cohorts?: CohortRow[];
    } | null;

    if (!payload?.success) {
      if (payload?.error === 'not_authorized') {
        throw new Error('Sem permissão de admin para acessar este painel.');
      }

      throw new Error('Falha ao carregar analytics de retenção.');
    }

    return {
      summary: payload.summary || {
        current_week_completion_rate: 0,
        avg_4_weeks_completion_rate: 0,
        users_with_3plus_weeks: 0,
        active_users_latest_week: 0,
      },
      weekly: payload.weekly || [],
      topUsers: payload.top_users || [],
      cohorts: payload.cohorts || [],
    };
  }

  async refreshRanking(): Promise<number> {
    const client = assertClient();

    const { data, error } = await client.rpc('admin_refresh_consistency_stats');
    if (error) {
      throw new Error(`Erro ao atualizar ranking de consistência: ${error.message}`);
    }

    const payload = data as { success?: boolean; error?: string; updated_users?: number } | null;
    if (!payload?.success) {
      if (payload?.error === 'not_authorized') {
        throw new Error('Sem permissão de admin para atualizar o ranking.');
      }
      throw new Error('Falha ao atualizar ranking de consistência.');
    }

    return payload.updated_users || 0;
  }
}

export const adminRetentionService = new AdminRetentionService();
