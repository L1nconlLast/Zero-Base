# Sprint A — Backlog Técnico e Arquitetura de Componentes

## 1) Objetivo
Transformar a `Sprint A` do redesign em unidades técnicas implementáveis, com baixo risco de regressão e integração progressiva no app atual.

Escopo da sprint:
- `Home`
- `Estudo / Foco`
- `Planejamento`

Resultado esperado:
- 3 telas redesenhadas;
- 1 sistema de layout consistente para páginas centrais;
- componentes reutilizáveis;
- zero quebra do shell autenticado, auth e navegação principal.

Documento complementar de produto:
- `docs/ESPECIFICACAO_REDESIGN_WORKSPACE_ZERO_BASE.md`

---

## 2) Guardrails Técnicos da Sprint

## 2.1) O que esta sprint não deve fazer
- não trocar o shell autenticado inteiro de uma vez;
- não reescrever `App.tsx` em big bang;
- não duplicar cards e blocos com nomes diferentes para o mesmo papel visual;
- não introduzir labels hardcoded sem contrato de dados;
- não misturar redesign com refactor de auth, sync ou onboarding.

## 2.2) O que esta sprint deve preservar
- fluxo de login e logout;
- domínio atual da navegação:
  - `inicio`
  - `cronograma`
  - `foco`
  - `questoes`
- smoke da shell já existente;
- eventos principais de interação;
- persistência atual de sessão e preferências.

## 2.3) Regra de integração
O shell global continua em `src/App.tsx`.

Nesta sprint, o novo `WorkspaceLayout` será um **layout interno das telas centrais**, e não um substituto da casca autenticada inteira. Isso reduz regressão no menu, topbar, auth e rotas internas.

---

## 3) Diagnóstico Técnico Atual

## 3.1) Home
Estado atual:
- a Home premium já foi iniciada em `src/components/Dashboard/ZeroBaseRedesignHome.tsx`;
- o componente ainda concentra vários blocos internos na mesma implementação;
- a coluna direita ainda não está formalizada como componente reutilizável.

Leitura:
- a Home já está visualmente mais forte;
- o próximo passo é extrair blocos em componentes com contratos estáveis.

## 3.2) Foco / Estudo
Estado atual:
- a tela de `foco` ainda vive majoritariamente em `src/App.tsx`;
- `StudyExecutionBanner`, configuração de trilha, explicação do método, `ModeSelector`, `PomodoroTimer` e `StudyTimer` estão acoplados na mesma árvore;
- isso dificulta evolução visual e manutenção.

Leitura:
- o domínio de execução precisa sair do `App.tsx` para uma página própria composta por blocos menores.

## 3.3) Planejamento
Estado atual:
- `StudyScheduleCalendar` já concentra muito do valor funcional;
- hoje a tela de planejamento ainda combina banner + cronograma + contexto direto em `App.tsx`;
- falta uma camada de composição visual por módulos.

Leitura:
- o cronograma não precisa ser refeito;
- ele precisa ser enquadrado por uma página melhor organizada.

---

## 4) Bugs e Débitos Conhecidos que entram na Sprint

## 4.1) Bug do modo de foco
Constatação real do código:
- `StudyMode` hoje é `pomodoro | livre` em `src/App.tsx`;
- `ModeSelector` também só suporta `pomodoro | livre` em `src/components/Timer/ModeSelector.tsx`.

Impacto:
- o sistema ainda não modela formalmente:
  - `pomodoro`
  - `timer`
  - `stopwatch`

Decisão da sprint:
- expandir o modo para um contrato explícito de três estados;
- separar o conceito de "timer livre" e "cronômetro";
- evitar fallback implícito para `pomodoro`.

## 4.2) Bug / risco de disciplina exibida errada
Constatação real do código:
- o fluxo atual passa por:
  - `effectiveStudyExecutionState.currentBlock.subject`
  - `currentBlockDisplayLabel`
  - `getCycleSubjectByDisplayLabel(...)`
  - `preferredSubject` em `StudyTimer`
  - `displaySubjectLabel` em `StudyTimer`
- `StudyTimer` também possui `selectedSubject` interno com default `'Anatomia'`.

Impacto:
- existe risco de divergência entre:
  - disciplina interna persistida;
  - label renderizada;
  - disciplina realmente selecionada para a sessão.

Decisão da sprint:
- centralizar o contrato de disciplina do foco;
- parar de depender de inferência visual para reconstruir subject;
- garantir fluxo:
  - ação do usuário → estado da sessão → props do timer → render.

## 4.3) Débito estrutural
`App.tsx` concentra demais:
- composição visual;
- controle de fluxo;
- estado de execução;
- render das páginas.

Decisão da sprint:
- extrair páginas compostas por domínio, sem quebrar as integrações existentes.

---

## 5) Arquitetura-Alvo da Sprint A

## 5.1) Estratégia
Não substituir tudo de uma vez.

Faremos em três camadas:

### Camada 1 — Fundação
- layout interno de páginas;
- trilho direito reutilizável;
- contratos compartilhados.

### Camada 2 — Página por domínio
- `HomeWorkspacePage`
- `FocusWorkspacePage`
- `PlanningWorkspacePage`

### Camada 3 — Blocos reutilizáveis
- hero;
- cards operacionais;
- gráficos;
- fila de revisão;
- contexto da sessão;
- progresso do ciclo.

---

## 5.2) Estrutura de pastas recomendada

### Fundação
- `src/components/Workspace/WorkspaceLayout.tsx`
- `src/components/Workspace/RightPanel.tsx`
- `src/components/Workspace/WorkspaceSection.tsx`
- `src/components/Workspace/workspace.types.ts`

### Home
- `src/components/Home/HomeWorkspacePage.tsx`
- `src/components/Home/NextStepHero.tsx`
- `src/components/Home/DayExecutionCard.tsx`
- `src/components/Home/WeeklyProgressChart.tsx`
- `src/components/Home/DisciplineDistribution.tsx`
- `src/components/Home/ReviewQueueCard.tsx`
- `src/components/Home/MentorInsightCard.tsx`

### Foco
- `src/components/Focus/FocusWorkspacePage.tsx`
- `src/components/Focus/FocusSessionLayout.tsx`
- `src/components/Focus/FocusModeSelector.tsx`
- `src/components/Focus/FocusTimerShell.tsx`
- `src/components/Focus/SessionContextCard.tsx`
- `src/components/Focus/NextStepPreview.tsx`
- `src/components/Focus/focus.types.ts`

### Planejamento
- `src/components/Planning/PlanningWorkspacePage.tsx`
- `src/components/Planning/StudyCycleProgress.tsx`
- `src/components/Planning/StudySequenceList.tsx`
- `src/components/Planning/LoadBalancePanel.tsx`
- `src/components/Planning/planning.types.ts`

### Adaptadores de integração
- `src/components/Focus/focusMappers.ts`
- `src/components/Planning/planningMappers.ts`
- `src/components/Home/homeMappers.ts`

Observação:
- `ZeroBaseRedesignHome.tsx` pode ser mantido como ponte temporária ou ser absorvido pelo novo `HomeWorkspacePage`.

---

## 6) Contratos de Dados e Props

## 6.1) Contrato base do layout

### `WorkspaceLayout.tsx`
Responsabilidade:
- compor coluna principal + trilho direito;
- controlar espaçamento e empilhamento responsivo;
- não conhecer regra de negócio.

Props sugeridas:

```ts
type WorkspaceLayoutProps = {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  maxWidth?: 'wide' | 'xl';
  contentClassName?: string;
};
```

## 6.2) Trilho direito reutilizável

### `RightPanel.tsx`
Responsabilidade:
- compor blocos laterais padrão:
  - consistência
  - Mentor IA
  - alertas
  - progresso semanal

Props sugeridas:

```ts
type RightPanelProps = {
  consistency?: {
    percent: number;
    streak: number;
    todayMinutes: number;
    dailyGoalMinutes: number;
    syncLabel: string;
    syncTone: 'success' | 'warning' | 'danger' | 'neutral';
  };
  mentor?: {
    title: string;
    summary: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  alerts?: Array<{
    id: string;
    tone: 'info' | 'warning' | 'danger';
    label: string;
    detail: string;
  }>;
  weeklyStatus?: {
    completedSessions: number;
    plannedSessions: number;
  };
};
```

## 6.3) Home

### `NextStepHero.tsx`
Responsabilidade:
- renderizar a decisão principal da Home.

Props sugeridas:

```ts
type NextStepHeroProps = {
  title: string;
  subject: string;
  topic: string;
  duration: number;
  reason: string;
  tags: string[];
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};
```

### `DayExecutionCard.tsx`
Responsabilidade:
- mostrar checklist do dia e progresso operacional.

Props sugeridas:

```ts
type DayExecutionCardProps = {
  items: Array<{
    id: string;
    label: string;
    done: boolean;
  }>;
  todayMinutes: number;
  dailyGoalMinutes: number;
  totalPoints: number;
};
```

### `WeeklyProgressChart.tsx`
Responsabilidade:
- gráfico semanal com destaque do dia atual.

Props sugeridas:

```ts
type WeeklyProgressPoint = {
  key: string;
  label: string;
  minutes: number;
  isToday: boolean;
};

type WeeklyProgressChartProps = {
  points: WeeklyProgressPoint[];
  plannedSessions: number;
  completedSessions: number;
};
```

### `DisciplineDistribution.tsx`
Responsabilidade:
- mostrar distribuição por disciplina.

Props sugeridas:

```ts
type DisciplineDistributionItem = {
  id: string;
  label: string;
  minutes: number;
  progressPercent: number;
  colorHex: string;
};

type DisciplineDistributionProps = {
  items: DisciplineDistributionItem[];
  strongestLabel?: string;
  weakestLabel?: string;
  onOpenTrail?: () => void;
};
```

### `ReviewQueueCard.tsx`
Responsabilidade:
- resumir revisões críticas do dia.

Props sugeridas:

```ts
type ReviewQueueItem = {
  id: string;
  title: string;
  whenLabel: string;
  cadenceLabel: string;
  priority: 'high' | 'medium' | 'low';
};

type ReviewQueueCardProps = {
  items: ReviewQueueItem[];
  overdueCount?: number;
  onStartReview: () => void;
};
```

### `MentorInsightCard.tsx`
Responsabilidade:
- destacar uma recomendação curta do Mentor IA.

Props sugeridas:

```ts
type MentorInsightCardProps = {
  title: string;
  summary: string;
  recommendation: string;
  actionLabel?: string;
  onAction?: () => void;
};
```

## 6.4) Foco

### `FocusWorkspacePage.tsx`
Responsabilidade:
- compor a tela de execução;
- receber dados prontos do `App.tsx`;
- delegar timers e blocos auxiliares.

Props sugeridas:

```ts
type FocusSessionMode = 'pomodoro' | 'timer' | 'stopwatch';

type FocusSubjectContext = {
  subjectId: import('../../types').MateriaTipo;
  subjectLabel: string;
  topicName?: string;
  objective: string;
  durationMinutes: number;
  source: 'manual' | 'plan' | 'ai';
};

type FocusWorkspacePageProps = {
  mode: FocusSessionMode;
  onModeChange: (mode: FocusSessionMode) => void;
  context: FocusSubjectContext;
  preferredTrack: 'enem' | 'concursos' | 'hibrido';
  hybridEnemWeight: number;
  selectedMethodId: string;
  quickStartSignal?: number;
  userEmail?: string;
  onFinishSession: (minutes: number, subject: import('../../types').MateriaTipo) => void;
  onOpenPlanning?: () => void;
  onStartQuestions?: () => void;
};
```

### `FocusModeSelector.tsx`
Responsabilidade:
- substituir `ModeSelector`;
- suportar três modos reais.

Props sugeridas:

```ts
type FocusModeSelectorProps = {
  currentMode: FocusSessionMode;
  onModeChange: (mode: FocusSessionMode) => void;
  disabled?: boolean;
};
```

### `FocusTimerShell.tsx`
Responsabilidade:
- resolver qual engine visual abrir:
  - `PomodoroTimer`
  - `StudyTimer` em modo `timer`
  - `StudyTimer` em modo `stopwatch` ou componente novo, se necessário.

Props sugeridas:

```ts
type FocusTimerShellProps = {
  mode: FocusSessionMode;
  subject: FocusSubjectContext;
  preferredTrack: 'enem' | 'concursos' | 'hibrido';
  hybridEnemWeight: number;
  selectedMethodId: string;
  quickStartSignal?: number;
  userEmail?: string;
  onSelectMethod: (methodId: string) => void;
  onFinishSession: (minutes: number, subject: import('../../types').MateriaTipo) => void;
};
```

### `SessionContextCard.tsx`
Responsabilidade:
- mostrar disciplina, assunto, método, objetivo e origem.

Props sugeridas:

```ts
type SessionContextCardProps = {
  subjectLabel: string;
  topicName?: string;
  objective: string;
  methodLabel: string;
  sourceLabel: 'Manual' | 'Plano' | 'IA';
  durationMinutes: number;
};
```

### `NextStepPreview.tsx`
Responsabilidade:
- indicar o que vem depois do foco:
  - prática;
  - revisão;
  - ajuste do plano.

Props sugeridas:

```ts
type NextStepPreviewProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};
```

## 6.5) Planejamento

### `PlanningWorkspacePage.tsx`
Responsabilidade:
- empacotar o banner e os módulos de planejamento sem duplicar lógica do cronograma.

Props sugeridas:

```ts
type PlanningWorkspacePageProps = {
  hero: {
    currentBlockLabel: string;
    durationMinutes: number;
    sourceLabel: string;
    onExecuteToday: () => void;
  };
  cycle: {
    completedSessions: number;
    plannedSessions: number;
    currentWeekLabel?: string;
  };
  sequence: Array<{
    id: string;
    label: string;
    plannedMinutes: number;
    completedMinutes: number;
    status: 'current' | 'done' | 'pending';
  }>;
  onOpenRebalance?: () => void;
  calendar: React.ReactNode;
};
```

### `StudyCycleProgress.tsx`
Responsabilidade:
- mostrar progresso do ciclo e volume total.

### `StudySequenceList.tsx`
Responsabilidade:
- mostrar a ordem dos blocos com tempo feito vs planejado.

### `LoadBalancePanel.tsx`
Responsabilidade:
- mostrar carga da semana e CTA de rebalanceamento.

---

## 7) Integração com o Código Atual

## 7.1) Fundação

### Arquivos a tocar
- `src/App.tsx`
- novos arquivos em `src/components/Workspace`

### Ação
- manter o shell atual;
- usar `WorkspaceLayout` dentro das páginas `inicio`, `foco` e `cronograma`.

### Critério
- zero alteração do menu lateral global;
- zero alteração do header global nesta fase.

## 7.2) Home

### Arquivos a tocar
- `src/components/Dashboard/ZeroBaseRedesignHome.tsx`
- novos arquivos em `src/components/Home`
- `src/App.tsx`

### Estratégia
- extrair blocos da Home atual;
- manter as mesmas fontes de dados;
- trocar apenas composição, não a origem da informação.

### Critério
- CTA principal continua navegando;
- cards mantêm estado e métricas;
- smoke visual da Home segue verde.

## 7.3) Foco

### Arquivos a tocar
- `src/App.tsx`
- `src/components/Timer/ModeSelector.tsx`
- `src/components/Timer/StudyTimer.tsx`
- novos arquivos em `src/components/Focus`

### Estratégia
- criar `FocusWorkspacePage`;
- mover a composição visual do `foco` para fora do `App.tsx`;
- manter `PomodoroTimer` e `StudyTimer` como engines existentes;
- introduzir modo formal de três estados.

### Critério
- troca de modo funciona;
- disciplina mostrada acompanha o estado da sessão;
- sessão em andamento ainda impede troca indevida de modo.

## 7.4) Planejamento

### Arquivos a tocar
- `src/App.tsx`
- `src/components/Calendar/StudyScheduleCalendar.tsx`
- novos arquivos em `src/components/Planning`

### Estratégia
- criar `PlanningWorkspacePage`;
- enquadrar `StudyScheduleCalendar` dentro do novo layout;
- não reescrever a lógica de cronograma nesta sprint.

### Critério
- o planejamento fica mais legível sem perder edição e geração automática.

---

## 8) Ordem de Implementação

## Etapa 1 — Fundação
- criar `WorkspaceLayout`;
- criar `RightPanel`;
- criar `workspace.types.ts`;
- integrar internamente na Home.

## Etapa 2 — Home
- extrair `NextStepHero`;
- extrair `DayExecutionCard`;
- extrair `WeeklyProgressChart`;
- extrair `DisciplineDistribution`;
- extrair `ReviewQueueCard`;
- extrair `MentorInsightCard`;
- criar `HomeWorkspacePage`.

## Etapa 3 — Foco
- criar `focus.types.ts`;
- criar `FocusModeSelector`;
- expandir `StudyMode` para `FocusSessionMode`;
- criar `FocusTimerShell`;
- corrigir fluxo da disciplina;
- criar `SessionContextCard`;
- criar `NextStepPreview`;
- criar `FocusWorkspacePage`.

## Etapa 4 — Planejamento
- criar `planning.types.ts`;
- criar `StudyCycleProgress`;
- criar `StudySequenceList`;
- criar `LoadBalancePanel`;
- criar `PlanningWorkspacePage`;
- encaixar `StudyScheduleCalendar`.

---

## 9) Sequência de Refactor no `App.tsx`

## 9.1) Home
Troca segura:
- antes: `activeTab === 'inicio'` monta tudo diretamente via componente monolítico;
- depois: `activeTab === 'inicio'` monta `HomeWorkspacePage`.

## 9.2) Foco
Troca segura:
- antes: `activeTab === 'foco'` contém composição extensa inline;
- depois: `activeTab === 'foco'` delega para `FocusWorkspacePage`.

## 9.3) Planejamento
Troca segura:
- antes: `activeTab === 'cronograma'` compõe banner + cronograma;
- depois: `activeTab === 'cronograma'` delega para `PlanningWorkspacePage`.

Meta:
- `App.tsx` passa a orquestrar estado e handlers;
- páginas compostas assumem layout e apresentação.

---

## 10) Plano de Testes da Sprint A

## 10.1) Build e smoke
Rodar ao fim de cada etapa:
- `npm run build`
- `node scripts/run-real-shell-local-smoke.mjs`

## 10.2) Testes focados
Adicionar ou atualizar:
- teste de mapeamento de disciplina do foco;
- teste de modo do timer;
- teste de render da Home com hero pronto e estado vazio;
- teste da página de planejamento com sequência e ciclo.

Arquivos sugeridos:
- `src/tests/focusModeSelector.test.tsx`
- `src/tests/focusSubjectMapping.test.ts`
- `src/tests/HomeWorkspacePage.test.tsx`
- `src/tests/PlanningWorkspacePage.test.tsx`

## 10.3) Critérios mínimos de não regressão
- login continua funcionando;
- CTA principal da Home abre o fluxo de estudo;
- sidebar continua navegando;
- `foco` abre com disciplina coerente;
- modo ativo do timer troca corretamente;
- cronograma continua editável;
- published smoke continua compatível.

---

## 11) Checklist de Implementação

### Fundação
- [ ] `WorkspaceLayout` criado
- [ ] `RightPanel` criado
- [ ] integração inicial na Home

### Home
- [ ] `HomeWorkspacePage` criado
- [ ] hero extraído
- [ ] bloco do dia extraído
- [ ] gráfico semanal extraído
- [ ] distribuição por disciplina extraída
- [ ] fila de revisão extraída
- [ ] card do Mentor IA extraído

### Foco
- [ ] contrato `FocusSessionMode` criado
- [ ] `FocusModeSelector` criado
- [ ] `StudyMode` migrado
- [ ] bug de modo tratado
- [ ] bug de disciplina tratado
- [ ] `FocusWorkspacePage` integrado

### Planejamento
- [ ] `PlanningWorkspacePage` criado
- [ ] progresso do ciclo criado
- [ ] sequência criada
- [ ] balanceamento criado
- [ ] cronograma encaixado no novo layout

---

## 12) Decisão Final da Sprint
Antes de continuar com implementação visual ampla, a prioridade correta é:

1. consolidar a fundação de layout;
2. extrair blocos da Home;
3. resolver o domínio de Foco com contrato correto de modo e disciplina;
4. enquadrar Planejamento em uma página mais forte sem reescrever a lógica.

Resumo:

### O que esta sprint entrega
- arquitetura executável;
- backlog técnico claro;
- base segura para codar.

### O que ela evita
- regressão visual aleatória;
- inconsistência entre telas;
- redesign bonito, mas acoplado e frágil.

