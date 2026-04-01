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
  isFirstSession?: boolean;
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
  isFirstSession = false,
  nextStep = null,
  nextStepLoading = false,
  weeklyProgress = null,
  onContinue,
  onViewSchedule,
}) => {
  const [showTomorrowStep, setShowTomorrowStep] = React.useState(!isFirstSession);

  React.useEffect(() => {
    setShowTomorrowStep(!isFirstSession);
  }, [isFirstSession, result.sessionId]);

  const accuracyPercent = Math.round(result.accuracy * 100);
  const resolvedTopicLabel = topicLabel || 'seu foco atual';
  const tomorrowFocusLabel = nextStep
    ? `${nextStep.discipline} - ${nextStep.topic}`
    : resolvedTopicLabel;
  const showMandatoryTomorrow = isFirstSession && showTomorrowStep;
  const primaryLabel = isFirstSession
    ? showTomorrowStep
      ? 'Continuar amanha'
      : 'Continuar'
    : 'Continuar';

  const handlePrimaryAction = () => {
    if (isFirstSession && !showTomorrowStep) {
      setShowTomorrowStep(true);
      return;
    }

    void onContinue();
  };

  return (
    <div data-testid="session-result-page" className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <div
          data-testid="session-result-root"
          className="rounded-[28px] border border-emerald-200 bg-white p-8 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
            {isFirstSession ? 'Primeira sessao' : 'Sessao oficial'}
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {isFirstSession
              ? 'Voce comecou. Seu plano de amanha ja esta pronto.'
              : `Voce avancou em ${resolvedTopicLabel}.`}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {isFirstSession
              ? showTomorrowStep
                ? 'Agora deixe o retorno visivel: bloco curto, objetivo claro e zero friccao.'
                : 'Sua 1a sessao foi concluida. Antes de sair, vamos deixar o retorno de amanha inevitavel.'
              : 'Seu resultado ja foi salvo e o proximo passo foi recalculado com base no seu progresso atual.'}
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

          {isFirstSession ? (
            <div
              data-testid="session-result-initial-progress"
              className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Progresso inicial
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900">1a sessao concluida</p>
              <p className="mt-2 text-sm font-medium text-slate-700">Progresso inicial: 1/7 dias</p>
              <p className="mt-1 text-sm text-slate-600">Sequencia iniciada: 1 dia</p>
            </div>
          ) : null}

          {showMandatoryTomorrow ? (
            <div
              data-testid="session-result-tomorrow-step"
              className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/80 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                Amanha
              </p>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">Seu plano de amanha ja esta pronto.</h2>
              <p className="mt-2 text-sm text-slate-700">Amanha voce volta aqui e fecha um bloco curto em menos de 5 min.</p>
              <div className="mt-4 space-y-2 text-sm font-semibold text-slate-900">
                <p>-&gt; 3 questoes rapidas</p>
                <p>-&gt; revisao do que voce viu hoje</p>
              </div>
              <p className="mt-4 text-sm text-slate-700">
                Continuidade sugerida: {tomorrowFocusLabel}
              </p>
            </div>
          ) : null}

          {weeklyProgress && !isFirstSession ? (
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

          {!isFirstSession ? (
            <div
              data-testid="session-result-next-step"
              className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/70 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                Proximo passo
              </p>
              {nextStepLoading ? (
                <p className="mt-3 text-sm text-slate-700">Atualizando a proxima recomendacao...</p>
              ) : nextStep ? (
                <>
                  <p className="mt-3 text-lg font-semibold text-slate-900">
                    {nextStep.discipline} - {nextStep.topic}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{nextStep.reason}</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-700">
                  Seu proximo passo estara disponivel assim que a home terminar de sincronizar.
                </p>
              )}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              data-testid="session-result-continue-cta"
              type="button"
              onClick={handlePrimaryAction}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
            >
              <ArrowRight className="h-4 w-4" />
              {primaryLabel}
            </button>
            {!isFirstSession ? (
              <button
                data-testid="session-result-schedule-cta"
                type="button"
                onClick={() => void onViewSchedule()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                <CalendarDays className="h-4 w-4" />
                Ver cronograma
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
