import React from 'react';

interface BeginnerSessionResultProps {
  completedMissionLabel: string;
  xpGained: number;
  streak: number;
  nextMissionLabel?: string;
  correctAnswers?: number | null;
  totalQuestions?: number | null;
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
  onPrimaryAction,
  onClose,
}) => {
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
  const primaryLabel = nextDayLabel ? `Ir para o ${nextDayLabel}` : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold text-emerald-600">Missao concluida</p>

        <h2 className="mt-2 text-2xl font-bold text-slate-900">+{xpGained} XP</h2>

        <p className="mt-2 text-sm text-slate-700">
          {completedMissionLabel} foi concluida e seu progresso ja foi atualizado.
        </p>

        {typeof correctAnswers === 'number' && typeof totalQuestions === 'number' ? (
          <p className="mt-2 text-sm text-slate-700">
            Voce acertou {correctAnswers} de {totalQuestions} questoes.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-700">{coachingMessage}</p>
        )}

        {accuracy !== null && (
          <p className="mt-2 text-sm text-slate-700">{coachingMessage}</p>
        )}

        <p className="mt-2 text-sm text-slate-700">Streak atual: {streak}</p>

        {nextMissionLabel && (
          <div className="mt-4 rounded-xl border bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Proxima missao</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{nextMissionLabel}</p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {primaryLabel && onPrimaryAction && (
            <button
              onClick={onPrimaryAction}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {primaryLabel}
            </button>
          )}
          <button
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${primaryLabel ? 'border text-slate-700 hover:bg-slate-50' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >
            Voltar para a home
          </button>
        </div>
      </div>
    </div>
  );
};
