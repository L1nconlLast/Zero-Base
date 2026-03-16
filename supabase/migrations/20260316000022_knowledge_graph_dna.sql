-- ============================================================
-- Migration: Knowledge Graph DNA (ENEM + Concursos)
-- Objetivo: adicionar grafo de prerequisitos, metadados de DNA
-- e progresso detalhado por topico para recomendacao e IA.
-- ============================================================

create table if not exists public.topico_prerequisitos (
  topico_id uuid not null references public.topicos(id) on delete cascade,
  prerequisito_id uuid not null references public.topicos(id) on delete cascade,
  mastery_required integer not null default 70 check (mastery_required between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (topico_id, prerequisito_id),
  check (topico_id <> prerequisito_id)
);

create table if not exists public.topico_dna (
  topico_id uuid primary key references public.topicos(id) on delete cascade,
  codigo text unique,
  dificuldade integer not null default 2 check (dificuldade between 1 and 5),
  frequencia_enem integer not null default 0 check (frequencia_enem between 0 and 100),
  frequencia_concursos integer not null default 0 check (frequencia_concursos between 0 and 100),
  tempo_medio_aprendizado_min integer not null default 60 check (tempo_medio_aprendizado_min > 0),
  relevancia_global integer not null default 50 check (relevancia_global between 0 and 100),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.user_learning_progress (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  topico_id uuid not null references public.topicos(id) on delete cascade,
  status text not null default 'locked' check (status in ('locked', 'available', 'studying', 'completed', 'review')),
  pontuacao integer not null default 0 check (pontuacao between 0 and 100),
  tempo_estudo_min integer not null default 0 check (tempo_estudo_min >= 0),
  tentativas integer not null default 0 check (tentativas >= 0),
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  primary key (usuario_id, topico_id)
);

create index if not exists idx_topico_prerequisitos_topico on public.topico_prerequisitos(topico_id);
create index if not exists idx_topico_prerequisitos_prereq on public.topico_prerequisitos(prerequisito_id);
create index if not exists idx_topico_dna_frequencia_enem on public.topico_dna(frequencia_enem desc);
create index if not exists idx_topico_dna_frequencia_concursos on public.topico_dna(frequencia_concursos desc);
create index if not exists idx_user_learning_progress_usuario_status on public.user_learning_progress(usuario_id, status);
create index if not exists idx_user_learning_progress_usuario_atualizado on public.user_learning_progress(usuario_id, atualizado_em desc);

create or replace function public.touch_topico_dna_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_topico_dna_updated_at on public.topico_dna;
create trigger trigger_topico_dna_updated_at
before update on public.topico_dna
for each row execute function public.touch_topico_dna_updated_at();

create or replace function public.touch_user_learning_progress_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trigger_user_learning_progress_updated_at on public.user_learning_progress;
create trigger trigger_user_learning_progress_updated_at
before update on public.user_learning_progress
for each row execute function public.touch_user_learning_progress_updated_at();

alter table public.topico_prerequisitos enable row level security;
alter table public.topico_dna enable row level security;
alter table public.user_learning_progress enable row level security;

-- Catálogo global: leitura liberada para usuários autenticados
drop policy if exists "topico_prerequisitos_select_authenticated" on public.topico_prerequisitos;
create policy "topico_prerequisitos_select_authenticated"
  on public.topico_prerequisitos for select
  to authenticated
  using (true);

drop policy if exists "topico_dna_select_authenticated" on public.topico_dna;
create policy "topico_dna_select_authenticated"
  on public.topico_dna for select
  to authenticated
  using (true);

-- Progresso por usuário
drop policy if exists "user_learning_progress_select_own" on public.user_learning_progress;
create policy "user_learning_progress_select_own"
  on public.user_learning_progress for select
  using (auth.uid() = usuario_id);

drop policy if exists "user_learning_progress_insert_own" on public.user_learning_progress;
create policy "user_learning_progress_insert_own"
  on public.user_learning_progress for insert
  with check (auth.uid() = usuario_id);

drop policy if exists "user_learning_progress_update_own" on public.user_learning_progress;
create policy "user_learning_progress_update_own"
  on public.user_learning_progress for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create or replace view public.vw_topico_grafo as
select
  t.id as topico_id,
  t.nome as topico_nome,
  d.id as disciplina_id,
  d.nome as disciplina_nome,
  m.nome as modalidade_nome,
  td.dificuldade,
  td.frequencia_enem,
  td.frequencia_concursos,
  td.tempo_medio_aprendizado_min,
  coalesce(count(tp.prerequisito_id), 0) as total_prerequisitos
from public.topicos t
join public.disciplinas d on d.id = t.disciplina_id
join public.modalidades m on m.id = d.modalidade_id
left join public.topico_dna td on td.topico_id = t.id
left join public.topico_prerequisitos tp on tp.topico_id = t.id
group by t.id, d.id, m.id, td.topico_id;

create or replace function public.sp_next_topic_for_user(
  p_usuario_id uuid,
  p_disciplina_id uuid default null
)
returns table (
  topico_id uuid,
  topico_nome text,
  disciplina_id uuid,
  disciplina_nome text,
  prioridade integer
)
language sql
security definer
set search_path = public
as $$
  with candidatos as (
    select
      t.id as topico_id,
      t.nome as topico_nome,
      d.id as disciplina_id,
      d.nome as disciplina_nome,
      coalesce(ulp.status, 'locked') as status,
      coalesce(ulp.pontuacao, 0) as pontuacao,
      coalesce(td.frequencia_enem, 0) + coalesce(td.frequencia_concursos, 0) + coalesce(td.relevancia_global, 50) as prioridade,
      not exists (
        select 1
        from public.topico_prerequisitos tp
        left join public.user_learning_progress preq on preq.topico_id = tp.prerequisito_id and preq.usuario_id = p_usuario_id
        where tp.topico_id = t.id
          and coalesce(preq.status, 'locked') not in ('completed', 'review')
      ) as prerequisitos_ok
    from public.topicos t
    join public.disciplinas d on d.id = t.disciplina_id
    left join public.topico_dna td on td.topico_id = t.id
    left join public.user_learning_progress ulp on ulp.topico_id = t.id and ulp.usuario_id = p_usuario_id
    where t.ativo = true
      and d.ativo = true
      and (p_disciplina_id is null or d.id = p_disciplina_id)
  )
  select
    c.topico_id,
    c.topico_nome,
    c.disciplina_id,
    c.disciplina_nome,
    c.prioridade
  from candidatos c
  where c.prerequisitos_ok = true
    and c.status in ('available', 'studying', 'locked')
  order by
    case when c.status = 'available' then 0 when c.status = 'studying' then 1 else 2 end,
    c.prioridade desc,
    c.pontuacao asc,
    c.topico_nome asc
  limit 1;
$$;
