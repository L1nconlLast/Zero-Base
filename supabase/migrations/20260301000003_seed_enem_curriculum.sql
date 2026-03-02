-- ============================================================
-- Seed ENEM curriculum (modalidades/disciplinas/tópicos)
-- Idempotente e compatível com schema v20260301000002
-- ============================================================

-- ENEM modalidade
insert into public.modalidades (nome, descricao, icone)
values ('ENEM', 'Exame Nacional do Ensino Médio', '📘')
on conflict (nome) do update
set
  descricao = excluded.descricao,
  icone = excluded.icone,
  ativo = true;

-- Disciplinas ENEM
with enem as (
  select id as modalidade_id
  from public.modalidades
  where nome = 'ENEM'
)
insert into public.disciplinas (modalidade_id, nome, icone, cor_hex, ordem)
select enem.modalidade_id, v.nome, v.icone, v.cor_hex, v.ordem
from enem
join (
  values
    ('Linguagens', '📚', '#3B82F6', 1),
    ('História Geral', '🏛️', '#7C3AED', 2),
    ('História do Brasil', '🇧🇷', '#9333EA', 3),
    ('Geografia', '🌍', '#0EA5E9', 4),
    ('Filosofia/Sociologia', '🧠', '#6366F1', 5),
    ('Física', '⚛️', '#F59E0B', 6),
    ('Química', '🧪', '#10B981', 7),
    ('Matemática', '📐', '#EF4444', 8)
) as v(nome, icone, cor_hex, ordem) on true
on conflict (modalidade_id, nome) do update
set
  icone = excluded.icone,
  cor_hex = excluded.cor_hex,
  ordem = excluded.ordem,
  ativo = true;

-- Tópicos de Matemática
with disciplina as (
  select d.id as disciplina_id
  from public.disciplinas d
  join public.modalidades m on m.id = d.modalidade_id
  where m.nome = 'ENEM' and d.nome = 'Matemática'
)
insert into public.topicos (disciplina_id, nome, ordem, nivel_dificuldade, tempo_estimado_min)
select disciplina.disciplina_id, v.nome, v.ordem, v.nivel_dificuldade, v.tempo_estimado_min
from disciplina
join (
  values
    ('Matemática Básica', 1, 'iniciante', 35),
    ('Trigonometria', 2, 'intermediario', 45),
    ('Probabilidade', 3, 'intermediario', 40),
    ('PA e PG', 4, 'intermediario', 40),
    ('Interpretação de gráficos e tabelas', 5, 'iniciante', 35),
    ('Porcentagem', 6, 'iniciante', 30),
    ('Escala', 7, 'iniciante', 30),
    ('Função do 1º e 2º Grau', 8, 'intermediario', 45),
    ('Média, moda e mediana', 9, 'iniciante', 30),
    ('Matemática Financeira', 10, 'intermediario', 40),
    ('Estatística', 11, 'intermediario', 40),
    ('Geometria Analítica, Plana e Espacial', 12, 'avancado', 55),
    ('Análise combinatória', 13, 'avancado', 50)
) as v(nome, ordem, nivel_dificuldade, tempo_estimado_min) on true
on conflict (disciplina_id, nome) do update
set
  ordem = excluded.ordem,
  nivel_dificuldade = excluded.nivel_dificuldade,
  tempo_estimado_min = excluded.tempo_estimado_min,
  ativo = true;

-- Tópicos de Química
with disciplina as (
  select d.id as disciplina_id
  from public.disciplinas d
  join public.modalidades m on m.id = d.modalidade_id
  where m.nome = 'ENEM' and d.nome = 'Química'
)
insert into public.topicos (disciplina_id, nome, ordem, nivel_dificuldade, tempo_estimado_min)
select disciplina.disciplina_id, v.nome, v.ordem, v.nivel_dificuldade, v.tempo_estimado_min
from disciplina
join (
  values
    ('Estudo da Matéria', 1, 'iniciante', 30),
    ('Estrutura Atômica', 2, 'iniciante', 35),
    ('Tabela Periódica', 3, 'iniciante', 35),
    ('Funções Inorgânicas', 4, 'intermediario', 40),
    ('Estequiometria', 5, 'intermediario', 45),
    ('Solubilidade', 6, 'intermediario', 40),
    ('Termoquímica', 7, 'intermediario', 45),
    ('Cinética', 8, 'intermediario', 45),
    ('Equilíbrio Químico', 9, 'avancado', 50),
    ('Equilíbrio Iônico', 10, 'avancado', 50),
    ('Eletroquímica', 11, 'avancado', 55),
    ('Química Orgânica', 12, 'intermediario', 50),
    ('Isomeria', 13, 'avancado', 50),
    ('Reações Orgânicas', 14, 'avancado', 55),
    ('Química Ambiental', 15, 'intermediario', 40)
) as v(nome, ordem, nivel_dificuldade, tempo_estimado_min) on true
on conflict (disciplina_id, nome) do update
set
  ordem = excluded.ordem,
  nivel_dificuldade = excluded.nivel_dificuldade,
  tempo_estimado_min = excluded.tempo_estimado_min,
  ativo = true;

-- Tópicos de Física
with disciplina as (
  select d.id as disciplina_id
  from public.disciplinas d
  join public.modalidades m on m.id = d.modalidade_id
  where m.nome = 'ENEM' and d.nome = 'Física'
)
insert into public.topicos (disciplina_id, nome, ordem, nivel_dificuldade, tempo_estimado_min)
select disciplina.disciplina_id, v.nome, v.ordem, v.nivel_dificuldade, v.tempo_estimado_min
from disciplina
join (
  values
    ('Cinemática', 1, 'iniciante', 35),
    ('Dinâmica', 2, 'intermediario', 45),
    ('Trabalho e Energia', 3, 'intermediario', 45),
    ('Termologia', 4, 'intermediario', 40),
    ('Óptica', 5, 'intermediario', 40),
    ('Ondulatória', 6, 'intermediario', 40),
    ('Eletrodinâmica', 7, 'avancado', 55),
    ('Eletrostática', 8, 'avancado', 50)
) as v(nome, ordem, nivel_dificuldade, tempo_estimado_min) on true
on conflict (disciplina_id, nome) do update
set
  ordem = excluded.ordem,
  nivel_dificuldade = excluded.nivel_dificuldade,
  tempo_estimado_min = excluded.tempo_estimado_min,
  ativo = true;

-- Tópicos de Linguagens
with disciplina as (
  select d.id as disciplina_id
  from public.disciplinas d
  join public.modalidades m on m.id = d.modalidade_id
  where m.nome = 'ENEM' and d.nome = 'Linguagens'
)
insert into public.topicos (disciplina_id, nome, ordem, nivel_dificuldade, tempo_estimado_min)
select disciplina.disciplina_id, v.nome, v.ordem, v.nivel_dificuldade, v.tempo_estimado_min
from disciplina
join (
  values
    ('Interpretação de Texto', 1, 'iniciante', 35),
    ('Funções da Linguagem', 2, 'intermediario', 35),
    ('Figuras de Linguagem', 3, 'intermediario', 35),
    ('Variação Linguística', 4, 'intermediario', 35),
    ('Gêneros Textuais', 5, 'intermediario', 40),
    ('Gramática Aplicada', 6, 'intermediario', 40),
    ('Redação ENEM', 7, 'avancado', 55)
) as v(nome, ordem, nivel_dificuldade, tempo_estimado_min) on true
on conflict (disciplina_id, nome) do update
set
  ordem = excluded.ordem,
  nivel_dificuldade = excluded.nivel_dificuldade,
  tempo_estimado_min = excluded.tempo_estimado_min,
  ativo = true;
