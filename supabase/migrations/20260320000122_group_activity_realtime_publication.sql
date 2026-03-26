-- ============================================================
-- Ensure group_activities participates in Supabase Realtime
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'group_activities'
  ) then
    alter publication supabase_realtime add table public.group_activities;
  end if;
end
$$;
