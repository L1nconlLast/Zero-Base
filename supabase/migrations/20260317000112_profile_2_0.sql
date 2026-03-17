-- ============================================================
-- Profile 2.0 (incremental, sem quebrar schemas existentes)
-- ============================================================

create extension if not exists "pgcrypto";

-- 1) Extensoes de perfil em user_profile_preferences (ja existente)
alter table public.user_profile_preferences
  add column if not exists email text,
  add column if not exists avatar_icon text,
  add column if not exists avatar_url text,
  add column if not exists theme text not null default 'system',
  add column if not exists language text not null default 'pt',
  add column if not exists density text not null default 'normal',
  add column if not exists preferred_period text not null default 'morning';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_profile_preferences_theme_check'
  ) then
    alter table public.user_profile_preferences
      add constraint user_profile_preferences_theme_check
      check (theme in ('light', 'dark', 'system'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'user_profile_preferences_language_check'
  ) then
    alter table public.user_profile_preferences
      add constraint user_profile_preferences_language_check
      check (language in ('pt', 'en', 'es'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'user_profile_preferences_density_check'
  ) then
    alter table public.user_profile_preferences
      add constraint user_profile_preferences_density_check
      check (density in ('compact', 'normal', 'spacious'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'user_profile_preferences_preferred_period_check'
  ) then
    alter table public.user_profile_preferences
      add constraint user_profile_preferences_preferred_period_check
      check (preferred_period in ('morning', 'afternoon', 'night', 'late_night'));
  end if;
end $$;

create index if not exists idx_user_profile_preferences_updated_at
  on public.user_profile_preferences(updated_at desc);

-- 2) Preferencias de notificacao
create table if not exists public.user_notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  study_reminders boolean not null default true,
  unlocked_achievements boolean not null default true,
  group_activity boolean not null default false,
  weekly_report boolean not null default true,
  reminder_time time,
  timezone text not null default 'America/Sao_Paulo',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.user_notification_prefs enable row level security;

drop policy if exists "user_notification_prefs_select_own" on public.user_notification_prefs;
create policy "user_notification_prefs_select_own"
  on public.user_notification_prefs for select
  using (auth.uid() = user_id);

drop policy if exists "user_notification_prefs_insert_own" on public.user_notification_prefs;
create policy "user_notification_prefs_insert_own"
  on public.user_notification_prefs for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_notification_prefs_update_own" on public.user_notification_prefs;
create policy "user_notification_prefs_update_own"
  on public.user_notification_prefs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3) Atividade diaria para heatmap
create table if not exists public.user_daily_activity (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  minutes_studied int not null default 0 check (minutes_studied >= 0),
  sessions_count int not null default 0 check (sessions_count >= 0),
  login_count int not null default 0 check (login_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, activity_date)
);

create index if not exists idx_user_daily_activity_user_date
  on public.user_daily_activity(user_id, activity_date desc);

alter table public.user_daily_activity enable row level security;

drop policy if exists "user_daily_activity_select_own" on public.user_daily_activity;
create policy "user_daily_activity_select_own"
  on public.user_daily_activity for select
  using (auth.uid() = user_id);

drop policy if exists "user_daily_activity_insert_own" on public.user_daily_activity;
create policy "user_daily_activity_insert_own"
  on public.user_daily_activity for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_daily_activity_update_own" on public.user_daily_activity;
create policy "user_daily_activity_update_own"
  on public.user_daily_activity for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4) Catalogo de conquistas
create table if not exists public.achievement_catalog (
  key text primary key,
  title text not null,
  description text not null,
  xp_reward int not null default 0,
  category text,
  created_at timestamptz not null default now()
);

-- 5) Estende user_achievements existente para progresso
alter table public.user_achievements
  add column if not exists unlocked boolean not null default true,
  add column if not exists progress int not null default 0,
  add column if not exists progress_target int not null default 1;

create index if not exists idx_user_achievements_user_id
  on public.user_achievements(user_id);

insert into public.achievement_catalog(key, title, description, xp_reward, category) values
('first_session','Primeira Chama','Complete sua primeira sessão',50,'streak'),
('streak_7','7 Dias Seguidos','Streak de uma semana completa',150,'streak'),
('top_100','Top 100','Entre no top 100 do ranking',300,'ranking')
on conflict (key) do nothing;

-- Bucket padrao de avatar (supabase storage)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
