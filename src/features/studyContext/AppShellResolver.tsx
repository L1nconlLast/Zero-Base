import React from 'react';

import { FaculdadeShell } from '../faculdade/FaculdadeShell';
import { OutrosShell } from '../outros/OutrosShell';
import type { ProfileTrackContext } from '../profile/types';
import type { StudyContextMode } from './types';
import { canResolveNativeShellTab, isNativeStudyContextMode } from './appShell';

export interface AppShellResolverProps {
  mode: StudyContextMode | null | undefined;
  activeTab: string;
  darkMode?: boolean;
  userId?: string | null;
  profileContext: ProfileTrackContext | null;
  homeSlot: React.ReactNode;
  planningSlot: React.ReactNode;
  profileSlot: React.ReactNode;
  onNavigate: (tabId: string) => void;
  onReviewContext: () => void;
}

export const AppShellResolver: React.FC<AppShellResolverProps> = ({
  mode,
  activeTab,
  darkMode = false,
  userId,
  profileContext,
  homeSlot,
  planningSlot,
  profileSlot,
  onNavigate,
  onReviewContext,
}) => {
  if (!canResolveNativeShellTab(mode, activeTab) || !isNativeStudyContextMode(mode)) {
    return null;
  }

  if (mode === 'faculdade') {
    return (
      <FaculdadeShell
        darkMode={darkMode}
        activeTab={activeTab}
        userId={userId}
        profileContext={profileContext}
        homeSlot={homeSlot}
        planningSlot={planningSlot}
        profileSlot={profileSlot}
        onNavigate={onNavigate}
        onReviewContext={onReviewContext}
      />
    );
  }

  return (
    <OutrosShell
      darkMode={darkMode}
      activeTab={activeTab}
      userId={userId}
      profileContext={profileContext}
      homeSlot={homeSlot}
      profileSlot={profileSlot}
      onNavigate={onNavigate}
      onReviewContext={onReviewContext}
    />
  );
};

export default AppShellResolver;
