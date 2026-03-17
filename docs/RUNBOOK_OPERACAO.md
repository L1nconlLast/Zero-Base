# Runbook de Operacao

## Objetivo

Operar o Zero Base em dev, staging e producao sem quebrar os contratos da SPEC em /api.

## Servicos

- Web: Vite/React publicado na Vercel.
- API: Node/Express com rotas compat em /api.
- AI Service: FastAPI separado.
- Banco: Supabase/Postgres gerenciado.
- Redis: Upstash/Elasticache/Railway Redis.

## Comandos locais

- npm run dev
- npm run mentor:server
- npm run test:server
- npm run test
- npm run build

## Sinais de saude

- GET /health: liveness da API.
- GET /health/ready: readiness de db, redis e ai-service.
- GET /metrics: requests, latencia, IA e jobs.

## Operacao diaria

1. Verificar health e ready da API.
2. Conferir erros 5xx e latencia p95.
3. Conferir filas BullMQ e fallback da IA.
4. Conferir logs estruturados por requestId.

## Feature flags operacionais

- AI_ENABLED
- JOBS_ENABLED
- CACHE_ENABLED

## Escalonamento

- Erro 5xx persistente: desabilitar IA e cache, validar db/redis, iniciar rollback se necessario.
- Fila acumulando: desligar JOBS_ENABLED, reprocessar apos estabilizacao.