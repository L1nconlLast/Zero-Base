-- Verificação automática da migration Mentor IA (PASS/FAIL)
-- Execute no Supabase SQL Editor após rodar:
-- 20260226_000006_mentor_messages.sql

with checks as (
  select
    'mentor_messages table exists'::text as check_name,
    exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'mentor_messages'
    ) as passed,
    'A tabela public.mentor_messages deve existir.'::text as details

  union all

  select
    'mentor_messages required columns exist'::text,
    (
      exists (select 1 from information_schema.columns where table_schema='public' and table_name='mentor_messages' and column_name='id')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='mentor_messages' and column_name='user_id')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='mentor_messages' and column_name='role')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='mentor_messages' and column_name='content')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='mentor_messages' and column_name='created_at')
    ) as passed,
    'As colunas id, user_id, role, content e created_at precisam existir.'::text

  union all

  select
    'mentor_messages id default uses gen_random_uuid'::text,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'mentor_messages'
        and column_name = 'id'
        and column_default ilike '%gen_random_uuid%'
    ) as passed,
    'A coluna id deve ter default gen_random_uuid().'::text

  union all

  select
    'mentor_messages created_at default uses now'::text,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'mentor_messages'
        and column_name = 'created_at'
        and column_default ilike '%now()%'
    ) as passed,
    'A coluna created_at deve ter default now().'::text

  union all

  select
    'mentor_messages user_id foreign key exists'::text,
    exists (
      select 1
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      join information_schema.referential_constraints rc
        on tc.constraint_name = rc.constraint_name
       and tc.table_schema = rc.constraint_schema
      join information_schema.constraint_column_usage ccu
        on rc.unique_constraint_name = ccu.constraint_name
       and rc.unique_constraint_schema = ccu.constraint_schema
      where tc.table_schema = 'public'
        and tc.table_name = 'mentor_messages'
        and tc.constraint_type = 'FOREIGN KEY'
        and kcu.column_name = 'user_id'
        and ccu.table_schema = 'public'
        and ccu.table_name = 'users'
        and ccu.column_name = 'id'
    ) as passed,
    'A coluna user_id deve referenciar public.users(id).'::text

  union all

  select
    'mentor_messages role check constraint exists'::text,
    exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'mentor_messages'
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ilike '%role%assistant%user%'
    ) as passed,
    'A coluna role deve permitir apenas assistant/user.'::text

  union all

  select
    'mentor_messages index user_id + created_at exists'::text,
    exists (
      select 1
      from pg_class i
      join pg_namespace n on n.oid = i.relnamespace
      join pg_index ix on ix.indexrelid = i.oid
      join pg_class t on t.oid = ix.indrelid
      join pg_namespace tn on tn.oid = t.relnamespace
      where n.nspname = 'public'
        and i.relname = 'idx_mentor_messages_user_created_at'
        and tn.nspname = 'public'
        and t.relname = 'mentor_messages'
        and pg_get_indexdef(i.oid) ilike '%(user_id, created_at%'
    ) as passed,
    'Índice composto para leitura de histórico por usuário deve existir.'::text

  union all

  select
    'mentor_messages RLS enabled'::text,
    exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'mentor_messages'
        and c.relrowsecurity = true
    ) as passed,
    'RLS precisa estar habilitado na tabela mentor_messages.'::text

  union all

  select
    'mentor_messages all policies exist'::text,
    (
      exists (select 1 from pg_policies where schemaname='public' and tablename='mentor_messages' and policyname='mentor_messages_select_own')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='mentor_messages' and policyname='mentor_messages_insert_own')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='mentor_messages' and policyname='mentor_messages_update_own')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='mentor_messages' and policyname='mentor_messages_delete_own')
    ) as passed,
    'As políticas select/insert/update/delete para dono devem existir.'::text

  union all

  select
    'mentor_messages select policy expression is correct'::text,
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'mentor_messages'
        and policyname = 'mentor_messages_select_own'
        and cmd = 'SELECT'
        and qual ilike '%auth.uid()%= user_id%'
    ) as passed,
    'A policy mentor_messages_select_own deve usar auth.uid() = user_id.'::text

  union all

  select
    'mentor_messages insert policy expression is correct'::text,
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'mentor_messages'
        and policyname = 'mentor_messages_insert_own'
        and cmd = 'INSERT'
        and with_check ilike '%auth.uid()%= user_id%'
    ) as passed,
    'A policy mentor_messages_insert_own deve usar with check auth.uid() = user_id.'::text

  union all

  select
    'mentor_messages update policy expression is correct'::text,
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'mentor_messages'
        and policyname = 'mentor_messages_update_own'
        and cmd = 'UPDATE'
        and qual ilike '%auth.uid()%= user_id%'
        and with_check ilike '%auth.uid()%= user_id%'
    ) as passed,
    'A policy mentor_messages_update_own deve validar owner em using e with check.'::text

  union all

  select
    'mentor_messages delete policy expression is correct'::text,
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'mentor_messages'
        and policyname = 'mentor_messages_delete_own'
        and cmd = 'DELETE'
        and qual ilike '%auth.uid()%= user_id%'
    ) as passed,
    'A policy mentor_messages_delete_own deve usar auth.uid() = user_id.'::text
)
select
  case when passed then 'PASS' else 'FAIL' end as status,
  check_name,
  details
from checks
order by status, check_name;

-- Bloco opcional (estrito): descomente para falhar quando houver FAIL.
-- do $$
-- declare
--   failed_count integer;
-- begin
--   with checks as (
--     select
--       exists (
--         select 1
--         from information_schema.tables
--         where table_schema = 'public'
--           and table_name = 'mentor_messages'
--       ) as passed
--
--     union all
--
--     select
--       exists (
--         select 1
--         from information_schema.columns
--         where table_schema = 'public'
--           and table_name = 'mentor_messages'
--           and column_name = 'id'
--           and column_default ilike '%gen_random_uuid%'
--       )
--
--     union all
--
--     select
--       exists (
--         select 1
--         from information_schema.columns
--         where table_schema = 'public'
--           and table_name = 'mentor_messages'
--           and column_name = 'created_at'
--           and column_default ilike '%now()%'
--       )
--
--     union all
--
--     select
--       exists (
--         select 1
--         from pg_class c
--         join pg_namespace n on n.oid = c.relnamespace
--         where n.nspname = 'public'
--           and c.relname = 'mentor_messages'
--           and c.relrowsecurity = true
--       )
--
--     union all
--
--     select
--       (
--         exists (select 1 from pg_policies where schemaname='public' and tablename='mentor_messages' and policyname='mentor_messages_select_own' and cmd='SELECT' and qual ilike '%auth.uid()%= user_id%')
--         and exists (select 1 from pg_policies where schemaname='public' and tablename='mentor_messages' and policyname='mentor_messages_insert_own' and cmd='INSERT' and with_check ilike '%auth.uid()%= user_id%')
--         and exists (select 1 from pg_policies where schemaname='public' and tablename='mentor_messages' and policyname='mentor_messages_update_own' and cmd='UPDATE' and qual ilike '%auth.uid()%= user_id%' and with_check ilike '%auth.uid()%= user_id%')
--         and exists (select 1 from pg_policies where schemaname='public' and tablename='mentor_messages' and policyname='mentor_messages_delete_own' and cmd='DELETE' and qual ilike '%auth.uid()%= user_id%')
--       )
--   )
--   select count(*) into failed_count from checks where passed = false;
--
--   if failed_count > 0 then
--     raise exception 'Verificação do Mentor IA falhou: % checks com FAIL.', failed_count;
--   else
--     raise notice 'Verificação do Mentor IA concluída: todos os checks principais passaram.';
--   end if;
-- end $$;
