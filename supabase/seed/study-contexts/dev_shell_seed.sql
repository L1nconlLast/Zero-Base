-- Seed oficial de desenvolvimento para os shells nativos de faculdade e outros.
-- Antes de rodar, substitua __USER_ID__ pelo UUID real do usuario de desenvolvimento.

begin;

with target_user as (
  select '__USER_ID__'::uuid as user_id
),
faculdade_context as (
  insert into public.user_study_contexts (
    user_id,
    mode,
    is_active,
    context_summary,
    context_description,
    context_payload
  )
  select
    user_id,
    'faculdade',
    false,
    'ADS · 3o periodo',
    'Contexto academico de desenvolvimento com foco em provas.',
    jsonb_build_object(
      'faculdade',
      jsonb_build_object(
        'institutionName', 'IFPI',
        'institutionType', 'instituto',
        'courseName', 'Analise e Desenvolvimento de Sistemas',
        'academicPeriodLabel', '3o periodo',
        'academicPeriodNumber', 3,
        'focus', 'provas'
      )
    )
  from target_user
  on conflict (user_id, mode) do update
    set context_summary = excluded.context_summary,
        context_description = excluded.context_description,
        context_payload = excluded.context_payload
  returning user_id
),
outros_context as (
  insert into public.user_study_contexts (
    user_id,
    mode,
    is_active,
    context_summary,
    context_description,
    context_payload
  )
  select
    user_id,
    'outros',
    false,
    'JavaScript moderno',
    'Contexto livre de desenvolvimento com pratica guiada.',
    jsonb_build_object(
      'outros',
      jsonb_build_object(
        'topicName', 'JavaScript moderno',
        'goalType', 'praticar',
        'level', 'intermediario',
        'dailyMinutes', 30,
        'pace', 'moderado'
      )
    )
  from target_user
  on conflict (user_id, mode) do update
    set context_summary = excluded.context_summary,
        context_description = excluded.context_description,
        context_payload = excluded.context_payload
  returning user_id
),
institution as (
  insert into public.academic_institutions (user_id, name, institution_type, is_primary)
  select user_id, 'IFPI', 'instituto', true from target_user
  on conflict do nothing
  returning id, user_id
),
course as (
  insert into public.academic_courses (user_id, institution_id, name, is_primary)
  select target_user.user_id, institution.id, 'Analise e Desenvolvimento de Sistemas', true
  from target_user
  left join institution on institution.user_id = target_user.user_id
  on conflict do nothing
  returning id, user_id
),
period as (
  insert into public.academic_periods (user_id, label, number, is_current)
  select user_id, '3o periodo', 3, true from target_user
  on conflict do nothing
  returning id, user_id
)
insert into public.academic_subjects (user_id, institution_id, course_id, academic_period_id, name, workload_hours, professor_name)
select
  target_user.user_id,
  (select id from public.academic_institutions where user_id = target_user.user_id order by is_primary desc, created_at asc limit 1),
  (select id from public.academic_courses where user_id = target_user.user_id order by is_primary desc, created_at asc limit 1),
  (select id from public.academic_periods where user_id = target_user.user_id order by is_current desc, created_at asc limit 1),
  subject_name,
  workload_hours,
  professor_name
from target_user
cross join (
  values
    ('Calculo I', 60, 'Prof. Helena Rocha'),
    ('Algoritmos', 80, 'Prof. Bruno Lima'),
    ('Banco de Dados', 60, 'Prof. Camila Torres')
) as demo_subjects(subject_name, workload_hours, professor_name)
on conflict do nothing;

insert into public.academic_exams (user_id, subject_id, title, exam_date, weight, status)
select
  target_user.user_id,
  subject.id,
  'P1 de Calculo',
  now() + interval '7 days',
  4,
  'pendente'
from target_user
join public.academic_subjects subject
  on subject.user_id = target_user.user_id
 and lower(subject.name) = lower('Calculo I')
where not exists (
  select 1
  from public.academic_exams exam
  where exam.user_id = target_user.user_id
);

insert into public.academic_assignments (user_id, subject_id, title, description, due_date, priority, status)
select
  target_user.user_id,
  subject.id,
  'Relatorio de Algoritmos',
  'Entregar pseudocodigo e analise do problema.',
  now() + interval '4 days',
  'alta',
  'nao_iniciado'
from target_user
join public.academic_subjects subject
  on subject.user_id = target_user.user_id
 and lower(subject.name) = lower('Algoritmos')
where not exists (
  select 1
  from public.academic_assignments assignment
  where assignment.user_id = target_user.user_id
);

insert into public.academic_calendar_events (user_id, subject_id, event_type, title, start_at, status)
select
  target_user.user_id,
  subject.id,
  demo_events.event_type,
  demo_events.title,
  demo_events.start_at,
  'pendente'
from target_user
cross join lateral (
  values
    ('Calculo I', 'estudo', 'Revisao guiada de limites', now() + interval '2 days'),
    ('Algoritmos', 'entrega', 'Entrega parcial do relatorio', now() + interval '4 days'),
    ('Banco de Dados', 'aula_importante', 'Plantao de duvidas de modelagem', now() + interval '6 days')
) as demo_events(subject_name, event_type, title, start_at)
join public.academic_subjects subject
  on subject.user_id = target_user.user_id
 and lower(subject.name) = lower(demo_events.subject_name)
where not exists (
  select 1
  from public.academic_calendar_events event
  where event.user_id = target_user.user_id
);

insert into public.learning_topics (user_id, name, category, level, status)
select user_id, 'JavaScript moderno', 'Tecnologia', 'intermediario', 'ativo'
from target_user
where not exists (
  select 1
  from public.learning_topics topic
  where topic.user_id = target_user.user_id
);

insert into public.learning_goals (user_id, topic_id, goal_type, description, status)
select
  target_user.user_id,
  topic.id,
  'praticar',
  'Manter ritmo semanal com pratica e pequenos blocos de evolucao.',
  'ativo'
from target_user
join public.learning_topics topic
  on topic.user_id = target_user.user_id
 and lower(topic.name) = lower('JavaScript moderno')
where not exists (
  select 1
  from public.learning_goals goal
  where goal.user_id = target_user.user_id
);

insert into public.learning_paths (user_id, topic_id, title, progress_percent, status)
select
  target_user.user_id,
  topic.id,
  'Base pratica de JavaScript',
  33,
  'ativa'
from target_user
join public.learning_topics topic
  on topic.user_id = target_user.user_id
 and lower(topic.name) = lower('JavaScript moderno')
where not exists (
  select 1
  from public.learning_paths path
  where path.user_id = target_user.user_id
);

insert into public.learning_path_steps (user_id, path_id, title, description, step_order, status)
select
  target_user.user_id,
  path.id,
  title,
  description,
  step_order,
  status
from target_user
join public.learning_paths path
  on path.user_id = target_user.user_id
 and lower(path.title) = lower('Base pratica de JavaScript')
cross join lateral (
  values
    ('Fechar fundamentos de variaveis e tipos', 'Consolidar base antes de avancar.', 1, 'concluido'),
    ('Praticar funcoes e arrays com exercicios curtos', 'Manter bloco de pratica ativa.', 2, 'em_andamento'),
    ('Montar mini projeto de lista de tarefas', 'Aplicar o tema em algo concreto.', 3, 'nao_iniciado')
) as demo_steps(title, description, step_order, status)
where not exists (
  select 1
  from public.learning_path_steps step
  where step.user_id = target_user.user_id
);

insert into public.personal_goal_events (user_id, topic_id, title, event_type, start_at, status)
select
  target_user.user_id,
  topic.id,
  title,
  event_type,
  start_at,
  'pendente'
from target_user
join public.learning_topics topic
  on topic.user_id = target_user.user_id
 and lower(topic.name) = lower('JavaScript moderno')
cross join lateral (
  values
    ('Meta semanal de pratica', 'meta', now() + interval '2 days'),
    ('Revisao curta dos conceitos-chave', 'revisao', now() + interval '5 days')
) as demo_events(title, event_type, start_at)
where not exists (
  select 1
  from public.personal_goal_events event
  where event.user_id = target_user.user_id
);

commit;
