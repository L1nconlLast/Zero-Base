type FetchLike = typeof fetch;
import { logger } from './logger.service';
import { metricsService } from './metrics.service';

type SleepFn = (ms: number) => Promise<void>;

interface LogMeta {
  requestId?: string;
  [key: string]: unknown;
}

export interface TutorExplainPayload {
  topic: string;
  context: string;
  userLevel: string;
}

export interface TutorExplainResponse {
  explanation: string;
  practicalExample: string;
  exercise: string;
  answerGuide: string;
  source?: 'ai-service' | 'fallback';
}

export interface PlannerGeneratePayload {
  availableHoursPerDay: number[];
  goals: string[];
  weakSkills?: string[];
  examDate?: string;
}

export interface PlannerGenerateResponse {
  weeklyPlan: Array<{
    date: string;
    subject: string;
    skill?: string | null;
    durationMin: number;
  }>;
  source?: 'ai-service' | 'fallback';
}

const defaultSleep: SleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toBoolean = (value: string | undefined, defaultValue = false): boolean => {
  if (!value) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const toPositiveInt = (value: string | undefined, defaultValue: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue;
  return Math.floor(parsed);
};

const sanitizeHours = (hours: number[] | undefined): number[] => {
  const incoming = Array.isArray(hours) ? hours : [];
  const normalized = Array.from({ length: 7 }).map((_, idx) => {
    const value = Number(incoming[idx] ?? 1);
    if (!Number.isFinite(value)) return 1;
    return Math.max(0.5, Math.min(12, value));
  });
  return normalized;
};

const safeGoals = (goals: string[] | undefined): string[] => {
  const filtered = (goals || []).map((goal) => goal?.trim()).filter((goal): goal is string => Boolean(goal));
  return filtered.length > 0 ? filtered : ['Matematica', 'Portugues', 'Natureza', 'Humanas', 'Redacao'];
};

export class AIServiceClient {
  private readonly fetchImpl: FetchLike;

  private readonly sleep: SleepFn;

  constructor(deps?: { fetchImpl?: FetchLike; sleep?: SleepFn }) {
    this.fetchImpl = deps?.fetchImpl || fetch;
    this.sleep = deps?.sleep || defaultSleep;
  }

  isEnabled(): boolean {
    return toBoolean(process.env.AI_ENABLED, false);
  }

  private getBaseUrl(): string {
    return (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001').replace(/\/$/, '');
  }

  private getTimeoutMs(): number {
    return toPositiveInt(process.env.AI_TIMEOUT_MS, 5000);
  }

  private getMaxRetries(): number {
    return toPositiveInt(process.env.AI_MAX_RETRIES, 3);
  }

  private log(level: 'info' | 'warn' | 'error', event: string, meta: LogMeta): void {
    if (level === 'error') {
      logger.error(event, undefined, { feature: 'ai-client', ...meta });
      return;
    }

    if (level === 'warn') {
      logger.warn(event, { feature: 'ai-client', ...meta });
      return;
    }

    logger.info(event, { feature: 'ai-client', ...meta });
  }

  private async postJson<T>(path: string, body: unknown, requestId?: string): Promise<T> {
    const timeoutMs = this.getTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.getBaseUrl()}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(requestId ? { 'x-request-id': requestId } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`AI_SERVICE_HTTP_${response.status}: ${text.slice(0, 200)}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`AI_SERVICE_TIMEOUT_${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async withRetry<T>(
    operation: (attempt: number) => Promise<T>,
    opts: { label: string; requestId?: string; fallback: () => T },
  ): Promise<T> {
    const maxRetries = this.getMaxRetries();

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        const startedAt = Date.now();
        const result = await operation(attempt);
        metricsService.recordAiEvent('success');
        this.log('info', `${opts.label}.success`, {
          requestId: opts.requestId,
          attempt,
          latencyMs: Date.now() - startedAt,
        });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'unknown_error';
        const shouldRetry = attempt < maxRetries;

        if (errorMessage.includes('AI_SERVICE_TIMEOUT')) {
          metricsService.recordAiEvent('timeout');
        } else {
          metricsService.recordAiEvent('error');
        }

        this.log(shouldRetry ? 'warn' : 'error', `${opts.label}.failure`, {
          requestId: opts.requestId,
          attempt,
          maxRetries,
          error: errorMessage,
        });

        if (!shouldRetry) {
          break;
        }

        const backoffMs = 250 * (2 ** (attempt - 1));
        await this.sleep(backoffMs);
      }
    }

    this.log('warn', `${opts.label}.fallback`, {
      requestId: opts.requestId,
      reason: 'max_retries_exhausted',
    });
    metricsService.recordAiEvent('fallback');

    return opts.fallback();
  }

  private buildTutorFallback(payload: TutorExplainPayload): TutorExplainResponse {
    return {
      explanation: `${payload.topic} em ${payload.context}: estude conceito, aplicacao e revisao em ciclos curtos. Nivel ${payload.userLevel} deve focar em base + questoes guiadas.`,
      practicalExample: `Escolha uma questao de ${payload.topic}, identifique dados centrais e resolva em ate 10 minutos explicando cada passo.`,
      exercise: `Resolva 2 questoes sobre ${payload.topic} e escreva em 5 linhas o por que de cada alternativa errada.`,
      answerGuide: 'A resposta ideal apresenta conceito correto, aplicacao no problema e checagem final de consistencia.',
      source: 'fallback',
    };
  }

  private buildPlannerFallback(payload: PlannerGeneratePayload): PlannerGenerateResponse {
    const goals = safeGoals(payload.goals);
    const weak = payload.weakSkills || [];
    const hours = sanitizeHours(payload.availableHoursPerDay);

    const start = new Date();
    const weeklyPlan = Array.from({ length: 7 }).map((_, idx) => {
      const day = new Date(start);
      day.setDate(start.getDate() + idx);
      return {
        date: day.toISOString().slice(0, 10),
        subject: goals[idx % goals.length],
        skill: weak.length > 0 ? weak[idx % weak.length] : null,
        durationMin: Math.max(30, Math.round(hours[idx] * 60)),
      };
    });

    return { weeklyPlan, source: 'fallback' };
  }

  async explainTutor(payload: TutorExplainPayload, meta?: { requestId?: string }): Promise<TutorExplainResponse> {
    if (!this.isEnabled()) {
      return this.buildTutorFallback(payload);
    }

    return this.withRetry<TutorExplainResponse>(
      async () => {
        const result = await this.postJson<TutorExplainResponse>('/tutor/explain', payload, meta?.requestId);
        return { ...result, source: 'ai-service' };
      },
      {
        label: 'tutor_explain',
        requestId: meta?.requestId,
        fallback: () => this.buildTutorFallback(payload),
      },
    );
  }

  async generatePlanner(payload: PlannerGeneratePayload, meta?: { requestId?: string }): Promise<PlannerGenerateResponse> {
    if (!this.isEnabled()) {
      return this.buildPlannerFallback(payload);
    }

    return this.withRetry<PlannerGenerateResponse>(
      async () => {
        const result = await this.postJson<PlannerGenerateResponse>('/planner/generate', payload, meta?.requestId);
        return { ...result, source: 'ai-service' };
      },
      {
        label: 'planner_generate',
        requestId: meta?.requestId,
        fallback: () => this.buildPlannerFallback(payload),
      },
    );
  }
}

export const aiServiceClient = new AIServiceClient();
