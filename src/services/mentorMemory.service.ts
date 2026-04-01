import type { UserData } from '../types';
import { buildAchievementContextFromStorage } from './achievementProgress.service';
import { normalizeSubjectLabel } from '../utils/uiLabels';
import { stripInternalSubjectMetadata } from '../utils/sanitizeSubject';
import type {
  MentorMemoryFactEntry,
  MentorMemory,
  MentorMemoryRuntime,
  MentorOutput,
  MentorRiskState,
  MentorTrigger,
} from '../types/mentor';
import type { MentorMemoryWriteBack } from '../features/mentor/contracts';

const STORAGE_PREFIX = 'mdz_mentor_memory_';
export const MENTOR_MEMORY_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const FOCUS_PROGRESS_SHIFT_MINUTES = 20;
const MIN_PROGRESS_DELTA_FOR_REFRESH = 5;

const DEFAULT_FOCUS = 'Redacao';
const DEFAULT_SECONDARY_FOCUS = 'Matematica';
const DEFAULT_STRONG_AREA = 'Natureza';

const getSessions = (userData: UserData) =>
  (userData.sessions?.length ? userData.sessions : userData.studyHistory || []);

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

const sanitizeMemoryText = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const sanitized = collapseWhitespace(stripInternalSubjectMetadata(value));
  return sanitized || fallback;
};

const sanitizeMentorRisk = (value: MentorRiskState | null | undefined): MentorRiskState | null => {
  if (!value) {
    return null;
  }

  const level = value.level === 'critical' || value.level === 'high' || value.level === 'medium' || value.level === 'low'
    ? value.level
    : 'medium';

  const label = sanitizeMemoryText(value.label);
  const summary = sanitizeMemoryText(value.summary);

  if (!label || !summary) {
    return null;
  }

  return {
    level,
    label,
    summary,
  };
};

const sanitizeMentorFacts = (value: MentorMemoryFactEntry[] | null | undefined): MentorMemoryFactEntry[] =>
  (Array.isArray(value) ? value : [])
    .map((fact) => {
      const source: MentorMemoryFactEntry['source'] =
        fact?.source === 'user' || fact?.source === 'mentor' ? fact.source : 'system';

      return {
        key: sanitizeMemoryText(fact?.key),
        value: sanitizeMemoryText(fact?.value),
        source,
        recordedAt: fact?.recordedAt || new Date().toISOString(),
        expiresAt: fact?.expiresAt,
      };
    })
    .filter((fact) => fact.key && fact.value)
    .filter((fact, index, allFacts) => (
      allFacts.findIndex((entry) => entry.key === fact.key && entry.value === fact.value) === index
    ))
    .slice(-12);

const sanitizeMentorSubjectMinutes = (value: Record<string, number> | null | undefined): Record<string, number> =>
  Object.entries(value || {}).reduce<Record<string, number>>((acc, [subject, minutes]) => {
    const safeSubject = normalizeSubjectLabel(subject, 'Outra');
    const safeMinutes = Number(minutes || 0);
    if (safeMinutes <= 0) {
      return acc;
    }

    acc[safeSubject] = (acc[safeSubject] || 0) + safeMinutes;
    return acc;
  }, {});

const sanitizeMentorBriefing = (
  briefing: MentorOutput | null | undefined,
  fallbackFocus: string,
): MentorOutput | null => {
  if (!briefing) {
    return null;
  }

  const prioridade = normalizeSubjectLabel(briefing.prioridade, fallbackFocus);
  const justificativa = sanitizeMemoryText(
    briefing.justificativa,
    `Baixa recorrencia recente em ${prioridade}.`,
  );
  const acao_semana = (briefing.acao_semana || [])
    .map((action) => sanitizeMemoryText(action))
    .filter(Boolean)
    .slice(0, 4);

  return {
    ...briefing,
    prioridade,
    justificativa,
    acao_semana,
    mensagem_motivacional: sanitizeMemoryText(
      briefing.mensagem_motivacional,
      'Consistencia curta ainda vence intensidade isolada.',
    ),
  };
};

const sanitizeMentorMemory = (value: MentorMemory | null | undefined): MentorMemory | null => {
  if (!value || typeof value !== 'object' || value.version !== 1) {
    return null;
  }

  const lastFocus = normalizeSubjectLabel(value.lastFocus, DEFAULT_FOCUS);
  const previousFocus = value.previousFocus
    ? normalizeSubjectLabel(value.previousFocus, lastFocus)
    : null;
  const strongArea = normalizeSubjectLabel(value.strongArea, DEFAULT_STRONG_AREA);
  const weakAreas = (value.weakAreas || [])
    .map((area) => normalizeSubjectLabel(area, 'Outra'))
    .filter((area, index, allAreas) => area && allAreas.indexOf(area) === index)
    .slice(0, 4);

  return {
    ...value,
    lastFocus,
    previousFocus,
    focusShiftReason: value.focusShiftReason
      ? sanitizeMemoryText(value.focusShiftReason, `Baixa recorrencia recente em ${lastFocus}.`)
      : null,
    weakAreas: weakAreas.length > 0 ? weakAreas : [lastFocus],
    strongArea,
    lastRecommendations: (value.lastRecommendations || [])
      .map((recommendation) => sanitizeMemoryText(recommendation))
      .filter(Boolean)
      .slice(0, 6),
    lastBriefing: sanitizeMentorBriefing(value.lastBriefing, lastFocus),
    lastActionFollowed: value.lastActionFollowed ? sanitizeMemoryText(value.lastActionFollowed) : null,
    subjectMinutes: sanitizeMentorSubjectMinutes(value.subjectMinutes),
    lastDecisionSummary: value.lastDecisionSummary ? sanitizeMemoryText(value.lastDecisionSummary) : null,
    currentRisk: sanitizeMentorRisk(value.currentRisk),
    facts: sanitizeMentorFacts(value.facts),
  };
};

export const getMentorMemoryStorageKey = (userKey: string) =>
  `${STORAGE_PREFIX}${(userKey || 'default').toLowerCase()}`;

export const buildMentorSubjectMinutes = (userData: UserData): Record<string, number> =>
  getSessions(userData).reduce<Record<string, number>>((acc, session) => {
    const key = normalizeSubjectLabel(String(session.subject || ''), 'Outra');
    const minutes = Number(session.minutes || session.duration || 0);
    if (minutes <= 0) {
      return acc;
    }

    acc[key] = (acc[key] || 0) + minutes;
    return acc;
  }, {});

const getSortedAreas = (subjectMinutes: Record<string, number>) =>
  Object.entries(subjectMinutes).sort(([, left], [, right]) => left - right);

const safeMemory = (value: MentorMemory | null | undefined): MentorMemory | null => {
  return sanitizeMentorMemory(value);
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
  now,
}: {
  userData: UserData;
  weeklyGoalMinutes: number;
  daysToExam: number;
  trigger: MentorTrigger;
  previousMemory?: MentorMemory | null;
  now?: Date;
}): MentorMemoryRuntime => {
  const safePreviousMemory = sanitizeMentorMemory(previousMemory || null);
  const nowMs = Date.now();
  const mentorContext = buildAchievementContextFromStorage(userData, { weeklyGoalMinutes, now });
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
  const hasMeaningfulChange = hasRelevantContextChange(safePreviousMemory || null, {
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
    previousMemory: safePreviousMemory || null,
    rawWeakAreas,
    strongArea,
    subjectMinutes,
    hasMeaningfulChange,
  });
  const shouldInvalidateBriefing = Boolean(safePreviousMemory && hasMeaningfulChange);

  const memory: MentorMemory = {
    version: 1,
    lastAnalysisAt: safePreviousMemory?.lastAnalysisAt || 0,
    lastUpdatedAt: safePreviousMemory && !hasMeaningfulChange ? safePreviousMemory.lastUpdatedAt : nowMs,
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
    lastRecommendations: shouldInvalidateBriefing ? [] : safePreviousMemory?.lastRecommendations || [],
    lastBriefing: shouldInvalidateBriefing ? null : safePreviousMemory?.lastBriefing || null,
    lastBriefingSource: shouldInvalidateBriefing ? null : safePreviousMemory?.lastBriefingSource || null,
    lastActionFollowed: safePreviousMemory?.lastActionFollowed || null,
    lastActionFollowedAt: safePreviousMemory?.lastActionFollowedAt || null,
    subjectMinutes,
    lastDecisionSummary: safePreviousMemory?.lastDecisionSummary || null,
    currentRisk: safePreviousMemory?.currentRisk || null,
    facts: safePreviousMemory?.facts || [],
  };

  const shouldRefreshBriefing =
    !memory.lastBriefing
    || memory.lastAnalysisAt <= 0
    || nowMs - memory.lastAnalysisAt >= MENTOR_MEMORY_COOLDOWN_MS
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
): MentorMemory => {
  const safeCurrentMemory = sanitizeMentorMemory(memory) || memory;
  const safeBriefing = sanitizeMentorBriefing(briefing, safeCurrentMemory.lastFocus) || {
    ...briefing,
    prioridade: safeCurrentMemory.lastFocus,
    justificativa: `Baixa recorrencia recente em ${safeCurrentMemory.lastFocus}.`,
    acao_semana: [],
    mensagem_motivacional: 'Consistencia curta ainda vence intensidade isolada.',
  };

  return {
    ...safeCurrentMemory,
    lastAnalysisAt: Date.now(),
    lastUpdatedAt: Date.now(),
    lastBriefing: safeBriefing,
    lastBriefingSource: source,
    lastRecommendations: safeBriefing.acao_semana,
  };
};

export const markMentorActionFollowed = (memory: MentorMemory, action: string): MentorMemory => {
  const safeCurrentMemory = sanitizeMentorMemory(memory) || memory;
  return {
    ...safeCurrentMemory,
    lastActionFollowed: sanitizeMemoryText(action),
    lastActionFollowedAt: Date.now(),
    lastUpdatedAt: Date.now(),
  };
};

const mergeFacts = (
  currentFacts: MentorMemoryFactEntry[] | null | undefined,
  nextFacts: MentorMemoryFactEntry[] | null | undefined,
): MentorMemoryFactEntry[] => {
  const merged = [...sanitizeMentorFacts(currentFacts), ...sanitizeMentorFacts(nextFacts)];

  return merged
    .reduce<MentorMemoryFactEntry[]>((acc, fact) => {
      const existingIndex = acc.findIndex((entry) => entry.key === fact.key);
      if (existingIndex >= 0) {
        acc[existingIndex] = fact;
        return acc;
      }

      acc.push(fact);
      return acc;
    }, [])
    .slice(-12);
};

export const applyMentorWriteBackToMemory = (
  memory: MentorMemory,
  writeBack: MentorMemoryWriteBack,
): MentorMemory => {
  const safeCurrentMemory = sanitizeMentorMemory(memory) || memory;
  const lastRecommendation = sanitizeMemoryText(writeBack.lastRecommendation);
  const lastDifficultyReport = sanitizeMemoryText(writeBack.lastDifficultyReport);
  const currentRisk = sanitizeMentorRisk(writeBack.currentRisk || null);
  const facts = mergeFacts(
    safeCurrentMemory.facts,
    writeBack.factsToUpsert.map((fact) => ({
      key: sanitizeMemoryText(fact.key),
      value: sanitizeMemoryText(fact.value),
      source: fact.source,
      recordedAt: fact.recordedAt,
      expiresAt: fact.expiresAt,
    })),
  );

  return {
    ...safeCurrentMemory,
    lastFocus: sanitizeMemoryText(writeBack.focusOfWeek, safeCurrentMemory.lastFocus),
    focusShiftReason: lastDifficultyReport || safeCurrentMemory.focusShiftReason,
    lastRecommendations: lastRecommendation
      ? [lastRecommendation, ...safeCurrentMemory.lastRecommendations.filter((item) => item !== lastRecommendation)].slice(0, 6)
      : safeCurrentMemory.lastRecommendations,
    lastDecisionSummary: lastDifficultyReport || safeCurrentMemory.lastDecisionSummary || null,
    currentRisk: currentRisk || safeCurrentMemory.currentRisk || null,
    facts,
    lastUpdatedAt: Date.now(),
  };
};

export const isMentorMemoryEqual = (
  left: MentorMemory | null | undefined,
  right: MentorMemory | null | undefined,
) => JSON.stringify(left || null) === JSON.stringify(right || null);
