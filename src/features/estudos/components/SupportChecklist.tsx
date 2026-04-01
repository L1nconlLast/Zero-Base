import React from 'react';
import { CheckCircle2, Circle, Disc3 } from 'lucide-react';
import type { SupportChecklistData, SupportChecklistItemStatus } from '../types';

interface SupportChecklistProps {
  data: SupportChecklistData;
  darkMode?: boolean;
}

const STATUS_ICON: Record<SupportChecklistItemStatus, React.ComponentType<{ className?: string }>> = {
  pending: Circle,
  active: Disc3,
  completed: CheckCircle2,
};

const STATUS_TONE: Record<SupportChecklistItemStatus, string> = {
  pending: 'text-slate-400 dark:text-slate-600',
  active: 'text-cyan-500 dark:text-cyan-300',
  completed: 'text-emerald-500 dark:text-emerald-300',
};

export const SupportChecklist: React.FC<SupportChecklistProps> = ({ data, darkMode = false }) => {
  return (
    <section data-testid="study-support-checklist">
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
          darkMode ? 'text-slate-500' : 'text-slate-500'
        }`}>
          {data.title || 'Checklist da sessao'}
        </p>
        {data.progressLabel ? (
          <span className={`text-[11px] font-semibold ${
            darkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            {data.progressLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        {data.items.map((item) => {
          const StatusIcon = STATUS_ICON[item.status];
          const isActive = item.status === 'active';

          return (
            <div
              key={item.id}
              className={`rounded-[18px] border px-3.5 py-2.5 transition ${
                isActive
                  ? darkMode
                    ? 'border-cyan-900/50 bg-cyan-950/14'
                    : 'border-cyan-200/85 bg-cyan-50/72'
                  : darkMode
                    ? 'border-slate-800/90 bg-slate-950/32'
                    : 'border-slate-200/80 bg-white/48'
              }`}
              data-testid={`study-support-checklist-item-${item.id}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 ${STATUS_TONE[item.status]}`}>
                  <StatusIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className={`text-[13px] font-semibold ${
                    darkMode ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {item.label}
                  </p>
                  {item.detail ? (
                    <p className={`mt-1 text-[11px] leading-5 ${
                      darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {item.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SupportChecklist;
