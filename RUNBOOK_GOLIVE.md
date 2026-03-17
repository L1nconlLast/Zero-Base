# 🚀 YPT App — Go-Live Checklist & Runbook

**Status:** 🟢 PRODUCTION-READY  
**Data:** 17 de Março de 2026  
**Versão:** 2.0.0  

---

## 📋 PRE-DEPLOY CHECKLIST

### ✅ Backend
- [ ] Todas as migrations aplicadas em ordem:
  - `001_ranking_global.sql`
  - `002_settings.sql`
  - `003_groups.sql`
  - `20260317000001_ypt_settings_groups_integration.sql` (atomicity + indices)
- [ ] Variáveis ambiente configuradas:
  ```env
  SUPABASE_URL=...
  SUPABASE_SERVICE_ROLE_KEY=...
  WORKER_SECRET=<seu-secret-seguro>
  ENABLE_WORKER=true
  FRONTEND_URL=https://yourdomain.com
  NODE_ENV=production
  ```
- [ ] `npm run build` ✅ sem erros
- [ ] `npm run test:server` ✅ passando
- [ ] RLS policies aplicadas (validar em Supabase console)
- [ ] Índices criados (EXPLAIN ANALYZE nas queries principais)

### ✅ Frontend
- [ ] `npm run build` ✅ sem erros
- [ ] `npm run lint` ✅ passando
- [ ] E2E com `npm run e2e` ✅ passando
- [ ] Temas funcionando (light/dark/system)
- [ ] Responsividade testada (mobile, tablet, desktop)

### ✅ Banco de Dados (Supabase)
- [ ] Backups agendados (daily)
- [ ] Point-in-time recovery habilitado
- [ ] Replica read para alta disponibilidade (se upscaled)
- [ ] WAL (Write-Ahead Logging) habilitado

### ✅ Segurança
- [ ] `WORKER_SECRET` não em repositório (apenas em CI/CD secrets)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` não em repositório
- [ ] CORS configurado apenas para domínio de produção
- [ ] Helmet headers habilitados
- [ ] Rate limits ativados em endpoints sensíveis
- [ ] Testes de autorização cruzada passando (User A ≠ User B)

### ✅ Observabilidade
- [ ] Logs estruturados (JSON) configurados
- [ ] Exception tracking (Sentry, etc.) opcional
- [ ] `/api/health` acessível
- [ ] `/api/health/ready` retornando ok
- [ ] `/api/metrics` respondendo

### ✅ Documentação
- [ ] README.md atualizado
- [ ] API Collection (Postman) gerada ✅
- [ ] E2E relatório gerado
- [ ] KNOWN_ISSUES.md documentado

---

## 🚀 DEPLOYMENT

### 1. Supabase Migrations
```bash
# Via CLI
npx supabase migration up

# Ou manual via SQL Editor no console supabase.com
```

### 2. Backend (Node.js)

#### Opção A: Vercel / Railway / Heroku
```bash
git push

# Variáveis ambiente configuradas no painel
# Deployment automático
```

#### Opção B: VPS (auto-managed)
```bash
# SSH into server
ssh user@your-server

# Clone/Pull latest
cd /app/ypt-backend
git pull origin main

# Install e build
npm install
npm run build

# Start with PM2
pm2 start "npm run start" --name ypt-backend
pm2 save
```

### 3. Frontend (React + Vite)

#### Opção A: Vercel
```bash
vercel deploy --prod

# Ou: git push → auto-deploy
```

#### Opção B: S3 + CloudFront / Netlify
```bash
npm run build
# dist/ → upload para storage estático
```

---

## ✅ POS-DEPLOY VALIDATION

### 1. Health Checks
```bash
curl https://api.yourdomain.com/api/health
# { "ok": true, "requestId": "...", "timestamp": "..." }

curl https://api.yourdomain.com/api/health/ready
# { "ok": true, "db": "connected", ... }
```

### 2. API Endpoints
```bash
# Test sem auth (publicly available)
curl https://api.yourdomain.com/api/ranking
curl https://api.yourdomain.com/api/ranking/now-studying
curl https://api.yourdomain.com/api/groups?page=1&limit=10

# Test com auth
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.yourdomain.com/api/ranking/me
```

### 3. Database
```sql
-- No Supabase SQL editor
SELECT COUNT(*) FROM study_sessions_ranking;
SELECT COUNT(*) FROM active_study_sessions;
SELECT COUNT(*) FROM study_groups;
SELECT COUNT(*) FROM user_settings;

-- Validate RLS
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'study_%' OR tablename LIKE 'user_%';
```

### 4. Worker
```bash
# Check se scheduler está rodando
curl -H "x-worker-secret: YOUR_SECRET" \
  -X POST https://api.yourdomain.com/api/ranking/recalculate \
  -H "Content-Type: application/json" \
  -d '{"period": "daily"}'

# Response: { "rows": 5000, "durationMs": 850, ... }

# Logs: tail -f /var/log/ypt-backend/ranking-scheduler.log
```

### 5. Frontend
- [ ] Página carrega sem erro (dev console)
- [ ] Navegação funciona (Ranking, Grupos, Settings)
- [ ] Temas persistem (alterar e refresh)
- [ ] Cronograma salva/edita/deleta ok
- [ ] Criar grupo funciona
- [ ] Filtrar grupos funciona
- [ ] Entrar/sair grupo funciona

---

## 🔄 ROLLBACK

### Cenário A: Bug no backend
```bash
# Verificar commit anterior
git log --oneline | head -5

# Rollback
git revert HEAD
git push

# Ou, com PM2
pm2 restart ypt-backend
pm2 logs ypt-backend
```

### Cenário B: Bug no SQL (migration)
```bash
# Em Supabase: criar downgrade migration
# create file: supabase/migrations/20260317000002_rollback_ypt_integration.sql

-- Downgrade SQL: DROP triggers, revert tabelas, etc.
DROP TRIGGER IF EXISTS ...;
DROP FUNCTION IF EXISTS ...;

-- Aplicar
npx supabase migration up
```

### Cenário C: Bug no frontend
```bash
# Redeploy versão anterior
vercel deploy --prod --token YOUR_TOKEN

# Ou manual: revert dist/ e reupload
```

### Cenário D: Data Corruption
```bash
# Supabase: Point-in-time recovery
# 1. Go to Supabase Dashboard
# 2. Settings → Backups
# 3. Restore to timestamp (antes do erro)
# ⚠️ Perderá dados posteriores!
```

---

## 📊 PERFORMANCE BASELINE

| Métrica | Target | Observação |
|---------|--------|-----------|
| `GET /api/ranking` | <200ms (p95) | Com índices |
| `POST /api/ranking/sessions/end` | <300ms (p95) | Inclui validação daily accumulo |
| `GET /api/ranking/me` | <100ms (p95) | Cached quando possível |
| `POST /api/groups` | <400ms (p95) | Inclui criação leader entry |
| `POST /api/groups/:id/join` | <200ms (p95) | RPC atomicidade |
| Snapshot recalc (5000 users) | <2s | Diário em off-peak |

---

## 🐛 KNOWN ISSUES & MITIGATIONS

Ver [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)

---

## 📞 SUPORTE & ESCALATION

### Erro: "Database connection failed"
```
Causa: Variável SUPABASE_URL ou SERVICE_ROLE_KEY incorreta
Fix: Verificar console Supabase → Settings → API
```

### Erro: "Unauthorized" em sessão válida
```
Causa: JWT expirando, ou timezone mismatch
Fix: Regenerar token, sincronizar NTP no servidor
```

### Erro: "Max members exceeded" quando limite não atingido
```
Causa: Race condition no join (concorrência)
Fix: Usar RPC join_group_atomic (já implementado)
```

### Erro: "Snapshot recalc timeout"
```
Causa: Muitos usuários, índices faltando
Fix: Verificar índices, rodar VACUUM ANALYZE em off-peak
```

---

## 📈 MONITORING

### Recomendado: Honeycomb / DataDog / New Relic
```bash
# Enviar logs estruturados
# Logger já emite JSON, configurar forwarder

# Exemplo: Honeycomb
HONEYCOMB_KEY=... npm run start
```

### Métricas chave
- Taxa de erro (5xx / total requests) → alerta > 1%
- Latência p95 dos endpoints → alerta > 500ms
- Database connection pool utilization → alerta > 80%
- Worker job duration (snapshot recalc) → alerta > 5s
- Active study sessions count → trending

---

## ✅ POST-GO-LIVE (24-72h)

- [ ] Monitorar logs por erros recorrentes
- [ ] Validar taxa de conversão de usuários
- [ ] Confirmar que workers rodando sem erro
- [ ] Backup teste (PITR) bem-sucedido
- [ ] Load test leve (10-20% traffic)
- [ ] Confirmar alertas configurados

---

## 📚 Referências

- [API Collection Postman](./YPT_App_GoLive.postman_collection.json)
- [README.md](./README.md)
- [E2E Results](./tests/e2e-ypt-golive.spec.ts)
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
- [Supabase Docs](https://supabase.com/docs)

---

**Versão Documento:** v1.0  
**Ultimo Update:** 17/03/2026  
**Mantém por:** DevOps Team
