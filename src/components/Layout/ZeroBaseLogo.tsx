import React from 'react';

interface ZeroBaseLogoProps {
  compact?: boolean;
  tone?: 'default' | 'light';
}

export const ZeroBaseLogo: React.FC<ZeroBaseLogoProps> = ({ compact = false, tone = 'default' }) => {
  const titleClass = tone === 'light' ? 'text-white' : 'text-slate-900 dark:text-white';
  const subtitleClass = tone === 'light' ? 'text-white/70' : 'text-slate-500 dark:text-slate-400';

  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-2xl border ${
          tone === 'light'
            ? 'border-white/20 bg-white/10 shadow-[0_20px_45px_-26px_rgba(15,23,42,0.95)]'
            : 'border-slate-200/70 bg-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-900'
        } ${compact ? 'h-10 w-10' : 'h-11 w-11'}`}
      >
        <div
          className="absolute inset-0 opacity-95"
          style={{
            background:
              'radial-gradient(circle at 28% 24%, rgba(255,255,255,0.92), transparent 32%), linear-gradient(135deg, #7dd3fc, #6366f1)',
          }}
        />
        <span className="relative z-10 text-lg font-black tracking-[-0.06em] text-white">
          Z
        </span>
      </div>

      {!compact && (
        <div>
          <h1 className={`text-xl font-black tracking-[-0.03em] ${titleClass}`}>Zero Base</h1>
          <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${subtitleClass}`}>study operating system</p>
        </div>
      )}
    </div>
  );
};
