import { supabase } from './supabase.client';

export interface MentorAdminMetricsResponse {
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

class MentorAdminApiService {
  private readonly endpoint = '/api/admin/mentor-metrics';

  async getMetrics(timeoutMs = 15000): Promise<MentorAdminMetricsResponse> {
    const session = await supabase?.auth.getSession();
    const accessToken = session?.data?.session?.access_token;

    if (!accessToken) {
      throw new Error('Sessao invalida. Faca login novamente.');
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (response.status === 403) {
        throw new Error('Acesso restrito: apenas administradores.');
      }

      if (!response.ok) {
        throw new Error(`Falha ao carregar dashboard (${response.status}).`);
      }

      const data = (await response.json()) as MentorAdminMetricsResponse;
      return data;
    } finally {
      window.clearTimeout(timer);
    }
  }
}

export const mentorAdminApiService = new MentorAdminApiService();
