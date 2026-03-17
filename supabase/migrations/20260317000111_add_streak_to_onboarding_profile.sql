alter table if exists public.onboarding_profile
  add column if not exists streak_days int not null default 0,
  add column if not exists streak_last_day date null;
