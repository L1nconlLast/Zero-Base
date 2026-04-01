-- ============================================================
-- Study Context Engine: contextos nativos para Faculdade e Outros
-- Objetivo: fundar a camada de contexto do usuario sem quebrar
-- o legado ENEM/Concurso ja em operacao.
-- ============================================================

-- --------------------------------------------
-- 1) Contexto ativo do usuario
-- --------------------------------------------
create table if not exists public.user_study_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('enem', 'concurso', 'faculdade', 'outros', 'hibrido')),
  is_active boolean not null default true,
  context_summary text,
  context_description text,
  context_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, mode),
  constraint user_study_contexts_payload_is_object
    check (jsonb_typeof(context_payload) = 'object')
);

create unique index if not exists idx_user_study_contexts_one_active
  on public.user_study_contexts(user_id)
  where is_active is true;

create index if not exists idx_user_study_contexts_mode
  on public.user_study_contexts(mode);

create index if not exists idx_user_study_contexts_payload_gin
  on public.user_study_contexts using gin (context_payload);

-- --------------------------------------------
-- 2) Dominio Faculdade
-- --------------------------------------------
create table if not exists public.academic_institutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  institution_type text not null
    check (institution_type in ('publica', 'privada', 'instituto', 'outra')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_academic_institutions_user_name
  on public.academic_institutions(user_id, lower(name));

create unique index if not exists idx_academic_institutions_one_primary
  on public.academic_institutions(user_id)
  where is_primary is true;

create table if not exists public.academic_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid references public.academic_institutions(id) on delete set null,
  name text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_academic_courses_user_name
  on public.academic_courses(user_id, lower(name));

create unique index if not exists idx_academic_courses_one_primary
  on public.academic_courses(user_id)
  where is_primary is true;

create table if not exists public.academic_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  number integer,
  starts_at date,
  ends_at date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_periods_date_range_check
    check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index if not exists idx_academic_periods_user_number
  on public.academic_periods(user_id, number nulls last);

create unique index if not exists idx_academic_periods_one_current
  on public.academic_periods(user_id)
  where is_current is true;

create table if not exists public.academic_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid references public.academic_institutions(id) on delete set null,
  course_id uuid references public.academic_courses(id) on delete set null,
  academic_period_id uuid references public.academic_periods(id) on delete set null,
  name text not null,
  workload_hours integer check (workload_hours is null or workload_hours > 0),
  professor_name text,
  color text,
  status text not null default 'ativa'
    check (status in ('ativa', 'concluida', 'trancada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_academic_subjects_user_period_name
  on public.academic_subjects(user_id, coalesce(academic_period_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create index if not exists idx_academic_subjects_user_status
  on public.academic_subjects(user_id, status);

create table if not exists public.academic_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.academic_subjects(id) on delete cascade,
  title text not null,
  exam_date timestamptz not null,
  weight numeric(6,2),
  notes text,
  status text not null default 'pendente'
    check (status in ('pendente', 'concluida')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_exams_weight_check
    check (weight is null or weight >= 0)
);

create index if not exists idx_academic_exams_user_date
  on public.academic_exams(user_id, exam_date asc);

create index if not exists idx_academic_exams_subject_status
  on public.academic_exams(subject_id, status);

create table if not exists public.academic_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.academic_subjects(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz not null,
  priority text not null default 'media'
    check (priority in ('baixa', 'media', 'alta', 'critica')),
  status text not null default 'nao_iniciado'
    check (status in ('nao_iniciado', 'em_andamento', 'entregue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_academic_assignments_user_due_date
  on public.academic_assignments(user_id, due_date asc);

create index if not exists idx_academic_assignments_subject_status
  on public.academic_assignments(subject_id, status);

create table if not exists public.academic_class_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.academic_subjects(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_academic_class_notes_subject_updated_at
  on public.academic_class_notes(subject_id, updated_at desc);

create table if not exists public.academic_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.academic_subjects(id) on delete set null,
  exam_id uuid references public.academic_exams(id) on delete set null,
  assignment_id uuid references public.academic_assignments(id) on delete set null,
  event_type text not null
    check (event_type in ('prova', 'entrega', 'aula_importante', 'estudo', 'meta')),
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  status text not null default 'pendente'
    check (status in ('pendente', 'concluido', 'cancelado')),
  details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_calendar_events_date_range_check
    check (end_at is null or end_at >= start_at)
);

create index if not exists idx_academic_calendar_events_user_start_at
  on public.academic_calendar_events(user_id, start_at asc);

create index if not exists idx_academic_calendar_events_subject_type
  on public.academic_calendar_events(subject_id, event_type);

-- --------------------------------------------
-- 3) Dominio Outros
-- --------------------------------------------
create table if not exists public.learning_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  level text not null default 'iniciante'
    check (level in ('iniciante', 'intermediario', 'avancado')),
  status text not null default 'ativo'
    check (status in ('ativo', 'pausado', 'concluido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_learning_topics_user_name
  on public.learning_topics(user_id, lower(name));

create index if not exists idx_learning_topics_user_status
  on public.learning_topics(user_id, status);

create table if not exists public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.learning_topics(id) on delete cascade,
  goal_type text not null
    check (goal_type in ('aprender_do_zero', 'praticar', 'rotina', 'aprofundar')),
  description text,
  status text not null default 'ativo'
    check (status in ('ativo', 'concluido', 'arquivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_learning_goals_user_status
  on public.learning_goals(user_id, status);

create index if not exists idx_learning_goals_topic
  on public.learning_goals(topic_id);

create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.learning_topics(id) on delete cascade,
  title text not null,
  progress_percent integer not null default 0
    check (progress_percent between 0 and 100),
  status text not null default 'ativa'
    check (status in ('ativa', 'pausada', 'concluida')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_learning_paths_user_status
  on public.learning_paths(user_id, status);

create index if not exists idx_learning_paths_topic
  on public.learning_paths(topic_id);

create table if not exists public.learning_path_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  title text not null,
  description text,
  step_order integer not null check (step_order > 0),
  status text not null default 'nao_iniciado'
    check (status in ('nao_iniciado', 'em_andamento', 'concluido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(path_id, step_order)
);

create index if not exists idx_learning_path_steps_user_status
  on public.learning_path_steps(user_id, status);

create table if not exists public.personal_goal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.learning_topics(id) on delete set null,
  title text not null,
  event_type text not null
    check (event_type in ('meta', 'estudo', 'revisao')),
  start_at timestamptz not null,
  end_at timestamptz,
  status text not null default 'pendente'
    check (status in ('pendente', 'concluido', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_goal_events_date_range_check
    check (end_at is null or end_at >= start_at)
);

create index if not exists idx_personal_goal_events_user_start_at
  on public.personal_goal_events(user_id, start_at asc);

-- --------------------------------------------
-- 4) Extensoes do nucleo compartilhado
-- --------------------------------------------
alter table public.study_sessions
  add column if not exists context_mode text,
  add column if not exists academic_subject_id uuid references public.academic_subjects(id) on delete set null,
  add column if not exists academic_exam_id uuid references public.academic_exams(id) on delete set null,
  add column if not exists academic_assignment_id uuid references public.academic_assignments(id) on delete set null,
  add column if not exists learning_topic_id uuid references public.learning_topics(id) on delete set null,
  add column if not exists session_type text,
  add column if not exists scheduled_for timestamptz,
  add column if not exists completed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'study_sessions_context_mode_check'
  ) then
    alter table public.study_sessions
      add constraint study_sessions_context_mode_check
      check (context_mode is null or context_mode in ('enem', 'concurso', 'faculdade', 'outros', 'hibrido'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'study_sessions_session_type_check'
  ) then
    alter table public.study_sessions
      add constraint study_sessions_session_type_check
      check (session_type is null or session_type in ('estudo', 'revisao', 'trabalho', 'prova', 'aprender', 'praticar', 'avancar', 'livre'));
  end if;
end $$;

create index if not exists idx_study_sessions_context_mode
  on public.study_sessions(user_id, context_mode, created_at desc);

create index if not exists idx_study_sessions_academic_subject
  on public.study_sessions(academic_subject_id, created_at desc);

create index if not exists idx_study_sessions_learning_topic
  on public.study_sessions(learning_topic_id, created_at desc);

alter table public.review_plan_items
  add column if not exists context_mode text,
  add column if not exists academic_subject_id uuid references public.academic_subjects(id) on delete set null,
  add column if not exists academic_exam_id uuid references public.academic_exams(id) on delete set null,
  add column if not exists academic_assignment_id uuid references public.academic_assignments(id) on delete set null,
  add column if not exists learning_topic_id uuid references public.learning_topics(id) on delete set null,
  add column if not exists review_type text,
  add column if not exists content_title text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'review_plan_items_context_mode_check'
  ) then
    alter table public.review_plan_items
      add constraint review_plan_items_context_mode_check
      check (context_mode is null or context_mode in ('enem', 'concurso', 'faculdade', 'outros', 'hibrido'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'review_plan_items_review_type_check'
  ) then
    alter table public.review_plan_items
      add constraint review_plan_items_review_type_check
      check (review_type is null or review_type in ('aula', 'topico', 'prova', 'resumo', 'conceito', 'pratica'));
  end if;
end $$;

create index if not exists idx_review_plan_items_context_mode
  on public.review_plan_items(user_id, context_mode, scheduled_for asc);

create index if not exists idx_review_plan_items_academic_subject
  on public.review_plan_items(academic_subject_id, scheduled_for asc);

create index if not exists idx_review_plan_items_learning_topic
  on public.review_plan_items(learning_topic_id, scheduled_for asc);

-- --------------------------------------------
-- 5) Trigger generico de updated_at
-- --------------------------------------------
create or replace function public.touch_study_context_entities_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'user_study_contexts',
    'academic_institutions',
    'academic_courses',
    'academic_periods',
    'academic_subjects',
    'academic_exams',
    'academic_assignments',
    'academic_class_notes',
    'academic_calendar_events',
    'learning_topics',
    'learning_goals',
    'learning_paths',
    'learning_path_steps',
    'personal_goal_events'
  ]
  loop
    trigger_name := table_name || '_touch_updated_at';
    execute format('drop trigger if exists %I on public.%I', trigger_name, table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_study_context_entities_updated_at()',
      trigger_name,
      table_name
    );
  end loop;
end $$;

-- --------------------------------------------
-- 6) RLS padrao para tabelas user-scoped
-- --------------------------------------------
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_study_contexts',
    'academic_institutions',
    'academic_courses',
    'academic_periods',
    'academic_subjects',
    'academic_exams',
    'academic_assignments',
    'academic_class_notes',
    'academic_calendar_events',
    'learning_topics',
    'learning_goals',
    'learning_paths',
    'learning_path_steps',
    'personal_goal_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      table_name || '_select_own',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)',
      table_name || '_insert_own',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      table_name || '_update_own',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id)',
      table_name || '_delete_own',
      table_name
    );
  end loop;
end $$;
