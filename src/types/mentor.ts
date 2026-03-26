export type MentorMode = 'default' | 'reta_final' | 'recovery';

export interface MentorOutput {
  prioridade: string;
  justificativa: string;
  acao_semana: string[];
  tom: MentorMode;
  mensagem_motivacional: string;
}

export interface EngineDecision {
  prioridadeAtual: string;
  justificativa: string;
  acoesSemana: string[];
}

export type MentorTrigger =
  | 'weekly_start'
  | 'inactivity_48h'
  | 'goal_below_70'
  | 'chat_opened'
  | 'final_30_days';

export interface MentorBriefingRequest {
  userKey: string;
  objective: 'enem' | 'concurso';
  examName: string;
  examDate?: string;
  daysToExam: number;
  level: 'iniciante' | 'intermediario' | 'avancado';
  strongPoints: string[];
  weakPoints: string[];
  recentFrequency: string;
  engineDecision: EngineDecision;
  trigger: MentorTrigger;
}

export interface MentorBriefingResult {
  output: MentorOutput;
  source: 'llm' | 'fallback';
}

export interface MentorMemory {
  version: 1;
  lastAnalysisAt: number;
  lastUpdatedAt: number;
  lastFocus: string;
  previousFocus: string | null;
  focusShiftReason: string | null;
  weakAreas: string[];
  strongArea: string;
  weeklyGoalMinutes: number;
  weeklyMinutesDone: number;
  weeklyProgressPct: number;
  totalStudyMinutes: number;
  sessionsLast7Days: number;
  sessionCount: number;
  currentStreak: number;
  completedMockExams: number;
  daysToExam: number;
  lastTrigger: MentorTrigger;
  lastRecommendations: string[];
  lastBriefing: MentorOutput | null;
  lastBriefingSource: 'llm' | 'fallback' | null;
  lastActionFollowed: string | null;
  lastActionFollowedAt: number | null;
  subjectMinutes: Record<string, number>;
}

export interface MentorMemoryRuntime {
  memory: MentorMemory;
  recommendedFocus: string;
  secondaryFocus: string;
  strongArea: string;
  focusShiftReason: string;
  weeklyPct: number;
  weeklyMinutesDone: number;
  totalStudyMinutes: number;
  sessionsLast7Days: number;
  currentStreak: number;
  completedMockExams: number;
  hasMeaningfulChange: boolean;
  shouldRefreshBriefing: boolean;
}
