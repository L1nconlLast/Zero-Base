-- Mentor IA - Persistência de histórico de conversa
-- Suporta fallback local + sync em nuvem via Supabase

create table if not exists public.mentor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('assistant', 'user')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_mentor_messages_user_created_at
  on public.mentor_messages(user_id, created_at asc);

alter table public.mentor_messages enable row level security;

drop policy if exists "mentor_messages_select_own" on public.mentor_messages;
create policy "mentor_messages_select_own"
  on public.mentor_messages for select
  using (auth.uid() = user_id);

drop policy if exists "mentor_messages_insert_own" on public.mentor_messages;
create policy "mentor_messages_insert_own"
  on public.mentor_messages for insert
  with check (auth.uid() = user_id);

drop policy if exists "mentor_messages_update_own" on public.mentor_messages;
create policy "mentor_messages_update_own"
  on public.mentor_messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "mentor_messages_delete_own" on public.mentor_messages;
create policy "mentor_messages_delete_own"
  on public.mentor_messages for delete
  using (auth.uid() = user_id);
