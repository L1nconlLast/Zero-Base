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
