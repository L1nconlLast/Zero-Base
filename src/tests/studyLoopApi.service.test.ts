import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  MockMvpApiError,
  getMeMock,
  getOnboardingMock,
  saveOnboardingMock,
  getOnboardingStreakMock,
  saveOnboardingStreakMock,
  getCurrentRecommendationMock,
  getHomeMock,
  createSessionMock,
  getSessionMock,
  answerQuestionMock,
  finishSessionMock,
} = vi.hoisted(() => {
  class HoistedMockMvpApiError extends Error {
    status: number;
    code: string | null;

    constructor(message: string, status: number, code: string | null = null) {
      super(message);
      this.name = 'MvpApiError';
      this.status = status;
      this.code = code;
    }
  }

  return {
    MockMvpApiError: HoistedMockMvpApiError,
    getMeMock: vi.fn(),
    getOnboardingMock: vi.fn(),
    saveOnboardingMock: vi.fn(),
    getOnboardingStreakMock: vi.fn(),
    saveOnboardingStreakMock: vi.fn(),
    getCurrentRecommendationMock: vi.fn(),
    getHomeMock: vi.fn(),
    createSessionMock: vi.fn(),
    getSessionMock: vi.fn(),
    answerQuestionMock: vi.fn(),
    finishSessionMock: vi.fn(),
  };
});

vi.mock('../services/mvpApi.service', () => ({
  isMvpEmptyStateError: (error: unknown) =>
    error instanceof MockMvpApiError
    && (error.code === 'PROFILE_NOT_FOUND' || error.code === 'RECOMMENDATION_NOT_FOUND'),
  MvpApiError: MockMvpApiError,
  mvpApiService: {
    getMe: getMeMock,
    getOnboarding: getOnboardingMock,
    saveOnboarding: saveOnboardingMock,
    getOnboardingStreak: getOnboardingStreakMock,
    saveOnboardingStreak: saveOnboardingStreakMock,
    getCurrentRecommendation: getCurrentRecommendationMock,
    getHome: getHomeMock,
  },
  requestMvpWithAuth: vi.fn(),
}));

vi.mock('../services/mvpStudySessions.service', () => ({
  mvpStudySessionsService: {
    createSession: createSessionMock,
    getSession: getSessionMock,
    answerQuestion: answerQuestionMock,
    finishSession: finishSessionMock,
  },
}));

import {
  STUDY_LOOP_EDGE_FLAGS_STORAGE_KEY,
  StudyLoopApiError,
  studyLoopApiService,
  studyLoopSessionsService,
} from '../services/studyLoopApi.service';

describe('studyLoopApi.service edge flags', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('retorna recommendation null quando forceRecommendationEmpty esta ativo', async () => {
    localStorage.setItem(
      STUDY_LOOP_EDGE_FLAGS_STORAGE_KEY,
      JSON.stringify({ forceRecommendationEmpty: true }),
    );

    const response = await studyLoopApiService.getCurrentRecommendation();

    expect(response).toEqual({
      success: true,
      recommendation: null,
    });
    expect(getCurrentRecommendationMock).not.toHaveBeenCalled();
  });

  it('lanca erro forcado na recomendacao quando forceRecommendationError esta ativo', async () => {
    localStorage.setItem(
      STUDY_LOOP_EDGE_FLAGS_STORAGE_KEY,
      JSON.stringify({ forceRecommendationError: true }),
    );

    await expect(studyLoopApiService.getCurrentRecommendation()).rejects.toMatchObject({
      message: 'Falha forcada ao carregar a recomendacao oficial.',
      status: 500,
      code: 'FORCED_RECOMMENDATION_ERROR',
    } satisfies Partial<InstanceType<typeof StudyLoopApiError>>);

    expect(getCurrentRecommendationMock).not.toHaveBeenCalled();
  });

  it('lanca erro forcado na home quando forceHomeError esta ativo', async () => {
    localStorage.setItem(
      STUDY_LOOP_EDGE_FLAGS_STORAGE_KEY,
      JSON.stringify({ forceHomeError: true }),
    );

    await expect(studyLoopApiService.getHome()).rejects.toMatchObject({
      message: 'Falha forcada ao carregar a home oficial.',
      status: 500,
      code: 'FORCED_HOME_ERROR',
    } satisfies Partial<InstanceType<typeof StudyLoopApiError>>);

    expect(getHomeMock).not.toHaveBeenCalled();
  });

  it('lanca erro forcado ao iniciar sessao quando forceStartError esta ativo', async () => {
    localStorage.setItem(
      STUDY_LOOP_EDGE_FLAGS_STORAGE_KEY,
      JSON.stringify({ forceStartError: true }),
    );

    await expect(studyLoopSessionsService.createSession(5)).rejects.toMatchObject({
      message: 'Falha forcada ao iniciar a sessao oficial.',
      status: 500,
      code: 'FORCED_START_ERROR',
    } satisfies Partial<InstanceType<typeof StudyLoopApiError>>);

    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it('delegates ao client real quando nenhuma flag esta ativa', async () => {
    getHomeMock.mockResolvedValue({
      success: true,
      user: { id: 'u1', name: 'QA', email: 'qa@zerobase.dev' },
      mission: {
        discipline: 'Matematica',
        topic: 'Porcentagem',
        reason: 'Foco atual',
        ctaLabel: 'Comecar agora',
      },
      decision: {
        currentWeakPoint: 'Matematica',
        nextFocus: 'Matematica - Porcentagem',
      },
      weeklyProgress: {
        studyMinutes: 0,
        sessionsCompleted: 0,
        goalMinutes: 360,
      },
      gamification: {
        xp: 0,
        level: 1,
        streakDays: 0,
      },
      lastSession: null,
      activeStudySession: null,
    });

    const response = await studyLoopApiService.getHome();

    expect(getHomeMock).toHaveBeenCalledTimes(1);
    expect(response.success).toBe(true);
    expect(response.mission.topic).toBe('Porcentagem');
  });
});
