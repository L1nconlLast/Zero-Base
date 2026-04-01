import React from 'react';
import { BookOpenCheck, Clock3 } from 'lucide-react';
import type { ProfileActivityData } from '../types';

interface ProfileActivityProps {
  darkMode?: boolean;
  data: ProfileActivityData;
}

const activityTypeCopy: Record<'study_session' | 'review', string> = {
  study_session: 'Estudo',
  review: 'Revisao',
};

export const ProfileActivity: React.FC<ProfileActivityProps> = ({
  darkMode = false,
  data,
}) => (
  <section
    data-testid="profile-activity-panel"
    className={`rounded-[30px] border px-4 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)] sm:px-5 sm:py-5 ${
      darkMode
        ? 'border-slate-800 bg-slate-950/76 text-slate-100 shadow-[0_10px_26px_rgba(2,6,23,0.3)]'
        : 'border-slate-200/80 bg-slate-50/84 text-slate-900 shadow-[0_10px_26px_rgba(148,163,184,0.1)]'
    }`}
  >
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
          darkMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          Atividade recente
        </p>
        <h2 className={`mt-2 text-[24px] font-black tracking-[-0.05em] sm:text-[26px] ${
          darkMode ? 'text-slate-100' : 'text-slate-900'
        }`}>
          O que voce fez por ultimo
        </h2>
        <p className={`mt-2 text-sm ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        }`}>
          Estudos e revisoes recentes aparecem aqui em ordem de recencia.
        </p>
      </div>
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-[16px] ${
        darkMode ? 'bg-slate-900 text-slate-300' : 'bg-white/92 text-slate-500'
      }`}>
        <BookOpenCheck className="h-4.5 w-4.5" />
      </span>
    </div>

    {data.items.length > 0 ? (
      <div data-testid="profile-activity-list" className="mt-4 space-y-2.5">
        {data.items.map((item) => (
          <article
            key={item.id}
            data-testid="profile-activity-item"
            className={`rounded-[20px] border px-4 py-3 ${
              darkMode ? 'border-slate-800 bg-slate-900/68' : 'border-slate-200/80 bg-white/84'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    item.type === 'review'
                      ? darkMode ? 'bg-amber-950/50 text-amber-300' : 'bg-amber-100 text-amber-700'
                      : darkMode ? 'bg-sky-950/50 text-sky-300' : 'bg-sky-100 text-sky-700'
                  }`}>
                    {activityTypeCopy[item.type]}
                  </span>
                  <p className={`text-sm font-semibold ${
                    darkMode ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {item.title}
                  </p>
                </div>

                {item.contextLabel ? (
                  <p className={`mt-2 text-sm ${
                    darkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {item.contextLabel}
                  </p>
                ) : null}

                {item.metaLabel ? (
                  <p className={`mt-1 text-[13px] ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {item.metaLabel}
                  </p>
                ) : null}
              </div>

              <div className={`inline-flex items-center gap-1.5 text-[12px] ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Clock3 className="h-3.5 w-3.5" />
                {item.relativeLabel}
              </div>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <div
        data-testid="profile-activity-empty"
        className={`mt-4 rounded-[20px] border px-4 py-4 text-sm ${
          darkMode ? 'border-slate-800 bg-slate-900/70 text-slate-300' : 'border-slate-200/80 bg-white/84 text-slate-600'
        }`}
      >
        {data.emptyLabel}
      </div>
    )}
  </section>
);

export default ProfileActivity;
