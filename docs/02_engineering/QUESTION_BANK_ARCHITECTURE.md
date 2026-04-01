# Question Bank Architecture

## Objetivo

Expandir o banco de questoes do Zero Base sem recomeçar o schema do zero. A base existente de `modalidades`, `disciplinas`, `topicos`, `questoes` e `alternativas` continua sendo o nucleo funcional do app. Esta rodada adiciona a camada operacional que faltava para escalar:

- fontes
- bancas, concursos e cargos
- documentos oficiais
- deduplicacao por hash
- fila de importacao CSV/JSON
- filtros de catalogo mais ricos na API

## Fonte oficial e politica de ingestao

- ENEM: usar documentos e bases publicas/oficiais, incluindo matriz/cartilha do Inep e datasets publicos licitos.
- Concursos: usar edital, prova e gabarito oficiais como fonte primaria.
- Plataformas privadas podem inspirar taxonomia e experiencia, mas nao devem ser copiadas automaticamente.

Decisao de modelagem:

- `questoes` continua sendo a tabela principal do app.
- `modalidades` + `disciplinas` + `topicos` continuam sendo a taxonomia pedagogica principal.
- `question_sources`, `exam_boards`, `exams`, `jobs` e `official_documents` passam a dar contexto oficial para cada questao.

## Tabelas novas

- `question_sources`
- `exam_boards`
- `exams`
- `jobs`
- `official_documents`
- `exam_subjects`
- `question_tags`
- `question_tag_links`
- `question_explanations`
- `question_assets`
- `question_import_batches`
- `question_import_rows`

## Extensoes em `questoes`

Foram adicionados metadados normalizados para filtros e ingestao:

- `source_id`
- `modalidade_id`
- `disciplina_id`
- `banca_id`
- `concurso_id`
- `cargo_id`
- `documento_oficial_id`
- `area`
- `subarea`
- `question_type`
- `objetivo`
- `status_catalogo`
- `is_official`
- `is_original_commentary`
- `can_be_used_in_leveling`
- `can_be_used_in_mock_exam`
- `metadata`
- `hash_enunciado`
- `hash_alternativas`
- `hash_questao`

## Deduplicacao

A deduplicacao agora usa tres hashes:

- hash do enunciado
- hash das alternativas ordenadas
- hash combinado da questao

Esses hashes sao atualizados por trigger em `questoes` e `alternativas`.

## API nova/expandida

### GET `/api/questions`

Filtros suportados:

- `subjectId`
- `skillId`
- `difficulty`
- `area`
- `subarea`
- `objective`
- `boardId`
- `examId`
- `jobId`
- `year`
- `search`
- `limit`

### POST `/api/questions/import`

Rota protegida por auth + admin.

Payload:

```json
{
  "batchName": "enem-seed-2025",
  "format": "json",
  "payload": [
    {
      "enunciado": "Questao exemplo",
      "disciplina": "Matematica",
      "topico": "Estatistica descritiva",
      "objetivo": "enem",
      "tipo": "multiple_choice",
      "option_a": "1",
      "option_b": "2",
      "gabarito": "B"
    }
  ],
  "sourceName": "ENEM / Inep (documentos e bases publicas)",
  "dryRun": false
}
```

## Campos aceitos pelo importador

O importador aceita JSON ou CSV com aliases comuns:

- `enunciado` / `statement`
- `disciplina` / `subject`
- `topico` / `topic`
- `objetivo` / `objective`
- `tipo` / `question_type`
- `dificuldade` / `difficulty`
- `ano` / `year`
- `banca` / `board`
- `concurso` / `exam`
- `cargo` / `job`
- `edital` / `document_title`
- `url_edital` / `document_url`
- `option_a` ... `option_e`
- `gabarito` / `correct_option`
- `explicacao` / `explanation`

## Mapeamento com a estrategia do produto

- ENEM nao deve ser tratado como mera lista de materias.
- Concursos nao devem ser tratados como matriz unica nacional.
- O catalogo precisa permitir reuso da mesma questao em nivelamento, pratica, simulado e revisao.
- Quando nao houver edital, concurso deve permanecer em modo generico/curado, sem promessa de aderencia integral.
