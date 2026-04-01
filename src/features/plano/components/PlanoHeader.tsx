import React from 'react';
import { ArrowRightLeft, CalendarDays } from 'lucide-react';
import type { PlanoMetric } from '../types';

interface PlanoHeaderProps {
  eyebrow: string;
  title: string;
  contextLine: string;
  statusLine: string;
  metrics: PlanoMetric[];
  onAdjustPlan?: () => void;
  onViewCalendar?: () => void;
  darkMode?: boolean;
}

export const PlanoHeader: React.FC<PlanoHeaderProps> = ({
  eyebrow,
  title,
  contextLine,
  statusLine,
  metrics,
  onAdjustPlan,
  onViewCalendar,
  darkMode = false,
}) => {
  return (
    <section
      data-testid="plan-header"
      className={`overflow-hidden rounded-[28px] border px-5 py-4.5 shadow-[0_16px_32px_rgba(15,23,42,0.05)] ${
        darkMode
          ? 'border-slate-800 bg-[linear-gradient(135deg,rgba(15,23,42,0.97)_0%,rgba(2,6,23,0.95)_62%,rgba(8,145,178,0.10)_100%)] shadow-[0_16px_32px_rgba(2,6,23,0.34)]'
          : 'border-slate-200/85 bg-[linear-gradient(135deg,rgba(248,250,252,0.97)_0%,rgba(255,255,255,0.95)_58%,rgba(241,245,249,0.93)_100%)] shadow-[0_16px_32px_rgba(148,163,184,0.12)]'
      }`}
    >
      <div className="flex flex-col gap-3.5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
            darkMode ? 'text-cyan-300' : 'text-sky-700'
          }`}>
            {eyebrow}
          </p>
          <h1 className={`mt-2 text-[28px] font-black tracking-[-0.05em] ${
            darkMode ? 'text-slate-100' : 'text-slate-900'
          }`}>
            {title}
          </h1>
          <p className={`mt-2 text-sm font-medium ${
            darkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>
            {contextLine}
          </p>
          <p className={`mt-2 text-sm ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {statusLine}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2.5 xl:w-auto xl:min-w-[300px] xl:max-w-[360px]">
          <div data-testid="plan-header-metrics" className="flex flex-wrap gap-1.5">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                  darkMode
                    ? 'border-slate-700 bg-slate-950/76 text-slate-200'
                    : 'border-slate-200/85 bg-white/82 text-slate-700'
                }`}
              >
                <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>
                  {metric.label}
                </span>
                <span className={darkMode ? 'text-slate-100' : 'text-slate-900'}>
                  {metric.value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            {onAdjustPlan ? (
              <button
                type="button"
                onClick={onAdjustPlan}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
                  darkMode
                    ? 'border-slate-700 bg-slate-100 text-slate-950 hover:bg-slate-200'
                    : 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <ArrowRightLeft className="h-4 w-4" />
                Ajustar plano
              </button>
            ) : null}

            {onViewCalendar ? (
              <button
                type="button"
                onClick={onViewCalendar}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  darkMode
                    ? 'border-slate-700 bg-slate-950/72 text-slate-200 hover:bg-slate-900'
                    : 'border-slate-200/85 bg-white/74 text-slate-700 hover:bg-white'
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                Ver cronograma
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlanoHeader;
