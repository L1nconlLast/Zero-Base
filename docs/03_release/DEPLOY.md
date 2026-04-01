# Deploy seguro (Vercel + Supabase)

## 1) Pre-requisitos

- Projeto compilando localmente com Node compativel.
- Projeto Supabase ativo com migrations aplicadas.
- Conta no Vercel conectada ao repositorio.

## 2) Validacao local obrigatoria

```bash
npm install
npm run build
```

Se o build falhar, nao publique.

## 3) Variaveis de ambiente (Vercel)

Configure em `Project Settings > Environment Variables`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (preferencial)
- `VITE_SUPABASE_ANON_KEY` (somente compatibilidade)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_OAUTH_PROVIDERS` (ex.: `google,facebook`)

Regras importantes:

- Defina em `Production` e `Preview`.
- Nunca colocar `SUPABASE_SERVICE_ROLE_KEY` em variavel `VITE_*`.
- Apos mudar env, faca novo deploy.

### Padrao para Preview

- Padrao oficial: manter `Preview` configurado manualmente no painel da Vercel.
- Antes de abrir beta fechado, confirme que `Preview` tem pelo menos:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` ou `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Em caso de divergencia, prefira validar no painel da Vercel ou pela API oficial do projeto.
- Se a CLI falhar ao persistir env de `Preview`, use deploy com env injetada apenas como contingencia operacional, nao como padrao.
- Depois da contingencia, volte para o caminho oficial e corrija a configuracao no painel.

## 4) Supabase Auth (antes de abrir beta)

- Authentication > Providers:
  - Habilite apenas providers que realmente vai usar.
  - Configure Client ID/Secret corretamente.
- Authentication > URL Configuration:
  - Adicione URL do Vercel em `Site URL`.
  - Adicione callbacks em `Redirect URLs` (producao + preview + local).
- Defina politica de confirmacao de email conforme estrategia de beta.

## 5) Banco e storage

- Garantir que migrations de seguranca e RLS foram aplicadas.
- Confirmar que buckets/policies permitem so o acesso esperado.
- Validar com usuario autenticado e nao autenticado.

## 6) Deploy no Vercel

- Framework: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Deploy recomendado para beta:

1. Publicar primeiro em ambiente Preview.
2. Validar login, OAuth, upload e sincronizacao.
3. So entao promover para Production.

## 7) Checklist Go/No-Go

- [ ] `npm run build` sem erros
- [ ] Login email/senha funcionando
- [ ] Reset de senha funcionando
- [ ] OAuth funcionando (apenas providers habilitados)
- [ ] Sem erros criticos no console
- [ ] RLS/policies revisadas para novas tabelas
- [ ] Upload/download em storage respeitando permissoes
- [ ] PWA inicia sem quebrar fluxo principal

## 8) Pos-deploy imediato (15 min)

- Criar conta nova e concluir onboarding.
- Fazer login/logout em aba anonima.
- Testar um fluxo critico de estudo e social.
- Confirmar que nao ha pagina de erro JSON no OAuth.
- Se o preview estiver protegido pela Vercel, validar o staging com acesso autenticado ou bypass antes de concluir o smoke remoto.

## 9) Rollback rapido

Se ocorrer incidente:

1. Remova providers de `VITE_SUPABASE_OAUTH_PROVIDERS` no Vercel.
2. Redeploy para ocultar social login imediatamente.
3. Rever configuracao de provider/redirect no Supabase.

## 10) Execucao guiada para desktop e celular

Para a operacao de beta com validacao pratica em PC e mobile, use tambem:

- [PC_MOBILE_BETA_PLAYBOOK.md](PC_MOBILE_BETA_PLAYBOOK.md)
