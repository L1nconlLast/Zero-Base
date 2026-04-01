# Plano de Execução — Beta Fechado (5 Dias)

Objetivo: sair de build funcional para beta validado com uso real.

## Kanban da Semana (visão rápida)

### To Do
- [ ] D1: Onboarding 3 passos com CTA final
- [ ] D2: Empty states + CTA direto em Início/Academia/Dashboard
- [ ] D3: Feedback in-app + eventos mínimos
- [ ] D5: Landing + convites beta (20-50)

### Doing
- [ ] D4: Executar migrations da Academia no ambiente Supabase e validar scripts SQL de verificação
- [ ] D4: Rodar validação funcional pós-migration (anti-duplicação XP + bloqueio PRO)

### Done
- [x] Build de produção estável (`npm run build`)
- [x] Testes unitários estáveis (`npm test -- --run`)
- [x] Smoke E2E executado com sucesso
- [x] Hardening backend da Academia implementado (RPC + anti-duplicação + fallback)
- [x] Scripts de verificação SQL criados (completo, funcional e versão breve)
- [x] UX de timers unificada (aba Foco + design alinhado Pomodoro/Livre)

### Blocked
- [ ] Aplicar migration no projeto Supabase (depende de execução no ambiente remoto)
- [ ] Confirmar evidência de validação funcional no banco real após execução

---

## Regras de foco da semana

- Não adicionar feature nova fora do plano.
- Priorizar ativação, retenção inicial e estabilidade.
- Só avançar para o próximo dia após cumprir critérios de pronto.

---

## Dia 1 — Onboarding + Ativação Inicial

### Tarefas
- [ ] Criar onboarding em 3 passos:
  - [ ] Definir meta diária
  - [ ] Escolher método padrão
  - [ ] Iniciar primeira sessão guiada
- [ ] Salvar estado de conclusão do onboarding por usuário.
- [ ] Exibir CTA principal no fim do onboarding: "Começar sessão agora".

### Critérios de pronto
- [ ] Usuário novo conclui onboarding sem erro.
- [ ] Usuário chega ao timer em até 3 minutos.
- [ ] Estado de onboarding não reaparece indevidamente.

### Evidência
- [ ] Print do fluxo completo
- [ ] Vídeo curto (30-60s)

---

## Dia 2 — UX de Empty State + CTA útil

### Tarefas
- [ ] Ajustar empty states das páginas principais:
  - [ ] Início
  - [ ] Academia
  - [ ] Dashboard
- [ ] Cada estado vazio deve ter 1 ação clara e direta.
- [ ] Garantir consistência visual dos CTAs (label, tamanho, contraste).

### Critérios de pronto
- [ ] Nenhuma tela principal fica "morta" sem ação sugerida.
- [ ] CTA leva para o fluxo correto em 1 clique.

### Evidência
- [ ] Prints das 3 telas vazias com CTA

---

## Dia 3 — Feedback In-App + Métricas Mínimas

### Tarefas
- [ ] Adicionar botão "Enviar feedback" em ponto visível.
- [ ] Formulário curto com tipo:
  - [ ] Bug
  - [ ] Sugestão
  - [ ] Dificuldade de uso
- [ ] Instrumentar eventos mínimos:
  - [ ] cadastro_concluido
  - [ ] primeira_sessao_concluida
  - [ ] primeiro_conteudo_academia_concluido
  - [ ] retorno_d1

### Critérios de pronto
- [ ] Feedback chega em storage/canal definido.
- [ ] Eventos aparecem com dados mínimos (user_id, timestamp, evento).

### Evidência
- [ ] Log de eventos
- [ ] Exemplo real de feedback enviado

---

## Dia 4 — Estabilidade de Release

### Tarefas
- [ ] Rodar build de produção.
- [ ] Rodar testes unitários.
- [ ] Rodar smoke E2E.
- [ ] Validar migrations da Academia e scripts de verificação.
- [ ] Revisar fluxos críticos:
  - [ ] login/cadastro
  - [ ] foco (pomodoro/livre)
  - [ ] conclusão de conteúdo academia
  - [ ] atualização de XP e nível

### Critérios de pronto
- [ ] Sem erro crítico em fluxo principal.
- [ ] Sem regressão visível em timer/academia.

### Evidência
- [ ] Resultado de build/test/e2e
- [ ] Checklist funcional assinado

---

## Dia 5 — Landing Simples + Beta Fechado

### Tarefas
- [ ] Publicar landing de convite com:
  - [ ] proposta de valor clara
  - [ ] 3 benefícios
  - [ ] CTA de inscrição no beta
- [ ] Definir grupo inicial de 20-50 pessoas.
- [ ] Organizar canal de suporte rápido (WhatsApp/Discord/Email).
- [ ] Enviar convite com instruções de uso (2 minutos).

### Critérios de pronto
- [ ] Convites enviados.
- [ ] Primeiros usuários conseguem entrar e usar sem suporte síncrono.
- [ ] Coleta inicial de ativação e retorno D1 habilitada.

### Evidência
- [ ] URL da landing
- [ ] Lista de usuários convidados
- [ ] Print dos primeiros dados de uso

---

## Métricas de decisão (após 7 dias de beta)

- Ativação: % que conclui 1 sessão + 1 conteúdo da academia no primeiro dia.
- Retenção D1: % que retorna no dia seguinte.
- Bugs críticos: quantidade e tempo médio de resolução.
- Feedback qualitativo: principais 5 fricções reportadas.

## Regra para próximo passo

- Se ativação e retenção estiverem saudáveis: avançar para Stripe + analytics avançado.
- Se não estiverem: corrigir fricções de onboarding/fluxo principal antes de monetização.

---

## Status semanal

- Dia 1: [ ] Pendente [ ] Em andamento [ ] Concluído
- Dia 2: [ ] Pendente [ ] Em andamento [ ] Concluído
- Dia 3: [ ] Pendente [ ] Em andamento [ ] Concluído
- Dia 4: [ ] Pendente [ ] Em andamento [ ] Concluído
- Dia 5: [ ] Pendente [ ] Em andamento [ ] Concluído

Responsável:
Data de início:
Data de conclusão:

---

## Backlog pronto (GitHub Projects / Jira)

> Formato sugerido de status: `Backlog` → `In Progress` → `Review` → `Done`

### Epic BETA-ONB — Onboarding e Ativação (Dia 1)

- **BETA-ONB-01** — Implementar onboarding em 3 passos
  - Tipo: Story
  - Prioridade: P0
  - Aceite:
    - Fluxo possui 3 etapas (meta, método, primeira sessão)
    - Persistência por usuário
    - CTA final leva ao timer
- **BETA-ONB-02** — Persistir conclusão do onboarding
  - Tipo: Task
  - Prioridade: P0
  - Aceite: flag salva e respeitada no reload/login
- **BETA-ONB-03** — Smoke test de onboarding
  - Tipo: Task
  - Prioridade: P1
  - Aceite: fluxo completo em até 3 min sem erro

### Epic BETA-UX — Empty States e CTA útil (Dia 2)

- **BETA-UX-01** — Empty state da Home com ação primária
  - Tipo: Story
  - Prioridade: P0
  - Aceite: CTA abre fluxo correto em 1 clique
- **BETA-UX-02** — Empty state da Academia com ação primária
  - Tipo: Story
  - Prioridade: P0
  - Aceite: CTA direciona para primeiro conteúdo
- **BETA-UX-03** — Empty state do Dashboard com ação primária
  - Tipo: Story
  - Prioridade: P0
  - Aceite: CTA direciona para iniciar sessão
- **BETA-UX-04** — Padronizar visual dos CTAs
  - Tipo: Task
  - Prioridade: P1
  - Aceite: labels, contraste e tamanho consistentes

### Epic BETA-OBS — Feedback e Telemetria mínima (Dia 3)

- **BETA-OBS-01** — Botão e formulário de feedback in-app
  - Tipo: Story
  - Prioridade: P0
  - Aceite: categorias Bug/Sugestão/Dificuldade funcionando
- **BETA-OBS-02** — Instrumentar eventos críticos
  - Tipo: Story
  - Prioridade: P0
  - Eventos:
    - `cadastro_concluido`
    - `primeira_sessao_concluida`
    - `primeiro_conteudo_academia_concluido`
    - `retorno_d1`
  - Aceite: eventos com `user_id`, `timestamp`, `evento`
- **BETA-OBS-03** — Validação de logs e payload
  - Tipo: Task
  - Prioridade: P1
  - Aceite: log de evidência com exemplos reais

### Epic BETA-QA — Estabilidade de release (Dia 4)

- **BETA-QA-01** — Executar `build`, `test` e `smoke e2e`
  - Tipo: Task
  - Prioridade: P0
  - Aceite: tudo verde sem erro crítico
- **BETA-QA-02** — Aplicar migrations Academia no Supabase
  - Tipo: Task
  - Prioridade: P0
  - Aceite: scripts de verificação aprovados
- **BETA-QA-03** — Checklist funcional dos fluxos críticos
  - Tipo: Task
  - Prioridade: P0
  - Aceite: login/cadastro, timer, academia, XP/nível validados

### Epic BETA-GTM — Convite e operação do beta fechado (Dia 5)

- **BETA-GTM-01** — Publicar landing de convite
  - Tipo: Story
  - Prioridade: P0
  - Aceite: proposta + 3 benefícios + CTA de inscrição
- **BETA-GTM-02** — Organizar coorte de 20-50 usuários
  - Tipo: Task
  - Prioridade: P0
  - Aceite: lista final de convidados pronta
- **BETA-GTM-03** — Configurar canal de suporte rápido
  - Tipo: Task
  - Prioridade: P1
  - Aceite: canal testado e instruções enviadas
- **BETA-GTM-04** — Disparo de convites com guia de 2 minutos
  - Tipo: Task
  - Prioridade: P0
  - Aceite: convites enviados + confirmação de acesso inicial

### Template curto para cada card (copiar/colar)

```text
Título:
Tipo: Story | Task | Bug
Prioridade: P0 | P1 | P2
Descrição:
Critérios de aceite:
-
-
Evidências:
-
Dependências:
Estimativa:
Owner:
```

