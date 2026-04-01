import { resolveNarrativeProfileFromLegacyTrack } from '../../utils/trackNarrative';
import type { StudyPresentation, StudyTrackContext, StudyTrackPresentationBuilderState } from './presentation/types';
import type { SupportChecklistItem } from './types';
import { buildConcursoStudySessionBlueprint } from './sessionBlueprints/concurso';
import { buildEnemStudySessionBlueprint } from './sessionBlueprints/enem';
import { buildFaculdadeStudySessionBlueprint } from './sessionBlueprints/faculdade';
import { buildHibridoStudySessionBlueprint } from './sessionBlueprints/hibrido';
import { buildOutrosStudySessionBlueprint } from './sessionBlueprints/outros';

export type StudySessionBlueprintMode =
  | 'foundation'
  | 'review'
  | 'exam_block'
  | 'contest_base'
  | 'discipline_review'
  | 'board_questions'
  | 'final_sprint'
  | 'routine'
  | 'exam_review'
  | 'assignment_execution'
  | 'learning'
  | 'practice'
  | 'consistency'
  | 'topic_progression';

export interface StudySessionBlueprintChecklistItem {
  id: SupportChecklistItem['id'];
  label: string;
  detail?: string;
}

export interface StudySessionBlueprint {
  mode: StudySessionBlueprintMode;
  sessionTypeLabel?: string;
  title?: string;
  primaryGoal?: string;
  supportIntro?: string;
  checklistTitle?: string;
  checklistItems?: StudySessionBlueprintChecklistItem[];
  closureTitle?: string;
  closureMessage?: string;
  closureActionLabel?: string;
  postContextTitle?: string;
  postParentLabel?: string;
  postContinuityTitle?: string;
  postNextStepLabel?: string;
  postFollowUpLabel?: string;
  postProgressHintLabel?: string;
  executionRailTitle?: string;
  executionRailDescription?: string;
  executionRailBlockChipLabel?: string;
}

export interface StudySessionBlueprintBuilderArgs {
  context: StudyTrackContext;
  state: StudyTrackPresentationBuilderState;
}

export type StudySessionBlueprintBuilder = (
  args: StudySessionBlueprintBuilderArgs,
) => StudySessionBlueprint | null;

const BLUEPRINT_BUILDERS: Partial<Record<StudyTrackContext['profile'], StudySessionBlueprintBuilder>> = {
  enem: buildEnemStudySessionBlueprint,
  concurso: buildConcursoStudySessionBlueprint,
  faculdade: buildFaculdadeStudySessionBlueprint,
  outros: buildOutrosStudySessionBlueprint,
  hibrido: buildHibridoStudySessionBlueprint,
};

const mergeChecklistItems = (
  items: StudyPresentation['supportRail']['checklist']['items'],
  overrides?: StudySessionBlueprintChecklistItem[],
) => {
  if (!overrides || overrides.length === 0) {
    return items;
  }

  return items.map((item) => {
    const override = overrides.find((candidate) => candidate.id === item.id);
    if (!override) {
      return item;
    }

    return {
      ...item,
      label: override.label,
      detail: override.detail ?? item.detail,
    };
  });
};

export const applyStudySessionBlueprint = ({
  presentation,
  blueprint,
}: {
  presentation: StudyPresentation;
  blueprint?: StudySessionBlueprint | null;
}): StudyPresentation => {
  if (!blueprint) {
    return presentation;
  }

  return {
    ...presentation,
    sessionHeader: {
      ...presentation.sessionHeader,
      sessionTypeLabel: blueprint.sessionTypeLabel || presentation.sessionHeader.sessionTypeLabel,
      title: blueprint.title || presentation.sessionHeader.title,
    },
    executionCore: {
      ...presentation.executionCore,
      primaryGoal: blueprint.primaryGoal || presentation.executionCore.primaryGoal,
    },
    supportRail: {
      ...presentation.supportRail,
      intro: blueprint.supportIntro || presentation.supportRail.intro,
      checklist: {
        ...presentation.supportRail.checklist,
        title: blueprint.checklistTitle || presentation.supportRail.checklist.title,
        items: mergeChecklistItems(presentation.supportRail.checklist.items, blueprint.checklistItems),
      },
      closure: presentation.supportRail.closure
        ? {
          ...presentation.supportRail.closure,
          title: blueprint.closureTitle || presentation.supportRail.closure.title,
          message: blueprint.closureMessage || presentation.supportRail.closure.message,
          actionLabel: blueprint.closureActionLabel || presentation.supportRail.closure.actionLabel,
        }
        : presentation.supportRail.closure,
    },
    postExecutionBand: {
      ...presentation.postExecutionBand,
      contextTitle: blueprint.postContextTitle || presentation.postExecutionBand.contextTitle,
      continuityTitle: blueprint.postContinuityTitle || presentation.postExecutionBand.continuityTitle,
      context: {
        ...presentation.postExecutionBand.context,
        parentLabel: blueprint.postParentLabel || presentation.postExecutionBand.context.parentLabel,
      },
      continuity: {
        ...presentation.postExecutionBand.continuity,
        nextStepLabel: blueprint.postNextStepLabel || presentation.postExecutionBand.continuity.nextStepLabel,
        followUpLabel: blueprint.postFollowUpLabel || presentation.postExecutionBand.continuity.followUpLabel,
        progressHintLabel: blueprint.postProgressHintLabel || presentation.postExecutionBand.continuity.progressHintLabel,
      },
    },
    executionRail: {
      ...presentation.executionRail,
      title: blueprint.executionRailTitle || presentation.executionRail.title,
      description: blueprint.executionRailDescription || presentation.executionRail.description,
      blockChipLabel: blueprint.executionRailBlockChipLabel || presentation.executionRail.blockChipLabel,
    },
  };
};

export const buildStudySessionBlueprint = ({
  context,
  state,
  preferredStudyTrack,
}: {
  context?: StudyTrackContext | null;
  state: StudyTrackPresentationBuilderState;
  preferredStudyTrack: 'enem' | 'concursos' | 'hibrido';
}): StudySessionBlueprint | null => {
  const resolvedContext: StudyTrackContext = {
    profile: context?.profile || resolveNarrativeProfileFromLegacyTrack(preferredStudyTrack),
    ...context,
  };
  const builder = BLUEPRINT_BUILDERS[resolvedContext.profile];

  return builder ? builder({ context: resolvedContext, state }) : null;
};

export default buildStudySessionBlueprint;
