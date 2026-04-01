import React from 'react';
import { Brain, GraduationCap, Landmark, Scale, Sparkles, Target } from 'lucide-react';
import type { ProfileTrackContextData } from '../types';

interface ProfileContextProps {
  darkMode?: boolean;
  data: ProfileTrackContextData;
  onReviewContext?: () => void;
}

const trackVisual = {
  enem: {
    icon: Brain,
    badge: {
      dark: 'bg-sky-950/60 text-sky-300',
      light: 'bg-sky-100 text-sky-700',
    },
  },
  concurso: {
    icon: Landmark,
    badge: {
      dark: 'bg-amber-950/60 text-amber-300',
      light: 'bg-amber-100 text-amber-700',
    },
  },
  faculdade: {
    icon: GraduationCap,
    badge: {
      dark: 'bg-violet-950/60 text-violet-300',
      light: 'bg-violet-100 text-violet-700',
    },
  },
  outros: {
    icon: Target,
    badge: {
      dark: 'bg-emerald-950/60 text-emerald-300',
      light: 'bg-emerald-100 text-emerald-700',
    },
  },
  hibrido: {
    icon: Scale,
    badge: {
      dark: 'bg-rose-950/60 text-rose-300',
      light: 'bg-rose-100 text-rose-700',
    },
  },
} as const;

export const ProfileContext: React.FC<ProfileContextProps> = ({
  darkMode = false,
  data,
  onReviewContext,
}) => {
  const visual = trackVisual[data.profile];
  const Icon = visual.icon;

  return (
    <section
      data-testid="profile-context-panel"
      className={`rounded-[30px] border px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:px-5 sm:py-5 ${
        darkMode
          ? 'border-slate-800 bg-slate-950/78 text-slate-100 shadow-[0_14px_34px_rgba(2,6,23,0.34)]'
          : 'border-slate-200/80 bg-slate-50/88 text-slate-900 shadow-[0_14px_34px_rgba(148,163,184,0.12)]'
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}>
            Modo de estudo
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span
              data-testid="profile-context-track"
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] ${
                darkMode ? visual.badge.dark : visual.badge.light
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {data.trackLabel}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              darkMode ? 'bg-slate-900 text-slate-300' : 'bg-white/92 text-slate-500'
            }`}>
              <Sparkles className="h-3.5 w-3.5" />
              Contexto salvo do onboarding
            </span>
          </div>

          <h2
            data-testid="profile-context-title"
            className={`mt-3 text-[24px] font-black tracking-[-0.05em] sm:text-[28px] ${
              darkMode ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {data.title}
          </h2>

          <p
            data-testid="profile-context-description"
            className={`mt-2 max-w-2xl text-sm ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {data.description}
          </p>
        </div>

        {onReviewContext && data.actionLabel ? (
          <button
            type="button"
            onClick={onReviewContext}
            className={`inline-flex items-center justify-center rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
              darkMode
                ? 'border border-slate-700 bg-slate-900/90 text-slate-100 hover:border-slate-600'
                : 'border border-slate-200 bg-white/92 text-slate-700 hover:border-slate-300'
            }`}
          >
            {data.actionLabel}
          </button>
        ) : null}
      </div>

      {data.tags.length > 0 ? (
        <div data-testid="profile-context-tags" className="mt-4 flex flex-wrap gap-2">
          {data.tags.map((tag) => (
            <span
              key={tag}
              data-testid="profile-context-tag"
              className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                darkMode ? 'bg-slate-900 text-slate-300' : 'bg-white/92 text-slate-600'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default ProfileContext;
