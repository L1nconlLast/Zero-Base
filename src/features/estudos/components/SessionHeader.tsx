import React from 'react';
import { ArrowRight, CheckCircle2, PauseCircle, PlayCircle } from 'lucide-react';
import type { SessionHeaderData, SessionHeaderStatus } from '../types';

interface SessionHeaderProps {
  data: SessionHeaderData;
  darkMode?: boolean;
}

const STATUS_COPY: Record<SessionHeaderStatus, string> = {
  idle: 'Pronta para comecar',
  running: 'Em andamento',
  paused: 'Pausada',
  ready_to_finish: 'Pronta para fechar',
};

const STATUS_ICON: Record<SessionHeaderStatus, React.ComponentType<{ className?: string }>> = {
  idle: PlayCircle,
  running: PlayCircle,
  paused: PauseCircle,
  ready_to_finish: CheckCircle2,
};

const STATUS_TONE: Record<SessionHeaderStatus, { chip: string; icon: string }> = {
  idle: {
    chip: 'border-slate-300/85 bg-slate-100/88 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
    icon: 'text-slate-500 dark:text-slate-300',
  },
  running: {
    chip: 'border-cyan-300/90 bg-cyan-100/92 text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200',
    icon: 'text-cyan-500 dark:text-cyan-300',
  },
  paused: {
    chip: 'border-amber-300/90 bg-amber-100/92 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/36 dark:text-amber-200',
    icon: 'text-amber-500 dark:text-amber-300',
  },
  ready_to_finish: {
    chip: 'border-emerald-300/90 bg-emerald-100/92 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/36 dark:text-emerald-200',
    icon: 'text-emerald-500 dark:text-emerald-300',
  },
};

const renderInlineMeta = (items: string[], darkMode: boolean) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm ${
        darkMode ? 'text-slate-400' : 'text-slate-600'
      }`}
      data-testid="study-session-header-meta"
    >
      {items.map((item, index) => (
        <React.Fragment key={`${item}-${index}`}>
          {index > 0 ? (
            <span className={darkMode ? 'text-slate-600' : 'text-slate-400'}>/</span>
          ) : null}
          <span>{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
};

export const SessionHeader: React.FC<SessionHeaderProps> = ({ data, darkMode = false }) => {
  const StatusIcon = STATUS_ICON[data.status];
  const statusCopy = data.statusLabel || STATUS_COPY[data.status];
  const statusTone = STATUS_TONE[data.status];
  const metaItems = [
    data.plannedMinutes ? `${data.plannedMinutes} min planejados` : null,
    data.currentStepLabel || null,
    data.progressLabel || null,
  ].filter((item): item is string => Boolean(item));

  return (
    <section
      className={`rounded-[24px] border px-5 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.04)] sm:px-5 sm:py-4 ${
        darkMode
          ? 'border-slate-800/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.94)_0%,rgba(2,6,23,0.92)_100%)] shadow-[0_12px_24px_rgba(2,6,23,0.34)]'
          : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(239,244,249,0.98)_0%,rgba(232,239,245,0.96)_100%)] shadow-[0_12px_24px_rgba(148,163,184,0.14)]'
      }`}
      data-testid="study-session-header"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p
            className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
              darkMode ? 'text-slate-500' : 'text-slate-500'
            }`}
            data-testid="study-session-header-context"
          >
            <span>{data.contextLabel}</span>
            <span className={darkMode ? 'text-slate-700' : 'text-slate-400'}>/</span>
            <span>{data.sessionTypeLabel}</span>
          </p>
          <h1
            className={`mt-2 text-[27px] font-bold tracking-[-0.03em] ${
              darkMode ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {data.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusTone.chip}`}
              data-testid="study-session-header-status"
            >
              <StatusIcon className={`h-3.5 w-3.5 ${statusTone.icon}`} />
              {statusCopy}
            </span>
            {renderInlineMeta(metaItems, darkMode)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            onClick={data.onPrimaryAction}
            disabled={data.primaryActionDisabled}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              darkMode
                ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {data.primaryActionLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
          {data.secondaryActionLabel && data.onSecondaryAction ? (
            <button
              type="button"
              onClick={data.onSecondaryAction}
              className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                darkMode
                  ? 'border-slate-700 bg-slate-950/72 text-slate-300 hover:bg-slate-900'
                  : 'border-slate-200/90 bg-white/74 text-slate-700 hover:bg-slate-100/90'
              }`}
            >
              {data.secondaryActionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default SessionHeader;
