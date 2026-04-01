import { describe, expect, it } from 'vitest';
import { buildHomeReviewQueueState } from '../features/review';
import type { ScheduleEntry } from '../types';

const makeReviewEntry = (overrides: Partial<ScheduleEntry>): ScheduleEntry => ({
  id: overrides.id || 'review-1',
  date: overrides.date || '2026-03-30',
  subject: overrides.subject || 'Matematica',
  topic: overrides.topic || 'Funcoes',
  done: overrides.done ?? false,
  status: overrides.status || 'pendente',
  studyType: overrides.studyType || 'revisao',
  priority: overrides.priority,
  source: overrides.source || 'ia',
  aiReason: overrides.aiReason || 'Revisao automatica +24h apos a conclusao do bloco.',
  lastReviewedAt: overrides.lastReviewedAt,
  lastReviewFeedback: overrides.lastReviewFeedback,
  nextReviewAt: overrides.nextReviewAt,
  reviewIntervalDays: overrides.reviewIntervalDays,
  reviewCount: overrides.reviewCount,
});

describe('reviewQueue', () => {
  it('prioriza itens vencidos hoje na fila da home', () => {
    const state = buildHomeReviewQueueState([
      makeReviewEntry({
        id: 'review-due',
        date: '2026-03-30',
        subject: 'Biologia',
        topic: 'Citologia',
      }),
      makeReviewEntry({
        id: 'review-upcoming',
        date: '2026-04-01',
        subject: 'Historia',
        topic: 'Imperio',
        aiReason: 'Revisao automatica +48h apos a conclusao do bloco.',
      }),
    ], new Date('2026-03-30T12:00:00.000Z'));

    expect(state.status).toBe('pending_today');
    expect(state.dueTodayCount).toBe(1);
    expect(state.items[0]).toMatchObject({
      id: 'review-due',
      title: 'Biologia - Citologia',
      when: 'Hoje',
      tag: '24h',
    });
  });

  it('distingue revisoes concluidas hoje de um dia realmente vazio', () => {
    const state = buildHomeReviewQueueState([
      makeReviewEntry({
        id: 'review-next',
        date: '2026-04-01',
        subject: 'Linguagens',
        topic: 'Interpretacao',
        aiReason: 'Revisao automatica +48h apos a conclusao do bloco.',
        lastReviewedAt: '2026-03-30T14:30:00.000Z',
        lastReviewFeedback: 'medio',
        nextReviewAt: '2026-04-01',
        reviewIntervalDays: 2,
        reviewCount: 1,
      }),
    ], new Date('2026-03-30T12:00:00.000Z'));

    expect(state.status).toBe('completed_today');
    expect(state.completedTodayCount).toBe(1);
    expect(state.nextItem?.id).toBe('review-next');
    expect(state.nextItem?.tag).toBe('48h');
    expect(state.nextItem?.when).not.toBe('Hoje');
  });
});
