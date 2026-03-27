import { LucideIcon } from 'lucide-react';

export interface User {
  nome: string;
  email: string;
  dataCadastro: string;
  foto: string;
  examGoal?: string;
  examDate?: string;
  preferredTrack?: 'enem' | 'concursos' | 'hibrido';
}

export interface UserData {
  weekProgress: WeekProgress;
  completedTopics: CompletedTopics;
  totalPoints: number;
  streak: number;
  bestStreak: number;
  achievements: string[];
  level: number;
  studyHistory: StudySession[];
  dailyGoal: number;
  sessions: StudySession[];
  currentStreak: number;
}

export interface WeekProgress {
  [key: string]: DayProgress;
}

export interface DayProgress {
  studied: boolean;
  minutes: number;
}

export interface CompletedTopics {
  [key: string]: TopicStatus;
}

export interface TopicStatus {
  completed: boolean;
  date: string | null;
}

export interface StudySession {
  date: string;
  minutes: number;
  points: number;
  subject: MateriaTipo; // Agora obrigatório e tipado
  duration: number;
  methodId?: string;
  goalMet?: boolean;
  timestamp?: string;
}

export interface MockExamHistoryEntry {
  date: string;
  mistakesByTopic: Record<string, number>;
  totalQuestions: number;
  correctCount: number;
  track: 'enem' | 'concurso' | 'ambos';
  modelId?: string;
  banca?: string;
  avgTimePerQuestionSec?: number;
}

export interface AchievementProgressSnapshot {
  current: number;
  target: number;
}

export interface AchievementContext {
  userData: UserData;
  sessions: StudySession[];
  sessionCount: number;
  totalMinutes: number;
  totalHours: number;
  currentStreak: number;
  bestStreak: number;
  longestSessionMinutes: number;
  bestSingleDayMinutes: number;
  studyDaysLast7: number;
  studyDaysLast30: number;
  nightSessionCount: number;
  goalMetDaysLast30: number;
  todayMinutes: number;
  weeklyGoalMinutes: number;
  weeklyStudiedMinutes: number;
  weeklyGoalReached: boolean;
  mockExamHistory: MockExamHistoryEntry[];
  completedMockExams: number;
  highScoreMockExams: number;
  bestMockExamAccuracy: number;
}

export type AchievementCategory =
  | 'study'
  | 'streak'
  | 'time'
  | 'social'
  | 'milestone'
  | 'exam'
  | 'goal';

export interface AchievementUnlockMetaEntry {
  unlockedAt: string;
}

export type BeginnerState =
  | 'onboarding'
  | 'ready_for_first_session'
  | 'in_session'
  | 'post_session'
  | 'day_2'
  | 'week_complete';

export type BeginnerProgressStage =
  | 'early_beginner'
  | 'engaged_beginner'
  | 'recovery_mode'
  | 'ready_for_intermediate';

export type BeginnerDropStep = 'onboarding' | 'session' | 'questions' | 'post_session';

export type BeginnerEventName =
  | 'onboarding_completed'
  | 'beginner_mission_viewed'
  | 'beginner_session_started'
  | 'beginner_session_completed'
  | 'beginner_questions_started'
  | 'beginner_questions_completed'
  | 'beginner_post_session_viewed'
  | 'beginner_next_step_clicked'
  | 'beginner_returned_next_day'
  | 'beginner_blocked_feature_clicked'
  | 'beginner_week_summary_viewed'
  | 'beginner_week_summary_completed'
  | 'beginner_dropped_at';

export type AdvancedEventName =
  | 'advanced_home_viewed'
  | 'advanced_plan_built'
  | 'advanced_plan_adjusted'
  | 'advanced_manual_schedule_used'
  | 'advanced_advanced_filters_used'
  | 'advanced_strategy_review_viewed'
  | 'advanced_strategy_review_applied'
  | 'advanced_mock_exam_started'
  | 'advanced_mock_exam_completed'
  | 'advanced_revision_block_started'
  | 'advanced_revision_block_completed'
  | 'advanced_performance_analysis_opened'
  | 'advanced_study_strategy_changed'
  | 'advanced_week_completed';

export type AdvancedRiskEventName =
  | 'advanced_overplanning_signal'
  | 'advanced_plan_abandoned'
  | 'advanced_tool_fragmentation_signal'
  | 'advanced_low_execution_after_planning';

export type AdvancedHealthState = 'healthy' | 'at_risk' | 'overplanning' | 'fragmented';

export interface AdvancedPromotionRule {
  weeklyConsistencyMin: number;
  completedDayPlansMin: number;
  recommendedToolUsageMin: number;
  nextDayReturnMin: number;
  minWeeksInIntermediate: number;
  maxToolBounceRate: number;
  maxChoiceAbandonmentRate: number;
  maxManualChoiceWithoutExecutionRate: number;
  maxOverloadSignals: number;
}

export interface AdvancedUnlocks {
  editableFullSchedule: true;
  advancedQuestionFilters: true;
  freeMethodSelection: true;
  strategicRevisionBlocks: true;
  fullMockExams: true;
  comparativePerformanceAnalysis: true;
}

export interface AdvancedSnapshot {
  phase: 'advanced';
  homeViewed: number;
  plansBuilt: number;
  plansAdjusted: number;
  manualScheduleUsed: number;
  advancedFiltersUsed: number;
  strategyReviewViewed: number;
  strategyReviewApplied: number;
  mockExamStarted: number;
  mockExamCompleted: number;
  revisionBlockStarted: number;
  revisionBlockCompleted: number;
  performanceAnalysisOpened: number;
  studyStrategyChanged: number;
  weekCompleted: number;
  overplanningSignal: number;
  planAbandoned: number;
  toolFragmentationSignal: number;
  lowExecutionAfterPlanning: number;
  manualPlanRate: number | null;
  planExecutionRate: number | null;
  advancedToolCompletionRate: number | null;
  strategicReviewApplyRate: number | null;
  mockCompletionRate: number | null;
  weeklyConsistencyRate: number | null;
  planningWithoutExecutionRate: number | null;
  toolFragmentationRate: number | null;
}

export interface AdvancedPriorityItem {
  stage: string;
  problem: string;
  diagnosis: string;
  recommendedAction: string;
  severity: 'Critica' | 'Alta' | 'Media' | 'Baixa';
  kpi: string;
  category: 'Retencao' | 'Core Loop' | 'Execucao' | 'Estrategia' | 'Experiencia Secundaria';
}

export interface AdvancedOperationSnapshot {
  weeklyDecision: {
    focus: string;
    hypothesis: string;
    action: string;
    kpi: string;
  } | null;
  quickContext: string | null;
  dontChangeNow: string[];
}

export interface AdvancedWeeklyRecord {
  weekId: string;
  focus: string;
  kpi: string;
  value: number | null;
  severity: 'Critica' | 'Alta' | 'Media' | 'Baixa';
}

export interface AdvancedWeeklyScorecard {
  previousWeek?: AdvancedWeeklyRecord | null;
  currentWeek?: AdvancedWeeklyRecord | null;
  change: 'melhorou' | 'piorou' | 'estavel' | 'mudou_o_problema';
  summary: string;
}

export type BeginnerMissionTarget = 'questoes' | 'simulado';
export type BeginnerMissionStatus = 'locked' | 'ready' | 'completed';

export interface BeginnerMissionTask {
  discipline: string;
  topic: string;
}

export interface BeginnerMission {
  id: string;
  dayNumber: number;
  dayLabel: string;
  focus: string;
  tasks: BeginnerMissionTask[];
  studyMinutes: number;
  questionCount: number;
  reviewMinutes: number;
  target: BeginnerMissionTarget;
  status: BeginnerMissionStatus;
  completedAt?: string | null;
}

export interface BeginnerPlan {
  track: 'enem' | 'concursos' | 'hibrido';
  generatedAt: string;
  focusAreas: string[];
  missions: BeginnerMission[];
}

export interface BeginnerAssessmentEntry {
  at: string;
  day: number;
  missionId: string;
  subject: string;
  correct: number;
  total: number;
  accuracy: number;
  xpGained: number;
}

export interface BeginnerStats {
  startedAt: string;
  onboardingCompletedAt: string | null;
  focus: BeginnerPlan['track'] | null;
  timeAvailable: 30 | 60 | 120 | null;
  lastActiveAt: string | null;
  lastReturnTrackedDate: string | null;
  sessionsStarted: number;
  sessionsCompleted: number;
  activeDates: string[];
  streak: number;
  returnedNextDayCount: number;
  totalQuestions: number;
  totalCorrect: number;
  accuracyAvg: number;
  assessments: BeginnerAssessmentEntry[];
  lastDropPoint: BeginnerDropStep | null;
  progressStage: BeginnerProgressStage;
  promotedAt: string | null;
  weekSummarySeenAt: string | null;
}

export interface BeginnerWeekSummary {
  totalTimeMinutes: number;
  totalQuestions: number;
  accuracy: number;
  strongest: string | null;
  weakest: string | null;
  consistencyLabel: string;
  readyForIntermediate: boolean;
}

export interface StudyMethod {
  id: string;
  name: string;
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  description: string;
  isPremium: boolean;
}

export interface StudyExecutionState {
  currentBlock: {
    subject: string;
    topicName?: string;
    objective: string;
    type: 'focus' | 'questions' | 'review';
    duration?: number;
    targetQuestions?: number;
  };
  recommendedMethodId: string;
  source: 'plan' | 'manual' | 'ai';
  updatedAt: string;
}

export type StudySessionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'cancelled';

export type StudySessionPhase = 'focus' | 'shortBreak' | 'longBreak';

export type StudySessionTimerKind = 'countup' | 'countdown';

export type StudySessionSource = 'study_timer' | 'pomodoro';

export interface PersistedStudySession {
  sessionId: string;
  source: StudySessionSource;
  kind: StudySessionTimerKind;
  status: Exclude<StudySessionStatus, 'idle'>;
  phase: StudySessionPhase;
  startedAt: string;
  phaseStartedAt: string;
  lastResumedAt: string | null;
  lastPausedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  lastRestoredAt: string | null;
  accumulatedFocusMs: number;
  accumulatedPhaseMs: number;
  plannedDurationMs: number;
  completedFocusCycles: number;
  subject: MateriaTipo;
  methodId?: string;
  updatedAt: string;
}

export interface MethodRecommendationInput {
  dailyAverageMinutes: number;
  streak: number;
  daysToExam?: number;
  interruptedBreaks?: number;
}

export interface AcademyContentModule {
  id: string;
  moduleName: string;
  orderIndex: number;
  moduleText: string;
  studyMaterial?: Array<{
    title: string;
    content: string;
    resourceType?: 'video' | 'pdf' | 'questoes' | 'artigo';
    linkLabel?: string;
    linkUrl?: string;
  }>;
  checklist: string[];
}

export type AcademyDepartment = 'ENEM' | 'Concursos';

export type AcademySubDepartment =
  | 'Natureza'
  | 'Humanas'
  | 'Linguagens'
  | 'Matemática'
  | 'Redação'
  | 'Bancas'
  | 'Carreiras'
  | 'Disciplinas Base'
  | 'Legislação';

export interface AcademyContent {
  id: string;
  title: string;
  department: AcademyDepartment;
  subDepartment: AcademySubDepartment;
  category: string;
  difficultyLevel: 'iniciante' | 'intermediario' | 'avancado';
  estimatedMinutes: number;
  xpReward: number;
  isPremium: boolean;
  preview: string;
  applyMethodId?: string;
  modules: AcademyContentModule[];
}

export interface SessaoEstudo {
  id: string;
  duracaoMinutos: number;
  materia: MateriaTipo;
  data: Date | string;
  pontos: number;
}

export interface StudyResource {
  materia: string;
  topico: string;
  canal: string;
  link: string;
  nivel: string;
  duracao: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: AchievementCategory;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  condition: (context: AchievementContext) => boolean;
  progress?: (context: AchievementContext) => AchievementProgressSnapshot;
  reward?: {
    type: 'theme' | 'title' | 'badge';
    value: string;
  };
}

export interface Level {
  level: number;
  title: string;
  minPoints: number;
  maxPoints: number;
  perks: string[];
  icon: string;
  color: string;
}

export interface WeeklyStats {
  weekStart: Date;
  weekEnd: Date;
  totalMinutes: number;
  avgPerDay: number;
  longestSession: number;
  studyDays: number;
  goalAchievementRate: number;
  subjectDistribution: { subject: string; minutes: number; percentage: number }[];
  dailyBreakdown: { date: Date; minutes: number }[];
  comparison: {
    lastWeekMinutes: number;
    trend: 'up' | 'down' | 'stable';
    percentageChange: number;
  };
  insights: string[];
}

export interface HeatmapCellData {
  date: Date;
  studyMinutes: number;
  level: 0 | 1 | 2 | 3 | 4;
}

// ── Cronograma de Estudos ────────────────────────────────────
export interface ScheduleEntry {
  id: string;
  date: string;          // YYYY-MM-DD
  subject: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  orderIndex?: number;
  note?: string;
  done: boolean;
  status?: 'pendente' | 'concluido' | 'adiado';
  topic?: string;
  studyType?: 'teoria_questoes' | 'questoes' | 'revisao' | 'simulado';
  priority?: 'normal' | 'alta';
  manualPriority?: boolean;
  aiReason?: string;
  source?: 'manual' | 'motor' | 'ia';
  createdAt?: string;
  updatedAt?: string;
  lastManualEditAt?: string;
  lastManualTargetDate?: string;
}

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface WeeklyDayPlan {
  subjectLabels: string[];
}

export type WeeklyPlan = Record<Weekday, WeeklyDayPlan>;

export type WeeklyAvailabilityMap = Record<Weekday, boolean>;

export interface WeeklyStudyPreferences {
  defaultSessionDurationMinutes: number;
  sessionsPerDay: number;
  weeklyGoalSessions?: number;
}

export interface WeeklyStudySchedule {
  weekPlan: WeeklyPlan;
  availability: WeeklyAvailabilityMap;
  preferences: WeeklyStudyPreferences;
  updatedAt: string;
}

export type TodayStudyState =
  | {
      type: 'planned';
      day: Weekday;
      subjectLabels: string[];
    }
  | {
      type: 'inactive';
      day: Weekday;
    }
  | {
      type: 'empty';
      day: Weekday;
    };

export interface StudyContextForToday {
  state: TodayStudyState;
  eligibleSubjects: string[];
  defaultSessionDurationMinutes: number;
}

export type Theme = 'light' | 'dark' | 'auto';
export type DarkTheme = 'default' | 'oled' | 'sepia';

export interface ThemeSettings {
  theme: Theme;
  darkTheme: DarkTheme;
  autoSchedule: boolean;
  scheduleStart: string;
  scheduleEnd: string;
}

// Sistema de Matérias
export type MateriaTipo = 'Anatomia' | 'Fisiologia' | 'Farmacologia' | 'Patologia' | 'Bioquímica' | 'Histologia' | 'Outra';

export const MATERIAS_CONFIG: Record<MateriaTipo, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  Anatomia: { 
    icon: '🦴', 
    color: 'text-red-700', 
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  Fisiologia: { 
    icon: '💓', 
    color: 'text-pink-700', 
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200'
  },
  Farmacologia: { 
    icon: '💊', 
    color: 'text-green-700', 
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  Patologia: { 
    icon: '🧫', 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  Bioquímica: { 
    icon: '🧪', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  Histologia: { 
    icon: '🔬', 
    color: 'text-indigo-700', 
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  Outra: { 
    icon: '📚', 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
};
