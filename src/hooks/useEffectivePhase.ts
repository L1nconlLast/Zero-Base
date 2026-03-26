import React from 'react';

export type ProductPhase = 'beginner' | 'intermediate' | 'advanced';
export type ProductPhaseOverride = ProductPhase | null;

export const useEffectivePhase = (detectedPhase: ProductPhase, phaseOverride: ProductPhaseOverride) =>
  React.useMemo(
    () => ({
      detectedPhase,
      effectivePhase: phaseOverride ?? detectedPhase,
      isOverridden: phaseOverride !== null,
    }),
    [detectedPhase, phaseOverride],
  );
