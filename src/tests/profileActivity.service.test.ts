import { describe, expect, it } from 'vitest';
import type { StudySession } from '../types';
import { buildProfileActivitySnapshot } from '../services/profileActivity.service';

const makeSession = (date: string, minutes: number, subject = 'Biologia'): StudySession => ({
  date,
  minutes,
  points: 0,
  subject,
  duration: minutes,
});

describe('profileActivity.service', () => {
  it('aggregates real study activity by totals, active days, streak, and heatmap', () => {
    const snapshot = buildProfileActivitySnapshot(
      [
        makeSession('2026-03-21T08:00:00.000Z', 25, 'Biologia'),
        makeSession('2026-03-21T18:00:00.000Z', 35, 'Quimica'),
        makeSession('2026-03-20T10:00:00.000Z', 45, 'Fisica'),
        makeSession('2026-03-18T10:00:00.000Z', 90, 'Historia'),
      ],
      new Date('2026-03-21T12:00:00.000Z'),
    );

    expect(snapshot.totalMinutes).toBe(195);
    expect(snapshot.totalHours).toBe(3);
    expect(snapshot.totalSessions).toBe(4);
    expect(snapshot.daysWithActivity).toBe(3);
    expect(snapshot.currentStreak).toBe(2);
    expect(snapshot.heatmap).toHaveLength(365);

    const today = snapshot.heatmap.find((entry) => entry.date === '2026-03-21');
    expect(today).toEqual({
      date: '2026-03-21',
      minutes: 60,
      sessions: 2,
      logins: 1,
      level: 3,
    });
  });

  it('keeps the streak alive when the last active day was yesterday', () => {
    const snapshot = buildProfileActivitySnapshot(
      [
        makeSession('2026-03-20T08:00:00.000Z', 50),
        makeSession('2026-03-19T08:00:00.000Z', 30),
      ],
      new Date('2026-03-21T12:00:00.000Z'),
    );

    expect(snapshot.currentStreak).toBe(2);
  });

  it('returns an empty heatmap summary when there is no study activity', () => {
    const snapshot = buildProfileActivitySnapshot([], new Date('2026-03-21T12:00:00.000Z'));

    expect(snapshot.totalMinutes).toBe(0);
    expect(snapshot.totalHours).toBe(0);
    expect(snapshot.totalSessions).toBe(0);
    expect(snapshot.daysWithActivity).toBe(0);
    expect(snapshot.currentStreak).toBe(0);
    expect(snapshot.heatmap).toHaveLength(365);
    expect(snapshot.heatmap.every((entry) => entry.minutes === 0 && entry.level === 0)).toBe(true);
  });
});
