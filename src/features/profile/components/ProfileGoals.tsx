import React from 'react';
import { CheckCircle2, Flag, Gauge, Target } from 'lucide-react';
import type { ProfileGoalsData, ProfileGoalStatus } from '../types';

interface ProfileGoalsProps {
  darkMode?: boolean;
  data: ProfileGoalsData;
}

const statusCopy: Record<ProfileGoalStatus, { label: string; icon: typeof Gauge }> = {
  on_track: { label: 'No ritmo', icon: Gauge },
  completed: { label: 'Concluida', icon: CheckCircle2 },
  behind: { label: 'Precisa atencao', icon: Flag },
  empty: { label: 'Sem meta', icon: Target },
};

export const ProfileGoals: React.FC<ProfileGoalsProps> = ({
  darkMode = false,
  data,
}) => {
  const goal = data.primaryGoal;
  const statusMeta = statusCopy[goal.status];
  const StatusIcon = statusMeta.icon;

  return (
    <section
      data-testid="profile-goals-panel"
      className={`rounded-[30px] border px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:px-5 sm:py-5 ${
        darkMode
          ? 'border-slate-800 bg-slate-950/78 text-slate-100 shadow-[0_14px_34px_rgba(2,6,23,0.34)]'
          : 'border-slate-200/80 bg-slate-50/88 text-slate-900 shadow-[0_14px_34px_rgba(148,163,184,0.12)]'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}>
            Meta simples
          </p>
          <h2 className={`mt-2 text-[26px] font-black tracking-[-0.05em] sm:text-[28px] ${
            darkMode ? 'text-slate-100' : 'text-slate-900'
          }`}>
            {goal.title}
          </h2>
          <p
            data-testid="profile-goal-helper"
            className={`mt-2 text-sm ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {goal.helperLabel}
          </p>
        </div>

        <span
          data-testid="profile-goal-status"
          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] ${
            goal.status === 'completed'
              ? darkMode ? 'bg-emerald-950/60 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
              : goal.status === 'on_track'
                ? darkMode ? 'bg-sky-950/60 text-sky-300' : 'bg-sky-100 text-sky-700'
                : goal.status === 'behind'
                  ? darkMode ? 'bg-amber-950/60 text-amber-300' : 'bg-amber-100 text-amber-700'
                  : darkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600'
          }`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {statusMeta.label}
        </span>
      </div>

      <div
        className={`mt-4 rounded-[22px] border px-4 py-4 ${
          darkMode ? 'border-slate-800 bg-slate-900/72' : 'border-slate-200/80 bg-white/84'
        }`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Alvo principal
            </p>
            <p
              data-testid="profile-goal-progress"
              className={`mt-2 text-[26px] font-black tracking-[-0.05em] sm:text-[28px] ${
                darkMode ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              {goal.progressLabel}
            </p>
          </div>

          <div className="text-right">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Meta
            </p>
            <p
              data-testid="profile-goal-target"
              className={`mt-2 text-sm font-semibold ${
                darkMode ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              {goal.targetLabel}
            </p>
          </div>
        </div>

        <div className={`mt-4 h-2.5 overflow-hidden rounded-full ${
          darkMode ? 'bg-slate-950' : 'bg-slate-100'
        }`}>
          <div
            data-testid="profile-goal-bar"
            className={`h-full rounded-full transition-[width] ${
              goal.status === 'completed'
                ? 'bg-emerald-500'
                : goal.status === 'behind'
                  ? 'bg-amber-500'
                  : goal.status === 'empty'
                    ? darkMode ? 'bg-slate-700' : 'bg-slate-300'
                    : 'bg-sky-500'
            }`}
            style={{ width: `${goal.completionPercent}%` }}
          />
        </div>

        {goal.remainingLabel ? (
          <p
            data-testid="profile-goal-remaining"
            className={`mt-3 text-sm ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {goal.remainingLabel}
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default ProfileGoals;
