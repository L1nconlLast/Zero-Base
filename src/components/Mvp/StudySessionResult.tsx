import React from 'react';
import { BarChart3, CheckCircle2, Home, TimerReset } from 'lucide-react';
import type { StudySessionResult as StudySessionResultPayload } from '../../services/mvpStudySessions.service';

interface StudySessionResultProps {
  result: StudySessionResultPayload;
  onBackHome: () => Promise<void>;
}

export const StudySessionResult: React.FC<StudySessionResultProps> = ({ result, onBackHome }) => {
  const accuracyPercent = Math.round(result.accuracy * 100);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-[28px] border border-emerald-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Sprint 2 MVP</p>
          <h1 className="mt-2 text-3xl font-bold">Sessao concluida com dados reais.</h1>
          <p className="mt-3 text-sm text-slate-600">
            O resultado ja foi persistido e a Home pode refletir o progresso atualizado.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
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
          </div>

          <button
            type="button"
            onClick={() => void onBackHome()}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            <Home className="h-4 w-4" />
            Voltar para Home
          </button>
        </div>
      </div>
    </div>
  );
};
