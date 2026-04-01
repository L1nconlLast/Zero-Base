import type React from 'react';
import type { StudyTrackLabel } from '../../utils/disciplineLabels';
import type { PlanoTrackContext } from '../plano/presentation/types';

export type StudyMode = 'pomodoro' | 'livre' | 'stopwatch';
export type RuntimeStudyMode = Extract<StudyMode, 'pomodoro' | 'livre'>;
export type PreferencesSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

export type StudySession = {
  subject: string;
  topic: string;
  remainingSeconds: number;
  initialSeconds: number;
  mode: StudyMode;
  progress: number;
};

export type FinishPayload = {
  pages?: number;
  lessons?: number;
  notes?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  actualDurationSeconds?: number;
};

export type FinishInputs = {
  pages: number;
  lessons: number;
  notes: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
};

export interface FinalizeStudySessionAdapterResult {
  reviewSuggestion: {
    hours: number;
    label: string;
  };
  deltas: {
    home: 'pending';
    plan: 'pending';
    revisions: 'queued';
  };
  session: {
    subject: string;
    topic: string;
    actualDurationSeconds: number;
    difficulty: 1 | 2 | 3 | 4 | 5;
  };
}

export interface EstudosBannerMeta {
  label: string;
  value: string;
}

export interface EstudosBannerConfig {
  eyebrow: string;
  title: string;
  description: string;
  supportingText?: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryActionDisabled?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  meta: EstudosBannerMeta[];
  className?: string;
}

export type SessionHeaderStatus = 'idle' | 'running' | 'paused' | 'ready_to_finish';
export type ExecutionCoreEmphasis = 'default' | 'urgent' | 'calm';

export interface SessionHeaderData {
  contextLabel: string;
  sessionTypeLabel: string;
  title: string;
  status: SessionHeaderStatus;
  statusLabel?: string;
  plannedMinutes?: number;
  currentStepLabel?: string;
  progressLabel?: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryActionDisabled?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export interface ExecutionCoreData {
  eyebrowLabel?: string;
  progressTitle?: string;
  controlsLabel?: string;
  controlsDescription?: string;
  status: SessionHeaderStatus;
  timerLabel: string;
  timerStateLabel: string;
  primaryGoal: string;
  progressLabel?: string;
  secondaryProgressLabel?: string;
  currentStepLabel?: string;
  progressPercent?: number;
  emphasisLevel?: ExecutionCoreEmphasis;
}

export type SupportChecklistItemStatus = 'pending' | 'active' | 'completed';
export type SupportClosureEmphasis = 'subtle' | 'calm';

export interface SupportChecklistItem {
  id: string;
  label: string;
  status: SupportChecklistItemStatus;
  detail?: string;
}

export interface SupportChecklistData {
  title?: string;
  items: SupportChecklistItem[];
  progressLabel?: string;
}

export interface SupportClosureData {
  title?: string;
  message: string;
  actionLabel?: string;
  emphasis: SupportClosureEmphasis;
}

export interface SupportRailData {
  eyebrow?: string;
  intro?: string;
  checklist: SupportChecklistData;
  closure?: SupportClosureData;
}

export interface PostExecutionContextData {
  contextLabel: string;
  parentLabel?: string;
  sequenceLabel?: string;
}

export interface PostExecutionContinuityData {
  nextStepLabel: string;
  followUpLabel?: string;
  progressHintLabel?: string;
  actionLabel?: string;
}

export interface PostExecutionBandData {
  contextTitle?: string;
  continuityTitle?: string;
  context: PostExecutionContextData;
  continuity: PostExecutionContinuityData;
}

export interface StudyExecutionRailData {
  eyebrow: string;
  title: string;
  description: string;
  blockChipLabel: string;
  durationChipLabel: string;
  modeChipLabel: string;
}

export interface EstudosPostSessionState {
  blockLabel: string;
  progressCopy: string;
  weeklyProgressCopy: string;
  planConfidenceCopy: string;
  secondaryCopy: string;
  nextSuggestionCopy?: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}

export interface EstudosPageProps {
  darkMode?: boolean;
  banner: EstudosBannerConfig;
  isBlocked: boolean;
  blockedTitle: string;
  blockedDescription: string;
  showQuestionTransitionState: boolean;
  questionTransitionTitle: string;
  questionTransitionDescription: string;
  showPostFocusState: boolean;
  postSessionState?: EstudosPostSessionState | null;
  preferredStudyTrack: StudyTrackLabel;
  onTrackChange: (track: StudyTrackLabel) => void;
  hybridEnemWeight: number;
  hybridConcursoWeight: number;
  onHybridEnemWeightChange: (weight: number) => void;
  weeklyGoalMinutes: number;
  onWeeklyGoalMinutesChange: (minutes: number) => void;
  activeStudyMethodName: string;
  preferencesSyncStatus: PreferencesSyncStatus;
  lastPreferencesSyncAt: string | null;
  currentMode: RuntimeStudyMode;
  onModeChange: (mode: RuntimeStudyMode) => void;
  timerSectionRef?: React.Ref<HTMLDivElement>;
  pomodoroContent: React.ReactNode;
  freeTimerContent: React.ReactNode;
  currentBlockLabel: string;
  currentBlockDurationMinutes: number;
  currentBlockObjective: string;
  currentTargetQuestions: number;
  currentBlockSuggestedTopicCopy?: string;
  profileContext?: PlanoTrackContext | null;
  onFinishResult?: (result: FinalizeStudySessionAdapterResult, payload: FinishPayload) => Promise<void> | void;
}
