import React from 'react';
import type { ProfileStatCardData } from '../types';

interface ProfileStatsProps {
  darkMode?: boolean;
  cards: ProfileStatCardData[];
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  darkMode = false,
  cards,
}) => (
  <section
    data-testid="profile-stats-grid"
    className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
  >
    {cards.map((card) => {
      const Icon = card.icon;

      return (
        <article
          key={card.id}
          data-testid={`profile-stat-${card.id}`}
          className={`rounded-[22px] border px-4 py-3.5 ${
            darkMode
              ? 'border-slate-800 bg-slate-950/74 text-slate-100'
              : 'border-slate-200/80 bg-slate-50/78 text-slate-900'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {card.eyebrow}
              </p>
              <h2 className={`mt-2 text-[26px] font-black tracking-[-0.05em] ${
                darkMode ? 'text-slate-100' : 'text-slate-900'
              }`}>
                {card.value}
              </h2>
            </div>

            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-[16px] ${
              darkMode ? 'bg-slate-900 text-slate-300' : 'bg-white/92 text-slate-500'
            }`}>
              <Icon className="h-4.5 w-4.5" />
            </div>
          </div>

          <p className={`mt-3 text-[13px] ${
            darkMode ? 'text-slate-300' : 'text-slate-600'
          }`}>
            {card.detail}
          </p>
          <p className={`mt-1 text-[12px] ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {card.support}
          </p>
        </article>
      );
    })}
  </section>
);

export default ProfileStats;
