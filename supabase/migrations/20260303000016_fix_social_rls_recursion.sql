-- ============================================================
-- Fix RLS recursion on social/group_members policies
-- ============================================================

create or replace function public.is_group_member(
  p_group_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_user_id
  );
$$;

create or replace function public.is_group_admin(
  p_group_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_user_id
      and gm.role = 'admin'
  );
$$;

revoke all on function public.is_group_member(uuid, uuid) from public;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_group_member(uuid, uuid) to service_role;

revoke all on function public.is_group_admin(uuid, uuid) from public;
grant execute on function public.is_group_admin(uuid, uuid) to authenticated;
grant execute on function public.is_group_admin(uuid, uuid) to service_role;

-- Groups

drop policy if exists "Users can view accessible groups" on public.groups;
create policy "Users can view accessible groups"
  on public.groups
  for select
  using (
    (is_private = false)
    or (created_by = auth.uid())
    or public.is_group_member(groups.id, auth.uid())
  );

drop policy if exists "Group admins can update groups" on public.groups;
create policy "Group admins can update groups"
  on public.groups
  for update
  using (
    created_by = auth.uid()
    or public.is_group_admin(groups.id, auth.uid())
  )
  with check (
    created_by = auth.uid()
    or public.is_group_admin(groups.id, auth.uid())
  );

drop policy if exists "Group admins can delete groups" on public.groups;
create policy "Group admins can delete groups"
  on public.groups
  for delete
  using (
    created_by = auth.uid()
    or public.is_group_admin(groups.id, auth.uid())
  );

-- Group members

drop policy if exists "Users can view members of their groups" on public.group_members;
create policy "Users can view members of their groups"
  on public.group_members
  for select
  using (
    user_id = auth.uid()
    or public.is_group_member(group_members.group_id, auth.uid())
    or exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.is_private = false
    )
  );

-- Messages

drop policy if exists "Group members can view messages" on public.messages;
create policy "Group members can view messages"
  on public.messages
  for select
  using (public.is_group_member(messages.group_id, auth.uid()));

drop policy if exists "Group members can post messages" on public.messages;
create policy "Group members can post messages"
  on public.messages
  for insert
  with check (
    user_id = auth.uid()
    and public.is_group_member(messages.group_id, auth.uid())
  );

-- Challenges

drop policy if exists "Group members can view challenges" on public.challenges;
create policy "Group members can view challenges"
  on public.challenges
  for select
  using (public.is_group_member(challenges.group_id, auth.uid()));

drop policy if exists "Group admins can manage challenges" on public.challenges;
create policy "Group admins can manage challenges"
  on public.challenges
  for all
  using (public.is_group_admin(challenges.group_id, auth.uid()))
  with check (public.is_group_admin(challenges.group_id, auth.uid()));

-- Challenge participants

drop policy if exists "Group members can view challenge participants" on public.challenge_participants;
create policy "Group members can view challenge participants"
  on public.challenge_participants
  for select
  using (
    exists (
      select 1
      from public.challenges c
      where c.id = challenge_participants.challenge_id
        and public.is_group_member(c.group_id, auth.uid())
    )
  );
