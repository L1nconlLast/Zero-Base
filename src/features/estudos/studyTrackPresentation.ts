import { resolveNarrativeProfileFromLegacyTrack } from '../../utils/trackNarrative';
import { buildConcursoStudyPresentation } from './presentation/concurso';
import { buildEnemStudyPresentation } from './presentation/enem';
import { buildFaculdadeStudyPresentation } from './presentation/faculdade';
import { buildHibridoStudyPresentation } from './presentation/hibrido';
import { buildOutrosStudyPresentation } from './presentation/outros';
import {
  applyStudySessionBlueprint,
  buildStudySessionBlueprint,
} from './sessionBlueprint';
import type {
  StudyPresentation,
  StudyTrackContext,
  StudyTrackPresentationBuilder,
  StudyTrackPresentationBuilderState,
} from './presentation/types';
import type {
  ExecutionCoreData,
  PostExecutionBandData,
  SessionHeaderData,
  StudyExecutionRailData,
  SupportRailData,
} from './types';

export type { StudyPresentation, StudyTrackContext } from './presentation/types';

const TRACK_BUILDERS: Record<StudyTrackContext['profile'], StudyTrackPresentationBuilder> = {
  enem: buildEnemStudyPresentation,
  concurso: buildConcursoStudyPresentation,
  faculdade: buildFaculdadeStudyPresentation,
  outros: buildOutrosStudyPresentation,
  hibrido: buildHibridoStudyPresentation,
};

const buildBaseStudyPresentation = ({
  sessionHeader,
  executionCore,
  supportRail,
  postExecutionBand,
  executionRail,
}: {
  sessionHeader: SessionHeaderData;
  executionCore: ExecutionCoreData;
  supportRail: SupportRailData;
  postExecutionBand: PostExecutionBandData;
  executionRail: StudyExecutionRailData;
}): StudyPresentation => ({
  sessionHeader,
  executionCore,
  supportRail,
  postExecutionBand,
  executionRail,
});

export const buildStudyTrackPresentation = ({
  sessionHeader,
  executionCore,
  supportRail,
  postExecutionBand,
  executionRail,
  state,
  context,
  preferredStudyTrack,
}: {
  sessionHeader: SessionHeaderData;
  executionCore: ExecutionCoreData;
  supportRail: SupportRailData;
  postExecutionBand: PostExecutionBandData;
  executionRail: StudyExecutionRailData;
  state: StudyTrackPresentationBuilderState;
  context?: StudyTrackContext | null;
  preferredStudyTrack: 'enem' | 'concursos' | 'hibrido';
}): StudyPresentation => {
  const basePresentation = buildBaseStudyPresentation({
    sessionHeader,
    executionCore,
    supportRail,
    postExecutionBand,
    executionRail,
  });
  const resolvedContext: StudyTrackContext = {
    profile: context?.profile || resolveNarrativeProfileFromLegacyTrack(preferredStudyTrack),
    ...context,
  };
  const builder = TRACK_BUILDERS[resolvedContext.profile];
  const trackPresentation = builder({
    presentation: basePresentation,
    context: resolvedContext,
    state,
  });
  const blueprint = buildStudySessionBlueprint({
    context: resolvedContext,
    state,
    preferredStudyTrack,
  });

  return applyStudySessionBlueprint({
    presentation: trackPresentation,
    blueprint,
  });
};

export default buildStudyTrackPresentation;
