import React from 'react';
import { ArrowRight, LucideIcon, Sparkles } from 'lucide-react';

interface GuidedEmptyStateCardProps {
  darkMode?: boolean;
  eyebrow?: string;
  title: string;
  description: string;
  hint?: string;
  icon?: LucideIcon;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

const shellClassName = (darkMode: boolean): string =>
  `rounded-[24px] border border-dashed p-5 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.22)] ${
    darkMode
      ? 'border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_38%),linear-gradient(145deg,rgba(2,6,23,0.96),rgba(15,23,42,0.84))]'
      : 'border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.1),transparent_40%),linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))]'
  }`;

const primaryButtonClassName = (darkMode: boolean): string =>
  `inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
    darkMode
      ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
      : 'bg-cyan-600 text-white hover:bg-cyan-700'
  }`;

const secondaryButtonClassName = (darkMode: boolean): string =>
  `inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
    darkMode
      ? 'border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }`;

export const GuidedEmptyStateCard: React.FC<GuidedEmptyStateCardProps> = ({
  darkMode = false,
  eyebrow = 'Proximo passo',
  title,
  description,
  hint,
  icon: Icon = Sparkles,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => (
  <div className={shellClassName(darkMode)}>
    <div className="flex flex-wrap items-start gap-4">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          darkMode ? 'bg-cyan-500/14 text-cyan-200' : 'bg-cyan-50 text-cyan-700'
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${darkMode ? 'text-cyan-200/80' : 'text-cyan-700/80'}`}>
          {eyebrow}
        </p>
        <h4 className={`mt-2 text-base font-black tracking-[-0.02em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
          {title}
        </h4>
        <p className={`mt-2 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          {description}
        </p>
        {hint ? (
          <p className={`mt-3 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {hint}
          </p>
        ) : null}
      </div>
    </div>

    {primaryActionLabel || secondaryActionLabel ? (
      <div className="mt-5 flex flex-wrap gap-3">
        {primaryActionLabel && onPrimaryAction ? (
          <button type="button" onClick={onPrimaryAction} className={primaryButtonClassName(darkMode)}>
            {primaryActionLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
        {secondaryActionLabel && onSecondaryAction ? (
          <button type="button" onClick={onSecondaryAction} className={secondaryButtonClassName(darkMode)}>
            {secondaryActionLabel}
          </button>
        ) : null}
      </div>
    ) : null}
  </div>
);

export default GuidedEmptyStateCard;
