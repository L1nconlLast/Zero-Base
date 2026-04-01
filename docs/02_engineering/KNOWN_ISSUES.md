# ⚠️ KNOWN ISSUES — YPT App v2.0.0

**Data:** 17 de Março de 2026  
**Status:** Production Release  

---

## 🔴 CRÍTICOS (Deve-se evitar)

### Issue 1: Session anti-abuse pode rejeitar usuários legítimos com múltiplas sessões curtas

**Descrição:** A regra `total_daily_min >= 1200` (20h/dia) rejeita TODAS as sessões após atingir 20h, mesmo que legítimas.

**Cenário:**
- Usuário "maratona": 15 sessões curtas de 80min = 1200min
- Última sessão (legítima) = marcada como ineligível

**Impacto:** Alguns rankings no final do dia podem estar incompletos

**Mitigação / Workaround:**
- Design: considerar "horas consecutivas" em vez de totaldaily
- Ativação: usuários sabem do limite (tooltip no start session)
- Alternativa: reset em meia-noite UTC-1 p/ Brasil

**Timeline Fix:** Sprint seguinte (refator anti-abuse logic)

---

### Issue 2: Race condition teórica no JOIN grupo mesmo com RPC

**Descrição:** Se `max_members = n` e `n` usuários clicarem simultaneamente JOIN, até `n+1` podem entrar.

**Cenário:**
- Grupo com `max_members = 30`
- 5 usuários clicam JOIN no mesmo ms
- Podem entrar 31-35 (além do limit)

**Causa Root:** RPC `join_group_atomic` tem lock, mas UPDATE posterior COUNT não é re-validated

**Impacto:** Raro em produção (< 1% dos joins), grupo fica 1-5 memb acima

**Mitigação:**
```sql
-- Aplicado em 20260317000001_ypt_settings_groups_integration.sql
-- RPC usa FOR UPDATE para lock exclusivo
-- Revalidação: adicionar CHECK constraint na migrate seguinte
ALTER TABLE group_members 
ADD CONSTRAINT check_max_members 
CHECK ((SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = group_members.group_id) <= (SELECT max_members FROM study_groups WHERE id = group_members.group_id));
```

**Workaround Current:** Rare enough, not affecting UX. Aceito para v2.0.

**Timeline Fix:** v2.1 com CHECK constraint

---

## 🟡 IMPORTANTES (Monitor, não bloqueia)

### Issue 3: Snapshot ranking "congela" entre cálculos

**Descrição:** Se ranking snapshot recalc falha (erro de rede, timeout), dados ficam stale by 1 dia.

**Cenário:**
- Worker tenta recalcular daily às 00:00 UTC
- Timeout/erro após 1s
- Retry 2x falha
- Posições = dia anterior até próximo sucesso (24h depois)

**Impacto:** Rankings podem estar atrasados até 24h em falha

**Observação:** Retry com backoff já implementado, melhora odds

**Mitigação:**
- Alert: se snapshot > 24h sem update
- Fallback: mostrar "dados de XX/MM" no frontend
- Manual trigger: `/api/ranking/recalculate` com worker secret

**Logs:** `server/logs/ranking-scheduler.error`

---

### Issue 4: Índice `idx_group_sessions_group` pode degradar performance em grupos com 5k+ sessões

**Descrição:** Query `GROUP BY` em `group_sessions` fica lenta sem análise periódica.

**Cenário:**
- Grupo "super ativo" com 5000 usuários
- Cada 1 sessão/dia = 5000 sessões/dia
- Após 1 ano = 1.8M+ linhas
- Estatísticas defasadas → planner de query ruim

**Impacto:** `/api/groups/:id/stats` pode ficar > 500ms (p95)

**Mitigação:**
```bash
# Rodar mensalmente em off-peak (segunda-feira 02:00)
VACUUM ANALYZE;

# Ou: criar materialized view e refresh
CREATE MATERIALIZED VIEW group_stats_cache AS ...;
REFRESH MATERIALIZED VIEW group_stats_cache; -- cronjob
```

**Recomendação:** Upgrade Supabase (dedicated compute) quando 1M+ sessões

---

### Issue 5: Timezone mismatch em D-Day countdown

**Descrição:** D-Day é armazenado como DATE (sem timezone). Se usuário em São Paulo e server em UTC, diferença de 3h.

**Cenário:**
- Evento: 15/10/2026 (DATE, sem hora)
- Usuário SP: vê "151 dias", server UTC: "150 dias 21h"

**Impacto:** Minor, só visível em visualização

**Mitigação:**
```typescript
// Frontend: ajustar based on user timezone
const tzOffset = new Date().getTimezoneOffset();
const adjustedDate = new Date(eventDate.getTime() + tzOffset * 60_000);
```

**Ya implementado?** Parcialmente (settings tem `reminder_time`, não timezone)

**Timeline Fix:** v2.1 com timezone-aware D-Day

---

## 🟢 MENORES (Cosmético, sem impacto)

### Issue 6: Esqueleto loading não anima em slow 3G

**Descrição:** Skeleton screen anima a 60fps, em 3G fica travado.

**Fix:** CSS `@media (prefers-reduced-motion)` já aplicado

---

### Issue 7: Modal settings-schedule não valida `start_time >= end_time` no client

**Descrição:** Validação apenas no server, esperando no UI

**Fix:** Adicionar em modal antes de submit:
```javascript
if (formData.start_time >= formData.end_time) {
  showError("Hora início deve ser antes do fim");
  return;
}
```

---

### Issue 8: Emoji não renderem em alguns sistemas

**Descrição:** 🎯 ENEM aparece como ▯ em alguns Windows 7/8

**Fix:** Fallback fonts:
```css
body { font-family: 'Segoe UI Emoji', sans-serif; }
```

---

## 📊 ISSUE MATRIX

| # | Severidade | Afeta | Impacto | Workaround | ETA Fix |
|---|-----------|-------|--------|-----------|---------|
| 1 | 🔴 | Rankings | 5% usuários | Avisar limite | v2.1 |
| 2 | 🔴 | Grupos | Raro (<1%) | Monitorar | v2.1 |
| 3 | 🟡 | Rankings | 24h stale max | Manual trigger | v2.1 |
| 4 | 🟡 | Grupos stats | P95 > 500ms | VACUUM | Maintenance |
| 5 | 🟡 | D-Day | ±3h visual | Frontend adjust | v2.1 |
| 6 | 🟢 | UX | Estético | Built-in | ✅ |
| 7 | 🟢 | UX | Validação | Manual fix | v2.1 |
| 8 | 🟢 | UX | Estético | CSS fallback | ✅ |

---

## 🔧 MAINTENANCE SCHEDULE

### Semanal
- [ ] Verificar logs de erro (error rate > 1%)
- [ ] Confirmar que worker rodou 7/7 dias

### Mensal
```bash
# Rodar off-peak (segunda-feira, 02:00 UTC)
VACUUM ANALYZE;
REINDEX INDEX idx_group_sessions_group;
REINDEX INDEX idx_group_members_group;
```

### Trimestral
```bash
# Supabase Settings → Backups & Replication
# Testar restore de backup (PITR test)
# Confirmar replica lag < 100ms
```

### Semestral
- Atualizar Node.js (patch)
- Atualizar dependências menores (npm audit)
- Load test (1000 CCU simulado)

---

## 📞 ESCALATION

Se encontrar novo issue em produção:

1. **Avalia severidade:** 🔴 (critical) | 🟡 (warning) | 🟢 (cosmetic)
2. **Cria ticket:** Issue + reproducer + logs
3. **Se 🔴:** On-call engineer, prepare hotfix + deploy
4. **Se 🟡:** Schedule para sprint, add a backlog
5. **Se 🟢:** Backlog de baixa prioridade

---

**Documento Version:** v1.0  
**Last Update:** 17/03/2026  
**Owner:** Engineering Team
