# Organização do Repositório

Este documento define a organização base do projeto `Zero Base` para manter evolução previsível e facilitar onboarding.

## Estrutura recomendada

- `src/components` componentes de UI por domínio (`Dashboard`, `Timer`, `Auth`, etc.)
- `src/pages` páginas de alto nível e composição de seções
- `src/hooks` hooks reutilizáveis de estado e comportamento
- `src/services` regras de negócio e integrações (Supabase, APIs, storage)
- `src/data` catálogos estáticos (conquistas, níveis, bancos de questões)
- `src/utils` utilitários puros e helpers transversais
- `src/types` contratos TypeScript globais
- `src/tests` testes unitários e de integração
- `docs` documentação funcional, técnica e comercial
- `supabase` migrações, scripts e verificações SQL

## Convenções de manutenção

- Priorizar mudanças por domínio (ex.: `Timer`, `Dashboard`) para reduzir acoplamento.
- Evitar arquivos de apoio temporários (`*.txt`) dentro de `src/pages`; usar `docs/` quando for documentação.
- Manter tipos compartilhados em `src/types` e evitar duplicação de interfaces locais.
- Centralizar constantes em `src/constants.ts` ou `src/config/constants.ts` conforme escopo.
- Criar documentação curta em `docs/` para qualquer fluxo novo relevante.

## Checklist para novos recursos

1. Componente em domínio correto dentro de `src/components`.
2. Tipos em `src/types` (se compartilhados).
3. Regras de negócio em `src/services`.
4. Teste correspondente em `src/tests`.
5. Atualização do `README.md` e/ou `docs/` quando necessário.
