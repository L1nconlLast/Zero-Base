-- ============================================================
-- SaaS Planning Core: profiles + subject_levels + study_blocks
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  goal text not null,
  exam_date date not null,
  hours_per_day int not null check (hours_per_day > 0 and hours_per_day <= 12),
  study_days text[] not null,
  study_style text not null,
  desired_score int,
  preferred_period text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subject_levels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  level text not null check (level in ('fraco','medio','forte')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, subject)
);

create table if not exists public.study_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_date date not null,
  start_time time not null,
  end_time time not null,
  subject text not null,
  topic text,
  note text,
  type text,
  status text not null default 'pendente',
  reason text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_blocks_status_check check (status in ('pendente','concluido','adiado')),
  constraint study_blocks_time_check check (end_time > start_time)
);

create index if not exists idx_profiles_exam_date on public.profiles(exam_date);
create index if not exists idx_subject_levels_user on public.subject_levels(user_id);
create index if not exists idx_study_blocks_user_date on public.study_blocks(user_id, study_date);
create index if not exists idx_study_blocks_user_status on public.study_blocks(user_id, status);

create or replace function public.touch_saas_planning_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_profiles_updated_at on public.profiles;
create trigger trigger_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_saas_planning_updated_at();

drop trigger if exists trigger_subject_levels_updated_at on public.subject_levels;
create trigger trigger_subject_levels_updated_at
before update on public.subject_levels
for each row execute function public.touch_saas_planning_updated_at();

drop trigger if exists trigger_study_blocks_updated_at on public.study_blocks;
create trigger trigger_study_blocks_updated_at
before update on public.study_blocks
for each row execute function public.touch_saas_planning_updated_at();

alter table public.profiles enable row level security;
alter table public.subject_levels enable row level security;
alter table public.study_blocks enable row level security;

drop policy if exists "Users can access own profile" on public.profiles;
create policy "Users can access own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can access own data" on public.subject_levels;
create policy "Users can access own data"
  on public.subject_levels
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can access own blocks" on public.study_blocks;
create policy "Users can access own blocks"
  on public.study_blocks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
