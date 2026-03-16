-- Estado do cliente/usuario para reengajamento

create table if not exists public.user_activity (
  user_id uuid primary key references public.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  last_action text,
  app_version text,
  platform text,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  push_enabled boolean not null default true,
  inactivity_threshold_hours integer not null default 48 check (inactivity_threshold_hours between 12 and 168),
  reminder_hours integer[] not null default array[8, 21],
  quiet_hours jsonb not null default '{"start":22,"end":7}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_delivery_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  tag text,
  title text not null,
  body text not null,
  status text not null check (status in ('sent', 'failed', 'expired')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_activity_last_seen_at
  on public.user_activity(last_seen_at);

create index if not exists idx_push_delivery_events_user_created
  on public.push_delivery_events(user_id, created_at desc);

create or replace function public.touch_user_activity_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_user_notification_preferences_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_user_activity_updated_at on public.user_activity;
create trigger trigger_user_activity_updated_at
before update on public.user_activity
for each row execute function public.touch_user_activity_updated_at();

drop trigger if exists trigger_user_notification_preferences_updated_at on public.user_notification_preferences;
create trigger trigger_user_notification_preferences_updated_at
before update on public.user_notification_preferences
for each row execute function public.touch_user_notification_preferences_updated_at();

alter table public.user_activity enable row level security;
alter table public.user_notification_preferences enable row level security;
alter table public.push_delivery_events enable row level security;

drop policy if exists "user_activity_select_own" on public.user_activity;
create policy "user_activity_select_own"
  on public.user_activity for select
  using (auth.uid() = user_id);

drop policy if exists "user_activity_insert_own" on public.user_activity;
create policy "user_activity_insert_own"
  on public.user_activity for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_activity_update_own" on public.user_activity;
create policy "user_activity_update_own"
  on public.user_activity for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_notification_preferences_select_own" on public.user_notification_preferences;
create policy "user_notification_preferences_select_own"
  on public.user_notification_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "user_notification_preferences_insert_own" on public.user_notification_preferences;
create policy "user_notification_preferences_insert_own"
  on public.user_notification_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_notification_preferences_update_own" on public.user_notification_preferences;
create policy "user_notification_preferences_update_own"
  on public.user_notification_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_delivery_events_select_own" on public.push_delivery_events;
create policy "push_delivery_events_select_own"
  on public.push_delivery_events for select
  using (auth.uid() = user_id);
