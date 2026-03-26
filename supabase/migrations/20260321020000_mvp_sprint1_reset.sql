create extension if not exists "pgcrypto";

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  exam_type text not null default 'enem' check (exam_type in ('enem')),
  level text not null check (level in ('iniciante', 'intermediario', 'avancado')),
  weekly_hours integer not null check (weekly_hours >= 0 and weekly_hours <= 168),
  preferred_goal text,
  weakest_disciplines jsonb not null default '[]'::jsonb,
  onboarding_completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  reason text not null,
  score numeric(6,4) not null default 0.75,
  status text not null default 'active' check (status in ('active', 'consumed', 'expired')),
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_recommendations
  add column if not exists score numeric(6,4),
  add column if not exists status text,
  add column if not exists generated_at timestamptz,
  add column if not exists expires_at timestamptz;

update public.user_recommendations
set
  score = coalesce(score, 0.75),
  status = coalesce(status, 'active'),
  generated_at = coalesce(generated_at, created_at, now())
where score is null
   or status is null
   or generated_at is null;

alter table public.user_recommendations
  alter column score set default 0.75,
  alter column score set not null,
  alter column status set default 'active',
  alter column status set not null,
  alter column generated_at set default now(),
  alter column generated_at set not null;

alter table public.user_recommendations
  drop constraint if exists user_recommendations_status_check;

alter table public.user_recommendations
  add constraint user_recommendations_status_check
  check (status in ('active', 'consumed', 'expired'));

with ranked_active_recommendations as (
  select
    id,
    row_number() over (
      partition by user_id
      order by coalesce(generated_at, created_at, now()) desc, created_at desc, id desc
    ) as row_number
  from public.user_recommendations
  where status = 'active'
)
update public.user_recommendations
set status = 'expired'
where id in (
  select id
  from ranked_active_recommendations
  where row_number > 1
);

create index if not exists idx_user_recommendations_user_id on public.user_recommendations(user_id, generated_at desc);
create unique index if not exists idx_user_recommendations_active_unique
  on public.user_recommendations(user_id)
  where status = 'active';

create or replace function public.touch_mvp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_profiles_touch_updated_at on public.user_profiles;
create trigger trg_user_profiles_touch_updated_at
before update on public.user_profiles
for each row execute function public.touch_mvp_updated_at();

alter table public.user_profiles enable row level security;
alter table public.user_recommendations enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
  on public.user_profiles for select
  using (auth.uid() = id);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  with check (auth.uid() = id);

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "user_profiles_delete_own" on public.user_profiles;
create policy "user_profiles_delete_own"
  on public.user_profiles for delete
  using (auth.uid() = id);

drop policy if exists "user_recommendations_select_own" on public.user_recommendations;
create policy "user_recommendations_select_own"
  on public.user_recommendations for select
  using (auth.uid() = user_id);

drop policy if exists "user_recommendations_insert_own" on public.user_recommendations;
create policy "user_recommendations_insert_own"
  on public.user_recommendations for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_recommendations_update_own" on public.user_recommendations;
create policy "user_recommendations_update_own"
  on public.user_recommendations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_recommendations_delete_own" on public.user_recommendations;
create policy "user_recommendations_delete_own"
  on public.user_recommendations for delete
  using (auth.uid() = user_id);
