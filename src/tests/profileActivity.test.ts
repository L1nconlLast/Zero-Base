import { describe, expect, it } from 'vitest';
import type { ScheduleEntry, StudySession } from '../types';
import { buildProfileActivityData } from '../features/profile/profileActivity';

describe('buildProfileActivityData', () => {
  it('mescla sessoes e revisoes concluida em ordem de recencia', () => {
    const sessions: StudySession[] = [
      {
        date: '2026-03-28T12:00:00.000Z',
        minutes: 45,
        points: 30,
        subject: 'Matematica',
        duration: 2700,
      },
      {
        date: '2026-03-29T12:00:00.000Z',
        minutes: 35,
        points: 20,
        subject: 'Biologia',
        duration: 2100,
      },
    ];
    const scheduleEntries: ScheduleEntry[] = [
      {
        id: 'review-1',
        date: '2026-03-30',
        subject: 'Historia',
        topic: 'Imperio',
        done: false,
        status: 'pendente',
        studyType: 'revisao',
        source: 'manual',
        lastReviewedAt: '2026-03-30T14:00:00.000Z',
      },
    ];

    const result = buildProfileActivityData(
      sessions,
      scheduleEntries,
      new Date('2026-03-30T18:00:00.000Z'),
    );

    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({
      type: 'review',
      title: 'Revisao concluida',
      contextLabel: 'Historia - Imperio',
      relativeLabel: 'Hoje',
    });
    expect(result.items[1]).toMatchObject({
      type: 'study_session',
      title: 'Sessao concluida',
      contextLabel: 'Biologia',
      relativeLabel: 'Ontem',
    });
  });

  it('limita a lista para manter a leitura enxuta', () => {
    const sessions: StudySession[] = Array.from({ length: 6 }, (_, index) => ({
      date: `2026-03-${String(index + 25).padStart(2, '0')}T12:00:00.000Z`,
      minutes: 20 + index,
      points: 10,
      subject: 'Matematica',
      duration: 1200,
    }));

    const result = buildProfileActivityData(
      sessions,
      [],
      new Date('2026-03-30T12:00:00.000Z'),
    );

    expect(result.items).toHaveLength(5);
    expect(result.items[0]?.relativeLabel).toBe('Hoje');
  });

  it('mantem empty state digno quando nao existe atividade recente', () => {
    const result = buildProfileActivityData([], [], new Date('2026-03-30T12:00:00.000Z'));

    expect(result.items).toEqual([]);
    expect(result.emptyLabel).toContain('Conclua uma sessao ou revisao');
  });
});
