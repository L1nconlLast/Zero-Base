# 🚀 YPT App v2.0.0 — Production Ready

**Ranking · Grupos · Settings** — Aplicativo competitivo de estudo com 3 módulos integrados.

**Stack:** React 18 + Vite (frontend) · Node.js + Express (backend) · Supabase (banco, auth)  
**Status:** 🟢 Go-Live 17/03/2026

---

## 📦 O que é?

YPT (*Your Personal Tutor*) é uma plataforma de estudo competitiva que combina:

| Módulo | O que faz | Quem usa |
|--------|----------|---------|
| **Ranking** | Posição global/categoria, status "agora estudando", snapshot diário/semanal/mensal | Qualquer usuário |
| **Grupos** | Estudar em equipes, criar/entrar/sair, seguir missões, ver stats agregadas | Grupos de amigos, colégios |
| **Settings** | Cronograma semanal, Pomodoro, D-Day, meta de tempo, temas | Cada usuário individualmente |

---

## 🚀 Quick Start

### Backend

```bash
cd server/

# 1. Variáveis de ambiente
cp .env.example .env
# Preencha: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WORKER_SECRET, FRONTEND_URL

# 2. Instale
npm install

# 3. Migrations SQL (em Supabase console ou via CLI)
npx supabase migration up

# 4. Rode
npm run dev
# Servidor em http://localhost:3001
```

### Frontend

```bash
cd ...

# 1. Variáveis de ambiente
cp .env.example .env
# Preencha: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# 2. Instale
npm install

# 3. Rode
npm run dev
# App em http://localhost:5173
```

---

## 📊 Arquitetura

```
┌─────────────────────────────────────────────┐
│         Frontend (React/Vite)                 │
│  ┌──────────┬──────────┬─────────────┐      │
│  │ Ranking  │  Grupos  │  Settings  │      │
│  └──────────┴──────────┴─────────────┘      │
└────────────────────┬────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────┐
│      Backend (Node.js/Express)              │
│  /api/ranking/*                             │
│  /api/groups/*                              │
│  /api/settings/*                            │
│  + Worker (cron: ranking snapshot)          │
└────────────────────┬────────────────────────┘
                     │ PostgreSQL
┌────────────────────▼────────────────────────┐
│  Supabase (PostgreSQL + Auth + Storage)     │
│  • study_sessions_ranking                   │
│  • study_groups, group_members              │
│  • user_settings, user_study_schedule       │
│  • RLS policies (isolação por tenant)       │
└─────────────────────────────────────────────┘
```

---

## 📚 API Endpoints

### 🏆 Ranking

```bash
# Pública
GET    /api/ranking                          # Lista geral + top3
GET    /api/ranking/now-studying             # Count estudando agora

# Autenticada
POST   /api/ranking/sessions/start           # Inicia estudo
POST   /api/ranking/sessions/end             # Encerra estudo (valida anti-abuse)
GET    /api/ranking/me                       # Meu ranking + percentil (rate limited 1/10s)

# Worker (X-Worker-Secret)
POST   /api/ranking/recalculate              # Recalcula snapshots (RPC)
```

**Query Params:**
- `period`: daily | weekly | monthly
- `category`: REP-ENEM | EM3-ENEM | REP-ITA/IME | Graduação | Outros
- `page`, `limit`: paginação (max limit 100)

---

### ⚙️ Settings

```bash
# Config do usuário
GET    /api/settings                         # Retorna settings + defaults
PATCH  /api/settings                         # Atualiza qualquer campo

# Cronograma semanal
GET    /api/settings/schedule                # Lista horários
POST   /api/settings/schedule                # Adiciona horário
PATCH  /api/settings/schedule/:id            # Edita horário
DELETE /api/settings/schedule/:id            # Remove horário

# Destrutivo (rate limited 3/min)
POST   /api/settings/reset-data              # Apaga histórico (confirmação obrigatória)
```

---

### 👥 Grupos

```bash
# Pública
GET    /api/groups                           # Lista grupos (filtrada + paginada)
GET    /api/groups/:id                       # Detalhes + membros
GET    /api/groups/:id/stats                 # Stats agregadas

# Autenticada
POST   /api/groups                           # Criar grupo (rate limited 1/min)
PATCH  /api/groups/:id                       # Editar (líder/admin only)
POST   /api/groups/:id/join                  # Entrar (RPC atomicamente)
POST   /api/groups/:id/leave                 # Sair
GET    /api/groups/:id/missions              # Missões da semana
POST   /api/groups/:id/missions/:mid/progress # Atualizar progresso
```

---

## 🗄️ Banco de Dados

### Tabelas Principais

| Tabela | Descrição | Rows esperadas |
|--------|-----------|-----------------|
| `study_sessions_ranking` | Sessions finalizadas (histórico) | 5M+ (1 ano) |
| `active_study_sessions` | Usuários estudando agora | 0-10k |
| `ranking_snapshots` | Snapshots pre-calc (diário/sem/mês) | 50k+ (1 ano) |
| `study_groups` | Grupos de estudo | 10k+ |
| `group_members` | Membros por grupo | 200k+ |
| `group_sessions` | Sessões dentro de grupos | 1M+ (1 ano) |
| `user_settings` | Configurações do usuário | Numausuários |
| `user_study_schedule` | Cronogramas | 3x Numausuários (média 3 horários/mês) |

### Índices Críticos

- `idx_session_user_date` — rápido acumulo diário
- `idx_group_members_group` — membros por grupo
- `idx_group_sessions_group` — stats do grupo
- `idx_schedule_user_dow` — buscar horários por dia da semana

Ver: `supabase/migrations/*`

---

## 🔐 Segurança

### RLS (Row Level Security)

Todas as tabelas de dados pessoais têm RLS habilitado:
- ✅ `user_settings` → own only
- ✅ `user_study_schedule` → own only
- ✅ `study_sessions_ranking` → own only
- ✅ `group_members` → filtro group + status
- ✅ `group_mission_progress` → own or group member

### Testes de Autorização

```bash
npm run test:server -- authorization.cross-tenant
# Valida que User A NÃO consegue ver/mexer dados de User B
```

### Anti-abuse

- ✅ Sessão contínua > 9h = ineligível para ranking
- ✅ Acumulo > 20h/dia = ineligível para ranking
- ✅ Criar grupo: 1/min por usuário
- ✅ Reset data: 3/min por usuário
- ✅ GET /api/ranking/me: 1/10s por usuário

---

## 🧪 Testes

### Backend

```bash
# Integração (ranking, settings, groups, autorização)
npm run test:server

# Com watch
npm run test:server:watch

# Coverage
npm run test:coverage
```

### E2E (Playwright)

```bash
# Rodar E2E
npm run e2e

# Modo headed (browser visível)
npx playwright test --headed

# Apenas um teste
npx playwright test e2e/e2e-ypt-golive.spec.ts -g "Ranking.*alterar período"
```

**Testes cobrem:**
- ✅ Navegação entre abas
- ✅ Settings (tema, cronograma, D-Day, reset)
- ✅ Grupos (criar, filtrar, entrar/sair)
- ✅ Ranking (períodos, filtros, top3)
- ✅ Responsividade (mobile/desktop)
- ✅ Error handling

---

## 📊 Performance

### Latência Target (p95)

| Endpoint | Target | Observação |
|----------|--------|-----------|
| `GET /api/ranking` | <200ms | Com índices |
| `GET /api/ranking/me` | <100ms | Sem DB aggregation |
| `POST /api/ranking/sessions/end` | <300ms | Valida accumulo |
| `POST /api/groups/:id/join` | <200ms | RPC atomicamente |
| `GET /api/groups` | <300ms | Com pagination |
| `GET /api/settings` | <50ms | Direct SELECT |

### Benchmark (Local)

```bash
npm run benchmark
# Simula 100 CCU, 1000 requests por endpoint
```

---

## 📈 Monitoring & Observability

### Health Checks

```bash
curl http://localhost:3001/api/health
# { "ok": true, "requestId": "...", "timestamp": "..." }

curl http://localhost:3001/api/health/ready
# { "ok": true, "db": "connected", "timestamp": "..." }

curl http://localhost:3001/api/metrics
# { "requests": 5241, "errors": 2, "latencyMs": { "p50": 45, "p95": 234 } }
```

### Logs Estruturados

Todos os logs são JSON com `feature`, `event`, `userId`, `requestId`:

```json
{
  "timestamp": "2026-03-17T14:30:45.123Z",
  "level": "info",
  "message": "request.completed",
  "feature": "ranking",
  "event": "ranking.session.end",
  "userId": "xxxxxxxx-...",
  "requestId": "req-...",
  "statusCode": 200,
  "durationMs": 145
}
```

---

## 🚀 Deployment

### Pre-deploy

```bash
# Build
npm run build
npm run lint
npm run typecheck

# Testes
npm run test:server
npm run e2e
```

### Deploy

Ver [RUNBOOK_GOLIVE.md](./RUNBOOK_GOLIVE.md) para instrução completa.

**Deploy options:**
- Vercel (recomendado para frontend)
- Railway / Render (Node.js)
- AWS ECS / Lambda (escalabilidade)
- Supabase (gerenciado)

---

## 🐛 Conhecidos Issues

Ver [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)

**TL;DR principais:**
- Session anti-abuse pode rejeitar usuários maratona (workaround: design futuro)
- Race condition rara em join grupo (< 1%, já mitigado com RPC)
- Snapshot ranking pode ficar stale 24h se falha (retry + manual trigger)

---

## 📞 Suporte

### Documentação

- [API Collection (Postman)](./YPT_App_GoLive.postman_collection.json) — importar no Postman
- [E2E Tests](./tests/e2e-ypt-golive.spec.ts) — fluxos recomendados
- [RUNBOOK Go-Live](./RUNBOOK_GOLIVE.md) — deployment + rollback
- [Known Issues](./KNOWN_ISSUES.md) — limitações + mitigações

### Contato

- **Bugs:** GitHub Issues
- **Features:** Backlog / Sprint planning
- **On-call:** incident-response@team.dev

---

## 📋 Checklist Final (Pre-launch)

- [ ] Migrations aplicadas (`npx supabase migration up`)
- [ ] Env vars configuradas (backend + frontend)
- [ ] Build OK (`npm run build`)
- [ ] Testes OK (`npm run test:server && npm run e2e`)
- [ ] Health check respondendo
- [ ] Ranking calculador rodando
- [ ] RLS policies validadas no Supabase
- [ ] Backups agendados
- [ ] Monitoring configurado
- [ ] Runbook e docs revisados

---

## 📦 Versão

- **Versão App:** 2.0.0
- **Versão API:** 1.0.0
- **Node.js:** 18.16+
- **React:** 18.2+
- **Supabase:** Latest

---

**Status:** 🟢 **PRODUCTION-READY**  
**Go-Live:** 17 de Março de 2026  
**Owner:** Engineering Team
