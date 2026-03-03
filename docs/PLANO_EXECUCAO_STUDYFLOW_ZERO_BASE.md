# Plano de Execução — StudyFlow no Zero Base

## 1) Objetivo
Transformar a visão do produto StudyFlow em backlog implementável no projeto Zero Base, preservando o que já existe e priorizando entregas por fase.

---

## 2) Leitura Executiva
A proposta está sólida e cobre os pilares certos para um SaaS educacional:
- produto pessoal (estudo, metas, timer, histórico);
- colaboração (grupos, desafios, ranking);
- base de plataforma (auth, sync, offline, observabilidade);
- escalabilidade de negócio (admin, planos, billing).

No estado atual do Zero Base, parte do núcleo já está pronta (cronograma, foco, quiz, metas básicas, PWA base, integrações iniciais com Supabase). O gap principal está em **social**, **offline-first robusto**, **ranking competitivo multiusuário** e **camada SaaS completa**.

---

## 3) Matriz de Status (Visão rápida)

### Já existe (base pronta)
- Auth com Supabase (email/senha).
- Cronograma inteligente + grade editável.
- Foco (ENEM/Concurso/Híbrido), timer e registro de sessões.
- Quiz com filtros, histórico diário e streak.
- Metas e gamificação base (XP/ranks locais).
- PWA base e notificações iniciais.

### Parcial
- Sync em nuvem (alguns módulos).
- Backup/restore (fluxo local já presente; cloud full ainda parcial).
- Ranking (visão de progressão local, não competitivo global por período/turma).
- Lembretes (setup base existe, personalização avançada pendente).

### Não implementado
- OAuth Google/Facebook.
- Grupos de estudo (membership, papéis, convites).
- Chat em grupo realtime.
- Desafios coletivos e comparação entre membros.
- Ranking global/grupo semanal/mensal com top 10 real.
- Admin dashboard, monetização e billing.

---

## 4) Arquitetura-alvo (recomendada)
- Frontend atual pode evoluir em Vite+React (ou migrar para Next.js por etapa).
- Backend: Supabase (Postgres + Auth + Realtime + Storage + Edge Functions).
- Sync: estratégia offline-first com fila local + reconciliação por versão.
- Observabilidade: Sentry (erro) + session replay (opcional).
- CI/CD: GitHub Actions + deploy automático.

---

## 5) Backlog Priorizado por Fase

## Fase MVP SaaS (4 a 6 semanas)
### Objetivo
Fechar lacunas críticas de produto para uso real multi-dispositivo.

### Entregas
1. OAuth Google (Facebook opcional em seguida).
2. Sincronização de dados principais (perfil, metas, sessões, cronograma, quiz).
3. Política de conflito simples (last-write-wins + log de alterações).
4. Backup automático cloud por usuário.
5. Hardening de RLS e auditoria mínima.

### Critérios de aceite
- login social funcionando em produção;
- dados sincronizando entre 2 dispositivos de teste;
- modo offline com fila local e sync ao reconectar;
- testes e2e de login/sync/básico verdes.

---

## Fase Social v1 (6 a 8 semanas)
### Objetivo
Introduzir colaboração e engajamento comunitário.

### Entregas
1. Grupos de estudo (criar, entrar por link, papéis admin/member).
2. Chat em grupo realtime (texto + timestamps).
3. Desafios de grupo (meta coletiva + progresso).
4. Ranking por grupo (semanal/mensal/total).

### Critérios de aceite
- grupo ativo com 3+ membros e mensagens em tempo real;
- desafio coletivo atualizando progresso sem refresh;
- ranking por período consistente com dados persistidos.

---

## Fase Ranking & Gamificação v2 (4 a 6 semanas)
### Objetivo
Competição saudável com transparência de regras.

### Entregas
1. Ranking global + turma/grupo.
2. Badges top 10 (semanal/mensal).
3. Cálculo de pontos por regra formal versionada.
4. Histórico de posição por período.

### Critérios de aceite
- ranking reproduzível por query/documentação;
- top 10 exibindo badges e desempate definido;
- recalculo diário automático validado.

---

## Fase Plataforma SaaS (6+ semanas)
### Objetivo
Operação e monetização.

### Entregas
1. Admin dashboard (ativos, retenção, grupos, moderação).
2. Planos Free/Pro/Escola.
3. Billing (Stripe + Edge Functions).
4. Relatórios por turma/professor.

### Critérios de aceite
- assinatura e mudança de plano sem perda de dados;
- controle de limites por plano;
- trilha de auditoria para ações administrativas.

---

## 6) Modelo de Dados (incremental)
Aplicar por migrações versionadas no Supabase:
- `groups`, `group_members`, `messages`, `challenges`, `challenge_participants`, `rankings_periodic`.
- índices para consultas por período e grupo.
- RLS por owner/member/admin em cada domínio.

---

## 7) Segurança e Qualidade (obrigatório)
- RLS em todas as tabelas novas.
- Validação de payload (frontend e edge).
- Sanitização de conteúdo em chat.
- Rate limit em endpoints sensíveis.
- Cobertura de testes:
  - unitários: regras de pontuação/sync;
  - integração: auth + permissões;
  - e2e: fluxo principal de grupo/chat/ranking.

---

## 8) KPIs mínimos por fase
- D1/D7 retenção.
- sessões por usuário/semana.
- tempo médio estudado/semana.
- taxa de cumprimento de meta.
- % usuários em grupos ativos.
- latência de sync e taxa de conflito.

---

## 9) Riscos e mitigação
1. Complexidade de sync offline.
   - Mitigação: começar com last-write-wins + observabilidade.
2. Escala de ranking em tempo real.
   - Mitigação: agregações periódicas + cache.
3. Segurança em social/chat.
   - Mitigação: RLS + moderação + filtros de abuso.

---

## 10) Próximo passo recomendado (imediato)
Criar uma branch de execução da **Fase MVP SaaS** com 5 issues iniciais:
1. OAuth Google.
2. Tabela de sync log + versionamento de registros.
3. Serviço de sync unificado para módulos de estudo.
4. Backup automático cloud por usuário.
5. Testes e2e de multi-dispositivo (cenário mínimo).
