# Plano Técnico Executável — 90 dias (Zero Base)

> Atualizado em 25/02/2026

## 1) Decisões de Stack (recomendado)

- Frontend: React + TypeScript + Vite (manter base atual)
- Backend/DB/Auth: Supabase (PostgreSQL + Auth + RLS)
- Storage: Supabase Storage (avatares e exports)
- Jobs agendados: Supabase Edge Functions + cron
- Observabilidade inicial: PostHog (eventos produto) + Sentry (erros)
- Deploy: Vercel (frontend) + Supabase (backend)

## 2) Objetivos de Produto (90 dias)

- Converter app local em SaaS multiusuário com dados em nuvem
- Aumentar retenção com metas, missões e streak real
- Liberar primeira monetização (PRO) com trial
- Preparar base para crescimento (CI, métricas, segurança, anti-cheat)

## 3) Métricas-alvo

- Ativação (D0): >= 60% dos novos usuários completando 1 sessão
- Retenção D7: >= 25%
- Sessões por usuário/semana: >= 5
- Conversão Free -> PRO (beta): >= 3%

## 4) Backlog por Fases

## Fase 1 — Base Forte (Semanas 1 a 3)

### Sprint 1 (semana 1) — Infra e migração

- [P0] Criar projeto Supabase e schema inicial
  - Esforço: M
  - Aceite: tabelas `users`, `subjects`, `study_sessions`, `daily_goals` criadas com RLS ativa
- [P0] Integrar autenticação Supabase no app
  - Esforço: M
  - Aceite: login/cadastro/logout funcionando com sessão persistente
- [P0] Migrar camada de storage local -> serviços remotos
  - Esforço: M
  - Aceite: leitura/escrita de sessões e perfil via API Supabase
- [P1] Script de migração localStorage para nuvem
  - Esforço: S
  - Aceite: usuário logado consegue importar dados locais em 1 clique

### Sprint 2 (semana 2) — Dashboard real e metas

- [P0] Gráfico semanal 100% com dados reais (DB)
  - Esforço: S
  - Aceite: dashboard sem dados mock, atualizado em tempo real após sessão
- [P0] Meta diária personalizável persistida em banco
  - Esforço: S
  - Aceite: editar meta salva e refletida em todos os componentes
- [P1] Modal de finalização de sessão (XP, tempo, matéria)
  - Esforço: S
  - Aceite: feedback visual após finalizar estudo, sem bloquear fluxo

### Sprint 3 (semana 3) — XP engine v1

- [P0] Serviço central de XP (server-side)
  - Esforço: M
  - Aceite: cálculo único no backend, frontend apenas exibe
- [P0] Fórmula de nível progressiva
  - Esforço: S
  - Aceite: nível calculado por XP total sem divergência cliente/servidor
- [P1] Testes unitários do engine de XP
  - Esforço: S
  - Aceite: cobertura de regras de bônus e limites

## Fase 2 — Retenção e Gamificação (Semanas 4 a 7)

### Sprint 4 (semana 4) — Missões diárias

- [P0] Tabela `daily_missions` + geração automática diária
  - Esforço: M
  - Aceite: 3 missões/dia por usuário, com recompensa definida
- [P0] UI de missões no dashboard
  - Esforço: S
  - Aceite: missão mostra progresso e estado concluído
- [P1] Claim de recompensa com idempotência
  - Esforço: S
  - Aceite: não permite receber XP em duplicidade

### Sprint 5 (semana 5) — Streak real

- [P0] Streak calculado no backend por dia ativo
  - Esforço: M
  - Aceite: streak incrementa e reseta corretamente por fuso horário do usuário
- [P1] Multiplicador de XP por streak (com teto)
  - Esforço: S
  - Aceite: bônus aplicado sem quebrar economia

### Sprint 6 (semana 6) — Ranking semanal

- [P0] Ranking por XP semanal (query materializada)
  - Esforço: M
  - Aceite: top 100 carregando em < 1s
- [P0] Anti-cheat básico
  - Esforço: M
  - Aceite: limites de duração/sessão, limite de XP diário e flags de sessão suspeita

### Sprint 7 (semana 7) — Notificações e loops

- [P1] Notificações web de meta diária e missão pendente
  - Esforço: S
  - Aceite: regras de disparo configuráveis e opt-in
- [P1] E-mails transacionais (resumo semanal)
  - Esforço: M
  - Aceite: envio semanal com métricas-chave

## Fase 3 — Diferencial Competitivo (Semanas 8 a 12)

### Sprint 8 (semana 8) — Planejamento semanal

- [P0] Criador de cronograma semanal
  - Esforço: M
  - Aceite: usuário define disponibilidade e matérias por bloco
- [P1] Replanejamento automático em caso de atraso
  - Esforço: M
  - Aceite: plano reequilibrado sem perder metas semanais

### Sprint 9 (semana 9) — Modo prova em X dias

- [P0] Wizard “Prova em X dias”
  - Esforço: M
  - Aceite: gera plano diário por prioridade/tempo disponível
- [P1] Score de aderência ao plano
  - Esforço: S
  - Aceite: indicador diário de execução do plano

### Sprint 10 (semana 10) — Relatórios avançados

- [P0] Relatório por matéria, horário e consistência
  - Esforço: M
  - Aceite: visão mensal com insights automáticos
- [P1] Export PDF (PRO)
  - Esforço: S
  - Aceite: PDF gerado com filtros e identidade visual

### Sprint 11 (semana 11) — Monetização PRO

- [P0] Entitlements (free/pro) no backend
  - Esforço: M
  - Aceite: features PRO protegidas server-side
- [P0] Checkout (Stripe/Mercado Pago)
  - Esforço: M
  - Aceite: assinatura mensal + trial 7 dias + webhook de confirmação
- [P1] Paywall contextual
  - Esforço: S
  - Aceite: conversão sem bloquear fluxo principal de estudo

### Sprint 12 (semana 12) — Go-to-market

- [P0] Landing page de aquisição + lista de espera
  - Esforço: S
  - Aceite: tracking UTM + funil cadastro
- [P1] Onboarding guiado em 3 passos
  - Esforço: S
  - Aceite: aumento de ativação D0 medido por evento

## 5) Modelagem de Dados (v1)

## Tabelas principais

- `users`
  - id, name, email, level, xp_total, streak, daily_goal_minutes, timezone, created_at
- `subjects`
  - id, user_id, name, color, icon, created_at
- `study_sessions`
  - id, user_id, subject_id, duration_minutes, mode, xp_gained, started_at, finished_at, created_at
- `daily_goals`
  - id, user_id, goal_minutes, date, completed, completed_at
- `achievements`
  - id, title, description, xp_reward, type
- `user_achievements`
  - id, user_id, achievement_id, unlocked_at
- `daily_missions`
  - id, user_id, date, type, target, progress, reward_xp, completed, claimed
- `subscriptions`
  - id, user_id, status, plan, trial_ends_at, current_period_end, provider_customer_id

## Índices mínimos

- `study_sessions (user_id, created_at desc)`
- `daily_goals (user_id, date)` unique
- `daily_missions (user_id, date)`
- `user_achievements (user_id, achievement_id)` unique

## 6) Regras de XP (v1)

- Base: 10 XP por minuto válido
- Bônus:
  - pomodoro completo: +50
  - meta diária concluída: +100 (1x por dia)
  - missão diária: +80 (por missão)
- Controle:
  - teto de XP bônus diário
  - validação de duração máxima por sessão
  - logs de anomalia para auditoria

## Fórmula de nível

- `level = floor(sqrt(total_xp / 100))`
- XP próximo nível: `100 * level^2`

## 7) Segurança e Qualidade

- RLS em todas as tabelas por `auth.uid()`
- Validação de payload server-side (Zod)
- Idempotência em recompensas e webhooks
- Logs estruturados + alertas de erro
- CI obrigatório: unit + e2e + build

## 8) Entregáveis por semana (checklist executivo)

- Semana 1: auth + schema + RLS
- Semana 2: dashboard real + meta persistida
- Semana 3: XP engine server-side
- Semana 4: missões diárias
- Semana 5: streak real
- Semana 6: ranking + anti-cheat
- Semana 7: notificações de retenção
- Semana 8: planejamento semanal
- Semana 9: modo prova em X dias
- Semana 10: relatórios avançados
- Semana 11: monetização PRO
- Semana 12: lançamento beta + aquisição

## 9) Próximo passo imediato (recomendado)

- Iniciar Sprint 1 com 3 tarefas:
  1. Provisionar Supabase + schema SQL inicial
  2. Implementar login Supabase no app atual
  3. Criar serviço `session.service.ts` para persistir sessões remotas

## 10) Backlog executável — 8 propostas do painel interativo

> Objetivo: executar as propostas por impacto x esforço sem quebrar cadência de entrega.

### 10.1 Ordem de implementação (recomendada)

1. Banco de Questões integrado (Crítico)
2. Simulado cronometrado completo (Médio-alto)
3. Streak diário com multiplicador de XP (Alto impacto)
4. Mentor IA proativo (Alto impacto)
5. Calendário automático de metas (Médio-alto)
6. Flashcards SRS (Médio)
7. Dashboard analítico avançado (Médio)
8. Sala de estudos ao vivo (Médio)

### 10.2 Sprint A (7–10 dias) — Banco de Questões + Simulado (MVP)

- [P0] Modelagem de banco de questões (`question_bank`, `question_options`, `question_tags`)
  - Esforço: M
  - Dependências: Supabase pronto
  - Aceite: CRUD funcional + filtros por matéria, dificuldade e tema
- [P0] API de seleção de questões (random + balanceamento)
  - Esforço: M
  - Aceite: endpoint retorna conjunto equilibrado em < 500ms para pool normal
- [P0] Tela de simulado cronometrado (tempo total, pausa, submit)
  - Esforço: M
  - Aceite: usuário conclui simulado, recebe nota e revisão por questão
- [P1] Persistência de tentativas (`mock_exam_attempts`)
  - Esforço: S
  - Aceite: histórico salva nota, duração e distribuição de erros por matéria
- [P1] Métricas básicas do simulado (acerto global + por dificuldade)
  - Esforço: S
  - Aceite: dashboard mostra evolução das últimas 10 tentativas

### 10.3 Sprint B (5–7 dias) — Streak + multiplicador de XP

- [P0] Cálculo server-side de streak diário por timezone do usuário
  - Esforço: M
  - Aceite: incrementa 1x/dia com reset correto em quebra de sequência
- [P0] Multiplicador de XP por faixa de streak (com teto)
  - Esforço: S
  - Aceite: bônus aplicado somente em sessão válida, sem duplicidade
- [P1] UI de streak (estado, próximos marcos, risco de perda)
  - Esforço: S
  - Aceite: usuário visualiza progresso e impacto no XP antes de iniciar sessão
- [P1] Proteções anti-cheat para streak
  - Esforço: S
  - Aceite: trava sessões inválidas por duração mínima e padrões suspeitos

### 10.4 Sprint C (7 dias) — Mentor IA proativo (MVP orientado a ação)

- [P0] Serviço de recomendações diárias (3 ações: foco, revisão, recuperação)
  - Esforço: M
  - Aceite: recomendações mudam conforme histórico e meta do dia
- [P0] Card “Mentor do dia” no dashboard
  - Esforço: S
  - Aceite: exibe plano sugerido com CTA direto para iniciar tarefa
- [P1] Gatilhos proativos (queda de frequência, meta atrasada)
  - Esforço: S
  - Aceite: mensagem contextual aparece apenas quando condição real ocorre
- [P1] Feedback loop (útil/não útil)
  - Esforço: S
  - Aceite: preferências salvas e usadas para ajustar próximas sugestões

### 10.5 Sprint D (7 dias) — Calendário automático + Flashcards SRS

- [P0] Calendário de metas com geração automática semanal
  - Esforço: M
  - Aceite: cria blocos por disponibilidade e prioridade de matéria
- [P0] Motor SRS (`srs_cards`, `srs_reviews`) com algoritmo de repetição espaçada
  - Esforço: M
  - Aceite: agenda próxima revisão por desempenho em cada card
- [P1] UI de revisão diária por vencimento
  - Esforço: S
  - Aceite: fila diária mostra “devidos hoje”, “atrasados” e “novos”

### 10.6 Sprint E (7 dias) — Dashboard avançado + Sala ao vivo (beta)

- [P0] Dashboard analítico avançado (tendência, consistência, previsão)
  - Esforço: M
  - Aceite: gráficos carregam com dados reais e filtros por período
- [P1] Sala de estudos ao vivo (presença + status de foco)
  - Esforço: M
  - Aceite: usuários entram na sala, veem presença e estado de estudo em tempo real
- [P1] Moderação e limites iniciais de sala
  - Esforço: S
  - Aceite: limite de participantes por sala e controle mínimo de abuso

### 10.7 Critérios de pronto (DoD) para cada proposta

- Funcionalidade entregue com teste happy-path manual + teste automatizado crítico
- Evento analítico criado no PostHog (uso e conclusão da feature)
- Sem regressão em `build`, `test` e `lint`
- Critérios de aceite atendidos e documentados no changelog

### 10.8 Métricas de validação por feature (go/no-go)

- Banco de Questões: taxa de início de quiz >= 35% dos usuários ativos semanais
- Simulado: taxa de conclusão >= 60% dos iniciados
- Streak: aumento de retenção D7 em +5 p.p. após 2 semanas
- Mentor IA: CTR do card de recomendação >= 20%
- Calendário automático: >= 40% dos usuários com plano semanal criado
- Flashcards SRS: >= 3 sessões de revisão por usuário/semana
- Dashboard avançado: >= 30% de usuários ativos abrindo relatório semanal
- Sala ao vivo: >= 15% de usuários ativos participando 1x/semana

### 10.9 Bloco de execução imediata (hoje)

- [Hoje 1] Definir schema mínimo do Banco de Questões e criar migration SQL
- [Hoje 2] Implementar endpoint de seleção aleatória balanceada
- [Hoje 3] Montar tela inicial de simulado com cronômetro + submit



