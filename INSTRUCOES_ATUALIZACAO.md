# Zero Base v2 - Instruções de Atualização

## Novidades implementadas

- Heatmap de estudos no dashboard.
- Sistema de conquistas expandido.
- Sistema de níveis com progressão.
- Exportação e importação de dados.
- Relatórios semanais.
- Melhorias no modo noturno e temas.

## Instalação

```bash
npm install
npm run dev
```

## Estrutura atualizada (resumo)

```text
src/
  data/
    achievements.ts
    levels.ts
  utils/
    export.ts
    weeklyStats.ts
  hooks/
    useAchievements.ts
    useTheme.ts
  components/
    Dashboard/
      StudyHeatmap.tsx
      LevelProgress.tsx
      AchievementNotification.tsx
      WeeklyReport.tsx
    Achievements/
      AchievementsPage.tsx
```

## Como integrar

1. Garanta que `src/App.tsx` referencia as páginas novas.
2. Verifique imports e tipos atualizados.
3. Rode lint e testes.

```bash
npm run lint
npm run test
```

## Uso das novas features

- Inicie sessões no cronômetro para alimentar estatísticas.
- Acompanhe evolução no dashboard.
- Consulte conquistas na página dedicada.
- Exporte dados para backup.

## Conclusão

A atualização v2 consolida recursos de acompanhamento e prepara o projeto para próximas entregas.
