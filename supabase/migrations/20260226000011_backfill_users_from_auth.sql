-- ============================================================
-- Backfill: garantir public.users para contas já existentes
-- Após migração para trigger on_auth_user_created
-- ============================================================

INSERT INTO public.users (id, email, name)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) AS name
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
  AND au.email IS NOT NULL;
