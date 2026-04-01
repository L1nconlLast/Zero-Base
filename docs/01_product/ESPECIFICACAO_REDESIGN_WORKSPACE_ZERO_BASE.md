# Especificação de Redesign do Workspace Zero Base

## 1) Objetivo
Transformar o Zero Base da camada atual de "dashboard bonito e funcional" para um **workspace de estudo completo**, com arquitetura visual por módulos, leitura rápida de progresso e identidade mais forte por tela.

O redesign proposto não parte do zero. Ele aproveita a base já existente do shell, da navegação por domínios e dos módulos de estudo, reorganizando a experiência para ficar mais clara, mais densa em valor e mais memorável.

Data de referência: **27/03/2026**

---

## 2) Leitura Executiva
O app já tem fundamentos sólidos:
- shell estável;
- sidebar funcional;
- home com hero e cards de progresso;
- cronograma, foco, revisões e simulados conectados;
- linguagem mais premium do que as versões anteriores.

O gap atual não é estrutural. O gap é de **percepção de produto**:
- falta mais hierarquia visual;
- falta mais separação entre ação imediata e análise;
- falta mais densidade útil por tela;
- falta mais identidade por módulo;
- falta mais sensação de sistema completo.

Direção norte:

> O Zero Base deve parecer um **workspace de estudo orientado por execução, memória, progresso e análise**, e não apenas um conjunto de cards bonitos.

---

## 3) Princípios do Redesign

### 3.1) Ação antes de análise
Toda tela deve responder primeiro:
- o que fazer agora;
- por que isso importa;
- o que acontece depois.

Análise, histórico e profundidade continuam importantes, mas não podem competir com a ação principal.

### 3.2) Arquitetura visual por módulos
O app deve ser percebido como um sistema com áreas de função clara:
- estudar;
- planejar;
- revisar;
- simular;
- acompanhar;
- consolidar progresso.

### 3.3) Densidade útil
Reduzir áreas mortas e aumentar a relação entre espaço ocupado e utilidade percebida.

### 3.4) Hierarquia forte
Cada tela precisa ter:
- um bloco dominante;
- um fluxo principal;
- um segundo nível analítico;
- uma faixa lateral de insights ou contexto.

### 3.5) Identidade por domínio
Cada domínio precisa ter "cara própria" sem romper o sistema visual:
- `Início`: executivo e orientado a agora;
- `Plano`: estratégico e estrutural;
- `Estudo`: concentrado e operacional;
- `Revisões`: memória e urgência;
- `Simulados`: avaliação e comparação;
- `Progresso`: leitura, evidência e histórico.

---

## 4) Mapa Atual do App e Tradução para o Redesign

### Navegação atual do shell
Hoje o shell já agrupa a experiência em domínios:
- `Início`
- `Plano`
- `Estudo`
- `Revisões`
- `Simulados`
- `Progresso`
- `Mais`

### Mapeamento técnico atual
- `Início`: `inicio`
- `Plano`: `cronograma`, `metodos`, `departamento`, `arvore`
- `Estudo`: `foco`, `questoes`
- `Revisões`: `flashcards`, `vespera`
- `Simulados`: `simulado`
- `Progresso`: `dashboard`, `conquistas`
- `Mais`: `mentor`, `mentor-admin`, `grupos`, `ranking-global`, `configuracoes`, `dados`

### Tradução visual desejada
- `Início` vira o painel executivo do aluno.
- `Plano` vira o centro de organização do ciclo, da trilha e da distribuição de esforço.
- `Estudo` vira uma estação de execução.
- `Revisões` vira uma fila estratégica de retenção.
- `Simulados` vira um módulo analítico premium de avaliação.
- `Progresso` vira a memória consolidada do sistema.
- `Mais` continua existindo, mas não disputa atenção com o fluxo central.

---

## 5) Design System Global

## 5.1) Arquitetura de layout padrão
Sempre que fizer sentido, usar três zonas:

### Coluna esquerda
- identidade do workspace;
- navegação principal;
- ritmo da semana;
- atalhos contextuais.

### Coluna central
- conteúdo principal da tela;
- fluxo dominante;
- módulos de maior prioridade.

### Coluna direita
- insights;
- consistência;
- recomendações;
- IA;
- alertas;
- progresso lateral.

Observação: em mobile, a coluna direita vira bloco empilhado após o conteúdo principal.

## 5.2) Papéis de cor

### Navy
Usar para:
- shell premium;
- foco;
- IA;
- hero dominante;
- estados de profundidade.

### Mint / Teal
Usar para:
- progresso;
- sucesso;
- CTAs secundários fortes;
- barras;
- leituras de avanço.

### Lilás
Usar para:
- planejamento;
- revisão;
- contexto analítico;
- inteligência e leitura estratégica.

### Off-white
Usar para:
- fundo geral;
- superfícies amplas;
- reduzir sensação de cinza morto.

## 5.3) Tipografia
- títulos de página maiores e mais secos;
- labels pequenos em uppercase;
- subtextos curtos e orientados à ação;
- evitar frases genéricas em destaque;
- preferir texto operacional:
  - ruim: "controle sua rotina com um dashboard mais claro";
  - melhor: "Hoje você tem 3 blocos ativos e 1 revisão urgente".

## 5.4) Interações
- hover com elevação sutil nos cards;
- `active` com leve compressão nos botões;
- transições curtas entre `150ms` e `220ms`;
- barras e gráficos com entrada suave;
- item ativo da navegação com fundo, acento lateral e reforço do ícone.

## 5.5) Componentes compartilhados a extrair ou consolidar
- `WorkspacePageShell`
- `ActionHero`
- `InsightRail`
- `MetricStrip`
- `PriorityQueueCard`
- `ProgressCluster`
- `SectionTabs`
- `DisciplineBreakdown`
- `TimelineChart`
- `EmptyDepthState`

Esses componentes devem sustentar várias telas para evitar redesign isolado por página.

---

## 6) Especificação por Tela

## 6.1) Home
**Prioridade:** 1

### Objetivo da tela
Ser o painel executivo do aluno. A Home deve responder rapidamente:
- qual é o próximo bloco;
- quanto já foi feito hoje;
- o que falta nesta semana;
- onde está o risco principal.

### Estrutura ideal

#### Bloco 1 — Hero principal
- disciplina;
- assunto;
- duração;
- motivo da priorização;
- CTA principal forte;
- CTA secundário de planejamento;
- chips de contexto:
  - duração;
  - tipo da sessão;
  - prioridade;
  - meta do dia.

#### Bloco 2 — Plano do dia
- checklist do dia;
- o que já foi concluído;
- o que falta;
- tempo total;
- XP ou progresso diário;
- revisão sugerida.

#### Bloco 3 — Evolução da semana
- gráfico semanal;
- dia atual destacado;
- leitura curta do padrão:
  - semana equilibrada;
  - carga concentrada;
  - atraso acumulado.

#### Bloco 4 — Distribuição por disciplina
- donut ou barras;
- participação por matéria;
- matéria mais forte;
- matéria em risco;
- progresso por trilha.

#### Bloco 5 — Revisões do dia
- programadas;
- atrasadas;
- próximas;
- CTA de iniciar revisão.

#### Bloco 6 — Mentor IA
- card escuro;
- recomendação curta;
- ajuste sugerido;
- CTA pequeno de ação.

### Sinais visuais
- hero dominante na dobra;
- contraste alto no bloco principal;
- cards secundários mais compactos;
- reforço da sensação de avanço.

### Arquivos âncora
- `src/components/Dashboard/ZeroBaseRedesignHome.tsx`
- `src/App.tsx`
- `src/components/Dashboard/DashboardPage.tsx`

### Critérios de aceite
- o próximo passo é identificável em menos de 3 segundos;
- revisões urgentes ficam visíveis sem rolar demais;
- a Home comunica ação, progresso e contexto na mesma leitura.

---

## 6.2) Estudo / Foco
**Prioridade:** 1

### Objetivo da tela
Virar uma estação de execução. A tela precisa tirar atrito e sustentar o aluno durante a sessão.

### Estrutura ideal

#### Topo
- disciplina;
- assunto;
- método;
- objetivo da sessão;
- origem do bloco:
  - plano;
  - IA;
  - manual.

#### Centro
- timer principal;
- estado da sessão;
- ação atual;
- CTA dominante:
  - iniciar;
  - pausar;
  - concluir.

#### Bloco auxiliar
- o que vem depois;
- validação por questões;
- progresso do bloco;
- revisão associada;
- contexto rápido do conteúdo.

### Melhorias específicas
- método em chip, não em texto escondido;
- timer com mais presença visual;
- disciplina e assunto mais visíveis;
- sequência da sessão explícita:
  - foco;
  - prática;
  - revisão.

### Arquivos âncora
- `src/App.tsx` na área de `foco`
- `src/components/Study/StudyExecutionBanner.tsx`
- `src/components/Timer/StudyTimer.tsx`
- `src/components/Mvp/StudySessionPage.tsx`
- `src/components/Questions/QuizPage.tsx`

### Critérios de aceite
- o usuário sabe o que está estudando, por quanto tempo e o que vem depois;
- a sessão parece um fluxo, não uma página isolada com timer.

---

## 6.3) Planejamento
**Prioridade:** 1

### Objetivo da tela
Organizar a ordem dos estudos, o tempo por disciplina e o progresso do ciclo, sem competir com a execução principal.

### Estrutura ideal

#### Topo
- progresso do ciclo;
- horas do ciclo;
- ciclos completos;
- carga planejada vs executada.

#### Corpo principal
- sequência de estudos;
- barras por disciplina;
- tempo feito vs alvo;
- ações rápidas:
  - iniciar;
  - adicionar estudo;
  - ver últimos estudos.

#### Bloco lateral ou complementar
- rebalanceamento sugerido;
- carga da semana;
- recomendação do motor;
- alertas de desvio.

### Sinais visuais
- planejamento com identidade lilás + mint;
- leitura estrutural mais forte;
- listas mais amplas e menos "tabela pura".

### Arquivos âncora
- `src/components/Calendar/StudyScheduleCalendar.tsx`
- `src/components/Calendar/CronogramaSummary.tsx`
- `src/components/Calendar/TodayExecutionCard.tsx`
- `src/components/Calendar/UpcomingOperationalSchedule.tsx`
- `src/components/StudyMethods/StudyMethodHub.tsx`

### Critérios de aceite
- o aluno entende a ordem do estudo e o esforço restante;
- a tela ajuda a decidir, não só a editar.

---

## 6.4) Revisões
**Prioridade:** 2

### Objetivo da tela
Virar um módulo de retenção e urgência, com fila clara do que precisa ser retomado agora.

### Estrutura ideal

#### Tabs dominantes
- Programadas
- Atrasadas
- Ignoradas
- Concluídas

#### Lista de revisão
Cada item deve mostrar:
- data;
- disciplina;
- assunto;
- janela:
  - 1d;
  - 7d;
  - 14d;
  - 30d;
- ações:
  - iniciar;
  - adiar;
  - ignorar.

#### Bloco lateral
- taxa de conclusão;
- fila crítica;
- revisão mais atrasada;
- impacto na retenção.

### Sinais visuais
- urgência clara nas revisões vencidas;
- diferenciação visual entre estados;
- reforço de fila principal.

### Arquivos âncora
- `src/components/Flashcards/FlashcardsPage.tsx`
- `src/components/ExamPrep/EveOfExamPage.tsx`
- `src/App.tsx` no domínio `flashcards` e `vespera`

### Critérios de aceite
- revisões urgentes aparecem primeiro;
- o usuário entende o motivo de cada item;
- as ações são mais visíveis do que os filtros.

---

## 6.5) Simulados
**Prioridade:** 2

### Objetivo da tela
Ser o módulo de avaliação do aluno, com leitura rápida de evolução e profundidade por disciplina.

### Estrutura ideal

#### Topo
- total de simulados;
- último desempenho;
- média;
- evolução recente.

#### Centro
- gráfico grande com toggle:
  - desempenho;
  - pontuação.

#### Lista de simulados
Cada simulado deve mostrar:
- data;
- banca;
- tipo;
- duração;
- resultado geral;
- desempenho por disciplina.

### Bloco complementar
- disciplinas que mais caíram;
- disciplinas que mais subiram;
- sugestão de intervenção.

### Arquivos âncora
- `src/components/Questions/MockExam.tsx`
- `src/components/Questions/ExamResults.tsx`
- `src/App.tsx` na área `simulado`

### Critérios de aceite
- o histórico de simulados mostra tendência, não só registros soltos;
- o usuário consegue identificar onde melhorou e onde piorou.

---

## 6.6) Estatísticas / Progresso
**Prioridade:** 2

### Objetivo da tela
Mostrar evidência consolidada do que mudou no estudo, com filtros e blocos funcionais distintos.

### Estrutura ideal

#### Bloco 1 — Visão geral
- desempenho geral;
- tempo de estudo;
- constância;
- páginas lidas;
- videoaulas;
- progresso no conteúdo.

#### Bloco 2 — Evolução no tempo
- gráfico principal;
- leitura por período;
- filtro por plano, disciplina e janela temporal.

#### Bloco 3 — Comparativos
- hoje vs semana;
- semana atual vs anterior;
- disciplina forte vs disciplina em risco.

#### Bloco 4 — Insights
- gargalos;
- recomendação;
- leitura do padrão de estudo.

### Sinais visuais
- não transformar tudo em card igual;
- separar visão geral, evolução e comparação;
- filtros com presença real.

### Arquivos âncora
- `src/components/Dashboard/Dashboard.tsx`
- `src/components/Dashboard/StudyHeatmap.tsx`
- `src/components/Dashboard/WeeklyChartReal.tsx`
- `src/components/Dashboard/WeeklyReport.tsx`
- `src/components/Dashboard/MethodPerformance.tsx`
- `src/components/Dashboard/ProgressEmptyState.tsx`

### Critérios de aceite
- a tela responde "como estou?" e "onde estou travando?";
- os filtros mudam de fato a leitura e não ficam decorativos.

---

## 6.7) Histórico
**Prioridade:** 3

### Objetivo da tela
Dar profundidade e memória ao sistema, mostrando o que foi estudado por dia, por disciplina e com qual desempenho.

### Estrutura ideal

#### Topo
- horas líquidas;
- desempenho consolidado;
- volume de sessões;
- consistência acumulada.

#### Corpo
- histórico por disciplina;
- lista ou tabela de registros;
- data;
- categoria;
- duração;
- desempenho;
- material;
- vínculo com tópicos estudados.

### Complementos
- filtros por período;
- filtros por disciplina;
- agrupamento por dia e por matéria;
- link com revisões e simulados relacionados.

### Fontes atuais do produto
- sessões registradas;
- heatmap e visões históricas já existentes;
- dados usados em `dashboard`, `questões` e simulados.

### Critérios de aceite
- o usuário entende o que estudou, quando estudou e com que resultado;
- a tela deixa claro que o Zero Base "lembra" da jornada.

---

## 6.8) Edital Verticalizado / Progresso por Disciplina
**Prioridade:** 3

### Objetivo da tela
Virar um módulo de profundidade acadêmica, especialmente forte para concurso e estudo por trilha.

### Estrutura ideal

#### Topo
- progresso geral do edital;
- tópicos concluídos;
- tópicos pendentes;
- barra principal.

#### Blocos por disciplina
- recolhíveis;
- progresso da disciplina;
- desempenho por assunto;
- último estudo;
- material vinculado.

#### Tabela por assunto
- acertos;
- erros;
- total;
- percentual;
- progresso;
- último contato;
- link de material.

### Sinais visuais
- clareza por disciplina;
- menos cara de planilha crua;
- melhor leitura do que está atrasado ou negligenciado.

### Pontos de apoio atuais
- `departamento`
- `arvore`
- conteúdo orientado por edital na trilha de concurso

### Arquivos âncora
- `src/components/Dashboard/KnowledgeGenealogyTree.tsx`
- `src/App.tsx` nas áreas `departamento` e `arvore`

### Critérios de aceite
- o usuário entende o avanço global e o gargalo por disciplina;
- há conexão clara entre edital, progresso, desempenho e material.

---

## 7) Sidebar e Navegação

## 7.1) Estrutura recomendada

### Fluxo principal
- Início
- Plano
- Estudo
- Revisões

### Acompanhamento
- Simulados
- Estatísticas
- Histórico

### Sistema
- Mentor IA
- Configurações
- Dados

## 7.2) Regras visuais
- item ativo com fundo, acento lateral e ícone reforçado;
- grupos com títulos discretos;
- estados de hover mais vivos;
- evitar lista longa sem agrupamento.

## 7.3) Observação de produto
`Mentor IA` deve continuar aparecendo também como diferencial visual na Home e em faixas laterais, mesmo ficando fora do fluxo principal.

---

## 8) Ordem de Implementação Recomendada

## Sprint A — Arquitetura das telas principais
**Objetivo:** consolidar o coração da experiência.

### Escopo
- Home
- Estudo / Foco
- Planejamento

### Entregas
- hero e painel do dia mais fortes;
- estação de execução com timer e sequência;
- planejamento com leitura de ciclo e ordem de estudo;
- primeiros componentes compartilhados do novo sistema visual.

### Resultado esperado
O app deixa de parecer apenas um dashboard e passa a parecer um workspace de estudo com fluxo central claro.

---

## Sprint B — Módulos de acompanhamento
**Objetivo:** dar força analítica e sensação de produto completo.

### Escopo
- Revisões
- Simulados
- Estatísticas

### Entregas
- fila de revisão categorizada;
- simulados com evolução forte;
- estatísticas com visão geral, evolução e comparativos;
- filtros mais úteis;
- consistência visual por domínio.

### Resultado esperado
O usuário passa a confiar mais no sistema para acompanhar desempenho e retenção.

---

## Sprint C — Profundidade acadêmica
**Objetivo:** elevar o produto em profundidade, memória e diferenciação.

### Escopo
- Histórico
- Edital verticalizado
- materiais externos e vínculos por assunto

### Entregas
- histórico consolidado por disciplina;
- progresso por tópico;
- visão verticalizada por edital;
- links e materiais conectados ao que foi estudado.

### Resultado esperado
O Zero Base ganha profundidade comparável a produtos maduros de estudo orientado por trilha.

---

## 9) Backlog de Componentes Visuais

### Base de shell
- padronizar `WorkspacePageShell`;
- consolidar sidebar agrupada;
- consolidar topbar contextual.

### Componentes de ação
- `ActionHero`
- `SessionContextBar`
- `PrimaryDecisionCard`

### Componentes de progresso
- `ProgressCluster`
- `DisciplineBreakdown`
- `WeekPerformanceChart`
- `ConsistencyCard`

### Componentes de fila
- `ReviewQueueCard`
- `StudySequenceList`
- `MockExamHistoryCard`

### Componentes analíticos
- `InsightRail`
- `TrendSummary`
- `ComparativeMetrics`
- `FilterBar`

---

## 10) Critérios de Qualidade do Redesign

O redesign passa se:
- a ação principal de cada tela fica evidente;
- há leitura clara de progresso;
- a navegação parece mais organizada por função;
- a experiência fica mais densa sem ficar confusa;
- os módulos parecem partes de um mesmo sistema.

O redesign falha se:
- virar apenas troca de cor e card;
- aumentar a beleza sem melhorar leitura;
- deixar o fluxo principal escondido;
- criar telas bonitas, porém mais lentas de entender.

---

## 11) Recomendação Final
O caminho recomendado não é continuar refinando card por card isoladamente.

O caminho correto é:
1. redesenhar a arquitetura visual das telas principais;
2. consolidar componentes compartilhados;
3. levar a identidade por domínio para o resto do produto;
4. aprofundar histórico, edital e progresso por assunto após a base estar firme.

Resumo:

### Versão atual
Dashboard bonito e funcional.

### Próxima versão
Workspace de estudo completo, com:
- ação imediata;
- contexto;
- progresso;
- análise;
- memória;
- controle.

