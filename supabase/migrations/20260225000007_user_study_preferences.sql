-- User study preferences (goal type, hybrid weights, weekly goal)

create table if not exists public.user_study_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  goal_type text not null check (goal_type in ('enem', 'concursos', 'hibrido')) default 'enem',
  hybrid_enem_weight integer not null check (hybrid_enem_weight >= 10 and hybrid_enem_weight <= 90) default 70,
  weekly_goal_minutes integer not null check (weekly_goal_minutes >= 60 and weekly_goal_minutes <= 5040) default 900,
  primary_track text not null check (primary_track in ('enem', 'concursos')) default 'enem',
  secondary_track text check (secondary_track in ('enem', 'concursos')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (secondary_track is null or secondary_track <> primary_track)
);

create index if not exists idx_user_study_preferences_goal_type
  on public.user_study_preferences(goal_type);

alter table public.user_study_preferences enable row level security;

create policy "user_study_preferences_select_own"
  on public.user_study_preferences for select
  using (auth.uid() = user_id);

create policy "user_study_preferences_insert_own"
  on public.user_study_preferences for insert
  with check (auth.uid() = user_id);

create policy "user_study_preferences_update_own"
  on public.user_study_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_study_preferences_delete_own"
  on public.user_study_preferences for delete
  using (auth.uid() = user_id);

create or replace function public.touch_user_study_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_user_study_preferences_updated_at on public.user_study_preferences;
create trigger trigger_user_study_preferences_updated_at
before update on public.user_study_preferences
for each row execute function public.touch_user_study_preferences_updated_at();
