import React from 'react';
import { BookOpen, Clock, Flame, Play } from 'lucide-react';
import type { StudyMode } from '../../hooks/useStudyMode';

interface StudyFocusPanelProps {
  todayMinutes: number;
  dailyGoalMinutes: number;
  currentStreak: number;
  currentDiscipline?: string;
  onStartFocus: () => void;
  studyMode: StudyMode;
}

export const StudyFocusPanel: React.FC<StudyFocusPanelProps> = ({
  todayMinutes,
  dailyGoalMinutes,
  currentStreak,
  currentDiscipline,
  onStartFocus,
  studyMode,
}) => {
  const dailyPercent =
    dailyGoalMinutes > 0 ? Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100)) : 0;
  const isFocus = studyMode === 'focus';

  return (
    <aside
      className={`rounded-2xl border p-5 flex flex-col gap-4 lg:sticky lg:top-24 self-start transition-all ${
        isFocus
          ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-5 rounded-full"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Painel de foco</h3>
      </div>

      {/* Disciplina atual */}
      {currentDiscipline && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <BookOpen size={15} className="text-blue-500 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Disciplina atual
            </p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
              {currentDiscipline}
            </p>
          </div>
        </div>
      )}

      {/* Tempo hoje */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-slate-400" />
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Estudado hoje
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300">
            {dailyPercent}%
          </span>
        </div>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-none">
          {todayMinutes}
          <span className="text-xs font-medium text-slate-400 ml-1">min</span>
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${dailyPercent}%`, backgroundColor: 'var(--color-primary)' }}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Meta: {dailyGoalMinutes} min/dia</p>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <Flame size={22} className="text-orange-400 shrink-0" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Streak atual
          </p>
          <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            {currentStreak}
            <span className="text-xs font-normal text-slate-400 ml-1">dias</span>
          </p>
        </div>
      </div>

      {/* CTA Iniciar foco */}
      <button
        type="button"
        onClick={onStartFocus}
        aria-label="Iniciar sessão de foco"
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white transition hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        <Play size={14} fill="white" />
        Iniciar foco
      </button>
    </aside>
  );
};
