-- Verificação automática da migration week_progress (PASS/FAIL)
-- Execute no Supabase SQL Editor após rodar:
-- 20260226_000009_week_progress.sql

with checks as (
  select
    'week_progress table exists'::text as check_name,
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'week_progress'
    ) as passed,
    'A tabela public.week_progress deve existir.'::text as details

  union all

  select
    'week_progress required columns exist'::text,
    (
      exists (select 1 from information_schema.columns where table_schema='public' and table_name='week_progress' and column_name='id')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='week_progress' and column_name='user_id')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='week_progress' and column_name='week_start')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='week_progress' and column_name='day_of_week')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='week_progress' and column_name='minutes')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='week_progress' and column_name='studied')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='week_progress' and column_name='updated_at')
    ),
    'As colunas id, user_id, week_start, day_of_week, minutes, studied, updated_at devem existir.'::text

  union all

  select
    'week_progress unique constraint exists'::text,
    exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and t.relname = 'week_progress'
        and c.contype = 'u'
        and pg_get_constraintdef(c.oid) ilike '%user_id%week_start%day_of_week%'
    ),
    'Constraint unique(user_id, week_start, day_of_week) deve existir.'::text

  union all

  select
    'week_progress day_of_week check constraint exists'::text,
    exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and t.relname = 'week_progress'
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ilike '%day_of_week%'
    ),
    'A coluna day_of_week deve ter check constraint (0-6).'::text

  union all

  select
    'week_progress RLS enabled'::text,
    exists (
      select 1
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'week_progress' and c.relrowsecurity = true
    ),
    'RLS precisa estar habilitado.'::text

  union all

  select
    'week_progress all policies exist'::text,
    (
      exists (select 1 from pg_policies where schemaname='public' and tablename='week_progress' and policyname='week_progress_select_own')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='week_progress' and policyname='week_progress_insert_own')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='week_progress' and policyname='week_progress_update_own')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='week_progress' and policyname='week_progress_delete_own')
    ),
    'As políticas select/insert/update/delete devem existir.'::text
)
select
  case when passed then 'PASS' else 'FAIL' end as status,
  check_name,
  details
from checks
order by status, check_name;
