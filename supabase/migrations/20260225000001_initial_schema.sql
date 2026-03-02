-- Medicina do Zero - Sprint 1 (schema inicial)
-- PostgreSQL / Supabase

create extension if not exists "pgcrypto";

-- =========================================
-- USERS (perfil app, vinculado ao auth.users)
-- =========================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  level integer not null default 1,
  xp integer not null default 0,
  streak integer not null default 0,
  daily_goal_minutes integer not null default 90,
  created_at timestamptz not null default now()
);

-- =========================================
-- SUBJECTS
-- =========================================
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  color text,
  icon text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_subjects_user_name_unique
  on public.subjects(user_id, lower(name));

-- =========================================
-- STUDY SESSIONS
-- =========================================
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date timestamptz not null,
  minutes integer not null check (minutes >= 0 and minutes <= 1440),
  points integer not null check (points >= 0),
  subject text not null,
  duration integer not null check (duration >= 0 and duration <= 1440),
  goal_met boolean,
  timestamp timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_study_sessions_user_created_at
  on public.study_sessions(user_id, created_at desc);

-- =========================================
-- DAILY GOALS
-- =========================================
create table if not exists public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  goal_minutes integer not null check (goal_minutes >= 1 and goal_minutes <= 1440),
  date date not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

create index if not exists idx_daily_goals_user_date
  on public.daily_goals(user_id, date desc);

-- =========================================
-- RLS
-- =========================================
alter table public.users enable row level security;
alter table public.subjects enable row level security;
alter table public.study_sessions enable row level security;
alter table public.daily_goals enable row level security;

-- users
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- subjects
create policy "subjects_select_own"
  on public.subjects for select
  using (auth.uid() = user_id);

create policy "subjects_insert_own"
  on public.subjects for insert
  with check (auth.uid() = user_id);

create policy "subjects_update_own"
  on public.subjects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "subjects_delete_own"
  on public.subjects for delete
  using (auth.uid() = user_id);

-- study_sessions
create policy "study_sessions_select_own"
  on public.study_sessions for select
  using (auth.uid() = user_id);

create policy "study_sessions_insert_own"
  on public.study_sessions for insert
  with check (auth.uid() = user_id);

create policy "study_sessions_update_own"
  on public.study_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "study_sessions_delete_own"
  on public.study_sessions for delete
  using (auth.uid() = user_id);

-- daily_goals
create policy "daily_goals_select_own"
  on public.daily_goals for select
  using (auth.uid() = user_id);

create policy "daily_goals_insert_own"
  on public.daily_goals for insert
  with check (auth.uid() = user_id);

create policy "daily_goals_update_own"
  on public.daily_goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_goals_delete_own"
  on public.daily_goals for delete
  using (auth.uid() = user_id);
