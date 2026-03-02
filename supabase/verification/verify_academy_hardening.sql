-- Verificação automática da hardening da Academia (PASS/FAIL)
-- Execute no Supabase SQL Editor após rodar as migrations.

with checks as (
  select
    'users.is_pro column exists'::text as check_name,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'users'
        and column_name = 'is_pro'
    ) as passed,
    'A coluna users.is_pro precisa existir para bloqueio PRO no backend.'::text as details

  union all

  select
    'unique(user_id, content_id) on user_content_progress'::text,
    exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'user_content_progress'
        and indexdef ilike '%unique%'
        and indexdef ilike '%(user_id, content_id)%'
    ) as passed,
    'Precisa existir chave única para anti-duplicação de progresso/XP.'::text

  union all

  select
    'RPC complete_academy_content exists'::text,
    exists (
      select 1
      from information_schema.routines
      where routine_schema = 'public'
        and routine_name = 'complete_academy_content'
        and routine_type = 'FUNCTION'
    ) as passed,
    'Função RPC de conclusão da academia deve existir.'::text

  union all

  select
    'RPC contains PRO gate (is_premium + is_pro)'::text,
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'complete_academy_content'
        and pg_get_functiondef(p.oid) ilike '%is_premium%'
        and pg_get_functiondef(p.oid) ilike '%is_pro%'
    ) as passed,
    'A RPC deve validar conteúdo premium e status PRO do usuário.'::text

  union all

  select
    'RPC contains anti-duplication check (already completed)'::text,
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'complete_academy_content'
        and pg_get_functiondef(p.oid) ilike '%already_completed%'
        and pg_get_functiondef(p.oid) ilike '%user_content_progress%'
    ) as passed,
    'A RPC deve impedir soma de XP duplicada para conteúdo já concluído.'::text

  union all

  select
    'RPC execution granted to authenticated'::text,
    exists (
      select 1
      from information_schema.routine_privileges
      where specific_schema = 'public'
        and routine_name = 'complete_academy_content'
        and grantee = 'authenticated'
        and privilege_type = 'EXECUTE'
    ) as passed,
    'Usuários autenticados precisam permissão EXECUTE na RPC.'::text
)
select
  case when passed then 'PASS' else 'FAIL' end as status,
  check_name,
  details
from checks
order by status, check_name;

-- Bloco estrito opcional: descomente para falhar a execução quando houver FAIL.
-- do $$
-- declare
--   failed_count integer;
-- begin
--   with checks as (
--     select exists (
--       select 1 from information_schema.columns
--       where table_schema = 'public' and table_name = 'users' and column_name = 'is_pro'
--     ) as passed
--     union all
--     select exists (
--       select 1 from pg_indexes
--       where schemaname = 'public' and tablename = 'user_content_progress'
--         and indexdef ilike '%unique%' and indexdef ilike '%(user_id, content_id)%'
--     )
--     union all
--     select exists (
--       select 1 from information_schema.routines
--       where routine_schema = 'public' and routine_name = 'complete_academy_content'
--     )
--   )
--   select count(*) into failed_count from checks where passed = false;
--
--   if failed_count > 0 then
--     raise exception 'Verificação da hardening falhou: % checks com FAIL.', failed_count;
--   else
--     raise notice 'Verificação concluída: todos os checks principais passaram.';
--   end if;
-- end $$;
