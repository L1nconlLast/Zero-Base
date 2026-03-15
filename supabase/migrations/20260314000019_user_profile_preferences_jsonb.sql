-- ============================================================
-- Preferências flexíveis em JSONB (extensível para Quiz, Tema etc.)
-- ============================================================

alter table public.user_profile_preferences
  add column if not exists preferences jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profile_preferences_preferences_is_object'
  ) then
    alter table public.user_profile_preferences
      add constraint user_profile_preferences_preferences_is_object
      check (jsonb_typeof(preferences) = 'object');
  end if;
end $$;

create index if not exists idx_user_profile_preferences_preferences_gin
  on public.user_profile_preferences using gin (preferences);
