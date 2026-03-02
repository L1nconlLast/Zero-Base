-- ============================================================
-- Fix: Function Search Path Mutable (Security Advisor)
-- Adiciona SET search_path = '' em todas as funções de trigger
-- para impedir manipulação do schema de busca.
-- ============================================================

-- 1) touch_updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) compute_adaptive_status
create or replace function public.compute_adaptive_status(weighted_score numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when weighted_score < 60 then 'weak'
    when weighted_score < 85 then 'developing'
    else 'strong'
  end;
$$;

-- 3) touch_user_study_preferences_updated_at
create or replace function public.touch_user_study_preferences_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 4) touch_study_schedule_updated_at
create or replace function public.touch_study_schedule_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 5) touch_week_progress_updated_at
create or replace function public.touch_week_progress_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
