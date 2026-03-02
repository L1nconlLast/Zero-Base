import type { MateriaTipo } from '../types';
import { adaptiveCloudService } from './adaptiveCloud.service';
import { isSupabaseConfigured } from './supabase.client';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type StudyTrack = 'enem' | 'concursos' | 'hibrido';

export interface QuestionAttempt {
  id: string;
  subject: MateriaTipo;
  topic: string;
  difficulty: DifficultyLevel;
  correct: boolean;
  responseTimeSeconds: number;
  createdAt: string;
}

export interface TopicMetric {
  key: string;
  subject: MateriaTipo;
  topic: string;
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  accuracyRate: number;
  errorRate: number;
  averageResponseTimeSeconds: number;
  averageDifficultyWeight: number;
  weightedDomainScore: number;
  lastReviewedAt: string;
  recencyFactor: number;
  priorityScore: number;
  status: 'weak' | 'developing' | 'strong';
}

export interface ReviewPlanItem {
  id: string;
  subject: MateriaTipo;
  topic: string;
  reviewStage: 1 | 2 | 3 | 4;
  scheduledFor: string;
  reason: string;
}

export interface AdaptiveSnapshot {
  attempts: QuestionAttempt[];
  topicMetrics: TopicMetric[];
  reviewPlan: ReviewPlanItem[];
  weeklyEvolution: Array<{
    date: string;
    attempts: number;
    accuracyRate: number;
  }>;
  summary: {
    totalAttempts: number;
    totalCorrect: number;
    totalIncorrect: number;
    globalAccuracyRate: number;
    averageResponseTimeSeconds: number;
    weakTopics: number;
    inconsistencyRate: number;
    estimatedEnemScore: number;
  };
}

export interface SmartTrainingItem {
  id: string;
  subject: MateriaTipo;
  topic: string;
  recommendedDifficulty: DifficultyLevel;
  questionCount: number;
  reason: string;
  priorityScore: number;
}

interface AdaptiveStore {
  attempts: QuestionAttempt[];
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = 'mdz_adaptive_learning_';
const REVIEW_INTERVAL_DAYS: Array<1 | 3 | 7 | 15> = [1, 3, 7, 15];

const difficultyWeightMap: Record<DifficultyLevel, number> = {
  easy: 0.9,
  medium: 1,
  hard: 1.15,
};

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getStorageKey = (userKey: string) => `${STORAGE_KEY_PREFIX}${userKey.toLowerCase()}`;

const normalizeTopic = (topic: string) => topic.trim();

const getTopicStatus = (weightedDomainScore: number): TopicMetric['status'] => {
  if (weightedDomainScore < 60) {
    return 'weak';
  }

  if (weightedDomainScore < 85) {
    return 'developing';
  }

  return 'strong';
};

const createStore = (): AdaptiveStore => ({
  attempts: [],
  updatedAt: new Date().toISOString(),
});

const parseStore = (raw: string | null): AdaptiveStore => {
  if (!raw) {
    return createStore();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AdaptiveStore>;
    if (!Array.isArray(parsed.attempts)) {
      return createStore();
    }

    return {
      attempts: parsed.attempts as QuestionAttempt[],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return createStore();
  }
};

const loadStore = (userKey: string): AdaptiveStore => {
  const raw = window.localStorage.getItem(getStorageKey(userKey));
  return parseStore(raw);
};

const saveStore = (userKey: string, store: AdaptiveStore): void => {
  window.localStorage.setItem(getStorageKey(userKey), JSON.stringify(store));
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const toTopicKey = (subject: MateriaTipo, topic: string): string => `${subject}:${topic.toLowerCase()}`;

const buildMetrics = (attempts: QuestionAttempt[]): TopicMetric[] => {
  const grouped = new Map<string, QuestionAttempt[]>();

  attempts.forEach((attempt) => {
    const topic = normalizeTopic(attempt.topic);
    const key = toTopicKey(attempt.subject, topic);
    const bucket = grouped.get(key) || [];
    bucket.push({ ...attempt, topic });
    grouped.set(key, bucket);
  });

  return Array.from(grouped.entries())
    .map(([key, topicAttempts]) => {
      const [subject, ...topicParts] = key.split(':');
      const topic = topicParts.join(':');
      const totalAttempts = topicAttempts.length;
      const correctAttempts = topicAttempts.filter((attempt) => attempt.correct).length;
      const incorrectAttempts = totalAttempts - correctAttempts;
      const accuracyRate = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;
      const errorRate = 100 - accuracyRate;
      const averageResponseTimeSeconds =
        topicAttempts.reduce((sum, attempt) => sum + attempt.responseTimeSeconds, 0) / Math.max(totalAttempts, 1);

      const weightedDifficulty =
        topicAttempts.reduce((sum, attempt) => sum + difficultyWeightMap[attempt.difficulty], 0) /
        Math.max(totalAttempts, 1);

      const lastReviewedAt = topicAttempts
        .map((attempt) => attempt.createdAt)
        .sort((first, second) => second.localeCompare(first))[0];

      const daysSinceLastReview = clamp(
        (Date.now() - new Date(lastReviewedAt).getTime()) / DAY_IN_MS,
        0,
        30
      );
      const recencyFactor = clamp(1 + daysSinceLastReview / 7, 1, 2.5);

      const speedPenalty = averageResponseTimeSeconds > 120 ? 0.88 : averageResponseTimeSeconds > 80 ? 0.94 : 1;
      const weightedDomainScore = clamp(accuracyRate * weightedDifficulty * speedPenalty, 0, 100);
      const priorityScore =
        (1 - accuracyRate / 100) * weightedDifficulty * recencyFactor * 100;

      return {
        key,
        subject: subject as MateriaTipo,
        topic,
        totalAttempts,
        correctAttempts,
        incorrectAttempts,
        accuracyRate: Number(accuracyRate.toFixed(1)),
        errorRate: Number(errorRate.toFixed(1)),
        averageResponseTimeSeconds: Number(averageResponseTimeSeconds.toFixed(1)),
        averageDifficultyWeight: Number(weightedDifficulty.toFixed(2)),
        weightedDomainScore: Number(weightedDomainScore.toFixed(1)),
        lastReviewedAt,
        recencyFactor: Number(recencyFactor.toFixed(2)),
        priorityScore: Number(priorityScore.toFixed(1)),
        status: getTopicStatus(weightedDomainScore),
      };
    })
    .sort((first, second) => second.priorityScore - first.priorityScore);
};

const buildReviewPlan = (metrics: TopicMetric[]): ReviewPlanItem[] => {
  const weakTopics = metrics
    .filter((metric) => metric.status !== 'strong' || metric.priorityScore >= 45)
    .slice(0, 6);
  const plan: ReviewPlanItem[] = [];

  weakTopics.forEach((metric) => {
    REVIEW_INTERVAL_DAYS.forEach((interval, index) => {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + interval);

      const reviewStage = (index + 1) as 1 | 2 | 3 | 4;
      const reason =
        reviewStage === 1
          ? 'Primeira revisão após erro recorrente.'
          : reviewStage === 2
            ? 'Consolidação inicial de memória.'
            : reviewStage === 3
              ? 'Reforço de retenção intermediária.'
              : 'Revisão de retenção longa.';

      plan.push({
        id: generateId(),
        subject: metric.subject,
        topic: metric.topic,
        reviewStage,
        scheduledFor: scheduledDate.toISOString(),
        reason,
      });
    });
  });

  return plan.sort((first, second) => first.scheduledFor.localeCompare(second.scheduledFor));
};

const buildWeeklyEvolution = (
  attempts: QuestionAttempt[]
): Array<{ date: string; attempts: number; accuracyRate: number }> => {
  const now = new Date();
  const buckets = new Map<string, QuestionAttempt[]>();

  for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - dayOffset);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, []);
  }

  attempts.forEach((attempt) => {
    const key = attempt.createdAt.slice(0, 10);
    if (!buckets.has(key)) {
      return;
    }

    const dayAttempts = buckets.get(key) || [];
    dayAttempts.push(attempt);
    buckets.set(key, dayAttempts);
  });

  return Array.from(buckets.entries()).map(([date, dayAttempts]) => {
    const total = dayAttempts.length;
    const correct = dayAttempts.filter((attempt) => attempt.correct).length;
    const accuracyRate = total > 0 ? (correct / total) * 100 : 0;

    return {
      date: date.slice(5),
      attempts: total,
      accuracyRate: Number(accuracyRate.toFixed(1)),
    };
  });
};

const computeInconsistencyRate = (attempts: QuestionAttempt[]): number => {
  const easyWrong = attempts.filter((attempt) => attempt.difficulty === 'easy' && !attempt.correct).length;
  const hardCorrect = attempts.filter((attempt) => attempt.difficulty === 'hard' && attempt.correct).length;

  if (attempts.length === 0) {
    return 0;
  }

  const imbalance = easyWrong > hardCorrect
    ? (easyWrong - hardCorrect) / attempts.length
    : 0;

  return Number(clamp(imbalance * 100, 0, 100).toFixed(1));
};

const estimateEnemScore = (attempts: QuestionAttempt[], globalAccuracyRate: number, inconsistencyRate: number): number => {
  if (attempts.length === 0) {
    return 0;
  }

  const hardCorrectRate =
    attempts.filter((attempt) => attempt.difficulty === 'hard' && attempt.correct).length /
    Math.max(attempts.length, 1);

  const base = 420;
  const accuracyComponent = globalAccuracyRate * 4.2;
  const hardComponent = hardCorrectRate * 120;
  const inconsistencyPenalty = inconsistencyRate * 1.8;

  return Math.round(clamp(base + accuracyComponent + hardComponent - inconsistencyPenalty, 200, 1000));
};

const getRecommendedDifficulty = (metric: TopicMetric): DifficultyLevel => {
  if (metric.weightedDomainScore < 45) {
    return 'easy';
  }

  if (metric.weightedDomainScore < 75) {
    return 'medium';
  }

  return 'hard';
};

class AdaptiveLearningService {
  getAttempts(userKey: string): QuestionAttempt[] {
    const store = loadStore(userKey);
    return store.attempts;
  }

  replaceAttempts(userKey: string, attempts: QuestionAttempt[]): AdaptiveSnapshot {
    const nextStore: AdaptiveStore = {
      attempts: [...attempts]
        .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
        .slice(0, 1500),
      updatedAt: new Date().toISOString(),
    };

    saveStore(userKey, nextStore);
    return this.getSnapshot(userKey);
  }

  mergeAttempts(userKey: string, incomingAttempts: QuestionAttempt[]): AdaptiveSnapshot {
    if (incomingAttempts.length === 0) {
      return this.getSnapshot(userKey);
    }

    const currentAttempts = this.getAttempts(userKey);
    const mergedMap = new Map<string, QuestionAttempt>();

    [...currentAttempts, ...incomingAttempts].forEach((attempt) => {
      const key = attempt.id || `${attempt.subject}:${attempt.topic}:${attempt.createdAt}:${attempt.correct}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, attempt);
      }
    });

    return this.replaceAttempts(userKey, Array.from(mergedMap.values()));
  }

  getSnapshot(userKey: string): AdaptiveSnapshot {
    const store = loadStore(userKey);
    const topicMetrics = buildMetrics(store.attempts);
    const reviewPlan = buildReviewPlan(topicMetrics);
    const weeklyEvolution = buildWeeklyEvolution(store.attempts);

    const totalAttempts = store.attempts.length;
    const totalCorrect = store.attempts.filter((attempt) => attempt.correct).length;
    const totalIncorrect = totalAttempts - totalCorrect;
    const globalAccuracyRate = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
    const averageResponseTimeSeconds =
      totalAttempts > 0
        ? store.attempts.reduce((sum, attempt) => sum + attempt.responseTimeSeconds, 0) / totalAttempts
        : 0;
    const inconsistencyRate = computeInconsistencyRate(store.attempts);
    const estimatedEnemScore = estimateEnemScore(store.attempts, globalAccuracyRate, inconsistencyRate);

    return {
      attempts: store.attempts,
      topicMetrics,
      reviewPlan,
      weeklyEvolution,
      summary: {
        totalAttempts,
        totalCorrect,
        totalIncorrect,
        globalAccuracyRate: Number(globalAccuracyRate.toFixed(1)),
        averageResponseTimeSeconds: Number(averageResponseTimeSeconds.toFixed(1)),
        weakTopics: topicMetrics.filter((metric) => metric.status === 'weak').length,
        inconsistencyRate,
        estimatedEnemScore,
      },
    };
  }

  recordAttempt(
    userKey: string,
    payload: Omit<QuestionAttempt, 'id' | 'createdAt'>
  ): AdaptiveSnapshot {
    const store = loadStore(userKey);
    const attempt: QuestionAttempt = {
      id: generateId(),
      subject: payload.subject,
      topic: normalizeTopic(payload.topic),
      difficulty: payload.difficulty,
      correct: payload.correct,
      responseTimeSeconds: clamp(Math.round(payload.responseTimeSeconds), 1, 600),
      createdAt: new Date().toISOString(),
    };

    const nextStore: AdaptiveStore = {
      attempts: [attempt, ...store.attempts].slice(0, 1500),
      updatedAt: new Date().toISOString(),
    };

    saveStore(userKey, nextStore);
    return this.getSnapshot(userKey);
  }

  clearUserData(userKey: string): void {
    window.localStorage.removeItem(getStorageKey(userKey));
  }

  /**
   * Sincroniza tentativas com a nuvem.
   * Merge: local + cloud, dedup por id, salva resultado em ambos.
   */
  async syncWithCloud(userKey: string, userId: string): Promise<AdaptiveSnapshot> {
    if (!isSupabaseConfigured) {
      return this.getSnapshot(userKey);
    }

    try {
      const cloudAttempts = await adaptiveCloudService.listByUser(userId);
      const snapshot = this.mergeAttempts(userKey, cloudAttempts);

      // Push local-only attempts to cloud
      const cloudIds = new Set(cloudAttempts.map((a) => a.id));
      const localOnly = snapshot.attempts.filter((a) => !cloudIds.has(a.id));

      if (localOnly.length > 0) {
        await adaptiveCloudService.createMany(userId, localOnly);
      }

      return snapshot;
    } catch {
      return this.getSnapshot(userKey);
    }
  }

  /**
   * Registra tentativa e faz push para a nuvem (fire-and-forget).
   */
  recordAttemptWithCloud(
    userKey: string,
    userId: string | null,
    payload: Omit<QuestionAttempt, 'id' | 'createdAt'>
  ): AdaptiveSnapshot {
    const snapshot = this.recordAttempt(userKey, payload);

    if (userId && isSupabaseConfigured) {
      const latest = snapshot.attempts[0];
      if (latest) {
        void adaptiveCloudService.create(userId, latest).catch(() => {});
      }
    }

    return snapshot;
  }

  generateSmartTraining(
    userKey: string,
    maxTopics = 4,
    track: StudyTrack = 'enem',
    hybridEnemWeight = 70
  ): SmartTrainingItem[] {
    if (track === 'hibrido') {
      const enemWeight = clamp(hybridEnemWeight, 10, 90);
      const enemTopics = Math.max(1, Math.round((maxTopics * enemWeight) / 100));
      const concursosTopics = Math.max(0, maxTopics - enemTopics);

      const enemPlan = this.generateSmartTraining(userKey, enemTopics, 'enem');
      const concursosPlan = concursosTopics > 0
        ? this.generateSmartTraining(userKey, concursosTopics, 'concursos')
        : [];

      return [...enemPlan, ...concursosPlan]
        .sort((first, second) => second.priorityScore - first.priorityScore)
        .slice(0, maxTopics)
        .map((item) => ({
          ...item,
          reason: `Híbrido (${enemWeight}% ENEM / ${100 - enemWeight}% Concurso): ${item.reason}`,
        }));
    }

    const snapshot = this.getSnapshot(userKey);

    if (snapshot.topicMetrics.length === 0) {
      const seedTopics = track === 'enem'
        ? [
            { topic: 'Interpretação de gráfico', difficulty: 'medium' as DifficultyLevel, questions: 8 },
            { topic: 'Porcentagem e razão', difficulty: 'easy' as DifficultyLevel, questions: 10 },
            { topic: 'Redação dissertativo-argumentativa', difficulty: 'medium' as DifficultyLevel, questions: 6 },
          ]
        : [
            { topic: 'Leitura de edital', difficulty: 'easy' as DifficultyLevel, questions: 8 },
            { topic: 'Questões da banca-alvo', difficulty: 'medium' as DifficultyLevel, questions: 12 },
            { topic: 'Revisão de legislação seca', difficulty: 'hard' as DifficultyLevel, questions: 6 },
          ];

      return seedTopics.slice(0, maxTopics).map((item) => ({
        id: generateId(),
        subject: 'Outra',
        topic: item.topic,
        recommendedDifficulty: item.difficulty,
        questionCount: item.questions,
        priorityScore: 50,
        reason:
          track === 'enem'
            ? 'Plano inicial ENEM com foco em competência e interpretação contextualizada.'
            : 'Plano inicial Concurso com foco em edital e padrão de banca.',
      }));
    }

    return snapshot.topicMetrics
      .slice(0, maxTopics)
      .map((metric) => {
        const recommendedDifficulty = getRecommendedDifficulty(metric);
        const questionCountBase = metric.status === 'weak' ? 10 : metric.status === 'developing' ? 8 : 6;
        const questionCount = track === 'concursos'
          ? Math.min(16, questionCountBase + 2)
          : questionCountBase;

        return {
          id: generateId(),
          subject: metric.subject,
          topic: metric.topic,
          recommendedDifficulty,
          questionCount,
          priorityScore: metric.priorityScore,
          reason:
            track === 'enem'
              ? metric.status === 'weak'
                ? `ENEM: reforçar competência com erro ${metric.errorRate}% e revisão contextualizada.`
                : `ENEM: manter evolução por habilidade, score ${metric.weightedDomainScore}.`
              : metric.status === 'weak'
                ? `Concurso: foco técnico por edital, erro ${metric.errorRate}% e alta incidência de banca.`
                : `Concurso: manter precisão técnica, score ${metric.weightedDomainScore}.`,
        };
      });
  }
}

export const adaptiveLearningService = new AdaptiveLearningService();
