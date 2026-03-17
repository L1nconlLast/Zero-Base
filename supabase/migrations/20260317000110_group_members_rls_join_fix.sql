-- ============================================================
-- Fix RLS for public.group_members join flow
-- ============================================================

alter table public.group_members enable row level security;

-- Garantir leitura de membros para o proprio usuario e membros do grupo.
drop policy if exists "Users can view members of their groups" on public.group_members;
create policy "Users can view members of their groups"
  on public.group_members
  for select
  using (
    user_id = auth.uid()
    or public.is_group_member(group_members.group_id, auth.uid())
    or exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and g.is_private = false
    )
  );

-- Entrar no grupo como si mesmo (sem update implícito).
drop policy if exists "Users can join groups as self" on public.group_members;
create policy "Users can join groups as self"
  on public.group_members
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and (
          g.is_private = false
          or g.created_by = auth.uid()
          or public.is_group_member(g.id, auth.uid())
        )
    )
  );

-- Remover apenas a propria associação.
drop policy if exists "Users can leave own membership" on public.group_members;
create policy "Users can leave own membership"
  on public.group_members
  for delete
  using (user_id = auth.uid());
