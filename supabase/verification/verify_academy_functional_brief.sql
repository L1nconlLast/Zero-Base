-- Verificação funcional curta da Academia (demo ao vivo)
-- Saída final: OVERALL_STATUS, PASS_COUNT, FAIL_COUNT
-- Não persiste alterações (BEGIN ... ROLLBACK)

begin;

create temp table if not exists academy_checks_brief (
  check_name text,
  passed boolean,
  details text
);

truncate table academy_checks_brief;

do $$
declare
  v_user_id uuid;
  v_free_content_id uuid;
  v_pro_content_id uuid;
  v_before_xp integer;
  v_after_first_xp integer;
  v_after_second_xp integer;
  v_after_pro_attempt_xp integer;
  r_first record;
  r_second record;
  r_pro record;
begin
  select u.id, u.xp
    into v_user_id, v_before_xp
  from public.users u
  order by u.created_at asc
  limit 1;

  insert into academy_checks_brief
  values (
    'precondition:user_exists',
    v_user_id is not null,
    coalesce(v_user_id::text, 'Nenhum usuário encontrado')
  );

  if v_user_id is null then
    return;
  end if;

  select sc.id into v_free_content_id
  from public.study_content sc
  where sc.is_premium = false
  order by sc.created_at asc
  limit 1;

  insert into academy_checks_brief
  values (
    'precondition:free_content_exists',
    v_free_content_id is not null,
    coalesce(v_free_content_id::text, 'Nenhum conteúdo grátis encontrado')
  );

  select sc.id into v_pro_content_id
  from public.study_content sc
  where sc.is_premium = true
  order by sc.created_at asc
  limit 1;

  insert into academy_checks_brief
  values (
    'precondition:pro_content_exists',
    v_pro_content_id is not null,
    coalesce(v_pro_content_id::text, 'Nenhum conteúdo PRO encontrado')
  );

  if v_free_content_id is null or v_pro_content_id is null then
    return;
  end if;

  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  update public.users set is_pro = false where id = v_user_id;

  delete from public.user_content_progress
  where user_id = v_user_id
    and content_id in (v_free_content_id, v_pro_content_id);

  -- 1) Primeira conclusão grátis
  select * into r_first
  from public.complete_academy_content(v_user_id, v_free_content_id);

  select xp into v_after_first_xp from public.users where id = v_user_id;

  insert into academy_checks_brief
  values (
    'functional:first_completion_adds_xp',
    coalesce(r_first.success, false) = true
    and coalesce(r_first.already_completed, false) = false
    and v_after_first_xp = v_before_xp + coalesce(r_first.xp_reward, 0),
    'xp_before=' || v_before_xp || ', xp_after=' || coalesce(v_after_first_xp::text, 'null')
  );

  -- 2) Segunda conclusão grátis
  select * into r_second
  from public.complete_academy_content(v_user_id, v_free_content_id);

  select xp into v_after_second_xp from public.users where id = v_user_id;

  insert into academy_checks_brief
  values (
    'functional:duplicate_does_not_add_xp',
    coalesce(r_second.already_completed, false) = true
    and v_after_second_xp = v_after_first_xp,
    'xp_after_first=' || coalesce(v_after_first_xp::text, 'null') || ', xp_after_second=' || coalesce(v_after_second_xp::text, 'null')
  );

  -- 3) PRO bloqueado para não-PRO
  select * into r_pro
  from public.complete_academy_content(v_user_id, v_pro_content_id);

  select xp into v_after_pro_attempt_xp from public.users where id = v_user_id;

  insert into academy_checks_brief
  values (
    'functional:pro_blocked_for_non_pro',
    coalesce(r_pro.success, false) = false
    and coalesce(r_pro.already_completed, false) = false
    and v_after_pro_attempt_xp = v_after_second_xp,
    coalesce(r_pro.message, '(sem mensagem)')
  );

exception
  when others then
    insert into academy_checks_brief
    values ('runtime_error', false, sqlerrm);
end $$;

select
  case when count(*) filter (where passed = false) = 0 then 'PASS' else 'FAIL' end as overall_status,
  count(*) filter (where passed = true) as pass_count,
  count(*) filter (where passed = false) as fail_count
from academy_checks_brief;

-- Opcional para debug em demo: descomente para ver cada check
-- select
--   case when passed then 'PASS' else 'FAIL' end as status,
--   check_name,
--   details
-- from academy_checks_brief
-- order by status, check_name;

rollback;
