-- ============================================================
-- Social Core Schema: groups, members, messages, challenges
-- ============================================================

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  avatar_url text,
  is_private boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  attachment_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  goal_type text not null,
  goal_value numeric not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'cancelled')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress numeric not null default 0,
  completed boolean not null default false,
  joined_at timestamptz not null default now(),
  unique(challenge_id, user_id)
);

create table if not exists public.rankings_periodic (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  period text not null check (period in ('global', 'weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  total_points numeric not null default 0,
  rank_position int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, group_id, period, period_start, period_end)
);

create index if not exists idx_groups_created_by on public.groups(created_by);
create index if not exists idx_groups_private on public.groups(is_private);
create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_messages_group_created_at on public.messages(group_id, created_at desc);
create index if not exists idx_challenges_group_status on public.challenges(group_id, status);
create index if not exists idx_challenge_participants_challenge on public.challenge_participants(challenge_id);
create index if not exists idx_rankings_period_scope on public.rankings_periodic(period, period_start, period_end);

create or replace function public.touch_social_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_groups_updated_at on public.groups;
create trigger trigger_groups_updated_at
before update on public.groups
for each row execute function public.touch_social_updated_at();

drop trigger if exists trigger_challenges_updated_at on public.challenges;
create trigger trigger_challenges_updated_at
before update on public.challenges
for each row execute function public.touch_social_updated_at();

drop trigger if exists trigger_rankings_periodic_updated_at on public.rankings_periodic;
create trigger trigger_rankings_periodic_updated_at
before update on public.rankings_periodic
for each row execute function public.touch_social_updated_at();

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.rankings_periodic enable row level security;

-- Groups

drop policy if exists "Users can view accessible groups" on public.groups;
create policy "Users can view accessible groups"
  on public.groups
  for select
  using (
    (is_private = false)
    or (created_by = auth.uid())
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can create own groups" on public.groups;
create policy "Users can create own groups"
  on public.groups
  for insert
  with check (created_by = auth.uid());

drop policy if exists "Group admins can update groups" on public.groups;
create policy "Group admins can update groups"
  on public.groups
  for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  )
  with check (
    created_by = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

drop policy if exists "Group admins can delete groups" on public.groups;
create policy "Group admins can delete groups"
  on public.groups
  for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

-- Group members

drop policy if exists "Users can view members of their groups" on public.group_members;
create policy "Users can view members of their groups"
  on public.group_members
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.is_private = false
    )
  );

drop policy if exists "Users can join groups as self" on public.group_members;
create policy "Users can join groups as self"
  on public.group_members
  for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can leave own membership" on public.group_members;
create policy "Users can leave own membership"
  on public.group_members
  for delete
  using (user_id = auth.uid());

-- Messages

drop policy if exists "Group members can view messages" on public.messages;
create policy "Group members can view messages"
  on public.messages
  for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = messages.group_id and gm.user_id = auth.uid()
    )
  );

drop policy if exists "Group members can post messages" on public.messages;
create policy "Group members can post messages"
  on public.messages
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = messages.group_id and gm.user_id = auth.uid()
    )
  );

drop policy if exists "Message authors can delete own messages" on public.messages;
create policy "Message authors can delete own messages"
  on public.messages
  for delete
  using (user_id = auth.uid());

-- Challenges

drop policy if exists "Group members can view challenges" on public.challenges;
create policy "Group members can view challenges"
  on public.challenges
  for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = challenges.group_id and gm.user_id = auth.uid()
    )
  );

drop policy if exists "Group admins can manage challenges" on public.challenges;
create policy "Group admins can manage challenges"
  on public.challenges
  for all
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = challenges.group_id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = challenges.group_id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

-- Challenge participants

drop policy if exists "Group members can view challenge participants" on public.challenge_participants;
create policy "Group members can view challenge participants"
  on public.challenge_participants
  for select
  using (
    exists (
      select 1
      from public.challenges c
      join public.group_members gm on gm.group_id = c.group_id
      where c.id = challenge_participants.challenge_id
        and gm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can join challenge as self" on public.challenge_participants;
create policy "Users can join challenge as self"
  on public.challenge_participants
  for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update own challenge progress" on public.challenge_participants;
create policy "Users can update own challenge progress"
  on public.challenge_participants
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Rankings

drop policy if exists "Users can view rankings" on public.rankings_periodic;
create policy "Users can view rankings"
  on public.rankings_periodic
  for select
  using (true);

drop policy if exists "Users can manage own rankings rows" on public.rankings_periodic;
create policy "Users can manage own rankings rows"
  on public.rankings_periodic
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
