import React from 'react';
import { CheckCircle2, Clock3, Loader2, PlayCircle } from 'lucide-react';
import type { StudySession } from '../../services/mvpStudySessions.service';

interface StudySessionPageProps {
  session: StudySession;
  answering: boolean;
  finishing: boolean;
  latestFeedback?: {
    tone: 'success' | 'warning';
    message: string;
    detail?: string;
  } | null;
  onAnswer: (questionId: string, alternativeId: string) => Promise<void>;
  onFinish: () => Promise<void>;
}

export const StudySessionPage: React.FC<StudySessionPageProps> = ({
  session,
  answering,
  finishing,
  latestFeedback = null,
  onAnswer,
  onFinish,
}) => {
  const unansweredQuestions = session.questions.filter((question) => !session.answers[question.id]);
  const currentQuestion = unansweredQuestions[0] || null;
  const allAnswered = unansweredQuestions.length === 0;
  const progress = session.totalQuestions > 0
    ? Math.round((session.answeredQuestions / session.totalQuestions) * 100)
    : 0;

  return (
    <div data-testid="study-session-page" className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Sessao oficial</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">{session.topic}</h1>
              <p className="mt-2 text-sm text-slate-600">{session.reason}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{session.answeredQuestions}/{session.totalQuestions}</p>
              <p>questoes respondidas</p>
            </div>
          </div>

          <div className="mt-5 h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-slate-900 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {!allAnswered && currentQuestion ? (
          <div data-testid="session-question-root" className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            {latestFeedback ? (
              <div
                data-testid="session-answer-feedback"
                className={`mb-5 rounded-2xl border px-4 py-3 ${
                  latestFeedback.tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                <p className="text-sm font-semibold">{latestFeedback.message}</p>
                {latestFeedback.detail ? (
                  <p className="mt-1 text-sm opacity-80">{latestFeedback.detail}</p>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <PlayCircle className="h-4 w-4" />
              Questao {session.answeredQuestions + 1} de {session.totalQuestions}
            </div>

            <h2 className="mt-4 text-2xl font-bold leading-tight">{currentQuestion.prompt}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {currentQuestion.subject} • {currentQuestion.topic} • {currentQuestion.difficulty}
            </p>

            <div className="mt-6 grid gap-3">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  data-testid="session-question-option"
                  type="button"
                  disabled={answering}
                  onClick={() => void onAnswer(currentQuestion.id, option.id)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="text-sm font-semibold text-slate-900">{option.letter}.</span>
                  <span className="ml-3 text-sm text-slate-700">{option.text}</span>
                </button>
              ))}
            </div>

            {answering ? (
              <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando resposta...
              </div>
            ) : null}
          </div>
        ) : (
          <div data-testid="session-finish-root" className="rounded-[28px] border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Sessao pronta para finalizar
            </div>

            <h2 className="mt-4 text-2xl font-bold">As {session.totalQuestions} questoes foram respondidas.</h2>
            <p className="mt-2 text-sm text-slate-600">
              Agora o contrato oficial fecha o resultado, grava o progresso e atualiza sua home.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Acertos parciais</p>
                <p className="mt-2 text-3xl font-bold">{session.correctAnswers}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total</p>
                <p className="mt-2 text-3xl font-bold">{session.totalQuestions}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tempo registrado</p>
                <p className="mt-2 text-3xl font-bold">{Math.max(1, Math.round(session.durationSeconds / 60))}m</p>
              </div>
            </div>

            <button
              data-testid="session-finish-cta"
              type="button"
              disabled={finishing}
              onClick={() => void onFinish()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {finishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <Clock3 className="h-4 w-4" />
                  Ver resultado
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
