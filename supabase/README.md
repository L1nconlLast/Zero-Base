# Supabase — Sprint 1

## 1) Configurar variáveis de ambiente

Crie `.env` com base em `.env.example`:

```env
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-anon-key>
```

## 2) Aplicar migration inicial

No SQL Editor do Supabase, execute:

- `supabase/migrations/20260225_000001_initial_schema.sql`

## 3) Camada frontend criada

- Cliente: `src/services/supabase.client.ts`
- Serviço de sessões: `src/services/session.service.ts`

## 4) Migrações remotas (automação)

Script de execução rápida:

- `supabase/scripts/apply_remote_migrations.ps1`

Guia operacional:

- `supabase/OPERACAO_RAPIDA.md`

Validação pós-migração:

- `supabase/verification/verify_mentor_messages.sql`

## Observação

Se as variáveis não estiverem definidas, o cliente fica desabilitado e o app atual (localStorage) continua funcionando.

