import { supabase } from './supabase.client';

export interface LearningGraphDiscipline {
  id: string;
  nome: string;
  modalidade_id?: string;
  modalidades?: { nome?: string } | Array<{ nome?: string }> | null;
}

export interface LearningGraphTopic {
  id: string;
  nome: string;
  descricao?: string | null;
  disciplina_id: string;
  area?: string | null;
  subarea?: string | null;
  tipo_no?: 'topic' | 'subtopic' | null;
  nivel_dificuldade?: string | null;
  ordem?: number | null;
}

export interface LearningGraphPrerequisiteEdge {
  topico_id: string;
  prerequisito_id: string;
  mastery_required: number;
}

export interface LearningGraphNode {
  id: string;
  type: 'discipline' | 'area' | 'topic' | 'subtopic' | string;
  data: {
    label: string;
    topicoId?: string;
    disciplinaId?: string;
    modalidade?: string;
    area?: string | null;
    subarea?: string | null;
    dificuldade?: number | null;
    frequencia_enem?: number | null;
    frequencia_concurso?: number | null;
    tempo_estimado?: number | null;
    status?: LearningProgressStatus;
  };
}

export interface LearningGraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'hierarchy' | 'prerequisite' | 'related' | string;
  data?: {
    mastery_required?: number;
    peso?: number;
  };
}

export interface LearningGraphPayload {
  nodes: LearningGraphNode[];
  edges: LearningGraphEdge[];
  stats?: {
    totalNodes: number;
    totalEdges: number;
    totalTopics: number;
  };
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

  private async parseJsonResponse<T>(response: Response, errorPrefix: string): Promise<T> {
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      const rawBody = await response.text();
      const preview = rawBody.slice(0, 120).replace(/\s+/g, ' ').trim();
      throw new Error(`${errorPrefix} (${response.status}). ${preview || 'Sem detalhes.'}`);
    }

    if (!contentType.toLowerCase().includes('application/json')) {
      const rawBody = await response.text();
      const looksLikeHtml = rawBody.trim().toLowerCase().startsWith('<!doctype') || rawBody.trim().startsWith('<');
      const hint = looksLikeHtml
        ? 'Resposta HTML detectada. Verifique se o endpoint /api/learning-graph esta disponivel em producao.'
        : 'Resposta nao-JSON detectada no endpoint.';
      throw new Error(`${errorPrefix}. ${hint}`);
    }

    return (await response.json()) as T;
  }

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

      const data = await this.parseJsonResponse<{ disciplines?: LearningGraphDiscipline[] }>(
        response,
        'Falha ao listar disciplinas',
      );
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

      const data = await this.parseJsonResponse<{ topics?: LearningGraphTopic[] }>(response, 'Falha ao listar topicos');
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

      const data = await this.parseJsonResponse<{ edges?: LearningGraphPrerequisiteEdge[] }>(
        response,
        'Falha ao listar arestas de prerequisito',
      );
      return data.edges || [];
    } finally {
      window.clearTimeout(timer);
    }
  }

  async getGraph(params?: {
    disciplineId?: string;
    discipline?: string;
    track?: 'enem' | 'concurso';
    search?: string;
    level?: 'iniciante' | 'intermediario' | 'avancado';
    limit?: number;
  }, timeoutMs = 20000): Promise<LearningGraphPayload> {
    const accessToken = await this.getAccessToken();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = new URL(`${this.baseEndpoint}/graph`, window.location.origin);
      if (params?.disciplineId) url.searchParams.set('disciplinaId', params.disciplineId);
      if (params?.discipline) url.searchParams.set('disciplina', params.discipline);
      if (params?.track) url.searchParams.set('track', params.track);
      if (params?.search) url.searchParams.set('search', params.search);
      if (params?.level) url.searchParams.set('level', params.level);
      if (typeof params?.limit === 'number') url.searchParams.set('limit', String(params.limit));

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      return await this.parseJsonResponse<LearningGraphPayload>(response, 'Falha ao carregar grafo completo');
    } finally {
      window.clearTimeout(timer);
    }
  }

  async getSkillTree(params?: {
    disciplineId?: string;
    discipline?: string;
    track?: 'enem' | 'concurso';
    search?: string;
    level?: 'iniciante' | 'intermediario' | 'avancado';
    limit?: number;
  }, timeoutMs = 20000): Promise<LearningGraphPayload> {
    const accessToken = await this.getAccessToken();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = new URL(`${this.baseEndpoint}/skill-tree`, window.location.origin);
      if (params?.disciplineId) url.searchParams.set('disciplinaId', params.disciplineId);
      if (params?.discipline) url.searchParams.set('disciplina', params.discipline);
      if (params?.track) url.searchParams.set('track', params.track);
      if (params?.search) url.searchParams.set('search', params.search);
      if (params?.level) url.searchParams.set('level', params.level);
      if (typeof params?.limit === 'number') url.searchParams.set('limit', String(params.limit));

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      return await this.parseJsonResponse<LearningGraphPayload>(response, 'Falha ao carregar skill tree');
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

      const data = await this.parseJsonResponse<{ progress?: LearningGraphUserProgress[] }>(
        response,
        'Falha ao buscar progresso',
      );
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

    const data = await this.parseJsonResponse<{ progress?: LearningGraphUserProgress | null }>(
      response,
      'Falha ao atualizar progresso',
    );
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

      const data = await this.parseJsonResponse<{ nextTopic?: LearningGraphNextTopic | null }>(
        response,
        'Falha ao buscar recomendacao',
      );
      return data.nextTopic || null;
    } finally {
      window.clearTimeout(timer);
    }
  }
}

export const learningGraphApiService = new LearningGraphApiService();
