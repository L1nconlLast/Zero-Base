# CHANGELOG

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

