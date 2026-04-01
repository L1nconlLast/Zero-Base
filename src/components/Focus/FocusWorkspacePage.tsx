import React from 'react';
import { EstudosPage, type EstudosPageProps } from '../../features/estudos';

export type FocusWorkspacePageProps = EstudosPageProps;

// legado: foco -> novo: estudos
export const FocusWorkspacePage: React.FC<FocusWorkspacePageProps> = (props) => {
  return <EstudosPage {...props} />;
};

export default FocusWorkspacePage;
