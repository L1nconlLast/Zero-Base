import type { LucideIcon } from 'lucide-react';
import type { ScheduleEntry, StudySession, UserData } from '../../types';

export type ProfileTrackProfile = 'enem' | 'concurso' | 'faculdade' | 'outros' | 'hibrido';
export type ProfileConcursoExperienceLevel = 'iniciante' | 'intermediario' | 'avancado';
export type ProfileEnemTriedBefore = 'sim' | 'nao';
export type ProfileCollegeFocus = 'rotina' | 'provas' | 'trabalhos';
export type ProfileOtherFocus = 'aprender' | 'praticar' | 'rotina' | 'evoluir_tema';
export type ProfileHybridPrimaryFocus = 'enem' | 'concurso' | 'equilibrado';
export type ProfileHybridAvailableStudyTime = 'baixo' | 'medio' | 'alto';

export interface ProfileHeaderMetric {
  label: string;
  value: string;
}

export interface ProfileHeaderData {
  eyebrow: string;
  title: string;
  contextLine: string;
  statusLine: string;
  avatarLabel: string;
  metrics: ProfileHeaderMetric[];
}

export interface ProfileStatCardData {
  id: string;
  eyebrow: string;
  value: string;
  detail: string;
  support: string;
  icon: LucideIcon;
}

export interface ProfileStreakDayData {
  date: string;
  label: string;
  active: boolean;
  isToday: boolean;
}

export interface ProfileStreakData {
  currentStreak: number;
  bestStreak: number;
  activeToday: boolean;
  recentActiveCount: number;
  consistencyLabel: string;
  recentDays: ProfileStreakDayData[];
}

export interface ProfileActivityItemData {
  id: string;
  type: 'study_session' | 'review';
  title: string;
  contextLabel?: string;
  metaLabel?: string;
  happenedAt: string;
  relativeLabel: string;
}

export interface ProfileActivityData {
  items: ProfileActivityItemData[];
  emptyLabel: string;
}

export type ProfileGoalStatus = 'on_track' | 'completed' | 'behind' | 'empty';

export interface ProfileGoalData {
  title: string;
  targetLabel: string;
  progressLabel: string;
  remainingLabel?: string;
  completionPercent: number;
  status: ProfileGoalStatus;
  helperLabel?: string;
}

export interface ProfileGoalsData {
  primaryGoal: ProfileGoalData;
}

export interface ProfileTrackContext {
  profile: ProfileTrackProfile;
  summaryTitle?: string | null;
  summaryDescription?: string | null;
  examGoal?: string | null;
  examDate?: string | null;
  enem?: {
    targetCollege?: string | null;
    targetCourse?: string | null;
    triedBefore?: ProfileEnemTriedBefore | null;
    profileLevel?: ProfileConcursoExperienceLevel | null;
  } | null;
  concurso?: {
    name?: string | null;
    board?: string | null;
    area?: string | null;
    examDate?: string | null;
    planningWithoutDate?: boolean | null;
    experienceLevel?: ProfileConcursoExperienceLevel | null;
  } | null;
  faculdade?: {
    institution?: string | null;
    course?: string | null;
    semester?: string | null;
    focus?: ProfileCollegeFocus | null;
  } | null;
  outros?: {
    goalTitle?: string | null;
    focus?: ProfileOtherFocus | null;
    deadline?: string | null;
  } | null;
  hibrido?: {
    primaryFocus?: ProfileHybridPrimaryFocus | null;
    availableStudyTime?: ProfileHybridAvailableStudyTime | null;
    concursoExamDate?: string | null;
  } | null;
}

export interface ProfileTrackContextData {
  profile: ProfileTrackProfile;
  trackLabel: string;
  title: string;
  description: string;
  tags: string[];
  actionLabel?: string;
}

export interface ProfilePageProps {
  darkMode?: boolean;
  displayName: string;
  email?: string;
  profileAvatar?: string;
  examGoal?: string;
  examDate?: string;
  weeklyGoalMinutes: number;
  syncStatusLabel: string;
  userData: UserData;
  sessions?: StudySession[];
  scheduleEntries?: ScheduleEntry[];
  onOpenSettings?: () => void;
  profileContext?: ProfileTrackContext | null;
  onReviewContext?: () => void;
  referenceDate?: Date;
}
