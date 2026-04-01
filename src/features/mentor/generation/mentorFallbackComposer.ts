import type { MentorOutput } from '../../../types/mentor';
import type { MentorDecision, MentorDecisionInput } from '../contracts';
import { formatMentorResponseBlocks } from './mentorResponseComposer';

interface ComposeMentorFallbackReplyParams {
  text: string;
  input: MentorDecisionInput;
  decision: MentorDecision;
  safeBriefing?: MentorOutput | null;
  strategyReply?: string | null;
  lastRecommendation?: string | null;
  previousFocus?: string | null;
}

const containsBlockedIntent = (text: string): boolean =>
  /(qual assunto vai cair|atalho|chute|gabarito|milagre)/i.test(text);

const formatActionLabels = (decision: MentorDecision): string =>
  decision.actions.map((action) => action.label).join(' | ');

export const composeMentorFallbackReply = ({
  text,
  input,
  decision,
  safeBriefing,
  strategyReply,
  lastRecommendation,
  previousFocus,
}: ComposeMentorFallbackReplyParams): string => {
  const lower = text.toLowerCase();
  const primarySubject = decision.classification.primarySubject || input.studyState.currentWeeklyFocus || 'Outra';
  const secondarySubject = input.studyState.weakSubjects[1] || input.studyState.recentMistakeSubjects[0] || primarySubject;
  const actionsLabel = formatActionLabels(decision);

  if (containsBlockedIntent(text)) {
    return 'Nao posso orientar atalhos ou previsoes de prova. Posso te orientar em estrategia real com base no seu momento atual.';
  }

  if (strategyReply) {
    return strategyReply;
  }

  if (safeBriefing) {
    if (lower.includes('hoje')) {
      return formatMentorResponseBlocks(decision.response);
    }

    if (lower.includes('focar') || lower.includes('fraco')) {
      return `${formatMentorResponseBlocks(decision.response)}\nAcao pratica: ${actionsLabel}`;
    }
  }

  if (lower.includes('fraca') || lower.includes('dificuldade')) {
    return `${formatMentorResponseBlocks(decision.response)}\nHoje as materias mais sensiveis sao ${primarySubject} e ${secondarySubject}.`;
  }

  if (lower.includes('plano') || lower.includes('semana')) {
    return `${formatMentorResponseBlocks(decision.response)}\nPlano da semana: ${actionsLabel}`;
  }

  if (lower.includes('revisar') || lower.includes('hoje')) {
    return `${formatMentorResponseBlocks(decision.response)}\nAcoes: ${actionsLabel}`;
  }

  if (lower.includes('consist') || lower.includes('streak')) {
    return `${formatMentorResponseBlocks(decision.response)}\nSeu streak atual esta em ${input.execution.currentStreak} dias.`;
  }

  if (lower.includes('mudou') || lower.includes('foco')) {
    return previousFocus && previousFocus !== primarySubject
      ? `Seu foco mudou de ${previousFocus} para ${primarySubject}.\n${formatMentorResponseBlocks(decision.response)}`
      : formatMentorResponseBlocks(decision.response);
  }

  return lastRecommendation
    ? `Entendi. Sua ultima recomendacao foi "${lastRecommendation}".\n${formatMentorResponseBlocks(decision.response)}`
    : `Entendi.\n${formatMentorResponseBlocks(decision.response)}`;
};
