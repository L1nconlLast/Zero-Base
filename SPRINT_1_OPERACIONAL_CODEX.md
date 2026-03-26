# Sprint 1 Operacional — Zero Base MVP v1

## 1. Objetivo da sprint

A Sprint 1 deve entregar o primeiro coracao funcional do MVP:

> usuario cria conta -> faz onboarding -> sistema gera recomendacao inicial -> Home mostra missao do dia real

Nada alem disso e prioridade nesta sprint.

## 2. Escopo

### O que entra

#### Backend

- schema inicial do banco
- seeds de disciplinas, topicos e questoes iniciais
- auth basico
- endpoint de onboarding
- geracao de recomendacao inicial
- endpoint `/api/home`
- endpoint `/api/recommendations/current`
- endpoint `/api/me`

#### Frontend

- telas de registro/login
- onboarding
- home com missao do dia
- loading/error/empty states minimos

### O que nao entra

- sessao completa de estudo
- progresso avancado
- gamificacao completa
- simulados
- ranking
- grupos
- IA conversacional
- planner
- redesign avancado
- perfil completo

## 3. Ordem operacional

A ordem importa.
Nao deixar o Codex pular etapas.

### Etapa 1 — Base do projeto e banco

Tarefas:

1. configurar conexao com banco
2. criar migration inicial
3. criar seeds:
   disciplinas
   topicos
   questoes minimas
4. criar camada de acesso a dados

Modulos/arquivos esperados:

- `src/lib/db/*`
- migrations do banco
- seeds do banco

Criterio de aceite:

- banco sobe sem erro
- disciplinas, topicos e questoes podem ser consultados

### Etapa 2 — Auth basico

Tarefas:

1. criar registro
2. criar login
3. persistir sessao
4. criar `GET /api/me`

Rotas:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`

Arquivos/modulos esperados:

- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/me/route.ts`
- `src/lib/auth/*`

Criterio de aceite:

- usuario consegue criar conta
- usuario consegue logar
- `/api/me` retorna usuario autenticado

### Etapa 3 — Onboarding

Tarefas:

1. criar tabela e persistencia de `user_profiles`
2. criar endpoint `POST /api/onboarding`
3. validar payload
4. criar tela de onboarding
5. salvar:
   nivel
   horas semanais
   objetivo
   disciplinas fracas

Rotas:

- `POST /api/onboarding`
- `GET /api/profile`
- `PATCH /api/profile` pode ficar preparado, mas nao precisa estar completo agora

Arquivos/modulos esperados:

- `src/app/api/onboarding/route.ts`
- `src/app/api/profile/route.ts`
- `src/modules/onboarding/*`
- `src/lib/validations/onboarding.ts`

Criterio de aceite:

- onboarding salva corretamente
- usuario nao onboardado e redirecionado para onboarding
- usuario onboardado segue para Home

### Etapa 4 — Motor de recomendacao inicial

Tarefas:

1. criar logica de recomendacao inicial
2. usar preferencias do onboarding
3. criar registro em `user_recommendations`
4. garantir apenas uma recomendacao ativa inicial por usuario

Regra da recomendacao inicial:

- se o usuario marcou disciplinas fracas, escolher uma delas
- escolher um topico inicial daquela disciplina
- gerar motivo simples
- salvar recomendacao ativa

Arquivos/modulos esperados:

- `src/modules/recommendations/*`
- `src/app/api/recommendations/current/route.ts`

Criterio de aceite:

- usuario recem-onboardado sempre recebe recomendacao real
- recomendacao nao e mock
- recomendacao vem do banco

### Etapa 5 — Home com missao do dia

Tarefas:

1. criar endpoint `/api/home`
2. montar payload real:
   nome do usuario
   missao do dia
   motivo
   progresso basico zerado ou real
   bloco de gamificacao inicial
3. criar tela Home
4. exibir CTA `Comecar agora` mesmo que a sessao ainda nao esteja implementada

Rotas:

- `GET /api/home`
- `GET /api/recommendations/current`

Arquivos/modulos esperados:

- `src/app/api/home/route.ts`
- `src/app/(app)/home/page.tsx` ou equivalente
- `src/modules/home/*`

Criterio de aceite:

- home abre com dados reais
- missao do dia e coerente com a recomendacao
- estado vazio so aparece se houver erro de onboarding/recomendacao

### Etapa 6 — Estados minimos de UX

Tarefas:

1. loading state no login
2. loading state no onboarding
3. loading state na home
4. error state padronizado
5. empty state minimo se recomendacao nao existir
6. mensagens curtas e claras

Criterio de aceite:

- nao existe tela quebrada
- nao existe tela crua sem estado
- nao existe erro tecnico exposto ao usuario

## 4. Quebra por modulo

### Modulo A — Banco / dados

Entregas:

- migration inicial
- seed inicial
- helpers de acesso ao banco

Arquivos alvo:

- `prisma/schema.prisma` ou `src/lib/db/schema.ts`
- `prisma/seed.ts` ou arquivo equivalente
- `src/lib/db/client.ts`

Prioridade:

**P0**

### Modulo B — Autenticacao

Entregas:

- registro
- login
- sessao
- `/api/me`

Arquivos alvo:

- `src/lib/auth/auth-service.ts`
- `src/lib/auth/session.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/me/route.ts`

Prioridade:

**P0**

### Modulo C — Onboarding

Entregas:

- validacao de dados
- persistencia do perfil
- fluxo frontend do onboarding

Arquivos alvo:

- `src/modules/onboarding/onboarding-service.ts`
- `src/modules/onboarding/onboarding-repository.ts`
- `src/lib/validations/onboarding.ts`
- `src/app/api/onboarding/route.ts`
- tela de onboarding

Prioridade:

**P0**

### Modulo D — Recomendacao inicial

Entregas:

- servico deterministico
- criacao da recomendacao ativa
- endpoint para leitura

Arquivos alvo:

- `src/modules/recommendations/recommendation-service.ts`
- `src/modules/recommendations/recommendation-repository.ts`
- `src/app/api/recommendations/current/route.ts`

Prioridade:

**P0**

### Modulo E — Home

Entregas:

- endpoint `/api/home`
- tela home
- renderizacao da missao do dia

Arquivos alvo:

- `src/modules/home/home-service.ts`
- `src/app/api/home/route.ts`
- `src/app/(app)/home/page.tsx`

Prioridade:

**P0**

### Modulo F — UX states

Entregas:

- loading
- error
- empty
- redirect de fluxo

Arquivos alvo:

- componentes compartilhados de estado
- guards de autenticacao/onboarding

Prioridade:

**P1**

## 5. Criterios de aceite

A sprint so pode ser considerada pronta se tudo abaixo for verdadeiro:

### Fluxo obrigatorio

1. usuario cria conta
2. usuario faz login
3. usuario faz onboarding
4. sistema gera recomendacao
5. home mostra missao do dia real

### Criterios tecnicos

- dados persistem no banco
- recomendacao e lida do banco
- payload da home vem da API
- autenticacao protege rotas privadas
- validacoes basicas existem
- seeds funcionam

### Criterios de UX

- onboarding nao confunde
- home mostra claramente o proximo passo
- erros estao tratados
- interface nao expoe detalhes tecnicos

## 6. Restricoes

Inclua isso literalmente no processo da sprint.

Restricoes:

- nao criar features fora da Sprint 1
- nao implementar sessao de estudo ainda
- nao criar gamificacao avancada
- nao criar ranking
- nao criar simulados
- nao criar IA conversacional
- nao criar abstracoes genericas desnecessarias
- nao mudar o modelo do MVP sem necessidade tecnica real
- nao usar mocks se o dado ja pode vir do banco

## 7. Task list para execucao

### P0 — Banco e base

- criar schema inicial conforme documento `SQL_ROTAS_ORDEM_BUILD_MVP_V1.md`
- criar migrations
- criar seeds de disciplinas, topicos e questoes minimas
- configurar client de banco

### P0 — Auth

- implementar `POST /api/auth/register`
- implementar `POST /api/auth/login`
- implementar `GET /api/me`
- persistir sessao autenticada

### P0 — Onboarding

- implementar `POST /api/onboarding`
- criar persistencia de `user_profiles`
- validar payload do onboarding
- criar tela de onboarding conectada a API

### P0 — Recomendacao inicial

- implementar servico deterministico de recomendacao inicial
- persistir em `user_recommendations`
- implementar `GET /api/recommendations/current`

### P0 — Home

- implementar `GET /api/home`
- criar tela Home com:
  nome do usuario
  missao do dia
  motivo da recomendacao
  bloco de progresso basico
  CTA `Comecar agora`

### P1 — UX states

- loading, error e empty states
- guardas de autenticacao
- redirecionamento onboarding -> home
