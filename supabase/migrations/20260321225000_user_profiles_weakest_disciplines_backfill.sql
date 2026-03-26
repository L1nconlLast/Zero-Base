alter table public.user_profiles
  add column if not exists weakest_disciplines jsonb,
  add column if not exists onboarding_completed_at timestamptz;

update public.user_profiles
set
  weakest_disciplines = coalesce(weakest_disciplines, '[]'::jsonb),
  onboarding_completed_at = coalesce(onboarding_completed_at, created_at, now())
where weakest_disciplines is null
   or onboarding_completed_at is null;

alter table public.user_profiles
  alter column weakest_disciplines set default '[]'::jsonb,
  alter column weakest_disciplines set not null,
  alter column onboarding_completed_at set default now(),
  alter column onboarding_completed_at set not null;
