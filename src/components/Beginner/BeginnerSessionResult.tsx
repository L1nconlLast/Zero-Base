import React from 'react';

interface BeginnerSessionResultProps {
  completedMissionLabel: string;
  xpGained: number;
  streak: number;
  nextMissionLabel?: string;
  correctAnswers?: number | null;
  totalQuestions?: number | null;
  isFirstSession?: boolean;
  onPrimaryAction?: () => void;
  onClose: () => void;
}

export const BeginnerSessionResult: React.FC<BeginnerSessionResultProps> = ({
  completedMissionLabel,
  xpGained,
  streak,
  nextMissionLabel,
  correctAnswers,
  totalQuestions,
  isFirstSession = false,
  onPrimaryAction,
  onClose,
}) => {
  const [showTomorrowStep, setShowTomorrowStep] = React.useState(!isFirstSession);

  React.useEffect(() => {
    setShowTomorrowStep(!isFirstSession);
  }, [completedMissionLabel, isFirstSession]);

  const accuracy =
    typeof correctAnswers === 'number' && typeof totalQuestions === 'number' && totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : null;

  const coachingMessage =
    accuracy === null
      ? 'Sua sessao foi registrada e a proxima missao ja esta preparada.'
      : accuracy >= 80
        ? 'Voce foi bem. Bora subir o ritmo no proximo dia.'
        : accuracy >= 50
          ? 'Boa. Vamos consolidar esse ritmo na proxima missao.'
          : 'Normal no comeco. Amanha reforcamos os pontos principais.';

  const nextDayLabel = nextMissionLabel?.match(/^Dia \d+/)?.[0];
  const primaryLabel = isFirstSession
    ? showTomorrowStep
      ? 'Continuar amanha'
      : 'Continuar'
    : nextDayLabel
      ? `Ir para o ${nextDayLabel}`
      : null;
  const tomorrowLabel = nextMissionLabel || 'sua proxima missao';
  const showMandatoryTomorrow = isFirstSession && showTomorrowStep;

  const handlePrimaryAction = () => {
    if (isFirstSession && !showTomorrowStep) {
      setShowTomorrowStep(true);
      return;
    }

    onPrimaryAction?.();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold text-emerald-600">
          {isFirstSession ? 'Primeira sessao concluida' : 'Missao concluida'}
        </p>

        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          {isFirstSession
            ? 'Voce comecou. Seu plano de amanha ja esta pronto.'
            : `+${xpGained} XP`}
        </h2>

        <p className="mt-2 text-sm text-slate-700">
          {isFirstSession
            ? showTomorrowStep
              ? 'Agora deixe o retorno visivel: bloco curto, objetivo claro e zero friccao.'
              : 'Sua 1a sessao foi concluida. Agora vamos deixar o retorno de amanha inevitavel.'
            : `${completedMissionLabel} foi concluida e seu progresso ja foi atualizado.`}
        </p>

        {isFirstSession ? (
          <div
            data-testid="beginner-result-initial-progress"
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Progresso inicial</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">1a sessao concluida</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Progresso inicial: 1/7 dias</p>
            <p className="mt-1 text-sm text-slate-700">Sequencia iniciada: 1 dia</p>
          </div>
        ) : typeof correctAnswers === 'number' && typeof totalQuestions === 'number' ? (
          <p className="mt-2 text-sm text-slate-700">
            Voce acertou {correctAnswers} de {totalQuestions} questoes.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-700">{coachingMessage}</p>
        )}

        {!isFirstSession && accuracy !== null ? (
          <p className="mt-2 text-sm text-slate-700">{coachingMessage}</p>
        ) : null}

        {showMandatoryTomorrow ? (
          <div
            data-testid="beginner-result-tomorrow-step"
            className="mt-4 rounded-xl border border-blue-200 bg-blue-50/80 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Amanha</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">Seu plano de amanha ja esta pronto.</p>
            <p className="mt-2 text-sm text-slate-700">Amanha voce volta aqui e fecha um bloco curto em menos de 5 min.</p>
            <div className="mt-3 space-y-1 text-sm font-semibold text-slate-900">
              <p>-&gt; 3 questoes rapidas</p>
              <p>-&gt; revisao do que voce viu hoje</p>
            </div>
            <p className="mt-3 text-sm text-slate-700">Continuidade sugerida: {tomorrowLabel}</p>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Bloco de hoje</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{completedMissionLabel}</p>
          </div>
          <div className="rounded-xl border bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Progresso</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              +{xpGained} XP{streak > 0 ? ` - ${streak} dia(s) de ritmo` : ''}
            </p>
          </div>
        </div>

        {!isFirstSession && nextMissionLabel ? (
          <div className="mt-4 rounded-xl border bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Proxima missao</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{nextMissionLabel}</p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          {primaryLabel && onPrimaryAction ? (
            <button
              onClick={handlePrimaryAction}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {primaryLabel}
            </button>
          ) : null}
          {!isFirstSession ? (
            <button
              onClick={onClose}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                primaryLabel ? 'border text-slate-700 hover:bg-slate-50' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              Voltar para a home
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
