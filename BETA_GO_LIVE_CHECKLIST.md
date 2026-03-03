# Checklist de Go-Live Beta (Zero Base)

## Objetivo

Checklist operacional para liberar o app para testers com risco mínimo de segurança e regressão.

## Fase 1 — Configuração de ambiente

- [ ] Projeto Supabase separado por ambiente (staging/prod), quando possível.
- [ ] `VITE_SUPABASE_URL` definido no Vercel (`Preview` e `Production`).
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` definido no Vercel.
- [ ] `VITE_SUPABASE_OAUTH_PROVIDERS` definido apenas com providers ativos.
- [ ] Confirmar ausência de `SUPABASE_SERVICE_ROLE_KEY` em variáveis `VITE_*`.

## Fase 2 — Supabase Auth

- [ ] Email/password login funcionando.
- [ ] Reset de senha funcionando (`/reset-password`).
- [ ] Providers OAuth habilitados no painel (somente os necessários).
- [ ] Redirect URLs configuradas para:
  - [ ] `http://localhost:5173`
  - [ ] domínio Preview do Vercel
  - [ ] domínio Production do Vercel
- [ ] `Site URL` configurada corretamente no Supabase.

## Fase 3 — Banco e RLS

- [ ] Migrations aplicadas até a versão mais recente.
- [ ] Novas tabelas com RLS habilitado.
- [ ] Policies testadas para leitura/escrita do próprio usuário.
- [ ] Usuário anônimo não acessa dados privados.

## Fase 4 — Storage

- [ ] Buckets necessários criados.
- [ ] Policies de upload/download revisadas.
- [ ] Limites de tamanho e mime types testados.
- [ ] Upload e visualização de anexos funcionando para usuários válidos.

## Fase 5 — Qualidade técnica

- [ ] `npm run build` sem erro.
- [ ] Erros de TypeScript críticos resolvidos.
- [ ] Fluxos principais navegáveis sem crash.
- [ ] Sem erro crítico recorrente no console do navegador.

## Fase 6 — Testes funcionais mínimos

- [ ] Cadastro novo usuário.
- [ ] Login/logout.
- [ ] Fluxo de estudo principal.
- [ ] Fluxo social (mensagem + menção + anexo).
- [ ] Sync/offline básico sem perda de dados.

## Fase 7 — Segurança operacional

- [ ] `.env` real não versionado.
- [ ] Chaves rotacionadas se houve vazamento anterior.
- [ ] Dependências auditadas (`npm audit` + revisão manual).
- [ ] Documento de resposta a incidente definido.

## Fase 8 — Liberação controlada

- [ ] Liberar primeiro para grupo pequeno (5–20 testers).
- [ ] Coletar erros por 24h.
- [ ] Corrigir críticos antes de escalar audiência.

## Plano de rollback (imediato)

1. Remover providers de `VITE_SUPABASE_OAUTH_PROVIDERS` no Vercel.
2. Redeploy para desativar social login na UI.
3. Se necessário, desabilitar provider no Supabase Auth.
4. Publicar aviso curto para testers e abrir janela de correção.
