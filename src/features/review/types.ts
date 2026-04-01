import type { ScheduleEntry } from '../../types';
import type { PlanoTrackContext } from '../plano/presentation/types';

export type ReviewFeedbackValue = 'facil' | 'medio' | 'dificil' | 'errei';

export interface SubmitReviewDecisionInput {
  reviewId: string;
  feedback: ReviewFeedbackValue;
  reviewedAt: string;
}

export interface SubmitReviewDecisionResult {
  reviewId: string;
  feedback: ReviewFeedbackValue;
  reviewedAt: string;
  nextReviewAt: string;
  completedForToday: boolean;
}

export interface HomeReviewQueueItem {
  id: string;
  title: string;
  when: string;
  tag: string;
  featured?: boolean;
}

export interface HomeReviewQueueState {
  status: 'pending_today' | 'completed_today' | 'upcoming' | 'empty';
  dueTodayCount: number;
  completedTodayCount: number;
  upcomingCount: number;
  totalPendingCount: number;
  items: HomeReviewQueueItem[];
  nextItem: HomeReviewQueueItem | null;
}

export type DailyReviewQueueItemStatus = 'pending' | 'active' | 'completed';

export interface DailyReviewQueueItem {
  id: string;
  title: string;
  trackLabel?: string;
  subjectLabel?: string;
  sourceLabel?: string;
  prompt: string;
  answer?: string;
  dueDate: string;
  status: DailyReviewQueueItemStatus;
  position: number;
  total: number;
}

export interface DailyReviewQueueData {
  dateLabel: string;
  totalItems: number;
  completedItems: number;
  remainingItems: number;
  currentItemId?: string;
  items: DailyReviewQueueItem[];
}

export interface ReviewHeaderData {
  eyebrow?: string;
  metricsTitle?: string;
  footerLabel?: string;
  title: string;
  contextLabel: string;
  progressLabel: string;
  queueLabel: string;
  status: 'empty' | 'active' | 'completed';
}

export type ReviewCoreStatus = 'empty' | 'active' | 'revealed' | 'answered' | 'completed';

export interface ReviewCoreData {
  itemId?: string;
  trackLabel?: string;
  eyebrowLabel?: string;
  sequenceTitle?: string;
  promptLabel?: string;
  answerVisibleLabel?: string;
  answerHiddenLabel?: string;
  title: string;
  subjectLabel?: string;
  sourceLabel?: string;
  prompt: string;
  answer?: string;
  positionLabel: string;
  sequenceLabel: string;
  nextActionLabel: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  status: ReviewCoreStatus;
}

export interface ReviewFeedbackData {
  revealed: boolean;
  selectedValue?: ReviewFeedbackValue;
  options: Array<{
    value: ReviewFeedbackValue;
    label: string;
    disabled?: boolean;
  }>;
  helperLabel?: string;
}

export interface ReviewSummaryData {
  eyebrow?: string;
  queueTitle?: string;
  completedLabel: string;
  remainingLabel: string;
  nextStepLabel: string;
}

export interface ReviewPageProps {
  darkMode?: boolean;
  scheduleEntries?: ScheduleEntry[];
  referenceDate?: Date;
  profileContext?: PlanoTrackContext | null;
  onCommitDecision?: (
    input: SubmitReviewDecisionInput,
  ) => Promise<SubmitReviewDecisionResult | null> | SubmitReviewDecisionResult | null;
}
