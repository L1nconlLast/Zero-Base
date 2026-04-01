import { describe, expect, it } from 'vitest';
import type { ScheduleEntry, StudySession } from '../types';
import { buildProfileStreakData } from '../features/profile/profileStreak';

describe('buildProfileStreakData', () => {
  it('combina sessoes e revisoes para formar a sequencia atual com hoje ativo', () => {
    const sessions: StudySession[] = [
      {
        date: '2026-03-28T12:00:00.000Z',
        minutes: 30,
        points: 20,
        subject: 'Matematica',
        duration: 1800,
      },
      {
        date: '2026-03-29T12:00:00.000Z',
        minutes: 25,
        points: 15,
        subject: 'Biologia',
        duration: 1500,
      },
    ];
    const scheduleEntries: ScheduleEntry[] = [
      {
        id: 'review-1',
        date: '2026-04-01',
        subject: 'Historia',
        topic: 'Imperio',
        done: false,
        status: 'pendente',
        studyType: 'revisao',
        lastReviewedAt: '2026-03-30T14:00:00.000Z',
      },
    ];

    const result = buildProfileStreakData(
      sessions,
      scheduleEntries,
      new Date('2026-03-30T12:00:00.000Z'),
    );

    expect(result.currentStreak).toBe(3);
    expect(result.bestStreak).toBe(3);
    expect(result.activeToday).toBe(true);
    expect(result.recentActiveCount).toBe(3);
    expect(result.consistencyLabel).toContain('Hoje ja entrou na sequencia');
  });

  it('mantem a sequencia contando ate ontem quando hoje ainda nao foi ativado', () => {
    const sessions: StudySession[] = [
      {
        date: '2026-03-27T12:00:00.000Z',
        minutes: 20,
        points: 10,
        subject: 'Historia',
        duration: 1200,
      },
      {
        date: '2026-03-28T12:00:00.000Z',
        minutes: 20,
        points: 10,
        subject: 'Historia',
        duration: 1200,
      },
      {
        date: '2026-03-29T12:00:00.000Z',
        minutes: 20,
        points: 10,
        subject: 'Historia',
        duration: 1200,
      },
    ];

    const result = buildProfileStreakData(
      sessions,
      [],
      new Date('2026-03-30T12:00:00.000Z'),
    );

    expect(result.currentStreak).toBe(3);
    expect(result.activeToday).toBe(false);
    expect(result.consistencyLabel).toContain('Hoje ainda nao entrou na sequencia');
  });

  it('separa melhor sequencia da sequencia atual quando o ritmo recente foi quebrado', () => {
    const sessions: StudySession[] = [
      {
        date: '2026-03-20T12:00:00.000Z',
        minutes: 20,
        points: 10,
        subject: 'Quimica',
        duration: 1200,
      },
      {
        date: '2026-03-21T12:00:00.000Z',
        minutes: 20,
        points: 10,
        subject: 'Quimica',
        duration: 1200,
      },
      {
        date: '2026-03-22T12:00:00.000Z',
        minutes: 20,
        points: 10,
        subject: 'Quimica',
        duration: 1200,
      },
      {
        date: '2026-03-28T12:00:00.000Z',
        minutes: 20,
        points: 10,
        subject: 'Quimica',
        duration: 1200,
      },
    ];

    const result = buildProfileStreakData(
      sessions,
      [],
      new Date('2026-03-30T12:00:00.000Z'),
    );

    expect(result.currentStreak).toBe(1);
    expect(result.bestStreak).toBe(3);
  });

  it('gera estado inicial digno quando ainda nao existe atividade', () => {
    const result = buildProfileStreakData([], [], new Date('2026-03-30T12:00:00.000Z'));

    expect(result.currentStreak).toBe(0);
    expect(result.bestStreak).toBe(0);
    expect(result.activeToday).toBe(false);
    expect(result.recentActiveCount).toBe(0);
    expect(result.consistencyLabel).toContain('Sua consistencia comeca');
    expect(result.recentDays).toHaveLength(7);
  });
});
