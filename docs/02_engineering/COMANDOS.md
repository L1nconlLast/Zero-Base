# Comandos Úteis - Zero Base

## Desenvolvimento

```bash
npm install
npm run dev
```

## Qualidade

```bash
npm run lint
npm run test -- --run
```

## Build

```bash
npm run build
npm run preview
```

## Supabase (migrações remotas)

```powershell
# opção por token
powershell -ExecutionPolicy Bypass -File .\supabase\scripts\apply_remote_migrations.ps1 -AccessToken "sbp_SEU_TOKEN"

# opção por senha postgres
powershell -ExecutionPolicy Bypass -File .\supabase\scripts\apply_remote_migrations.ps1 -DbPassword "SUA_SENHA"
```

Validação pós-migração no SQL Editor:

```sql
-- execute o conteúdo de:
supabase/verification/verify_mentor_messages.sql
```

## E2E

```bash
npx cypress run --config baseUrl=http://127.0.0.1:5174 --spec cypress/e2e/smoke.cy.ts
```

## Dependências

```bash
npm list
npm outdated
npm audit
```
