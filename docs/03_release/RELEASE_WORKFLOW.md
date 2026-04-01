# Release Workflow (padrão)

Fluxo padrao para publicar versoes com rastreabilidade e baixo risco.

## 1) Branch e escopo

- Branch de trabalho: `feature/*`, `fix/*` ou `chore/*`
- Escopo pequeno e com objetivo unico por PR
- Sem misturar refactor amplo com bugfix de producao

## 2) Validacao minima antes do merge

Execute:

```bash
npm run typecheck
npm run test:client
npm run build
```

Se a entrega afetar fluxo principal, rode smoke relevante (ex.: `17/17`).

## 3) PR com contexto claro

Todo PR deve conter:

- problema
- solucao
- risco
- evidencias (teste/build/smoke)
- plano de rollback

Use o template em `.github/pull_request_template.md`.

## 4) Merge e versionamento

SemVer adotado:

- `MAJOR`: quebra de compatibilidade
- `MINOR`: feature nova compativel
- `PATCH`: correcao sem quebra

Formato de tag:

- `vMAJOR.MINOR.PATCH`
- exemplo: `v2.2.0`

## 5) Changelog

Atualize `CHANGELOG.md` no topo com:

- versao
- data
- secoes: `Added`, `Changed`, `Fixed`, `Removed`
- impacto em usuario e operacao

## 6) Publicacao da tag

```bash
git checkout main
git pull origin main
git tag -a vX.Y.Z -m "release: vX.Y.Z"
git push origin main --tags
```

## 7) Pos-release

- validar endpoint/app em producao
- validar logs e erros criticos
- confirmar fluxo principal em smoke rapido
- registrar incidente caso algo degrade

## 8) Rollback rapido

```bash
git checkout main
git revert <hash_do_commit_problematico>
git push origin main
```

Se necessario, documentar incidente em `docs/03_release/RUNBOOK_INCIDENTES.md`.
