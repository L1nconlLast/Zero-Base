import { createClient } from '@supabase/supabase-js';

type AuthResult = {
  ok: true;
  userId: string;
} | {
  ok: false;
  status: number;
  message: string;
};

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

export const getBearerToken = (authorization?: string): string | null => {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
};

export const toDateOnly = (value?: string | null): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

export const isMissingTableError = (message?: string): boolean => {
  const normalized = (message || '').toLowerCase();
  return normalized.includes('onboarding_profile') && (normalized.includes('does not exist') || normalized.includes('undefined table'));
};

export const resolveAuthUser = async (authorization?: string): Promise<AuthResult> => {
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
};
