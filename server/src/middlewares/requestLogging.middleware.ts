import type { NextFunction, Request, Response } from 'express';
import { logger } from '../services/logger.service';
import { metricsService } from '../services/metrics.service';

export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = performance.now();

  res.on('finish', () => {
    const latencyMs = Math.round(performance.now() - startedAt);
    const route = req.originalUrl || req.path || 'unknown';

    metricsService.recordRequest({
      method: req.method,
      route,
      statusCode: res.statusCode,
      latencyMs,
    });

    logger.info('request.completed', {
      requestId: req.id,
      userId: req.auth?.userId,
      route,
      method: req.method,
      statusCode: res.statusCode,
      latencyMs,
    });
  });

  next();
};