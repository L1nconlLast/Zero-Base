import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { SupportClosureData } from '../types';

interface SupportClosureProps {
  data?: SupportClosureData;
  darkMode?: boolean;
  children?: React.ReactNode;
}

export const SupportClosure: React.FC<SupportClosureProps> = ({
  data,
  darkMode = false,
  children,
}) => {
  if (!data) {
    return null;
  }

  const toneClass = data.emphasis === 'calm'
    ? darkMode
      ? 'border-emerald-900/45 bg-emerald-950/12'
      : 'border-emerald-200/75 bg-emerald-50/64'
    : darkMode
      ? 'border-slate-800/90 bg-slate-950/32'
      : 'border-slate-200/80 bg-white/48';

  return (
    <section data-testid="study-support-closure">
      <div className={`rounded-[18px] border px-4 py-3.5 ${toneClass}`}>
        <div className="flex items-start gap-3">
          <span className={data.emphasis === 'calm' ? 'text-emerald-500 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500'}>
            <CheckCircle2 className="mt-0.5 h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
              darkMode ? 'text-slate-500' : 'text-slate-500'
            }`}>
              {data.title || 'Fechamento'}
            </p>
            <p className={`mt-2 text-[13px] leading-5 ${
              darkMode ? 'text-slate-200' : 'text-slate-800'
            }`}>
              {data.message}
            </p>
            {data.actionLabel ? (
              <p className={`mt-2 text-[11px] font-semibold ${
                data.emphasis === 'calm'
                  ? 'text-emerald-600 dark:text-emerald-300'
                  : darkMode
                    ? 'text-slate-400'
                    : 'text-slate-600'
              }`}>
                {data.actionLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
};

export default SupportClosure;
