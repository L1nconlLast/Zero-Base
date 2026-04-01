import { describe, expect, it } from 'vitest';
import { getNextReviewDate, submitReviewDecision } from '../features/review';
import type { ScheduleEntry } from '../types';

describe('reviewDecisions', () => {
  it('aplica os intervalos do MVP para cada feedback', () => {
    const baseDate = new Date('2026-03-30T12:00:00.000Z');

    expect(getNextReviewDate('facil', baseDate).toISOString().slice(0, 10)).toBe('2026-04-03');
    expect(getNextReviewDate('medio', baseDate).toISOString().slice(0, 10)).toBe('2026-04-01');
    expect(getNextReviewDate('dificil', baseDate).toISOString().slice(0, 10)).toBe('2026-03-31');
    expect(getNextReviewDate('errei', baseDate).toISOString().slice(0, 10)).toBe('2026-03-31');
  });

  it('atualiza o item revisado com nova data e metadata minima do sistema', () => {
    const entries: ScheduleEntry[] = [
      {
        id: 'review-1',
        date: '2026-03-30',
        subject: 'Matematica',
        topic: 'Funcoes',
        done: false,
        status: 'pendente',
        studyType: 'revisao',
        source: 'ia',
        aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
      },
    ];

    const mutation = submitReviewDecision(entries, {
      reviewId: 'review-1',
      feedback: 'medio',
      reviewedAt: '2026-03-30T14:30:00.000Z',
    });

    expect(mutation).not.toBeNull();
    expect(mutation?.result.nextReviewAt).toBe('2026-04-01');
    expect(mutation?.result.completedForToday).toBe(true);
    expect(mutation?.updatedEntry.date).toBe('2026-04-01');
    expect(mutation?.updatedEntry.lastReviewFeedback).toBe('medio');
    expect(mutation?.updatedEntry.lastReviewedAt).toBe('2026-03-30T14:30:00.000Z');
    expect(mutation?.updatedEntry.reviewIntervalDays).toBe(2);
    expect(mutation?.updatedEntry.aiReason).toContain('+48h');
  });
});
