import type { MentorTrigger } from '../../../types/mentor';
import type { MentorChatPayload } from '../../../services/mentorChatApi.service';
import type { MentorDecision, MentorDecisionInput } from '../contracts';

export interface BuildMentorChatPayloadParams {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userName: string;
  input: MentorDecisionInput;
  decision: MentorDecision;
  lastRecommendation?: string;
  previousFocus?: string | null;
}

export const buildMentorChatPayload = ({
  message,
  history,
  userName,
  input,
  decision,
  lastRecommendation,
  previousFocus,
}: BuildMentorChatPayloadParams): MentorChatPayload => ({
  message,
  history,
  studentContext: {
    userName,
    objective: input.profile.objective,
    examName: input.profile.examName,
    examDate: input.profile.examDate,
    daysToExam: input.profile.daysToExam,
    strongArea: input.studyState.strongSubjects[0] || input.studyState.activeSubjects[0] || 'Outra',
    weakArea: input.studyState.weakSubjects[0] || input.studyState.currentWeeklyFocus || 'Outra',
    currentWeeklyFocus: input.studyState.currentWeeklyFocus,
    weeklyPct: input.execution.weeklyProgressPct,
    todayMinutes: input.execution.todayMinutes,
    pendingReviews: input.studyState.pendingReviews,
    overdueReviews: input.studyState.overdueReviews,
    streak: input.execution.currentStreak,
    previousFocus: previousFocus || undefined,
    lastRecommendation,
    sessionsLast7Days: input.execution.sessionsLast7Days,
    completedMockExams: input.execution.completedMockExams,
    nextRecommendedSession: input.execution.nextRecommendedSession,
    trigger: input.trigger as MentorTrigger,
  },
  decisionContext: {
    moment: decision.classification.moment,
    responseKind: decision.classification.responseKind,
    primarySubject: decision.classification.primarySubject,
    summary: decision.summary,
    response: {
      type: decision.response.type,
      nextStep: decision.response.nextStep,
      whyNow: decision.response.whyNow,
      caution: decision.response.caution,
      tone: decision.response.tone,
      title: decision.response.title,
      chips: decision.response.chips,
    },
    risk: decision.classification.risk,
    actions: decision.actions.map((action) => ({
      label: action.label,
      description: action.description,
      subject: action.subject,
      durationMin: action.durationMin,
      urgency: action.urgency,
    })),
    safetyNotes: decision.safetyNotes,
  },
});
