import React from 'react';
import type { BeginnerProgressStage, BeginnerWeekSummary as BeginnerWeekSummaryData } from '../../types';

interface BeginnerWeekSummaryProps {
  summary: BeginnerWeekSummaryData;
  progressStage: BeginnerProgressStage;
  onAction: (action: 'continue_guided' | 'explore_tools') => void;
  onClose: () => void;
}

const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours <= 0) {
    return `${remaining}min`;
  }
  return `${hours}h${String(remaining).padStart(2, '0')}`;
};

export const BeginnerWeekSummaryModal: React.FC<BeginnerWeekSummaryProps> = ({
  summary,
  progressStage,
  onAction,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-2xl rounded-3xl border bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold text-blue-600">Resumo da primeira semana</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Voce completou sua primeira semana.</h2>
        <p className="mt-2 text-sm text-slate-600">Agora o app comeca a se adaptar ao seu ritmo.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tempo total</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{formatMinutes(summary.totalTimeMinutes)}</p>
          </div>
          <div className="rounded-2xl border bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Questoes</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{summary.totalQuestions}</p>
          </div>
          <div className="rounded-2xl border bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Acertos</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{summary.accuracy}%</p>
          </div>
        </div>

        <p className="mt-5 text-sm font-medium text-slate-700">{summary.consistencyLabel}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Ponto forte</p>
            <p className="mt-2 text-lg font-bold text-slate-950">{summary.strongest || 'Consistencia'}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Ponto a melhorar</p>
            <p className="mt-2 text-lg font-bold text-slate-950">{summary.weakest || 'Matematica'}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
          <p className="text-sm text-slate-700">
            {progressStage === 'ready_for_intermediate'
              ? 'Seu plano agora comeca a se adaptar melhor. Voce ja pode continuar guiado ou explorar mais ferramentas.'
              : 'Seu plano agora comeca a se adaptar melhor com base no que voce realmente fez.'}
          </p>
        </div>

        {progressStage === 'ready_for_intermediate' && (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Novas ferramentas liberadas</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-blue-100 bg-white/80 p-3">
                <p className="text-sm font-semibold text-slate-900">Metodos de estudo</p>
                <p className="mt-1 text-xs text-slate-600">Pomodoro, Deep Work e ajustes por rotina.</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-white/80 p-3">
                <p className="text-sm font-semibold text-slate-900">Cronograma inteligente</p>
                <p className="mt-1 text-xs text-slate-600">Mais controle para organizar sua semana.</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-white/80 p-3">
                <p className="text-sm font-semibold text-slate-900">Ajustes por desempenho</p>
                <p className="mt-1 text-xs text-slate-600">O app passa a reagir melhor ao seu progresso real.</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => onAction('continue_guided')}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Continuar guiado
          </button>
          <button
            onClick={() => onAction('explore_tools')}
            className="rounded-xl border px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Explorar ferramentas
          </button>
          <button
            onClick={onClose}
            className="ml-auto rounded-xl px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
