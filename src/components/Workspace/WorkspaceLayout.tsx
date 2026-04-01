import React from 'react';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  contentClassName?: string;
  rightPanelClassName?: string;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  children,
  rightPanel,
  contentClassName = '',
  rightPanelClassName = '',
}) => {
  const hasRightPanel = Boolean(rightPanel);

  return (
    <div className={hasRightPanel ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]' : 'min-w-0'}>
      <div className={`min-w-0 space-y-5 ${contentClassName}`.trim()}>{children}</div>
      {hasRightPanel ? (
        <aside className={`min-w-0 self-start space-y-5 xl:sticky xl:top-6 ${rightPanelClassName}`.trim()}>
          {rightPanel}
        </aside>
      ) : null}
    </div>
  );
};

export default WorkspaceLayout;
