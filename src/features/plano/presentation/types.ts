import type { UsePlanoResult } from '../hooks/usePlano';
import type { PlanoDistributionItem, PlanoHeaderData, PlanoNextStepItem } from '../types';

export type PlanoTrackProfile = 'enem' | 'concurso' | 'faculdade' | 'outros' | 'hibrido';
export type PlanoHybridPrimaryFocus = 'enem' | 'concurso' | 'equilibrado';
export type PlanoCollegeFocus = 'rotina' | 'provas' | 'trabalhos';
export type PlanoOtherFocus = 'aprender' | 'praticar' | 'rotina' | 'evoluir_tema';

export interface PlanoTrackContext {
  profile: PlanoTrackProfile;
  summaryTitle?: string | null;
  summaryDescription?: string | null;
  examGoal?: string | null;
  examDate?: string | null;
  enem?: {
    targetCollege?: string | null;
    targetCourse?: string | null;
    triedBefore?: 'sim' | 'nao' | null;
    profileLevel?: 'iniciante' | 'intermediario' | 'avancado' | null;
  } | null;
  concurso?: {
    name?: string | null;
    board?: string | null;
    area?: string | null;
    examDate?: string | null;
    planningWithoutDate?: boolean | null;
    experienceLevel?: 'iniciante' | 'intermediario' | 'avancado' | null;
  } | null;
  faculdade?: {
    institution?: string | null;
    course?: string | null;
    semester?: string | null;
    focus?: PlanoCollegeFocus | null;
  } | null;
  outros?: {
    goalTitle?: string | null;
    focus?: PlanoOtherFocus | null;
    deadline?: string | null;
  } | null;
  hibrido?: {
    primaryFocus?: PlanoHybridPrimaryFocus | null;
    availableStudyTime?: 'baixo' | 'medio' | 'alto' | null;
    concursoExamDate?: string | null;
  } | null;
}

export interface PlanoSummaryCard {
  id: 'load' | 'subjects' | 'cycle';
  eyebrow: string;
  value: string;
  detail: string;
  support: string;
}

export interface PlanoSectionCopy {
  eyebrow: string;
  title: string;
  description: string;
}

export interface PlanoSupportBlockCopy {
  label: string;
  title: string;
  description: string;
}

export interface PlanoRebalanceCopy {
  label: string;
  description: string;
}

export interface PlanoLoadBalanceCopy {
  todayEyebrow: string;
  executeLabel: string;
  focusLabel: string;
  coverageDescription: string;
  quickReadLabel: string;
  quickReadDescription: string;
}

export interface PlanoPresentation {
  header: PlanoHeaderData;
  summaryCards: PlanoSummaryCard[];
  distribution: {
    copy: PlanoSectionCopy & {
      footer: string;
    };
    items: PlanoDistributionItem[];
  };
  nextSteps: {
    copy: PlanoSectionCopy;
    items: PlanoNextStepItem[];
  };
  support: PlanoSupportBlockCopy;
  rebalance: PlanoRebalanceCopy;
  loadBalance: PlanoLoadBalanceCopy;
}

export interface PlanoTrackPresentationBuilderArgs {
  plan: UsePlanoResult;
  presentation: PlanoPresentation;
  context: PlanoTrackContext;
}

export type PlanoTrackPresentationBuilder = (
  args: PlanoTrackPresentationBuilderArgs,
) => PlanoPresentation;
