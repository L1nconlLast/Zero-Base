# Cleanup Plan — Local + Supabase + Vercel

## 1. Projeto local

### Manter na raiz
- `src/`
- `api/`
- `public/` (se existir)
- `cypress/`
- `docs/`
- `package.json`
- lockfile
- configs (`tsconfig*`, `vite.config.*`, etc.)
- `.env.example`
- `.gitignore`
- `README.md`

### Apagar da árvore versionada
- `dist/`
- `dev-dist/`
- qualquer build output gerado localmente

### Ação
1. Apagar diretórios de build
2. Garantir no `.gitignore`
3. Reorganizar `docs/`
4. Commitar a estrutura limpa

---

## 2. Docs

### Nova estrutura
```txt
docs/
  01_product/
  02_engineering/
  03_release/
  04_research/
  99_archive/
```

### Regras
- Documento vivo fica em `01`, `02` ou `03`
- Pesquisa, validação e banca ficam em `04`
- Histórico e sobra vão para `99_archive`

### Sugestão de realocação
- `banca_ifpi/` → `docs/04_research/banca_ifpi/`
- checklists de validação → `docs/04_research/`
- checklists de deploy/go-live → `docs/03_release/`
- changelog de fase, compat spec, backup/restore → `docs/02_engineering/`
- roteiros antigos e notas executadas → `docs/99_archive/`

---

## 3. Supabase

## Objetivo
Deixar o projeto com somente:
- tabelas usadas pelo produto atual
- policies realmente necessárias
- buckets usados
- edge functions ativas
- env vars vivas
- migrations oficiais

### Auditoria mínima
Revisar:
- tabelas
- views
- functions
- triggers
- policies
- buckets/storage
- auth providers
- edge functions
- secrets
- cron jobs
- webhooks

### Checklist de limpeza
- [ ] listar tabelas e marcar: ativa / legado / dúvida
- [ ] listar views e confirmar consumidores
- [ ] listar functions SQL e Edge Functions
- [ ] revisar RLS por tabela
- [ ] revisar buckets não usados
- [ ] revisar secrets antigos
- [ ] revisar webhooks/cron
- [ ] consolidar migrations válidas
- [ ] arquivar SQL legado fora do fluxo principal

### Regra
Nada é apagado do Supabase sem:
1. snapshot/export
2. confirmação de consumo zero
3. rollback definido

### Estrutura sugerida no repositório
```txt
supabase/
  config.toml
  migrations/
  seed.sql
  functions/
  docs/
```

### Documento obrigatório
Criar depois:
- `docs/02_engineering/SUPABASE_SOURCE_OF_TRUTH.md`

Conteúdo mínimo:
- schema vivo
- tabelas canônicas
- entidades desativadas
- buckets válidos
- edge functions válidas
- secrets necessários

---

## 4. Vercel

## Objetivo
Deixar somente:
- projeto certo
- env vars atuais
- domínios usados
- deploy target correto
- preview/prod coerentes

### Checklist de limpeza
- [ ] revisar projetos duplicados
- [ ] revisar env vars antigas
- [ ] revisar domains e aliases
- [ ] revisar Git integration
- [ ] revisar build command
- [ ] revisar output directory
- [ ] revisar framework preset
- [ ] revisar cron jobs / integrations
- [ ] revisar deployments antigos que valha reter
- [ ] revisar team/project ownership

### Regras
- env var sem uso documentado é candidata a remoção
- domínio não usado sai
- projeto preview morto sai
- config de build deve bater com o repositório atual

### Documento obrigatório
Criar depois:
- `docs/03_release/VERCEL_RUNTIME_SOURCE_OF_TRUTH.md`

Conteúdo mínimo:
- projeto Vercel oficial
- branch de produção
- build command
- output config
- lista de env vars
- política de preview
- rollback

---

## 5. Ordem de execução

### Fase 1 — local
1. limpar build outputs
2. reorganizar docs
3. ajustar `.gitignore`
4. commitar

### Fase 2 — Supabase
1. inventário
2. marcar ativo/legado
3. snapshot
4. limpar itens mortos
5. documentar source of truth

### Fase 3 — Vercel
1. revisar projeto
2. revisar env vars
3. revisar build/deploy
4. limpar projetos/domínios mortos
5. documentar runtime source of truth

### Fase 4 — validação
- build
- smoke local
- deploy preview
- validação funcional

## Regra final
Primeiro organizar. Depois apagar. Nunca o contrário.
