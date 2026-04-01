import { resolveNarrativeProfileFromLegacyTrack } from '../../utils/trackNarrative';
import { buildConcursoReviewPresentation } from './presentation/concurso';
import { buildEnemReviewPresentation } from './presentation/enem';
import { buildFaculdadeReviewPresentation } from './presentation/faculdade';
import { buildHibridoReviewPresentation } from './presentation/hibrido';
import { buildOutrosReviewPresentation } from './presentation/outros';
import { applyReviewBlueprint, buildReviewBlueprint } from './reviewBlueprint';
import type {
  ReviewPresentation,
  ReviewTrackContext,
  ReviewTrackPresentationBuilder,
  ReviewTrackPresentationState,
} from './presentation/types';
import type {
  DailyReviewQueueData,
  ReviewCoreData,
  ReviewHeaderData,
  ReviewSummaryData,
} from './types';

export type { ReviewPresentation, ReviewTrackContext } from './presentation/types';

const TRACK_BUILDERS: Record<ReviewTrackContext['profile'], ReviewTrackPresentationBuilder> = {
  enem: buildEnemReviewPresentation,
  concurso: buildConcursoReviewPresentation,
  faculdade: buildFaculdadeReviewPresentation,
  outros: buildOutrosReviewPresentation,
  hibrido: buildHibridoReviewPresentation,
};

export const buildReviewTrackPresentation = ({
  header,
  core,
  summary,
  queue,
  state,
  context,
  preferredStudyTrack,
}: {
  header: ReviewHeaderData;
  core: ReviewCoreData;
  summary: ReviewSummaryData;
  queue: DailyReviewQueueData;
  state: ReviewTrackPresentationState;
  context?: ReviewTrackContext | null;
  preferredStudyTrack?: 'enem' | 'concursos' | 'hibrido';
}): ReviewPresentation => {
  const basePresentation: ReviewPresentation = {
    header,
    core,
    summary,
    queue,
  };
  const resolvedContext: ReviewTrackContext = {
    profile: context?.profile || resolveNarrativeProfileFromLegacyTrack(preferredStudyTrack || 'enem'),
    ...context,
  };
  const builder = TRACK_BUILDERS[resolvedContext.profile];
  const trackPresentation = builder({
    presentation: basePresentation,
    context: resolvedContext,
    state,
  });
  const blueprint = buildReviewBlueprint({
    context: resolvedContext,
    state,
    presentation: trackPresentation,
    preferredStudyTrack: preferredStudyTrack || 'enem',
  });

  return applyReviewBlueprint({
    presentation: trackPresentation,
    blueprint,
  });
};

export default buildReviewTrackPresentation;
