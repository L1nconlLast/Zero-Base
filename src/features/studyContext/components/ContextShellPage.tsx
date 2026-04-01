import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ContextShellAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface ContextShellStat {
  label: string;
  value: string;
  detail?: string;
}

interface ContextShellSectionItem {
  title: string;
  detail: string;
  badge?: string;
}

interface ContextShellSection {
  title: string;
  description: string;
  items: ContextShellSectionItem[];
}

export interface ContextShellPageProps {
  darkMode?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ContextShellAction[];
  stats?: ContextShellStat[];
  sections?: ContextShellSection[];
  children?: React.ReactNode;
}

export const ContextShellPage: React.FC<ContextShellPageProps> = ({
  darkMode = false,
  eyebrow,
  title,
  description,
  actions = [],
  stats = [],
  sections = [],
  children,
}) => {
  return (
    <div className="space-y-5">
      <section
        className={`overflow-hidden rounded-[28px] border p-5 shadow-[0_20px_55px_-36px_rgba(15,23,42,0.18)] sm:p-6 ${
          darkMode
            ? 'border-slate-800 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] text-slate-100'
            : 'border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] text-slate-900'
        }`}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {eyebrow}
            </p>
            <h1 className={`mt-3 text-3xl font-black tracking-[-0.04em] ${
              darkMode ? 'text-slate-50' : 'text-slate-900'
            }`}>
              {title}
            </h1>
            <p className={`mt-3 max-w-2xl text-sm leading-7 ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              {description}
            </p>
          </div>

          {actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    action.variant === 'secondary'
                      ? darkMode
                        ? 'border-slate-700 bg-slate-900/82 text-slate-100 hover:bg-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      : darkMode
                        ? 'border-cyan-700/70 bg-cyan-500/18 text-cyan-100 hover:bg-cyan-500/24'
                        : 'border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
                  }`}
                >
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {stats.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <article
                key={`${stat.label}-${stat.value}`}
                className={`rounded-[22px] border p-4 ${
                  darkMode
                    ? 'border-slate-800/80 bg-slate-950/70'
                    : 'border-white/80 bg-white/80 shadow-[0_12px_30px_-24px_rgba(148,163,184,0.35)]'
                }`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {stat.label}
                </p>
                <p className={`mt-2 text-lg font-black tracking-[-0.03em] ${
                  darkMode ? 'text-slate-50' : 'text-slate-900'
                }`}>
                  {stat.value}
                </p>
                {stat.detail ? (
                  <p className={`mt-2 text-xs leading-5 ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {stat.detail}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {sections.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.title}
              className={`rounded-[26px] border p-5 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.16)] ${
                darkMode
                  ? 'border-slate-800 bg-slate-950/70'
                  : 'border-slate-200/80 bg-white/88'
              }`}
            >
              <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {section.title}
              </p>
              <p className={`mt-2 text-sm leading-6 ${
                darkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                {section.description}
              </p>

              <div className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <div
                    key={`${section.title}-${item.title}`}
                    className={`rounded-2xl border p-4 ${
                      darkMode
                        ? 'border-slate-800/80 bg-slate-900/80'
                        : 'border-slate-200/80 bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-sm font-semibold ${
                        darkMode ? 'text-slate-100' : 'text-slate-900'
                      }`}>
                        {item.title}
                      </p>
                      {item.badge ? (
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                          darkMode
                            ? 'border-slate-700 bg-slate-950 text-slate-300'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className={`mt-2 text-sm leading-6 ${
                      darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {children}
    </div>
  );
};

export default ContextShellPage;
