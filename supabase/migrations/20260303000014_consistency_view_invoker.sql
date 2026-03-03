-- ============================================================
-- Force consistency_ranking as SECURITY INVOKER view
-- ============================================================

drop view if exists public.consistency_ranking;

create view public.consistency_ranking
with (security_invoker = true)
as
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
