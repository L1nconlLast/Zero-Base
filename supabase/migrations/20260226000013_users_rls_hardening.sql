-- ============================================================
-- Hardening: public.users com mínimo privilégio para clientes
-- - Inserção passa a ser apenas por trigger em auth.users
-- - Update limitado a campos de perfil editáveis
-- ============================================================

-- 1) Desabilita insert direto por cliente autenticado/anônimo
DROP POLICY IF EXISTS "users_insert_own" ON public.users;

REVOKE INSERT ON public.users FROM authenticated;
REVOKE INSERT ON public.users FROM anon;

-- 2) Limita update de clientes apenas a colunas seguras
-- Remove update genérico e regranta de forma restrita por coluna
REVOKE UPDATE ON public.users FROM authenticated;
REVOKE UPDATE ON public.users FROM anon;

GRANT UPDATE (name, daily_goal_minutes) ON public.users TO authenticated;

-- Observação:
-- service_role e funções SECURITY DEFINER continuam podendo sincronizar
-- email/xp/level/streak via processos de backend/trigger.
