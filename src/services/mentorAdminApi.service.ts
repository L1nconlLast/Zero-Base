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
  private readonly metricsEndpoint = '/api/admin/mentor-metrics';
  private readonly exportEndpoint = '/api/admin/mentor-metrics/export';

  async getMetrics(period: string = '30d', timeoutMs = 15000): Promise<MentorAdminMetricsResponse> {
    const session = await supabase?.auth.getSession();
    const accessToken = session?.data?.session?.access_token;

    if (!accessToken) {
      throw new Error('Sessao invalida. Faca login novamente.');
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = new URL(this.metricsEndpoint, window.location.origin);
      url.searchParams.set('period', period);

      const response = await fetch(url.toString(), {
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

  async exportCsv(period: string = '30d'): Promise<void> {
    const session = await supabase?.auth.getSession();
    const accessToken = session?.data?.session?.access_token;

    if (!accessToken) {
      throw new Error('Sessao invalida. Faca login novamente.');
    }

    const url = new URL(this.exportEndpoint, window.location.origin);
    url.searchParams.set('period', period);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 403) {
      throw new Error('Acesso restrito: apenas administradores.');
    }

    if (!response.ok) {
      throw new Error(`Falha ao exportar dados (${response.status}).`);
    }

    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `mentor_usage_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}

export const mentorAdminApiService = new MentorAdminApiService();
