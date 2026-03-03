-- ============================================================
-- Consistency Analytics (Admin): ranking, coorte, badges automáticos
-- ============================================================

create table if not exists public.admin_users (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
  on public.admin_users
  for select
  using (auth.uid() = user_id);

create table if not exists public.consistency_stats (
  user_id uuid primary key references public.users(id) on delete cascade,
  total_completed_weeks integer not null default 0,
  current_streak integer not null default 0,
  max_streak integer not null default 0,
  consistency_rate numeric(5,2) not null default 0,
  last_completed_week date,
  updated_at timestamptz not null default now()
);

create index if not exists idx_consistency_stats_max_streak
  on public.consistency_stats(max_streak desc, consistency_rate desc);

alter table public.consistency_stats enable row level security;

drop policy if exists "consistency_stats_select_own" on public.consistency_stats;
create policy "consistency_stats_select_own"
  on public.consistency_stats
  for select
  using (auth.uid() = user_id);

drop policy if exists "consistency_stats_select_admin" on public.consistency_stats;
create policy "consistency_stats_select_admin"
  on public.consistency_stats
  for select
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));

drop policy if exists "consistency_stats_update_admin" on public.consistency_stats;
create policy "consistency_stats_update_admin"
  on public.consistency_stats
  for all
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));

create or replace function public.touch_consistency_stats_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_consistency_stats_updated_at on public.consistency_stats;
create trigger trigger_consistency_stats_updated_at
before update on public.consistency_stats
for each row execute function public.touch_consistency_stats_updated_at();

create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1
    from public.admin_users au
    where au.user_id = p_user_id
  );
$$;

create or replace function public.recalc_consistency_stats_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_weeks integer := 0;
  v_total_completed integer := 0;
  v_completed_weeks date[];
  v_current_streak integer := 0;
  v_max_streak integer := 0;
  v_running integer := 0;
  v_expected date;
  v_rate numeric(5,2) := 0;
  v_last_completed_week date;
  i integer;
begin
  if p_user_id is null then
    return;
  end if;

  select count(*)::integer
    into v_total_weeks
  from public.weekly_streaks
  where user_id = p_user_id;

  select count(*)::integer
    into v_total_completed
  from public.weekly_streaks
  where user_id = p_user_id
    and completed = true;

  select array_agg(week_start order by week_start desc)
    into v_completed_weeks
  from public.weekly_streaks
  where user_id = p_user_id
    and completed = true;

  if coalesce(array_length(v_completed_weeks, 1), 0) > 0 then
    v_last_completed_week := v_completed_weeks[1];

    v_current_streak := 1;
    v_expected := v_completed_weeks[1] - interval '7 days';

    if array_length(v_completed_weeks, 1) >= 2 then
      for i in 2..array_length(v_completed_weeks, 1) loop
        if v_completed_weeks[i] = v_expected then
          v_current_streak := v_current_streak + 1;
          v_expected := v_completed_weeks[i] - interval '7 days';
        else
          exit;
        end if;
      end loop;
    end if;

    v_running := 1;
    v_max_streak := 1;
    v_expected := v_completed_weeks[1] - interval '7 days';

    if array_length(v_completed_weeks, 1) >= 2 then
      for i in 2..array_length(v_completed_weeks, 1) loop
        if v_completed_weeks[i] = v_expected then
          v_running := v_running + 1;
        else
          v_running := 1;
        end if;

        v_max_streak := greatest(v_max_streak, v_running);
        v_expected := v_completed_weeks[i] - interval '7 days';
      end loop;
    end if;
  end if;

  if v_total_weeks > 0 then
    v_rate := round((v_total_completed::numeric / v_total_weeks::numeric) * 100, 2);
  end if;

  insert into public.consistency_stats (
    user_id,
    total_completed_weeks,
    current_streak,
    max_streak,
    consistency_rate,
    last_completed_week
  )
  values (
    p_user_id,
    v_total_completed,
    v_current_streak,
    v_max_streak,
    v_rate,
    v_last_completed_week
  )
  on conflict (user_id)
  do update set
    total_completed_weeks = excluded.total_completed_weeks,
    current_streak = excluded.current_streak,
    max_streak = excluded.max_streak,
    consistency_rate = excluded.consistency_rate,
    last_completed_week = excluded.last_completed_week,
    updated_at = now();
end;
$$;

create or replace function public.refresh_consistency_stats(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  rec record;
begin
  if p_user_id is not null then
    perform public.recalc_consistency_stats_user(p_user_id);
    return 1;
  end if;

  for rec in
    select distinct ws.user_id
    from public.weekly_streaks ws
  loop
    perform public.recalc_consistency_stats_user(rec.user_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.trigger_refresh_consistency_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := coalesce(new.user_id, old.user_id);
  perform public.refresh_consistency_stats(v_user_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_weekly_streaks_refresh_consistency on public.weekly_streaks;
create trigger trigger_weekly_streaks_refresh_consistency
after insert or update or delete on public.weekly_streaks
for each row execute function public.trigger_refresh_consistency_stats();

create or replace function public.award_consistency_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_achievements (user_id, achievement_id)
  select new.user_id, badge
  from unnest(array[
    case when new.max_streak >= 1 then 'consistency_beginner' else null end,
    case when new.max_streak >= 3 then 'consistency_consistent' else null end,
    case when new.max_streak >= 5 then 'consistency_focused' else null end,
    case when new.max_streak >= 8 then 'consistency_master' else null end,
    case when new.max_streak >= 12 then 'consistency_legend' else null end
  ]) as badge
  where badge is not null
  on conflict (user_id, achievement_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trigger_award_consistency_badges on public.consistency_stats;
create trigger trigger_award_consistency_badges
after insert or update on public.consistency_stats
for each row execute function public.award_consistency_badges();

create or replace function public.admin_refresh_consistency_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'not_authorized');
  end if;

  v_count := public.refresh_consistency_stats(null);
  return jsonb_build_object('success', true, 'updated_users', v_count);
end;
$$;

create or replace function public.admin_get_retention_dashboard(
  p_weeks_limit integer default 12,
  p_top_limit integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit_weeks integer := greatest(1, least(52, coalesce(p_weeks_limit, 12)));
  v_limit_top integer := greatest(1, least(100, coalesce(p_top_limit, 10)));
  v_weekly jsonb := '[]'::jsonb;
  v_top jsonb := '[]'::jsonb;
  v_cohorts jsonb := '[]'::jsonb;
  v_current_rate numeric := 0;
  v_avg_4_weeks numeric := 0;
  v_users_3plus integer := 0;
  v_active_users integer := 0;
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'not_authorized');
  end if;

  with weekly as (
    select
      ws.week_start,
      count(*) filter (where ws.completed = true) as completed_users,
      count(*) as total_users,
      round((count(*) filter (where ws.completed = true)::numeric / nullif(count(*), 0)) * 100, 2) as completion_rate
    from public.weekly_streaks ws
    group by ws.week_start
    order by ws.week_start desc
    limit v_limit_weeks
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'week_start', weekly.week_start,
        'completed_users', weekly.completed_users,
        'total_users', weekly.total_users,
        'completion_rate', weekly.completion_rate
      )
      order by weekly.week_start desc
    ),
    '[]'::jsonb
  )
  into v_weekly
  from weekly;

  with weekly as (
    select
      ws.week_start,
      round((count(*) filter (where ws.completed = true)::numeric / nullif(count(*), 0)) * 100, 2) as completion_rate
    from public.weekly_streaks ws
    group by ws.week_start
    order by ws.week_start desc
    limit 4
  )
  select coalesce(avg(completion_rate), 0)
    into v_avg_4_weeks
  from weekly;

  with latest_week as (
    select ws.week_start
    from public.weekly_streaks ws
    order by ws.week_start desc
    limit 1
  )
  select coalesce(
    round((count(*) filter (where ws.completed = true)::numeric / nullif(count(*), 0)) * 100, 2),
    0
  )
  into v_current_rate
  from public.weekly_streaks ws
  inner join latest_week lw
    on lw.week_start = ws.week_start;

  select count(*)::integer
    into v_users_3plus
  from public.consistency_stats cs
  where cs.current_streak >= 3;

  with latest_week as (
    select ws.week_start
    from public.weekly_streaks ws
    order by ws.week_start desc
    limit 1
  )
  select count(*)::integer
    into v_active_users
  from public.weekly_streaks ws
  inner join latest_week lw
    on lw.week_start = ws.week_start;

  with ranked as (
    select
      cs.user_id,
      u.name,
      u.email,
      cs.total_completed_weeks,
      cs.current_streak,
      cs.max_streak,
      cs.consistency_rate,
      rank() over (order by cs.max_streak desc, cs.consistency_rate desc, cs.total_completed_weeks desc) as rank_position
    from public.consistency_stats cs
    inner join public.users u on u.id = cs.user_id
    order by rank_position asc
    limit v_limit_top
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rank', ranked.rank_position,
        'user_id', ranked.user_id,
        'name', ranked.name,
        'email', ranked.email,
        'total_weeks', ranked.total_completed_weeks,
        'current_streak', ranked.current_streak,
        'max_streak', ranked.max_streak,
        'consistency_rate', ranked.consistency_rate
      )
      order by ranked.rank_position asc
    ),
    '[]'::jsonb
  )
  into v_top
  from ranked;

  with cohorts as (
    select
      date_trunc('week', u.created_at)::date as cohort_week,
      ws.week_start,
      count(distinct ws.user_id) filter (where ws.completed = true) as retained_users
    from public.users u
    left join public.weekly_streaks ws
      on ws.user_id = u.id
    where ws.week_start is not null
    group by date_trunc('week', u.created_at)::date, ws.week_start
    order by cohort_week desc, ws.week_start desc
    limit 200
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'cohort_week', cohorts.cohort_week,
        'week_start', cohorts.week_start,
        'retained_users', cohorts.retained_users
      )
      order by cohorts.cohort_week desc, cohorts.week_start desc
    ),
    '[]'::jsonb
  )
  into v_cohorts
  from cohorts;

  return jsonb_build_object(
    'success', true,
    'summary', jsonb_build_object(
      'current_week_completion_rate', round(v_current_rate, 2),
      'avg_4_weeks_completion_rate', round(v_avg_4_weeks, 2),
      'users_with_3plus_weeks', v_users_3plus,
      'active_users_latest_week', v_active_users
    ),
    'weekly', v_weekly,
    'top_users', v_top,
    'cohorts', v_cohorts
  );
end;
$$;

revoke all on function public.refresh_consistency_stats(uuid) from public;
grant execute on function public.refresh_consistency_stats(uuid) to service_role;

revoke all on function public.recalc_consistency_stats_user(uuid) from public;
grant execute on function public.recalc_consistency_stats_user(uuid) to service_role;

revoke all on function public.admin_refresh_consistency_stats() from public;
grant execute on function public.admin_refresh_consistency_stats() to authenticated;
grant execute on function public.admin_refresh_consistency_stats() to service_role;

revoke all on function public.admin_get_retention_dashboard(integer, integer) from public;
grant execute on function public.admin_get_retention_dashboard(integer, integer) to authenticated;
grant execute on function public.admin_get_retention_dashboard(integer, integer) to service_role;

create or replace view public.consistency_ranking as
select
  cs.user_id,
  u.name,
  u.email,
  cs.total_completed_weeks as total_weeks,
  cs.current_streak,
  cs.max_streak,
  cs.consistency_rate,
  rank() over (order by cs.max_streak desc, cs.consistency_rate desc, cs.total_completed_weeks desc) as rank_position
from public.consistency_stats cs
inner join public.users u on u.id = cs.user_id;
