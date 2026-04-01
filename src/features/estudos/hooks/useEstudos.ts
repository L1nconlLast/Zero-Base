import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  normalizeBlockLabel,
  normalizePresentationLabel,
} from '../../../utils/uiLabels';
import { finalizeStudySessionAdapter } from '../adapters/estudosAdapter';
import type {
  EstudosPageProps,
  FinishInputs,
  FinishPayload,
  StudyMode,
  StudySession,
} from '../types';

interface UseEstudosParams {
  currentBlockLabel: EstudosPageProps['currentBlockLabel'];
  currentBlockObjective: EstudosPageProps['currentBlockObjective'];
  currentBlockDurationMinutes: EstudosPageProps['currentBlockDurationMinutes'];
  currentMode: EstudosPageProps['currentMode'];
  weeklyGoalMinutes: EstudosPageProps['weeklyGoalMinutes'];
  currentTargetQuestions: EstudosPageProps['currentTargetQuestions'];
  isBlocked: EstudosPageProps['isBlocked'];
  showQuestionTransitionState: EstudosPageProps['showQuestionTransitionState'];
  showPostFocusState: EstudosPageProps['showPostFocusState'];
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const resolveMode = (mode: UseEstudosParams['currentMode']): StudyMode => {
  if (mode === 'pomodoro') return 'pomodoro';
  return 'livre';
};

// legado: foco -> novo: estudos
export function useEstudos({
  currentBlockLabel,
  currentBlockObjective,
  currentBlockDurationMinutes,
  currentMode,
  weeklyGoalMinutes,
  currentTargetQuestions,
  isBlocked,
  showQuestionTransitionState,
  showPostFocusState,
}: UseEstudosParams) {
  const safeSubject = useMemo(
    () => normalizeBlockLabel(currentBlockLabel),
    [currentBlockLabel],
  );
  const safeTopic = useMemo(
    () => normalizePresentationLabel(currentBlockObjective || 'Bloco oficial do dia', 'Bloco oficial do dia'),
    [currentBlockObjective],
  );
  const safeMode = useMemo(
    () => resolveMode(currentMode),
    [currentMode],
  );
  const safeInitialSeconds = useMemo(
    () => Math.max(0, Math.round(currentBlockDurationMinutes * 60)),
    [currentBlockDurationMinutes],
  );
  const safeProgress = useMemo(
    () => clamp(Math.round((currentTargetQuestions / Math.max(weeklyGoalMinutes / 30, 1)) * 10), 0, 100),
    [currentTargetQuestions, weeklyGoalMinutes],
  );

  const [session, setSession] = useState<StudySession>({
    subject: safeSubject,
    topic: safeTopic,
    remainingSeconds: safeInitialSeconds,
    initialSeconds: safeInitialSeconds,
    mode: safeMode,
    progress: safeProgress,
  });
  const [isRunning, setIsRunning] = useState(!isBlocked && !showQuestionTransitionState && !showPostFocusState);
  const [isFinishing, setIsFinishing] = useState(false);
  const [inputs, setInputs] = useState<FinishInputs>({
    pages: 0,
    lessons: 0,
    notes: '',
    difficulty: 3 as 1 | 2 | 3 | 4 | 5,
  });

  useEffect(() => {
    setSession((previous) => {
      const shouldReset =
        previous.subject !== safeSubject
        || previous.topic !== safeTopic
        || previous.mode !== safeMode
        || previous.initialSeconds !== safeInitialSeconds;

      if (!shouldReset) {
        if (previous.progress === safeProgress) {
          return previous;
        }

        return {
          ...previous,
          progress: safeProgress,
        };
      }

      return {
        subject: safeSubject,
        topic: safeTopic,
        remainingSeconds: safeInitialSeconds,
        initialSeconds: safeInitialSeconds,
        mode: safeMode,
        progress: safeProgress,
      };
    });
  }, [safeInitialSeconds, safeMode, safeProgress, safeSubject, safeTopic]);

  useEffect(() => {
    if (isBlocked || showQuestionTransitionState || showPostFocusState) {
      setIsRunning(false);
    }
  }, [isBlocked, showPostFocusState, showQuestionTransitionState]);

  const updateInputs = useCallback((partial: Partial<FinishInputs>) => {
    setInputs((previous) => ({ ...previous, ...partial }));
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    if (!isBlocked && !showQuestionTransitionState && !showPostFocusState) {
      setIsRunning(true);
    }
  }, [isBlocked, showPostFocusState, showQuestionTransitionState]);

  const finish = useCallback(async (payload?: Partial<FinishPayload>) => {
    if (isFinishing) {
      return null;
    }

    setIsFinishing(true);

    try {
      const finalPayload: FinishPayload = {
        ...inputs,
        ...payload,
        actualDurationSeconds: Math.max(0, session.initialSeconds - session.remainingSeconds),
      };

      const result = await finalizeStudySessionAdapter(finalPayload, {
        subject: session.subject,
        topic: session.topic,
      });

      return result;
    } finally {
      setIsFinishing(false);
    }
  }, [inputs, isFinishing, session.initialSeconds, session.remainingSeconds, session.subject, session.topic]);

  return {
    session,
    setSession,
    isRunning,
    isFinishing,
    pause,
    resume,
    inputs,
    updateInputs,
    finish,
  };
}

export default useEstudos;
