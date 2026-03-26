# Deploy Staging e Producao

## Ambientes

- dev: execucao local.
- staging: branch develop ou workflow manual com target staging.
- prod: branch main com aprovacao manual.

## Ordem recomendada

1. npm ci
2. npm run lint
3. npm run typecheck
4. npm run test:server
5. npm run test
6. npm run build
7. Aplicar migrations em staging
8. Deploy web/api/ai-service em staging
9. Rodar smoke tests
10. Backup antes de prod
11. Deploy prod com aprovacao manual
12. Smoke tests prod

## Targets

- Web: Vercel
- API: Railway ou ECS Fargate
- AI Service: Railway ou ECS Fargate
- DB: Supabase/Postgres gerenciado
- Redis: Upstash/Elasticache

## Smoke tests minimos

- Web abre landing/dashboard.
- API responde /health e /health/ready.
- Fluxo /api/subjects.
- Fluxo /api/planner/week autenticado.
- Fluxo /api/sessions/start -> finish.

## Pos-deploy web/admin

- Para deploy manual da web em prod, usar `npm run deploy:prod`.
- Depois do deploy, rodar o checklist de validacao em `docs/CHECKLIST_POS_DEPLOY_VERCEL.md`.
- Esse checklist cobre:
  - produto publicado
  - fluxo `Estudo`
  - area `Dados`/admin
  - liberacao via `?internal=1`
  - reset do modo interno

## Observacao

O workflow .github/workflows/deploy-staging-prod.yml usa secrets opcionais; sem credenciais configuradas, o deploy deve ser executado manualmente conforme este guia.
