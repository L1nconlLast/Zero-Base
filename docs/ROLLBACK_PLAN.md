# Rollback Plan

## Aplicacao

1. Reapontar para a release/container anterior.
2. Validar /health e smoke tests basicos.
3. Monitorar por 15 min antes de encerrar incidente.

## Schema

- Priorizar estrategia expand/contract.
- Cada migration deve ter plano de reversao manual ou compensacao.
- Evitar rollback destrutivo em dados vivos sem backup confirmado.

## Feature flags

- AI_ENABLED=false para desligar IA.
- JOBS_ENABLED=false para desligar filas.
- CACHE_ENABLED=false para remover dependencia de cache.

## Ordem de rollback recomendada

1. Desligar feature flag do componente degradado.
2. Rollback da release da aplicacao.
3. Somente se necessario, compensacao/rollback de schema.