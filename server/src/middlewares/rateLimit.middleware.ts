import rateLimit from 'express-rate-limit';
import { sendTooManyRequests } from '../utils/apiResponse';

const createJsonRateLimit = (windowMs: number, max: number) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.userId || req.ip || 'unknown',
  handler: (req, res) => {
    sendTooManyRequests(req, res, 'Muitas requisicoes em pouco tempo. Aguarde alguns segundos e tente novamente.');
  },
});

export const mentorRateLimitMiddleware = createJsonRateLimit(10 * 60 * 1000, 15);

export const aiRateLimitMiddleware = createJsonRateLimit(10 * 60 * 1000, 20);

export const plannerGenerateRateLimitMiddleware = createJsonRateLimit(10 * 60 * 1000, 10);

// Ranking /me: 1 req / 10s por usuário
export const rankingMeRateLimitMiddleware = createJsonRateLimit(10_000, 1);
