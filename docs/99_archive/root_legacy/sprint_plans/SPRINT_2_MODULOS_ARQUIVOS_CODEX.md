# Sprint 2 Modulos e Arquivos - Zero Base MVP v1

## 1. Objetivo da sprint
Fechar o loop `Home -> sessao -> resultado -> home atualizada`.

## 2. Escopo
### Entra
- criar sessao curta de estudo a partir da recomendacao atual ou fallback deterministico
- buscar questoes reais no banco
- registrar resposta por questao
- finalizar sessao uma unica vez
- calcular total, acertos e precisao
- atualizar `user_daily_progress`
- atualizar a Home com ultimo resultado e progresso basico
- manter o fluxo inteiro em API real + banco real

### Nao entra
- simulados
- ranking
- grupos
- planner
- IA conversacional
- gamificacao expandida
- ranking de desempenho
- analytics profundo
- novo redesign geral de interface

### Origem das questoes
- fonte obrigatoria: `public.questoes` + `public.alternativas`
- nao criar tabela paralela `questions`
- usar apenas questoes reais com alternativas reais no banco
- se a base remota nao tiver volume suficiente para a sessao curta, criar seed minima temporaria nas mesmas tabelas `public.questoes` e `public.alternativas`
- essa validacao da base de questoes e gate de P0; se nao houver questoes utilizaveis, a execucao nao deve seguir para frontend

## 3. Ordem operacional
### Etapa 1 - Banco
Tarefas:
- criar `study_sessions`
- criar `session_questions`
- criar `question_attempts`
- criar `user_daily_progress`
- criar indices minimos por `user_id`, `session_id` e `date`

Arquivos-alvo:
- `supabase/migrations/<timestamp>_study_sessions_mvp.sql`

Criterio binario:
- tabelas existem no banco real
- inserts e selects funcionam sem erro
- sessao pode ser criada e lida por `user_id`

### Etapa 2 - Endpoints
Tarefas:
- implementar `POST /api/study-sessions`
- implementar `GET /api/study-sessions/:sessionId`
- implementar `POST /api/study-sessions/:sessionId/answer`
- implementar `POST /api/study-sessions/:sessionId/finish`

Arquivos-alvo:
- `api/study-sessions/index.ts`
- `api/study-sessions/[sessionId].ts`
- `api/study-sessions/[sessionId]/answer.ts`
- `api/study-sessions/[sessionId]/finish.ts`

Criterio binario:
- todos respondem `200`/`4xx` controlado
- nenhum endpoint depende de mock ou `localStorage`
- `POST /api/study-sessions` retorna questoes reais do banco

### Etapa 3 - Logica de sessao
Tarefas:
- selecionar 5 questoes da recomendacao atual
- congelar composicao da sessao em `session_questions`
- impedir resposta duplicada por questao
- impedir finalizacao duplicada
- calcular `correct_answers` apenas no backend

Arquivos-alvo:
- `api/_lib/studySessions.ts`
- `api/_lib/progress.ts`

Criterio binario:
- sessao nasce como `active`
- cada questao pertence a uma sessao real
- cada resposta persiste uma vez
- resultado final bate com as tentativas gravadas

### Etapa 4 - Frontend
Tarefas:
- ligar o CTA `Comecar agora` da Home
- criar tela de sessao
- criar fluxo de resposta
- criar tela de resultado
- voltar para Home sem quebrar autenticacao nem onboarding

Arquivos-alvo:
- `src/components/Mvp/MvpAppShell.tsx`
- `src/components/Mvp/StudySessionPage.tsx`
- `src/components/Mvp/StudySessionResult.tsx`
- `src/services/mvpStudySessions.service.ts`
- `src/services/mvpApi.service.ts`

Criterio binario:
- o usuario sai da Home e entra na sessao
- responde as questoes
- ve resultado real
- volta para Home sem reload manual obrigatorio

### Etapa 5 - Progresso diario
Tarefas:
- acumular `questions_answered`
- acumular `correct_answers`
- criar ou atualizar linha do dia em `user_daily_progress`

Arquivos-alvo:
- `api/_lib/progress.ts`
- `api/study-sessions/[sessionId]/finish.ts`

Criterio binario:
- finalizar sessao cria ou atualiza progresso do dia
- repetir sessao no mesmo dia acumula, nao substitui

### Etapa 6 - Atualizacao da Home
Tarefas:
- fazer `/api/home` refletir ultimo resultado
- exibir progresso basico atualizado
- manter a missao do dia coerente apos concluir uma sessao

Arquivos-alvo:
- `api/home.ts`
- `api/_lib/mvp.ts`
- `src/components/Mvp/MvpAppShell.tsx`

Criterio binario:
- Home mostra ultimo resultado real
- Home mostra progresso atualizado apos concluir sessao
- sem fallback fake quando ja existe dado no banco

## 4. Quebra por modulo
### Modulo A - Banco e questoes
Entregas:
- migration das 4 tabelas da Sprint 2
- leitura de questoes em `public.questoes`
- leitura de alternativas em `public.alternativas`
- seed minima temporaria apenas se a base atual for insuficiente

Arquivos-alvo:
- `supabase/migrations/<timestamp>_study_sessions_mvp.sql`
- `supabase/seed.sql` ou seed equivalente ja usado no projeto
- `api/_lib/studySessions.ts`

Prioridade:
- P0

### Modulo B - Sessoes
Entregas:
- criar sessao
- congelar `session_questions`
- buscar sessao por id

Arquivos-alvo:
- `api/study-sessions/index.ts`
- `api/study-sessions/[sessionId].ts`
- `api/_lib/studySessions.ts`

Prioridade:
- P0

### Modulo C - Respostas
Entregas:
- registrar tentativa
- validar que a questao pertence a sessao
- calcular acerto no backend

Arquivos-alvo:
- `api/study-sessions/[sessionId]/answer.ts`
- `api/_lib/studySessions.ts`

Prioridade:
- P0

### Modulo D - Finalizacao
Entregas:
- fechar sessao
- calcular resultado
- atualizar `user_daily_progress`
- devolver payload de resultado

Arquivos-alvo:
- `api/study-sessions/[sessionId]/finish.ts`
- `api/_lib/progress.ts`
- `api/_lib/studySessions.ts`

Prioridade:
- P0

### Modulo E - Frontend do loop
Entregas:
- botao `Comecar agora`
- tela de questoes
- tela de resultado
- retorno para Home

Arquivos-alvo:
- `src/components/Mvp/MvpAppShell.tsx`
- `src/components/Mvp/StudySessionPage.tsx`
- `src/components/Mvp/StudySessionResult.tsx`
- `src/services/mvpStudySessions.service.ts`

Prioridade:
- P0

### Modulo F - Home e recomendacao pos-sessao
Entregas:
- refletir ultimo resultado
- refletir progresso do dia
- atualizar recomendacao de forma simples apenas depois que o loop principal estiver fechado

Arquivos-alvo:
- `api/home.ts`
- `api/_lib/mvp.ts`
- `src/components/Mvp/MvpAppShell.tsx`

Prioridade:
- P1

## 5. Arquivos-alvo
### Backend
- `api/study-sessions/index.ts`
- `api/study-sessions/[sessionId].ts`
- `api/study-sessions/[sessionId]/answer.ts`
- `api/study-sessions/[sessionId]/finish.ts`
- `api/_lib/studySessions.ts`
- `api/_lib/progress.ts`
- `api/home.ts`
- `api/_lib/mvp.ts`

### Banco
- `supabase/migrations/<timestamp>_study_sessions_mvp.sql`
- seed equivalente para `public.questoes` e `public.alternativas`, apenas se necessario

### Frontend
- `src/components/Mvp/MvpAppShell.tsx`
- `src/components/Mvp/StudySessionPage.tsx`
- `src/components/Mvp/StudySessionResult.tsx`
- `src/services/mvpStudySessions.service.ts`
- `src/services/mvpApi.service.ts`

## 6. Criterios de aceite
### Banco
- sessao criada no banco real
- `session_questions` gravadas no banco real
- `question_attempts` gravadas no banco real
- `user_daily_progress` atualizado no banco real

### API
- perguntas retornadas de forma real a partir de `public.questoes`
- resposta persiste uma unica vez por questao
- finalizacao acontece uma unica vez por sessao
- resultado retornado bate com as respostas persistidas

### Frontend
- `Comecar agora` funciona a partir da Home real
- usuario responde uma sessao curta inteira
- usuario ve resultado real
- usuario volta para Home com dados atualizados

### Aprovacao final
- o loop `Home -> sessao -> resultado -> home atualizada` fecha ponta a ponta sem mock e sem integracao pendente

## 7. Restricoes
- sem simulados
- sem ranking
- sem grupos
- sem planner
- sem IA avancada
- sem gamificacao expandida
- sem tabela paralela de questoes
- sem mock
- sem `localStorage` como fonte de verdade
- sem reaproveitar rotas legadas fora da superficie `api/` do MVP
- sem alterar Sprint 1 alem do necessario para refletir resultado e progresso da sessao

## 8. Task list para execucao
### P0
- validar que `public.questoes` + `public.alternativas` conseguem sustentar 5 questoes reais por sessao; se nao, criar seed minima nas mesmas tabelas
- criar migration de `study_sessions`, `session_questions`, `question_attempts`, `user_daily_progress`
- implementar `api/_lib/studySessions.ts`
- implementar `POST /api/study-sessions`
- implementar `GET /api/study-sessions/:sessionId`
- implementar `POST /api/study-sessions/:sessionId/answer`
- implementar `POST /api/study-sessions/:sessionId/finish`
- implementar `api/_lib/progress.ts`
- ligar `Comecar agora` na Home real
- criar tela de sessao
- criar tela de resultado
- garantir retorno para Home com progresso atualizado

### P1
- atualizar `/api/home` com ultimo resultado da sessao
- atualizar recomendacao de forma simples apos sessao concluida
- registrar riscos herdados da Sprint 1 se reaparecerem durante o loop de estudo

## 9. Regra de pronto da Sprint 2
- P0 precisa fechar completamente antes de qualquer tentativa de P1
- a Sprint 2 so vai para auditoria quando o usuario conseguir iniciar, responder e finalizar uma sessao real com persistencia real
- se a Home nao refletir o estado novo apos a sessao, a sprint ainda nao esta pronta

## 10. Prompt base para execucao
```text
Implemente a Sprint 2 do Zero Base MVP v1 com foco estrito no loop de estudo.

Objetivo:
fechar o loop Home -> sessao -> resultado -> home atualizada.

Fonte de questoes:
- reutilize public.questoes e public.alternativas
- nao crie tabela paralela de questoes
- se faltar volume minimo, crie seed temporaria nessas mesmas tabelas

Tarefas P0:
1. criar study_sessions, session_questions, question_attempts e user_daily_progress
2. implementar:
- POST /api/study-sessions
- GET /api/study-sessions/:sessionId
- POST /api/study-sessions/:sessionId/answer
- POST /api/study-sessions/:sessionId/finish
3. congelar questoes da sessao em session_questions
4. registrar respostas e calcular acertos no backend
5. finalizar sessao uma unica vez
6. atualizar user_daily_progress
7. ligar a Home ao fluxo:
- Comecar agora
- tela de questoes
- tela de resultado
- retorno para Home atualizada

Tarefas P1:
8. atualizar /api/home com ultimo resultado
9. atualizar recomendacao de forma simples apos a sessao

Restricoes:
- nao criar features fora da sprint
- nao usar mocks
- nao usar localStorage como verdade
- nao alterar Sprint 1 fora do necessario
- nao criar simulados, ranking, planner, IA avancada ou gamificacao expandida

Criterio de pronto:
o usuario deve conseguir iniciar, responder e finalizar uma sessao real, ver o resultado e voltar para a Home com dados atualizados no banco e na API.
```
