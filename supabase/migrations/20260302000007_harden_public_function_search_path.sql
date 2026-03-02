-- ============================================================
-- Harden search_path for legacy public functions (varredura completa)
-- Aplica em funções do schema public que ainda não possuem search_path fixo
-- ============================================================

DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT
      p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(p.proconfig) cfg
          WHERE cfg LIKE 'search_path=%'
        )
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = public, pg_temp;',
      fn.signature
    );
  END LOOP;
END
$$;
