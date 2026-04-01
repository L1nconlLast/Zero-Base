-- ============================================================
-- Zero Base - Queries de Coorte e Consistência Semanal
-- ============================================================

-- 1) Consistência semanal global (core KPI)
select
  week_start,
  count(*) filter (where completed = true) as completed_users,
  count(*) as total_users,
  round(
    count(*) filter (where completed = true)::numeric
    / nullif(count(*), 0) * 100,
    2
  ) as completion_rate
from public.weekly_streaks
group by week_start
order by week_start desc;

-- 2) Ranking por consistência (view pronta)
select
  rank_position,
  user_id,
  name,
  email,
  total_weeks,
  current_streak,
  max_streak,
  consistency_rate
from public.consistency_ranking
order by rank_position asc
limit 50;

-- 3) Sequência atual e máxima por usuário
select
  user_id,
  total_completed_weeks,
  current_streak,
  max_streak,
  consistency_rate
from public.consistency_stats
order by max_streak desc, consistency_rate desc;

-- 4) Coorte de retenção (cadastro x semana de conclusão)
select
  date_trunc('week', u.created_at)::date as cohort_week,
  w.week_start,
  count(distinct w.user_id) filter (where w.completed = true) as retained_users
from public.users u
left join public.weekly_streaks w on w.user_id = u.id
where w.week_start is not null
group by date_trunc('week', u.created_at)::date, w.week_start
order by cohort_week desc, w.week_start desc;

-- 5) Retenção da semana corrente
with latest_week as (
  select week_start
  from public.weekly_streaks
  order by week_start desc
  limit 1
)
select
  lw.week_start,
  count(*) filter (where ws.completed = true) as completed_users,
  count(*) as total_users,
  round(
    count(*) filter (where ws.completed = true)::numeric
    / nullif(count(*), 0) * 100,
    2
  ) as completion_rate
from latest_week lw
join public.weekly_streaks ws on ws.week_start = lw.week_start
group by lw.week_start;
