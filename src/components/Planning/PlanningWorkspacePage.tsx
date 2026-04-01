import React from 'react';
import { PlanoPage, type PlanoPageProps } from '../../features/plano';

export type PlanningWorkspacePageProps = PlanoPageProps;

export const PlanningWorkspacePage: React.FC<PlanningWorkspacePageProps> = (props) => {
  return <PlanoPage {...props} />;
};

export default PlanningWorkspacePage;
