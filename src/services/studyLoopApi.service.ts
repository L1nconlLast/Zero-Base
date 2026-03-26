import {
  isMvpEmptyStateError as isStudyLoopEmptyStateError,
  MvpApiError as StudyLoopApiError,
  mvpApiService,
  requestMvpWithAuth as requestStudyLoopWithAuth,
  type MvpHomePayload as StudyLoopHomePayload,
  type MvpOnboardingResponse as StudyLoopOnboardingResponse,
  type MvpProfile as StudyLoopProfile,
  type MvpRecommendation as StudyLoopRecommendation,
} from './mvpApi.service';
import {
  mvpStudySessionsService,
  type StudySession as OfficialStudySession,
  type StudySessionAnswer as OfficialStudySessionAnswer,
  type StudySessionFocusOverride,
  type StudySessionQuestion as OfficialStudySessionQuestion,
  type StudySessionQuestionOption as OfficialStudySessionQuestionOption,
  type StudySessionResult as OfficialStudySessionResult,
} from './mvpStudySessions.service';

export {
  isStudyLoopEmptyStateError,
  StudyLoopApiError,
  requestStudyLoopWithAuth,
  type OfficialStudySession,
  type OfficialStudySessionAnswer,
  type StudySessionFocusOverride,
  type OfficialStudySessionQuestion,
  type OfficialStudySessionQuestionOption,
  type OfficialStudySessionResult,
  type StudyLoopHomePayload,
  type StudyLoopOnboardingResponse,
  type StudyLoopProfile,
  type StudyLoopRecommendation,
};

export const STUDY_LOOP_EDGE_FLAGS_STORAGE_KEY = 'zb_study_loop_edge_flags';

export type StudyLoopCurrentRecommendationResponse = {
  success: true;
  recommendation: StudyLoopRecommendation | null;
};

type StudyLoopEdgeFlags = {
  forceRecommendationEmpty: boolean;
  forceHomeError: boolean;
  forceRecommendationError: boolean;
  forceStartError: boolean;
};

const DEFAULT_EDGE_FLAGS: StudyLoopEdgeFlags = {
  forceRecommendationEmpty: false,
  forceHomeError: false,
  forceRecommendationError: false,
  forceStartError: false,
};

const normalizeBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  return false;
};

const isStudyLoopEdgeModeEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

const getStudyLoopEdgeFlags = (): StudyLoopEdgeFlags => {
  if (!isStudyLoopEdgeModeEnabled()) {
    return DEFAULT_EDGE_FLAGS;
  }

  let persistedFlags: Partial<StudyLoopEdgeFlags> = {};
  try {
    const raw = window.localStorage.getItem(STUDY_LOOP_EDGE_FLAGS_STORAGE_KEY);
    if (raw) {
      persistedFlags = JSON.parse(raw) as Partial<StudyLoopEdgeFlags>;
    }
  } catch {
    persistedFlags = {};
  }

  const params = new URLSearchParams(window.location.search);
  return {
    forceRecommendationEmpty:
      normalizeBoolean(persistedFlags.forceRecommendationEmpty)
      || normalizeBoolean(params.get('__studyLoopForceRecommendationEmpty')),
    forceHomeError:
      normalizeBoolean(persistedFlags.forceHomeError)
      || normalizeBoolean(params.get('__studyLoopForceHomeError')),
    forceRecommendationError:
      normalizeBoolean(persistedFlags.forceRecommendationError)
      || normalizeBoolean(params.get('__studyLoopForceRecommendationError')),
    forceStartError:
      normalizeBoolean(persistedFlags.forceStartError)
      || normalizeBoolean(params.get('__studyLoopForceStartError')),
  };
};

const maybeThrowForcedStudyLoopError = (
  condition: boolean,
  message: string,
  code: string,
) => {
  if (!condition) {
    return;
  }

  throw new StudyLoopApiError(message, 500, code);
};

export const studyLoopApiService = {
  async getMe() {
    return mvpApiService.getMe();
  },

  async getOnboarding() {
    return mvpApiService.getOnboarding();
  },

  async saveOnboarding(payload: StudyLoopProfile) {
    return mvpApiService.saveOnboarding(payload);
  },

  async getOnboardingStreak() {
    return mvpApiService.getOnboardingStreak();
  },

  async saveOnboardingStreak(payload: StudyLoopOnboardingResponse['streak']) {
    return mvpApiService.saveOnboardingStreak(payload);
  },

  async getCurrentRecommendation(): Promise<StudyLoopCurrentRecommendationResponse> {
    const flags = getStudyLoopEdgeFlags();
    maybeThrowForcedStudyLoopError(
      flags.forceRecommendationError,
      'Falha forcada ao carregar a recomendacao oficial.',
      'FORCED_RECOMMENDATION_ERROR',
    );

    if (flags.forceRecommendationEmpty) {
      return {
        success: true,
        recommendation: null,
      };
    }

    return mvpApiService.getCurrentRecommendation();
  },

  async getHome(): Promise<StudyLoopHomePayload & { success: true }> {
    const flags = getStudyLoopEdgeFlags();
    maybeThrowForcedStudyLoopError(
      flags.forceHomeError,
      'Falha forcada ao carregar a home oficial.',
      'FORCED_HOME_ERROR',
    );

    return mvpApiService.getHome();
  },
};

export const studyLoopSessionsService = {
  async createSession(limit = 5, focusOverride?: StudySessionFocusOverride): Promise<OfficialStudySession> {
    const flags = getStudyLoopEdgeFlags();
    maybeThrowForcedStudyLoopError(
      flags.forceStartError,
      'Falha forcada ao iniciar a sessao oficial.',
      'FORCED_START_ERROR',
    );

    return mvpStudySessionsService.createSession(limit, focusOverride);
  },

  async getSession(sessionId: string): Promise<OfficialStudySession> {
    return mvpStudySessionsService.getSession(sessionId);
  },

  async answerQuestion(
    sessionId: string,
    payload: {
      questionId: string;
      alternativeId: string;
      responseTimeSeconds?: number;
    },
  ): Promise<OfficialStudySession> {
    return mvpStudySessionsService.answerQuestion(sessionId, payload);
  },

  async finishSession(sessionId: string): Promise<OfficialStudySessionResult> {
    return mvpStudySessionsService.finishSession(sessionId);
  },
};
