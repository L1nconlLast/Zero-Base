import React from 'react';
import { Flag, Gauge, Sparkles, TimerReset } from 'lucide-react';
import { ModeSelector } from '../../../components/Timer/ModeSelector';
import type { ExecutionCoreData, RuntimeStudyMode } from '../types';

interface ExecutionCoreProps {
  darkMode?: boolean;
  data: ExecutionCoreData;
  currentMode: RuntimeStudyMode;
  onModeChange: (mode: RuntimeStudyMode) => void;
  timerSectionRef?: React.Ref<HTMLDivElement>;
  pomodoroContent: React.ReactNode;
  freeTimerContent: React.ReactNode;
}

const EMPHASIS_STYLES: Record<NonNullable<ExecutionCoreData['emphasisLevel']>, {
  container: string;
  chip: string;
  bar: string;
}> = {
  default: {
    container: 'border-slate-200/90 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_20%),linear-gradient(180deg,rgba(240,245,250,0.98)_0%,rgba(230,237,244,0.96)_100%)] shadow-[0_14px_30px_rgba(148,163,184,0.16)] dark:border-slate-800/90 dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.08),transparent_22%),linear-gradient(180deg,rgba(15,23,42,0.95)_0%,rgba(2,6,23,0.94)_100%)] dark:shadow-[0_16px_30px_rgba(2,6,23,0.42)]',
    chip: 'border-cyan-300/90 bg-cyan-100/92 text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/36 dark:text-cyan-200',
    bar: 'bg-cyan-500',
  },
  calm: {
    container: 'border-slate-200/90 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.10),transparent_20%),linear-gradient(180deg,rgba(240,245,250,0.98)_0%,rgba(231,238,245,0.96)_100%)] shadow-[0_14px_30px_rgba(148,163,184,0.14)] dark:border-slate-800/90 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.95)_0%,rgba(2,6,23,0.94)_100%)] dark:shadow-[0_16px_30px_rgba(2,6,23,0.40)]',
    chip: 'border-amber-300/90 bg-amber-100/92 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/36 dark:text-amber-200',
    bar: 'bg-amber-500',
  },
  urgent: {
    container: 'border-slate-200/90 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_20%),linear-gradient(180deg,rgba(239,246,242,0.98)_0%,rgba(229,239,234,0.96)_100%)] shadow-[0_14px_30px_rgba(148,163,184,0.14)] dark:border-slate-800/90 dark:bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.06),transparent_22%),linear-gradient(180deg,rgba(6,24,18,0.95)_0%,rgba(2,6,23,0.94)_100%)] dark:shadow-[0_16px_30px_rgba(2,6,23,0.40)]',
    chip: 'border-emerald-300/90 bg-emerald-100/92 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/36 dark:text-emerald-200',
    bar: 'bg-emerald-500',
  },
};

export const ExecutionCore: React.FC<ExecutionCoreProps> = ({
  darkMode = false,
  data,
  currentMode,
  onModeChange,
  timerSectionRef,
  pomodoroContent,
  freeTimerContent,
}) => {
  const emphasis = data.emphasisLevel || 'default';
  const emphasisStyles = EMPHASIS_STYLES[emphasis];
  const progressPercent = Math.max(0, Math.min(100, data.progressPercent ?? 0));
  const eyebrowLabel = data.eyebrowLabel || 'Nucleo da sessao';
  const progressTitle = data.progressTitle || 'Progresso da sessao';
  const controlsLabel = data.controlsLabel || 'Modo de execucao';
  const controlsDescription = data.controlsDescription || 'Troque o ritmo da sessao sem sair do bloco principal.';

  return (
    <section
      className={`rounded-[28px] border p-5 sm:p-6 ${emphasisStyles.container}`}
      data-testid="study-execution-core"
    >
      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p
              className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                darkMode ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
              {eyebrowLabel}
            </p>
            <h2
              className={`mt-2 text-[26px] font-bold tracking-[-0.03em] ${
                darkMode ? 'text-slate-100' : 'text-slate-900'
              }`}
              data-testid="study-execution-goal"
            >
              {data.primaryGoal}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${emphasisStyles.chip}`}
                data-testid="study-execution-state"
              >
                <Gauge className="h-3.5 w-3.5" />
                {data.timerStateLabel}
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  darkMode
                    ? 'border-slate-700 bg-slate-900 text-slate-200'
                    : 'border-slate-300/85 bg-slate-100/88 text-slate-700'
                }`}
                data-testid="study-execution-timer-label"
              >
                <TimerReset className="h-3.5 w-3.5 text-slate-500" />
                {data.timerLabel}
              </span>
            </div>
          </div>

          <div
            className={`rounded-[20px] border px-4 py-3 lg:max-w-[280px] ${
              darkMode
                ? 'border-slate-800/90 bg-slate-950/64'
                : 'border-slate-200/90 bg-white/64'
            }`}
            data-testid="study-execution-progress"
          >
            <div className="flex items-center justify-between gap-3">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
              darkMode ? 'text-slate-500' : 'text-slate-500'
            }`}>
              {progressTitle}
              </p>
              {data.currentStepLabel ? (
                <span className={`text-xs font-semibold ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  {data.currentStepLabel}
                </span>
              ) : null}
            </div>
            {data.progressLabel ? (
              <p className={`mt-2 text-sm font-semibold ${
                darkMode ? 'text-slate-100' : 'text-slate-900'
              }`}>
                {data.progressLabel}
              </p>
            ) : null}
            {data.secondaryProgressLabel ? (
              <p className={`mt-1 text-xs ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {data.secondaryProgressLabel}
              </p>
            ) : null}
            <div className={`mt-3 h-2 overflow-hidden rounded-full ${
              darkMode ? 'bg-slate-800' : 'bg-slate-200/90'
            }`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ${emphasisStyles.bar}`}
                style={{ width: `${progressPercent}%` }}
                data-testid="study-execution-progress-bar"
              />
            </div>
          </div>
        </div>

        <div
          className={`rounded-[22px] border p-4 ${
            darkMode
              ? 'border-slate-800/90 bg-slate-950/62'
              : 'border-slate-200/90 bg-white/62'
          }`}
          data-testid="study-execution-controls"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                darkMode ? 'text-slate-500' : 'text-slate-500'
              }`}>
                <Flag className="h-3.5 w-3.5 text-cyan-500" />
                {controlsLabel}
              </p>
              <p className={`mt-1 text-sm ${
                darkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                {controlsDescription}
              </p>
            </div>
            {data.currentStepLabel ? (
              <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                darkMode
                  ? 'border-slate-700 bg-slate-900 text-slate-200'
                  : 'border-slate-300/85 bg-white/80 text-slate-700'
              }`}>
                {data.currentStepLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-4">
            <ModeSelector currentMode={currentMode} onModeChange={onModeChange} />
          </div>

          <div ref={timerSectionRef} data-testid="study-execution-timer-surface">
            {currentMode === 'pomodoro' ? pomodoroContent : freeTimerContent}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExecutionCore;
