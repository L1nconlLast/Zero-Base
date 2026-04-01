import { describe, expect, it } from 'vitest';
import type { ScheduleEntry } from '../types';
import {
  buildHomeReviewQueueItems,
  queueStudyReviewEntry,
} from '../features/estudos/finishFlow';

const makeEntry = (overrides: Partial<ScheduleEntry>): ScheduleEntry => ({
  id: overrides.id || 'entry-1',
  date: overrides.date || '2026-03-28',
  subject: overrides.subject || 'Matematica',
  topic: overrides.topic,
  done: overrides.done ?? false,
  status: overrides.status || 'pendente',
  studyType: overrides.studyType,
  priority: overrides.priority,
  source: overrides.source,
  aiReason: overrides.aiReason,
  note: overrides.note,
});

describe('estudos finish flow', () => {
  it('cria revisao 24h pendente sem duplicar a mesma fila', () => {
    const firstPass = queueStudyReviewEntry([], {
      subject: 'Matematica',
      topic: 'Funcoes',
      completedAt: '2026-03-27T12:00:00.000Z',
      hours: 24,
      durationMinutes: 20,
    });

    expect(firstPass.created).toBe(true);
    expect(firstPass.reviewEntry?.studyType).toBe('revisao');
    expect(firstPass.reviewEntry?.priority).toBe('alta');

    const secondPass = queueStudyReviewEntry(firstPass.entries, {
      subject: 'Matematica',
      topic: 'Funcoes',
      completedAt: '2026-03-27T12:00:00.000Z',
      hours: 24,
      durationMinutes: 20,
    });

    expect(secondPass.created).toBe(false);
    expect(secondPass.entries).toHaveLength(1);
  });

  it('deriva a fila da home a partir das revisoes pendentes do cronograma', () => {
    const items = buildHomeReviewQueueItems([
      makeEntry({
        id: 'review-1',
        date: '2026-03-28',
        subject: 'Linguagens',
        topic: 'Interpretacao',
        studyType: 'revisao',
        aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
      }),
      makeEntry({
        id: 'review-2',
        date: '2026-03-29',
        subject: 'Matematica',
        topic: 'Funcoes',
        studyType: 'revisao',
        aiReason: 'Revisao automatica +48h apos a conclusao do bloco.',
      }),
    ], new Date('2026-03-27T12:00:00.000Z'));

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: 'Linguagens - Interpretacao',
      when: 'Amanha',
      tag: '24h',
      featured: true,
    });
    expect(items[1].tag).toBe('48h');
  });
});
