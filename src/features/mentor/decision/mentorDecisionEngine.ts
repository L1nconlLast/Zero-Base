import type { EngineDecision } from '../../../types/mentor';
import { composeMentorResponseEnvelope } from '../generation/mentorResponseComposer';
import type { MentorDecision, MentorDecisionInput } from '../contracts';
import { resolveMentorPlaybook } from './mentorPlaybooks';

class MentorDecisionEngine {
  decide(input: MentorDecisionInput): MentorDecision {
    const playbook = resolveMentorPlaybook(input);
    const actions = playbook.actions.slice(0, 3);
    const response = composeMentorResponseEnvelope({
      type: playbook.responseMeta.type,
      tone: playbook.responseMeta.tone,
      title: playbook.responseMeta.title,
      whyNow: playbook.responseMeta.whyNow,
      caution: playbook.responseMeta.caution,
      chips: playbook.responseMeta.chips,
      actions,
    });

    return {
      playbookId: playbook.playbookId,
      classification: playbook.classification,
      response,
      summary: response.whyNow,
      actions,
      safetyNotes: [response.caution],
    };
  }

  toLegacyEngineDecision(decision: MentorDecision): EngineDecision {
    return {
      prioridadeAtual: decision.classification.primarySubject || 'Outra',
      justificativa: decision.response.whyNow,
      acoesSemana: decision.actions.map((action) => action.label).slice(0, 3),
    };
  }
}

export const mentorDecisionEngine = new MentorDecisionEngine();
