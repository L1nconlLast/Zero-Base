import { supabase } from './supabase.client';

export interface MvpProfile {
  examType: 'enem';
  level: 'iniciante' | 'intermediario' | 'avancado';
  weeklyHours: number;
  preferredGoal: string | null;
  weakestDisciplines: string[];
}

export interface MvpRecommendation {
  id: string;
  disciplineSlug: string;
  disciplineName: string;
  topicSlug: string;
  topicName: string;
  reason: string;
  score: number;
  generatedAt?: string;
  decisionType?: string | null;
  decisionContext?: Record<string, unknown> | null;
  sourceSessionId?: string | null;
}

export interface MvpHomePayload {
  user: {
    id: string;
    name: string;
    email: string;
  };
  mission: {
    discipline: string;
    topic: string;
    reason: string;
    ctaLabel: string;
  };
  decision: {
    currentWeakPoint: string;
    nextFocus: string;
  };
  weeklyProgress: {
    studyMinutes: number;
    sessionsCompleted: number;
    goalMinutes: number;
  };
  gamification: {
    xp: number;
    level: number;
    streakDays: number;
  };
  lastSession: {
    discipline: string;
    accuracy: number;
    completedAt: string;
  } | null;
  activeStudySession: {
    sessionId: string;
    answeredQuestions: number;
    totalQuestions: number;
  } | null;
}

export interface MvpOnboardingStreak {
  days: number;
  lastDay: string | null;
}

export interface MvpOnboardingResponse {
  success: true;
  profile: MvpProfile | null;
  streak: MvpOnboardingStreak;
}

const getAccessToken = async (): Promise<string> => {
  const accessToken = (await supabase?.auth.getSession())?.data.session?.access_token;
  if (!accessToken) {
    throw new Error('Sessao nao encontrada. Faca login novamente.');
  }

  return accessToken;
};

const extractErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const payload = await response.json() as { error?: { message?: string } };
    return payload.error?.message || fallback;
  } catch {
    return fallback;
  }
};

export const requestMvpWithAuth = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const accessToken = await getAccessToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Erro ao carregar dados do MVP.'));
  }

  return response.json() as Promise<T>;
};

export const mvpApiService = {
  async getMe(): Promise<{
    success: true;
    user: { id: string; name: string; email: string };
    onboardingCompleted: boolean;
    profile: MvpProfile | null;
  }> {
    return requestMvpWithAuth('/api/me');
  },

  async getOnboarding(): Promise<MvpOnboardingResponse> {
    return requestMvpWithAuth('/api/onboarding');
  },

  async saveOnboarding(payload: MvpProfile): Promise<{
    success: true;
    profile: MvpProfile;
    streak: MvpOnboardingStreak;
    initialRecommendation: MvpRecommendation;
  }> {
    return requestMvpWithAuth('/api/onboarding', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getOnboardingStreak(): Promise<MvpOnboardingStreak> {
    const response = await requestMvpWithAuth<MvpOnboardingResponse>('/api/onboarding');
    return response.streak;
  },

  async saveOnboardingStreak(payload: MvpOnboardingStreak): Promise<MvpOnboardingStreak> {
    const response = await requestMvpWithAuth<MvpOnboardingResponse>('/api/onboarding', {
      method: 'POST',
      body: JSON.stringify({
        streakDays: payload.days,
        streakLastDay: payload.lastDay,
      }),
    });

    return response.streak;
  },

  async getCurrentRecommendation(): Promise<{ success: true; recommendation: MvpRecommendation }> {
    return requestMvpWithAuth('/api/recommendations/current');
  },

  async getHome(): Promise<MvpHomePayload & { success: true }> {
    return requestMvpWithAuth('/api/home');
  },
};
