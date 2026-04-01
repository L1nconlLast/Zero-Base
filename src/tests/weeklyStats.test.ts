import { describe, expect, it } from 'vitest';
import type { StudySession } from '../types';
import { calculateWeeklyStats, sanitizeSubject } from '../utils/weeklyStats';

const weekDate = new Date(2026, 2, 25, 12);

const createSession = (overrides: Partial<StudySession> = {}): StudySession => ({
  date: new Date(2026, 2, 24, 12).toISOString(),
  minutes: 60,
  points: 0,
  subject: 'Outra',
  duration: 60,
  ...overrides,
});

describe('weeklyStats subject normalization', () => {
  it('sanitizes dirty subjects before building the chart distribution', () => {
    const stats = calculateWeeklyStats([
      createSession({
        subject: 'session_payload_bruta' as StudySession['subject'],
        minutes: 30,
        duration: 30,
      }),
      createSession({
        date: new Date(2026, 2, 25, 12).toISOString(),
        subject: 'matematica_basico' as StudySession['subject'],
        minutes: 45,
        duration: 45,
      }),
      createSession({
        date: new Date(2026, 2, 26, 12).toISOString(),
        subject: 'histologia|revisao' as StudySession['subject'],
        minutes: 25,
        duration: 25,
      }),
      createSession({
        date: new Date(2026, 2, 27, 12).toISOString(),
        subject: '123e4567-e89b-12d3-a456-426614174000' as StudySession['subject'],
        minutes: 20,
        duration: 20,
      }),
    ], weekDate);

    expect(stats.totalMinutes).toBe(120);
    expect(stats.subjectDistribution.map((entry) => entry.subject)).toEqual([
      'Outra',
      'Matematica',
      'Histologia',
    ]);
    expect(stats.subjectDistribution.map((entry) => entry.minutes)).toEqual([50, 45, 25]);
    expect(stats.subjectDistribution[0].percentage).toBeCloseTo(41.67, 1);
  });

  it('drops invalid or empty values to the default subject label', () => {
    expect(sanitizeSubject('')).toBe('Outra');
    expect(sanitizeSubject('{"payload":true}')).toBe('Outra');
    expect(sanitizeSubject('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe('Outra');
    expect(sanitizeSubject('anatomia/revisao')).toBe('Anatomia');
  });
});
