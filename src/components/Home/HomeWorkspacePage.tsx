import React from 'react';
import { HomeWorkspacePageV2 } from './HomeWorkspacePageV2';
import type { HomeWorkspacePageProps } from './homeWorkspaceTypes';

export type {
  HomeContinuationMission,
  HomeNextSessionCommit,
  HomeStudyNowCard,
  HomeWorkspacePageProps,
} from './homeWorkspaceTypes';

export const HomeWorkspacePage: React.FC<HomeWorkspacePageProps> = (props) => (
  <HomeWorkspacePageV2 {...props} />
);

export default HomeWorkspacePage;

