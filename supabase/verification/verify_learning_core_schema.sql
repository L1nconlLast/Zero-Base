-- Verificação rápida do núcleo educacional (disciplinas/tópicos/questões)

select
  case when to_regclass('public.modalidades') is not null then 'PASS' else 'FAIL' end as modalidades_exists,
  case when to_regclass('public.disciplinas') is not null then 'PASS' else 'FAIL' end as disciplinas_exists,
  case when to_regclass('public.topicos') is not null then 'PASS' else 'FAIL' end as topicos_exists,
  case when to_regclass('public.questoes') is not null then 'PASS' else 'FAIL' end as questoes_exists,
  case when to_regclass('public.alternativas') is not null then 'PASS' else 'FAIL' end as alternativas_exists,
  case when to_regclass('public.respostas_usuarios') is not null then 'PASS' else 'FAIL' end as respostas_usuarios_exists,
  case when to_regclass('public.simulados') is not null then 'PASS' else 'FAIL' end as simulados_exists,
  case when to_regclass('public.simulado_questoes') is not null then 'PASS' else 'FAIL' end as simulado_questoes_exists,
  case when to_regclass('public.anotacoes') is not null then 'PASS' else 'FAIL' end as anotacoes_exists,
  case when to_regclass('public.favoritos') is not null then 'PASS' else 'FAIL' end as favoritos_exists,
  case when to_regclass('public.progresso_topicos') is not null then 'PASS' else 'FAIL' end as progresso_topicos_exists,
  case when to_regclass('public.topico_study_content') is not null then 'PASS' else 'FAIL' end as topico_study_content_exists;

select
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'modalidades',
    'disciplinas',
    'topicos',
    'topico_study_content',
    'questoes',
    'alternativas',
    'respostas_usuarios',
    'simulados',
    'simulado_questoes',
    'anotacoes',
    'favoritos',
    'progresso_topicos'
  )
order by tablename;

select
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive
from pg_policies
where schemaname = 'public'
  and tablename in (
    'modalidades',
    'disciplinas',
    'topicos',
    'topico_study_content',
    'questoes',
    'alternativas',
    'respostas_usuarios',
    'simulados',
    'simulado_questoes',
    'anotacoes',
    'favoritos',
    'progresso_topicos'
  )
order by tablename, policyname;

select
  case when to_regclass('public.vw_desempenho_usuario_topico') is not null then 'PASS' else 'FAIL' end as vw_desempenho_usuario_topico_exists,
  case when to_regclass('public.vw_questoes_estatisticas') is not null then 'PASS' else 'FAIL' end as vw_questoes_estatisticas_exists;

select
  case when exists (
    select 1 from pg_proc where proname = 'sp_registrar_resposta'
  ) then 'PASS' else 'FAIL' end as sp_registrar_resposta_exists,
  case when exists (
    select 1 from pg_proc where proname = 'sp_gerar_simulado'
  ) then 'PASS' else 'FAIL' end as sp_gerar_simulado_exists;

-- Seed ENEM currículo
select
  m.nome as modalidade,
  count(distinct d.id) as disciplinas,
  count(distinct t.id) as topicos
from public.modalidades m
left join public.disciplinas d on d.modalidade_id = m.id and d.ativo is true
left join public.topicos t on t.disciplina_id = d.id and t.ativo is true
where m.nome = 'ENEM'
group by m.nome;
