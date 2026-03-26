import { ensureCoreUserRecords } from './_lib/mvp.js';
import { finishStudySession, getStudySession, submitStudySessionAnswer } from './_lib/studySessions.js';
import { resolveAuthUser, sendError, sendJson } from './_lib/supabase.js';

const getQueryValue = (raw: unknown): string => {
  if (Array.isArray(raw)) {
    return String(raw[0] || '');
  }

  return String(raw || '');
};

export default async function handler(req: any, res: any): Promise<void> {
  const auth = await resolveAuthUser(req.headers.authorization);
  if (auth.ok === false) {
    sendError(res, auth.status, 'UNAUTHORIZED', auth.message);
    return;
  }

  const sessionId = getQueryValue(req.query?.sessionId);
  const action = getQueryValue(req.query?.action).toLowerCase();

  if (!sessionId) {
    sendError(res, 400, 'VALIDATION_ERROR', 'sessionId obrigatorio.');
    return;
  }

  try {
    await ensureCoreUserRecords(auth.user);

    if (req.method === 'GET') {
      const session = await getStudySession(auth.user.id, sessionId);

      if (!session) {
        sendError(res, 404, 'SESSION_NOT_FOUND', 'Sessao nao encontrada.');
        return;
      }

      sendJson(res, 200, {
        success: true,
        session,
      });
      return;
    }

    if (req.method !== 'POST') {
      sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
      return;
    }

    if (action === 'answer') {
      const questionId = String(req.body?.questionId || '');
      const alternativeId = String(req.body?.alternativeId || '');
      const responseTimeSeconds = Number(req.body?.responseTimeSeconds ?? 30);

      if (!questionId || !alternativeId) {
        sendError(res, 400, 'VALIDATION_ERROR', 'questionId e alternativeId sao obrigatorios.');
        return;
      }

      try {
        const session = await submitStudySessionAnswer(auth.user.id, sessionId, {
          questionId,
          alternativeId,
          responseTimeSeconds,
        });

        sendJson(res, 200, {
          success: true,
          session,
        });
        return;
      } catch (error: any) {
        const message = error?.message || 'Erro ao registrar resposta.';

        if (message.includes('Sessao nao encontrada')) {
          sendError(res, 404, 'SESSION_NOT_FOUND', message);
          return;
        }

        if (
          message.includes('ja respondida')
          || message.includes('Sessao ja finalizada')
          || message.includes('Questao nao pertence')
          || message.includes('Alternativa invalida')
        ) {
          sendError(res, 409, 'SESSION_CONFLICT', message);
          return;
        }

        sendError(res, 500, 'INTERNAL_ERROR', message);
        return;
      }
    }

    if (action === 'finish') {
      try {
        const result = await finishStudySession(auth.user.id, sessionId);
        sendJson(res, 200, {
          success: true,
          ...result,
        });
        return;
      } catch (error: any) {
        const message = error?.message || 'Erro ao finalizar sessao.';

        if (message.includes('Sessao nao encontrada')) {
          sendError(res, 404, 'SESSION_NOT_FOUND', message);
          return;
        }

        if (message.includes('finalizada') || message.includes('Responda todas as questoes')) {
          sendError(res, 409, 'SESSION_CONFLICT', message);
          return;
        }

        sendError(res, 500, 'INTERNAL_ERROR', message);
        return;
      }
    }

    sendError(res, 400, 'VALIDATION_ERROR', 'Acao invalida para a sessao.');
  } catch (error: any) {
    sendError(res, 500, 'INTERNAL_ERROR', error?.message || 'Erro ao carregar sessao curta.');
  }
}
