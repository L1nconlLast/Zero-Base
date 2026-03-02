-- Verificação automática da migration user_achievements (PASS/FAIL)
-- Execute no Supabase SQL Editor após rodar:
-- 20260226_000008_user_achievements.sql

with checks as (
  select
    'user_achievements table exists'::text as check_name,
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'user_achievements'
    ) as passed,
    'A tabela public.user_achievements deve existir.'::text as details

  union all

  select
    'user_achievements required columns exist'::text,
    (
      exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_achievements' and column_name='id')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_achievements' and column_name='user_id')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_achievements' and column_name='achievement_id')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_achievements' and column_name='unlocked_at')
    ),
    'As colunas id, user_id, achievement_id, unlocked_at devem existir.'::text

  union all

  select
    'user_achievements unique constraint exists'::text,
    exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and t.relname = 'user_achievements'
        and c.contype = 'u'
        and pg_get_constraintdef(c.oid) ilike '%user_id%achievement_id%'
    ),
    'Constraint unique(user_id, achievement_id) deve existir.'::text

  union all

  select
    'user_achievements RLS enabled'::text,
    exists (
      select 1
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'user_achievements' and c.relrowsecurity = true
    ),
    'RLS precisa estar habilitado.'::text

  union all

  select
    'user_achievements policies exist'::text,
    (
      exists (select 1 from pg_policies where schemaname='public' and tablename='user_achievements' and policyname='user_achievements_select_own')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='user_achievements' and policyname='user_achievements_insert_own')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='user_achievements' and policyname='user_achievements_delete_own')
    ),
    'As políticas select/insert/delete devem existir.'::text
)
select
  case when passed then 'PASS' else 'FAIL' end as status,
  check_name,
  details
from checks
order by status, check_name;
