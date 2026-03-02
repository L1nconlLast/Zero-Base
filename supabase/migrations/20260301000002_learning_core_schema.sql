-- ============================================================
-- Migration: learning core schema (ENEM + Concursos)
-- Objetivo: completar núcleo relacional de disciplinas/tópicos/
-- questões e progresso, reutilizando public.study_content existente.
-- ============================================================

-- --------------------------------------------
-- Catálogo pedagógico
-- --------------------------------------------
create table if not exists public.modalidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  icone text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.disciplinas (
  id uuid primary key default gen_random_uuid(),
  modalidade_id uuid not null references public.modalidades(id) on delete cascade,
  nome text not null,
  icone text,
  cor_hex text,
  ordem integer,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(modalidade_id, nome)
);

create table if not exists public.topicos (
  id uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references public.disciplinas(id) on delete cascade,
  nome text not null,
  descricao text,
  ordem integer,
  nivel_dificuldade text not null default 'iniciante'
    check (nivel_dificuldade in ('iniciante', 'intermediario', 'avancado')),
  tempo_estimado_min integer check (tempo_estimado_min is null or tempo_estimado_min > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(disciplina_id, nome)
);

-- Reaproveita public.study_content e cria o vínculo por tópico
create table if not exists public.topico_study_content (
  id uuid primary key default gen_random_uuid(),
  topico_id uuid not null references public.topicos(id) on delete cascade,
  study_content_id uuid not null references public.study_content(id) on delete cascade,
  ordem integer,
  obrigatorio boolean not null default false,
  created_at timestamptz not null default now(),
  unique(topico_id, study_content_id)
);

-- --------------------------------------------
-- Banco de questões
-- --------------------------------------------
create table if not exists public.questoes (
  id uuid primary key default gen_random_uuid(),
  topico_id uuid not null references public.topicos(id) on delete cascade,
  enunciado text not null,
  nivel text not null default 'medio' check (nivel in ('facil', 'medio', 'dificil')),
  fonte text,
  ano integer,
  explicacao text,
  assunto text,
  resolucao_video_url text,
  vezes_aplicada integer not null default 0 check (vezes_aplicada >= 0),
  percentual_acerto numeric(5,2),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alternativas (
  id uuid primary key default gen_random_uuid(),
  questao_id uuid not null references public.questoes(id) on delete cascade,
  letra text not null check (letra in ('A', 'B', 'C', 'D', 'E')),
  texto text not null,
  correta boolean not null default false,
  created_at timestamptz not null default now(),
  unique(questao_id, letra)
);

-- --------------------------------------------
-- Interações do usuário
-- --------------------------------------------
create table if not exists public.respostas_usuarios (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  questao_id uuid not null references public.questoes(id) on delete cascade,
  alternativa_id uuid references public.alternativas(id) on delete set null,
  correta boolean,
  tempo_resposta_seg integer check (tempo_resposta_seg is null or tempo_resposta_seg > 0),
  data_resposta timestamptz not null default now(),
  modo_estudo text not null default 'treino' check (modo_estudo in ('treino', 'simulado', 'revisao'))
);

create table if not exists public.simulados (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  titulo text,
  data_inicio timestamptz not null default now(),
  data_fim timestamptz,
  pontuacao_total integer,
  status text not null default 'iniciado' check (status in ('iniciado', 'concluido', 'abandonado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.simulado_questoes (
  id uuid primary key default gen_random_uuid(),
  simulado_id uuid not null references public.simulados(id) on delete cascade,
  questao_id uuid not null references public.questoes(id) on delete cascade,
  ordem integer,
  resposta_usuario_id uuid references public.respostas_usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(simulado_id, questao_id)
);

create table if not exists public.anotacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  study_content_id uuid references public.study_content(id) on delete set null,
  questao_id uuid references public.questoes(id) on delete set null,
  titulo text,
  texto text not null,
  data_criacao timestamptz not null default now(),
  data_atualizacao timestamptz not null default now()
);

create table if not exists public.favoritos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('questao', 'conteudo')),
  item_id uuid not null,
  data_favorito timestamptz not null default now(),
  unique(usuario_id, tipo, item_id)
);

create table if not exists public.progresso_topicos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  topico_id uuid not null references public.topicos(id) on delete cascade,
  status text not null default 'nao_iniciado' check (status in ('nao_iniciado', 'em_andamento', 'concluido')),
  progresso_percent integer not null default 0 check (progresso_percent between 0 and 100),
  ultimo_acesso timestamptz,
  data_conclusao timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(usuario_id, topico_id)
);

-- --------------------------------------------
-- Índices de performance
-- --------------------------------------------
create index if not exists idx_disciplinas_modalidade on public.disciplinas(modalidade_id, ordem);
create index if not exists idx_topicos_disciplina on public.topicos(disciplina_id, ordem);
create index if not exists idx_topico_study_content_topico on public.topico_study_content(topico_id, ordem);
create index if not exists idx_questoes_topico on public.questoes(topico_id);
create index if not exists idx_questoes_nivel on public.questoes(nivel);
create index if not exists idx_alternativas_questao on public.alternativas(questao_id);
create index if not exists idx_respostas_usuario_data on public.respostas_usuarios(usuario_id, data_resposta desc);
create index if not exists idx_respostas_questao on public.respostas_usuarios(questao_id);
create index if not exists idx_simulados_usuario_status on public.simulados(usuario_id, status);
create index if not exists idx_simulado_questoes_simulado on public.simulado_questoes(simulado_id, ordem);
create index if not exists idx_anotacoes_usuario on public.anotacoes(usuario_id, data_atualizacao desc);
create index if not exists idx_favoritos_usuario_tipo on public.favoritos(usuario_id, tipo);
create index if not exists idx_progresso_topicos_usuario_status on public.progresso_topicos(usuario_id, status);

-- --------------------------------------------
-- Trigger de updated_at
-- --------------------------------------------
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_modalidades_touch_updated_at on public.modalidades;
create trigger trg_modalidades_touch_updated_at
before update on public.modalidades
for each row execute function public.touch_updated_at();

drop trigger if exists trg_disciplinas_touch_updated_at on public.disciplinas;
create trigger trg_disciplinas_touch_updated_at
before update on public.disciplinas
for each row execute function public.touch_updated_at();

drop trigger if exists trg_topicos_touch_updated_at on public.topicos;
create trigger trg_topicos_touch_updated_at
before update on public.topicos
for each row execute function public.touch_updated_at();

drop trigger if exists trg_questoes_touch_updated_at on public.questoes;
create trigger trg_questoes_touch_updated_at
before update on public.questoes
for each row execute function public.touch_updated_at();

drop trigger if exists trg_simulados_touch_updated_at on public.simulados;
create trigger trg_simulados_touch_updated_at
before update on public.simulados
for each row execute function public.touch_updated_at();

drop trigger if exists trg_anotacoes_touch_updated_at on public.anotacoes;
create trigger trg_anotacoes_touch_updated_at
before update on public.anotacoes
for each row execute function public.touch_updated_at();

drop trigger if exists trg_progresso_topicos_touch_updated_at on public.progresso_topicos;
create trigger trg_progresso_topicos_touch_updated_at
before update on public.progresso_topicos
for each row execute function public.touch_updated_at();

-- --------------------------------------------
-- Views estratégicas
-- --------------------------------------------
create or replace view public.vw_desempenho_usuario_topico as
select
  ru.usuario_id,
  coalesce(u.name, u.email, ru.usuario_id::text) as nome,
  t.id as topico_id,
  t.nome as topico,
  d.nome as disciplina,
  count(ru.id) as total_questoes_respondidas,
  sum(case when ru.correta is true then 1 else 0 end) as acertos,
  round((avg(case when ru.correta is true then 1 else 0 end)::numeric) * 100, 2) as percentual_acerto,
  round(avg(ru.tempo_resposta_seg)::numeric, 0) as tempo_medio_resposta
from public.topicos t
join public.disciplinas d on d.id = t.disciplina_id
join public.questoes q on q.topico_id = t.id
join public.respostas_usuarios ru on ru.questao_id = q.id
left join public.users u on u.id = ru.usuario_id
group by ru.usuario_id, u.name, u.email, t.id, t.nome, d.nome;

create or replace view public.vw_questoes_estatisticas as
select
  q.id,
  left(q.enunciado, 160) as enunciado,
  t.nome as topico,
  d.nome as disciplina,
  q.nivel,
  count(ru.id) as total_respostas,
  sum(case when ru.correta is true then 1 else 0 end) as total_acertos,
  round(
    (sum(case when ru.correta is true then 1 else 0 end)::numeric / nullif(count(ru.id), 0)) * 100,
    2
  ) as taxa_acerto
from public.questoes q
join public.topicos t on t.id = q.topico_id
join public.disciplinas d on d.id = t.disciplina_id
left join public.respostas_usuarios ru on ru.questao_id = q.id
group by q.id, t.nome, d.nome, q.nivel;

-- --------------------------------------------
-- Funções RPC (equivalentes às procedures)
-- --------------------------------------------
create or replace function public.sp_registrar_resposta(
  p_usuario_id uuid,
  p_questao_id uuid,
  p_alternativa_id uuid,
  p_tempo_resposta integer,
  p_modo_estudo text default 'treino'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correta boolean;
  v_resposta_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_usuario_id then
    raise exception 'Usuário sem permissão para registrar resposta';
  end if;

  if p_modo_estudo not in ('treino', 'simulado', 'revisao') then
    raise exception 'modo_estudo inválido';
  end if;

  select correta
    into v_correta
  from public.alternativas
  where id = p_alternativa_id
    and questao_id = p_questao_id;

  if v_correta is null then
    raise exception 'Alternativa não pertence à questão informada';
  end if;

  insert into public.respostas_usuarios (
    usuario_id,
    questao_id,
    alternativa_id,
    correta,
    tempo_resposta_seg,
    modo_estudo
  ) values (
    p_usuario_id,
    p_questao_id,
    p_alternativa_id,
    v_correta,
    p_tempo_resposta,
    p_modo_estudo
  )
  returning id into v_resposta_id;

  update public.questoes
  set
    vezes_aplicada = vezes_aplicada + 1,
    percentual_acerto = (
      select round((avg(case when correta then 1 else 0 end)::numeric) * 100, 2)
      from public.respostas_usuarios
      where questao_id = p_questao_id
    )
  where id = p_questao_id;

  return v_resposta_id;
end;
$$;

revoke all on function public.sp_registrar_resposta(uuid, uuid, uuid, integer, text) from public;
grant execute on function public.sp_registrar_resposta(uuid, uuid, uuid, integer, text) to authenticated;

create or replace function public.sp_gerar_simulado(
  p_usuario_id uuid,
  p_titulo text,
  p_qtd_questoes integer,
  p_disciplina_id uuid default null,
  p_topicos uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_simulado_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_usuario_id then
    raise exception 'Usuário sem permissão para gerar simulado';
  end if;

  if p_qtd_questoes is null or p_qtd_questoes <= 0 then
    raise exception 'Quantidade de questões deve ser maior que zero';
  end if;

  insert into public.simulados (usuario_id, titulo)
  values (p_usuario_id, p_titulo)
  returning id into v_simulado_id;

  insert into public.simulado_questoes (simulado_id, questao_id, ordem)
  select
    v_simulado_id,
    q.id,
    row_number() over (order by random())
  from public.questoes q
  join public.topicos t on t.id = q.topico_id
  where q.ativo is true
    and (p_disciplina_id is null or t.disciplina_id = p_disciplina_id)
    and (p_topicos is null or array_length(p_topicos, 1) is null or q.topico_id = any(p_topicos))
  order by random()
  limit p_qtd_questoes;

  return v_simulado_id;
end;
$$;

revoke all on function public.sp_gerar_simulado(uuid, text, integer, uuid, uuid[]) from public;
grant execute on function public.sp_gerar_simulado(uuid, text, integer, uuid, uuid[]) to authenticated;

-- --------------------------------------------
-- RLS
-- --------------------------------------------
alter table public.modalidades enable row level security;
alter table public.disciplinas enable row level security;
alter table public.topicos enable row level security;
alter table public.topico_study_content enable row level security;
alter table public.questoes enable row level security;
alter table public.alternativas enable row level security;
alter table public.respostas_usuarios enable row level security;
alter table public.simulados enable row level security;
alter table public.simulado_questoes enable row level security;
alter table public.anotacoes enable row level security;
alter table public.favoritos enable row level security;
alter table public.progresso_topicos enable row level security;

-- leitura do catálogo para usuários autenticados

drop policy if exists "modalidades_select_authenticated" on public.modalidades;
create policy "modalidades_select_authenticated"
  on public.modalidades for select
  to authenticated
  using (true);

drop policy if exists "disciplinas_select_authenticated" on public.disciplinas;
create policy "disciplinas_select_authenticated"
  on public.disciplinas for select
  to authenticated
  using (true);

drop policy if exists "topicos_select_authenticated" on public.topicos;
create policy "topicos_select_authenticated"
  on public.topicos for select
  to authenticated
  using (true);

drop policy if exists "topico_study_content_select_authenticated" on public.topico_study_content;
create policy "topico_study_content_select_authenticated"
  on public.topico_study_content for select
  to authenticated
  using (true);

drop policy if exists "questoes_select_authenticated" on public.questoes;
create policy "questoes_select_authenticated"
  on public.questoes for select
  to authenticated
  using (true);

drop policy if exists "alternativas_select_authenticated" on public.alternativas;
create policy "alternativas_select_authenticated"
  on public.alternativas for select
  to authenticated
  using (true);

-- respostas do próprio usuário

drop policy if exists "respostas_usuarios_select_own" on public.respostas_usuarios;
create policy "respostas_usuarios_select_own"
  on public.respostas_usuarios for select
  using (auth.uid() = usuario_id);

drop policy if exists "respostas_usuarios_insert_own" on public.respostas_usuarios;
create policy "respostas_usuarios_insert_own"
  on public.respostas_usuarios for insert
  with check (auth.uid() = usuario_id);

drop policy if exists "respostas_usuarios_update_own" on public.respostas_usuarios;
create policy "respostas_usuarios_update_own"
  on public.respostas_usuarios for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

drop policy if exists "respostas_usuarios_delete_own" on public.respostas_usuarios;
create policy "respostas_usuarios_delete_own"
  on public.respostas_usuarios for delete
  using (auth.uid() = usuario_id);

-- simulados do próprio usuário

drop policy if exists "simulados_select_own" on public.simulados;
create policy "simulados_select_own"
  on public.simulados for select
  using (auth.uid() = usuario_id);

drop policy if exists "simulados_insert_own" on public.simulados;
create policy "simulados_insert_own"
  on public.simulados for insert
  with check (auth.uid() = usuario_id);

drop policy if exists "simulados_update_own" on public.simulados;
create policy "simulados_update_own"
  on public.simulados for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

drop policy if exists "simulados_delete_own" on public.simulados;
create policy "simulados_delete_own"
  on public.simulados for delete
  using (auth.uid() = usuario_id);

-- itens de simulado (herdam dono via simulado)

drop policy if exists "simulado_questoes_select_own" on public.simulado_questoes;
create policy "simulado_questoes_select_own"
  on public.simulado_questoes for select
  using (
    exists (
      select 1
      from public.simulados s
      where s.id = simulado_id
        and s.usuario_id = auth.uid()
    )
  );

drop policy if exists "simulado_questoes_insert_own" on public.simulado_questoes;
create policy "simulado_questoes_insert_own"
  on public.simulado_questoes for insert
  with check (
    exists (
      select 1
      from public.simulados s
      where s.id = simulado_id
        and s.usuario_id = auth.uid()
    )
  );

drop policy if exists "simulado_questoes_update_own" on public.simulado_questoes;
create policy "simulado_questoes_update_own"
  on public.simulado_questoes for update
  using (
    exists (
      select 1
      from public.simulados s
      where s.id = simulado_id
        and s.usuario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.simulados s
      where s.id = simulado_id
        and s.usuario_id = auth.uid()
    )
  );

drop policy if exists "simulado_questoes_delete_own" on public.simulado_questoes;
create policy "simulado_questoes_delete_own"
  on public.simulado_questoes for delete
  using (
    exists (
      select 1
      from public.simulados s
      where s.id = simulado_id
        and s.usuario_id = auth.uid()
    )
  );

-- anotações do próprio usuário

drop policy if exists "anotacoes_select_own" on public.anotacoes;
create policy "anotacoes_select_own"
  on public.anotacoes for select
  using (auth.uid() = usuario_id);

drop policy if exists "anotacoes_insert_own" on public.anotacoes;
create policy "anotacoes_insert_own"
  on public.anotacoes for insert
  with check (auth.uid() = usuario_id);

drop policy if exists "anotacoes_update_own" on public.anotacoes;
create policy "anotacoes_update_own"
  on public.anotacoes for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

drop policy if exists "anotacoes_delete_own" on public.anotacoes;
create policy "anotacoes_delete_own"
  on public.anotacoes for delete
  using (auth.uid() = usuario_id);

-- favoritos do próprio usuário

drop policy if exists "favoritos_select_own" on public.favoritos;
create policy "favoritos_select_own"
  on public.favoritos for select
  using (auth.uid() = usuario_id);

drop policy if exists "favoritos_insert_own" on public.favoritos;
create policy "favoritos_insert_own"
  on public.favoritos for insert
  with check (auth.uid() = usuario_id);

drop policy if exists "favoritos_delete_own" on public.favoritos;
create policy "favoritos_delete_own"
  on public.favoritos for delete
  using (auth.uid() = usuario_id);

-- progresso por tópico do próprio usuário

drop policy if exists "progresso_topicos_select_own" on public.progresso_topicos;
create policy "progresso_topicos_select_own"
  on public.progresso_topicos for select
  using (auth.uid() = usuario_id);

drop policy if exists "progresso_topicos_insert_own" on public.progresso_topicos;
create policy "progresso_topicos_insert_own"
  on public.progresso_topicos for insert
  with check (auth.uid() = usuario_id);

drop policy if exists "progresso_topicos_update_own" on public.progresso_topicos;
create policy "progresso_topicos_update_own"
  on public.progresso_topicos for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

drop policy if exists "progresso_topicos_delete_own" on public.progresso_topicos;
create policy "progresso_topicos_delete_own"
  on public.progresso_topicos for delete
  using (auth.uid() = usuario_id);

-- --------------------------------------------
-- Seed inicial (idempotente)
-- --------------------------------------------
insert into public.modalidades (nome, descricao, icone)
values
  ('ENEM', 'Exame Nacional do Ensino Médio', '📘'),
  ('Concursos', 'Preparação para concursos públicos', '🏛️'),
  ('Vestibular', 'Preparação para vestibulares', '🎓')
on conflict (nome) do nothing;
