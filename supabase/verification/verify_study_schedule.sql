-- Verificação automática da migration study_schedule (PASS/FAIL)
-- Execute no Supabase SQL Editor após rodar:
-- 20260226_000007_study_schedule.sql

with checks as (
  select
    'study_schedule table exists'::text as check_name,
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'study_schedule'
    ) as passed,
    'A tabela public.study_schedule deve existir.'::text as details

  union all

  select
    'study_schedule required columns exist'::text,
    (
      exists (select 1 from information_schema.columns where table_schema='public' and table_name='study_schedule' and column_name='id')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='study_schedule' and column_name='user_id')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='study_schedule' and column_name='date')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='study_schedule' and column_name='subject')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='study_schedule' and column_name='note')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='study_schedule' and column_name='done')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='study_schedule' and column_name='created_at')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='study_schedule' and column_name='updated_at')
    ),
    'As colunas id, user_id, date, subject, note, done, created_at, updated_at devem existir.'::text

  union all

  select
    'study_schedule user_id FK exists'::text,
    exists (
      select 1
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
      join information_schema.referential_constraints rc on tc.constraint_name = rc.constraint_name
      join information_schema.constraint_column_usage ccu on rc.unique_constraint_name = ccu.constraint_name
      where tc.table_schema = 'public' and tc.table_name = 'study_schedule'
        and tc.constraint_type = 'FOREIGN KEY'
        and kcu.column_name = 'user_id'
        and ccu.table_name = 'users' and ccu.column_name = 'id'
    ),
    'A coluna user_id deve referenciar public.users(id).'::text

  union all

  select
    'study_schedule indexes exist'::text,
    (
      exists (select 1 from pg_indexes where schemaname='public' and tablename='study_schedule' and indexname='idx_study_schedule_user_date')
      and exists (select 1 from pg_indexes where schemaname='public' and tablename='study_schedule' and indexname='idx_study_schedule_user_done')
    ),
    'Os índices idx_study_schedule_user_date e idx_study_schedule_user_done devem existir.'::text

  union all

  select
    'study_schedule RLS enabled'::text,
    exists (
      select 1
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'study_schedule' and c.relrowsecurity = true
    ),
    'RLS precisa estar habilitado.'::text

  union all

  select
    'study_schedule all policies exist'::text,
    (
      exists (select 1 from pg_policies where schemaname='public' and tablename='study_schedule' and policyname='study_schedule_select_own')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='study_schedule' and policyname='study_schedule_insert_own')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='study_schedule' and policyname='study_schedule_update_own')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='study_schedule' and policyname='study_schedule_delete_own')
    ),
    'As políticas select/insert/update/delete devem existir.'::text
)
select
  case when passed then 'PASS' else 'FAIL' end as status,
  check_name,
  details
from checks
order by status, check_name;
