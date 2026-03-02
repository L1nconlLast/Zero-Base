-- Medicina do Zero - Cronograma de Estudos
-- Permite ao usuário agendar disciplinas em datas específicas

create table if not exists public.study_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  subject text not null,
  note text,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice composto para buscar cronograma do usuário por data
create index if not exists idx_study_schedule_user_date
  on public.study_schedule(user_id, date asc);

-- Índice para filtrar pendentes
create index if not exists idx_study_schedule_user_done
  on public.study_schedule(user_id, done);

-- Trigger para atualizar updated_at automaticamente
create or replace function public.touch_study_schedule_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_study_schedule_updated_at on public.study_schedule;
create trigger trigger_study_schedule_updated_at
before update on public.study_schedule
for each row execute function public.touch_study_schedule_updated_at();

-- =========================================
-- RLS
-- =========================================
alter table public.study_schedule enable row level security;

drop policy if exists "study_schedule_select_own" on public.study_schedule;
create policy "study_schedule_select_own"
  on public.study_schedule for select
  using (auth.uid() = user_id);

drop policy if exists "study_schedule_insert_own" on public.study_schedule;
create policy "study_schedule_insert_own"
  on public.study_schedule for insert
  with check (auth.uid() = user_id);

drop policy if exists "study_schedule_update_own" on public.study_schedule;
create policy "study_schedule_update_own"
  on public.study_schedule for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "study_schedule_delete_own" on public.study_schedule;
create policy "study_schedule_delete_own"
  on public.study_schedule for delete
  using (auth.uid() = user_id);
