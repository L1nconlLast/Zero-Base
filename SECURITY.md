# Política de Segurança

## Versões suportadas

| Versão | Suportada |
| --- | --- |
| 2.1.x | ✅ |
| <= 2.0.x | ❌ |

## Arquitetura de segurança atual

- Frontend em Vite/React usa somente chave pública do Supabase (`publishable` ou `anon`) via variáveis `VITE_*`.
- Autenticação via Supabase Auth (email/senha, reset de senha e OAuth opcional).
- Controle de acesso a dados via RLS (Row Level Security) e policies SQL em `supabase/migrations`.
- Operações administrativas privilegiadas usam `SUPABASE_SERVICE_ROLE_KEY` somente em ambiente server-side (Edge Functions), nunca no cliente.

## Controles implementados

- RLS habilitado e policies por usuário em tabelas de domínio.
- Hardening de funções/views (ajustes de `search_path` e `security_invoker`).
- Fluxo OAuth protegido por configuração explícita de providers na UI (`VITE_SUPABASE_OAUTH_PROVIDERS`).
- Validação de configuração Supabase no runtime sem fallback silencioso de credenciais.
- Proteções básicas de formulário e mensagens de erro amigáveis para autenticação.

## Requisitos mínimos para produção/beta público

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` configurados no ambiente de deploy.
- `SUPABASE_SERVICE_ROLE_KEY` apenas em funções server-side (Vercel serverless/Edge/Supabase Functions).
- Providers OAuth habilitados no painel Supabase e redirect URLs corretas por ambiente.
- Confirmação de email e limites de auth revisados no Supabase Auth.
- Buckets e policies de storage revisados (sem leitura pública além do necessário).

## Boas práticas operacionais

- Não comitar `.env` real, tokens, dumps de produção ou credenciais temporárias.
- Rodar `npm run build` e validações antes de cada release.
- Revisar policies RLS sempre que criar tabela nova.
- Separar ambiente de staging e produção para evitar mistura de dados.
- Monitorar erros em produção (ex.: Sentry + logs Supabase).

## Reporte de vulnerabilidades

Se você identificar uma vulnerabilidade:

1. Não publique detalhes sensíveis em issue aberta.
2. Envie a descrição com passos de reprodução e impacto.
3. Inclua contexto de ambiente (staging/prod), rota afetada e evidências.

## SLA sugerido

- Triagem inicial: até 48h.
- Correção crítica: até 7 dias.
- Correções de severidade média/baixa: conforme janela de release.

## Referências

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Supabase Security: https://supabase.com/docs/guides/platform/security
- Vercel Security: https://vercel.com/docs/security

