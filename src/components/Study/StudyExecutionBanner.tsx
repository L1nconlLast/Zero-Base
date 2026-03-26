import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

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
}) => {
  const normalizedTitle = title
    .replace(' â€¢ ', ' • ')
    .replace(/^(.*?)(?:\s+â€¢\s+|\s+•\s+)(\d+)\s+min de foco$/i, 'Agora e foco: $1 ($2 min)')
    .replace(/ min de foco$/i, ' min');

  return (
  <section className={`rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-5 shadow-sm ${className || ''}`}>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
          <Sparkles className="h-3.5 w-3.5" />
          {eyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{normalizedTitle}</h2>
        <div className="mt-2 space-y-1">
          <p className="text-sm text-slate-600">{description}</p>
          {supportingText && (
            <p className="text-sm text-slate-700">{supportingText}</p>
          )}
        </div>
      </div>

      <div className="mt-1 flex w-full flex-wrap gap-2 lg:mt-0 lg:w-auto">
        <button
          onClick={onPrimaryAction}
          disabled={primaryActionDisabled}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-slate-800 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
        >
          {primaryActionLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
        {secondaryActionLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>

    {meta.length > 0 && (
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {meta.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
            <p className="mt-2 text-sm font-medium text-slate-800">{item.value}</p>
          </div>
        ))}
      </div>
    )}
  </section>
  );
};
