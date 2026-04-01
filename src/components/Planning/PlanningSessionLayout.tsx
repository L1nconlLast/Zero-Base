import React from 'react';
import { WorkspaceLayout } from '../Workspace/WorkspaceLayout';

interface PlanningSessionLayoutProps {
  overview: React.ReactNode;
  sequence: React.ReactNode;
  calendar: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export const PlanningSessionLayout: React.FC<PlanningSessionLayoutProps> = ({
  overview,
  sequence,
  calendar,
  rightPanel,
}) => {
  return (
    <WorkspaceLayout rightPanel={rightPanel} contentClassName="space-y-6">
      {overview}
      {sequence}
      <div className="min-w-0">{calendar}</div>
    </WorkspaceLayout>
  );
};

export default PlanningSessionLayout;
