-- Medicina do Zero - Sprint 1.4 (Academia hardening)
-- Backend como fonte de verdade para XP e bloqueio PRO

-- =========================================
-- USERS: flag para plano PRO
-- =========================================
alter table public.users
  add column if not exists is_pro boolean not null default false;

-- =========================================
-- Garantia de unicidade user/content (anti-duplicação)
-- =========================================
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'user_content_progress'
      and indexdef ilike '%unique%'
      and indexdef ilike '%(user_id, content_id)%'
  ) then
    alter table public.user_content_progress
      add constraint unique_user_content unique (user_id, content_id);
  end if;
end $$;

-- =========================================
-- RPC: conclusão atômica com bloqueio PRO
-- =========================================
create or replace function public.complete_academy_content(
  p_user_id uuid,
  p_content_id uuid
)
returns table (
  success boolean,
  already_completed boolean,
  xp_reward integer,
  new_total_xp integer,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
  v_xp_reward integer;
  v_current_xp integer;
  v_new_xp integer;
  v_is_premium boolean;
  v_user_is_pro boolean;
begin
  if auth.uid() is distinct from p_user_id then
    return query select false, false, 0, 0, 'Usuário não autorizado.';
    return;
  end if;

  select sc.xp_reward, sc.is_premium
    into v_xp_reward, v_is_premium
  from public.study_content sc
  where sc.id = p_content_id;

  if v_xp_reward is null then
    return query select false, false, 0, 0, 'Conteúdo não encontrado.';
    return;
  end if;

  select u.is_pro, u.xp
    into v_user_is_pro, v_current_xp
  from public.users u
  where u.id = p_user_id
  for update;

  if v_current_xp is null then
    return query select false, false, 0, 0, 'Perfil do usuário não encontrado em users.';
    return;
  end if;

  if v_is_premium and coalesce(v_user_is_pro, false) = false then
    return query select false, false, 0, v_current_xp, 'Conteúdo PRO bloqueado para este usuário.';
    return;
  end if;

  select exists (
    select 1
    from public.user_content_progress ucp
    where ucp.user_id = p_user_id
      and ucp.content_id = p_content_id
      and ucp.completed = true
  )
  into v_exists;

  if v_exists then
    return query select false, true, 0, coalesce(v_current_xp, 0), 'Conteúdo já concluído. XP não alterado.';
    return;
  end if;

  insert into public.user_content_progress (user_id, content_id, completed, completed_at)
  values (p_user_id, p_content_id, true, now())
  on conflict (user_id, content_id)
  do update set
    completed = true,
    completed_at = now();

  v_new_xp := v_current_xp + v_xp_reward;

  update public.users
  set
    xp = v_new_xp,
    level = floor(v_new_xp / 1000.0)::integer + 1
  where id = p_user_id;

  return query select true, false, v_xp_reward, v_new_xp, 'Conteúdo concluído com sucesso.';
end;
$$;

grant execute on function public.complete_academy_content(uuid, uuid) to authenticated;
