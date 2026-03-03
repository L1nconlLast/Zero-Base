# Playbook de Beta Seguro (PC + Mobile)

## Importante

Não existe risco zero em produção. Este playbook reduz muito o risco com checklist operacional e rollback rápido.

## 1) Arquitetura recomendada sem custo

- Frontend: Vercel (plano gratuito)
- Backend/Auth/DB: Supabase (plano gratuito)
- Mobile: PWA (instalável no Android/iOS via navegador)

## 2) Pré-go-live (obrigatório)

- [ ] `npm run build` sem falhas
- [ ] Variáveis no Vercel definidas em Preview e Production:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`)
  - `VITE_SUPABASE_OAUTH_PROVIDERS` (ex: `google,facebook`)
- [ ] Providers OAuth habilitados no Supabase e Redirect URLs corretas
- [ ] Migrations aplicadas no ambiente Supabase de teste/produção

## 3) Teste mínimo em PC (desktop)

- [ ] Cadastro por email
- [ ] Login/logout
- [ ] Reset de senha
- [ ] Fluxo principal da aplicação (dashboard/estudo)
- [ ] Social (mensagem, menção e anexo)
- [ ] Sem erro crítico no console

## 4) Teste mínimo em Mobile (PWA)

- [ ] Abrir app no Chrome Android e Safari iOS
- [ ] Instalar na tela inicial
- [ ] Reabrir app pelo ícone instalado
- [ ] Verificar navegação e formulários em telas pequenas
- [ ] Verificar upload e leitura de anexos
- [ ] Verificar comportamento offline básico (sem travar)

## 5) Segurança operacional

- [ ] Nunca usar `SUPABASE_SERVICE_ROLE_KEY` no frontend
- [ ] `.env` real fora do git
- [ ] OAuth só aparece se provider estiver habilitado
- [ ] Revisar RLS/policies de tabelas novas
- [ ] Revisar buckets/policies de storage

## 6) Publicação segura

1. Deploy em Preview
2. Rodada de teste com grupo pequeno (5 a 20 pessoas)
3. Ajuste de bugs críticos
4. Deploy Production
5. Acompanhar erros por 24h

## 7) Rollback (2-5 minutos)

Se houver incidente:

1. Remover providers de `VITE_SUPABASE_OAUTH_PROVIDERS` no Vercel
2. Redeploy imediato
3. (Opcional) desabilitar provider no Supabase
4. Comunicar testers e reabrir após correção

## 8) Critério Go/No-Go

Pode abrir para mais pessoas apenas quando:

- Build ok
- Auth ok
- OAuth ok
- Sem erro crítico recorrente
- Fluxo desktop + mobile validado

Se qualquer item falhar, manter em beta fechado.
