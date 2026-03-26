import { useCallback, useEffect, useMemo } from 'react';
import type { UserData } from '../types';
import { useLocalStorage } from './useLocalStorage';
import type { MentorMemory, MentorOutput, MentorTrigger } from '../types/mentor';
import {
  applyMentorBriefingToMemory,
  buildMentorMemoryRuntime,
  getMentorMemoryStorageKey,
  isMentorMemoryEqual,
  markMentorActionFollowed,
} from '../services/mentorMemory.service';

interface UseMentorMemoryInput {
  userKey: string;
  userData: UserData;
  weeklyGoalMinutes: number;
  daysToExam: number;
  trigger: MentorTrigger;
}

export const useMentorMemory = ({
  userKey,
  userData,
  weeklyGoalMinutes,
  daysToExam,
  trigger,
}: UseMentorMemoryInput) => {
  const storageKey = useMemo(() => getMentorMemoryStorageKey(userKey), [userKey]);
  const [memory, setMemory] = useLocalStorage<MentorMemory | null>(storageKey, null);

  const runtime = useMemo(
    () =>
      buildMentorMemoryRuntime({
        userData,
        weeklyGoalMinutes,
        daysToExam,
        trigger,
        previousMemory: memory,
      }),
    [daysToExam, memory, trigger, userData, weeklyGoalMinutes],
  );

  useEffect(() => {
    setMemory((previousMemory) => {
      if (isMentorMemoryEqual(previousMemory, runtime.memory)) {
        return previousMemory || runtime.memory;
      }

      return runtime.memory;
    });
  }, [runtime.memory, setMemory]);

  const saveBriefing = useCallback(
    (briefing: MentorOutput, source: 'llm' | 'fallback') => {
      setMemory((previousMemory) =>
        applyMentorBriefingToMemory(previousMemory || runtime.memory, briefing, source),
      );
    },
    [runtime.memory, setMemory],
  );

  const rememberFollowedAction = useCallback(
    (action: string) => {
      setMemory((previousMemory) =>
        markMentorActionFollowed(previousMemory || runtime.memory, action),
      );
    },
    [runtime.memory, setMemory],
  );

  return {
    memory: memory || runtime.memory,
    runtime,
    saveBriefing,
    rememberFollowedAction,
  };
};
