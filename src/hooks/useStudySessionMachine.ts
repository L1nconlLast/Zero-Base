import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  MateriaTipo,
  PersistedStudySession,
  StudySessionPhase,
  StudySessionSource,
  StudySessionStatus,
  StudySessionTimerKind,
} from '../types';
import { trackEvent } from '../utils/analytics';

type TransitionEventName =
  | 'session_started'
  | 'session_paused'
  | 'session_resumed'
  | 'session_completed'
  | 'session_cancelled'
  | 'session_restored'
  | 'session_abandoned';

interface SessionSnapshotOverrides {
  phase?: StudySessionPhase;
  plannedDurationMs?: number;
  subject?: MateriaTipo;
  methodId?: string;
  completedFocusCycles?: number;
}

interface UseStudySessionMachineOptions {
  storageKey: string;
  exclusiveStorageKeys?: string[];
  source: StudySessionSource;
  kind: StudySessionTimerKind;
  plannedDurationMs: number;
  subject: MateriaTipo;
  phase?: StudySessionPhase;
  methodId?: string;
  userEmail?: string;
}

interface FinalizeOptions {
  clearResume?: boolean;
  capPhaseToPlan?: boolean;
}

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `study-session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getResumedDeltaMs = (
  session: PersistedStudySession,
  nowMs: number,
  capPhaseToPlan = true,
) => {
  if (session.status !== 'running' || !session.lastResumedAt) {
    return 0;
  }

  const resumedAtMs = Date.parse(session.lastResumedAt);
  if (!Number.isFinite(resumedAtMs)) {
    return 0;
  }

  const rawDeltaMs = Math.max(0, nowMs - resumedAtMs);
  if (session.kind !== 'countdown' || !capPhaseToPlan) {
    return rawDeltaMs;
  }

  const remainingPhaseMs = Math.max(0, session.plannedDurationMs - session.accumulatedPhaseMs);
  return Math.min(rawDeltaMs, remainingPhaseMs);
};

const finalizeSessionProgress = (
  session: PersistedStudySession,
  nowMs: number,
  options?: FinalizeOptions,
): PersistedStudySession => {
  const deltaMs = getResumedDeltaMs(session, nowMs, options?.capPhaseToPlan ?? true);
  const nextAccumulatedPhaseMs = session.accumulatedPhaseMs + deltaMs;
  const nextAccumulatedFocusMs =
    session.phase === 'focus' ? session.accumulatedFocusMs + deltaMs : session.accumulatedFocusMs;
  const updatedAt = new Date(nowMs).toISOString();

  return {
    ...session,
    accumulatedPhaseMs: nextAccumulatedPhaseMs,
    accumulatedFocusMs: nextAccumulatedFocusMs,
    lastResumedAt: options?.clearResume === false ? session.lastResumedAt : null,
    updatedAt,
  };
};

const buildSessionPayload = (
  options: UseStudySessionMachineOptions,
  overrides?: SessionSnapshotOverrides,
): PersistedStudySession => {
  const nowIso = new Date().toISOString();

  return {
    sessionId: createSessionId(),
    source: options.source,
    kind: options.kind,
    status: 'running',
    phase: overrides?.phase ?? options.phase ?? 'focus',
    startedAt: nowIso,
    phaseStartedAt: nowIso,
    lastResumedAt: nowIso,
    lastPausedAt: null,
    completedAt: null,
    cancelledAt: null,
    lastRestoredAt: null,
    accumulatedFocusMs: 0,
    accumulatedPhaseMs: 0,
    plannedDurationMs: overrides?.plannedDurationMs ?? options.plannedDurationMs,
    completedFocusCycles: overrides?.completedFocusCycles ?? 0,
    subject: overrides?.subject ?? options.subject,
    methodId: overrides?.methodId ?? options.methodId,
    updatedAt: nowIso,
  };
};

const getDerivedSessionMetrics = (
  session: PersistedStudySession | null,
  nowMs: number,
  fallbackPlannedDurationMs: number,
) => {
  if (!session) {
    return {
      elapsedFocusMs: 0,
      elapsedPhaseMs: 0,
      remainingPhaseMs: fallbackPlannedDurationMs,
      plannedDurationMs: fallbackPlannedDurationMs,
      progressPercent: 0,
    };
  }

  const resumedDeltaMs = getResumedDeltaMs(session, nowMs);
  const elapsedFocusMs =
    session.accumulatedFocusMs + (session.phase === 'focus' ? resumedDeltaMs : 0);
  const elapsedPhaseMs = session.accumulatedPhaseMs + resumedDeltaMs;
  const referenceElapsedMs = session.kind === 'countdown' ? elapsedPhaseMs : elapsedFocusMs;
  const remainingPhaseMs = Math.max(0, session.plannedDurationMs - referenceElapsedMs);
  const progressPercent =
    session.plannedDurationMs > 0
      ? Math.min(100, (referenceElapsedMs / session.plannedDurationMs) * 100)
      : 0;

  return {
    elapsedFocusMs,
    elapsedPhaseMs,
    remainingPhaseMs,
    plannedDurationMs: session.plannedDurationMs,
    progressPercent,
  };
};

const buildTrackingPayload = (
  session: PersistedStudySession,
  metrics: ReturnType<typeof getDerivedSessionMetrics>,
  extra?: Record<string, unknown>,
) => ({
  sessionId: session.sessionId,
  source: session.source,
  kind: session.kind,
  status: session.status,
  phase: session.phase,
  plannedDurationMs: session.plannedDurationMs,
  accumulatedFocusMs: metrics.elapsedFocusMs,
  accumulatedPhaseMs: metrics.elapsedPhaseMs,
  completedFocusCycles: session.completedFocusCycles,
  subject: session.subject,
  methodId: session.methodId || null,
  startedAt: session.startedAt,
  ...extra,
});

const readPersistedSession = (storageKey: string): PersistedStudySession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as PersistedStudySession | null;
  } catch {
    return null;
  }
};

const writePersistedSession = (
  storageKey: string,
  nextSession: PersistedStudySession | null,
) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!nextSession) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
  } catch {
    // noop
  }
};

const clearCompetingSessions = (
  storageKey: string,
  exclusiveStorageKeys: string[] | undefined,
  preserveSessionId?: string,
) => {
  if (!exclusiveStorageKeys?.length) {
    return;
  }

  exclusiveStorageKeys.forEach((candidateKey) => {
    if (candidateKey === storageKey) {
      return;
    }

    const persistedSession = readPersistedSession(candidateKey);
    if (!persistedSession) {
      return;
    }

    if (preserveSessionId && persistedSession.sessionId === preserveSessionId) {
      return;
    }

    if (persistedSession.status !== 'running' && persistedSession.status !== 'paused') {
      return;
    }

    writePersistedSession(candidateKey, null);
  });
};

export function useStudySessionMachine(options: UseStudySessionMachineOptions) {
  const [session, setSessionState] = useState<PersistedStudySession | null>(() =>
    readPersistedSession(options.storageKey),
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const mountedAtRef = useRef(Date.now());
  const sessionRef = useRef<PersistedStudySession | null>(session);

  const setSession = useCallback(
    (
      value:
        | PersistedStudySession
        | null
        | ((current: PersistedStudySession | null) => PersistedStudySession | null),
    ) => {
      setSessionState((current) => {
        const nextSession =
          typeof value === 'function'
            ? (value as (current: PersistedStudySession | null) => PersistedStudySession | null)(current)
            : value;

        if (nextSession && (nextSession.status === 'running' || nextSession.status === 'paused')) {
          clearCompetingSessions(
            options.storageKey,
            options.exclusiveStorageKeys,
            nextSession.sessionId,
          );
        }

        sessionRef.current = nextSession;
        writePersistedSession(options.storageKey, nextSession);
        return nextSession;
      });
    },
    [options.exclusiveStorageKeys, options.storageKey],
  );

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const persistedSession = readPersistedSession(options.storageKey);
    sessionRef.current = persistedSession;
    setSessionState(persistedSession);
  }, [options.storageKey]);

  useEffect(() => {
    if (session?.status !== 'running') {
      return;
    }

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [session?.status]);

  const metrics = useMemo(
    () => getDerivedSessionMetrics(session, nowMs, options.plannedDurationMs),
    [nowMs, options.plannedDurationMs, session],
  );

  const status: StudySessionStatus = session?.status ?? 'idle';
  const phase = session?.phase ?? options.phase ?? 'focus';

  const emitTransition = useCallback(
    (eventName: TransitionEventName, activeSession: PersistedStudySession, extra?: Record<string, unknown>) => {
      const eventMetrics = getDerivedSessionMetrics(activeSession, Date.now(), activeSession.plannedDurationMs);
      trackEvent(
        eventName,
        buildTrackingPayload(activeSession, eventMetrics, extra),
        { userEmail: options.userEmail },
      );
    },
    [options.userEmail],
  );

  const start = useCallback(
    (overrides?: SessionSnapshotOverrides) => {
      const nextSession = buildSessionPayload(options, overrides);
      setNowMs(Date.now());
      setSession(nextSession);
      emitTransition('session_started', nextSession, {
        restoredFromStatus: null,
      });
      return nextSession;
    },
    [emitTransition, options, setSession],
  );

  const pause = useCallback(() => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.status !== 'running') {
      return null;
    }

    const now = Date.now();
    const pausedAt = new Date(now).toISOString();
    const finalized = finalizeSessionProgress(currentSession, now);
    const nextSession: PersistedStudySession = {
      ...finalized,
      status: 'paused',
      lastPausedAt: pausedAt,
      updatedAt: pausedAt,
    };

    setNowMs(now);
    setSession(nextSession);
    emitTransition('session_paused', nextSession);
    return nextSession;
  }, [emitTransition, setSession]);

  const resume = useCallback(
    (overrides?: SessionSnapshotOverrides) => {
      const currentSession = sessionRef.current;
      if (!currentSession || currentSession.status !== 'paused') {
        return null;
      }

      const now = Date.now();
      const resumedAt = new Date(now).toISOString();
      const nextSession: PersistedStudySession = {
        ...currentSession,
        status: 'running',
        phase: overrides?.phase ?? currentSession.phase,
        plannedDurationMs: overrides?.plannedDurationMs ?? currentSession.plannedDurationMs,
        subject: overrides?.subject ?? currentSession.subject,
        methodId: overrides?.methodId ?? currentSession.methodId,
        completedFocusCycles:
          overrides?.completedFocusCycles ?? currentSession.completedFocusCycles,
        lastResumedAt: resumedAt,
        updatedAt: resumedAt,
      };

      setNowMs(now);
      setSession(nextSession);
      emitTransition('session_resumed', nextSession);
      return nextSession;
    },
    [emitTransition, setSession],
  );

  const switchPhase = useCallback(
    (
      nextPhase: StudySessionPhase,
      nextPlannedDurationMs: number,
      overrides?: SessionSnapshotOverrides & {
        nextStatus?: 'running' | 'paused';
      },
    ) => {
      const currentSession = sessionRef.current;
      const now = Date.now();
      const nowIso = new Date(now).toISOString();

      if (!currentSession) {
        const nextSession = buildSessionPayload(options, {
          phase: nextPhase,
          plannedDurationMs: nextPlannedDurationMs,
          subject: overrides?.subject ?? options.subject,
          methodId: overrides?.methodId ?? options.methodId,
          completedFocusCycles: overrides?.completedFocusCycles ?? 0,
        });
        const normalizedStatus = overrides?.nextStatus ?? 'paused';
        const normalizedSession: PersistedStudySession =
          normalizedStatus === 'running'
            ? nextSession
            : {
                ...nextSession,
                status: 'paused',
                lastResumedAt: null,
                lastPausedAt: nextSession.startedAt,
              };

        setNowMs(now);
        setSession(normalizedSession);
        return normalizedSession;
      }

      const finalized = finalizeSessionProgress(currentSession, now);
      const nextStatus = overrides?.nextStatus ?? (currentSession.status === 'running' ? 'running' : 'paused');
      const nextSession: PersistedStudySession = {
        ...finalized,
        phase: nextPhase,
        phaseStartedAt: nowIso,
        plannedDurationMs: nextPlannedDurationMs,
        accumulatedPhaseMs: 0,
        subject: overrides?.subject ?? finalized.subject,
        methodId: overrides?.methodId ?? finalized.methodId,
        completedFocusCycles:
          overrides?.completedFocusCycles ?? finalized.completedFocusCycles,
        status: nextStatus,
        lastResumedAt: nextStatus === 'running' ? nowIso : null,
        lastPausedAt: nextStatus === 'paused' ? nowIso : finalized.lastPausedAt,
        updatedAt: nowIso,
      };

      setNowMs(now);
      setSession(nextSession);
      return nextSession;
    },
    [options, setSession],
  );

  const complete = useCallback(() => {
    const currentSession = sessionRef.current;
    if (!currentSession || (currentSession.status !== 'running' && currentSession.status !== 'paused')) {
      return null;
    }

    const now = Date.now();
    const completedAt = new Date(now).toISOString();
    const finalized = finalizeSessionProgress(currentSession, now);
    const nextSession: PersistedStudySession = {
      ...finalized,
      status: 'completed',
      completedAt,
      updatedAt: completedAt,
    };

    setNowMs(now);
    setSession(nextSession);
    emitTransition('session_completed', nextSession);
    return nextSession;
  }, [emitTransition, setSession]);

  const cancel = useCallback(() => {
    const currentSession = sessionRef.current;
    if (!currentSession || (currentSession.status !== 'running' && currentSession.status !== 'paused')) {
      return null;
    }

    const now = Date.now();
    const cancelledAt = new Date(now).toISOString();
    const finalized = finalizeSessionProgress(currentSession, now, {
      capPhaseToPlan: false,
    });
    const nextSession: PersistedStudySession = {
      ...finalized,
      status: 'cancelled',
      cancelledAt,
      updatedAt: cancelledAt,
    };

    setNowMs(now);
    setSession(nextSession);
    emitTransition('session_cancelled', nextSession);
    return nextSession;
  }, [emitTransition, setSession]);

  const clear = useCallback(() => {
    setNowMs(Date.now());
    setSession(null);
  }, [setSession]);

  const syncMetadata = useCallback(
    (overrides: SessionSnapshotOverrides) => {
      setSession((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          phase: overrides.phase ?? current.phase,
          plannedDurationMs: overrides.plannedDurationMs ?? current.plannedDurationMs,
          subject: overrides.subject ?? current.subject,
          methodId: overrides.methodId ?? current.methodId,
          completedFocusCycles:
            overrides.completedFocusCycles ?? current.completedFocusCycles,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [setSession],
  );

  useEffect(() => {
    const currentSession = sessionRef.current;
    if (!currentSession || !['running', 'paused'].includes(currentSession.status)) {
      return;
    }

    const updatedAtMs = Date.parse(currentSession.updatedAt);
    if (!Number.isFinite(updatedAtMs) || updatedAtMs >= mountedAtRef.current) {
      return;
    }

    if (currentSession.lastRestoredAt) {
      return;
    }

    const restoredAt = new Date().toISOString();
    const restoredSession = {
      ...currentSession,
      lastRestoredAt: restoredAt,
      updatedAt: restoredAt,
    };

    setSession(restoredSession);
    emitTransition('session_restored', restoredSession, {
      restoredFromStatus: currentSession.status,
    });
  }, [emitTransition, setSession]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentSession = sessionRef.current;
      if (!currentSession || !['running', 'paused'].includes(currentSession.status)) {
        return;
      }

      emitTransition('session_abandoned', currentSession, {
        abandonedWhile: currentSession.status,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [emitTransition]);

  return {
    session,
    status,
    phase,
    isRunning: status === 'running',
    isPaused: status === 'paused',
    isIdle: status === 'idle',
    hasSession: Boolean(session),
    elapsedFocusMs: metrics.elapsedFocusMs,
    elapsedPhaseMs: metrics.elapsedPhaseMs,
    remainingPhaseMs: metrics.remainingPhaseMs,
    plannedDurationMs: metrics.plannedDurationMs,
    progressPercent: metrics.progressPercent,
    completedFocusCycles: session?.completedFocusCycles ?? 0,
    start,
    pause,
    resume,
    complete,
    cancel,
    clear,
    switchPhase,
    syncMetadata,
  };
}
