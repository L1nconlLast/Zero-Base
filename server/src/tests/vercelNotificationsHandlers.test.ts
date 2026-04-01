import { beforeEach, describe, expect, it, vi } from 'vitest';

const notificationsMocks = vi.hoisted(() => ({
  getNotificationsPublicKey: vi.fn(),
  upsertPushSubscription: vi.fn(),
  removePushSubscription: vi.fn(),
  markNotificationUserActivity: vi.fn(),
  sendPushToUser: vi.fn(),
  runDay1ResumeReminderJob: vi.fn(),
  isAuthorizedCronRequest: vi.fn(),
  isNotificationAdminUser: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => {
  const sendJson = vi.fn((res: any, status: number, payload: unknown) => {
    res.status(status).json(payload);
  });

  const sendError = vi.fn((res: any, status: number, code: string, message: string, details?: unknown) => {
    res.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
    });
  });

  return {
    resolveAuthUser: vi.fn(),
    sendJson,
    sendError,
  };
});

vi.mock('../../../api/_lib/notifications.js', () => notificationsMocks);
vi.mock('../../../api/_lib/supabase.js', () => supabaseMocks);

import notificationsHandler from '../../../api/notifications';

const createMockRes = () => {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return res;
};

describe('vercel notification handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna a chave publica em JSON real', async () => {
    notificationsMocks.getNotificationsPublicKey.mockReturnValue('public-key-123');
    const res = createMockRes();

    await notificationsHandler({ method: 'GET', headers: {}, query: { action: 'public-key' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ publicKey: 'public-key-123' });
  });

  it('salva a subscription autenticada', async () => {
    supabaseMocks.resolveAuthUser.mockResolvedValue({
      ok: true,
      user: { id: 'user-1' },
    });
    notificationsMocks.upsertPushSubscription.mockResolvedValue(undefined);
    const res = createMockRes();

    await notificationsHandler({
      method: 'POST',
      headers: {
        authorization: 'Bearer token-123',
        'user-agent': 'vitest',
      },
      query: { action: 'subscribe' },
      body: {
        endpoint: 'https://push.example.dev/subscription',
        keys: {
          p256dh: 'abcdefghijklmnop',
          auth: '12345678',
        },
      },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(notificationsMocks.upsertPushSubscription).toHaveBeenCalledWith({
      userId: 'user-1',
      endpoint: 'https://push.example.dev/subscription',
      p256dh: 'abcdefghijklmnop',
      auth: '12345678',
      userAgent: 'vitest',
    });
  });

  it('executa o trigger D+1 via cron autorizado', async () => {
    notificationsMocks.isAuthorizedCronRequest.mockReturnValue(true);
    notificationsMocks.runDay1ResumeReminderJob.mockResolvedValue({ users: 3, sent: 2 });
    const res = createMockRes();

    await notificationsHandler({
      method: 'GET',
      headers: {
        authorization: 'Bearer cron-secret',
        'user-agent': 'vercel-cron/1.0',
      },
      query: { action: 'trigger-day1' },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, source: 'cron', users: 3, sent: 2 });
    expect(notificationsMocks.runDay1ResumeReminderJob).toHaveBeenCalledTimes(1);
  });

  it('permite trigger manual D+1 apenas para admin e respeita o now informado', async () => {
    supabaseMocks.resolveAuthUser.mockResolvedValue({
      ok: true,
      user: {
        id: 'admin-1',
        email: 'ops@zerobase.dev',
      },
    });
    notificationsMocks.isNotificationAdminUser.mockReturnValue(true);
    notificationsMocks.runDay1ResumeReminderJob.mockResolvedValue({ users: 1, sent: 1 });
    const res = createMockRes();

    await notificationsHandler({
      method: 'POST',
      headers: {
        authorization: 'Bearer admin-token',
      },
      query: { action: 'trigger-day1' },
      body: {
        now: '2026-03-29T21:00:00.000Z',
      },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      source: 'admin',
      evaluatedAt: '2026-03-29T21:00:00.000Z',
      users: 1,
      sent: 1,
    });

    const effectiveNow = notificationsMocks.runDay1ResumeReminderJob.mock.calls[0]?.[0];
    expect(effectiveNow).toBeInstanceOf(Date);
    expect(effectiveNow.toISOString()).toBe('2026-03-29T21:00:00.000Z');
  });
});
