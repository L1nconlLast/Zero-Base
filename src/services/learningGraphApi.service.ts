import { supabase } from './supabase.client';

export interface LearningGraphDiscipline {
  id: string;
  nome: string;
  modalidade_id?: string;
}

export interface LearningGraphTopic {
  id: string;
  nome: string;
  descricao?: string | null;
  disciplina_id: string;
  nivel_dificuldade?: string | null;
  ordem?: number | null;
}

export interface LearningGraphPrerequisiteEdge {
  topico_id: string;
  prerequisito_id: string;
  mastery_required: number;
}

export type LearningProgressStatus = 'locked' | 'available' | 'studying' | 'completed' | 'review';

export interface LearningGraphUserProgress {
  topico_id: string;
  status: LearningProgressStatus;
  pontuacao?: number | null;
  tempo_estudo_min?: number | null;
  tentativas?: number | null;
  atualizado_em?: string;
  topicos?: {
    id: string;
    nome: string;
    disciplina_id: string;
  } | null;
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

  async listTopics(disciplineId?: string, timeoutMs = 15000): Promise<LearningGraphTopic[]> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = new URL(`${this.baseEndpoint}/topics`, window.location.origin);
      if (disciplineId) {
        url.searchParams.set('disciplinaId', disciplineId);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Falha ao listar topicos (${response.status}).`);
      }

      const data = (await response.json()) as { topics?: LearningGraphTopic[] };
      return data.topics || [];
    } finally {
      window.clearTimeout(timer);
    }
  }

  async listPrerequisiteEdges(disciplineId?: string, timeoutMs = 15000): Promise<LearningGraphPrerequisiteEdge[]> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = new URL(`${this.baseEndpoint}/prerequisite-edges`, window.location.origin);
      if (disciplineId) {
        url.searchParams.set('disciplinaId', disciplineId);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Falha ao listar arestas de prerequisito (${response.status}).`);
      }

      const data = (await response.json()) as { edges?: LearningGraphPrerequisiteEdge[] };
      return data.edges || [];
    } finally {
      window.clearTimeout(timer);
    }
  }

  async getUserProgress(disciplineId?: string, timeoutMs = 15000): Promise<LearningGraphUserProgress[]> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('Sessao invalida. Faca login novamente.');
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = new URL(`${this.baseEndpoint}/progress`, window.location.origin);
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
        throw new Error(`Falha ao buscar progresso (${response.status}).`);
      }

      const data = (await response.json()) as { progress?: LearningGraphUserProgress[] };
      return data.progress || [];
    } finally {
      window.clearTimeout(timer);
    }
  }

  async updateTopicProgress(payload: {
    topicId: string;
    status: LearningProgressStatus;
    score?: number;
    studyMinutes?: number;
    attemptsDelta?: number;
  }): Promise<LearningGraphUserProgress | null> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('Sessao invalida. Faca login novamente.');
    }

    const response = await fetch(`${this.baseEndpoint}/progress`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Falha ao atualizar progresso (${response.status}).`);
    }

    const data = (await response.json()) as { progress?: LearningGraphUserProgress | null };
    return data.progress || null;
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
