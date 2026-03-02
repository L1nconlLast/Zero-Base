-- ============================================================
-- User profile preferences (dados de perfil editáveis + histórico)
-- Estratégia de conflito: registro com last_saved_at mais recente vence
-- ============================================================

create table if not exists public.user_profile_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar text not null default '🧑‍⚕️',
  exam_goal text not null default '',
  exam_date date,
  preferred_track text not null check (preferred_track in ('enem', 'concursos', 'hibrido')) default 'enem',
  profile_change_history jsonb not null default '[]'::jsonb,
  last_saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profile_preferences_last_saved_at
  on public.user_profile_preferences(last_saved_at desc);

alter table public.user_profile_preferences enable row level security;

create policy "user_profile_preferences_select_own"
  on public.user_profile_preferences for select
  using (auth.uid() = user_id);

create policy "user_profile_preferences_insert_own"
  on public.user_profile_preferences for insert
  with check (auth.uid() = user_id);

create policy "user_profile_preferences_update_own"
  on public.user_profile_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_profile_preferences_delete_own"
  on public.user_profile_preferences for delete
  using (auth.uid() = user_id);

create or replace function public.touch_user_profile_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_user_profile_preferences_updated_at on public.user_profile_preferences;
create trigger trigger_user_profile_preferences_updated_at
before update on public.user_profile_preferences
for each row execute function public.touch_user_profile_preferences_updated_at();
