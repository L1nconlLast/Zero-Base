import { createClient } from '@supabase/supabase-js';

const getEnv = (...names: string[]): string => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
const publicKey = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

export const publicSupabase = supabaseUrl && publicKey
  ? createClient(supabaseUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;

export const adminSupabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;

export const sendJson = (res: any, status: number, payload: unknown): void => {
  res.status(status).json(payload);
};

export const sendError = (
  res: any,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void => {
  sendJson(res, status, {
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
};

export const getBearerToken = (authorization?: string): string | null => {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
};

export const resolveAuthUser = async (
  authorization?: string,
): Promise<
  { ok: true; token: string; user: any }
  | { ok: false; status: number; message: string }
> => {
  const token = getBearerToken(authorization);
  if (!token) {
    return { ok: false, status: 401, message: 'Token de acesso ausente.' };
  }

  const client = publicSupabase || adminSupabase;
  if (!client) {
    return { ok: false, status: 503, message: 'Supabase nao configurado no servidor.' };
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, message: 'Token invalido ou expirado.' };
  }

  return { ok: true, token, user: data.user };
};

export const serializeSession = (session: any) => {
  if (!session) {
    return null;
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at || null,
    expiresIn: session.expires_in || null,
    tokenType: session.token_type || 'bearer',
  };
};
