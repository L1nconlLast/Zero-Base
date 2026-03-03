# Deploy seguro (Vercel + Supabase)

## 1) Pré-requisitos

- Projeto compilando localmente com Node compatível.
- Projeto Supabase ativo com migrations aplicadas.
- Conta no Vercel conectada ao repositório.

## 2) Validação local obrigatória

```bash
npm install
npm run build
```

Se o build falhar, não publique.

## 3) Variáveis de ambiente (Vercel)

Configure em `Project Settings > Environment Variables`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (preferencial)
- `VITE_SUPABASE_ANON_KEY` (somente compatibilidade)
- `VITE_SUPABASE_OAUTH_PROVIDERS` (ex.: `google,facebook`)

Regras importantes:

- Defina em `Production` e `Preview`.
- Nunca colocar `SUPABASE_SERVICE_ROLE_KEY` em variável `VITE_*`.
- Após mudar env, faça novo deploy.

## 4) Supabase Auth (antes de abrir beta)

- Authentication > Providers:
	- Habilite apenas providers que realmente vai usar.
	- Configure Client ID/Secret corretamente.
- Authentication > URL Configuration:
	- Adicione URL do Vercel em `Site URL`.
	- Adicione callbacks em `Redirect URLs` (produção + preview/local).
- Defina política de confirmação de email conforme estratégia de beta.

## 5) Banco e storage

- Garantir que migrations de segurança e RLS foram aplicadas.
- Confirmar que buckets/policies permitem só o acesso esperado.
- Validar com usuário autenticado e não autenticado.

## 6) Deploy no Vercel

- Framework: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Deploy recomendado para beta:

1. Publicar primeiro em ambiente Preview.
2. Validar login, OAuth, upload e sincronização.
3. Só então promover para Production.

## 7) Checklist Go/No-Go

- [ ] `npm run build` sem erros
- [ ] Login email/senha funcionando
- [ ] Reset de senha funcionando
- [ ] OAuth funcionando (apenas providers habilitados)
- [ ] Sem erros críticos no console
- [ ] RLS/policies revisadas para novas tabelas
- [ ] Upload/download em storage respeitando permissões
- [ ] PWA inicia sem quebrar fluxo principal

## 8) Pós-deploy imediato (15 min)

- Criar conta nova e concluir onboarding.
- Fazer login/logout em aba anônima.
- Testar um fluxo crítico de estudo e social.
- Confirmar que não há página de erro JSON no OAuth.

## 9) Rollback rápido

Se ocorrer incidente:

1. Remova providers de `VITE_SUPABASE_OAUTH_PROVIDERS` no Vercel.
2. Redeploy para ocultar social login imediatamente.
3. Rever configuração de provider/redirect no Supabase.

## 10) Execução guiada para desktop e celular

Para a operação de beta com validação prática em PC e mobile, use também:

- [PC_MOBILE_BETA_PLAYBOOK.md](PC_MOBILE_BETA_PLAYBOOK.md)
