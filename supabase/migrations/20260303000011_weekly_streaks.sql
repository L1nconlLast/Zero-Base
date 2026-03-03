-- ============================================================
-- Weekly Streaks (Retenção 7 dias) - Persistência histórica real
-- ============================================================

create table if not exists public.weekly_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,
  days_completed integer not null default 0 check (days_completed >= 0 and days_completed <= 7),
  target_days integer not null default 4 check (target_days >= 1 and target_days <= 7),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_start)
);

create table if not exists public.weekly_streak_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,
  study_date date not null,
  created_at timestamptz not null default now(),
  unique(user_id, study_date)
);

create index if not exists idx_weekly_streaks_user_week
  on public.weekly_streaks(user_id, week_start desc);

create index if not exists idx_weekly_streak_days_user_week
  on public.weekly_streak_days(user_id, week_start desc);

create or replace function public.touch_weekly_streaks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_weekly_streaks_updated_at on public.weekly_streaks;
create trigger trigger_weekly_streaks_updated_at
before update on public.weekly_streaks
for each row execute function public.touch_weekly_streaks_updated_at();

alter table public.weekly_streaks enable row level security;
alter table public.weekly_streak_days enable row level security;

drop policy if exists "weekly_streaks_select_own" on public.weekly_streaks;
create policy "weekly_streaks_select_own"
  on public.weekly_streaks
  for select
  using (auth.uid() = user_id);

drop policy if exists "weekly_streaks_insert_own" on public.weekly_streaks;
create policy "weekly_streaks_insert_own"
  on public.weekly_streaks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "weekly_streaks_update_own" on public.weekly_streaks;
create policy "weekly_streaks_update_own"
  on public.weekly_streaks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "weekly_streaks_delete_own" on public.weekly_streaks;
create policy "weekly_streaks_delete_own"
  on public.weekly_streaks
  for delete
  using (auth.uid() = user_id);

drop policy if exists "weekly_streak_days_select_own" on public.weekly_streak_days;
create policy "weekly_streak_days_select_own"
  on public.weekly_streak_days
  for select
  using (auth.uid() = user_id);

drop policy if exists "weekly_streak_days_insert_own" on public.weekly_streak_days;
create policy "weekly_streak_days_insert_own"
  on public.weekly_streak_days
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "weekly_streak_days_update_own" on public.weekly_streak_days;
create policy "weekly_streak_days_update_own"
  on public.weekly_streak_days
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "weekly_streak_days_delete_own" on public.weekly_streak_days;
create policy "weekly_streak_days_delete_own"
  on public.weekly_streak_days
  for delete
  using (auth.uid() = user_id);

create or replace function public.record_weekly_streak_day(
  p_user_id uuid,
  p_study_date date default (now() at time zone 'utc')::date,
  p_target_days integer default 4
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week_start date;
  v_safe_target integer;
  v_inserted_day boolean := false;
  v_days_completed integer := 0;
  v_completed boolean := false;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    return jsonb_build_object(
      'success', false,
      'error', 'not_authorized'
    );
  end if;

  v_safe_target := greatest(1, least(7, coalesce(p_target_days, 4)));
  v_week_start := p_study_date - ((extract(isodow from p_study_date)::integer) - 1);

  insert into public.weekly_streaks (user_id, week_start, target_days)
  values (p_user_id, v_week_start, v_safe_target)
  on conflict (user_id, week_start)
  do update set target_days = excluded.target_days;

  insert into public.weekly_streak_days (user_id, week_start, study_date)
  values (p_user_id, v_week_start, p_study_date)
  on conflict (user_id, study_date)
  do nothing;

  get diagnostics v_inserted_day = row_count;

  select count(*)::integer
    into v_days_completed
  from public.weekly_streak_days
  where user_id = p_user_id
    and week_start = v_week_start;

  v_completed := v_days_completed >= v_safe_target;

  update public.weekly_streaks
  set
    days_completed = v_days_completed,
    completed = v_completed,
    completed_at = case
      when v_completed and completed_at is null then now()
      when not v_completed then null
      else completed_at
    end
  where user_id = p_user_id
    and week_start = v_week_start;

  return jsonb_build_object(
    'success', true,
    'week_start', v_week_start,
    'days_completed', v_days_completed,
    'target_days', v_safe_target,
    'completed', v_completed,
    'day_registered', v_inserted_day
  );
end;
$$;

revoke all on function public.record_weekly_streak_day(uuid, date, integer) from public;
grant execute on function public.record_weekly_streak_day(uuid, date, integer) to authenticated;
grant execute on function public.record_weekly_streak_day(uuid, date, integer) to service_role;
