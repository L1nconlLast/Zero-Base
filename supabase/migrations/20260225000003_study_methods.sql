-- Medicina do Zero - Sprint 1.1 (métodos de estudo)
-- PostgreSQL / Supabase

-- =========================================
-- STUDY METHODS (catálogo global)
-- =========================================
create table if not exists public.study_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  focus_minutes integer not null check (focus_minutes >= 1 and focus_minutes <= 240),
  break_minutes integer not null check (break_minutes >= 1 and break_minutes <= 120),
  long_break_minutes integer not null check (long_break_minutes >= 1 and long_break_minutes <= 180),
  cycles_before_long_break integer not null check (cycles_before_long_break >= 1 and cycles_before_long_break <= 12),
  description text,
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.study_methods (
  name,
  focus_minutes,
  break_minutes,
  long_break_minutes,
  cycles_before_long_break,
  description,
  is_premium
)
values
  ('Pomodoro', 25, 5, 15, 4, 'Ideal para constância e foco em blocos curtos.', false),
  ('Deep Work', 90, 20, 30, 2, 'Blocos longos para alta concentração.', false),
  ('52/17', 52, 17, 25, 2, 'Cadência equilibrada entre foco e recuperação.', false),
  ('90/30', 90, 30, 30, 1, 'Sessões intensas para revisões profundas.', true)
on conflict (name) do nothing;

-- =========================================
-- USER METHOD PREFERENCES
-- =========================================
create table if not exists public.user_method_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  method_id uuid not null references public.study_methods(id) on delete cascade,
  is_active boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, method_id)
);

create index if not exists idx_user_method_preferences_user_active
  on public.user_method_preferences(user_id, is_active);

-- =========================================
-- UPDATE STUDY SESSIONS
-- =========================================
alter table public.study_sessions
  add column if not exists method_id uuid references public.study_methods(id);

create index if not exists idx_study_sessions_user_method
  on public.study_sessions(user_id, method_id);

-- =========================================
-- RLS
-- =========================================
alter table public.study_methods enable row level security;
alter table public.user_method_preferences enable row level security;

-- study_methods (catálogo pode ser lido por usuários autenticados)
create policy "study_methods_select_authenticated"
  on public.study_methods for select
  using (auth.uid() is not null);

-- user_method_preferences
create policy "user_method_preferences_select_own"
  on public.user_method_preferences for select
  using (auth.uid() = user_id);

create policy "user_method_preferences_insert_own"
  on public.user_method_preferences for insert
  with check (auth.uid() = user_id);

create policy "user_method_preferences_update_own"
  on public.user_method_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_method_preferences_delete_own"
  on public.user_method_preferences for delete
  using (auth.uid() = user_id);
