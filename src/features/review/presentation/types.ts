import type { PlanoTrackContext } from '../../plano/presentation/types';
import type {
  DailyReviewQueueData,
  ReviewCoreData,
  ReviewHeaderData,
  ReviewSummaryData,
} from '../types';

export type { PlanoTrackContext as ReviewTrackContext } from '../../plano/presentation/types';

export interface ReviewPresentation {
  header: ReviewHeaderData;
  core: ReviewCoreData;
  summary: ReviewSummaryData;
  queue: DailyReviewQueueData;
}

export interface ReviewTrackPresentationState {
  activeTitle?: string | null;
}

export interface ReviewTrackPresentationBuilderArgs {
  presentation: ReviewPresentation;
  context: PlanoTrackContext;
  state: ReviewTrackPresentationState;
}

export type ReviewTrackPresentationBuilder = (
  args: ReviewTrackPresentationBuilderArgs,
) => ReviewPresentation;
