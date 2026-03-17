-- ============================================================
-- Migration: knowledge graph scale catalog (ENEM + CONCURSOS)
-- Objetivo: preparar estrutura para 5000+ topicos com
-- hierarquia, dependencias, relacoes e metadados para IA.
-- ============================================================

alter table public.topicos
  add column if not exists area text,
  add column if not exists subarea text,
  add column if not exists tipo_no text not null default 'topic';

alter table public.topicos
  drop constraint if exists topicos_tipo_no_check;

alter table public.topicos
  add constraint topicos_tipo_no_check
  check (tipo_no in ('topic', 'subtopic'));

update public.topicos
set area = coalesce(nullif(trim(area), ''), 'Geral')
where area is null or trim(area) = '';

create table if not exists public.topico_relacoes (
  source_topico_id uuid not null references public.topicos(id) on delete cascade,
  target_topico_id uuid not null references public.topicos(id) on delete cascade,
  tipo_relacao text not null check (tipo_relacao in ('hierarchy', 'prerequisite', 'related')),
  peso numeric(6,3) not null default 1,
  created_at timestamptz not null default now(),
  primary key (source_topico_id, target_topico_id, tipo_relacao),
  check (source_topico_id <> target_topico_id)
);

create index if not exists idx_topicos_disciplina_area_ordem on public.topicos(disciplina_id, area, ordem);
create index if not exists idx_topicos_tipo_no on public.topicos(tipo_no);
create index if not exists idx_topico_relacoes_tipo on public.topico_relacoes(tipo_relacao);
create index if not exists idx_topico_relacoes_source on public.topico_relacoes(source_topico_id);
create index if not exists idx_topico_relacoes_target on public.topico_relacoes(target_topico_id);

insert into public.topico_relacoes (source_topico_id, target_topico_id, tipo_relacao, peso)
select tp.prerequisito_id, tp.topico_id, 'prerequisite', greatest(0.1, least(1, tp.mastery_required / 100.0))
from public.topico_prerequisitos tp
on conflict (source_topico_id, target_topico_id, tipo_relacao) do nothing;

insert into public.modalidades (nome, descricao, icone)
values
  ('CONCURSOS', 'Trilha para concursos publicos', '🏛️')
on conflict (nome) do update
set descricao = excluded.descricao,
    icone = excluded.icone,
    ativo = true;

insert into public.modalidades (nome, descricao, icone)
values
  ('ENEM', 'Exame Nacional do Ensino Medio', '📘')
on conflict (nome) do update
set descricao = excluded.descricao,
    icone = excluded.icone,
    ativo = true;

with modalidade_map as (
  select id, nome
  from public.modalidades
  where nome in ('ENEM', 'CONCURSOS')
), disciplina_seed as (
  select *
  from (
    values
      ('ENEM', 'Portugues', '📖', '#3B82F6', 1),
      ('ENEM', 'Matematica', '🔢', '#EF4444', 2),
      ('ENEM', 'Fisica', '⚛️', '#F59E0B', 3),
      ('ENEM', 'Quimica', '🧪', '#10B981', 4),
      ('ENEM', 'Biologia', '🧬', '#22C55E', 5),
      ('ENEM', 'Historia', '📜', '#A855F7', 6),
      ('ENEM', 'Geografia', '🌎', '#0EA5E9', 7),
      ('ENEM', 'Filosofia', '🧠', '#6366F1', 8),
      ('ENEM', 'Sociologia', '👥', '#8B5CF6', 9),
      ('ENEM', 'Redacao', '✍️', '#EC4899', 10),
      ('ENEM', 'Ingles', '🇬🇧', '#06B6D4', 11),
      ('ENEM', 'Atualidades', '📰', '#F97316', 12),
      ('CONCURSOS', 'Direito Constitucional', '⚖️', '#2563EB', 20),
      ('CONCURSOS', 'Direito Administrativo', '🏛️', '#1D4ED8', 21),
      ('CONCURSOS', 'Direito Penal', '🔒', '#0F766E', 22),
      ('CONCURSOS', 'Direito Civil', '📚', '#0E7490', 23),
      ('CONCURSOS', 'Direito Previdenciario', '🧾', '#0369A1', 24),
      ('CONCURSOS', 'Informatica', '💻', '#4F46E5', 25),
      ('CONCURSOS', 'Administracao', '📊', '#7C3AED', 26),
      ('CONCURSOS', 'Raciocinio Logico', '🧩', '#9333EA', 27)
  ) as v(modalidade_nome, disciplina_nome, icone, cor_hex, ordem)
)
insert into public.disciplinas (modalidade_id, nome, icone, cor_hex, ordem)
select m.id, d.disciplina_nome, d.icone, d.cor_hex, d.ordem
from disciplina_seed d
join modalidade_map m on m.nome = d.modalidade_nome
on conflict (modalidade_id, nome) do update
set icone = excluded.icone,
    cor_hex = excluded.cor_hex,
    ordem = excluded.ordem,
    ativo = true;

with seed_config as (
  select *
  from (
    values
      ('ENEM', 'Portugues', 300, array['Interpretacao', 'Gramatica', 'Redacao', 'Literatura']::text[], 3, 90, 80),
      ('ENEM', 'Matematica', 400, array['Aritmetica', 'Algebra', 'Funcoes', 'Geometria Plana', 'Geometria Espacial', 'Trigonometria', 'Estatistica', 'Probabilidade', 'Matematica Financeira']::text[], 3, 95, 70),
      ('ENEM', 'Fisica', 200, array['Cinematica', 'Dinamica', 'Trabalho e Energia', 'Termologia', 'Ondulatoria', 'Optica', 'Eletromagnetismo', 'Fisica Moderna']::text[], 4, 85, 60),
      ('ENEM', 'Quimica', 250, array['Estrutura Atomica', 'Tabela Periodica', 'Ligacoes Quimicas', 'Funcoes Inorganicas', 'Reacoes Quimicas', 'Estequiometria', 'Termoquimica', 'Equilibrio Quimico', 'Eletroquimica', 'Quimica Organica']::text[], 4, 85, 65),
      ('ENEM', 'Biologia', 250, array['Citologia', 'Histologia', 'Genetica', 'Evolucao', 'Ecologia', 'Botanica', 'Zoologia', 'Fisiologia Humana']::text[], 4, 80, 60),
      ('ENEM', 'Historia', 200, array['Historia Antiga', 'Historia Medieval', 'Historia Moderna', 'Historia Contemporanea', 'Historia do Brasil']::text[], 3, 80, 70),
      ('ENEM', 'Geografia', 150, array['Cartografia', 'Geografia Fisica', 'Climatologia', 'Geopolitica', 'Globalizacao', 'Economia Mundial', 'Geografia do Brasil']::text[], 3, 75, 70),
      ('ENEM', 'Filosofia', 100, array['Filosofia Antiga', 'Filosofia Moderna', 'Etica', 'Politica', 'Epistemologia']::text[], 2, 60, 55),
      ('ENEM', 'Sociologia', 100, array['Sociedade', 'Cultura', 'Politica', 'Trabalho', 'Movimentos Sociais']::text[], 2, 60, 55),
      ('ENEM', 'Ingles', 100, array['Reading', 'Grammar', 'Vocabulary', 'Interpretation']::text[], 2, 65, 45),
      ('ENEM', 'Redacao', 100, array['Competencia 1', 'Competencia 2', 'Competencia 3', 'Competencia 4', 'Competencia 5']::text[], 3, 92, 40),
      ('ENEM', 'Atualidades', 100, array['Politica', 'Economia', 'Meio Ambiente', 'Tecnologia', 'Sociedade']::text[], 2, 55, 55),
      ('CONCURSOS', 'Direito Constitucional', 300, array['Constituicao', 'Principios Fundamentais', 'Direitos Fundamentais', 'Organizacao do Estado', 'Poder Legislativo', 'Poder Executivo', 'Poder Judiciario', 'Controle de Constitucionalidade']::text[], 4, 40, 95),
      ('CONCURSOS', 'Direito Administrativo', 260, array['Atos Administrativos', 'Poderes Administrativos', 'Licitacoes', 'Contratos', 'Responsabilidade Civil do Estado', 'Improbidade']::text[], 4, 35, 95),
      ('CONCURSOS', 'Direito Penal', 240, array['Parte Geral', 'Crimes em Especie', 'Aplicacao da Pena', 'Extincao da Punibilidade']::text[], 4, 30, 90),
      ('CONCURSOS', 'Direito Civil', 220, array['Parte Geral', 'Obrigacoes', 'Contratos', 'Responsabilidade Civil', 'Direitos Reais', 'Familia', 'Sucessoes']::text[], 4, 30, 90),
      ('CONCURSOS', 'Direito Previdenciario', 180, array['Seguridade Social', 'RGPS', 'Beneficios', 'Custeio', 'Reforma Previdenciaria']::text[], 4, 20, 92),
      ('CONCURSOS', 'Informatica', 240, array['Sistemas Operacionais', 'Redes', 'Seguranca', 'Pacote Office', 'Internet', 'Banco de Dados', 'Programacao']::text[], 3, 35, 88),
      ('CONCURSOS', 'Administracao', 220, array['Teorias da Administracao', 'Planejamento', 'Organizacao', 'Direcao', 'Controle', 'Gestao de Pessoas', 'Gestao de Processos']::text[], 3, 30, 85),
      ('CONCURSOS', 'Raciocinio Logico', 340, array['Proposicoes', 'Conectivos', 'Tabelas Verdade', 'Equivalencias', 'Diagramas Logicos', 'Analise Combinatoria', 'Probabilidade']::text[], 3, 45, 95)
  ) as v(modalidade_nome, disciplina_nome, total_topicos, areas, base_dificuldade, freq_enem, freq_concurso)
), discipline_map as (
  select d.id as disciplina_id, d.nome as disciplina_nome, m.nome as modalidade_nome
  from public.disciplinas d
  join public.modalidades m on m.id = d.modalidade_id
), expanded as (
  select
    dm.disciplina_id,
    sc.modalidade_nome,
    sc.disciplina_nome,
    sc.total_topicos,
    sc.areas,
    sc.base_dificuldade,
    sc.freq_enem,
    sc.freq_concurso,
    g.n,
    sc.areas[1 + ((g.n - 1) % array_length(sc.areas, 1))] as area_nome
  from seed_config sc
  join discipline_map dm
    on dm.modalidade_nome = sc.modalidade_nome
   and dm.disciplina_nome = sc.disciplina_nome
  cross join lateral generate_series(1, sc.total_topicos) as g(n)
)
insert into public.topicos (
  disciplina_id,
  nome,
  descricao,
  ordem,
  area,
  subarea,
  tipo_no,
  nivel_dificuldade,
  tempo_estimado_min,
  ativo
)
select
  e.disciplina_id,
  format('%s - %s - Topico %s', e.disciplina_nome, e.area_nome, lpad(e.n::text, 4, '0')),
  format('Topico gerado automaticamente para %s (%s).', e.disciplina_nome, e.modalidade_nome),
  e.n,
  e.area_nome,
  format('Modulo %s', 1 + ((e.n - 1) / 25)),
  case when e.n % 7 = 0 then 'subtopic' else 'topic' end,
  case when e.n % 9 = 0 then 'avancado' when e.n % 3 = 0 then 'intermediario' else 'iniciante' end,
  20 + ((e.n % 5) * 10),
  true
from expanded e
on conflict (disciplina_id, nome) do update
set
  descricao = excluded.descricao,
  ordem = excluded.ordem,
  area = excluded.area,
  subarea = excluded.subarea,
  tipo_no = excluded.tipo_no,
  nivel_dificuldade = excluded.nivel_dificuldade,
  tempo_estimado_min = excluded.tempo_estimado_min,
  ativo = true;

insert into public.topico_dna (
  topico_id,
  codigo,
  dificuldade,
  frequencia_enem,
  frequencia_concursos,
  tempo_medio_aprendizado_min,
  relevancia_global
)
select
  t.id,
  lower(regexp_replace(concat_ws('_', d.nome, coalesce(t.area, 'geral'), t.nome), '[^a-zA-Z0-9]+', '_', 'g')),
  case
    when t.nivel_dificuldade = 'avancado' then 5
    when t.nivel_dificuldade = 'intermediario' then 3
    else 2
  end,
  case
    when m.nome = 'ENEM' then 60 + (coalesce(t.ordem, 0) % 40)
    else 15 + (coalesce(t.ordem, 0) % 30)
  end,
  case
    when m.nome = 'CONCURSOS' then 65 + (coalesce(t.ordem, 0) % 35)
    else 20 + (coalesce(t.ordem, 0) % 35)
  end,
  coalesce(t.tempo_estimado_min, 40),
  case
    when m.nome = 'CONCURSOS' then 75
    else 70
  end
from public.topicos t
join public.disciplinas d on d.id = t.disciplina_id
join public.modalidades m on m.id = d.modalidade_id
left join public.topico_dna td on td.topico_id = t.id
where td.topico_id is null;

with ordered as (
  select
    t.id,
    t.disciplina_id,
    row_number() over (partition by t.disciplina_id order by coalesce(t.ordem, 999999), t.nome) as rn
  from public.topicos t
  where t.ativo = true
), chain as (
  select
    curr.id as topico_id,
    prev.id as prerequisito_id,
    70 as mastery_required
  from ordered curr
  join ordered prev
    on prev.disciplina_id = curr.disciplina_id
   and prev.rn = curr.rn - 1
), jumps as (
  select
    curr.id as topico_id,
    prev.id as prerequisito_id,
    80 as mastery_required
  from ordered curr
  join ordered prev
    on prev.disciplina_id = curr.disciplina_id
   and prev.rn = curr.rn - 5
  where curr.rn > 5
)
insert into public.topico_prerequisitos (topico_id, prerequisito_id, mastery_required)
select topico_id, prerequisito_id, mastery_required from chain
union all
select topico_id, prerequisito_id, mastery_required from jumps
on conflict (topico_id, prerequisito_id) do update
set mastery_required = excluded.mastery_required;

insert into public.topico_relacoes (source_topico_id, target_topico_id, tipo_relacao, peso)
select tp.prerequisito_id, tp.topico_id, 'prerequisite', greatest(0.1, least(1, tp.mastery_required / 100.0))
from public.topico_prerequisitos tp
on conflict (source_topico_id, target_topico_id, tipo_relacao) do update
set peso = excluded.peso;

with area_ordered as (
  select
    t.id,
    t.disciplina_id,
    coalesce(t.area, 'Geral') as area,
    row_number() over (partition by t.disciplina_id, coalesce(t.area, 'Geral') order by coalesce(t.ordem, 999999), t.nome) as rn
  from public.topicos t
  where t.ativo = true
)
insert into public.topico_relacoes (source_topico_id, target_topico_id, tipo_relacao, peso)
select
  a.id,
  b.id,
  'related',
  0.6
from area_ordered a
join area_ordered b
  on b.disciplina_id = a.disciplina_id
 and b.area = a.area
 and b.rn = a.rn + 1
on conflict (source_topico_id, target_topico_id, tipo_relacao) do update
set peso = excluded.peso;

alter table public.topico_relacoes enable row level security;

drop policy if exists "topico_relacoes_select_authenticated" on public.topico_relacoes;
create policy "topico_relacoes_select_authenticated"
  on public.topico_relacoes for select
  to authenticated
  using (true);
