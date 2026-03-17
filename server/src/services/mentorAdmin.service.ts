import { createClient } from '@supabase/supabase-js';

interface UsageRow {
  user_id: string;
  total_tokens: number;
  created_at: string;
}

interface RawUsageRow {
  user_id: string;
  request_id?: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  created_at: string;
}

export interface MentorAdminMetrics {
  kpis: {
    totalRequests: number;
    totalTokens: number;
    estimatedCostUsd: number;
    costPerMillionTokensUsd: number;
  };
  trend: Array<{
    date: string;
    totalTokens: number;
    totalRequests: number;
  }>;
  topUsers: Array<{
    userId: string;
    totalTokens: number;
    totalRequests: number;
  }>;
}

const COST_PER_MILLION_TOKENS_USD = 0.15;

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

const formatDay = (date: Date): string => date.toISOString().slice(0, 10);

const estimateCost = (totalTokens: number): number => {
  const cost = (totalTokens / 1_000_000) * COST_PER_MILLION_TOKENS_USD;
  return Number(cost.toFixed(6));
};

export const parsePeriod = (period: string): { startDate: string; trendDays: number } => {
  const now = new Date();
  let startDate: Date;
  let trendDays = 15;

  switch (period) {
    case '7d':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      trendDays = 7;
      break;
    case '15d':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 15);
      trendDays = 15;
      break;
    case 'current_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        trendDays = daysInMonth;
      }
      break;
    case '30d':
    default:
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      trendDays = 30;
      break;
  }

  startDate.setHours(0, 0, 0, 0);
  return { startDate: startDate.toISOString(), trendDays };
};

class MentorAdminService {
  private ensureClient() {
    if (!supabase) {
      throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY nao configurados.');
    }
    return supabase;
  }

  async getMetrics(period: string = '30d'): Promise<MentorAdminMetrics> {
    const client = this.ensureClient();
    const { startDate, trendDays } = parsePeriod(period);

    const kpiResult = await client
      .from('mentor_token_usage')
      .select('user_id,total_tokens,created_at')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    if (kpiResult.error) {
      throw new Error(`Falha ao carregar KPIs: ${kpiResult.error.message}`);
    }

    const trendResult = await client
      .from('mentor_token_usage')
      .select('user_id,total_tokens,created_at')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    if (trendResult.error) {
      throw new Error(`Falha ao carregar tendencia: ${trendResult.error.message}`);
    }

    const topUsersResult = await client
      .from('mentor_token_usage')
      .select('user_id,total_tokens,created_at')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    if (topUsersResult.error) {
      throw new Error(`Falha ao carregar top usuarios: ${topUsersResult.error.message}`);
    }

    const kpiRows = (kpiResult.data || []) as UsageRow[];
    const trendRows = (trendResult.data || []) as UsageRow[];
    const topRows = (topUsersResult.data || []) as UsageRow[];

    const totalRequests = kpiRows.length;
    const totalTokens = kpiRows.reduce((sum, row) => sum + (row.total_tokens || 0), 0);

    const now = new Date();
    const trendStart = new Date(now);
    trendStart.setDate(now.getDate() - (trendDays - 1));
    trendStart.setHours(0, 0, 0, 0);

    const trendMap = new Map<string, { totalTokens: number; totalRequests: number }>();

    for (let i = 0; i < trendDays; i += 1) {
      const day = new Date(trendStart);
      day.setDate(trendStart.getDate() + i);
      trendMap.set(formatDay(day), { totalTokens: 0, totalRequests: 0 });
    }

    trendRows.forEach((row) => {
      const day = row.created_at.slice(0, 10);
      const current = trendMap.get(day);
      if (!current) return;

      current.totalTokens += row.total_tokens || 0;
      current.totalRequests += 1;
      trendMap.set(day, current);
    });

    const trend = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      totalTokens: data.totalTokens,
      totalRequests: data.totalRequests,
    }));

    const byUser = new Map<string, { totalTokens: number; totalRequests: number }>();

    topRows.forEach((row) => {
      const key = row.user_id;
      const current = byUser.get(key) || { totalTokens: 0, totalRequests: 0 };
      current.totalTokens += row.total_tokens || 0;
      current.totalRequests += 1;
      byUser.set(key, current);
    });

    const topUsers = Array.from(byUser.entries())
      .map(([userId, data]) => ({
        userId,
        totalTokens: data.totalTokens,
        totalRequests: data.totalRequests,
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 5);

    return {
      kpis: {
        totalRequests,
        totalTokens,
        estimatedCostUsd: estimateCost(totalTokens),
        costPerMillionTokensUsd: COST_PER_MILLION_TOKENS_USD,
      },
      trend,
      topUsers,
    };
  }

  async getExportCsv(period: string = '30d'): Promise<string> {
    const client = this.ensureClient();
    const { startDate } = parsePeriod(period);

    const { data, error } = await client
      .from('mentor_token_usage')
      .select('request_id,user_id,model,prompt_tokens,completion_tokens,total_tokens,created_at')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Falha ao exportar dados: ${error.message}`);
    }

    const rows = (data || []) as RawUsageRow[];

    const headers = ['Data', 'Request ID', 'User ID', 'Modelo', 'Prompt Tokens', 'Completion Tokens', 'Total Tokens'];
    const csvRows = rows.map((row) => {
      const dataFormatada = new Date(row.created_at).toLocaleString('pt-BR');
      const requestId = row.request_id || 'N/A';
      return `"${dataFormatada}","${requestId}","${row.user_id}","${row.model}",${row.prompt_tokens},${row.completion_tokens},${row.total_tokens}`;
    });

    return [headers.join(','), ...csvRows].join('\n');
  }
}

export const mentorAdminService = new MentorAdminService();
