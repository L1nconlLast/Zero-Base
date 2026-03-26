-- ============================================================
-- Migration: question catalog foundation
-- Objetivo: expandir o banco de questoes para escala, ingestao
-- e taxonomia operacional de ENEM + concursos sem quebrar o
-- schema existente usado pelo app.
-- ============================================================

create table if not exists public.question_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  type text not null default 'internal'
    check (type in ('official', 'internal', 'curated', 'public_dataset')),
  license_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_boards (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  identity_key text not null unique,
  organization text,
  board_id uuid references public.exam_boards(id) on delete set null,
  year integer check (year is null or year between 1900 and 2100),
  exam_type text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exams_board_year on public.exams(board_id, year desc);
create index if not exists idx_exams_slug on public.exams(slug);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  name text not null,
  slug text not null,
  education_level text,
  career_area text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exam_id, slug)
);

create index if not exists idx_jobs_exam on public.jobs(exam_id);

create table if not exists public.official_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.question_sources(id) on delete set null,
  exam_id uuid references public.exams(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  document_type text not null
    check (document_type in ('edital', 'prova', 'gabarito', 'matriz', 'cartilha', 'outro')),
  title text not null,
  slug text not null,
  identity_key text not null unique,
  organization text,
  year integer check (year is null or year between 1900 and 2100),
  url text,
  reference_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_official_documents_exam on public.official_documents(exam_id, document_type);
create index if not exists idx_official_documents_job on public.official_documents(job_id, document_type);

create table if not exists public.exam_subjects (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  subject_id uuid not null references public.disciplinas(id) on delete cascade,
  weight numeric(6,2),
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  unique(exam_id, job_id, subject_id),
  check (weight is null or weight >= 0)
);

create index if not exists idx_exam_subjects_exam on public.exam_subjects(exam_id, job_id);
create index if not exists idx_exam_subjects_subject on public.exam_subjects(subject_id);

alter table public.questoes
  add column if not exists source_id uuid references public.question_sources(id) on delete set null,
  add column if not exists modalidade_id uuid references public.modalidades(id) on delete set null,
  add column if not exists disciplina_id uuid references public.disciplinas(id) on delete set null,
  add column if not exists banca_id uuid references public.exam_boards(id) on delete set null,
  add column if not exists concurso_id uuid references public.exams(id) on delete set null,
  add column if not exists cargo_id uuid references public.jobs(id) on delete set null,
  add column if not exists documento_oficial_id uuid references public.official_documents(id) on delete set null,
  add column if not exists area text,
  add column if not exists subarea text,
  add column if not exists question_type text not null default 'multiple_choice'
    check (question_type in ('multiple_choice', 'true_false', 'discursive')),
  add column if not exists objetivo text not null default 'both'
    check (objetivo in ('enem', 'concurso', 'both')),
  add column if not exists status_catalogo text not null default 'published'
    check (status_catalogo in ('draft', 'reviewed', 'published', 'archived')),
  add column if not exists is_official boolean not null default false,
  add column if not exists is_original_commentary boolean not null default false,
  add column if not exists can_be_used_in_leveling boolean not null default false,
  add column if not exists can_be_used_in_mock_exam boolean not null default true,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists hash_enunciado text,
  add column if not exists hash_alternativas text,
  add column if not exists hash_questao text;

create table if not exists public.question_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.question_tag_links (
  question_id uuid not null references public.questoes(id) on delete cascade,
  tag_id uuid not null references public.question_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_id, tag_id)
);

create table if not exists public.question_explanations (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questoes(id) on delete cascade,
  explanation_type text not null
    check (explanation_type in ('short', 'full', 'strategy', 'theory')),
  content text not null,
  author_type text not null
    check (author_type in ('internal', 'ai_draft', 'teacher_reviewed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_question_explanations_question on public.question_explanations(question_id, explanation_type);

create table if not exists public.question_assets (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questoes(id) on delete cascade,
  asset_type text not null
    check (asset_type in ('image', 'table', 'attachment', 'pdf', 'video')),
  file_url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_question_assets_question on public.question_assets(question_id, position);

create table if not exists public.question_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.question_sources(id) on delete set null,
  batch_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'completed_with_errors', 'failed')),
  total_rows integer not null default 0 check (total_rows >= 0),
  processed_rows integer not null default 0 check (processed_rows >= 0),
  success_rows integer not null default 0 check (success_rows >= 0),
  duplicate_rows integer not null default 0 check (duplicate_rows >= 0),
  error_rows integer not null default 0 check (error_rows >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_question_import_batches_status on public.question_import_batches(status, created_at desc);

create table if not exists public.question_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.question_import_batches(id) on delete cascade,
  row_number integer not null,
  raw_payload jsonb not null,
  normalized_payload jsonb not null default '{}'::jsonb,
  normalized_status text not null default 'pending'
    check (normalized_status in ('pending', 'normalized', 'imported', 'duplicate', 'error', 'skipped')),
  error_message text,
  question_id uuid references public.questoes(id) on delete set null,
  statement_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(batch_id, row_number)
);

create index if not exists idx_question_import_rows_batch_status on public.question_import_rows(batch_id, normalized_status);
create index if not exists idx_question_import_rows_question on public.question_import_rows(question_id);

create index if not exists idx_questoes_catalogo_disciplina on public.questoes(modalidade_id, disciplina_id, topico_id);
create index if not exists idx_questoes_catalogo_banca on public.questoes(banca_id, ano desc);
create index if not exists idx_questoes_catalogo_concurso on public.questoes(concurso_id, cargo_id, ano desc);
create index if not exists idx_questoes_catalogo_objetivo on public.questoes(objetivo, question_type, nivel);
create index if not exists idx_questoes_catalogo_source on public.questoes(source_id);
create index if not exists idx_questoes_catalogo_area on public.questoes(area, subarea);
create index if not exists idx_questoes_catalogo_hash on public.questoes(hash_questao);
create index if not exists idx_questoes_catalogo_metadata on public.questoes using gin(metadata);
create index if not exists idx_questoes_catalogo_search on public.questoes using gin (to_tsvector('simple', coalesce(enunciado, '')));

create or replace function public.normalize_catalog_text(p_value text)
returns text
language sql
immutable
as $$
  select nullif(trim(regexp_replace(lower(coalesce(p_value, '')), '\s+', ' ', 'g')), '');
$$;

create or replace function public.refresh_questao_hashes(p_questao_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_enunciado text;
  v_alternativas text;
begin
  select q.enunciado
    into v_enunciado
  from public.questoes q
  where q.id = p_questao_id;

  if not found then
    return;
  end if;

  select coalesce(
    string_agg(
      format(
        '%s:%s:%s',
        a.letra,
        case when a.correta then '1' else '0' end,
        coalesce(public.normalize_catalog_text(a.texto), '')
      ),
      '|' order by a.letra
    ),
    ''
  )
    into v_alternativas
  from public.alternativas a
  where a.questao_id = p_questao_id;

  update public.questoes
  set
    hash_enunciado = md5(coalesce(public.normalize_catalog_text(v_enunciado), '')),
    hash_alternativas = md5(v_alternativas),
    hash_questao = md5(coalesce(public.normalize_catalog_text(v_enunciado), '') || '|' || v_alternativas)
  where id = p_questao_id;
end;
$$;

create or replace function public.sync_questao_catalogo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  select
    t.disciplina_id,
    d.modalidade_id,
    coalesce(t.area, new.area, 'Geral'),
    coalesce(t.subarea, new.subarea)
  into
    new.disciplina_id,
    new.modalidade_id,
    new.area,
    new.subarea
  from public.topicos t
  join public.disciplinas d on d.id = t.disciplina_id
  where t.id = new.topico_id;

  new.hash_enunciado = md5(coalesce(public.normalize_catalog_text(new.enunciado), ''));
  if new.hash_alternativas is not null then
    new.hash_questao = md5(coalesce(public.normalize_catalog_text(new.enunciado), '') || '|' || new.hash_alternativas);
  end if;

  if new.objetivo is null then
    new.objetivo = 'both';
  end if;

  if new.question_type is null then
    new.question_type = 'multiple_choice';
  end if;

  if new.status_catalogo is null then
    new.status_catalogo = 'published';
  end if;

  return new;
end;
$$;

create or replace function public.refresh_questao_hashes_from_alternativa()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.refresh_questao_hashes(coalesce(new.questao_id, old.questao_id));
  return null;
end;
$$;

drop trigger if exists trg_questoes_sync_catalogo on public.questoes;
create trigger trg_questoes_sync_catalogo
before insert or update of topico_id, enunciado, hash_alternativas
on public.questoes
for each row execute function public.sync_questao_catalogo();

drop trigger if exists trg_alternativas_refresh_questao_hashes on public.alternativas;
create trigger trg_alternativas_refresh_questao_hashes
after insert or update or delete on public.alternativas
for each row execute function public.refresh_questao_hashes_from_alternativa();

drop trigger if exists trg_question_sources_touch_updated_at on public.question_sources;
create trigger trg_question_sources_touch_updated_at
before update on public.question_sources
for each row execute function public.touch_updated_at();

drop trigger if exists trg_exam_boards_touch_updated_at on public.exam_boards;
create trigger trg_exam_boards_touch_updated_at
before update on public.exam_boards
for each row execute function public.touch_updated_at();

drop trigger if exists trg_exams_touch_updated_at on public.exams;
create trigger trg_exams_touch_updated_at
before update on public.exams
for each row execute function public.touch_updated_at();

drop trigger if exists trg_jobs_touch_updated_at on public.jobs;
create trigger trg_jobs_touch_updated_at
before update on public.jobs
for each row execute function public.touch_updated_at();

drop trigger if exists trg_official_documents_touch_updated_at on public.official_documents;
create trigger trg_official_documents_touch_updated_at
before update on public.official_documents
for each row execute function public.touch_updated_at();

drop trigger if exists trg_question_import_batches_touch_updated_at on public.question_import_batches;
create trigger trg_question_import_batches_touch_updated_at
before update on public.question_import_batches
for each row execute function public.touch_updated_at();

drop trigger if exists trg_question_import_rows_touch_updated_at on public.question_import_rows;
create trigger trg_question_import_rows_touch_updated_at
before update on public.question_import_rows
for each row execute function public.touch_updated_at();

update public.questoes q
set
  disciplina_id = t.disciplina_id,
  modalidade_id = d.modalidade_id,
  area = coalesce(q.area, t.area, 'Geral'),
  subarea = coalesce(q.subarea, t.subarea)
from public.topicos t
join public.disciplinas d on d.id = t.disciplina_id
where q.topico_id = t.id
  and (
    q.disciplina_id is distinct from t.disciplina_id
    or q.modalidade_id is distinct from d.modalidade_id
    or q.area is null
    or q.subarea is null
  );

update public.questoes q
set objetivo = case
  when m.nome ilike 'enem%' then 'enem'
  when m.nome ilike 'concurs%' then 'concurso'
  else 'both'
end
from public.modalidades m
where q.modalidade_id = m.id
  and q.objetivo = 'both';

update public.questoes
set hash_enunciado = md5(coalesce(public.normalize_catalog_text(enunciado), ''))
where hash_enunciado is null;

select public.refresh_questao_hashes(id)
from public.questoes;

create or replace view public.vw_questoes_catalogo as
select
  q.id,
  q.enunciado,
  q.nivel,
  q.question_type,
  q.objetivo,
  q.status_catalogo,
  q.ano,
  q.area,
  q.subarea,
  q.topico_id,
  q.disciplina_id,
  q.modalidade_id,
  q.banca_id,
  q.concurso_id,
  q.cargo_id,
  q.source_id,
  q.documento_oficial_id,
  q.is_official,
  q.is_original_commentary,
  q.can_be_used_in_leveling,
  q.can_be_used_in_mock_exam,
  q.metadata,
  t.nome as topico_nome,
  d.nome as disciplina_nome,
  m.nome as modalidade_nome,
  b.name as banca_nome,
  e.name as concurso_nome,
  e.organization as concurso_orgao,
  j.name as cargo_nome,
  s.name as source_name
from public.questoes q
left join public.topicos t on t.id = q.topico_id
left join public.disciplinas d on d.id = q.disciplina_id
left join public.modalidades m on m.id = q.modalidade_id
left join public.exam_boards b on b.id = q.banca_id
left join public.exams e on e.id = q.concurso_id
left join public.jobs j on j.id = q.cargo_id
left join public.question_sources s on s.id = q.source_id;

alter table public.question_sources enable row level security;
alter table public.exam_boards enable row level security;
alter table public.exams enable row level security;
alter table public.jobs enable row level security;
alter table public.official_documents enable row level security;
alter table public.exam_subjects enable row level security;
alter table public.question_tags enable row level security;
alter table public.question_tag_links enable row level security;
alter table public.question_explanations enable row level security;
alter table public.question_assets enable row level security;
alter table public.question_import_batches enable row level security;
alter table public.question_import_rows enable row level security;

drop policy if exists "question_sources_select_authenticated" on public.question_sources;
create policy "question_sources_select_authenticated"
  on public.question_sources for select
  to authenticated
  using (true);

drop policy if exists "exam_boards_select_authenticated" on public.exam_boards;
create policy "exam_boards_select_authenticated"
  on public.exam_boards for select
  to authenticated
  using (true);

drop policy if exists "exams_select_authenticated" on public.exams;
create policy "exams_select_authenticated"
  on public.exams for select
  to authenticated
  using (true);

drop policy if exists "jobs_select_authenticated" on public.jobs;
create policy "jobs_select_authenticated"
  on public.jobs for select
  to authenticated
  using (true);

drop policy if exists "official_documents_select_authenticated" on public.official_documents;
create policy "official_documents_select_authenticated"
  on public.official_documents for select
  to authenticated
  using (true);

drop policy if exists "exam_subjects_select_authenticated" on public.exam_subjects;
create policy "exam_subjects_select_authenticated"
  on public.exam_subjects for select
  to authenticated
  using (true);

drop policy if exists "question_tags_select_authenticated" on public.question_tags;
create policy "question_tags_select_authenticated"
  on public.question_tags for select
  to authenticated
  using (true);

drop policy if exists "question_tag_links_select_authenticated" on public.question_tag_links;
create policy "question_tag_links_select_authenticated"
  on public.question_tag_links for select
  to authenticated
  using (true);

drop policy if exists "question_explanations_select_authenticated" on public.question_explanations;
create policy "question_explanations_select_authenticated"
  on public.question_explanations for select
  to authenticated
  using (true);

drop policy if exists "question_assets_select_authenticated" on public.question_assets;
create policy "question_assets_select_authenticated"
  on public.question_assets for select
  to authenticated
  using (true);

insert into public.question_sources (name, slug, type, license_notes)
values
  (
    'Curadoria interna Zero Base',
    'zero-base-curadoria',
    'internal',
    'Conteudo autoral e revisado internamente.'
  ),
  (
    'ENEM / Inep (documentos e bases publicas)',
    'enem-inep-publico',
    'official',
    'Usar apenas documentos oficiais e bases publicas/licitas para o ENEM.'
  ),
  (
    'Dataset publico tratado',
    'dataset-publico-tratado',
    'public_dataset',
    'Fontes publicas com licenca compativel, revisadas antes de publicacao.'
  ),
  (
    'Documento oficial de concurso',
    'documento-oficial-concurso',
    'official',
    'Edital, prova e gabarito oficiais como fonte primaria.'
  ),
  (
    'Curadoria concurso Zero Base',
    'curadoria-concurso-zero-base',
    'curated',
    'Curadoria propria baseada em edital e documentos oficiais; sem copiar plataformas privadas.'
  )
on conflict (slug) do update
set
  name = excluded.name,
  type = excluded.type,
  license_notes = excluded.license_notes,
  is_active = true;

insert into public.exam_boards (name, slug)
values
  ('Cebraspe', 'cebraspe'),
  ('FGV', 'fgv'),
  ('FCC', 'fcc'),
  ('Vunesp', 'vunesp'),
  ('IBFC', 'ibfc'),
  ('AOCP', 'aocp'),
  ('Instituto Consulplan', 'instituto-consulplan')
on conflict (slug) do update
set name = excluded.name;
