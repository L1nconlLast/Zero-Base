import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

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
      res.status(401).json({ error: 'Unauthorized: usuario nao autenticado.' });
      return;
    }

    if (!supabase) {
      console.warn('[circuit-breaker] Supabase nao configurado. Permitindo requisicao.');
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
      console.warn('[circuit-breaker] erro ao consultar tokens:', error.message);
      next();
      return;
    }

    const tokensUsedToday = (data || []).reduce((sum, row) => sum + (row.total_tokens || 0), 0);

    if (tokensUsedToday >= MAX_DAILY_TOKENS) {
      console.warn(
        `[circuit-breaker] bloqueio ativado para user ${userId}. tokens hoje: ${tokensUsedToday}/${MAX_DAILY_TOKENS}`
      );
      res.status(429).json({
        error: 'Atingiu o limite diario de uso do Mentor IA. Volte amanha para continuarmos a sua evolucao!',
      });
      return;
    }

    next();
  } catch (err) {
    console.error('[circuit-breaker] erro inesperado:', err);
    next();
  }
};
