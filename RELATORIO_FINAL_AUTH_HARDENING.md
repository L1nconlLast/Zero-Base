# Relatório Final — Auth Hardening (Supabase)

Data: 26/02/2026
Projeto: medicina-do-zero-v2
Status: ✅ Concluído e validado

## 1) Objetivo
Fortalecer o fluxo de autenticação e consistência de perfil entre `auth.users` e `public.users`, reduzindo falhas de cadastro, riscos de RLS e pontos únicos de quebra no frontend.

## 2) Resultado final
- Fluxo de auth estabilizado (cadastro/login/reset funcionando com tratamento de erro amigável).
- Criação/sincronização de perfil garantida no banco (trigger-first).
- Triggers resilientes para não derrubar `signUp` em caso de erro de domínio.
- RLS e privilégios de `public.users` endurecidos (mínimo privilégio).
- Auditoria de alterações de perfil habilitada (`users_audit_log`).

## 3) Migrations aplicadas
1. `20260226000008_fix_search_path.sql`
   - Corrige funções com `SET search_path = ''`.

2. `20260226000009_fix_xp_search_path.sql`
   - Corrige `search_path` nas funções de XP.

3. `20260226000010_auth_user_trigger.sql`
   - Cria trigger `on_auth_user_created` + função `handle_new_user`.

4. `20260226000011_backfill_users_from_auth.sql`
   - Backfill de `public.users` a partir de `auth.users`.

5. `20260226000012_auth_user_update_trigger.sql`
   - Trigger `on_auth_user_updated` para manter `email/name` sincronizados.

6. `20260226000013_users_rls_hardening.sql`
   - Remove insert direto por cliente em `public.users`.
   - Restringe update do cliente para colunas seguras.

7. `20260226000014_users_audit_log.sql`
   - Tabela + trigger de auditoria (`users_audit_log`).

8. `20260226000015_harden_auth_triggers_resilient.sql`
   - Torna triggers de auth resilientes (captura exceções sem abortar Auth).

## 4) Mudanças no frontend
Arquivo principal alterado:
- `src/hooks/useAuth.ts`

Melhorias:
- `register` determinístico com `signUp` e tratamento explícito de:
  - already_registered
  - rate_limit
  - invalid_api_key
- Logs estruturados de auth:
  - `signUp success`
  - `signUp rate_limit`
  - `signUp already_registered`
- Removido acoplamento de criação de perfil no frontend (trigger-first).

## 5) Segurança aplicada (resumo)
- `public.users`:
  - Sem `INSERT` por cliente (`authenticated`/`anon`).
  - `UPDATE` por cliente restrito a colunas seguras.
- Triggers com:
  - `SECURITY DEFINER`
  - `SET search_path = ''`
- Auditoria ativa para `UPDATE/DELETE` em `public.users`.

## 6) Evidências de validação
- TypeScript: `npx tsc --noEmit` ✅
- Testes de auth: `npx vitest run src/tests/useAuth.test.ts` ✅
- Verificação SQL:
  - triggers `on_auth_user_created` e `on_auth_user_updated` ativas ✅
  - `missing_profiles = 0` após backfill ✅
  - policy de auditoria `users_audit_select_own` ativa ✅

## 7) Checklist de operação (pós-hardening)
- [ ] Confirmar no Supabase Dashboard: Security Advisor sem novos alertas críticos.
- [ ] Validar cadastro novo em ambiente real.
- [ ] Validar login de usuário antigo.
- [ ] Validar reset de senha.
- [ ] Monitorar warnings de trigger no Postgres Logs por 24h.

## 8) Rollback rápido (se necessário)
### Banco
1. Desativar trigger de update em auth (temporário):
   - `drop trigger if exists on_auth_user_updated on auth.users;`
2. Restaurar função anterior `handle_new_user` (se houver necessidade específica).
3. Reverter hardening de privilégios em `public.users` (somente se bloquear funcionalidade crítica).

### App
1. Reverter `src/hooks/useAuth.ts` para o commit anterior estável.
2. Rodar `npx tsc --noEmit`.
3. Revalidar login/cadastro.

## 9) Estado arquitetural final
`supabase.auth.signUp`  
→ `auth.users` (insert)  
→ trigger `handle_new_user`  
→ `public.users` (garantido no banco)

Frontend não é mais responsável por consistência estrutural do perfil; apenas consome e exibe estado.

---

Se necessário, próximo passo recomendado:
- Criar view operacional para consulta rápida de últimos eventos em `users_audit_log` por usuário/intervalo.
