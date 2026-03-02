-- Verificação funcional da Academia (com rollback)
-- Objetivo:
-- 1) 1ª conclusão de conteúdo grátis soma XP
-- 2) 2ª conclusão do mesmo conteúdo NÃO soma XP (anti-duplicação)
-- 3) Conteúdo PRO bloqueia usuário sem plano PRO
--
-- Executar no Supabase SQL Editor.
-- Este script NÃO persiste alterações (usa BEGIN ... ROLLBACK).

begin;

create temp table if not exists academy_functional_results (
  test_name text,
  status text,
  details text
);

truncate table academy_functional_results;

do $$
declare
  v_user_id uuid;
  v_free_content_id uuid;
  v_pro_content_id uuid;
  v_before_xp integer;
  v_after_first_xp integer;
  v_after_second_xp integer;
  v_after_pro_attempt_xp integer;
  v_previous_is_pro boolean;
  r_first record;
  r_second record;
  r_pro record;
begin
  -- Pré-condições mínimas
  select u.id, u.xp, u.is_pro
    into v_user_id, v_before_xp, v_previous_is_pro
  from public.users u
  order by u.created_at asc
  limit 1;

  if v_user_id is null then
    insert into academy_functional_results values (
      'precondition:user_exists',
      'FAIL',
      'Nenhum usuário encontrado em public.users.'
    );
    return;
  else
    insert into academy_functional_results values (
      'precondition:user_exists',
      'PASS',
      'Usuário de teste selecionado: ' || v_user_id::text
    );
  end if;

  select sc.id
    into v_free_content_id
  from public.study_content sc
  where sc.is_premium = false
  order by sc.created_at asc
  limit 1;

  if v_free_content_id is null then
    insert into academy_functional_results values (
      'precondition:free_content_exists',
      'FAIL',
      'Nenhum conteúdo gratuito encontrado em public.study_content.'
    );
    return;
  else
    insert into academy_functional_results values (
      'precondition:free_content_exists',
      'PASS',
      'Conteúdo gratuito selecionado: ' || v_free_content_id::text
    );
  end if;

  select sc.id
    into v_pro_content_id
  from public.study_content sc
  where sc.is_premium = true
  order by sc.created_at asc
  limit 1;

  if v_pro_content_id is null then
    insert into academy_functional_results values (
      'precondition:pro_content_exists',
      'FAIL',
      'Nenhum conteúdo PRO encontrado em public.study_content.'
    );
    return;
  else
    insert into academy_functional_results values (
      'precondition:pro_content_exists',
      'PASS',
      'Conteúdo PRO selecionado: ' || v_pro_content_id::text
    );
  end if;

  -- Simula contexto authenticated com auth.uid() = v_user_id
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  -- Força usuário sem plano PRO para validar bloqueio
  update public.users
  set is_pro = false
  where id = v_user_id;

  -- Limpa progresso dos conteúdos usados no teste (dentro da transação)
  delete from public.user_content_progress
  where user_id = v_user_id
    and content_id in (v_free_content_id, v_pro_content_id);

  -- 1) Primeira conclusão do conteúdo grátis
  select * into r_first
  from public.complete_academy_content(v_user_id, v_free_content_id);

  select u.xp into v_after_first_xp
  from public.users u
  where u.id = v_user_id;

  if coalesce(r_first.success, false) = true
     and coalesce(r_first.already_completed, false) = false
     and v_after_first_xp = v_before_xp + coalesce(r_first.xp_reward, 0) then
    insert into academy_functional_results values (
      'free_content_first_completion',
      'PASS',
      '1ª conclusão somou XP corretamente. XP antes=' || v_before_xp || ', depois=' || v_after_first_xp
    );
  else
    insert into academy_functional_results values (
      'free_content_first_completion',
      'FAIL',
      'Resultado inesperado na 1ª conclusão. success=' || coalesce(r_first.success::text, 'null') ||
      ', already_completed=' || coalesce(r_first.already_completed::text, 'null') ||
      ', xp_reward=' || coalesce(r_first.xp_reward::text, 'null') ||
      ', xp antes=' || v_before_xp || ', xp depois=' || coalesce(v_after_first_xp::text, 'null')
    );
  end if;

  -- 2) Segunda conclusão do mesmo conteúdo grátis (não pode somar XP)
  select * into r_second
  from public.complete_academy_content(v_user_id, v_free_content_id);

  select u.xp into v_after_second_xp
  from public.users u
  where u.id = v_user_id;

  if coalesce(r_second.already_completed, false) = true
     and v_after_second_xp = v_after_first_xp then
    insert into academy_functional_results values (
      'free_content_duplicate_completion',
      'PASS',
      '2ª conclusão não somou XP (anti-duplicação ok). XP manteve em ' || v_after_second_xp
    );
  else
    insert into academy_functional_results values (
      'free_content_duplicate_completion',
      'FAIL',
      'Anti-duplicação falhou. already_completed=' || coalesce(r_second.already_completed::text, 'null') ||
      ', xp após 1ª=' || coalesce(v_after_first_xp::text, 'null') ||
      ', xp após 2ª=' || coalesce(v_after_second_xp::text, 'null')
    );
  end if;

  -- 3) Conteúdo PRO com usuário não-PRO deve bloquear
  select * into r_pro
  from public.complete_academy_content(v_user_id, v_pro_content_id);

  select u.xp into v_after_pro_attempt_xp
  from public.users u
  where u.id = v_user_id;

  if coalesce(r_pro.success, false) = false
     and coalesce(r_pro.already_completed, false) = false
     and coalesce(v_after_pro_attempt_xp, -1) = coalesce(v_after_second_xp, -2) then
    insert into academy_functional_results values (
      'pro_content_block_for_non_pro_user',
      'PASS',
      'Conteúdo PRO bloqueado para usuário não-PRO e XP não alterado. Mensagem: ' || coalesce(r_pro.message, '(sem mensagem)')
    );
  else
    insert into academy_functional_results values (
      'pro_content_block_for_non_pro_user',
      'FAIL',
      'Bloqueio PRO inesperado. success=' || coalesce(r_pro.success::text, 'null') ||
      ', already_completed=' || coalesce(r_pro.already_completed::text, 'null') ||
      ', xp antes tentativa PRO=' || coalesce(v_after_second_xp::text, 'null') ||
      ', xp depois tentativa PRO=' || coalesce(v_after_pro_attempt_xp::text, 'null') ||
      ', mensagem=' || coalesce(r_pro.message, '(sem mensagem)')
    );
  end if;

  -- Apenas informativo; rollback reverte tudo no fim
  update public.users
  set is_pro = v_previous_is_pro
  where id = v_user_id;

exception
  when others then
    insert into academy_functional_results values (
      'runtime_error',
      'FAIL',
      'Erro durante verificação funcional: ' || sqlerrm
    );
end $$;

select *
from academy_functional_results
order by case when status = 'FAIL' then 0 else 1 end, test_name;

rollback;
