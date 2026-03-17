import { createClient } from '@supabase/supabase-js';
import { logger } from './logger.service';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : null;

export const VALID_CATEGORIES = [
  'REP-ENEM',
  'EM3-ENEM',
  'REP-ITA/IME',
  'Graduação',
  'Outros',
] as const;

export type RankingCategory = (typeof VALID_CATEGORIES)[number];
export type RankingPeriod = 'daily' | 'weekly' | 'monthly';

export interface SessionStartInput {
  userId: string;
  category: RankingCategory;
  cameraOn: boolean;
}

export interface SessionEndInput {
  userId: string;
  startedAt: string;
  endedAt: string;
  category: RankingCategory;
  cameraOn: boolean;
}

export interface SessionEndResult {
  durationMin: number;
  eligible: boolean;
  reason?: string;
}

export interface RankingMeResult {
  period: RankingPeriod;
  refDate: string;
  position_global: number;
  percentile_global: number;
  position_category: number;
  percentile_category: number;
  total_users_global: number;
  total_users_category: number;
  total_valid_min: number;
  formatted_time: string;
  now_studying: number;
}

function getRefDate(period: RankingPeriod): string {
  const now = new Date();
  if (period === 'daily') return now.toISOString().slice(0, 10);
  if (period === 'weekly') {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return monday.toISOString().slice(0, 10);
  }
  // monthly
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}:00`;
}

function assertClient() {
  if (!supabase) throw new Error('Supabase client não configurado.');
}

// ── Session start ─────────────────────────────────────────────

export async function startRankingSession(input: SessionStartInput): Promise<{ startedAt: string; active: boolean }> {
  assertClient();
  const startedAt = new Date().toISOString();

  const { error } = await supabase!
    .from('active_study_sessions')
    .upsert(
      { user_id: input.userId, started_at: startedAt, category: input.category, camera_on: input.cameraOn, updated_at: startedAt },
      { onConflict: 'user_id' },
    );

  if (error) {
    logger.error('ranking.session.start.error', error, { userId: input.userId });
    throw new Error('Erro ao iniciar sessão de estudo.');
  }

  return { startedAt, active: true };
}

// ── Session end ───────────────────────────────────────────────

export async function endRankingSession(input: SessionEndInput): Promise<SessionEndResult> {
  assertClient();

  const start = new Date(input.startedAt);
  const end = new Date(input.endedAt);
  const durationMin = Math.floor((end.getTime() - start.getTime()) / 60_000);

  if (durationMin <= 0) {
    return { durationMin: 0, eligible: false, reason: 'Duração deve ser maior que zero.' };
  }

  // Verifica acúmulo diário do usuário (regra 20h/dia)
  const dayStart = new Date(start);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const { data: dayRows } = await supabase!
    .from('study_sessions_ranking')
    .select('duration_min')
    .eq('user_id', input.userId)
    .gte('started_at', dayStart.toISOString())
    .lt('started_at', dayEnd.toISOString());

  const accumulatedMin = (dayRows ?? []).reduce((sum, r) => sum + (r.duration_min ?? 0), 0);
  const projectedTotal = accumulatedMin + durationMin;

  let eligible = true;
  let reason: string | undefined;

  if (durationMin >= 540) {
    eligible = false;
    reason = 'Sessão contínua acima de 9 horas não conta para o ranking.';
  } else if (projectedTotal >= 1200) {
    eligible = false;
    reason = 'Acumulado diário acima de 20 horas não conta para o ranking.';
  }

  // Grava em study_sessions_ranking independente da elegibilidade
  const { error: insertErr } = await supabase!.from('study_sessions_ranking').insert({
    user_id:    input.userId,
    started_at: input.startedAt,
    ended_at:   input.endedAt,
    category:   input.category,
    camera_on:  input.cameraOn,
  });

  if (insertErr) {
    logger.error('ranking.session.end.insert.error', insertErr, { userId: input.userId });
    throw new Error('Erro ao gravar sessão de estudo.');
  }

  // Remove de active_study_sessions
  await supabase!.from('active_study_sessions').delete().eq('user_id', input.userId);

  return { durationMin, eligible, reason };
}

// ── Ranking list ──────────────────────────────────────────────

export async function getRankingList(opts: {
  period: RankingPeriod;
  category?: string | null;
  page: number;
  limit: number;
}) {
  assertClient();
  const refDate = getRefDate(opts.period);
  const offset = (opts.page - 1) * opts.limit;

  let query = supabase!
    .from('ranking_snapshots')
    .select('*', { count: 'exact' })
    .eq('period', opts.period)
    .eq('ref_date', refDate)
    .order('position', { ascending: true })
    .range(offset, offset + opts.limit - 1);

  if (opts.category) query = query.eq('category', opts.category);

  const { data: list, count, error } = await query;
  if (error) throw new Error(error.message);

  const { count: nowCount } = await supabase!
    .from('active_study_sessions')
    .select('*', { count: 'exact', head: true });

  const mapped = (list ?? []).map((u) => ({ ...u, formatted_time: formatMinutes(u.total_valid_min) }));

  return {
    period: opts.period,
    ref_date: refDate,
    top3: mapped.slice(0, 3),
    list: mapped,
    total: count ?? 0,
    page: opts.page,
    limit: opts.limit,
    now_studying: nowCount ?? 0,
  };
}

// ── Ranking /me ───────────────────────────────────────────────

export async function getRankingMe(userId: string, period: RankingPeriod): Promise<RankingMeResult> {
  assertClient();
  const refDate = getRefDate(period);

  const { data: snap } = await supabase!
    .from('ranking_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('period', period)
    .eq('ref_date', refDate)
    .maybeSingle();

  const { count: nowCount } = await supabase!
    .from('active_study_sessions')
    .select('*', { count: 'exact', head: true });

  return {
    period,
    refDate,
    position_global:      snap?.position              ?? 0,
    percentile_global:    snap?.percentile_global     ?? snap?.percentile ?? 0,
    position_category:    snap?.position_category     ?? 0,
    percentile_category:  snap?.percentile_category   ?? 0,
    total_users_global:   snap?.total_users_global    ?? 0,
    total_users_category: snap?.total_users_category  ?? 0,
    total_valid_min:      snap?.total_valid_min        ?? 0,
    formatted_time:       formatMinutes(snap?.total_valid_min ?? 0),
    now_studying:         nowCount ?? 0,
  };
}

// ── Now studying ──────────────────────────────────────────────

export async function getNowStudying(): Promise<number> {
  assertClient();
  const { count } = await supabase!
    .from('active_study_sessions')
    .select('*', { count: 'exact', head: true });
  return count ?? 0;
}

// ── Recalculate (worker / admin) ──────────────────────────────

export async function recalculateSnapshot(
  period: RankingPeriod,
  refDate?: string,
): Promise<{ period: RankingPeriod; refDate: string; durationMs: number; rows: number }> {
  assertClient();
  const targetDate = refDate ?? getRefDate(period);
  const t0 = Date.now();

  const { data, error } = await supabase!.rpc('calculate_ranking_snapshot', {
    p_period:   period,
    p_ref_date: targetDate,
  });

  const durationMs = Date.now() - t0;

  if (error) {
    logger.error('ranking.recalculate.error', error, { period, refDate: targetDate, durationMs });
    throw new Error(error.message);
  }

  const rows = (data as { rows_inserted?: number } | null)?.rows_inserted ?? 0;

  logger.info('ranking.recalculate', {
    feature: 'ranking',
    event:   'ranking.recalculate',
    period,
    refDate: targetDate,
    durationMs,
    status:  'ok',
    rows,
  } as never);

  return { period, refDate: targetDate, durationMs, rows };
}

export const rankingService = {
  startSession:         startRankingSession,
  endSession:           endRankingSession,
  getList:              getRankingList,
  getMe:                getRankingMe,
  getNowStudying,
  recalculate:          recalculateSnapshot,
  getRefDate,
  VALID_CATEGORIES,
};
