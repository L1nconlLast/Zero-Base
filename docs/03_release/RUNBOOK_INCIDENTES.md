# Runbook de Incidentes

## Severidade

- Sev1: indisponibilidade total da API/web.
- Sev2: degradação forte em IA, planner ou sessoes.
- Sev3: problema localizado com workaround.

## Fluxo rapido

1. Confirmar impacto com /health, /health/ready e /metrics.
2. Isolar componente: web, api, ai-service, db ou redis.
3. Aplicar feature flag defensiva:
   - AI_ENABLED=false
   - JOBS_ENABLED=false
   - CACHE_ENABLED=false
4. Se nao estabilizar, executar rollback da aplicacao.
5. Se schema for fator causal, seguir plano de rollback por migration.

## Checklists por falha

### API 5xx
- Revisar logs por requestId.
- Conferir readiness de db/redis/ai.
- Validar ultima release e smoke test.

### IA instavel
- Observar timeouts, fallbacks e 429.
- Desligar AI_ENABLED se necessario.
- Validar /health do ai-service.

### Redis/filas
- Validar ping/readiness.
- Observar acumulacao de jobs e retries.
- Desligar JOBS_ENABLED se necessario.

### Banco
- Verificar migrations recentes.
- Conferir lock, latencia e restore point.

## Pos-incidente

1. Registrar timeline.
2. Guardar requestIds relevantes.
3. Documentar causa raiz e acao corretiva.