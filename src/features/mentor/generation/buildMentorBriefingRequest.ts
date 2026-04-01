import type { MentorBriefingRequest } from '../../../types/mentor';
import type { MentorDecision, MentorDecisionInput } from '../contracts';

export interface BuildMentorBriefingRequestParams {
  userKey: string;
  input: MentorDecisionInput;
  decision: MentorDecision;
}

export const buildMentorBriefingRequest = ({
  userKey,
  input,
  decision,
}: BuildMentorBriefingRequestParams): MentorBriefingRequest => ({
  userKey,
  objective: input.profile.objective === 'concurso' ? 'concurso' : 'enem',
  examName: input.profile.examName,
  examDate: input.profile.examDate,
  daysToExam: input.profile.daysToExam,
  level: input.profile.level,
  strongPoints: input.studyState.strongSubjects.slice(0, 3),
  weakPoints: input.studyState.weakSubjects.slice(0, 4),
  recentFrequency: `${input.execution.weeklyProgressPct}% da meta semanal`,
  engineDecision: {
    prioridadeAtual: decision.classification.primarySubject || input.studyState.currentWeeklyFocus || 'Outra',
    justificativa: decision.response.whyNow,
    acoesSemana: decision.actions.map((action) => action.label).slice(0, 3),
  },
  trigger: input.trigger,
});
