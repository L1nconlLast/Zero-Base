-- Medicina do Zero - Sprint 1.3 (Academia RPC anti-farm)
-- Função atômica para conclusão de conteúdo + XP

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
begin
  -- Segurança: usuário só opera o próprio progresso
  if auth.uid() is distinct from p_user_id then
    return query select false, false, 0, 0, 'Usuário não autorizado.';
    return;
  end if;

  -- Garante que conteúdo existe e pega XP no banco (não confia no frontend)
  select sc.xp_reward
    into v_xp_reward
  from public.study_content sc
  where sc.id = p_content_id;

  if v_xp_reward is null then
    return query select false, false, 0, 0, 'Conteúdo não encontrado.';
    return;
  end if;

  -- Anti-farm: verifica se já foi concluído
  select exists (
    select 1
    from public.user_content_progress ucp
    where ucp.user_id = p_user_id
      and ucp.content_id = p_content_id
      and ucp.completed = true
  )
  into v_exists;

  if v_exists then
    select u.xp into v_current_xp
    from public.users u
    where u.id = p_user_id;

    return query select false, true, 0, coalesce(v_current_xp, 0), 'Conteúdo já concluído. XP não alterado.';
    return;
  end if;

  -- Registra progresso
  insert into public.user_content_progress (user_id, content_id, completed, completed_at)
  values (p_user_id, p_content_id, true, now())
  on conflict (user_id, content_id)
  do update set
    completed = true,
    completed_at = now();

  -- Atualiza XP e nível de forma atômica
  select u.xp into v_current_xp
  from public.users u
  where u.id = p_user_id
  for update;

  if v_current_xp is null then
    return query select false, false, 0, 0, 'Perfil do usuário não encontrado em users.';
    return;
  end if;

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
