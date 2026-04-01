import type { PlanoTrackContext } from '../../plano/presentation/types';
import type {
  ExecutionCoreData,
  PostExecutionBandData,
  SessionHeaderData,
  StudyExecutionRailData,
  SupportRailData,
} from '../types';

export type { PlanoTrackContext as StudyTrackContext } from '../../plano/presentation/types';

export interface StudyPresentation {
  sessionHeader: SessionHeaderData;
  executionCore: ExecutionCoreData;
  supportRail: SupportRailData;
  postExecutionBand: PostExecutionBandData;
  executionRail: StudyExecutionRailData;
}

export interface StudyTrackPresentationBuilderState {
  currentBlockLabel: string;
  currentBlockObjective: string;
  currentTargetQuestions: number;
  activeStudyMethodName: string;
  isBlocked: boolean;
  showQuestionTransitionState: boolean;
  showPostFocusState: boolean;
}

export interface StudyTrackPresentationBuilderArgs {
  presentation: StudyPresentation;
  context: PlanoTrackContext;
  state: StudyTrackPresentationBuilderState;
}

export type StudyTrackPresentationBuilder = (
  args: StudyTrackPresentationBuilderArgs,
) => StudyPresentation;
