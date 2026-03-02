-- Medicina do Zero - Progresso Semanal
-- Persiste o progresso diário (dia da semana → minutos + flag studied)

create table if not exists public.week_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,          -- segunda-feira da semana (ISO)
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=dom, 6=sáb
  minutes integer not null default 0 check (minutes >= 0 and minutes <= 1440),
  studied boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(user_id, week_start, day_of_week)
);

-- Índice para consultar semana corrente do usuário
create index if not exists idx_week_progress_user_week
  on public.week_progress(user_id, week_start desc);

-- Trigger updated_at
create or replace function public.touch_week_progress_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_week_progress_updated_at on public.week_progress;
create trigger trigger_week_progress_updated_at
before update on public.week_progress
for each row execute function public.touch_week_progress_updated_at();

-- =========================================
-- RLS
-- =========================================
alter table public.week_progress enable row level security;

drop policy if exists "week_progress_select_own" on public.week_progress;
create policy "week_progress_select_own"
  on public.week_progress for select
  using (auth.uid() = user_id);

drop policy if exists "week_progress_insert_own" on public.week_progress;
create policy "week_progress_insert_own"
  on public.week_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "week_progress_update_own" on public.week_progress;
create policy "week_progress_update_own"
  on public.week_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "week_progress_delete_own" on public.week_progress;
create policy "week_progress_delete_own"
  on public.week_progress for delete
  using (auth.uid() = user_id);
