import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';

import type { PanelActionFeedbackState } from '../../hooks/usePanelActionFeedback';

interface PanelActionFeedbackProps {
  darkMode?: boolean;
  feedback: PanelActionFeedbackState;
  onRetry?: () => void;
  className?: string;
}

const shellClassName = (darkMode: boolean, phase: PanelActionFeedbackState['phase']): string => {
  if (phase === 'loading') {
    return darkMode
      ? 'border-cyan-800 bg-cyan-950/40 text-cyan-100'
      : 'border-cyan-200 bg-cyan-50 text-cyan-900';
  }

  if (phase === 'success') {
    return darkMode
      ? 'border-emerald-800 bg-emerald-950/40 text-emerald-100'
      : 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }

  if (phase === 'error') {
    return darkMode
      ? 'border-rose-800 bg-rose-950/40 text-rose-100'
      : 'border-rose-200 bg-rose-50 text-rose-900';
  }

  return darkMode
    ? 'border-slate-800 bg-slate-950/70 text-slate-100'
    : 'border-slate-200 bg-white text-slate-900';
};

export const PanelActionFeedback: React.FC<PanelActionFeedbackProps> = ({
  darkMode = false,
  feedback,
  onRetry,
  className = '',
}) => {
  if (feedback.phase === 'idle') {
    return null;
  }

  const Icon =
    feedback.phase === 'loading' ? Loader2 : feedback.phase === 'success' ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={`rounded-[22px] border px-4 py-3 shadow-sm ${shellClassName(darkMode, feedback.phase)} ${className}`.trim()}
      role={feedback.phase === 'error' ? 'alert' : 'status'}
      aria-live={feedback.phase === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/50 dark:bg-black/10">
          <Icon className={`h-5 w-5 ${feedback.phase === 'loading' ? 'animate-spin' : ''}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{feedback.title}</p>
          {feedback.detail ? <p className="mt-1 text-sm opacity-90">{feedback.detail}</p> : null}
        </div>
        {feedback.phase === 'error' && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
              darkMode
                ? 'border-rose-700 bg-rose-900/40 text-rose-100 hover:bg-rose-900/60'
                : 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            {feedback.retryLabel || 'Tentar novamente'}
          </button>
        ) : null}
      </div>
    </div>
  );
};
