import React from 'react';
import { ArrowRight, CornerDownRight, RotateCcw } from 'lucide-react';
import type { PlanoNextStepItem } from '../types';

interface PlanNextStepsPanelProps {
  darkMode?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  items: PlanoNextStepItem[];
}

const toneMap = {
  focus: {
    light: 'border-cyan-200/80 bg-cyan-50/70 text-cyan-700',
    dark: 'border-cyan-900/70 bg-cyan-950/25 text-cyan-200',
    icon: ArrowRight,
  },
  review: {
    light: 'border-violet-200/80 bg-violet-50/70 text-violet-700',
    dark: 'border-violet-900/70 bg-violet-950/25 text-violet-200',
    icon: RotateCcw,
  },
  continuity: {
    light: 'border-slate-200/80 bg-slate-100/72 text-slate-700',
    dark: 'border-slate-800 bg-slate-900/80 text-slate-200',
    icon: CornerDownRight,
  },
} as const;

export const PlanNextStepsPanel: React.FC<PlanNextStepsPanelProps> = ({
  darkMode = false,
  eyebrow,
  title,
  description,
  items,
}) => {
  return (
    <section
      data-testid="plan-next-steps-panel"
      className={`rounded-[26px] border p-4.5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ${
        darkMode
          ? 'border-slate-800 bg-slate-950/88 shadow-[0_12px_28px_rgba(2,6,23,0.3)]'
          : 'border-slate-200/85 bg-white/92 shadow-[0_12px_28px_rgba(148,163,184,0.10)]'
      }`}
    >
      <div className="space-y-2">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
          darkMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          {eyebrow}
        </p>
        <h2 className={`text-[24px] font-black tracking-[-0.04em] ${
          darkMode ? 'text-slate-100' : 'text-slate-900'
        }`}>
          {title}
        </h2>
        <p className={`text-sm ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {description}
        </p>
      </div>

      <div className="mt-4 space-y-2.5">
        {items.map((item) => {
          const Icon = toneMap[item.tone].icon;
          return (
            <article
              key={item.id}
              data-testid={`plan-next-step-${item.id}`}
              className={`rounded-[20px] border px-4 py-3.5 ${
                darkMode ? toneMap[item.tone].dark : toneMap[item.tone].light
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`inline-flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[18px] ${
                  darkMode ? 'bg-slate-950/65' : 'bg-white/75'
                }`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">
                    {item.label}
                  </p>
                  <h3 className="mt-1 text-[15px] font-black tracking-[-0.03em]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[13px] opacity-80">
                    {item.detail}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default PlanNextStepsPanel;
