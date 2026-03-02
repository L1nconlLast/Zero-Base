-- =========================================================
-- Teste funcional de RLS: mentor_messages
-- Execute no Supabase SQL Editor APÓS rodar a migration
-- 20260226_000006_mentor_messages.sql
--
-- Simula dois usuários (owner vs intruso) e valida que
-- as policies impedem acesso cruzado.
-- =========================================================

-- 1) Preparação: cria dois usuários de teste temporários
--    (em ambientes de dev eles já existem na auth.users)
do $$
declare
  v_owner_id  uuid := '11111111-1111-1111-1111-111111111111';
  v_other_id  uuid := '22222222-2222-2222-2222-222222222222';
  v_msg_id    uuid;
  v_count     int;
begin
  -- Garante que os usuários existem na tabela users (necessário pela FK)
  insert into public.users (id) values (v_owner_id)
    on conflict (id) do nothing;
  insert into public.users (id) values (v_other_id)
    on conflict (id) do nothing;

  -- ─── Owner insere mensagem ─────────────────────────────────
  -- Simula auth.uid() = owner
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_id)::text, true);
  perform set_config('role', 'authenticated', true);

  insert into public.mentor_messages (user_id, role, content)
  values (v_owner_id, 'user', 'RLS test: owner message')
  returning id into v_msg_id;

  raise notice '[PASS] Owner inseriu mensagem %', v_msg_id;

  -- ─── Owner lê sua própria mensagem ─────────────────────────
  select count(*) into v_count
  from public.mentor_messages
  where id = v_msg_id and user_id = v_owner_id;

  if v_count = 1 then
    raise notice '[PASS] Owner consegue ler a própria mensagem.';
  else
    raise warning '[FAIL] Owner NÃO conseguiu ler a própria mensagem.';
  end if;

  -- ─── Intruso tenta ler a mensagem do owner ────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', v_other_id)::text, true);

  select count(*) into v_count
  from public.mentor_messages
  where id = v_msg_id;

  if v_count = 0 then
    raise notice '[PASS] Intruso NÃO vê a mensagem do owner (RLS bloqueou).';
  else
    raise warning '[FAIL] Intruso CONSEGUIU ver a mensagem do owner! RLS falhou.';
  end if;

  -- ─── Intruso tenta inserir mensagem se passando pelo owner ─
  begin
    insert into public.mentor_messages (user_id, role, content)
    values (v_owner_id, 'user', 'RLS test: intruso forçando user_id alheio');

    raise warning '[FAIL] Intruso inseriu mensagem com user_id do owner! RLS falhou.';
  exception when others then
    raise notice '[PASS] Intruso bloqueado ao inserir com user_id do owner: %', sqlerrm;
  end;

  -- ─── Intruso tenta deletar mensagem do owner ────────────────
  delete from public.mentor_messages where id = v_msg_id;
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise notice '[PASS] Intruso NÃO conseguiu deletar mensagem do owner.';
  else
    raise warning '[FAIL] Intruso DELETOU mensagem do owner! RLS falhou.';
  end if;

  -- ─── Intruso tenta atualizar mensagem do owner ──────────────
  update public.mentor_messages
  set content = 'hackeado'
  where id = v_msg_id;
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise notice '[PASS] Intruso NÃO conseguiu atualizar mensagem do owner.';
  else
    raise warning '[FAIL] Intruso ATUALIZOU mensagem do owner! RLS falhou.';
  end if;

  -- ─── Limpeza ───────────────────────────────────────────────
  -- Volta ao owner para deletar a mensagem de teste
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_id)::text, true);

  delete from public.mentor_messages where id = v_msg_id;
  get diagnostics v_count = row_count;

  if v_count = 1 then
    raise notice '[PASS] Owner deletou sua própria mensagem (limpeza).';
  else
    raise warning '[FAIL] Owner NÃO conseguiu deletar a própria mensagem.';
  end if;

  -- Restaura role
  perform set_config('role', '', true);

  raise notice '──────────────────────────────────────────────';
  raise notice 'Teste funcional de RLS para mentor_messages concluído.';
  raise notice '──────────────────────────────────────────────';
end $$;
