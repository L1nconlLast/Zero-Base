import React from 'react';
import { Clock3, Sparkles } from 'lucide-react';
import { FocusTimerCard as LegacyFocusTimerCard } from '../../../components/Focus/FocusTimerCard';
import { truncatePresentationLabel } from '../../../utils/uiLabels';
import type { RuntimeStudyMode, StudySession } from '../types';

interface TimerCardProps {
  darkMode?: boolean;
  session: StudySession;
  currentMode: RuntimeStudyMode;
  onModeChange: (mode: RuntimeStudyMode) => void;
  pomodoroContent: React.ReactNode;
  freeTimerContent: React.ReactNode;
  timerSectionRef?: React.Ref<HTMLDivElement>;
}

const formatTime = (remainingSeconds: number) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const TimerCard: React.FC<TimerCardProps> = ({
  darkMode = false,
  session,
  currentMode,
  onModeChange,
  pomodoroContent,
  freeTimerContent,
  timerSectionRef,
}) => {
  return (
    <div className="space-y-4">
      <section className={`rounded-[28px] border p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)] ${
        darkMode
          ? 'border-slate-800 bg-[linear-gradient(135deg,rgba(15,23,42,0.98)_0%,rgba(2,6,23,0.96)_100%)] shadow-[0_18px_36px_rgba(2,6,23,0.45)]'
          : 'border-slate-300/85 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_20%),linear-gradient(135deg,rgba(226,234,242,0.98)_0%,rgba(217,226,236,0.97)_100%)] shadow-[0_18px_36px_rgba(100,116,139,0.18)]'
      }`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
              Sessao atual
            </div>
            <h2 className={`mt-2 truncate text-2xl font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} title={session.subject}>
              {truncatePresentationLabel(session.subject, 28, session.subject)}
            </h2>
            <p className={`mt-1 truncate text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} title={session.topic}>
              {truncatePresentationLabel(session.topic, 56, session.topic)}
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
              darkMode
                ? 'border-cyan-900/60 bg-cyan-950/40 text-cyan-200'
                : 'border-cyan-300/90 bg-cyan-100/92 text-cyan-800'
          }`}>
            <Clock3 className="h-4 w-4" />
            {formatTime(session.remainingSeconds)}
          </div>
        </div>
      </section>

      <LegacyFocusTimerCard
        darkMode={darkMode}
        currentMode={currentMode}
        onModeChange={onModeChange}
        pomodoroContent={pomodoroContent}
        freeTimerContent={freeTimerContent}
        timerSectionRef={timerSectionRef}
      />
    </div>
  );
};

export default TimerCard;
