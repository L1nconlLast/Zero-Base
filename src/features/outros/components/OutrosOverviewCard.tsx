import React from 'react';

interface OutrosOverviewCardProps {
  darkMode?: boolean;
  title: string;
  description: string;
  badge?: string | null;
  featured?: boolean;
  children: React.ReactNode;
}

export const OutrosOverviewCard: React.FC<OutrosOverviewCardProps> = ({
  darkMode = false,
  title,
  description,
  badge = null,
  featured = false,
  children,
}) => (
  <article
    className={`rounded-[26px] border p-5 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.16)] ${
      featured
        ? darkMode
          ? 'border-cyan-800/70 bg-[linear-gradient(135deg,rgba(8,47,73,0.94),rgba(15,23,42,0.98))]'
          : 'border-cyan-200 bg-[linear-gradient(135deg,rgba(236,254,255,0.98),rgba(239,246,255,0.96))]'
        : darkMode
          ? 'border-slate-800 bg-slate-950/72'
          : 'border-slate-200/80 bg-white/92'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
          darkMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          {title}
        </p>
        <p className={`mt-2 text-sm leading-6 ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        }`}>
          {description}
        </p>
      </div>
      {badge ? (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
          darkMode
            ? 'border-slate-700 bg-slate-950 text-slate-300'
            : 'border-slate-200 bg-white text-slate-500'
        }`}>
          {badge}
        </span>
      ) : null}
    </div>
    <div className="mt-4">
      {children}
    </div>
  </article>
);

export default OutrosOverviewCard;
