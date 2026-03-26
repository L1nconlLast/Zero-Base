-- ============================================================
-- Seed minima Sprint 2
-- Objetivo: habilitar o primeiro loop real de estudo com
-- 10 questoes de ENEM > Matematica > Porcentagem
-- nas tabelas existentes public.questoes/public.alternativas.
-- ============================================================

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
    and lower(d.nome) like 'matem%'
    and lower(t.nome) = 'porcentagem';

  if v_topico_count = 0 then
    raise exception 'Topico ENEM > Matematica > Porcentagem nao encontrado. Aplique o curriculo base antes desta seed.';
  end if;

  if v_topico_count > 1 then
    raise exception 'Topico ENEM > Matematica > Porcentagem ambiguo: % registros encontrados.', v_topico_count;
  end if;
end
$$;

with context as (
  select t.id as topico_id
  from public.topicos t
  join public.disciplinas d on d.id = t.disciplina_id
  join public.modalidades m on m.id = d.modalidade_id
  where lower(m.nome) = 'enem'
    and lower(d.nome) like 'matem%'
    and lower(t.nome) = 'porcentagem'
),
seed_questions(question_key, enunciado, nivel, fonte, ano, explicacao, assunto) as (
  values
    (
      'pct-001',
      'Um produto custa R$ 200,00 e recebeu desconto de 15%. Qual e o novo preco?',
      'facil',
      'Seed Sprint 2',
      2026,
      'Quinze por cento de 200 e 30. Subtraindo 30 de 200, obtemos 170.',
      'Porcentagem'
    ),
    (
      'pct-002',
      'Um salario de R$ 1.500,00 recebeu aumento de 10%. Qual passou a ser o novo salario?',
      'facil',
      'Seed Sprint 2',
      2026,
      'Dez por cento de 1.500 e 150. Somando 150 ao valor inicial, o novo salario e 1.650.',
      'Porcentagem'
    ),
    (
      'pct-003',
      'Qual e o valor correspondente a 25% de 320?',
      'facil',
      'Seed Sprint 2',
      2026,
      'Vinte e cinco por cento corresponde a um quarto. Um quarto de 320 e 80.',
      'Porcentagem'
    ),
    (
      'pct-004',
      'Depois de um desconto de 20%, um item passou a custar R$ 240,00. Qual era o preco original?',
      'medio',
      'Seed Sprint 2',
      2026,
      'Se houve desconto de 20%, o valor final representa 80% do preco original. Assim, 240 dividido por 0,8 e 300.',
      'Porcentagem'
    ),
    (
      'pct-005',
      'Em uma turma com 40 alunos, 30% faltaram em um dia. Quantos alunos faltaram?',
      'facil',
      'Seed Sprint 2',
      2026,
      'Trinta por cento de 40 e 12. Portanto, 12 alunos faltaram.',
      'Porcentagem'
    ),
    (
      'pct-006',
      'O preco de um caderno subiu de R$ 80,00 para R$ 100,00. Qual foi o percentual de aumento?',
      'medio',
      'Seed Sprint 2',
      2026,
      'O aumento foi de 20 reais. Dividindo 20 por 80, obtemos 0,25, ou seja, 25%.',
      'Porcentagem'
    ),
    (
      'pct-007',
      'Um produto custa R$ 250,00 e incide um imposto de 12% sobre esse valor. Qual sera o preco final?',
      'medio',
      'Seed Sprint 2',
      2026,
      'Doze por cento de 250 e 30. Somando 30 a 250, o preco final e 280.',
      'Porcentagem'
    ),
    (
      'pct-008',
      'O numero 18 corresponde a qual percentual de 72?',
      'facil',
      'Seed Sprint 2',
      2026,
      'Dividindo 18 por 72, obtemos 0,25. Em percentual, isso corresponde a 25%.',
      'Porcentagem'
    ),
    (
      'pct-009',
      'Uma papelaria tinha 500 cadernos em estoque e vendeu 40% deles. Quantos cadernos restaram?',
      'facil',
      'Seed Sprint 2',
      2026,
      'Quarenta por cento de 500 e 200. Restam 500 menos 200, totalizando 300 cadernos.',
      'Porcentagem'
    ),
    (
      'pct-010',
      'Uma camisa sofreu aumento de 25% e passou a custar R$ 150,00. Qual era o preco antes do aumento?',
      'medio',
      'Seed Sprint 2',
      2026,
      'Se o novo preco representa 125% do original, basta dividir 150 por 1,25. O valor encontrado e 120.',
      'Porcentagem'
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

do $$
declare
  v_seeded_count integer;
begin
  with context as (
    select t.id as topico_id
    from public.topicos t
    join public.disciplinas d on d.id = t.disciplina_id
    join public.modalidades m on m.id = d.modalidade_id
    where lower(m.nome) = 'enem'
      and lower(d.nome) like 'matem%'
      and lower(t.nome) = 'porcentagem'
  ),
  seed_questions(question_key, enunciado, fonte) as (
    values
      ('pct-001', 'Um produto custa R$ 200,00 e recebeu desconto de 15%. Qual e o novo preco?', 'Seed Sprint 2'),
      ('pct-002', 'Um salario de R$ 1.500,00 recebeu aumento de 10%. Qual passou a ser o novo salario?', 'Seed Sprint 2'),
      ('pct-003', 'Qual e o valor correspondente a 25% de 320?', 'Seed Sprint 2'),
      ('pct-004', 'Depois de um desconto de 20%, um item passou a custar R$ 240,00. Qual era o preco original?', 'Seed Sprint 2'),
      ('pct-005', 'Em uma turma com 40 alunos, 30% faltaram em um dia. Quantos alunos faltaram?', 'Seed Sprint 2'),
      ('pct-006', 'O preco de um caderno subiu de R$ 80,00 para R$ 100,00. Qual foi o percentual de aumento?', 'Seed Sprint 2'),
      ('pct-007', 'Um produto custa R$ 250,00 e incide um imposto de 12% sobre esse valor. Qual sera o preco final?', 'Seed Sprint 2'),
      ('pct-008', 'O numero 18 corresponde a qual percentual de 72?', 'Seed Sprint 2'),
      ('pct-009', 'Uma papelaria tinha 500 cadernos em estoque e vendeu 40% deles. Quantos cadernos restaram?', 'Seed Sprint 2'),
      ('pct-010', 'Uma camisa sofreu aumento de 25% e passou a custar R$ 150,00. Qual era o preco antes do aumento?', 'Seed Sprint 2')
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
     and q.assunto = 'Porcentagem'
  )
  select count(*)
    into v_seeded_count
  from seeded_questions;

  if v_seeded_count <> 10 then
    raise exception 'Seed Sprint 2 invalida: apenas % das 10 questoes seed foram resolvidas para insercao de alternativas.', v_seeded_count;
  end if;
end
$$;

with context as (
  select t.id as topico_id
  from public.topicos t
  join public.disciplinas d on d.id = t.disciplina_id
  join public.modalidades m on m.id = d.modalidade_id
  where lower(m.nome) = 'enem'
    and lower(d.nome) like 'matem%'
    and lower(t.nome) = 'porcentagem'
),
seed_questions(question_key, enunciado, fonte) as (
  values
    ('pct-001', 'Um produto custa R$ 200,00 e recebeu desconto de 15%. Qual e o novo preco?', 'Seed Sprint 2'),
    ('pct-002', 'Um salario de R$ 1.500,00 recebeu aumento de 10%. Qual passou a ser o novo salario?', 'Seed Sprint 2'),
    ('pct-003', 'Qual e o valor correspondente a 25% de 320?', 'Seed Sprint 2'),
    ('pct-004', 'Depois de um desconto de 20%, um item passou a custar R$ 240,00. Qual era o preco original?', 'Seed Sprint 2'),
    ('pct-005', 'Em uma turma com 40 alunos, 30% faltaram em um dia. Quantos alunos faltaram?', 'Seed Sprint 2'),
    ('pct-006', 'O preco de um caderno subiu de R$ 80,00 para R$ 100,00. Qual foi o percentual de aumento?', 'Seed Sprint 2'),
    ('pct-007', 'Um produto custa R$ 250,00 e incide um imposto de 12% sobre esse valor. Qual sera o preco final?', 'Seed Sprint 2'),
    ('pct-008', 'O numero 18 corresponde a qual percentual de 72?', 'Seed Sprint 2'),
    ('pct-009', 'Uma papelaria tinha 500 cadernos em estoque e vendeu 40% deles. Quantos cadernos restaram?', 'Seed Sprint 2'),
    ('pct-010', 'Uma camisa sofreu aumento de 25% e passou a custar R$ 150,00. Qual era o preco antes do aumento?', 'Seed Sprint 2')
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
   and q.assunto = 'Porcentagem'
),
seed_alternatives(question_key, letra, texto, correta) as (
  values
    ('pct-001', 'A', 'R$ 160,00', false),
    ('pct-001', 'B', 'R$ 170,00', true),
    ('pct-001', 'C', 'R$ 175,00', false),
    ('pct-001', 'D', 'R$ 185,00', false),

    ('pct-002', 'A', 'R$ 1.600,00', false),
    ('pct-002', 'B', 'R$ 1.650,00', true),
    ('pct-002', 'C', 'R$ 1.700,00', false),
    ('pct-002', 'D', 'R$ 1.750,00', false),

    ('pct-003', 'A', '60', false),
    ('pct-003', 'B', '70', false),
    ('pct-003', 'C', '80', true),
    ('pct-003', 'D', '90', false),

    ('pct-004', 'A', 'R$ 280,00', false),
    ('pct-004', 'B', 'R$ 290,00', false),
    ('pct-004', 'C', 'R$ 300,00', true),
    ('pct-004', 'D', 'R$ 320,00', false),

    ('pct-005', 'A', '8', false),
    ('pct-005', 'B', '10', false),
    ('pct-005', 'C', '12', true),
    ('pct-005', 'D', '14', false),

    ('pct-006', 'A', '20%', false),
    ('pct-006', 'B', '25%', true),
    ('pct-006', 'C', '30%', false),
    ('pct-006', 'D', '35%', false),

    ('pct-007', 'A', 'R$ 270,00', false),
    ('pct-007', 'B', 'R$ 275,00', false),
    ('pct-007', 'C', 'R$ 280,00', true),
    ('pct-007', 'D', 'R$ 282,00', false),

    ('pct-008', 'A', '18%', false),
    ('pct-008', 'B', '20%', false),
    ('pct-008', 'C', '25%', true),
    ('pct-008', 'D', '30%', false),

    ('pct-009', 'A', '280', false),
    ('pct-009', 'B', '300', true),
    ('pct-009', 'C', '320', false),
    ('pct-009', 'D', '350', false),

    ('pct-010', 'A', 'R$ 110,00', false),
    ('pct-010', 'B', 'R$ 115,00', false),
    ('pct-010', 'C', 'R$ 120,00', true),
    ('pct-010', 'D', 'R$ 125,00', false)
)
insert into public.alternativas (
  questao_id,
  letra,
  texto,
  correta
)
select
  q.questao_id,
  a.letra,
  a.texto,
  a.correta
from seeded_questions q
join seed_alternatives a
  on a.question_key = q.question_key
on conflict (questao_id, letra) do update
set
  texto = excluded.texto,
  correta = excluded.correta;

do $$
declare
  v_total_questoes integer;
  v_questoes_invalidas integer;
  v_corretas_invalidas integer;
  v_questoes_prontas integer;
begin
  select count(*)
    into v_total_questoes
  from public.questoes q
  join public.topicos t on t.id = q.topico_id
  join public.disciplinas d on d.id = t.disciplina_id
  join public.modalidades m on m.id = d.modalidade_id
  where lower(m.nome) = 'enem'
    and lower(d.nome) like 'matem%'
    and lower(t.nome) = 'porcentagem'
    and q.fonte = 'Seed Sprint 2'
    and q.ativo is true;

  if v_total_questoes < 10 then
    raise exception 'Seed Sprint 2 incompleta: apenas % questoes validas encontradas.', v_total_questoes;
  end if;

  with target_questions as (
    select q.id
    from public.questoes q
    join public.topicos t on t.id = q.topico_id
    join public.disciplinas d on d.id = t.disciplina_id
    join public.modalidades m on m.id = d.modalidade_id
    where lower(m.nome) = 'enem'
      and lower(d.nome) like 'matem%'
      and lower(t.nome) = 'porcentagem'
      and q.fonte = 'Seed Sprint 2'
      and q.ativo is true
  ),
  alternative_counts as (
    select
      tq.id,
      count(a.*) as total_alternativas
    from target_questions tq
    left join public.alternativas a on a.questao_id = tq.id
    group by tq.id
  )
  select count(*)
    into v_questoes_invalidas
  from alternative_counts
  where total_alternativas < 4;

  if v_questoes_invalidas > 0 then
    raise exception 'Seed Sprint 2 invalida: % questoes possuem menos de 4 alternativas.', v_questoes_invalidas;
  end if;

  with target_questions as (
    select q.id
    from public.questoes q
    join public.topicos t on t.id = q.topico_id
    join public.disciplinas d on d.id = t.disciplina_id
    join public.modalidades m on m.id = d.modalidade_id
    where lower(m.nome) = 'enem'
      and lower(d.nome) like 'matem%'
      and lower(t.nome) = 'porcentagem'
      and q.fonte = 'Seed Sprint 2'
      and q.ativo is true
  ),
  correct_counts as (
    select
      tq.id,
      coalesce(sum(case when a.correta then 1 else 0 end), 0) as total_corretas
    from target_questions tq
    left join public.alternativas a on a.questao_id = tq.id
    group by tq.id
  )
  select count(*)
    into v_corretas_invalidas
  from correct_counts
  where total_corretas <> 1;

  if v_corretas_invalidas > 0 then
    raise exception 'Seed Sprint 2 invalida: % questoes nao possuem exatamente 1 alternativa correta.', v_corretas_invalidas;
  end if;

  with target_questions as (
    select q.id
    from public.questoes q
    join public.topicos t on t.id = q.topico_id
    join public.disciplinas d on d.id = t.disciplina_id
    join public.modalidades m on m.id = d.modalidade_id
    where lower(m.nome) = 'enem'
      and lower(d.nome) like 'matem%'
      and lower(t.nome) = 'porcentagem'
      and q.fonte = 'Seed Sprint 2'
      and q.ativo is true
  ),
  ready_questions as (
    select
      tq.id
    from target_questions tq
    left join public.alternativas a on a.questao_id = tq.id
    group by tq.id
    having count(a.*) >= 4
       and sum(case when a.correta then 1 else 0 end) = 1
  )
  select count(*)
    into v_questoes_prontas
  from ready_questions;

  if v_questoes_prontas < 5 then
    raise exception 'Seed Sprint 2 insuficiente: apenas % questoes prontas para sessao.', v_questoes_prontas;
  end if;
end
$$;
