/**
 * rankingScheduler.service.ts
 *
 * Executa o recálculo de snapshots de ranking em horários pré-definidos
 * usando setInterval (tick a cada minuto) sem depender de node-cron.
 *
 * Horários em UTC (ajuste RANKING_TZ_OFFSET_HOURS para compensar fuso):
 *   - diário:   todo dia  às 00:00 UTC
 *   - semanal:  segunda-feira às 00:05 UTC
 *   - mensal:   dia 1 de cada mês às 00:10 UTC
 *
 * Retentativas: até MAX_RETRIES por job, com backoff exponencial simples.
 */

import { recalculateSnapshot } from './ranking.service';
import type { RankingPeriod } from './ranking.service';
import { logger } from './logger.service';

const TICK_MS          = 60_000;     // 1 minuto
const MAX_RETRIES      = 2;
const RETRY_BACKOFF_MS = 30_000;     // 30 s entre retentativas

const schedulerEnabled =
  String(process.env.RANKING_SCHEDULER_ENABLED ?? 'true').toLowerCase() === 'true';

// ── Helpers ───────────────────────────────────────────────────

function nowUtc() {
  return new Date();
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Retorna a ref_date correta por período */
function refDateFor(period: RankingPeriod, now: Date): string {
  if (period === 'daily') return now.toISOString().slice(0, 10);

  if (period === 'weekly') {
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
    return monday.toISOString().slice(0, 10);
  }

  // monthly
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-01`;
}

// ── Job runner com retry ───────────────────────────────────────

async function runJobWithRetry(period: RankingPeriod, refDate: string, attempt = 1): Promise<void> {
  try {
    const result = await recalculateSnapshot(period, refDate);
    logger.info('ranking.scheduler.job.ok', {
      feature: 'ranking-scheduler',
      event:   'ranking.scheduler.job.ok',
      period,
      refDate,
      rows:        result.rows,
      durationMs:  result.durationMs,
      attempt,
    } as never);
  } catch (err) {
    logger.error('ranking.scheduler.job.error', err, {
      feature: 'ranking-scheduler',
      event:   'ranking.scheduler.job.error',
      period,
      refDate,
      attempt,
    });

    if (attempt < MAX_RETRIES) {
      const backoff = RETRY_BACKOFF_MS * attempt;
      logger.warn('ranking.scheduler.retry', {
        feature:   'ranking-scheduler',
        period,
        refDate,
        nextAttempt: attempt + 1,
        backoffMs:   backoff,
      } as never);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      await runJobWithRetry(period, refDate, attempt + 1);
    } else {
      logger.error('ranking.scheduler.job.exhausted', err, {
        feature: 'ranking-scheduler',
        period,
        refDate,
        maxRetries: MAX_RETRIES,
      });
    }
  }
}

// ── Scheduler class ───────────────────────────────────────────

class RankingSchedulerService {
  private timer: NodeJS.Timeout | null = null;
  /** Guarda o último minuto UTC em que cada período foi executado (YYYYMMDDHHmm) */
  private lastRun: Record<RankingPeriod, string> = {
    daily:   '',
    weekly:  '',
    monthly: '',
  };

  start(): void {
    if (!schedulerEnabled) {
      logger.warn('ranking.scheduler.disabled', { feature: 'ranking-scheduler', reason: 'RANKING_SCHEDULER_ENABLED=false' } as never);
      return;
    }

    if (this.timer) return;

    const tick = () => {
      const now = nowUtc();
      const h   = now.getUTCHours();
      const m   = now.getUTCMinutes();
      const d   = now.getUTCDay();   // 0=Sun, 1=Mon
      const day = now.getUTCDate();
      const key = `${now.toISOString().slice(0, 10)}${pad(h)}${pad(m)}`;

      // Diário: todo dia às 00:00 UTC
      if (h === 0 && m === 0 && this.lastRun.daily !== key) {
        this.lastRun.daily = key;
        void runJobWithRetry('daily', refDateFor('daily', now));
      }

      // Semanal: segunda-feira às 00:05 UTC
      if (d === 1 && h === 0 && m === 5 && this.lastRun.weekly !== key) {
        this.lastRun.weekly = key;
        void runJobWithRetry('weekly', refDateFor('weekly', now));
      }

      // Mensal: dia 1 de cada mês às 00:10 UTC
      if (day === 1 && h === 0 && m === 10 && this.lastRun.monthly !== key) {
        this.lastRun.monthly = key;
        void runJobWithRetry('monthly', refDateFor('monthly', now));
      }
    };

    this.timer = setInterval(tick, TICK_MS);

    logger.info('ranking.scheduler.started', {
      feature: 'ranking-scheduler',
      event:   'ranking.scheduler.started',
      tickMs:  TICK_MS,
    } as never);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const rankingSchedulerService = new RankingSchedulerService();
