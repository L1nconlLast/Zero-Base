# Checklist de Lançamento para Teste (7 dias)

## Objetivo
- Validar hábito real de uso com 5–10 colegas.
- KPI principal: **D7 Habit Rate** (usuários com 3+ dias de estudo na primeira semana).

## Pré-lançamento (Dia 0)
- [ ] Build local aprovado (`npm run build`).
- [ ] Migrations aplicadas no Supabase (`db push`).
- [ ] Edge Function `update-consistency-ranking` deployada.
- [ ] Cron semanal configurado (domingo 23:00 UTC).
- [ ] Usuário admin cadastrado em `public.admin_users`.
- [ ] Security Advisor revisado (apenas warnings esperados de plano/Auth).

## Smoke test técnico (antes de convidar usuários)
- [ ] Registrar 1 sessão de estudo.
- [ ] Confirmar `weekly_streak_days` com dia registrado.
- [ ] Confirmar `weekly_streaks` com `days_completed` atualizado.
- [ ] Completar 4 dias de teste e validar `completed = true`.
- [ ] Validar atualização em `consistency_stats`.
- [ ] Validar carregamento do painel admin (aba Dados).

## Execução do teste (Dias 1–7)
- [ ] Convidar 5–10 usuários com briefing curto (objetivo: estudar 25 min/dia).
- [ ] Coletar feedback diário em 1 pergunta: “o que travou hoje?”.
- [ ] Monitorar funil mínimo:
  - `department_focus_viewed`
  - `department_focus_clicked`
  - `pomodoro_auto_started`
  - `study_session_completed`
- [ ] Monitorar retenção semanal no painel admin.

## Critério de decisão ao final do Dia 7
- [ ] Calcular **D7 Habit Rate**.
- [ ] Classificar resultado:
  - `< 25%`: ajustar onboarding/fluxo antes de escalar.
  - `25%–40%`: tração inicial validada.
  - `> 40%`: sinal forte de produto.

## Pós-teste imediato (Dia 8)
- [ ] Priorizar os 3 maiores bloqueios reportados.
- [ ] Corrigir somente fricções com impacto no D7 Habit Rate.
- [ ] Rodar novo ciclo curto de 7 dias.
