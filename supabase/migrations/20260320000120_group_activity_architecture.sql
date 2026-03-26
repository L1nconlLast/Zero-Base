-- ============================================================
-- Group Architecture Upgrade: activity, mentions, attachments
-- ============================================================

alter table public.messages
  add column if not exists reply_to_message_id uuid references public.messages(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

drop trigger if exists trigger_messages_updated_at on public.messages;
create trigger trigger_messages_updated_at
before update on public.messages
for each row execute function public.touch_social_updated_at();

create table if not exists public.group_activities (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (
    type in (
      'review_completed',
      'study_started',
      'session_finished',
      'quiz_completed',
      'challenge_progress',
      'message_posted'
    )
  ),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.group_message_mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(message_id, mentioned_user_id)
);

create table if not exists public.group_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  type text not null check (type in ('image', 'file')),
  url text not null,
  file_name text not null,
  mime_type text not null,
  size_in_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_group_activities_group_created_at
  on public.group_activities(group_id, created_at desc);

create index if not exists idx_group_activities_user_created_at
  on public.group_activities(user_id, created_at desc);

create index if not exists idx_group_message_mentions_message
  on public.group_message_mentions(message_id);

create index if not exists idx_group_message_mentions_user
  on public.group_message_mentions(mentioned_user_id);

create index if not exists idx_group_message_attachments_message
  on public.group_message_attachments(message_id);

create index if not exists idx_messages_reply_to
  on public.messages(reply_to_message_id);

alter table public.group_activities enable row level security;
alter table public.group_message_mentions enable row level security;
alter table public.group_message_attachments enable row level security;

drop policy if exists "Group members can view group activities" on public.group_activities;
create policy "Group members can view group activities"
  on public.group_activities
  for select
  using (public.is_group_member(group_activities.group_id, auth.uid()));

drop policy if exists "Group members can insert group activities" on public.group_activities;
create policy "Group members can insert group activities"
  on public.group_activities
  for insert
  with check (
    user_id = auth.uid()
    and public.is_group_member(group_activities.group_id, auth.uid())
  );

drop policy if exists "Group members can view message mentions" on public.group_message_mentions;
create policy "Group members can view message mentions"
  on public.group_message_mentions
  for select
  using (
    exists (
      select 1
      from public.messages m
      where m.id = group_message_mentions.message_id
        and public.is_group_member(m.group_id, auth.uid())
    )
  );

drop policy if exists "Message authors can insert mentions" on public.group_message_mentions;
create policy "Message authors can insert mentions"
  on public.group_message_mentions
  for insert
  with check (
    exists (
      select 1
      from public.messages m
      where m.id = group_message_mentions.message_id
        and m.user_id = auth.uid()
        and public.is_group_member(m.group_id, auth.uid())
    )
  );

drop policy if exists "Group members can view message attachments" on public.group_message_attachments;
create policy "Group members can view message attachments"
  on public.group_message_attachments
  for select
  using (
    exists (
      select 1
      from public.messages m
      where m.id = group_message_attachments.message_id
        and public.is_group_member(m.group_id, auth.uid())
    )
  );

drop policy if exists "Message authors can insert attachments" on public.group_message_attachments;
create policy "Message authors can insert attachments"
  on public.group_message_attachments
  for insert
  with check (
    exists (
      select 1
      from public.messages m
      where m.id = group_message_attachments.message_id
        and m.user_id = auth.uid()
        and public.is_group_member(m.group_id, auth.uid())
    )
  );
