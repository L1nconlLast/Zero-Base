# Guia rápido (15 min) — Vercel + Supabase sem dor de cabeça

## Objetivo

Publicar o beta com segurança prática para PC e mobile (PWA), com rollback rápido se algo falhar.

---

## Passo 0 — Pré-check local (2 min)

No projeto:

```bash
npm run build
```

Se falhar, não publique ainda.

---

## Passo 1 — Configurar Vercel (4 min)

1. Acesse o projeto no Vercel.
2. Entre em **Project Settings > Environment Variables**.
3. Configure em **Preview** e **Production**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (preferencial)
   - `VITE_SUPABASE_OAUTH_PROVIDERS` (ex: `google,facebook`)
4. Salve.
5. Faça **Redeploy** (ou novo deploy) para aplicar env.

> Regra de ouro: nunca usar `SUPABASE_SERVICE_ROLE_KEY` no frontend (`VITE_*`).

---

## Passo 2 — Configurar Supabase Auth (5 min)

No Supabase:

### 2.1 Providers
- Vá em **Authentication > Providers**.
- Habilite só os providers que deseja usar (Google/Facebook).
- Preencha Client ID/Secret.

### 2.2 URL Configuration
- Vá em **Authentication > URL Configuration**.
- Defina **Site URL** com sua URL de produção do Vercel.
- Adicione em **Redirect URLs**:
  - `http://localhost:5173`
  - URL de preview do Vercel (quando usar)
  - URL de produção do Vercel

### 2.3 Política de email
- Para beta fechado: pode manter confirmação de email conforme sua estratégia.
- Para beta público: prefira confirmação ativa + fluxo de reset testado.

---

## Passo 3 — Teste funcional rápido (3 min)

### Desktop (PC)
- Criar conta
- Login/logout
- Reset de senha
- OAuth (somente providers habilitados)
- Fluxo principal (estudo + social)

### Mobile (PWA)
- Abrir URL no celular
- Instalar na tela inicial
- Reabrir via ícone
- Navegar e enviar mensagem/anexo

Se algum item falhar, não abra para público amplo ainda.

---

## Passo 4 — Go/No-Go

### GO (pode liberar testers)
- Build ok
- Login e reset ok
- OAuth ok
- Sem erro crítico no console
- Fluxo PC + mobile validado

### NO-GO (segurar release)
- Falha de login
- Redirect OAuth quebrado
- Erro de permissão/RLS
- Erro crítico recorrente

---

## Rollback em 2 minutos

1. No Vercel, remova temporariamente `google,facebook` de `VITE_SUPABASE_OAUTH_PROVIDERS`.
2. Redeploy.
3. Se necessário, desative provider no Supabase.

Isso evita usuários caírem em erro de OAuth enquanto você corrige.

---

## Troubleshooting direto

### Erro: `Unsupported provider: provider is not enabled`
- Provider não habilitado no Supabase **ou** faltou no `VITE_SUPABASE_OAUTH_PROVIDERS`.

### OAuth volta para página errada
- Redirect URL não cadastrada no Supabase.

### Ambiente Vercel “ignorou” variável
- Faltou redeploy após alterar env.

### App sem dados/sessão
- Verifique `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

---

## Sequência recomendada de liberação

1. Preview interno
2. Beta fechado (5 a 20 pessoas)
3. Correções críticas
4. Produção aberta gradual
