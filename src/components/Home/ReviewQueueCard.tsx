import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface ReviewQueueItem {
  id: string;
  title: string;
  when: string;
  tag: string;
  featured?: boolean;
}

export interface ReviewQueueCardProps {
  eyebrow?: string;
  title: string;
  actionLabel: string;
  onAction: () => void;
  items: ReviewQueueItem[];
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  secondaryActionLabel: string;
  onSecondaryAction: () => void;
  darkMode?: boolean;
}

export const ReviewQueueCard: React.FC<ReviewQueueCardProps> = ({
  eyebrow = 'Revisoes',
  title,
  actionLabel,
  onAction,
  items,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  darkMode = false,
}) => {
  return (
    <section className={`motion-enter motion-card overflow-hidden rounded-[28px] border p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)] ${
      darkMode
        ? 'border-slate-800 bg-slate-950/92 shadow-[0_16px_34px_rgba(2,6,23,0.45)]'
        : 'border-slate-200 bg-white'
    }`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{eyebrow}</div>
          <div className={`mt-1.5 text-[26px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{title}</div>
        </div>
        <button
          type="button"
          onClick={onAction}
          className={`rounded-2xl border px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
            darkMode
              ? 'border-slate-700 text-slate-300 hover:bg-slate-900'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {actionLabel}
        </button>
      </div>
      <div className="space-y-3">
        {items.map((review) => (
          <div
            key={review.id}
            className={`overflow-hidden rounded-[26px] border p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(15,23,42,0.06)] ${
              review.featured
                ? darkMode
                  ? 'border-cyan-900/60 bg-[linear-gradient(180deg,rgba(8,145,178,0.16)_0%,rgba(15,23,42,0.94)_100%)]'
                  : 'border-cyan-200 bg-[linear-gradient(180deg,#f3feff_0%,#ffffff_100%)]'
                : darkMode
                  ? 'border-slate-800 bg-slate-900/72'
                  : 'border-slate-100 bg-slate-50'
            }`}
          >
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className={`text-sm font-semibold uppercase tracking-[0.22em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{review.when}</div>
                <div className={`mt-1 truncate text-base font-black tracking-[-0.03em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} title={review.title}>{review.title}</div>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                darkMode
                  ? 'bg-slate-950 text-slate-300 shadow-[0_8px_20px_rgba(2,6,23,0.4)]'
                  : 'bg-white text-slate-600'
              }`}>{review.tag}</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={onPrimaryAction}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#00E5FF] px-4 py-2.5 text-sm font-semibold text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#7cf4ff] active:scale-[0.98]"
              >
                {primaryActionLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onSecondaryAction}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                  darkMode
                    ? 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {secondaryActionLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ReviewQueueCard;
