import React from 'react';
import type { PlanoDistributionItem } from '../types';

interface PlanDistributionPanelProps {
  darkMode?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  footer: string;
  items: PlanoDistributionItem[];
}

const getStatusToneClass = (statusTone: PlanoDistributionItem['statusTone'], darkMode: boolean) => {
  if (statusTone === 'primary') {
    return darkMode
      ? 'bg-cyan-950/40 text-cyan-200'
      : 'bg-cyan-100/80 text-cyan-700';
  }

  if (statusTone === 'active') {
    return darkMode
      ? 'bg-emerald-950/40 text-emerald-200'
      : 'bg-emerald-100/80 text-emerald-700';
  }

  if (statusTone === 'review') {
    return darkMode
      ? 'bg-violet-950/40 text-violet-200'
      : 'bg-violet-100/80 text-violet-700';
  }

  return darkMode
    ? 'bg-slate-900 text-slate-300'
    : 'bg-slate-100 text-slate-600';
};

export const PlanDistributionPanel: React.FC<PlanDistributionPanelProps> = ({
  darkMode = false,
  eyebrow,
  title,
  description,
  footer,
  items,
}) => {
  return (
    <section
      data-testid="plan-distribution-list"
      className={`overflow-hidden rounded-[30px] border px-5 py-5 shadow-[0_20px_40px_rgba(15,23,42,0.06)] ${
        darkMode
          ? 'border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(2,6,23,0.96)_100%)] shadow-[0_20px_40px_rgba(2,6,23,0.4)]'
          : 'border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.99)_0%,rgba(248,250,252,0.96)_100%)] shadow-[0_20px_40px_rgba(148,163,184,0.15)]'
      }`}
    >
      <div className="space-y-2">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
          darkMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          {eyebrow}
        </p>
        <h2 className={`text-[28px] font-black tracking-[-0.04em] ${
          darkMode ? 'text-slate-100' : 'text-slate-900'
        }`}>
          {title}
        </h2>
        <p className={`max-w-3xl text-sm ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {description}
        </p>
      </div>

      <div className="mt-5 space-y-2.5">
        {items.map((item) => (
          <article
            key={item.id}
            data-testid={`plan-distribution-item-${item.id}`}
            className={`rounded-[20px] border px-4 py-3.5 ${
              darkMode
                ? 'border-slate-800 bg-slate-900/60'
                : 'border-slate-200/80 bg-slate-50/68'
            }`}
          >
            <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_260px] md:items-center md:gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`truncate text-base font-black tracking-[-0.03em] ${
                    darkMode ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {item.subject}
                  </h3>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                    getStatusToneClass(item.statusTone, darkMode)
                  }`}>
                    {item.statusLabel}
                  </span>
                </div>
                <p className={`mt-1 text-[13px] ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {item.detailLabel} - {item.sessions} bloco{item.sessions === 1 ? '' : 's'} - {item.shareOfCycle}% do ciclo
                </p>
              </div>

              <div className="w-full">
                <div className={`h-2 rounded-full ${
                  darkMode ? 'bg-slate-950' : 'bg-slate-200/90'
                }`}>
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#38bdf8_52%,#818cf8_100%)]"
                    style={{ width: `${item.relativeWeight}%` }}
                  />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className={`mt-4 text-[13px] ${
        darkMode ? 'text-slate-500' : 'text-slate-500'
      }`}>
        {footer}
      </p>
    </section>
  );
};

export default PlanDistributionPanel;
