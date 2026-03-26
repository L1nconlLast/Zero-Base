import React from 'react';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Sparkles,
  TimerReset,
  TrendingUp,
} from 'lucide-react';
import type { StudySessionResult as StudySessionResultPayload } from '../../services/mvpStudySessions.service';
import type { UserFacingWeeklyProgress } from '../../services/prioritizationReason';

type SessionNextStep = {
  discipline: string;
  topic: string;
  reason: string;
} | null;

interface StudySessionResultProps {
  result: StudySessionResultPayload;
  topicLabel?: string | null;
  xpPoints?: number;
  nextStep?: SessionNextStep;
  nextStepLoading?: boolean;
  weeklyProgress?: UserFacingWeeklyProgress | null;
  onContinue: () => Promise<void>;
  onViewSchedule: () => Promise<void>;
}

export const StudySessionResult: React.FC<StudySessionResultProps> = ({
  result,
  topicLabel,
  xpPoints = 0,
  nextStep = null,
  nextStepLoading = false,
  weeklyProgress = null,
  onContinue,
  onViewSchedule,
}) => {
  const accuracyPercent = Math.round(result.accuracy * 100);
  const resolvedTopicLabel = topicLabel || 'seu foco atual';

  return (
    <div data-testid="session-result-page" className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <div
          data-testid="session-result-root"
          className="rounded-[28px] border border-emerald-200 bg-white p-8 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Sessao oficial
          </p>
          <h1 className="mt-2 text-3xl font-bold">Você avançou em {resolvedTopicLabel}.</h1>
          <p className="mt-3 text-sm text-slate-600">
            Seu resultado já foi salvo e o próximo passo foi recalculado com base no seu progresso atual.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-100 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <CheckCircle2 className="h-4 w-4" />
                Acertos
              </div>
              <p className="mt-3 text-4xl font-bold">{result.correct}</p>
              <p className="mt-1 text-sm text-slate-600">de {result.total} questoes</p>
            </div>

            <div className="rounded-2xl bg-slate-100 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <BarChart3 className="h-4 w-4" />
                Precisao
              </div>
              <p className="mt-3 text-4xl font-bold">{accuracyPercent}%</p>
              <p className="mt-1 text-sm text-slate-600">na sessao curta</p>
            </div>

            <div className="rounded-2xl bg-slate-100 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <TimerReset className="h-4 w-4" />
                Tempo
              </div>
              <p className="mt-3 text-4xl font-bold">{Math.max(1, Math.round(result.durationSeconds / 60))}m</p>
              <p className="mt-1 text-sm text-slate-600">registrados</p>
            </div>

            <div className="rounded-2xl bg-slate-100 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Sparkles className="h-4 w-4" />
                XP
              </div>
              <p className="mt-3 text-4xl font-bold">+{xpPoints}</p>
              <p className="mt-1 text-sm text-slate-600">ganhos nesta sessao</p>
            </div>
          </div>

          {weeklyProgress ? (
            <div
              data-testid="session-result-weekly-progress"
              className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Progresso semanal
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{weeklyProgress.label}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  data-testid="session-result-weekly-progress-bar"
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.max(4, Math.round(weeklyProgress.ratio * 100))}%` }}
                />
              </div>
            </div>
          ) : null}

          <div
            data-testid="session-result-next-step"
            className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/70 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              Proximo passo
            </p>
            {nextStepLoading ? (
              <p className="mt-3 text-sm text-slate-700">Atualizando a próxima recomendação...</p>
            ) : nextStep ? (
              <>
                <p className="mt-3 text-lg font-semibold text-slate-900">
                  {nextStep.discipline} • {nextStep.topic}
                </p>
                <p className="mt-2 text-sm text-slate-700">{nextStep.reason}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-700">
                Seu próximo passo estará disponível assim que a home terminar de sincronizar.
              </p>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              data-testid="session-result-continue-cta"
              type="button"
              onClick={() => void onContinue()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
            >
              <ArrowRight className="h-4 w-4" />
              Continuar
            </button>
            <button
              data-testid="session-result-schedule-cta"
              type="button"
              onClick={() => void onViewSchedule()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              <CalendarDays className="h-4 w-4" />
              Ver cronograma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
