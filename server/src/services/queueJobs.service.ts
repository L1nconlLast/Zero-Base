import { JobsOptions, Queue } from 'bullmq';
import { logger } from './logger.service';
import { metricsService } from './metrics.service';

interface SessionFinishedPayload {
  userId: string;
  sessionId: string;
  duration: number;
  xpGained: number;
  streak: number;
}

interface AnswerSubmittedPayload {
  userId: string;
  questionId: string;
  skillId: string;
  accuracy: number;
}

interface PlannerStatusPayload {
  userId: string;
  plannerId: string;
  status: 'PENDENTE' | 'CONCLUIDO' | 'FALTOU';
}

const toBoolean = (value: string | undefined, defaultValue = true): boolean => {
  if (!value) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export class QueueJobsService {
  private statsQueue: Queue | null = null;

  private goalsQueue: Queue | null = null;

  private skillsQueue: Queue | null = null;

  private readonly enabled = toBoolean(process.env.JOBS_ENABLED, toBoolean(process.env.QUEUES_ENABLED, true));

  private readonly redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  isEnabled(): boolean {
    return this.enabled;
  }

  private log(level: 'info' | 'warn' | 'error', event: string, meta: Record<string, unknown>): void {
    if (level === 'error') {
      logger.error(event, undefined, { feature: 'queue-jobs', ...meta });
      return;
    }

    if (level === 'warn') {
      logger.warn(event, { feature: 'queue-jobs', ...meta });
      return;
    }

    logger.info(event, { feature: 'queue-jobs', ...meta });
  }

  private defaultJobOptions(): JobsOptions {
    return {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: 20,
    };
  }

  private ensureQueues(): boolean {
    if (!this.enabled) {
      return false;
    }

    if (this.statsQueue && this.goalsQueue && this.skillsQueue) {
      return true;
    }

    try {
      this.statsQueue = new Queue('stats:rebuild', {
        connection: { url: this.redisUrl },
        defaultJobOptions: this.defaultJobOptions(),
      });
      this.goalsQueue = new Queue('goals:recalculate', {
        connection: { url: this.redisUrl },
        defaultJobOptions: this.defaultJobOptions(),
      });
      this.skillsQueue = new Queue('skills:updateMastery', {
        connection: { url: this.redisUrl },
        defaultJobOptions: this.defaultJobOptions(),
      });

      return true;
    } catch (error) {
      this.log('warn', 'queue_init_failed', {
        error: error instanceof Error ? error.message : 'unknown_error',
      });
      return false;
    }
  }

  async enqueueAfterSessionFinish(payload: SessionFinishedPayload): Promise<void> {
    if (!this.ensureQueues()) return;

    await Promise.all([
      this.statsQueue!.add('session-finished', payload, { jobId: `session-finished:${payload.sessionId}:stats` }),
      this.goalsQueue!.add('session-finished', payload, { jobId: `session-finished:${payload.sessionId}:goals` }),
      this.skillsQueue!.add('session-finished', payload, { jobId: `session-finished:${payload.sessionId}:skills` }),
    ]);

    metricsService.recordJobEvent('stats:rebuild', 'enqueued');
    metricsService.recordJobEvent('goals:recalculate', 'enqueued');
    metricsService.recordJobEvent('skills:updateMastery', 'enqueued');

    this.log('info', 'enqueue_session_finish', {
      userId: payload.userId,
      sessionId: payload.sessionId,
    });
  }

  async enqueueAfterAnswer(payload: AnswerSubmittedPayload): Promise<void> {
    if (!this.ensureQueues()) return;

    await Promise.all([
      this.statsQueue!.add('answer-submitted', payload, { jobId: `answer-submitted:${payload.questionId}:stats` }),
      this.skillsQueue!.add('answer-submitted', payload, { jobId: `answer-submitted:${payload.questionId}:skills` }),
    ]);

    metricsService.recordJobEvent('stats:rebuild', 'enqueued');
    metricsService.recordJobEvent('skills:updateMastery', 'enqueued');

    this.log('info', 'enqueue_answer', {
      userId: payload.userId,
      questionId: payload.questionId,
    });
  }

  async enqueueAfterPlannerStatus(payload: PlannerStatusPayload): Promise<void> {
    if (!this.ensureQueues()) return;

    await Promise.all([
      this.goalsQueue!.add('planner-status-updated', payload, { jobId: `planner-status:${payload.plannerId}:goals:${payload.status}` }),
      this.statsQueue!.add('planner-status-updated', payload, { jobId: `planner-status:${payload.plannerId}:stats:${payload.status}` }),
    ]);

    metricsService.recordJobEvent('goals:recalculate', 'enqueued');
    metricsService.recordJobEvent('stats:rebuild', 'enqueued');

    this.log('info', 'enqueue_planner_status', {
      userId: payload.userId,
      plannerId: payload.plannerId,
      status: payload.status,
    });
  }
}

export const queueJobsService = new QueueJobsService();
