import type { MentorTrigger } from '../../types/mentor';

export const MENTOR_RESPONSE_KINDS = [
  'alert',
  'weekly_analysis',
  'next_step',
  'plan_adjustment',
  'session_recommendation',
  'review_intervention',
  'risk_warning',
] as const;

export const MENTOR_RESPONSE_TYPES = [
  'next_step',
  'review_alert',
  'recovery',
  'focus_shift',
  'steady_push',
  'direction_reset',
] as const;

export const MENTOR_RESPONSE_TONES = ['direct', 'supportive'] as const;

export const MENTOR_MOMENT_TYPES = [
  'steady_progress',
  'behind_week',
  'restart_needed',
  'review_pressure',
  'weak_subject_pressure',
  'post_mock_recovery',
  'final_sprint',
  'focus_shift',
] as const;

export const MENTOR_ACTION_TYPES = [
  'focus_session',
  'review_block',
  'question_set',
  'plan_adjustment',
  'diagnostic',
  'recovery_session',
  'rest',
] as const;

export const MENTOR_RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

export const MENTOR_MEMORY_FACT_KEYS = [
  'focus_of_week',
  'last_recommendation',
  'last_difficulty_report',
  'last_studied_subject',
  'last_plan_change',
  'current_risk',
] as const;

export type MentorObjective = 'enem' | 'concurso' | 'hibrido';
export type MentorStudyLevel = 'iniciante' | 'intermediario' | 'avancado';
export type MentorResponseKind = (typeof MENTOR_RESPONSE_KINDS)[number];
export type MentorResponseType = (typeof MENTOR_RESPONSE_TYPES)[number];
export type MentorResponseTone = (typeof MENTOR_RESPONSE_TONES)[number];
export type MentorMomentType = (typeof MENTOR_MOMENT_TYPES)[number];
export type MentorActionType = (typeof MENTOR_ACTION_TYPES)[number];
export type MentorRiskLevel = (typeof MENTOR_RISK_LEVELS)[number];
export type MentorMemoryFactKey = (typeof MENTOR_MEMORY_FACT_KEYS)[number];
export type MentorActionUrgency = 'now' | 'today' | 'this_week';
export type MentorKnowledgeRuleType = 'product' | 'study' | 'goal' | 'playbook' | 'guardrail';
export type MentorMemorySource = 'system' | 'user' | 'mentor';

export interface MentorStudentProfileContext {
  objective: MentorObjective;
  examName: string;
  examDate?: string;
  daysToExam: number;
  preferredTrack?: 'enem' | 'concurso' | 'hibrido';
  level: MentorStudyLevel;
}

export interface MentorSessionRecommendation {
  subject: string;
  durationMin: number;
  format: 'focus' | 'review' | 'questions' | 'mixed';
  reason: string;
}

export interface MentorExecutionContext {
  todayMinutes: number;
  todaySessions: number;
  weeklyGoalMinutes: number;
  weeklyMinutesDone: number;
  weeklyProgressPct: number;
  sessionsLast7Days: number;
  currentStreak: number;
  completedMockExams: number;
  lastSessionAt?: string;
  lastSessionSubject?: string;
  nextRecommendedSession?: MentorSessionRecommendation;
}

export interface MentorStudyStateContext {
  activeSubjects: string[];
  weakSubjects: string[];
  strongSubjects: string[];
  subjectDistribution: MentorSubjectDistributionEntry[];
  dominantSubject?: string;
  dominantSubjectSharePct: number;
  currentWeeklyFocus?: string;
  pendingReviews: number;
  overdueReviews: number;
  overduePlanItems: number;
  recentMistakeSubjects: string[];
}

export interface MentorSubjectDistributionEntry {
  subject: string;
  minutes: number;
  sharePct: number;
}

export interface MentorMemoryFact {
  key: MentorMemoryFactKey;
  value: string;
  source: MentorMemorySource;
  recordedAt: string;
  expiresAt?: string;
}

export interface MentorRiskSnapshot {
  level: MentorRiskLevel;
  label: string;
  summary: string;
}

export interface MentorShortMemory {
  version: 1;
  focusOfWeek?: string;
  lastRecommendation?: string;
  lastActionFollowed?: string;
  lastDifficultyReport?: string;
  lastStudiedSubject?: string;
  lastPlanChange?: string;
  currentRisk?: MentorRiskSnapshot;
  facts: MentorMemoryFact[];
}

export interface MentorKnowledgeRule {
  id: string;
  type: MentorKnowledgeRuleType;
  title: string;
  condition?: string;
  guidance: string;
}

export interface MentorKnowledgeContext {
  rules: MentorKnowledgeRule[];
}

export interface MentorDecisionInput {
  trigger: MentorTrigger;
  profile: MentorStudentProfileContext;
  execution: MentorExecutionContext;
  studyState: MentorStudyStateContext;
  memory: MentorShortMemory;
  knowledge: MentorKnowledgeContext;
}

export interface MentorMomentClassification {
  moment: MentorMomentType;
  responseKind: MentorResponseKind;
  primarySubject?: string;
  risk: MentorRiskSnapshot;
  reasons: string[];
}

export interface MentorActionDirective {
  id: string;
  type: MentorActionType;
  label: string;
  description: string;
  subject?: string;
  durationMin?: number;
  urgency: MentorActionUrgency;
  expectedOutcome: string;
}

export interface MentorDecision {
  playbookId: string;
  classification: MentorMomentClassification;
  response: MentorResponseEnvelope;
  summary: string;
  actions: MentorActionDirective[];
  safetyNotes: string[];
}

export interface MentorMemoryWriteBack {
  focusOfWeek?: string;
  lastRecommendation?: string;
  lastStudiedSubject?: string;
  lastDifficultyReport?: string;
  currentRisk?: MentorRiskSnapshot;
  factsToUpsert: MentorMemoryFact[];
}

export interface MentorResponseEnvelope {
  type: MentorResponseType;
  tone: MentorResponseTone;
  title: string;
  nextStep: string;
  whyNow: string;
  caution: string;
  chips: string[];
}

export const createEmptyMentorShortMemory = (): MentorShortMemory => ({
  version: 1,
  facts: [],
});
