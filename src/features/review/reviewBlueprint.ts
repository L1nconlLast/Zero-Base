import { resolveNarrativeProfileFromLegacyTrack } from '../../utils/trackNarrative';
import type {
  ReviewPresentation,
  ReviewTrackContext,
  ReviewTrackPresentationState,
} from './presentation/types';
import { buildConcursoReviewBlueprint } from './reviewBlueprints/concurso';
import { buildEnemReviewBlueprint } from './reviewBlueprints/enem';
import { buildHibridoReviewBlueprint } from './reviewBlueprints/hibrido';

export type ReviewBlueprintMode =
  | 'fixacao_base'
  | 'revisao_topico'
  | 'reforco_erro'
  | 'ritmo_prova'
  | 'fixacao_edital'
  | 'revisao_disciplina'
  | 'reforco_banca'
  | 'reta_final';

export interface ReviewBlueprint {
  mode: ReviewBlueprintMode;
  headerContextLabel?: string;
  headerFooterLabel?: string;
  coreEyebrowLabel?: string;
  corePromptLabel?: string;
  corePromptText?: string;
  coreNextActionLabel?: string;
  summaryEyebrow?: string;
  summaryQueueTitle?: string;
  summaryNextStepLabel?: string;
}

export interface ReviewBlueprintBuilderArgs {
  context: ReviewTrackContext;
  state: ReviewTrackPresentationState;
  presentation: ReviewPresentation;
}

export type ReviewBlueprintBuilder = (
  args: ReviewBlueprintBuilderArgs,
) => ReviewBlueprint | null;

const BLUEPRINT_BUILDERS: Partial<Record<ReviewTrackContext['profile'], ReviewBlueprintBuilder>> = {
  enem: buildEnemReviewBlueprint,
  concurso: buildConcursoReviewBlueprint,
  hibrido: buildHibridoReviewBlueprint,
};

export const applyReviewBlueprint = ({
  presentation,
  blueprint,
}: {
  presentation: ReviewPresentation;
  blueprint?: ReviewBlueprint | null;
}): ReviewPresentation => {
  if (!blueprint) {
    return presentation;
  }

  return {
    ...presentation,
    header: {
      ...presentation.header,
      contextLabel: blueprint.headerContextLabel || presentation.header.contextLabel,
      footerLabel: blueprint.headerFooterLabel || presentation.header.footerLabel,
    },
    core: {
      ...presentation.core,
      eyebrowLabel: blueprint.coreEyebrowLabel || presentation.core.eyebrowLabel,
      promptLabel: blueprint.corePromptLabel || presentation.core.promptLabel,
      prompt: blueprint.corePromptText || presentation.core.prompt,
      nextActionLabel: blueprint.coreNextActionLabel || presentation.core.nextActionLabel,
    },
    summary: {
      ...presentation.summary,
      eyebrow: blueprint.summaryEyebrow || presentation.summary.eyebrow,
      queueTitle: blueprint.summaryQueueTitle || presentation.summary.queueTitle,
      nextStepLabel: blueprint.summaryNextStepLabel || presentation.summary.nextStepLabel,
    },
  };
};

export const buildReviewBlueprint = ({
  context,
  state,
  presentation,
  preferredStudyTrack,
}: {
  context?: ReviewTrackContext | null;
  state: ReviewTrackPresentationState;
  presentation: ReviewPresentation;
  preferredStudyTrack: 'enem' | 'concursos' | 'hibrido';
}): ReviewBlueprint | null => {
  const resolvedContext: ReviewTrackContext = {
    profile: context?.profile || resolveNarrativeProfileFromLegacyTrack(preferredStudyTrack),
    ...context,
  };
  const builder = BLUEPRINT_BUILDERS[resolvedContext.profile];

  return builder
    ? builder({
      context: resolvedContext,
      state,
      presentation,
    })
    : null;
};

export default buildReviewBlueprint;

