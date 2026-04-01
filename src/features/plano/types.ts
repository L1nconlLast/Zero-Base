import type { Weekday } from '../../types';

export type StudyBlockPriority = 'low' | 'medium' | 'high';
export type StudyBlockStatus = 'pending' | 'done';

export interface StudyBlock {
  id: string;
  subject: string;
  topic: string;
  duration: number;
  priority: StudyBlockPriority;
  status: StudyBlockStatus;
  kind?: 'study' | 'review';
}

export interface DayPlan {
  id: Weekday;
  date: string;
  fullLabel: string;
  isToday: boolean;
  isActive: boolean;
  blocks: StudyBlock[];
  totalMinutes: number;
}

export type WeekPlan = DayPlan[];

export interface PlanoMetric {
  label: string;
  value: string;
}

export interface PlanoDistributionItem {
  id: string;
  subject: string;
  minutes: number;
  sessions: number;
  shareOfCycle: number;
  relativeWeight: number;
  statusTone: 'primary' | 'active' | 'review' | 'default';
  statusLabel: string;
  detailLabel: string;
}

export interface PlanoNextStepItem {
  id: string;
  label: string;
  title: string;
  detail: string;
  tone: 'focus' | 'review' | 'continuity';
}

export interface PlanoHeaderData {
  eyebrow: string;
  title: string;
  contextLine: string;
  statusLine: string;
  metrics: PlanoMetric[];
}

export interface PlanoLoadSnapshot {
  label: string;
  minutes: number;
  subjects: number;
}

export interface PlanoTodayStatus {
  label: string;
  detail: string;
  tone: 'success' | 'warning' | 'neutral';
}

export interface PlanoReviewState {
  status: 'pending_today' | 'completed_today' | 'upcoming' | 'empty';
  label: string;
  detail: string;
}
