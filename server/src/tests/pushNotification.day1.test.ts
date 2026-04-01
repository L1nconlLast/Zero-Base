import { describe, expect, it } from 'vitest';
import {
  buildDay1NotificationTag,
  isDay1ResumeDue,
  isWithinDay1ResumeWindow,
  pickDay1NotificationCopy,
} from '../services/pushNotification.service';

describe('push notification day1 resume helpers', () => {
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
});
