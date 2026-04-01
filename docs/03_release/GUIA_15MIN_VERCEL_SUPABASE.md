# Guia rapido (15 min) - Vercel + Supabase sem dor de cabeca

## Objetivo

Publicar o beta com seguranca pratica para PC e mobile (PWA), com rollback rapido se algo falhar.

---

## Passo 0 - Pre-check local (2 min)

No projeto:

```bash
npm run build
```

Se falhar, nao publique ainda.

---

## Passo 1 - Configurar Vercel (4 min)

1. Acesse o projeto no Vercel.
2. Entre em **Project Settings > Environment Variables**.
3. Configure em **Preview** e **Production**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (preferencial)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_OAUTH_PROVIDERS` (ex: `google,facebook`)
4. Salve.
5. Faca **Redeploy** (ou novo deploy) para aplicar env.

> Regra de ouro: nunca usar `SUPABASE_SERVICE_ROLE_KEY` no frontend (`VITE_*`).
> Padrao operacional: `Preview` deve ser mantido manualmente no painel da Vercel. Deploy com env injetada no comando e apenas contingencia para destravar staging.
> Se a CLI mostrar `Preview` vazio, confirme no painel ou na API do projeto antes de assumir que as envs nao persistiram.

---

## Passo 2 - Configurar Supabase Auth (5 min)

### 2.1 Providers
- Va em **Authentication > Providers**.
- Habilite so os providers que deseja usar (Google/Facebook).
- Preencha Client ID/Secret.

### 2.2 URL Configuration
- Va em **Authentication > URL Configuration**.
- Defina **Site URL** com sua URL de producao do Vercel.
- Adicione em **Redirect URLs**:
  - `http://localhost:5173`
  - URL de preview do Vercel (quando usar)
  - URL de producao do Vercel

### 2.3 Politica de email
- Para beta fechado: pode manter confirmacao de email conforme sua estrategia.
- Para beta publico: prefira confirmacao ativa + fluxo de reset testado.

---

## Passo 3 - Teste funcional rapido (3 min)

### Desktop (PC)
- Criar conta
- Login/logout
- Reset de senha
- OAuth (somente providers habilitados)
- Fluxo principal (estudo + social)

### Mobile (PWA)
- Abrir URL no celular
- Instalar na tela inicial
- Reabrir via icone
- Navegar e enviar mensagem/anexo

Se algum item falhar, nao abra para publico amplo ainda.

---

## Passo 4 - Go/No-Go

### GO (pode liberar testers)
- Build ok
- Login e reset ok
- OAuth ok
- Sem erro critico no console
- Fluxo PC + mobile validado

### NO-GO (segurar release)
- Falha de login
- Redirect OAuth quebrado
- Erro de permissao/RLS
- Erro critico recorrente

---

## Rollback em 2 minutos

1. No Vercel, remova temporariamente `google,facebook` de `VITE_SUPABASE_OAUTH_PROVIDERS`.
2. Redeploy.
3. Se necessario, desative provider no Supabase.

Isso evita usuarios cairem em erro de OAuth enquanto voce corrige.

---

## Troubleshooting direto

### Erro: `Unsupported provider: provider is not enabled`
- Provider nao habilitado no Supabase ou faltou no `VITE_SUPABASE_OAUTH_PROVIDERS`.

### OAuth volta para pagina errada
- Redirect URL nao cadastrada no Supabase.

### Ambiente Vercel "ignorou" variavel
- Faltou redeploy apos alterar env.
- Se isso acontecer em `Preview`, corrija primeiro no painel da Vercel antes de normalizar o processo de beta.

### App sem dados/sessao
- Verifique `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

---

## Sequencia recomendada de liberacao

1. Preview interno
2. Beta fechado (5 a 20 pessoas)
3. Correcoes criticas
4. Producao aberta gradual
