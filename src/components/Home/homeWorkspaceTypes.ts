import type { StudySession } from '../../types';
import type { HomeReviewQueueItem, HomeReviewQueueState } from '../../features/review';
import type { StudyTrackLabel } from '../../utils/disciplineLabels';
import type { HomeCompletionSignal } from './homeTodayCompletionSignal';
import type { HomeTrackContext } from './homeTodayPresentation';

export type HomeStudyNowCard = {
  status: 'loading' | 'error' | 'empty' | 'ready';
  title?: string;
  description?: string;
  discipline?: string;
  topic?: string;
  reason?: string;
  supportingText?: string;
  estimatedDurationMinutes?: number;
  sessionTypeLabel?: string;
  progressLabel?: string;
  ctaLabel?: string;
  weeklyProgress?: {
    label: string;
    ratio: number;
  } | null;
};

export type HomeNextSessionCommit = {
  title: string;
  detail: string;
};

export type HomeContinuationMission = {
  subject: string;
  topic: string;
  questionsDone: number;
  totalQuestions: number;
  estimatedMinutesRemaining: number;
};

export interface HomeWorkspacePageProps {
  darkMode?: boolean;
  preferredTrack?: StudyTrackLabel;
  hybridEnemWeight?: number;
  profileContext?: HomeTrackContext | null;
  userName: string;
  todayMinutes: number;
  dailyGoalMinutes: number;
  currentStreak: number;
  weeklyCompletedSessions: number;
  weeklyPlannedSessions: number;
  totalPoints: number;
  completedContentCount: number;
  syncStatusLabel: string;
  syncStatusTone?: 'success' | 'warning' | 'danger' | 'neutral';
  sessions: StudySession[];
  officialStudyCard?: HomeStudyNowCard;
  reviewQueueItems?: HomeReviewQueueItem[];
  reviewQueueState?: HomeReviewQueueState;
  nextSessionCommit?: HomeNextSessionCommit | null;
  continuationMission?: HomeContinuationMission | null;
  completionSignal?: HomeCompletionSignal | null;
  onStartStudy: () => void;
  onOpenPlanning: () => void;
  onOpenReviews: () => void;
  onOpenStatistics: () => void;
  onOpenSimulados: () => void;
  onOpenTrail: () => void;
  onOpenMentor: () => void;
  onConsumeCompletionSignal?: () => void;
}
