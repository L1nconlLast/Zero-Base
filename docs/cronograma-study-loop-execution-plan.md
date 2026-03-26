# Plano de Execucao: Cronograma + Para Estudar + Loop Real de Estudo

## Base

- Baseline funcional: `8a45221` (`release/stable-shell-runtime`)
- Higiene local aplicada em: `7e7ae9b` (`chore: ignore local deploy artifacts`)
- Premissa: nao reabrir `auth`, shell base, runtime da Vercel ou refactor estrutural grande.

## Objetivo do bloco

Transformar o shell real em um fluxo de estudo mais completo e evidente para o usuario, conectando:

1. o cronograma semanal ja persistido
2. a recomendacao oficial do backend
3. a abertura e conclusao de sessoes reais
4. o reflexo disso na home e no progresso

## Fonte de verdade

### Backend oficial

- `GET /api/home`
- `GET /api/recommendations/current`
- `POST /api/study-sessions`
- `GET/POST /api/study-sessions/:id/...`

### Persistencia de cronograma

- `study_blocks` via `src/services/studySchedule.service.ts`
- estado local/sync via `src/hooks/useStudySchedule.ts`

### Shell real atual

- home principal: `src/components/Dashboard/DashboardPage.tsx`
- orquestracao de tabs e estudo: `src/App.tsx`
- cronograma: `src/components/Calendar/StudyScheduleCalendar.tsx`
- estado do dia: `src/components/Calendar/TodayScheduleStatus.tsx`

## O que ja existe e deve ser reaproveitado

- `DashboardPage` ja tem CTA, secoes de resumo e navegacao para `cronograma`
- `StudyScheduleCalendar` ja persiste blocos reais e suporta ajuste manual/automatico
- `useStudySchedule` ja sincroniza local + cloud e atualiza `study_blocks`
- `api/home` ja entrega `mission`, `decision`, `weeklyProgress`, `lastSession` e `activeStudySession`
- `api/study-sessions` ja cria, retoma, responde e finaliza sessao curta oficial

## Lacuna atual

- o app real ainda nao usa o contrato oficial de `home/recommendation/study-session` como fluxo dominante
- cronograma e execucao ainda aparecem como blocos paralelos, nao como um ciclo unico
- a home ainda nao responde claramente a pergunta "o que estudar agora e por que"
- concluir uma sessao ainda nao fecha o ciclo visual no cronograma/home do shell real

## Escopo da Sprint 1

Objetivo: deixar visivel e acionavel o caminho principal "ver o que estudar -> iniciar sessao real".

### Entregas

1. Criar um client oficial para o shell real consumir `home`, `recommendation` e `study-sessions`.
2. Ligar a home real ao backend oficial, sem depender do `MvpAppShell`.
3. Exibir um card "Para estudar agora" na home com:
   - disciplina
   - topico
   - motivo da recomendacao
   - duracao estimada
   - CTA `Estudar agora`
4. Exibir um resumo de cronograma na home com:
   - sessoes planejadas na semana
   - sessoes concluidas
   - minutos da meta semanal
   - CTA para abrir o cronograma
5. Fazer o CTA abrir ou retomar a sessao oficial via `POST /api/study-sessions`.

### Arquivos provaveis

- `src/App.tsx`
- `src/components/Dashboard/DashboardPage.tsx`
- `src/services/mvpApi.service.ts` ou novo service neutro para o shell real
- `src/services/mvpStudySessions.service.ts` ou novo service neutro para o shell real

### Critério de aceite

- usuario autenticado abre `inicio` e ve "o que estudar agora" com dados oficiais do backend
- CTA inicia ou retoma uma sessao oficial
- se houver sessao ativa, a home mostra estado de continuidade em vez de iniciar outra
- o shell real nao usa mais o `MvpAppShell` para esse fluxo

## Escopo da Sprint 2

Objetivo: fechar o ciclo entre cronograma, sessao concluida e reflexo no app.

### Entregas

1. Ao concluir sessao real, atualizar a home sem refresh manual.
2. Refletir sessao concluida no cronograma do dia sempre que houver bloco compativel.
3. Exibir status por bloco/sessao:
   - pendente
   - concluido
   - atrasado
4. Destacar no cronograma o proximo bloco executavel do dia.
5. Mostrar no resumo da home:
   - ultimo resultado
   - progresso da semana
   - proximo foco apos concluir

### Regra minima de integracao

- primeiro usar o que ja existe em `study_blocks`
- se necessario, adicionar ligacao leve entre sessao e bloco planejado
- nao duplicar estado de progresso entre outra tabela nova e o cronograma atual

### Arquivos provaveis

- `src/App.tsx`
- `src/components/Calendar/StudyScheduleCalendar.tsx`
- `src/components/Calendar/TodayScheduleStatus.tsx`
- `src/hooks/useStudySchedule.ts`
- `api/home.ts` apenas se faltar payload para a home real

### Critério de aceite

- concluir sessao atualiza a home no mesmo fluxo
- cronograma mostra pelo menos um reflexo claro da execucao real do dia
- usuario entende o que foi feito e qual e o proximo passo sem navegar no escuro

## Escopo da Sprint 3

Objetivo: melhorar a inteligencia da priorizacao sem reabrir arquitetura.

### Entregas

1. Priorizar recomendacao por:
   - ponto fraco atual
   - recencia de estudo
   - consistencia da semana
   - aderencia ao cronograma do dia
2. Mostrar o motivo da decisao de forma curta na home.
3. Atualizar `nextFocus` com base no resultado recente das sessoes.
4. Evitar recomendar estudo fora do contexto do dia quando houver cronograma valido.

### Arquivos provaveis

- `api/_lib/mvp.ts`
- `api/_lib/studySessions.ts`
- `api/home.ts`
- `api/recommendations/current.ts`

### Critério de aceite

- a recomendacao muda de forma coerente depois da execucao
- a home explica por que aquilo esta sendo sugerido
- o cronograma deixa de ser apenas decorativo e passa a influenciar o foco do dia

## Ordem de implementacao recomendada

1. Promover os services do MVP para consumo do shell real.
2. Integrar `DashboardPage` ao contrato oficial de `home/recommendation`.
3. Integrar CTA principal ao `POST /api/study-sessions`.
4. Mostrar sessao ativa/retomada no shell real.
5. Fechar reflexo em cronograma e resumo semanal.
6. Refinar a decisao da recomendacao.

## Testes minimos por sprint

### Sprint 1

- login -> home real carrega card "Para estudar agora"
- CTA inicia sessao oficial
- sessao ativa reaparece ao voltar para a home

### Sprint 2

- concluir sessao atualiza home
- cronograma reflete conclusao do dia
- progresso semanal e ultimo resultado mudam sem inconsistencias

### Sprint 3

- recomendacao muda apos execucao recente
- motivo exibido bate com o estado do usuario
- sem divergencia entre `home`, `recommendation` e cronograma

## Fora de escopo

- mexer em `auth`
- mexer no shell/layout base
- reabrir pipeline/deploy
- criar backend paralelo
- refatorar metade do app antes de entregar valor visivel

## Definicao de pronto do bloco

- o usuario abre a home e entende claramente o que estudar agora
- o cronograma deixa de ser isolado e participa da execucao
- iniciar e concluir uma sessao real atualiza o produto de ponta a ponta
- `home`, recomendacao e sessao passam a operar como um loop unico
