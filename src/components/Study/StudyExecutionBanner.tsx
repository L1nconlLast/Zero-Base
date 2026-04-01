import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { normalizePresentationLabel, truncatePresentationLabel } from '../../utils/uiLabels';

type StudyExecutionBannerProps = {
  eyebrow: string;
  title: string;
  description: string;
  supportingText?: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryActionDisabled?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  meta: Array<{ label: string; value: string }>;
  className?: string;
  darkMode?: boolean;
};

export const StudyExecutionBanner: React.FC<StudyExecutionBannerProps> = ({
  eyebrow,
  title,
  description,
  supportingText,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled = false,
  secondaryActionLabel,
  onSecondaryAction,
  meta,
  className,
  darkMode = false,
}) => {
  const normalizedTitle = normalizePresentationLabel(title, title)
    .replace(' â€¢ ', ' • ')
    .replace(/^(.*?)(?:\s+â€¢\s+|\s+•\s+)(\d+)\s+min de foco$/i, 'Agora e foco: $1 ($2 min)')
    .replace(/ min de foco$/i, ' min');

  return (
  <section className={`overflow-hidden rounded-2xl border p-5 shadow-[0_16px_34px_rgba(15,23,42,0.06)] ${
    darkMode
      ? 'border-slate-800 bg-[linear-gradient(135deg,rgba(15,23,42,0.98)_0%,rgba(2,6,23,0.96)_55%,rgba(12,74,110,0.18)_100%)]'
      : 'border-slate-300/85 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_20%),linear-gradient(135deg,rgba(224,232,241,0.98)_0%,rgba(214,224,235,0.97)_54%,rgba(221,231,240,0.96)_100%)] shadow-[0_18px_36px_rgba(100,116,139,0.20)]'
  } ${className || ''}`}>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 max-w-3xl">
        <p className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] ${
          darkMode ? 'text-cyan-300' : 'text-sky-700'
        }`}>
          <Sparkles className={`h-3.5 w-3.5 ${darkMode ? '' : 'text-sky-500'}`} />
          {eyebrow}
        </p>
        <h2 className={`mt-3 truncate text-2xl font-bold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} title={normalizedTitle}>{normalizedTitle}</h2>
        <div className="mt-2 space-y-1">
          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{description}</p>
          {supportingText && (
            <p className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{supportingText}</p>
          )}
        </div>
      </div>

      <div className="mt-1 flex w-full flex-wrap gap-2 lg:mt-0 lg:w-auto">
        <button
          onClick={onPrimaryAction}
          disabled={primaryActionDisabled}
          className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-semibold shadow-sm sm:w-auto disabled:cursor-not-allowed disabled:opacity-60 ${
            darkMode
              ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {primaryActionLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
        {secondaryActionLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
              darkMode
                ? 'border-slate-700 bg-slate-950/82 text-slate-200 hover:bg-slate-900'
                : 'border-slate-300/85 bg-slate-200/86 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>

    {meta.length > 0 && (
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {meta.map((item) => (
          <div key={item.label} className={`min-w-0 rounded-xl border p-4 ${
            darkMode
              ? 'border-slate-800 bg-slate-950/76'
              : 'border-slate-300/85 bg-slate-200/80'
          }`}>
            <p className={`text-xs uppercase tracking-[0.12em] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{item.label}</p>
            <p className={`mt-2 truncate text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-800'}`} title={normalizePresentationLabel(item.value, item.value)}>
              {truncatePresentationLabel(item.value, 30, item.value)}
            </p>
          </div>
        ))}
      </div>
    )}
  </section>
  );
};
