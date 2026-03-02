-- ============================================================
-- Audit: trilha de alterações em public.users
-- Registra quem alterou, quando e diff before/after
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  changed_by uuid NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  role_name text NULL,
  operation text NOT NULL CHECK (operation IN ('UPDATE', 'DELETE')),
  old_data jsonb NULL,
  new_data jsonb NULL
);

ALTER TABLE public.users_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_audit_select_own" ON public.users_audit_log;
CREATE POLICY "users_audit_select_own"
  ON public.users_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.users_audit_log FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.users_audit_log FROM anon;

CREATE INDEX IF NOT EXISTS idx_users_audit_user_id_changed_at
  ON public.users_audit_log(user_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.audit_users_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);

  IF TG_OP = 'UPDATE' THEN
    IF row_to_json(OLD) IS DISTINCT FROM row_to_json(NEW) THEN
      INSERT INTO public.users_audit_log (
        user_id,
        changed_by,
        changed_at,
        role_name,
        operation,
        old_data,
        new_data
      )
      VALUES (
        NEW.id,
        auth.uid(),
        now(),
        v_role,
        'UPDATE',
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.users_audit_log (
      user_id,
      changed_by,
      changed_at,
      role_name,
      operation,
      old_data,
      new_data
    )
    VALUES (
      OLD.id,
      auth.uid(),
      now(),
      v_role,
      'DELETE',
      to_jsonb(OLD),
      NULL
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_users_audit ON public.users;
CREATE TRIGGER trigger_users_audit
AFTER UPDATE OR DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.audit_users_changes();
