-- ============================================================
-- Security Advisor cleanup
-- - Fix mutable search_path warnings on trigger functions
-- - Fix security definer view warning on consistency_ranking
-- ============================================================

-- Trigger helpers flagged by advisor: enforce immutable search_path
alter function public.touch_social_updated_at() set search_path = public;
alter function public.touch_weekly_streaks_updated_at() set search_path = public;
alter function public.touch_consistency_stats_updated_at() set search_path = public;

-- Ensure ranking view uses invoker permissions (no security definer behavior)
alter view public.consistency_ranking set (security_invoker = true);
