import type { ProductPhase } from '../../hooks/useEffectivePhase';
import { isNativeStudyContextMode } from './appShell';
import type { StudyContextMode } from './types';

export const shouldUseLegacyBeginnerBootstrap = (
  mode: StudyContextMode | null | undefined,
): boolean => !isNativeStudyContextMode(mode);

export const resolveDetectedProductPhase = ({
  mode,
  isReadyForIntermediate,
  isReadyForAdvanced = false,
}: {
  mode: StudyContextMode | null | undefined;
  isReadyForIntermediate: boolean;
  isReadyForAdvanced?: boolean;
}): ProductPhase => {
  if (!shouldUseLegacyBeginnerBootstrap(mode)) {
    return 'intermediate';
  }

  if (isReadyForAdvanced) {
    return 'advanced';
  }

  return isReadyForIntermediate ? 'intermediate' : 'beginner';
};
