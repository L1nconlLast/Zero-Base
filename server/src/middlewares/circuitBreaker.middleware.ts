import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendTooManyRequests, sendUnauthorized } from '../utils/apiResponse';
import { logger } from '../services/logger.service';

const MAX_DAILY_TOKENS = Number(process.env.MENTOR_MAX_DAILY_TOKENS || '25000');

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

export const circuitBreakerMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      sendUnauthorized(req, res, 'Usuario nao autenticado.');
      return;
    }

    if (!supabase) {
      logger.warn('mentor.circuit_breaker.supabase_missing', { requestId: req.id, userId });
      next();
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { data, error } = await supabase
      .from('mentor_token_usage')
      .select('total_tokens')
      .eq('user_id', userId)
      .gte('created_at', todayIso);

    if (error) {
      logger.warn('mentor.circuit_breaker.lookup_failed', { requestId: req.id, userId, errorMessage: error.message });
      next();
      return;
    }

    const tokensUsedToday = (data || []).reduce((sum, row) => sum + (row.total_tokens || 0), 0);

    if (tokensUsedToday >= MAX_DAILY_TOKENS) {
      logger.warn('mentor.circuit_breaker.blocked', {
        requestId: req.id,
        userId,
        tokensUsedToday,
        maxDailyTokens: MAX_DAILY_TOKENS,
      });
      sendTooManyRequests(req, res, 'Atingiu o limite diario de uso do Mentor IA. Volte amanha para continuarmos a sua evolucao.');
      return;
    }

    next();
  } catch (err) {
    logger.error('mentor.circuit_breaker.unexpected_error', err, { requestId: req.id, userId: req.auth?.userId });
    next();
  }
};
