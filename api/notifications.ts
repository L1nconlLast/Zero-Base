import { z } from 'zod';

import {
  getNotificationsPublicKey,
  isAuthorizedCronRequest,
  isNotificationAdminUser,
  markNotificationUserActivity,
  removePushSubscription,
  runDay1ResumeReminderJob,
  sendPushToUser,
  upsertPushSubscription,
} from './_lib/notifications.js';
import { resolveAuthUser, sendError, sendJson } from './_lib/supabase.js';

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(16),
    auth: z.string().min(8),
  }),
});

const UnsubscribeSchema = z.object({
  endpoint: z.string().url().optional(),
});

const HeartbeatSchema = z.object({
  action: z.string().min(1).max(80).optional(),
  appVersion: z.string().min(1).max(40).optional(),
  platform: z.string().min(1).max(40).optional(),
});

const TestPushSchema = z.object({
  title: z.string().min(1).max(80).default('Lembrete Zero Base'),
  body: z.string().min(1).max(200).default('Hora de revisar seu plano de hoje.'),
});

const TriggerDay1Schema = z.object({
  now: z.string().datetime().optional(),
});

export const config = {
  maxDuration: 60,
};

const getActionFromRequest = (req: any): string | null => {
  const queryAction = req?.query?.action;
  if (typeof queryAction === 'string' && queryAction.trim()) {
    return queryAction.trim().toLowerCase();
  }

  const requestUrl = typeof req?.url === 'string' ? req.url : '';
  if (!requestUrl) {
    return null;
  }

  try {
    const parsed = new URL(requestUrl, 'https://zero-base.local');
    const action = parsed.searchParams.get('action');
    return action?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
};

const resolveEffectiveNow = (value?: string): Date => {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Campo "now" invalido.');
  }

  return parsed;
};

const handlePublicKey = async (req: any, res: any): Promise<void> => {
  if (req.method !== 'GET') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
    return;
  }

  const publicKey = getNotificationsPublicKey();
  if (!publicKey) {
    sendError(res, 503, 'PUSH_NOT_CONFIGURED', 'Push notifications nao configuradas no servidor.');
    return;
  }

  sendJson(res, 200, { publicKey });
};

const handleSubscribe = async (req: any, res: any): Promise<void> => {
  if (req.method !== 'POST') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
    return;
  }

  const auth = await resolveAuthUser(req.headers.authorization);
  if (auth.ok === false) {
    sendError(res, auth.status, 'UNAUTHORIZED', auth.message);
    return;
  }

  const parsed = SubscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Payload invalido.', parsed.error.flatten().fieldErrors);
    return;
  }

  try {
    await upsertPushSubscription({
      userId: auth.user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: req.headers['user-agent'] || undefined,
    });

    sendJson(res, 200, { ok: true });
  } catch (error: any) {
    sendError(res, 500, 'PUSH_SUBSCRIBE_FAILED', error?.message || 'Erro ao salvar assinatura.');
  }
};

const handleUnsubscribe = async (req: any, res: any): Promise<void> => {
  if (req.method !== 'POST') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
    return;
  }

  const auth = await resolveAuthUser(req.headers.authorization);
  if (auth.ok === false) {
    sendError(res, auth.status, 'UNAUTHORIZED', auth.message);
    return;
  }

  const parsed = UnsubscribeSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Payload invalido.', parsed.error.flatten().fieldErrors);
    return;
  }

  try {
    const removed = await removePushSubscription({
      userId: auth.user.id,
      endpoint: parsed.data.endpoint || null,
    });

    sendJson(res, 200, { ok: true, removed });
  } catch (error: any) {
    sendError(res, 500, 'PUSH_UNSUBSCRIBE_FAILED', error?.message || 'Erro ao remover assinatura.');
  }
};

const handleHeartbeat = async (req: any, res: any): Promise<void> => {
  if (req.method !== 'POST') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
    return;
  }

  const auth = await resolveAuthUser(req.headers.authorization);
  if (auth.ok === false) {
    sendError(res, auth.status, 'UNAUTHORIZED', auth.message);
    return;
  }

  const parsed = HeartbeatSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Payload invalido.', parsed.error.flatten().fieldErrors);
    return;
  }

  try {
    await markNotificationUserActivity({
      userId: auth.user.id,
      action: parsed.data.action,
      appVersion: parsed.data.appVersion,
      platform: parsed.data.platform,
    });

    sendJson(res, 200, { ok: true });
  } catch (error: any) {
    sendError(res, 500, 'PUSH_HEARTBEAT_FAILED', error?.message || 'Erro ao registrar atividade.');
  }
};

const handleTest = async (req: any, res: any): Promise<void> => {
  if (req.method !== 'POST') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
    return;
  }

  const auth = await resolveAuthUser(req.headers.authorization);
  if (auth.ok === false) {
    sendError(res, auth.status, 'UNAUTHORIZED', auth.message);
    return;
  }

  const parsed = TestPushSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Payload invalido.', parsed.error.flatten().fieldErrors);
    return;
  }

  try {
    const sent = await sendPushToUser(auth.user.id, {
      title: parsed.data.title,
      body: parsed.data.body,
      tag: 'manual-test',
      url: '/',
    });

    sendJson(res, 200, { ok: true, sent });
  } catch (error: any) {
    sendError(res, 500, 'PUSH_TEST_FAILED', error?.message || 'Erro ao enviar push de teste.');
  }
};

const handleTriggerDay1 = async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    if (!isAuthorizedCronRequest(req)) {
      sendError(res, 401, 'UNAUTHORIZED_CRON', 'Cron nao autorizado.');
      return;
    }

    try {
      const result = await runDay1ResumeReminderJob();
      sendJson(res, 200, { ok: true, source: 'cron', ...result });
    } catch (error: any) {
      sendError(res, 500, 'DAY1_TRIGGER_FAILED', error?.message || 'Erro ao executar cron day1.');
    }
    return;
  }

  if (req.method !== 'POST') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
    return;
  }

  const auth = await resolveAuthUser(req.headers.authorization);
  if (auth.ok === false) {
    sendError(res, auth.status, 'UNAUTHORIZED', auth.message);
    return;
  }

  if (!isNotificationAdminUser(auth.user)) {
    sendError(res, 403, 'FORBIDDEN', 'Acesso restrito ao admin.');
    return;
  }

  const parsed = TriggerDay1Schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Payload invalido.', parsed.error.flatten().fieldErrors);
    return;
  }

  try {
    const effectiveNow = resolveEffectiveNow(parsed.data.now);
    const result = await runDay1ResumeReminderJob(effectiveNow);
    sendJson(res, 200, {
      ok: true,
      source: 'admin',
      evaluatedAt: effectiveNow.toISOString(),
      ...result,
    });
  } catch (error: any) {
    sendError(res, 500, 'DAY1_TRIGGER_FAILED', error?.message || 'Erro ao executar trigger day1.');
  }
};

const handlers: Record<string, (req: any, res: any) => Promise<void>> = {
  'public-key': handlePublicKey,
  subscribe: handleSubscribe,
  unsubscribe: handleUnsubscribe,
  heartbeat: handleHeartbeat,
  test: handleTest,
  'trigger-day1': handleTriggerDay1,
};

export default async function handler(req: any, res: any): Promise<void> {
  const action = getActionFromRequest(req);
  if (!action || !handlers[action]) {
    sendError(res, 404, 'NOT_FOUND', 'Endpoint de notificacao nao encontrado.');
    return;
  }

  await handlers[action](req, res);
}
