# CHANGELOG

## [2.2.0] - 2026-03-31

### Added

- Novo shell semantico para contextos de estudo, com isolamento de superfícies por dominio.
- Visao geral de Outros como central de comando com hero contextual, proxima acao, estado do plano, ritmo semanal e alertas inteligentes.
- Novos componentes e servicos de dominio para foco, plano, workspace e fluxo unificado de estudos.
- Template padrao de PR em `.github/pull_request_template.md`.
- Playbook de release em `docs/03_release/RELEASE_WORKFLOW.md`.
- Template de entrada de changelog em `docs/03_release/CHANGELOG_TEMPLATE.md`.

### Changed

- Reorganizacao estrutural de modulos frontend para reduzir acoplamento e melhorar navegacao semantica.
- Reorganizacao da documentacao com taxonomia oficial em `docs/01_product`, `docs/02_engineering`, `docs/03_release`, `docs/04_research` e `docs/99_archive`.
- Fortalecimento da cobertura de testes e scripts de smoke para fluxos centrais.

### Fixed

- Ajustes em rotas, servicos e contratos para manter consistencia entre shell, plano e dashboard nos contextos expandidos.

### Removed

- Limpeza de artefatos legados dispersos na raiz e consolidacao em estrutura de documentacao mais previsivel.

### Validacao

- `npm run typecheck`: PASS
- `npm run test:client`: PASS
- `npm run build`: PASS
- smoke: PASS (17/17)

### Observabilidade e risco

- impacto esperado: experiencia de navegacao mais orientada a acao e manutencao mais simples por separacao de responsabilidade.
- risco residual: necessidade de monitorar bundle/chunks apos crescimento modular.
- plano de rollback: revert do commit da release e reaplicacao incremental por dominio se houver regressao.

## [2.1.1-beta-ready] - Marco 2026

### Release State

- Loop central validado ponta a ponta no preview publicado: `Inicio -> Plano -> Estudos -> Finalizar -> Home/Plano -> Revisao 24h -> Reload`
- Build de producao validado localmente
- Smoke central remoto validado `7/7`, incluindo persistencia apos reload e console limpo
- Inspecao visual de staging concluida com capturas de `Home`, `Plano`, `Dashboard`, `Mentor IA`, dark mode e mobile
- Bugs centrais desta fase corrigidos: `Mentor IA`, `WeeklyReport`, `StudyHeatmap` e sincronizacao de tema
- Passe de densidade visual concluido em `Home`, `Plano`, `Dashboard` e `Mentor IA`
- `WeeklyReport` teve o bug de distribuicao por materia corrigido na origem do dado e validado visualmente com `qa-artifacts/progress-dashboard-weekly-report.png` e `qa-artifacts/progress-dashboard-weekly-report-mobile.png`
- A instabilidade restante em `run-progress-dashboard-smoke.mjs` fica classificada como divida separada de automacao/runner, nao como regressao funcional do grafico

## [2.1.0] — Fevereiro 2026

### Correções Críticas

- **Constantes centralizadas** — criado `src/constants.ts` com `INITIAL_USER_DATA`, `AUTH`, `STUDY`, `STORAGE_KEYS`, `WEEK_DAYS`; eliminados valores hard-coded de `App.tsx`
- **Validação de importação** — criado `src/utils/validation.ts` com schemas Zod (`UserDataSchema`, `BackupSchema`) e `safeParseAndValidate` para JSON malformado/unicode inválido/schema incorreto
- **Imports obsoletos removidos** — eliminados `import React` desnecessários (React 17+ JSX transform)
- **ErrorBoundary** — adicionado `src/components/ErrorBoundary.tsx` envolvendo componentes críticos, com UI amigável de recuperação

### Monitoramento

- **Logger estruturado** — criado `src/utils/logger.ts` com níveis `debug/info/warn/error`, logs em dev e persistência de até 50 eventos no localStorage em produção, além de `exportLogs()`
- **Integração do logger** — aplicado em `ErrorBoundary`, `validation.ts`, `helpers.ts`, `useAuth.ts` e `auth.service.ts`

### Testes

- **59 testes unitários** com Vitest — cobrindo `helpers.ts`, `useAuth.ts` e `validation.ts`
- **21 testes E2E** com Cypress — cobrindo login/cadastro, cronômetro, Pomodoro, dashboard, conquistas, import/export e navegação
- **CI/CD** — `.github/workflows/e2e.yml` executa unit + E2E em push e pull request

### Performance

- **`useMemo`** aplicado em `weekData`, `subjectDistribution`, `statsCards`, `dailyProgress`, `todayMinutes`, `activeTheme` e `tabList`
- **`useCallback`** aplicado em `handleFinishStudySession`, `handleClearData`, `handleUpdateGoal`, `handleLogout`
- **Constantes movidas para fora dos componentes** — `THEMES`, `TABS`, `DAYS_MAP`, `MODES` (Pomodoro)

### PWA + Notificações

- **Service Worker** configurado via `vite-plugin-pwa` com cache offline de assets estáticos
- **4 tipos de notificações push** — fim do Pomodoro, lembrete diário (08h), conquista desbloqueada e meta diária não atingida
- **`useNotifications`** — hook com `requestPermission`, `notify`, atalhos por tipo e agendamento automático via `setInterval`
- **`NotificationSetup`** — banner de permissão com delay de 3s e exibição única

### Refinamento Visual

- **LoginForm** — card com gradiente de fundo, inputs `py-3` e acessibilidade (`aria-label`, `role="alert"`, `aria-busy`)
- **PomodoroTimer** — timer circular SVG com anel de progresso animado e controles compactos
- **Settings** — ícones por categoria, cards de estatísticas em grid 2x2 e toggle com `focus:ring`

### Segurança / Acessibilidade

- `aria-label`, `aria-busy`, `role="alert"` adicionados em `LoginForm`
- `autoComplete` correto em todos os inputs de auth
- Rate limiting com `logger.warn` em tentativas bloqueadas

---

## [2.0.0] — Janeiro 2026

- Lançamento inicial da versão 2.0
- Arquitetura modular (componentes / hooks / utils / types)
- Sistema de XP, níveis, conquistas, heatmap, relatório semanal
- Pomodoro, cronômetro, dashboard com gráficos
- PWA base, backup/restore, exportação CSV/JSON
- Autenticação local com bcrypt
