# Retention Cohort Queries

As consultas operacionais de cohort e retencao foram movidas para:

- `supabase/scripts/retention_cohort_queries.sql`

Motivo:
- o arquivo representa script operacional real
- `docs/02_engineering/` deve guardar contexto e source of truth, nao SQL executavel solto

Uso recomendado:
1. revisar o contexto do schema ativo em `docs/02_engineering/SUPABASE_SOURCE_OF_TRUTH.md`
2. executar ou adaptar a query a partir de `supabase/scripts/retention_cohort_queries.sql`
3. documentar qualquer variacao relevante neste arquivo
