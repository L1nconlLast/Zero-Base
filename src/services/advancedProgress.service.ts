import type {
  AdvancedHealthState,
  AdvancedPromotionRule,
  AdvancedSnapshot,
  AdvancedUnlocks,
} from '../types';

export interface AdvancedPromotionInput {
  weeksInIntermediate: number;
  completedDayPlansCount: number;
  dayPlanCompletionRate: number | null;
  weeklyConsistencyRate: number | null;
  nextDayReturnRate: number | null;
  recommendedToolUsageRate: number | null;
  toolBounceRate: number | null;
  choiceAbandonmentRate: number | null;
  manualChoiceWithoutExecutionRate: number | null;
  overloadSignalCount: number;
}

const normalizeRate = (value: number | null | undefined): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  if (value > 1) {
    return value / 100;
  }

  return value;
};

const isRateBelow = (value: number | null | undefined, min: number): boolean => {
  const normalized = normalizeRate(value);
  return normalized === null || normalized < min;
};

const isRateAbove = (value: number | null | undefined, max: number): boolean => {
  const normalized = normalizeRate(value);
  return normalized !== null && normalized > max;
};

const createDefaultAdvancedPromotionRule = (): AdvancedPromotionRule => ({
  weeklyConsistencyMin: 0.7,
  completedDayPlansMin: 5,
  recommendedToolUsageMin: 0.4,
  nextDayReturnMin: 0.5,
  minWeeksInIntermediate: 2,
  maxToolBounceRate: 0.35,
  maxChoiceAbandonmentRate: 0.25,
  maxManualChoiceWithoutExecutionRate: 0.35,
  maxOverloadSignals: 1,
});

export const advancedProgressService = {
  createDefaultAdvancedPromotionRule(): AdvancedPromotionRule {
    return createDefaultAdvancedPromotionRule();
  },

  shouldPromoteToAdvanced(
    input: AdvancedPromotionInput,
    rule: AdvancedPromotionRule = createDefaultAdvancedPromotionRule(),
  ): boolean {
    if (input.weeksInIntermediate < rule.minWeeksInIntermediate) {
      return false;
    }

    if (input.completedDayPlansCount < rule.completedDayPlansMin) {
      return false;
    }

    if (isRateBelow(input.dayPlanCompletionRate, 0.65)) {
      return false;
    }

    if (isRateBelow(input.weeklyConsistencyRate, rule.weeklyConsistencyMin)) {
      return false;
    }

    if (isRateBelow(input.nextDayReturnRate, rule.nextDayReturnMin)) {
      return false;
    }

    if (isRateBelow(input.recommendedToolUsageRate, rule.recommendedToolUsageMin)) {
      return false;
    }

    if (isRateAbove(input.toolBounceRate, rule.maxToolBounceRate)) {
      return false;
    }

    if (isRateAbove(input.choiceAbandonmentRate, rule.maxChoiceAbandonmentRate)) {
      return false;
    }

    if (isRateAbove(input.manualChoiceWithoutExecutionRate, rule.maxManualChoiceWithoutExecutionRate)) {
      return false;
    }

    if (input.overloadSignalCount > rule.maxOverloadSignals) {
      return false;
    }

    return true;
  },

  evaluateAdvancedState(snapshot: AdvancedSnapshot): AdvancedHealthState {
    const planningWithoutExecutionRate = normalizeRate(snapshot.planningWithoutExecutionRate);
    const toolFragmentationRate = normalizeRate(snapshot.toolFragmentationRate);
    const planExecutionRate = normalizeRate(snapshot.planExecutionRate);
    const weeklyConsistencyRate = normalizeRate(snapshot.weeklyConsistencyRate);

    if (
      (planningWithoutExecutionRate !== null && planningWithoutExecutionRate >= 0.45) ||
      snapshot.overplanningSignal >= 2
    ) {
      return 'overplanning';
    }

    if (
      (toolFragmentationRate !== null && toolFragmentationRate >= 0.4) ||
      snapshot.toolFragmentationSignal >= 2
    ) {
      return 'fragmented';
    }

    if (
      (planExecutionRate !== null && planExecutionRate < 0.6) ||
      (weeklyConsistencyRate !== null && weeklyConsistencyRate < 0.65) ||
      snapshot.lowExecutionAfterPlanning > 0 ||
      snapshot.planAbandoned > 0
    ) {
      return 'at_risk';
    }

    return 'healthy';
  },

  getAdvancedUnlocks(): AdvancedUnlocks {
    return {
      editableFullSchedule: true,
      advancedQuestionFilters: true,
      freeMethodSelection: true,
      strategicRevisionBlocks: true,
      fullMockExams: true,
      comparativePerformanceAnalysis: true,
    };
  },
};
