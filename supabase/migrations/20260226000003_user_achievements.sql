-- Medicina do Zero - Conquistas (Achievements)
-- Persiste conquistas desbloqueadas pelo usuário na nuvem

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  unique(user_id, achievement_id)
);

-- Índice para listar conquistas do usuário
create index if not exists idx_user_achievements_user
  on public.user_achievements(user_id, unlocked_at desc);

-- =========================================
-- RLS
-- =========================================
alter table public.user_achievements enable row level security;

drop policy if exists "user_achievements_select_own" on public.user_achievements;
create policy "user_achievements_select_own"
  on public.user_achievements for select
  using (auth.uid() = user_id);

drop policy if exists "user_achievements_insert_own" on public.user_achievements;
create policy "user_achievements_insert_own"
  on public.user_achievements for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_achievements_delete_own" on public.user_achievements;
create policy "user_achievements_delete_own"
  on public.user_achievements for delete
  using (auth.uid() = user_id);
