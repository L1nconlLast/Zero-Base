import rateLimit from 'express-rate-limit';

export const mentorRateLimitMiddleware = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.userId || req.ip || 'unknown',
  message: {
    error: 'Muitas requisicoes em pouco tempo. Aguarde alguns segundos e tente novamente.',
  },
});
