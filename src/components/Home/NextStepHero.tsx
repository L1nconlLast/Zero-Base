import React from 'react';
import { ArrowRight, TrendingUp, Zap } from 'lucide-react';
import { normalizePresentationLabel, truncatePresentationLabel } from '../../utils/uiLabels';
import type { HomePresentationTone } from './homeTodayPresentation';

export interface NextStepHeroProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  insight: string;
  supportingText?: string;
  chips?: string[];
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  testId?: string;
  cardStatus?: 'loading' | 'error' | 'empty' | 'ready';
  studyDiscipline?: string;
  studyTopic?: string;
  reasonText?: string;
  weeklyProgressLabel?: string;
  weeklyProgressRatio?: number | null;
  darkMode?: boolean;
  mode?: 'default' | 'activation';
  tone?: HomePresentationTone;
}

export const NextStepHero: React.FC<NextStepHeroProps> = ({
  eyebrow = 'destaque do dia',
  title,
  subtitle,
  insight,
  supportingText,
  chips,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  testId,
  cardStatus = 'ready',
  studyDiscipline,
  studyTopic,
  reasonText,
  weeklyProgressLabel,
  weeklyProgressRatio,
  darkMode = false,
  mode = 'default',
  tone = 'default',
}) => {
  const safeSubtitle = normalizePresentationLabel(subtitle, subtitle);
  const isActivationMode = mode === 'activation';
  const hasSecondaryAction = Boolean(secondaryActionLabel && onSecondaryAction);
  const safeChips = chips || [];
  const resolvedTone = isActivationMode ? 'default' : tone;
  const chipContainerClass = isActivationMode
    ? 'mt-6 grid gap-2.5 sm:grid-cols-3'
    : 'mt-5 flex flex-wrap gap-2';
  const shellToneClass = darkMode
    ? {
        default: 'border-cyan-300/25 bg-[linear-gradient(135deg,#0f172a_0%,#111827_40%,#1e293b_100%)] text-white',
        active: 'border-amber-300/25 bg-[linear-gradient(135deg,#111827_0%,#1f2937_42%,#3f2b13_100%)] text-white',
        completed: 'border-emerald-300/25 bg-[linear-gradient(135deg,#052e2b_0%,#0f172a_45%,#134e4a_100%)] text-white',
      }[resolvedTone]
    : {
        default: 'border-sky-100/90 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.11),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.1),transparent_24%),linear-gradient(135deg,#f8fbff_0%,#eef5fb_45%,#eaf3fb_100%)] text-slate-900 shadow-[0_22px_48px_-34px_rgba(125,211,252,0.28)]',
        active: 'border-amber-100/90 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.12),transparent_26%),linear-gradient(135deg,#fffaf0_0%,#fff4dd_42%,#ffedd5_100%)] text-slate-900 shadow-[0_22px_48px_-34px_rgba(251,191,36,0.32)]',
        completed: 'border-emerald-100/90 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.15),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.12),transparent_26%),linear-gradient(135deg,#f5fffb_0%,#ecfdf5_44%,#dcfce7_100%)] text-slate-900 shadow-[0_22px_48px_-34px_rgba(16,185,129,0.24)]',
      }[resolvedTone];
  const overlayToneClass = darkMode
    ? {
        default: 'bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.26),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.24),transparent_24%)]',
        active: 'bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.24),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.2),transparent_26%)]',
        completed: 'bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.24),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.22),transparent_26%)]',
      }[resolvedTone]
    : {
        default: 'bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(196,181,253,0.16),transparent_26%)]',
        active: 'bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.16),transparent_26%)]',
        completed: 'bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.16),transparent_26%)]',
      }[resolvedTone];
  const eyebrowToneClass = darkMode
    ? 'border-white/15 bg-white/10 text-white/80'
    : resolvedTone === 'active'
      ? 'border-amber-100/90 bg-white/78 text-amber-800'
      : resolvedTone === 'completed'
        ? 'border-emerald-100/90 bg-white/78 text-emerald-800'
        : 'border-sky-100/90 bg-white/78 text-sky-800';
  const accentToneClass = darkMode
    ? resolvedTone === 'active'
      ? 'text-amber-300'
      : resolvedTone === 'completed'
        ? 'text-emerald-300'
        : 'text-cyan-300'
    : resolvedTone === 'active'
      ? 'text-amber-600'
      : resolvedTone === 'completed'
        ? 'text-emerald-600'
        : 'text-sky-600';
  const insightToneClass = darkMode
    ? 'border-white/12 bg-white/8 text-white/80'
    : resolvedTone === 'active'
      ? 'border-amber-100 bg-white/80 text-slate-700'
      : resolvedTone === 'completed'
        ? 'border-emerald-100 bg-white/80 text-slate-700'
        : 'border-sky-100 bg-white/76 text-slate-700';
  const progressToneClass = darkMode
    ? 'border-white/12 bg-white/8'
    : resolvedTone === 'active'
      ? 'border-amber-100/90 bg-white/78'
      : resolvedTone === 'completed'
        ? 'border-emerald-100/90 bg-white/78'
        : 'border-sky-100/90 bg-white/76';
  const progressBarToneClass = resolvedTone === 'active'
    ? 'bg-amber-300'
    : resolvedTone === 'completed'
      ? 'bg-emerald-300'
      : 'bg-cyan-300';
  const primaryActionToneClass = resolvedTone === 'active'
    ? 'bg-amber-300 text-slate-950 shadow-[0_16px_36px_rgba(251,191,36,0.28)] hover:bg-amber-200'
    : resolvedTone === 'completed'
      ? 'bg-emerald-300 text-slate-950 shadow-[0_16px_36px_rgba(52,211,153,0.24)] hover:bg-emerald-200'
      : 'bg-cyan-300 text-slate-950 shadow-[0_16px_36px_rgba(34,211,238,0.28)] hover:bg-cyan-200';

  return (
    <section
      data-testid={testId}
      data-card-status={cardStatus}
      data-study-discipline={studyDiscipline}
      data-study-topic={studyTopic}
      data-tone={resolvedTone}
      className={`motion-enter relative overflow-hidden rounded-[28px] border shadow-[0_24px_56px_rgba(15,23,42,0.14)] ${shellToneClass}`}
    >
      <div className={`absolute inset-0 ${overlayToneClass}`} />
      <div className={`relative ${isActivationMode ? 'p-7 sm:p-10' : 'p-5 sm:p-6'}`}>
        <div className={isActivationMode ? 'mx-auto max-w-2xl text-center' : ''}>
          <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] ${eyebrowToneClass}`}>
            <Zap className={`h-3.5 w-3.5 ${accentToneClass}`} />
            {eyebrow}
          </div>
          <div className={`${isActivationMode ? 'mx-auto max-w-2xl text-[34px] sm:text-[48px]' : 'max-w-[620px] text-[30px] sm:text-[40px]'} font-black leading-[1.04] tracking-[-0.04em]`}>
            {title}
          </div>
          <div className={`mt-3 ${isActivationMode ? 'mx-auto max-w-lg text-sm sm:text-base' : 'max-w-[500px] text-[15px] font-semibold'} ${darkMode ? 'text-white/78' : 'text-slate-700'}`} title={safeSubtitle}>
            {safeSubtitle}
          </div>
          <div className={`${isActivationMode ? 'mt-6 flex justify-center' : 'mt-3.5'}`}>
            <div className={`inline-flex max-w-[620px] items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium ${insightToneClass}`}>
              <TrendingUp className={`h-4 w-4 ${accentToneClass}`} />
              <span
                data-testid={reasonText ? 'study-now-card-reason' : undefined}
                className="min-w-0"
              >
                {reasonText || insight}
              </span>
            </div>
          </div>
          {supportingText ? (
            <p className={`mt-3 ${isActivationMode ? 'mx-auto max-w-xl' : 'max-w-[680px]'} text-sm ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>{supportingText}</p>
          ) : null}
        </div>
        {weeklyProgressLabel ? (
          <div
            data-testid="study-now-card-weekly-progress"
            className={`mt-4 rounded-2xl border p-3.5 ${progressToneClass}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>
                Progresso semanal
              </p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-white/90' : 'text-slate-900'}`}>{weeklyProgressLabel}</p>
            </div>
            <div className={`mt-3 h-2 overflow-hidden rounded-full ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
              <div
                data-testid="study-now-card-weekly-progress-bar"
                className={`h-full rounded-full transition-all duration-700 ${progressBarToneClass}`}
                style={{ width: `${Math.max(4, Math.round((weeklyProgressRatio || 0) * 100))}%` }}
              />
            </div>
          </div>
        ) : null}
        <div className={`mt-5 flex flex-wrap items-center gap-2.5 ${isActivationMode ? 'justify-center' : ''}`}>
          <button
            type="button"
            onClick={onPrimaryAction}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${primaryActionToneClass} ${
              isActivationMode ? 'min-h-14 w-full sm:w-auto sm:min-w-[360px] text-base' : 'min-w-[220px]'
            }`}
          >
            {primaryActionLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
          {hasSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
                darkMode
                  ? 'border-white/15 bg-white/8 text-white hover:bg-white/14'
                  : 'border-slate-200 bg-white/82 text-slate-700 hover:bg-white'
              }`}
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
        {safeChips.length > 0 ? (
          <div className={chipContainerClass}>
            {safeChips.map((item) => (
            <div
              key={item}
              className={`min-w-0 overflow-hidden ${isActivationMode ? 'rounded-2xl px-3.5 py-2.5 text-sm' : 'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]'} border ${
                darkMode ? 'border-white/12 bg-white/8 text-white/80' : 'border-sky-100/90 bg-white/76 text-slate-700'
              }`}
              title={normalizePresentationLabel(item, item)}
            >
              <span className="block truncate">{truncatePresentationLabel(item, 40, item)}</span>
            </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default NextStepHero;
