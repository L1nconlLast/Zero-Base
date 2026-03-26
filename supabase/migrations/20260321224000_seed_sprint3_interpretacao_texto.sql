do $$
declare
  v_topico_count integer;
begin
  select count(*)
    into v_topico_count
  from public.topicos t
  join public.disciplinas d on d.id = t.disciplina_id
  join public.modalidades m on m.id = d.modalidade_id
  where lower(m.nome) = 'enem'
    and lower(d.nome) = 'linguagens'
    and lower(t.nome) like 'interpreta%texto%';

  if v_topico_count = 0 then
    raise exception 'Topico ENEM > Linguagens > Interpretacao de Texto nao encontrado. Aplique o curriculo base antes desta seed.';
  end if;

  if v_topico_count > 1 then
    raise exception 'Topico ENEM > Linguagens > Interpretacao de Texto ambiguo: % registros encontrados.', v_topico_count;
  end if;
end
$$;

with context as (
  select t.id as topico_id
  from public.topicos t
  join public.disciplinas d on d.id = t.disciplina_id
  join public.modalidades m on m.id = d.modalidade_id
  where lower(m.nome) = 'enem'
    and lower(d.nome) = 'linguagens'
    and lower(t.nome) like 'interpreta%texto%'
),
seed_questions(question_key, enunciado, nivel, fonte, ano, explicacao, assunto) as (
  values
    (
      'int-001',
      'Em um cartaz com a frase "Beba agua ao longo do dia", a finalidade principal do texto e:',
      'facil',
      'Seed Sprint 3',
      2026,
      'O enunciado busca orientar o leitor para adotar um comportamento cotidiano de cuidado com a saude.',
      'Interpretacao de Texto'
    ),
    (
      'int-002',
      'Na frase "O museu abre as 9h e fecha as 17h", a informacao central e:',
      'facil',
      'Seed Sprint 3',
      2026,
      'O texto apresenta de forma objetiva o horario em que o museu funciona.',
      'Interpretacao de Texto'
    ),
    (
      'int-003',
      'Em uma campanha com o slogan "Vacinar e proteger", a relacao entre as palavras indica:',
      'medio',
      'Seed Sprint 3',
      2026,
      'O slogan associa a acao de vacinar ao efeito de proteger, reforcando uma relacao de causa e consequencia.',
      'Interpretacao de Texto'
    ),
    (
      'int-004',
      'Num anuncio escrito "Ultimos dias de inscricao", o efeito principal da mensagem e:',
      'medio',
      'Seed Sprint 3',
      2026,
      'A expressao destaca a proximidade do prazo final para incentivar uma acao imediata.',
      'Interpretacao de Texto'
    ),
    (
      'int-005',
      'Ao ler "Traga sua garrafa para reduzir residuos", entende-se que o texto pretende:',
      'facil',
      'Seed Sprint 3',
      2026,
      'A mensagem incentiva uma pratica individual ligada a sustentabilidade e reducao de lixo.',
      'Interpretacao de Texto'
    )
),
missing_questions as (
  select
    c.topico_id,
    s.question_key,
    s.enunciado,
    s.nivel,
    s.fonte,
    s.ano,
    s.explicacao,
    s.assunto
  from context c
  join seed_questions s on true
  where not exists (
    select 1
    from public.questoes q
    where q.topico_id = c.topico_id
      and q.fonte = s.fonte
      and q.enunciado = s.enunciado
  )
)
insert into public.questoes (
  topico_id,
  enunciado,
  nivel,
  fonte,
  ano,
  explicacao,
  assunto,
  ativo
)
select
  topico_id,
  enunciado,
  nivel,
  fonte,
  ano,
  explicacao,
  assunto,
  true
from missing_questions;

with context as (
  select t.id as topico_id
  from public.topicos t
  join public.disciplinas d on d.id = t.disciplina_id
  join public.modalidades m on m.id = d.modalidade_id
  where lower(m.nome) = 'enem'
    and lower(d.nome) = 'linguagens'
    and lower(t.nome) like 'interpreta%texto%'
),
seed_questions(question_key, enunciado, fonte) as (
  values
    ('int-001', 'Em um cartaz com a frase "Beba agua ao longo do dia", a finalidade principal do texto e:', 'Seed Sprint 3'),
    ('int-002', 'Na frase "O museu abre as 9h e fecha as 17h", a informacao central e:', 'Seed Sprint 3'),
    ('int-003', 'Em uma campanha com o slogan "Vacinar e proteger", a relacao entre as palavras indica:', 'Seed Sprint 3'),
    ('int-004', 'Num anuncio escrito "Ultimos dias de inscricao", o efeito principal da mensagem e:', 'Seed Sprint 3'),
    ('int-005', 'Ao ler "Traga sua garrafa para reduzir residuos", entende-se que o texto pretende:', 'Seed Sprint 3')
),
seeded_questions as (
  select
    s.question_key,
    q.id as questao_id
  from seed_questions s
  join context c on true
  join public.questoes q
    on q.topico_id = c.topico_id
   and q.enunciado = s.enunciado
   and q.fonte = s.fonte
   and q.assunto = 'Interpretacao de Texto'
),
seed_alternatives(question_key, letra, texto, correta) as (
  values
    ('int-001', 'A', 'orientar o leitor a adotar um habito', true),
    ('int-001', 'B', 'narrar uma lembranca pessoal', false),
    ('int-001', 'C', 'explicar a origem da agua', false),
    ('int-001', 'D', 'comparar bebidas diferentes', false),

    ('int-002', 'A', 'a historia do museu', false),
    ('int-002', 'B', 'o horario de funcionamento do museu', true),
    ('int-002', 'C', 'o preco do ingresso', false),
    ('int-002', 'D', 'as obras mais famosas do local', false),

    ('int-003', 'A', 'que vacinar atrasa a rotina', false),
    ('int-003', 'B', 'que proteger e mais importante que vacinar', false),
    ('int-003', 'C', 'que a vacinacao gera protecao', true),
    ('int-003', 'D', 'que a campanha trata de alimentacao', false),

    ('int-004', 'A', 'criar senso de urgencia', true),
    ('int-004', 'B', 'descrever todas as regras do processo', false),
    ('int-004', 'C', 'apresentar um relato cronologico', false),
    ('int-004', 'D', 'contar a origem da inscricao', false),

    ('int-005', 'A', 'estimular atitude sustentavel', true),
    ('int-005', 'B', 'proibir o uso de garrafas', false),
    ('int-005', 'C', 'ensinar a fabricar plastico', false),
    ('int-005', 'D', 'anunciar uma promocao de bebidas', false)
),
missing_alternatives as (
  select
    q.questao_id,
    a.letra,
    a.texto,
    a.correta
  from seeded_questions q
  join seed_alternatives a on a.question_key = q.question_key
  where not exists (
    select 1
    from public.alternativas existing
    where existing.questao_id = q.questao_id
      and existing.letra = a.letra
      and existing.texto = a.texto
  )
)
insert into public.alternativas (
  questao_id,
  letra,
  texto,
  correta
)
select
  questao_id,
  letra,
  texto,
  correta
from missing_alternatives;
