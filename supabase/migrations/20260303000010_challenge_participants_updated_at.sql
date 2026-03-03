-- ============================================================
-- Offline conflict support for challenge_participants
-- ============================================================

create or replace function public.touch_challenge_participants_updated_at()
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

alter table if exists public.challenge_participants
  add column if not exists updated_at timestamptz not null default now();

update public.challenge_participants
set updated_at = coalesce(updated_at, joined_at, now())
where updated_at is null;

drop trigger if exists trigger_challenge_participants_updated_at on public.challenge_participants;
create trigger trigger_challenge_participants_updated_at
before update on public.challenge_participants
for each row execute function public.touch_challenge_participants_updated_at();
