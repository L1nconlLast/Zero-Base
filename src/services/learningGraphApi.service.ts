import { supabase } from './supabase.client';

export interface LearningGraphDiscipline {
  id: string;
  nome: string;
  modalidade_id?: string;
}

export interface LearningGraphNextTopic {
  topic_id: string;
  topic_nome: string;
  discipline_id: string;
  discipline_nome: string;
  difficulty: string;
  score: number;
}

class LearningGraphApiService {
  private readonly baseEndpoint = '/api/learning-graph';

  private async getAccessToken(): Promise<string | null> {
    const session = await supabase?.auth.getSession();
    return session?.data?.session?.access_token || null;
  }

  async listDisciplines(timeoutMs = 15000): Promise<LearningGraphDiscipline[]> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseEndpoint}/disciplines`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Falha ao listar disciplinas (${response.status}).`);
      }

      const data = (await response.json()) as { disciplines?: LearningGraphDiscipline[] };
      return data.disciplines || [];
    } finally {
      window.clearTimeout(timer);
    }
  }

  async getNextTopic(disciplineId?: string, timeoutMs = 15000): Promise<LearningGraphNextTopic | null> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('Sessao invalida. Faca login novamente.');
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = new URL(`${this.baseEndpoint}/next-topic`, window.location.origin);
      if (disciplineId) {
        url.searchParams.set('disciplinaId', disciplineId);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Falha ao buscar recomendacao (${response.status}).`);
      }

      const data = (await response.json()) as { nextTopic?: LearningGraphNextTopic | null };
      return data.nextTopic || null;
    } finally {
      window.clearTimeout(timer);
    }
  }
}

export const learningGraphApiService = new LearningGraphApiService();
