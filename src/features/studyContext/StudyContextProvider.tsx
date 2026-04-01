import React from 'react';

import { useLocalStorage } from '../../hooks/useLocalStorage';
import { isSupabaseConfigured } from '../../services/supabase.client';
import { studyContextService } from '../../services/studyContext.service';
import {
  buildStudyContextDraftFromOnboarding,
  buildStudyContextRecordDraft,
  resolveLegacyTrackFromStudyContextMode,
} from './studyContext';
import type {
  LegacyStudyTrack,
  StudyContextMode,
  StudyContextOnboardingSnapshot,
  StudyContextPayload,
  UserStudyContextRecord,
} from './types';

export type StudyContextBootstrapStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PersistStudyContextInput {
  mode: StudyContextMode;
  contextSummary?: string | null;
  contextDescription?: string | null;
  contextPayload: StudyContextPayload;
}

export interface StudyContextControllerOptions {
  authLoading: boolean;
  isLoggedIn: boolean;
  userEmail?: string | null;
  userStorageScope: string;
  supabaseUserId?: string | null;
  legacyOnboardingSnapshot?: StudyContextOnboardingSnapshot | null;
  onLegacyTrackResolved?: (track: LegacyStudyTrack) => void;
}

export interface StudyContextValue {
  isHydrating: boolean;
  bootstrapStatus: StudyContextBootstrapStatus;
  activeStudyContext: UserStudyContextRecord | null;
  activeMode: StudyContextMode | null;
  onboardingSnapshot: StudyContextOnboardingSnapshot | null;
  setActiveStudyContext: (record: UserStudyContextRecord | null) => void;
  refreshActiveStudyContext: () => Promise<UserStudyContextRecord | null>;
  persistActiveStudyContext: (input: PersistStudyContextInput) => Promise<UserStudyContextRecord | null>;
}

const StudyContextContext = React.createContext<StudyContextValue | null>(null);

const resolveLocalUserId = (
  supabaseUserId?: string | null,
  userEmail?: string | null,
): string | null => {
  if (supabaseUserId) {
    return supabaseUserId;
  }

  if (userEmail) {
    return `local:${userEmail}`;
  }

  return null;
};

export const useStudyContextController = ({
  authLoading,
  isLoggedIn,
  userEmail,
  userStorageScope,
  supabaseUserId,
  legacyOnboardingSnapshot = null,
  onLegacyTrackResolved,
}: StudyContextControllerOptions): StudyContextValue => {
  const [activeStudyContext, setActiveStudyContext] = useLocalStorage<UserStudyContextRecord | null>(
    `activeStudyContext_${supabaseUserId || userStorageScope}`,
    null,
  );
  const [bootstrapStatus, setBootstrapStatus] = React.useState<StudyContextBootstrapStatus>('idle');
  const hydratedRef = React.useRef<string | null>(null);

  const refreshActiveStudyContext = React.useCallback(async (): Promise<UserStudyContextRecord | null> => {
    if (!isLoggedIn || !userEmail) {
      hydratedRef.current = null;
      setActiveStudyContext(null);
      setBootstrapStatus('idle');
      return null;
    }

    setBootstrapStatus('loading');

    try {
      let nextContext: UserStudyContextRecord | null = null;

      if (isSupabaseConfigured && supabaseUserId) {
        nextContext = await studyContextService.getActiveByUser(supabaseUserId);
      }

      if (!nextContext && legacyOnboardingSnapshot) {
        nextContext = buildStudyContextDraftFromOnboarding(
          resolveLocalUserId(supabaseUserId, userEmail) || `local:${userEmail}`,
          legacyOnboardingSnapshot,
        );
      }

      setActiveStudyContext(nextContext || null);
      setBootstrapStatus('ready');

      if (nextContext) {
        const legacyTrack = resolveLegacyTrackFromStudyContextMode(nextContext.mode);
        if (legacyTrack) {
          onLegacyTrackResolved?.(legacyTrack);
        }
      }

      return nextContext;
    } catch {
      setBootstrapStatus('error');
      return null;
    }
  }, [
    isLoggedIn,
    legacyOnboardingSnapshot,
    onLegacyTrackResolved,
    setActiveStudyContext,
    supabaseUserId,
    userEmail,
  ]);

  const persistActiveStudyContext = React.useCallback(async (
    input: PersistStudyContextInput,
  ): Promise<UserStudyContextRecord | null> => {
    const userId = resolveLocalUserId(supabaseUserId, userEmail);
    if (!userId) {
      return null;
    }

    const nextRecord = buildStudyContextRecordDraft({
      userId,
      mode: input.mode,
      contextSummary: input.contextSummary || null,
      contextDescription: input.contextDescription || null,
      payload: input.contextPayload,
    });

    setActiveStudyContext(nextRecord);

    const legacyTrack = resolveLegacyTrackFromStudyContextMode(input.mode);
    if (legacyTrack) {
      onLegacyTrackResolved?.(legacyTrack);
    }

    if (isSupabaseConfigured && supabaseUserId) {
      await studyContextService.upsertActive(supabaseUserId, input);
    }

    setBootstrapStatus('ready');
    return nextRecord;
  }, [onLegacyTrackResolved, setActiveStudyContext, supabaseUserId, userEmail]);

  React.useEffect(() => {
    if (authLoading) {
      setBootstrapStatus('loading');
      return;
    }

    if (!isLoggedIn || !userEmail) {
      hydratedRef.current = null;
      setActiveStudyContext(null);
      setBootstrapStatus('idle');
      return;
    }

    const hydrationKey = `${supabaseUserId || 'local'}:${userEmail}`;
    if (hydratedRef.current === hydrationKey) {
      return;
    }

    hydratedRef.current = hydrationKey;
    void refreshActiveStudyContext();
  }, [
    authLoading,
    isLoggedIn,
    refreshActiveStudyContext,
    setActiveStudyContext,
    supabaseUserId,
    userEmail,
  ]);

  return React.useMemo<StudyContextValue>(() => ({
    isHydrating: bootstrapStatus === 'loading',
    bootstrapStatus,
    activeStudyContext,
    activeMode: activeStudyContext?.mode || legacyOnboardingSnapshot?.focus || null,
    onboardingSnapshot: legacyOnboardingSnapshot,
    setActiveStudyContext,
    refreshActiveStudyContext,
    persistActiveStudyContext,
  }), [
    activeStudyContext,
    bootstrapStatus,
    legacyOnboardingSnapshot,
    persistActiveStudyContext,
    refreshActiveStudyContext,
    setActiveStudyContext,
  ]);
};

export interface StudyContextProviderProps extends StudyContextControllerOptions {
  children: React.ReactNode;
}

export const StudyContextProvider: React.FC<StudyContextProviderProps> = ({
  children,
  ...options
}) => {
  const value = useStudyContextController(options);
  return (
    <StudyContextContext.Provider value={value}>
      {children}
    </StudyContextContext.Provider>
  );
};

export const useStudyContext = (): StudyContextValue => {
  const context = React.useContext(StudyContextContext);
  if (!context) {
    throw new Error('useStudyContext must be used within a StudyContextProvider.');
  }

  return context;
};
