import React from 'react';
import { Check, Circle } from 'lucide-react';

export interface DayExecutionItem {
  id: string;
  text: string;
  done: boolean;
}

export interface DayExecutionSummary {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: 'emerald' | 'violet';
}

export interface DayExecutionCardProps {
  eyebrow?: string;
  title: string;
  accentLabel: string;
  onAccentAction: () => void;
  items: DayExecutionItem[];
  summaries: DayExecutionSummary[];
  darkMode?: boolean;
}

const getSummaryToneClass = (tone: DayExecutionSummary['tone'], darkMode: boolean) => {
  if (darkMode) {
    return tone === 'emerald'
      ? 'bg-emerald-950/28 text-emerald-200'
      : 'bg-violet-950/28 text-violet-200';
  }

  return tone === 'emerald'
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-violet-50 text-violet-700';
};

export const DayExecutionCard: React.FC<DayExecutionCardProps> = ({
  eyebrow = 'Plano do dia',
  title,
  accentLabel,
  onAccentAction,
  items,
  summaries,
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
          onClick={onAccentAction}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
            darkMode
              ? 'border-slate-700 text-slate-300 hover:bg-slate-900'
              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          {accentLabel}
        </button>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 ${
              darkMode
                ? 'border-slate-800 bg-slate-900/72 hover:border-slate-700 hover:bg-slate-900'
                : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white hover:shadow-[0_12px_22px_rgba(15,23,42,0.05)]'
            }`}
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
              item.done
                ? 'border-cyan-300 bg-cyan-300 text-slate-900'
                : darkMode
                  ? 'border-slate-700 bg-slate-950 text-slate-600'
                  : 'border-slate-300 bg-white text-slate-300'
            }`}>
              {item.done ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            </div>
            <div className={`min-w-0 flex-1 break-words text-sm ${
              item.done
                ? darkMode ? 'font-semibold text-slate-100' : 'font-semibold text-slate-800'
                : darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>{item.text}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {summaries.map((summary) => (
          <div key={summary.id} className={`rounded-2xl p-3.5 ${getSummaryToneClass(summary.tone, darkMode)}`}>
            <div className="text-sm">{summary.label}</div>
            <div className={`mt-1 text-[28px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{summary.value}</div>
            <div className="mt-1.5 text-sm opacity-80">{summary.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DayExecutionCard;
