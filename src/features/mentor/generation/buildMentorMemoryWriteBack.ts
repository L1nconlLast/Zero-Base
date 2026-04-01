import type { MentorDecision, MentorDecisionInput, MentorMemoryWriteBack } from '../contracts';

export const buildMentorMemoryWriteBack = (
  input: MentorDecisionInput,
  decision: MentorDecision,
): MentorMemoryWriteBack => ({
  focusOfWeek: decision.classification.primarySubject || input.studyState.currentWeeklyFocus,
  lastRecommendation: decision.response.nextStep,
  lastStudiedSubject: input.execution.lastSessionSubject,
  lastDifficultyReport: decision.response.whyNow,
  currentRisk: decision.classification.risk,
  factsToUpsert: [
    {
      key: 'focus_of_week',
      value: decision.classification.primarySubject || input.studyState.currentWeeklyFocus || 'Outra',
      source: 'system',
      recordedAt: new Date().toISOString(),
    },
    {
      key: 'last_recommendation',
      value: decision.response.nextStep || decision.response.whyNow,
      source: 'mentor',
      recordedAt: new Date().toISOString(),
    },
    {
      key: 'current_risk',
      value: `${decision.classification.risk.label}: ${decision.classification.risk.summary}`,
      source: 'system',
      recordedAt: new Date().toISOString(),
    },
  ],
});
