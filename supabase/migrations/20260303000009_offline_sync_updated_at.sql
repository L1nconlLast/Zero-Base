-- ============================================================
-- Offline Sync Support: updated_at for conflict resolution
-- ============================================================

create or replace function public.touch_offline_sync_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- study_sessions
alter table if exists public.study_sessions
  add column if not exists updated_at timestamptz not null default now();

update public.study_sessions
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

drop trigger if exists trigger_study_sessions_updated_at on public.study_sessions;
create trigger trigger_study_sessions_updated_at
before update on public.study_sessions
for each row execute function public.touch_offline_sync_updated_at();

-- messages
alter table if exists public.messages
  add column if not exists updated_at timestamptz not null default now();

update public.messages
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

drop trigger if exists trigger_messages_updated_at on public.messages;
create trigger trigger_messages_updated_at
before update on public.messages
for each row execute function public.touch_offline_sync_updated_at();
