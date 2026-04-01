import type { ScheduleEntry } from '../../types';
import type { ReviewFeedbackValue, SubmitReviewDecisionInput, SubmitReviewDecisionResult } from './types';

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const FEEDBACK_INTERVAL_DAYS: Record<ReviewFeedbackValue, number> = {
  facil: 4,
  medio: 2,
  dificil: 1,
  errei: 1,
};

const FEEDBACK_REASON_HOURS: Record<ReviewFeedbackValue, number> = {
  facil: 96,
  medio: 48,
  dificil: 24,
  errei: 24,
};

export const getNextReviewIntervalDays = (feedback: ReviewFeedbackValue): number =>
  FEEDBACK_INTERVAL_DAYS[feedback];

export const getNextReviewDate = (
  feedback: ReviewFeedbackValue,
  baseDate: Date,
): Date => {
  const nextDate = new Date(baseDate);
  nextDate.setHours(12, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + getNextReviewIntervalDays(feedback));
  return nextDate;
};

export const buildNextReviewReason = (feedback: ReviewFeedbackValue): string =>
  `Revisao automatica +${FEEDBACK_REASON_HOURS[feedback]}h apos feedback ${feedback}.`;

export interface SubmitReviewDecisionMutation {
  entries: ScheduleEntry[];
  updatedEntry: ScheduleEntry;
  result: SubmitReviewDecisionResult;
}

export const submitReviewDecision = (
  entries: ScheduleEntry[],
  input: SubmitReviewDecisionInput,
): SubmitReviewDecisionMutation | null => {
  const targetEntry = entries.find((entry) => entry.id === input.reviewId);
  if (!targetEntry) {
    return null;
  }

  const reviewedAtDate = new Date(input.reviewedAt);
  const safeReviewedAt = Number.isNaN(reviewedAtDate.getTime())
    ? new Date()
    : reviewedAtDate;
  const nextReviewDate = getNextReviewDate(input.feedback, safeReviewedAt);
  const nextReviewAt = toDateKey(nextReviewDate);

  const updatedEntry: ScheduleEntry = {
    ...targetEntry,
    date: nextReviewAt,
    done: false,
    status: 'pendente',
    priority: input.feedback === 'facil' || input.feedback === 'medio' ? 'normal' : 'alta',
    aiReason: buildNextReviewReason(input.feedback),
    updatedAt: input.reviewedAt,
    lastReviewedAt: input.reviewedAt,
    lastReviewFeedback: input.feedback,
    nextReviewAt,
    reviewIntervalDays: getNextReviewIntervalDays(input.feedback),
    reviewCount: (targetEntry.reviewCount || 0) + 1,
  };

  const nextEntries = entries.map((entry) =>
    entry.id === input.reviewId ? updatedEntry : entry);

  return {
    entries: nextEntries,
    updatedEntry,
    result: {
      reviewId: input.reviewId,
      feedback: input.feedback,
      reviewedAt: input.reviewedAt,
      nextReviewAt,
      completedForToday: nextReviewAt > toDateKey(safeReviewedAt),
    },
  };
};
