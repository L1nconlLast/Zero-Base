import React from 'react';
import { WorkspaceLayout } from '../Workspace/WorkspaceLayout';

interface FocusSessionLayoutProps {
  context: React.ReactNode;
  timer: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export const FocusSessionLayout: React.FC<FocusSessionLayoutProps> = ({
  context,
  timer,
  rightPanel,
}) => {
  return (
    <WorkspaceLayout rightPanel={rightPanel} contentClassName="space-y-6">
      {context}
      {timer}
    </WorkspaceLayout>
  );
};

export default FocusSessionLayout;
