-- Verificação rápida das tabelas de sessões de questões

select
  case when to_regclass('public.mock_exam_sessions') is not null then 'PASS' else 'FAIL' end as mock_exam_sessions_exists,
  case when to_regclass('public.daily_quiz_sessions') is not null then 'PASS' else 'FAIL' end as daily_quiz_sessions_exists;

select
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('mock_exam_sessions', 'daily_quiz_sessions')
order by tablename;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('mock_exam_sessions', 'daily_quiz_sessions')
order by tablename, policyname;
