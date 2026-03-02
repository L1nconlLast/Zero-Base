-- ============================================================
-- Security Advisor fixes
-- 1) Function Search Path Mutable: public.touch_updated_at
-- 2) Security Definer View warnings: analytics views
-- ============================================================

-- 1) Harden trigger function search_path
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) Force views to run with invoker privileges
-- (safer with RLS + per-user access semantics)
alter view if exists public.vw_desempenho_usuario_topico
  set (security_invoker = true);

alter view if exists public.vw_questoes_estatisticas
  set (security_invoker = true);
