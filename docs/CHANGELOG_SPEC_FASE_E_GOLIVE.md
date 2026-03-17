# Changelog SPEC Fase E + Go-Live

## Backend hardening

- Helmet e CORS por allowlist.
- requestId global e request logging estruturado.
- /health/ready e /metrics.
- padronizacao de erro para rotas principais da SPEC.
- rate limit dedicado para IA e planner generate.
- validacao de env critica no startup.

## Observabilidade

- logger JSON com requestId, userId, route e latency.
- metricas in-memory para requests, IA e jobs.
- integracao opcional com Sentry para API e ai-service.

## Performance e estabilidade

- cache Redis opcional para /api/skills/tree e /api/stats/week.
- invalidação basica em sessoes, respostas e progresso.
- BullMQ com jobId idempotente e retry/backoff.
- migracao de indices alinhada ao schema real.

## Testes e CI

- unitarios para dominio de XP/streak/stats.
- integracao start -> finish.
- snapshots de contrato da SPEC.
- CI com lint, typecheck, test:server, test e build.

## Go-Live

- workflow de staging/producao.
- runbooks de operacao, incidentes, backup e rollback.