import React from 'react';
import { CheckCircle2, CircleDot, Layers3, ListTodo } from 'lucide-react';
import type { ReviewHeaderData } from '../types';

interface ReviewHeaderProps {
  data: ReviewHeaderData;
  darkMode?: boolean;
}

const STATUS_META: Record<
  ReviewHeaderData['status'],
  {
    label: string;
    icon: typeof CircleDot;
    lightClassName: string;
    darkClassName: string;
  }
> = {
  empty: {
    label: 'Fila vazia',
    icon: ListTodo,
    lightClassName: 'border-slate-200/90 bg-slate-100/88 text-slate-700',
    darkClassName: 'border-slate-700 bg-slate-950/80 text-slate-200',
  },
  active: {
    label: 'Em andamento',
    icon: CircleDot,
    lightClassName: 'border-cyan-200/90 bg-cyan-50/92 text-cyan-800',
    darkClassName: 'border-cyan-900/60 bg-cyan-950/32 text-cyan-200',
  },
  completed: {
    label: 'Fila concluida',
    icon: CheckCircle2,
    lightClassName: 'border-emerald-200/90 bg-emerald-50/92 text-emerald-800',
    darkClassName: 'border-emerald-900/60 bg-emerald-950/28 text-emerald-200',
  },
};

export const ReviewHeader: React.FC<ReviewHeaderProps> = ({ data, darkMode = false }) => {
  const statusMeta = STATUS_META[data.status];
  const StatusIcon = statusMeta.icon;
  const eyebrow = data.eyebrow || 'Fila diaria de revisao';
  const metricsTitle = data.metricsTitle || 'Ritmo da fila';
  const footerLabel = data.footerLabel
    || (data.status === 'active'
      ? 'Um item por vez, sem reabrir o resto do plano.'
      : data.status === 'completed'
        ? 'O dia de revisao fechou sem pendencia ativa.'
        : 'A fila continua pronta para receber a proxima revisao que vencer.');

  return (
    <section
      className={`rounded-[26px] border px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] sm:px-5 sm:py-4.5 ${
        darkMode
          ? 'border-slate-800/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.94)_0%,rgba(2,6,23,0.91)_100%)] shadow-[0_12px_28px_rgba(2,6,23,0.28)]'
          : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(247,250,252,0.98)_0%,rgba(240,245,249,0.95)_100%)] shadow-[0_12px_24px_rgba(148,163,184,0.09)]'
      }`}
      data-testid="review-header"
    >
      <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
        {eyebrow}
      </p>
      <div className="mt-3 grid gap-3.5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-start">
        <div className="min-w-0 max-w-3xl">
          <h1 className={`text-[26px] font-black tracking-[-0.04em] sm:text-[28px] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {data.title}
          </h1>
          <p
            className={`mt-2 max-w-2xl text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}
            data-testid="review-header-context"
          >
            {data.contextLabel}
          </p>
        </div>

        <div
          className={`rounded-[20px] border p-3 ${
            darkMode
              ? 'border-slate-800/90 bg-slate-950/54'
              : 'border-slate-200/85 bg-white/72'
          }`}
        >
          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {metricsTitle}
          </p>
          <div className="mt-3 flex flex-wrap gap-2" data-testid="review-header-metrics">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                darkMode
                  ? 'border-slate-700 bg-slate-950/76 text-slate-200'
                  : 'border-slate-200/90 bg-white/80 text-slate-700'
              }`}
            >
              <Layers3 className="h-3.5 w-3.5" />
              {data.progressLabel}
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                darkMode
                  ? 'border-slate-700 bg-slate-950/76 text-slate-200'
                  : 'border-slate-200/90 bg-white/80 text-slate-700'
              }`}
            >
              <ListTodo className="h-3.5 w-3.5" />
              {data.queueLabel}
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                darkMode ? statusMeta.darkClassName : statusMeta.lightClassName
              }`}
              data-testid="review-header-status"
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusMeta.label}
            </span>
          </div>
          <p className={`mt-3 text-sm leading-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {footerLabel}
          </p>
        </div>
      </div>
    </section>
  );
};

export default ReviewHeader;
