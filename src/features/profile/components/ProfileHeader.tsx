import React from 'react';
import { Settings2, Sparkles } from 'lucide-react';
import type { ProfileHeaderData } from '../types';

interface ProfileHeaderProps {
  darkMode?: boolean;
  data: ProfileHeaderData;
  email?: string;
  avatarValue?: string;
  onOpenSettings?: () => void;
}

const isAvatarImage = (value?: string): boolean =>
  Boolean(value && (/^data:image\//i.test(value) || /^https?:\/\//i.test(value)));

const buildAvatarInitials = (
  title: string,
  email?: string,
  value?: string,
): string => {
  const safeValue = String(value || '').trim();
  if (/^[a-z0-9]{1,2}$/i.test(safeValue)) {
    return safeValue.toUpperCase();
  }

  const source = String(title || email || 'U').trim();
  if (!source) {
    return 'U';
  }

  const parts = source
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase() || 'U';
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  darkMode = false,
  data,
  email,
  avatarValue,
  onOpenSettings,
}) => {
  const resolvedAvatarValue = avatarValue || data.avatarLabel;
  const avatarIsImage = isAvatarImage(resolvedAvatarValue);
  const avatarFallback = buildAvatarInitials(data.title, email, resolvedAvatarValue);

  return (
    <section
      data-testid="profile-header"
      className={`rounded-[30px] border px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.045)] sm:px-5 sm:py-5 ${
        darkMode
          ? 'border-slate-800 bg-slate-950/82 text-slate-100 shadow-[0_12px_30px_rgba(2,6,23,0.32)]'
          : 'border-slate-200/80 bg-slate-50/88 text-slate-900 shadow-[0_12px_30px_rgba(148,163,184,0.11)]'
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border ${
              darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white/92'
            }`}
          >
            {avatarIsImage ? (
              <img
                src={resolvedAvatarValue}
                alt={`Avatar de ${data.title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-black uppercase leading-none tracking-[0.22em]">
                {avatarFallback}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${
                darkMode ? 'bg-slate-900 text-slate-300' : 'bg-white/92 text-slate-500'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {data.eyebrow}
            </div>

            <h1 className={`mt-2.5 text-[28px] font-black tracking-[-0.05em] sm:text-[30px] ${
              darkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              {data.title}
            </h1>

            <p className={`mt-1.5 text-sm ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              {data.contextLine}
            </p>

            {email ? (
              <p className={`mt-1 text-[13px] ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {email}
              </p>
            ) : null}

            <p className={`mt-2.5 max-w-3xl text-[13px] ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {data.statusLine}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:max-w-[420px] lg:items-end">
          <div
            data-testid="profile-header-metrics"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-full"
          >
            {data.metrics.map((metric) => (
              <div
                key={metric.label}
                className={`rounded-[18px] border px-3 py-2.5 ${
                  darkMode ? 'border-slate-800 bg-slate-900/68' : 'border-slate-200/80 bg-white/86'
                }`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {metric.label}
                </p>
                <p className={`mt-1 text-[13px] font-semibold ${
                  darkMode ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          {onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                darkMode
                  ? 'border border-slate-700 bg-slate-900/90 text-slate-100 hover:border-slate-600'
                  : 'border border-slate-200 bg-white/92 text-slate-700 hover:border-slate-300'
              }`}
            >
              <Settings2 className="h-4 w-4" />
              Abrir ajustes
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default ProfileHeader;
