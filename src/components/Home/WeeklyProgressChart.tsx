import React from 'react';

export interface WeeklyProgressPoint {
  key: string;
  label: string;
  value: number;
  isToday: boolean;
}

export interface WeeklyProgressChartProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  progressLabel: string;
  points: WeeklyProgressPoint[];
  darkMode?: boolean;
}

export const WeeklyProgressChart: React.FC<WeeklyProgressChartProps> = ({
  eyebrow = 'Resumo semanal',
  title,
  subtitle,
  progressLabel,
  points,
  darkMode = false,
}) => {
  const weeklyMax = Math.max(...points.map((item) => item.value), 1);

  return (
    <section className={`motion-enter motion-card rounded-[28px] border p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)] ${
      darkMode
        ? 'border-slate-800 bg-slate-950/92 shadow-[0_16px_34px_rgba(2,6,23,0.45)]'
        : 'border-slate-200 bg-white'
    }`}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{eyebrow}</div>
          <div className={`mt-1.5 text-[26px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{title}</div>
          <div className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</div>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-medium ${
          darkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-500'
        }`}>
          {progressLabel}
        </div>
      </div>
      <div className={`h-[220px] rounded-3xl p-4 ${darkMode ? 'bg-slate-900/72' : 'bg-slate-50'}`}>
        <div className="flex h-full items-end justify-between gap-2">
          {points.map((day) => {
            const height = Math.max(8, Math.round((day.value / weeklyMax) * 136));
            return (
              <div key={day.key} className="group flex flex-1 flex-col items-center justify-end gap-2">
                <div className="relative flex w-full items-end justify-center" style={{ height: 146 }}>
                  {day.value > 0 ? (
                    <span className={`absolute -top-7 rounded-md px-2 py-1 text-[11px] font-semibold ${
                      day.isToday
                        ? darkMode
                          ? 'bg-slate-100 text-slate-950 shadow-[0_10px_24px_rgba(2,6,23,0.35)]'
                          : 'bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]'
                        : 'bg-violet-500 text-white'
                    }`}>
                      {day.value}
                    </span>
                  ) : null}
                  <div
                    className={`w-8 rounded-t-[12px] transition-all duration-700 group-hover:-translate-y-1 ${day.isToday ? 'bg-[linear-gradient(180deg,#00E5FF_0%,#38bdf8_100%)] shadow-[0_12px_28px_rgba(34,211,238,0.28)]' : 'bg-[#00E5FF]/75'}`}
                    style={{ height: `${height}px` }}
                  />
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                  day.isToday
                    ? darkMode ? 'bg-slate-100 text-slate-950' : 'bg-slate-900 text-white'
                    : darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WeeklyProgressChart;
