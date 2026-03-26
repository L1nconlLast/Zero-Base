import React from 'react';

type ProfileSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

interface ProfileAdminSnapshotCardProps {
  displayName?: string;
  email?: string;
  avatar?: string;
  examGoal?: string;
  examDate?: string;
  syncStatus?: ProfileSyncStatus;
  title?: string;
  subtitle?: string;
  className?: string;
}

const syncStatusLabel: Record<ProfileSyncStatus, string> = {
  local: 'Local',
  syncing: 'Sincronizando',
  synced: 'Sincronizado',
  error: 'Erro de sync',
};

const syncStatusTone: Record<ProfileSyncStatus, string> = {
  local: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-300',
  syncing: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/80 dark:bg-sky-950/40 dark:text-sky-300',
  synced: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300',
  error: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-300',
};

const isImageAvatar = (value?: string): boolean => Boolean(value && /^(data:image\/|https?:\/\/)/i.test(value));

const getAvatarFallback = (displayName?: string, avatar?: string): string => {
  const base = String(displayName || avatar || 'Perfil').trim();
  return (base[0] || 'P').toUpperCase();
};

export function ProfileAdminSnapshotCard({
  displayName,
  email,
  avatar,
  examGoal,
  examDate,
  syncStatus = 'local',
  title = 'Perfil em contexto',
  subtitle = 'Estado atual recebido pelo painel admin.',
  className = '',
}: ProfileAdminSnapshotCardProps) {
  const resolvedName = String(displayName || 'Perfil sem nome').trim();
  const resolvedEmail = String(email || 'Sem email em contexto').trim();
  const resolvedGoal = String(examGoal || 'Objetivo nao definido').trim();
  const resolvedDate = String(examDate || 'Sem data').trim();

  return (
    <article className={`rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${syncStatusTone[syncStatus]}`}>
          {syncStatusLabel[syncStatus]}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-lg font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {isImageAvatar(avatar) ? (
            <img src={avatar} alt="avatar do perfil" className="h-full w-full object-cover" />
          ) : (
            <span>{getAvatarFallback(displayName, avatar)}</span>
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
            {resolvedName}
          </p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
            {resolvedEmail}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/70">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Objetivo
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {resolvedGoal}
          </dd>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/70">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Data-alvo
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {resolvedDate}
          </dd>
        </div>
      </dl>
    </article>
  );
}

