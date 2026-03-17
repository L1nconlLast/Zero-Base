# Knowledge Graph Seed

Este pacote materializa um blueprint utilizavel para o Knowledge Graph do Zero Base com tres camadas:

- nucleo realista e versionado em `core/`
- expansao automatica para milhares de nos em `generated/`
- seed SQL compativel com o schema atual do Supabase

## Arquivos-base

- `core/disciplines.json`: disciplinas, modalidade, ordem, areas e meta de volume
- `core/topics.json`: topicos reais iniciais com metadados para IA
- `core/edges.json`: prerequisitos e relacoes iniciais

## Gerar o pacote completo

Execute na raiz do projeto:

```bash
npm run knowledge-graph:build
```

O comando gera:

- `generated/disciplines.generated.json`
- `generated/topics.generated.json`
- `generated/edges.generated.json`
- `generated/manifest.generated.json`
- `generated/knowledge_graph_seed.sql`

## Promover para migration

Para aplicar pelo fluxo remoto padrao (`supabase db push`), promova o seed para a pasta de migrations:

```bash
npm run knowledge-graph:promote
```

Depois execute o script remoto ja usado no projeto:

```powershell
powershell -ExecutionPolicy Bypass -File .\supabase\scripts\apply_remote_migrations.ps1 -AccessToken "sbp_SEU_TOKEN"
```

## Importacao no Supabase

1. Garanta que as migrations do knowledge graph ja foram aplicadas.
2. Gere os artefatos com `npm run knowledge-graph:build`.
3. Execute o SQL de `generated/knowledge_graph_seed.sql` no SQL Editor do Supabase.

## Observacoes de modelagem

- O pacote usa `modalidade` = `ENEM` ou `CONCURSOS` para localizar a disciplina correta no banco.
- Os ids do JSON sao estaveis para IA, API e React Flow, mas o banco continua usando UUID interno para `topicos`.
- O SQL faz `upsert` por `(disciplina_id, nome)`, evitando duplicacao ao reexecutar o seed.
- O gerador preserva o nucleo real e completa o restante com topicos estruturados por area/subarea ate o volume alvo.