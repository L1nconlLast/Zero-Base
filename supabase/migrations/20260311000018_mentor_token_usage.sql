-- ============================================================
-- Mentor token usage telemetry
-- ============================================================

create table if not exists public.mentor_token_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid unique,
  model varchar(255) not null,
  provider varchar(64) not null default 'openai',
  prompt_tokens integer not null,
  completion_tokens integer not null,
  total_tokens integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_mentor_usage_user_id on public.mentor_token_usage(user_id);
create index if not exists idx_mentor_usage_created_at on public.mentor_token_usage(created_at);

alter table public.mentor_token_usage enable row level security;

drop policy if exists "Users can view own mentor usage" on public.mentor_token_usage;
create policy "Users can view own mentor usage"
  on public.mentor_token_usage
  for select
  using (auth.uid() = user_id);

revoke all on public.mentor_token_usage from anon, authenticated;
grant select on public.mentor_token_usage to authenticated;
grant all on public.mentor_token_usage to service_role;
