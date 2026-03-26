import { ensureCoreUserRecords } from '../_lib/mvp.js';
import { createOrResumeStudySession } from '../_lib/studySessions.js';
import { resolveAuthUser, sendError, sendJson } from '../_lib/supabase.js';

const normalizeFocusOverride = (
  value: unknown,
): { subject: string; topic?: string | null; reason?: string | null } | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as {
    subject?: unknown;
    topic?: unknown;
    reason?: unknown;
  };
  const subject = String(source.subject || '').trim();
  if (!subject) {
    return null;
  }

  const topic = typeof source.topic === 'string' && source.topic.trim()
    ? source.topic.trim()
    : null;
  const reason = typeof source.reason === 'string' && source.reason.trim()
    ? source.reason.trim()
    : null;

  return {
    subject,
    topic,
    reason,
  };
};

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
    return;
  }

  const auth = await resolveAuthUser(req.headers.authorization);
  if (auth.ok === false) {
    sendError(res, auth.status, 'UNAUTHORIZED', auth.message);
    return;
  }

  const limit = Number(req.body?.limit ?? 5);
  if (!Number.isFinite(limit) || limit <= 0 || limit > 10) {
    sendError(res, 400, 'VALIDATION_ERROR', 'limit invalido para a sessao curta.');
    return;
  }

  const focusOverride = normalizeFocusOverride(req.body?.focusOverride);

  try {
    await ensureCoreUserRecords(auth.user);
    const session = await createOrResumeStudySession(auth.user.id, limit, focusOverride);
    sendJson(res, 200, {
      success: true,
      session,
    });
  } catch (error: any) {
    const message = error?.message || 'Erro ao iniciar sessao curta.';

    if (
      message.includes('Nao foi possivel gerar a recomendacao')
      || message.includes('Nao ha questoes suficientes')
    ) {
      sendError(res, 409, 'SESSION_SETUP_BLOCKED', message);
      return;
    }

    sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}
