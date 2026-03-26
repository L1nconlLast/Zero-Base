import type { UserData } from '../types';
import { buildAchievementContextFromStorage } from './achievementProgress.service';
import type {
  MentorMemory,
  MentorMemoryRuntime,
  MentorOutput,
  MentorTrigger,
} from '../types/mentor';

const STORAGE_PREFIX = 'mdz_mentor_memory_';
export const MENTOR_MEMORY_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const FOCUS_PROGRESS_SHIFT_MINUTES = 20;
const MIN_PROGRESS_DELTA_FOR_REFRESH = 5;

const DEFAULT_FOCUS = 'Redacao';
const DEFAULT_SECONDARY_FOCUS = 'Matematica';
const DEFAULT_STRONG_AREA = 'Natureza';

const getSessions = (userData: UserData) =>
  (userData.sessions?.length ? userData.sessions : userData.studyHistory || []);

export const getMentorMemoryStorageKey = (userKey: string) =>
  `${STORAGE_PREFIX}${(userKey || 'default').toLowerCase()}`;

export const buildMentorSubjectMinutes = (userData: UserData): Record<string, number> =>
  getSessions(userData).reduce<Record<string, number>>((acc, session) => {
    const key = session.subject || 'Outra';
    acc[key] = (acc[key] || 0) + session.minutes;
    return acc;
  }, {});

const getSortedAreas = (subjectMinutes: Record<string, number>) =>
  Object.entries(subjectMinutes).sort(([, left], [, right]) => left - right);

const safeMemory = (value: MentorMemory | null | undefined): MentorMemory | null => {
  if (!value || typeof value !== 'object') return null;
  if (value.version !== 1) return null;
  return value;
};

export const readMentorMemory = (userKey: string): MentorMemory | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(getMentorMemoryStorageKey(userKey));
    if (!raw) return null;
    return safeMemory(JSON.parse(raw) as MentorMemory);
  } catch {
    return null;
  }
};

const hasRelevantContextChange = (
  previousMemory: MentorMemory | null,
  {
    weeklyPct,
    weeklyMinutesDone,
    totalStudyMinutes,
    sessionsLast7Days,
    sessionCount,
    currentStreak,
    completedMockExams,
    rawWeakAreas,
    strongArea,
    daysToExam,
    trigger,
  }: {
    weeklyPct: number;
    weeklyMinutesDone: number;
    totalStudyMinutes: number;
    sessionsLast7Days: number;
    sessionCount: number;
    currentStreak: number;
    completedMockExams: number;
    rawWeakAreas: string[];
    strongArea: string;
    daysToExam: number;
    trigger: MentorTrigger;
  },
) => {
  if (!previousMemory) return true;

  return (
    previousMemory.sessionCount !== sessionCount
    || previousMemory.sessionsLast7Days !== sessionsLast7Days
    || previousMemory.completedMockExams !== completedMockExams
    || previousMemory.currentStreak !== currentStreak
    || previousMemory.daysToExam !== daysToExam
    || previousMemory.lastTrigger !== trigger
    || previousMemory.strongArea !== strongArea
    || previousMemory.weakAreas[0] !== rawWeakAreas[0]
    || previousMemory.weakAreas[1] !== rawWeakAreas[1]
    || Math.abs(previousMemory.weeklyProgressPct - weeklyPct) >= MIN_PROGRESS_DELTA_FOR_REFRESH
    || Math.abs(previousMemory.weeklyMinutesDone - weeklyMinutesDone) >= 20
    || Math.abs(previousMemory.totalStudyMinutes - totalStudyMinutes) >= 20
  );
};

const resolveRecommendedFocus = ({
  previousMemory,
  rawWeakAreas,
  strongArea,
  subjectMinutes,
  hasMeaningfulChange,
}: {
  previousMemory: MentorMemory | null;
  rawWeakAreas: string[];
  strongArea: string;
  subjectMinutes: Record<string, number>;
  hasMeaningfulChange: boolean;
}) => {
  const primaryWeak = rawWeakAreas[0] || DEFAULT_FOCUS;
  const secondaryWeak = rawWeakAreas[1] || DEFAULT_SECONDARY_FOCUS;

  if (!previousMemory) {
    return {
      recommendedFocus: primaryWeak,
      focusShiftReason: `Baixa recorrencia recente em ${primaryWeak}.`,
      previousFocus: null,
      secondaryFocus: secondaryWeak,
      strongArea,
    };
  }

  const previousFocusMinutes = previousMemory.subjectMinutes[previousMemory.lastFocus] || 0;
  const currentFocusMinutes = subjectMinutes[previousMemory.lastFocus] || 0;
  const progressedOnPreviousFocus =
    currentFocusMinutes >= previousFocusMinutes + FOCUS_PROGRESS_SHIFT_MINUTES;

  if (
    previousMemory.lastFocus === primaryWeak
    && hasMeaningfulChange
    && progressedOnPreviousFocus
    && secondaryWeak !== primaryWeak
  ) {
    return {
      recommendedFocus: secondaryWeak,
      focusShiftReason: `Boa evolucao em ${primaryWeak}. Agora vamos equilibrar com ${secondaryWeak}.`,
      previousFocus: previousMemory.lastFocus,
      secondaryFocus: primaryWeak,
      strongArea,
    };
  }

  if (!hasMeaningfulChange && Date.now() - previousMemory.lastAnalysisAt < MENTOR_MEMORY_COOLDOWN_MS) {
    return {
      recommendedFocus: previousMemory.lastFocus || primaryWeak,
      focusShiftReason:
        previousMemory.focusShiftReason
        || `Mantendo foco em ${previousMemory.lastFocus || primaryWeak} ate a proxima mudanca relevante.`,
      previousFocus: previousMemory.previousFocus,
      secondaryFocus: secondaryWeak,
      strongArea,
    };
  }

  if (previousMemory.lastFocus && previousMemory.lastFocus !== primaryWeak) {
    if (hasMeaningfulChange && progressedOnPreviousFocus) {
      return {
        recommendedFocus: primaryWeak,
        focusShiftReason: `Boa evolucao em ${previousMemory.lastFocus}. Agora vamos equilibrar com ${primaryWeak}.`,
        previousFocus: previousMemory.lastFocus,
        secondaryFocus: secondaryWeak,
        strongArea,
      };
    }

    return {
      recommendedFocus: primaryWeak,
      focusShiftReason: `${primaryWeak} voltou a pedir atencao sem perder o que voce ganhou em ${previousMemory.lastFocus}.`,
      previousFocus: previousMemory.lastFocus,
      secondaryFocus: secondaryWeak,
      strongArea,
    };
  }

  return {
    recommendedFocus: primaryWeak,
    focusShiftReason: `Baixa recorrencia recente em ${primaryWeak}.`,
    previousFocus: previousMemory.lastFocus !== primaryWeak ? previousMemory.lastFocus : previousMemory.previousFocus,
    secondaryFocus: secondaryWeak,
    strongArea,
  };
};

export const buildMentorMemoryRuntime = ({
  userData,
  weeklyGoalMinutes,
  daysToExam,
  trigger,
  previousMemory,
}: {
  userData: UserData;
  weeklyGoalMinutes: number;
  daysToExam: number;
  trigger: MentorTrigger;
  previousMemory?: MentorMemory | null;
}): MentorMemoryRuntime => {
  const now = Date.now();
  const mentorContext = buildAchievementContextFromStorage(userData, { weeklyGoalMinutes });
  const subjectMinutes = buildMentorSubjectMinutes(userData);
  const sortedAreas = getSortedAreas(subjectMinutes);
  const rawWeakAreas = [
    sortedAreas[0]?.[0] || DEFAULT_FOCUS,
    sortedAreas[1]?.[0] || DEFAULT_SECONDARY_FOCUS,
  ];
  const strongArea = sortedAreas[sortedAreas.length - 1]?.[0] || DEFAULT_STRONG_AREA;
  const weeklyMinutesDone = mentorContext.weeklyStudiedMinutes;
  const weeklyPct = Math.min(
    100,
    Math.round((weeklyMinutesDone / Math.max(weeklyGoalMinutes, 1)) * 100),
  );
  const hasMeaningfulChange = hasRelevantContextChange(previousMemory || null, {
    weeklyPct,
    weeklyMinutesDone,
    totalStudyMinutes: mentorContext.totalMinutes,
    sessionsLast7Days: mentorContext.studyDaysLast7,
    sessionCount: mentorContext.sessionCount,
    currentStreak: mentorContext.currentStreak,
    completedMockExams: mentorContext.completedMockExams,
    rawWeakAreas,
    strongArea,
    daysToExam,
    trigger,
  });

  const focusPlan = resolveRecommendedFocus({
    previousMemory: previousMemory || null,
    rawWeakAreas,
    strongArea,
    subjectMinutes,
    hasMeaningfulChange,
  });
  const shouldInvalidateBriefing = Boolean(previousMemory && hasMeaningfulChange);

  const memory: MentorMemory = {
    version: 1,
    lastAnalysisAt: previousMemory?.lastAnalysisAt || 0,
    lastUpdatedAt: previousMemory && !hasMeaningfulChange ? previousMemory.lastUpdatedAt : now,
    lastFocus: focusPlan.recommendedFocus,
    previousFocus: focusPlan.previousFocus,
    focusShiftReason: focusPlan.focusShiftReason,
    weakAreas: rawWeakAreas,
    strongArea: focusPlan.strongArea,
    weeklyGoalMinutes,
    weeklyMinutesDone,
    weeklyProgressPct: weeklyPct,
    totalStudyMinutes: mentorContext.totalMinutes,
    sessionsLast7Days: mentorContext.studyDaysLast7,
    sessionCount: mentorContext.sessionCount,
    currentStreak: mentorContext.currentStreak,
    completedMockExams: mentorContext.completedMockExams,
    daysToExam,
    lastTrigger: trigger,
    lastRecommendations: shouldInvalidateBriefing ? [] : previousMemory?.lastRecommendations || [],
    lastBriefing: shouldInvalidateBriefing ? null : previousMemory?.lastBriefing || null,
    lastBriefingSource: shouldInvalidateBriefing ? null : previousMemory?.lastBriefingSource || null,
    lastActionFollowed: previousMemory?.lastActionFollowed || null,
    lastActionFollowedAt: previousMemory?.lastActionFollowedAt || null,
    subjectMinutes,
  };

  const shouldRefreshBriefing =
    !memory.lastBriefing
    || memory.lastAnalysisAt <= 0
    || Date.now() - memory.lastAnalysisAt >= MENTOR_MEMORY_COOLDOWN_MS
    || hasMeaningfulChange;

  return {
    memory,
    recommendedFocus: focusPlan.recommendedFocus,
    secondaryFocus: focusPlan.secondaryFocus,
    strongArea: focusPlan.strongArea,
    focusShiftReason: focusPlan.focusShiftReason,
    weeklyPct,
    weeklyMinutesDone,
    totalStudyMinutes: mentorContext.totalMinutes,
    sessionsLast7Days: mentorContext.studyDaysLast7,
    currentStreak: mentorContext.currentStreak,
    completedMockExams: mentorContext.completedMockExams,
    hasMeaningfulChange,
    shouldRefreshBriefing,
  };
};

export const applyMentorBriefingToMemory = (
  memory: MentorMemory,
  briefing: MentorOutput,
  source: 'llm' | 'fallback',
): MentorMemory => ({
  ...memory,
  lastAnalysisAt: Date.now(),
  lastUpdatedAt: Date.now(),
  lastBriefing: briefing,
  lastBriefingSource: source,
  lastRecommendations: briefing.acao_semana,
});

export const markMentorActionFollowed = (memory: MentorMemory, action: string): MentorMemory => ({
  ...memory,
  lastActionFollowed: action,
  lastActionFollowedAt: Date.now(),
  lastUpdatedAt: Date.now(),
});

export const isMentorMemoryEqual = (
  left: MentorMemory | null | undefined,
  right: MentorMemory | null | undefined,
) => JSON.stringify(left || null) === JSON.stringify(right || null);
