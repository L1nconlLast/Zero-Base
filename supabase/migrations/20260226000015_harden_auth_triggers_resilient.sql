-- ============================================================
-- Hardening: tornar triggers de auth resilientes (não abortar Auth)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
BEGIN
  -- Para provedores sem email (ex.: phone), não força criação em public.users
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1),
    'Usuário'
  );

  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, v_name)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user_id=%: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.users
  SET
    email = NEW.email,
    name = COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''), name)
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_auth_user_updated failed for user_id=%: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
