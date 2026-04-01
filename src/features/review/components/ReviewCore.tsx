import React from 'react';
import { ArrowRight, BookOpenCheck, BrainCircuit, Layers3 } from 'lucide-react';
import type { ReviewCoreData } from '../types';

interface ReviewCoreProps {
  data: ReviewCoreData;
  darkMode?: boolean;
  onAction?: () => void;
}

const STATUS_COPY: Record<ReviewCoreData['status'], string> = {
  empty: 'Nenhuma revisao vence hoje',
  active: 'Item ativo da fila',
  revealed: 'Resposta aberta',
  answered: 'Decisao registrada',
  completed: 'Fila concluida',
};

const EYEBROW_COPY: Record<ReviewCoreData['status'], string> = {
  empty: 'Fila do dia',
  active: 'Item atual da fila',
  revealed: 'Resposta em foco',
  answered: 'Decisao em foco',
  completed: 'Revisao encerrada',
};

const PROMPT_LABEL_COPY: Record<ReviewCoreData['status'], string> = {
  empty: 'Quando a fila abrir',
  active: 'Recuperacao ativa',
  revealed: 'Recuperacao ativa',
  answered: 'Recuperacao ativa',
  completed: 'Fechamento da fila',
};

const resolveProgressRatio = (positionLabel: string, status: ReviewCoreData['status']): number => {
  if (status === 'completed') {
    return 100;
  }

  if (status === 'empty') {
    return 0;
  }

  const match = positionLabel.match(/(\d+)\s+de\s+(\d+)/i);
  if (!match) {
    return 0;
  }

  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.max(8, Math.min(100, Math.round((current / total) * 100)));
};

export const ReviewCore: React.FC<ReviewCoreProps> = ({ data, darkMode = false, onAction }) => {
  const answerVisible = data.status === 'revealed' || data.status === 'answered' || data.status === 'completed';
  const actionDisabled = data.actionDisabled ?? !onAction;
  const progressRatio = resolveProgressRatio(data.positionLabel, data.status);
  const eyebrowLabel = data.eyebrowLabel || EYEBROW_COPY[data.status];
  const sequenceTitle = data.sequenceTitle || 'Ritmo da fila';
  const promptLabel = data.promptLabel || PROMPT_LABEL_COPY[data.status];
  const answerVisibleLabel = data.answerVisibleLabel || 'Resposta guiada';
  const answerHiddenLabel = data.answerHiddenLabel || 'Resposta bloqueada';
  const progressToneClass = data.status === 'completed'
    ? 'bg-emerald-500'
    : data.status === 'answered'
      ? 'bg-cyan-400'
      : data.status === 'revealed'
        ? 'bg-cyan-500'
        : data.status === 'active'
          ? 'bg-cyan-500'
          : 'bg-slate-300';

  return (
    <section
      className={`rounded-[28px] border p-4 shadow-[0_16px_34px_rgba(15,23,42,0.05)] sm:p-5 lg:p-6 ${
        darkMode
          ? 'border-slate-800/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(2,6,23,0.95)_100%)] shadow-[0_18px_36px_rgba(2,6,23,0.34)]'
          : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(252,253,253,0.98)_0%,rgba(244,247,250,0.96)_100%)] shadow-[0_18px_30px_rgba(148,163,184,0.11)]'
      }`}
      data-testid="review-core"
    >
      <div className="space-y-4.5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.82fr)] xl:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {data.subjectLabel ? (
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    darkMode
                      ? 'border-slate-700 bg-slate-950/76 text-slate-300'
                      : 'border-slate-200/90 bg-white/80 text-slate-700'
                  }`}
                >
                  {data.subjectLabel}
                </span>
              ) : null}
              {data.trackLabel ? (
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    darkMode
                      ? 'border-emerald-900/60 bg-emerald-950/28 text-emerald-200'
                      : 'border-emerald-200/90 bg-emerald-50/92 text-emerald-800'
                  }`}
                >
                  {data.trackLabel}
                </span>
              ) : null}
              {data.sourceLabel ? (
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    darkMode
                      ? 'border-cyan-900/60 bg-cyan-950/32 text-cyan-200'
                      : 'border-cyan-200/90 bg-cyan-50/92 text-cyan-800'
                  }`}
                >
                  {data.sourceLabel}
                </span>
              ) : null}
            </div>
            <p className={`mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              <BrainCircuit className="h-3.5 w-3.5 text-cyan-500" />
              {eyebrowLabel}
            </p>
            <h2
              className={`mt-2 text-[28px] font-black tracking-[-0.04em] sm:text-[30px] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}
              data-testid="review-core-title"
            >
              {data.title}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2" data-testid="review-core-meta">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  darkMode
                    ? 'border-slate-700 bg-slate-950/76 text-slate-200'
                    : 'border-slate-200/90 bg-white/78 text-slate-700'
                }`}
              >
                <BookOpenCheck className="h-3.5 w-3.5" />
                {STATUS_COPY[data.status]}
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  darkMode
                    ? 'border-slate-700 bg-slate-950/76 text-slate-200'
                    : 'border-slate-200/90 bg-white/78 text-slate-700'
                }`}
              >
                <Layers3 className="h-3.5 w-3.5" />
                {data.positionLabel}
              </span>
            </div>
          </div>

          <aside
            className={`rounded-[22px] border p-4 ${
              darkMode
                ? 'border-slate-800/90 bg-slate-950/58'
                : 'border-slate-200/85 bg-white/78'
            }`}
            data-testid="review-core-sequence"
          >
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              {sequenceTitle}
            </p>
            <p className={`mt-3 text-lg font-black tracking-[-0.03em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {data.sequenceLabel}
            </p>
            <div className={`mt-3 h-2 overflow-hidden rounded-full ${darkMode ? 'bg-slate-900' : 'bg-slate-200'}`}>
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${progressToneClass}`}
                style={{ width: `${progressRatio}%` }}
              />
            </div>
            <p
              className={`mt-2 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}
              data-testid="review-core-next-step"
            >
              {data.nextActionLabel}
            </p>
            <button
              type="button"
              disabled={actionDisabled}
              onClick={actionDisabled ? undefined : onAction}
              data-testid="review-core-action"
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                actionDisabled
                  ? darkMode
                    ? 'border-slate-700 bg-slate-950/70 text-slate-300 opacity-70'
                    : 'border-slate-200/90 bg-white/80 text-slate-700 opacity-70'
                  : 'border-cyan-200/90 bg-[#00E5FF] text-slate-950 hover:-translate-y-0.5 hover:bg-[#7cf4ff] active:scale-[0.99]'
              }`}
            >
              {data.actionLabel || 'Ver resposta'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </aside>
        </div>

        <article
          className={`rounded-[22px] border p-4 ${
            darkMode
              ? 'border-slate-800/90 bg-slate-950/60'
              : 'border-slate-200/85 bg-white/74'
          }`}
          data-testid="review-core-prompt"
        >
          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {promptLabel}
          </p>
          <p className={`mt-3 text-[15px] leading-7 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            {data.prompt}
          </p>
        </article>

        <article
          className={`rounded-[22px] border p-4 ${
            darkMode
              ? answerVisible
                ? 'border-cyan-900/55 bg-cyan-950/12'
                : 'border-slate-800/90 bg-slate-950/40'
              : answerVisible
                ? 'border-cyan-200/85 bg-cyan-50/62'
                : 'border-slate-200/85 bg-slate-50/84'
          }`}
          data-testid="review-core-answer"
        >
          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {answerVisible ? answerVisibleLabel : answerHiddenLabel}
          </p>
          <p className={`mt-3 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {answerVisible
              ? data.answer || 'A resposta entra na proxima etapa, junto com a decisao de dominio.'
              : 'Tente recuperar mentalmente antes de abrir a resposta. Quando estiver pronto, revele abaixo para comparar com sua lembranca.'}
          </p>
        </article>
      </div>
    </section>
  );
};

export default ReviewCore;
