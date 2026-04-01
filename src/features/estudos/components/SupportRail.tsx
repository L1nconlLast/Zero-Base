import React from 'react';
import { SupportChecklist } from './SupportChecklist';
import { SupportClosure } from './SupportClosure';
import type { SupportRailData } from '../types';

interface SupportRailProps {
  data: SupportRailData;
  darkMode?: boolean;
  children?: React.ReactNode;
}

export const SupportRail: React.FC<SupportRailProps> = ({
  data,
  darkMode = false,
  children,
}) => {
  const eyebrow = data.eyebrow || 'Apoio da sessao';

  return (
    <aside
      className={`rounded-[22px] border px-4 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.03)] ${
        darkMode
          ? 'border-slate-800/90 bg-slate-950/64 shadow-[0_10px_20px_rgba(2,6,23,0.26)]'
          : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(243,246,250,0.96)_0%,rgba(236,241,246,0.94)_100%)] shadow-[0_10px_20px_rgba(148,163,184,0.10)]'
      }`}
      data-testid="study-support-rail"
    >
      <div data-testid="study-support-intro">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
          darkMode ? 'text-slate-500' : 'text-slate-500'
        }`}>
          {eyebrow}
        </p>
        {data.intro ? (
          <p className={`mt-2 text-[13px] leading-5 ${
            darkMode ? 'text-slate-300' : 'text-slate-600'
          }`}>
            {data.intro}
          </p>
        ) : null}
      </div>

      <div className={`mt-4 border-t pt-4 ${
        darkMode ? 'border-slate-800' : 'border-slate-200/85'
      }`}>
        <SupportChecklist data={data.checklist} darkMode={darkMode} />
      </div>

      {data.closure ? (
        <div className={`mt-4 border-t pt-4 ${
          darkMode ? 'border-slate-800' : 'border-slate-200/85'
        }`}>
          <SupportClosure data={data.closure} darkMode={darkMode}>
            {children}
          </SupportClosure>
        </div>
      ) : null}
    </aside>
  );
};

export default SupportRail;
