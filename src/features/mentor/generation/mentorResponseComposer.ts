import type {
  MentorActionDirective,
  MentorResponseEnvelope,
  MentorResponseTone,
  MentorResponseType,
} from '../contracts';

interface ComposeMentorResponseEnvelopeParams {
  type: MentorResponseType;
  tone: MentorResponseTone;
  title: string;
  whyNow: string;
  caution: string;
  chips?: string[];
  actions: MentorActionDirective[];
  fallbackNextStep?: string;
}

export const composeMentorResponseEnvelope = ({
  type,
  tone,
  title,
  whyNow,
  caution,
  chips = [],
  actions,
  fallbackNextStep = 'Fazer o proximo bloco viavel agora',
}: ComposeMentorResponseEnvelopeParams): MentorResponseEnvelope => ({
  type,
  tone,
  title,
  nextStep: actions[0]?.label || fallbackNextStep,
  whyNow,
  caution,
  chips,
});

export const formatMentorResponseBlocks = (response: MentorResponseEnvelope): string => [
  `Proximo passo: ${response.nextStep}.`,
  `Por que agora: ${response.whyNow}`,
  `Cuidado agora: ${response.caution}`,
].join('\n');
