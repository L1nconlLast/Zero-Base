# Observabilidade

## Logs

Formato JSON com:

- timestamp
- level
- message
- requestId
- userId
- route
- latencyMs

## Endpoints

- /health
- /health/ready
- /metrics

## Sentry

- Web: usar SENTRY_DSN_WEB ou SENTRY_DSN.
- API: usar SENTRY_DSN_API ou SENTRY_DSN.
- AI Service: usar SENTRY_DSN_AI.

## Metricas observadas

- requests por rota/classe de status
- latencia media/p95/max por rota
- eventos IA: success/error/timeout/fallback
- jobs: enqueued/processed/failed

## Alertas recomendados

- erro 5xx acima do limite
- p95 acima do SLA
- fallback de IA acima do baseline
- fila acumulando/falhando