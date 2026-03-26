import { requestMvpWithAuth } from './mvpApi.service';

export interface StudySessionQuestionOption {
  id: string;
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

export interface StudySessionQuestion {
  id: string;
  prompt: string;
  difficulty: 'facil' | 'medio' | 'dificil';
  explanation: string | null;
  subject: string;
  topic: string;
  options: StudySessionQuestionOption[];
}

export interface StudySessionAnswer {
  alternativeId: string;
  letter: string;
  isCorrect: boolean;
  answeredAt: string;
  responseTimeSeconds: number;
}

export interface StudySession {
  sessionId: string;
  status: 'active' | 'completed';
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  subject: string;
  topic: string;
  reason: string;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number;
  questions: StudySessionQuestion[];
  answers: Record<string, StudySessionAnswer>;
  result: {
    total: number;
    correct: number;
    accuracy: number;
  } | null;
}

export interface StudySessionResult {
  sessionId: string;
  total: number;
  correct: number;
  accuracy: number;
  durationSeconds: number;
}

export interface StudySessionFocusOverride {
  subject: string;
  topic?: string | null;
  reason?: string | null;
}

const normalizeSessionStatus = (
  session: Partial<StudySession> & {
    finishedAt?: string | null;
    result?: StudySession['result'];
    status?: StudySession['status'] | string | null;
  },
): StudySession['status'] => {
  if (session.status === 'completed') {
    return 'completed';
  }

  if (session.finishedAt || session.result) {
    return 'completed';
  }

  return 'active';
};

const normalizeStudySession = (session: StudySession): StudySession => ({
  ...session,
  status: normalizeSessionStatus(session),
  answeredQuestions: Number.isFinite(session.answeredQuestions)
    ? session.answeredQuestions
    : Object.keys(session.answers || {}).length,
  totalQuestions: Number.isFinite(session.totalQuestions)
    ? session.totalQuestions
    : Array.isArray(session.questions)
      ? session.questions.length
      : 0,
});

export const mvpStudySessionsService = {
  async createSession(limit = 5, focusOverride?: StudySessionFocusOverride): Promise<StudySession> {
    const response = await requestMvpWithAuth<{ success: true; session: StudySession }>('/api/study-sessions', {
      method: 'POST',
      body: JSON.stringify({
        limit,
        ...(focusOverride ? { focusOverride } : {}),
      }),
    });

    return normalizeStudySession(response.session);
  },

  async getSession(sessionId: string): Promise<StudySession> {
    const response = await requestMvpWithAuth<{ success: true; session: StudySession }>(
      `/api/study-sessions/${sessionId}`,
    );

    return normalizeStudySession(response.session);
  },

  async answerQuestion(
    sessionId: string,
    payload: {
      questionId: string;
      alternativeId: string;
      responseTimeSeconds?: number;
    },
  ): Promise<StudySession> {
    const response = await requestMvpWithAuth<{ success: true; session: StudySession }>(
      `/api/study-sessions/${sessionId}/answer`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );

    return normalizeStudySession(response.session);
  },

  async finishSession(sessionId: string): Promise<StudySessionResult> {
    return requestMvpWithAuth<StudySessionResult & { success: true }>(
      `/api/study-sessions/${sessionId}/finish`,
      {
        method: 'POST',
      },
    );
  },
};
