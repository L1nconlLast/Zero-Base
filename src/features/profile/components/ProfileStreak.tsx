import React from 'react';
import { CalendarDays, Flame } from 'lucide-react';
import type { ProfileStreakData } from '../types';

interface ProfileStreakProps {
  darkMode?: boolean;
  data: ProfileStreakData;
}

const formatDayCount = (value: number): string =>
  `${value} ${value === 1 ? 'dia' : 'dias'}`;

export const ProfileStreak: React.FC<ProfileStreakProps> = ({
  darkMode = false,
  data,
}) => (
  <section
    data-testid="profile-streak-panel"
    className={`rounded-[30px] border px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:px-5 sm:py-5 ${
      darkMode
        ? 'border-slate-800 bg-slate-950/82 text-slate-100 shadow-[0_14px_34px_rgba(2,6,23,0.34)]'
        : 'border-slate-200/80 bg-slate-50/88 text-slate-900 shadow-[0_14px_34px_rgba(148,163,184,0.12)]'
    }`}
  >
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_300px] lg:items-start">
      <div className="max-w-2xl">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
          darkMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          Consistencia
        </p>
        <h2 className={`mt-2 text-[26px] font-black tracking-[-0.05em] sm:text-[28px] ${
          darkMode ? 'text-slate-100' : 'text-slate-900'
        }`}>
          Seu ritmo recente
        </h2>
        <p
          data-testid="profile-streak-consistency"
          className={`mt-2 text-sm ${
            darkMode ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          {data.consistencyLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
        <article
          className={`rounded-[20px] border px-4 py-3.5 ${
            darkMode ? 'border-slate-800 bg-slate-900/76' : 'border-slate-200/80 bg-white/88'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-[16px] ${
              darkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-500'
            }`}>
              <Flame className="h-4 w-4" />
            </span>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Sequencia atual
            </p>
          </div>
          <p
            data-testid="profile-streak-current"
            className={`mt-3 text-[30px] font-black tracking-[-0.05em] ${
              darkMode ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {formatDayCount(data.currentStreak)}
          </p>
        </article>

        <article
          className={`rounded-[20px] border px-4 py-3.5 ${
            darkMode ? 'border-slate-800 bg-slate-900/76' : 'border-slate-200/80 bg-white/88'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-[16px] ${
              darkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-500'
            }`}>
              <CalendarDays className="h-4 w-4" />
            </span>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Melhor marca
            </p>
          </div>
          <p
            data-testid="profile-streak-best"
            className={`mt-3 text-[30px] font-black tracking-[-0.05em] ${
              darkMode ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {formatDayCount(data.bestStreak)}
          </p>
        </article>
      </div>
    </div>

    <div
      className={`mt-4 rounded-[22px] border px-4 py-4 ${
        darkMode ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200/80 bg-white/84'
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm font-semibold ${
          darkMode ? 'text-slate-200' : 'text-slate-700'
        }`}>
          Ultimos 7 dias
        </p>
        <p
          data-testid="profile-streak-today-status"
          className={`text-[13px] ${
            data.activeToday
              ? darkMode ? 'text-emerald-300' : 'text-emerald-700'
              : darkMode ? 'text-amber-300' : 'text-amber-700'
          }`}
        >
          {data.activeToday ? 'Hoje ja contou na sequencia.' : 'Hoje ainda nao entrou na sequencia.'}
        </p>
      </div>

      <div data-testid="profile-streak-recent-days" className="mt-3 grid grid-cols-7 gap-2">
        {data.recentDays.map((day) => (
          <div
            key={day.date}
            data-testid={`profile-streak-day-${day.date}`}
            className={`rounded-[16px] border px-1.5 py-2.5 text-center ${
              day.active
                ? darkMode
                  ? 'border-emerald-900 bg-emerald-950/40'
                  : 'border-emerald-200 bg-emerald-50'
                : darkMode
                  ? 'border-slate-800 bg-slate-950/70'
                  : 'border-slate-200 bg-slate-50'
            } ${day.isToday ? (darkMode ? 'ring-1 ring-sky-500/60' : 'ring-1 ring-sky-300') : ''}`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
              day.active
                ? darkMode ? 'text-emerald-300' : 'text-emerald-700'
                : darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {day.label}
            </p>
            <span
              aria-hidden="true"
              className={`mx-auto mt-2 block h-2.5 w-2.5 rounded-full ${
                day.active
                  ? darkMode ? 'bg-emerald-300' : 'bg-emerald-600'
                  : darkMode ? 'bg-slate-600' : 'bg-slate-300'
              }`}
            />
          </div>
        ))}
      </div>

      <p
        data-testid="profile-streak-recent-summary"
        className={`mt-3 text-sm ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        {data.recentActiveCount} de 7 dias ativos na janela recente.
      </p>
    </div>
  </section>
);

export default ProfileStreak;
