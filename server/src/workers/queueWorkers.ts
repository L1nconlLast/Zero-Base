import { Worker } from 'bullmq';
import { logger } from '../services/logger.service';
import { metricsService } from '../services/metrics.service';

let started = false;

const toBoolean = (value: string | undefined, defaultValue = false): boolean => {
  if (!value) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const log = (level: 'info' | 'warn' | 'error', event: string, meta: Record<string, unknown>) => {
  if (level === 'error') {
    logger.error(event, undefined, { feature: 'queue-workers', ...meta });
    return;
  }

  if (level === 'warn') {
    logger.warn(event, { feature: 'queue-workers', ...meta });
    return;
  }

  logger.info(event, { feature: 'queue-workers', ...meta });
};

const createWorker = (queueName: string) => {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  const worker = new Worker(
    queueName,
    async (job) => {
      // Nesta fase, os workers consolidam eventos e deixam o processamento pronto para evolucao.
      log('info', 'job_processed', {
        queue: queueName,
        jobName: job.name,
        jobId: job.id,
      });
      metricsService.recordJobEvent(queueName, 'processed');
    },
    {
      connection: { url: redisUrl },
      concurrency: 5,
    },
  );

  worker.on('failed', (job, err) => {
    metricsService.recordJobEvent(queueName, 'failed');
    log('error', 'job_failed', {
      queue: queueName,
      jobName: job?.name,
      jobId: job?.id,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    log('error', 'worker_error', {
      queue: queueName,
      error: err.message,
    });
  });

  log('info', 'worker_started', { queue: queueName });

  return worker;
};

export const startQueueWorkers = () => {
  if (started) {
    return;
  }

  if (!toBoolean(process.env.JOBS_ENABLED, toBoolean(process.env.QUEUE_WORKERS_ENABLED, false))) {
    log('warn', 'workers_disabled', { reason: 'QUEUE_WORKERS_ENABLED=false' });
    return;
  }

  createWorker('stats:rebuild');
  createWorker('goals:recalculate');
  createWorker('skills:updateMastery');

  started = true;
};
