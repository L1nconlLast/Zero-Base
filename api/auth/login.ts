import { publicSupabase, sendError, sendJson, serializeSession } from '../_lib/supabase.js';
import { ensureCoreUserRecords } from '../_lib/mvp.js';

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
    return;
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Email e senha sao obrigatorios.');
    return;
  }

  if (!publicSupabase) {
    sendError(res, 503, 'SUPABASE_NOT_CONFIGURED', 'Supabase nao configurado no servidor.');
    return;
  }

  try {
    const { data, error } = await publicSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      sendError(res, 401, 'INVALID_CREDENTIALS', 'Email ou senha incorretos.');
      return;
    }

    await ensureCoreUserRecords(data.user);

    sendJson(res, 200, {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuario',
      },
      session: serializeSession(data.session),
    });
  } catch (error: any) {
    sendError(res, 500, 'INTERNAL_ERROR', error?.message || 'Erro ao autenticar usuario.');
  }
}
