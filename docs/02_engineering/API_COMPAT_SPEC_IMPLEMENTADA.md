# API de Compatibilidade da SPEC - Implementada no Backend Atual

Base URL: /api
Autenticacao: Bearer JWT Supabase nas rotas de usuario.

## Subjects/Skills
- GET /subjects
  - descricao: lista subjects a partir de disciplinas do learning graph.
- GET /skills/tree?subjectId=UUID
  - descricao: retorna grafo de skills por subject, com progresso quando autenticado.
- GET /users/me/skills?subjectId=UUID(opcional)
  - auth: obrigatorio
  - descricao: progresso de skills do usuario.
- PATCH /users/me/skills/:skillId
  - auth: obrigatorio
  - body: progress(0-100) ou masteryLevel(baixo|medio|alto), lastStudied(opcional)

## Sessions (Timer)
- POST /sessions/start
  - auth: obrigatorio
  - body: subjectId, skillId(opcional), startTime(ISO)
  - output: sessionId
- POST /sessions/:id/finish
  - auth: obrigatorio
  - body: endTime(ISO), questionsDone(opcional), correctAnswers(opcional)
  - output: duration, xpGained, newLevel, streak

Regras aplicadas:
- XP = minutos de sessao + (5 x respostas corretas)
- Nivel:
  - 0-1000 INICIANTE
  - 1001-3000 ESTUDANTE
  - 3001-8000 FOCADO
  - 8001+ MESTRE
- Streak:
  - incrementa em dias consecutivos
  - mantem no mesmo dia
  - reinicia para 1 se pular dia(s)

## Planner
- GET /planner/week?start=YYYY-MM-DD
  - auth: obrigatorio
  - output: itens da semana com status PENDENTE|CONCLUIDO|FALTOU
- POST /planner/generate
  - body: availableHoursPerDay[7], goals[], weakSkills[] opcional, examDate opcional
  - output: weeklyPlan [{ date, subject, skill, durationMin }]
  - comportamento: usa IA quando AI_ENABLED=true; fallback local seguro quando IA indisponivel
- PATCH /planner/:id/status
  - auth: obrigatorio
  - body: status = PENDENTE|CONCLUIDO|FALTOU

## IA
- POST /ai/tutor/explain
  - body: topic, context, userLevel
  - output: explanation, practicalExample, exercise, answerGuide
  - comportamento: usa IA quando AI_ENABLED=true; fallback local seguro quando IA indisponivel

## Questions/Answers
- GET /questions?subjectId=&skillId=&difficulty=
- POST /answers
  - auth: obrigatorio
  - body: questionId, isCorrect, timeSpentSec(opcional)
  - output: impacto em skill (accuracy, masteryLevel)

## Stats
- GET /stats/today
  - auth: obrigatorio
- GET /stats/week
  - auth: obrigatorio
- GET /stats/accuracy-by-subject
  - auth: obrigatorio
- GET /stats/skills-weakness
  - auth: obrigatorio

## Filas assíncronas (BullMQ + Redis)
- Filas:
  - stats:rebuild
  - goals:recalculate
  - skills:updateMastery
- Triggers:
  - finalizar sessão (/sessions/:id/finish)
  - registrar resposta (/answers)
  - atualizar planner (/planner/:id/status)
- Workers:
  - inicialização opcional via QUEUE_WORKERS_ENABLED=true

## Hardening e Go-Live
- Health:
  - GET /health
  - GET /health/ready
- Observabilidade:
  - GET /metrics
  - logs JSON com requestId e latência
- Segurança:
  - Helmet ativo
  - CORS por allowlist via CORS_ALLOWED_ORIGINS
  - erros padronizados: `{ error: { code, message, details?, requestId } }`
  - rate limit dedicado em IA e planner generate
- Cache:
  - Redis opcional via CACHE_ENABLED
  - TTL curto em `/api/skills/tree` e `/api/stats/week`
- Deploy:
  - workflow de staging/prod em `.github/workflows/deploy-staging-prod.yml`

## Variáveis de ambiente novas
- AI_ENABLED=true|false
- AI_SERVICE_URL=http://127.0.0.1:8001
- AI_TIMEOUT_MS=5000
- AI_MAX_RETRIES=3
- REDIS_URL=redis://127.0.0.1:6379
- QUEUES_ENABLED=true|false
- QUEUE_WORKERS_ENABLED=true|false

## Rodar local (Fase D)
1. Redis:
  - docker compose up -d
2. AI Service:
  - cd ai-service
  - pip install -r requirements.txt
  - uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
3. Backend:
  - npm run mentor:server
4. Testes backend da Fase D:
  - npm run test:server

## Observacoes de compatibilidade
- Mantem backend atual (Express + Supabase) sem migracao forçada para Prisma.
- Nomes da SPEC foram mapeados para tabelas existentes (disciplinas/topicos/questoes).
- Rotas existentes de learning-graph continuam ativas.
