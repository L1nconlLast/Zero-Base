import React from 'react';
import { ArrowRight, BarChart3, Clock3, Flame, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ProgressEmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}

const ProgressEmptyState: React.FC<ProgressEmptyStateProps> = ({
  icon: Icon = BarChart3,
  onAction,
  onSecondaryAction,
}) => {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-700/70 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_34%),linear-gradient(145deg,#020617,#0f172a_52%,#111827)] shadow-[0_24px_60px_-30px_rgba(2,6,23,0.98)]">
      <div className="grid gap-8 px-6 py-8 lg:px-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
            <Icon className="h-3.5 w-3.5" />
            Progressao e horas
          </div>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
            Seu progresso comeca aqui.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Complete sessoes de estudo para liberar graficos, streak, comparativos e distribuicao por materia.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Hoje</span>
                <Clock3 className="h-4 w-4 text-sky-300" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-50">0h</p>
              <p className="mt-2 text-sm text-slate-400">Sua primeira sessao liga esse marcador.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Semana</span>
                <Target className="h-4 w-4 text-cyan-300" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-50">0h</p>
              <p className="mt-2 text-sm text-slate-400">O grafico semanal nasce assim que voce concluir a primeira sessao.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Streak</span>
                <Flame className="h-4 w-4 text-amber-300" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-50">0 dias</p>
              <p className="mt-2 text-sm text-slate-400">Consistencia e o que transforma estudo em progresso visivel.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {onAction ? (
              <button
                onClick={onAction}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Comecar sessao agora
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}

            {onSecondaryAction ? (
              <button
                onClick={onSecondaryAction}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-600 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
              >
                Ver plano de estudo
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-700/80 bg-slate-950/60 p-5 shadow-[0_18px_36px_-24px_rgba(14,165,233,0.7)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">O que aparece depois</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-50">Seu painel ganha corpo assim que voce concluir a primeira sessao</h3>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-emerald-700/30 bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <Clock3 className="h-4 w-4" />
                <span className="text-sm font-semibold">Horas estudadas por dia</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-100/80">Veja quando sua semana acelera, onde ela trava e quanto voce estudou de verdade.</p>
            </div>

            <div className="rounded-2xl border border-sky-700/30 bg-sky-950/20 p-4">
              <div className="flex items-center gap-2 text-sky-300">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm font-semibold">Distribuicao por materia</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-sky-100/80">Entenda para onde seu tempo esta indo e se o volume esta equilibrado no que importa.</p>
            </div>

            <div className="rounded-2xl border border-amber-700/30 bg-amber-950/20 p-4">
              <div className="flex items-center gap-2 text-amber-300">
                <Flame className="h-4 w-4" />
                <span className="text-sm font-semibold">Streak e comparativos</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-amber-100/80">Seu habito passa a ficar visivel com streak, meta semanal e comparacao contra a semana anterior.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressEmptyState;
