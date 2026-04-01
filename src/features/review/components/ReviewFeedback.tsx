import React from 'react';
import type { ReviewFeedbackData, ReviewFeedbackValue } from '../types';

interface ReviewFeedbackProps {
  data: ReviewFeedbackData;
  darkMode?: boolean;
  onSelect?: (value: ReviewFeedbackValue) => void;
}

export const ReviewFeedback: React.FC<ReviewFeedbackProps> = ({ data, darkMode = false, onSelect }) => {
  const stateLabel = !data.revealed
    ? 'Etapa bloqueada'
    : data.selectedValue
      ? 'Decisao registrada'
      : 'Decisao aberta';

  return (
    <section
      className={`rounded-[24px] border p-4 shadow-[0_8px_18px_rgba(15,23,42,0.03)] ${
        darkMode
          ? 'border-slate-800/90 bg-slate-950/60 shadow-[0_10px_20px_rgba(2,6,23,0.2)]'
          : 'border-slate-200/90 bg-slate-50/74 shadow-[0_10px_20px_rgba(148,163,184,0.06)]'
      }`}
      data-testid="review-feedback"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              Decisao da revisao
            </p>
            <p className={`mt-2 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {data.helperLabel || 'O feedback desta revisao entra na proxima etapa.'}
            </p>
          </div>
          <span
            className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
              data.selectedValue
                ? darkMode
                  ? 'border-cyan-900/60 bg-cyan-950/32 text-cyan-200'
                  : 'border-cyan-200/90 bg-cyan-50/92 text-cyan-800'
                : !data.revealed
                  ? darkMode
                    ? 'border-slate-700 bg-slate-950/76 text-slate-300'
                    : 'border-slate-200/90 bg-white/84 text-slate-600'
                  : darkMode
                    ? 'border-emerald-900/60 bg-emerald-950/24 text-emerald-200'
                    : 'border-emerald-200/90 bg-emerald-50/92 text-emerald-800'
            }`}
          >
            {stateLabel}
          </span>
        </div>
        <div
          className={`grid grid-cols-2 gap-2 lg:grid-cols-4 ${
            darkMode ? 'rounded-[20px] bg-slate-950/42 p-1.5' : 'rounded-[20px] bg-white/72 p-1.5'
          }`}
        >
          {data.options.map((option) => {
            const selected = data.selectedValue === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                aria-pressed={selected}
                onClick={option.disabled ? undefined : () => onSelect?.(option.value)}
                data-selected={selected ? 'true' : 'false'}
                data-testid={`review-feedback-option-${option.value}`}
                className={`rounded-[18px] border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  selected
                    ? darkMode
                      ? 'border-cyan-700 bg-cyan-950/52 text-cyan-100'
                      : 'border-cyan-300 bg-cyan-100 text-cyan-900'
                    : option.disabled
                      ? darkMode
                        ? 'border-slate-700 bg-slate-950/78 text-slate-300 opacity-70'
                        : 'border-slate-200/90 bg-white/84 text-slate-700 opacity-70'
                      : darkMode
                        ? 'border-slate-700 bg-slate-950/78 text-slate-100 hover:border-cyan-700 hover:text-cyan-100'
                        : 'border-slate-200/90 bg-white/84 text-slate-700 hover:border-cyan-300 hover:text-cyan-900'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ReviewFeedback;
