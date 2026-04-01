import { afterEach, describe, expect, it } from 'vitest';

import {
  buildDay1NotificationTag,
  isAuthorizedCronRequest,
  isDay1ResumeDue,
  isNotificationAdminUser,
  isWithinDay1ResumeWindow,
  pickDay1NotificationCopy,
} from '../../../api/_lib/notifications';

const originalCronSecret = process.env.CRON_SECRET;
const originalMentorAdminEmail = process.env.MENTOR_ADMIN_EMAIL;
const originalMentorAdminEmails = process.env.MENTOR_ADMIN_EMAILS;

afterEach(() => {
  process.env.CRON_SECRET = originalCronSecret;
  process.env.MENTOR_ADMIN_EMAIL = originalMentorAdminEmail;
  process.env.MENTOR_ADMIN_EMAILS = originalMentorAdminEmails;
});

describe('vercel notifications helpers', () => {
  it('reconhece a janela local de envio do D+1', () => {
    expect(isWithinDay1ResumeWindow(new Date('2026-03-29T15:00:00.000Z'), 'America/Sao_Paulo')).toBe(true);
    expect(isWithinDay1ResumeWindow(new Date('2026-03-29T21:00:00.000Z'), 'America/Sao_Paulo')).toBe(true);
    expect(isWithinDay1ResumeWindow(new Date('2026-03-30T01:00:00.000Z'), 'America/Sao_Paulo')).toBe(false);
  });

  it('sinaliza envio apenas no dia seguinte e cancela se o usuario ja voltou', () => {
    expect(isDay1ResumeDue({
      finishedAt: '2026-03-28T22:00:00.000Z',
      now: new Date('2026-03-29T21:00:00.000Z'),
      timeZone: 'America/Sao_Paulo',
    })).toBe(true);

    expect(isDay1ResumeDue({
      finishedAt: '2026-03-28T22:00:00.000Z',
      lastSeenAt: '2026-03-29T10:00:00.000Z',
      now: new Date('2026-03-29T21:00:00.000Z'),
      timeZone: 'America/Sao_Paulo',
    })).toBe(false);

    expect(isDay1ResumeDue({
      finishedAt: '2026-03-28T22:00:00.000Z',
      now: new Date('2026-03-30T21:00:00.000Z'),
      timeZone: 'America/Sao_Paulo',
    })).toBe(false);
  });

  it('gera tag dedicada e copy deterministica por usuario', () => {
    expect(buildDay1NotificationTag('session-123')).toBe('d1_notification_sent:session-123');
    expect(pickDay1NotificationCopy('user-abc')).toEqual(pickDay1NotificationCopy('user-abc'));
  });

  it('autoriza cron por segredo ou pelo user-agent padrao da Vercel', () => {
    process.env.CRON_SECRET = 'cron-secret';

    expect(isAuthorizedCronRequest({
      headers: {
        authorization: 'Bearer cron-secret',
        'user-agent': 'curl/8.0.0',
      },
    })).toBe(true);

    expect(isAuthorizedCronRequest({
      headers: {
        authorization: 'Bearer wrong-secret',
        'user-agent': 'vercel-cron/1.0',
      },
    })).toBe(false);

    delete process.env.CRON_SECRET;

    expect(isAuthorizedCronRequest({
      headers: {
        'user-agent': 'vercel-cron/1.0',
      },
    })).toBe(true);
  });

  it('reconhece admin por role ou email permitido', () => {
    process.env.MENTOR_ADMIN_EMAILS = 'ops@zerobase.dev,owner@zerobase.dev';

    expect(isNotificationAdminUser({
      email: 'ops@zerobase.dev',
      app_metadata: {},
      user_metadata: {},
    })).toBe(true);

    expect(isNotificationAdminUser({
      email: 'user@zerobase.dev',
      app_metadata: { role: 'admin' },
      user_metadata: {},
    })).toBe(true);

    expect(isNotificationAdminUser({
      email: 'user@zerobase.dev',
      app_metadata: {},
      user_metadata: {},
    })).toBe(false);
  });
});
