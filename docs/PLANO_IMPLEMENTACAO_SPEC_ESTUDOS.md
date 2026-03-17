# Plano de Implementacao Incremental - SPEC Plataforma de Estudos

Data: 2026-03-16
Escopo: adaptar a base Zero Base existente para os contratos e modulos da SPEC, sem reescrita total.

## 1) Mapeamento do que ja existe

### Frontend (reuso direto)
- Dashboard: src/components/Dashboard/Dashboard.tsx, DashboardPage.tsx, cards/graficos de progresso, streak e ranking.
- Focus/Timer: src/components/Timer/StudyTimer.tsx e PomodoroTimer.tsx.
- Journey/Skill Tree: src/components/Dashboard/KnowledgeGenealogyTree.tsx com backend learning-graph.
- Planner semanal: src/components/Calendar/StudyScheduleCalendar.tsx.
- IA Tutor: src/components/AI/MentorIA.tsx.
- Auth: src/components/Auth/LoginForm.tsx e RegisterForm.tsx.

### Backend (reuso direto)
- Mentor IA e administracao: server/src/routes/mentor.routes.ts, admin.routes.ts.
- Learning graph e progresso por topico: server/src/routes/learningGraph.routes.ts.
- Middlewares de seguranca/infra: auth, rate-limit, request-id, circuit-breaker.

### Banco/Supabase (reuso direto)
- users, study_sessions, study_schedule, subjects.
- disciplinas, topicos, questoes, respostas_usuarios, progresso_topicos, user_learning_progress.
- funcoes RPC para questoes/simulados e recomendacao de proximo topico.

## 2) Tabela de decisao

### Reutilizar
- Timer, Dashboard, Skill Tree, Planner visual, Mentor IA.
- API learning-graph atual para base de skills.
- Tabelas de sessao/planner/questoes ja existentes.

### Refatorar
- Contratos de API para alinhar com a SPEC (subjects, skills/tree, sessions, planner, questions, stats).
- Mapeamento de campos (disciplina/topico -> subject/skill).
- Regras de XP e nivel para corresponder ao dominio da SPEC.

### Substituir (gradual)
- Endpoints legados dispersos por um facade unico compativel (nova camada em /api).
- Regra de status planner booleana para status triplos (PENDENTE/CONCLUIDO/FALTOU) com fallback sem quebrar tabela atual.

### Remover (nao agora)
- Duplicidades de endpoints apos migracao completa do frontend para os contratos da SPEC.
- Campos/aliases de compatibilidade, apenas quando o consumo antigo for desativado.

## 3) Status das fases do backlog

### Fase A - Fundacao
- [x] Mapeamento de base existente
- [~] Contratos base de API (subjects/skills/sessions/planner/questions/stats)
- [ ] Auth completo com refresh no backend proprio (hoje: auth via Supabase JWT)

### Fase B - Nucleo de estudo
- [x] Sessions start/finish com calculo de XP e streak no backend
- [x] Endpoints de stats today/week
- [ ] Dashboard frontend consumindo exclusivamente a nova API de compatibilidade

### Fase C - Aprendizagem guiada
- [x] Skills tree via endpoint dedicado
- [x] Usuarios skills GET/PATCH
- [~] Planner status triplo com adaptacao de armazenamento atual

### Fase D - IA e otimizacao
- [x] Planner generate com fallback deterministico
- [x] Microservico FastAPI para tutor/planner
- [x] Integracao backend -> FastAPI com retry/timeout/fallback
- [x] Filas BullMQ/Redis (stats/goals/skills) + workers base
- [x] Endpoint opcional de tutor: POST /api/ai/tutor/explain
- [x] Testes minimos de IA/planner/enqueue

### Fase E - Qualidade final
- [ ] Testes de integracao backend das rotas criticas
- [ ] Observabilidade por modulo (latencia, erro, uso IA)
- [ ] Hardening final de seguranca por rota

## 4) Riscos e compatibilidade
- A base nao usa Next.js e Prisma atualmente; usa React + Vite e Supabase.
- Foi aplicada estrategia de compatibilidade por contrato HTTP, preservando arquitetura existente.
- Algumas semanticas da SPEC (status planner triplo, mastery detalhada, IA planner real) foram aproximadas para evitar quebra imediata.

## 5) Proximos passos recomendados
1. Conectar o frontend gradualmente aos novos endpoints /api da SPEC.
2. Implementar refresh token proprio somente se houver necessidade de sair do auth Supabase nativo.
3. Evoluir workers para processamento real de consolidacao de stats/metas/mastery (hoje estao com pipeline base e logs).
4. Adicionar observabilidade de filas (tempo de execucao, taxa de falha e DLQ opcional).

## 6) Execucao local (Fase D)
1. Configurar env no backend:
	- AI_ENABLED=true
	- AI_SERVICE_URL=http://127.0.0.1:8001
	- AI_TIMEOUT_MS=5000
	- AI_MAX_RETRIES=3
	- REDIS_URL=redis://127.0.0.1:6379
	- QUEUES_ENABLED=true
	- QUEUE_WORKERS_ENABLED=true
2. Subir Redis (exemplo):
	- docker compose up -d
3. Subir AI Service:
	- cd ai-service
	- pip install -r requirements.txt
	- uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
4. Subir backend:
	- npm run mentor:server
5. Rodar testes backend da fase:
	- npm run test:server
