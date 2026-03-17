import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  || process.env.VITE_SUPABASE_ANON_KEY?.trim();

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

const getBearerToken = (authorization?: string): string | null => {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
};

const toDateOnly = (value?: string | null): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const isMissingTableError = (message?: string): boolean => {
  const normalized = (message || '').toLowerCase();
  return normalized.includes('onboarding_profile') && (normalized.includes('does not exist') || normalized.includes('undefined table'));
};

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Metodo nao permitido.' } });
    return;
  }

  const auth = await resolveAuthUser(req.headers.authorization);
  if (!auth.ok) {
    res.status(auth.status).json({ error: { code: 'UNAUTHORIZED', message: auth.message } });
    return;
  }

  if (!supabase) {
    res.status(503).json({ error: { code: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase nao configurado no servidor.' } });
    return;
  }

  const incomingDaysRaw = Number(req.body?.streakDays ?? 0);
  const incomingDays = Number.isFinite(incomingDaysRaw) ? Math.max(0, Math.min(365, incomingDaysRaw)) : 0;
  const incomingLastDay = toDateOnly(req.body?.streakLastDay ?? null);

  const { data: current, error: fetchError } = await supabase
    .from('onboarding_profile')
    .select('streak_days, streak_last_day')
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (fetchError && !isMissingTableError(fetchError.message)) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar onboarding.' } });
    return;
  }

  const dbDaysRaw = Number(current?.streak_days ?? 0);
  const dbDays = Number.isFinite(dbDaysRaw) ? Math.max(0, dbDaysRaw) : 0;
  const dbLastDay = toDateOnly(current?.streak_last_day ?? null);

  const mergedDays = Math.max(dbDays, incomingDays);
  const mergedLastDay = (() => {
    if (dbLastDay && incomingLastDay) {
      return dbLastDay > incomingLastDay ? dbLastDay : incomingLastDay;
    }
    return dbLastDay || incomingLastDay;
  })();

  const { error: upsertError } = await supabase
    .from('onboarding_profile')
    .upsert(
      {
        user_id: auth.userId,
        streak_days: mergedDays,
        streak_last_day: mergedLastDay,
      },
      { onConflict: 'user_id' },
    );

  if (upsertError) {
    if (isMissingTableError(upsertError.message)) {
      res.status(200).json({ ok: true, streakDays: mergedDays, streakLastDay: mergedLastDay });
      return;
    }

    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao salvar onboarding.' } });
    return;
  }

  res.status(200).json({ ok: true, streakDays: mergedDays, streakLastDay: mergedLastDay });
}

async function resolveAuthUser(authorization?: string): Promise<
  { ok: true; userId: string } | { ok: false; status: number; message: string }
> {
  if (!supabase) {
    return { ok: false, status: 503, message: 'Supabase nao configurado no servidor.' };
  }

  const token = getBearerToken(authorization);
  if (!token) {
    return { ok: false, status: 401, message: 'Token de acesso ausente.' };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) {
    return { ok: false, status: 401, message: 'Token invalido ou expirado.' };
  }

  return { ok: true, userId: data.user.id };
}
