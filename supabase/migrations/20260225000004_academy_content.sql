-- Medicina do Zero - Sprint 1.2 (Academia de Estudo)
-- PostgreSQL / Supabase

-- =========================================
-- STUDY CONTENT
-- =========================================
create table if not exists public.study_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  difficulty_level text not null check (difficulty_level in ('iniciante', 'intermediario', 'avancado')),
  estimated_minutes integer not null check (estimated_minutes >= 1 and estimated_minutes <= 120),
  xp_reward integer not null check (xp_reward >= 0),
  is_premium boolean not null default false,
  apply_method_id uuid references public.study_methods(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_study_content_category
  on public.study_content(category);

-- =========================================
-- CONTENT MODULES (trilhas)
-- =========================================
create table if not exists public.content_modules (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.study_content(id) on delete cascade,
  module_name text not null,
  order_index integer not null check (order_index >= 1),
  module_text text,
  checklist_json jsonb,
  created_at timestamptz not null default now(),
  unique(content_id, order_index)
);

create index if not exists idx_content_modules_content_order
  on public.content_modules(content_id, order_index);

-- =========================================
-- USER CONTENT PROGRESS
-- =========================================
create table if not exists public.user_content_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  content_id uuid not null references public.study_content(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, content_id)
);

create index if not exists idx_user_content_progress_user
  on public.user_content_progress(user_id, completed);

-- =========================================
-- SEED: 6 GRATUITOS + 3 PRO
-- =========================================
with methods as (
  select id, name from public.study_methods
), seeded as (
  insert into public.study_content (
    title,
    category,
    difficulty_level,
    estimated_minutes,
    xp_reward,
    is_premium,
    apply_method_id
  )
  values
    ('Fundamentos do Foco', 'fundamentos', 'iniciante', 4, 30, false, (select id from methods where name = 'Pomodoro' limit 1)),
    ('Pomodoro sem Erros', 'metodos', 'iniciante', 5, 35, false, (select id from methods where name = 'Pomodoro' limit 1)),
    ('Revisão que Realmente Fixa', 'revisao', 'intermediario', 5, 40, false, (select id from methods where name = '52/17' limit 1)),
    ('Cronograma em 15 Minutos', 'planejamento', 'iniciante', 3, 25, false, (select id from methods where name = '52/17' limit 1)),
    ('Deep Work na Prática', 'metodos', 'intermediario', 5, 45, false, (select id from methods where name = 'Deep Work' limit 1)),
    ('Como Evitar Fadiga Mental', 'energia', 'intermediario', 4, 30, false, (select id from methods where name = 'Pomodoro' limit 1)),
    ('Plano Pré-Prova 30 Dias', 'pre-prova', 'avancado', 5, 80, true, (select id from methods where name = '90/30' limit 1)),
    ('Revisão Espaçada Avançada', 'revisao', 'avancado', 5, 90, true, (select id from methods where name = '90/30' limit 1)),
    ('Estratégia para Provas Difíceis', 'pre-prova', 'avancado', 5, 100, true, (select id from methods where name = 'Deep Work' limit 1))
  on conflict do nothing
  returning id, title
)
insert into public.content_modules (content_id, module_name, order_index, module_text, checklist_json)
select
  seeded.id,
  'Aplicação prática',
  1,
  'Resumo objetivo para aplicar hoje no seu estudo.',
  '["Definir meta clara da sessão", "Eliminar distrações por 25-90min", "Executar e revisar ao final"]'::jsonb
from seeded
on conflict do nothing;

-- =========================================
-- RLS
-- =========================================
alter table public.study_content enable row level security;
alter table public.content_modules enable row level security;
alter table public.user_content_progress enable row level security;

-- study_content e modules: leitura autenticada
create policy "study_content_select_authenticated"
  on public.study_content for select
  using (auth.uid() is not null);

create policy "content_modules_select_authenticated"
  on public.content_modules for select
  using (auth.uid() is not null);

-- user progress: só dono
create policy "user_content_progress_select_own"
  on public.user_content_progress for select
  using (auth.uid() = user_id);

create policy "user_content_progress_insert_own"
  on public.user_content_progress for insert
  with check (auth.uid() = user_id);

create policy "user_content_progress_update_own"
  on public.user_content_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_content_progress_delete_own"
  on public.user_content_progress for delete
  using (auth.uid() = user_id);
