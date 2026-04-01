import React from 'react';
import { ArrowRight, CheckCircle2, CircleDot } from 'lucide-react';
import type { DailyReviewQueueData, ReviewSummaryData } from '../types';

interface ReviewSummaryProps {
  data: ReviewSummaryData;
  queue: DailyReviewQueueData;
  darkMode?: boolean;
}

const STATUS_STYLES = {
  active: {
    marker: 'bg-cyan-500',
    label: 'Agora',
  },
  pending: {
    marker: 'bg-slate-300 dark:bg-slate-600',
    label: 'Fila',
  },
  completed: {
    marker: 'bg-emerald-500',
    label: 'Feito',
  },
} as const;

export const ReviewSummary: React.FC<ReviewSummaryProps> = ({ data, queue, darkMode = false }) => (
  <section
    className={`rounded-[24px] border p-4 shadow-[0_8px_18px_rgba(15,23,42,0.03)] ${
      darkMode
        ? 'border-slate-800/90 bg-slate-950/54 shadow-[0_10px_18px_rgba(2,6,23,0.18)]'
        : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(247,249,251,0.96)_0%,rgba(240,244,248,0.94)_100%)] shadow-[0_10px_18px_rgba(148,163,184,0.06)]'
    }`}
    data-testid="review-summary"
  >
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(320px,1.08fr)] xl:items-start">
      <div className="max-w-2xl">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
          {data.eyebrow || 'Resumo da fila'}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div
            className={`rounded-[18px] border px-3.5 py-3 ${
              darkMode
                ? 'border-slate-700 bg-slate-950/76 text-slate-200'
                : 'border-slate-200/90 bg-white/78 text-slate-700'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Concluidos
            </span>
            <p className={`mt-2 text-base font-black tracking-[-0.03em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {data.completedLabel}
            </p>
          </div>
          <div
            className={`rounded-[18px] border px-3.5 py-3 ${
              darkMode
                ? 'border-cyan-900/60 bg-cyan-950/28 text-cyan-200'
                : 'border-cyan-200/90 bg-cyan-50/88 text-cyan-800'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
              <ArrowRight className="h-3.5 w-3.5" />
              Restantes
            </span>
            <p className={`mt-2 text-base font-black tracking-[-0.03em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {data.remainingLabel}
            </p>
          </div>
        </div>
        <p className={`mt-3 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          {data.nextStepLabel}
        </p>
      </div>

      <div
        className={`min-w-0 rounded-[20px] border p-3 ${
          darkMode
            ? 'border-slate-800/90 bg-slate-950/42'
            : 'border-slate-200/85 bg-white/62'
        }`}
        data-testid="review-summary-queue"
      >
        <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
          {data.queueTitle || 'Ordem de hoje'}
        </p>
        {queue.items.length > 0 ? (
          <ol className="mt-3 space-y-2">
            {queue.items.map((item) => {
              const statusStyle = STATUS_STYLES[item.status];
              return (
                <li
                  key={item.id}
                  className={`flex items-start gap-3 rounded-2xl border px-3 py-2.5 ${
                    item.status === 'active'
                      ? darkMode
                        ? 'border-cyan-900/70 bg-cyan-950/22'
                        : 'border-cyan-200/90 bg-cyan-50/70'
                      : darkMode
                        ? 'border-slate-800/90 bg-slate-950/32'
                        : 'border-slate-200/85 bg-slate-50/74'
                  }`}
                  data-testid={`review-summary-item-${item.id}`}
                >
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${statusStyle.marker}`} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {item.position}. {item.title}
                      </p>
                      <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <p className={`mt-1 text-[13px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {[item.trackLabel, item.subjectLabel || 'Revisao', item.sourceLabel].filter(Boolean).join(' / ')}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className={`mt-3 rounded-2xl border px-3 py-3 text-sm ${
            darkMode
              ? 'border-slate-800/90 bg-slate-950/32 text-slate-400'
              : 'border-slate-200/85 bg-slate-50/74 text-slate-600'
          }`}>
            <span className="inline-flex items-center gap-2">
              <CircleDot className="h-4 w-4" />
              Nenhum item entrou na fila de hoje.
            </span>
          </div>
        )}
      </div>
    </div>
  </section>
);

export default ReviewSummary;
