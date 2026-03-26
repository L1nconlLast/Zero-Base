# SQL, Rotas e Ordem de Build — MVP Zero Base v1

## 1. Decisao tecnica do bloco

Para o MVP, a melhor abordagem e:

- PostgreSQL
- Next.js + Route Handlers
- ORM simples e previsivel: Prisma ou Drizzle
- autenticacao simples
- logica deterministica no backend
- sem microsservico
- sem fila agora
- sem abstracao excessiva

O objetivo e velocidade com controle.

## 2. Estrutura tecnica do projeto

Estrutura sugerida:

```txt
src/
  app/
    api/
      auth/
        register/route.ts
        login/route.ts
      me/route.ts
      onboarding/route.ts
      profile/route.ts
      home/route.ts
      recommendations/
        current/route.ts
        rebuild/route.ts
      study-sessions/
        route.ts
        [sessionId]/
          route.ts
          answer/route.ts
          finish/route.ts
      progress/
        summary/route.ts
        disciplines/route.ts
        topics/
          weakest/route.ts
      gamification/route.ts

  lib/
    auth/
    db/
    validations/
    errors/
    utils/

  modules/
    onboarding/
    recommendations/
    study-sessions/
    progress/
    gamification/
    questions/
```

Regra:

Nao colocar regra de negocio dentro do handler diretamente.
O handler chama servico do modulo.

## 3. Schema SQL inicial

### 3.1 Extensoes uteis

```sql
create extension if not exists "pgcrypto";
```

Use `gen_random_uuid()`.

### 3.2 Tabela `users`

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.3 Tabela `user_profiles`

```sql
create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  exam_type text not null default 'enem',
  level text not null check (level in ('iniciante', 'intermediario', 'avancado')),
  weekly_hours integer not null check (weekly_hours >= 0),
  preferred_goal text,
  weakest_disciplines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.4 Tabela `disciplines`

```sql
create table disciplines (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  display_order integer not null default 0
);
```

### 3.5 Tabela `topics`

```sql
create table topics (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references disciplines(id) on delete cascade,
  slug text not null,
  name text not null,
  difficulty_weight numeric(4,2) not null default 1.0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (discipline_id, slug)
);
```

### 3.6 Tabela `questions`

```sql
create table questions (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references disciplines(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  source text,
  difficulty text not null check (difficulty in ('facil', 'medio', 'dificil')),
  prompt text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  option_e text,
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D', 'E')),
  explanation text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
```

### 3.7 Tabela `study_sessions`

```sql
create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  discipline_id uuid not null references disciplines(id),
  topic_id uuid not null references topics(id),
  recommended_reason text,
  question_count integer not null check (question_count > 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
```

### 3.8 Tabela `session_questions`

```sql
create table session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references study_sessions(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (session_id, position),
  unique (session_id, question_id)
);
```

### 3.9 Tabela `question_attempts`

```sql
create table question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_id uuid not null references study_sessions(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_option text not null check (selected_option in ('A', 'B', 'C', 'D', 'E')),
  is_correct boolean not null,
  response_time_seconds integer check (response_time_seconds >= 0),
  answered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id, question_id)
);
```

### 3.10 Tabela `user_topic_performance`

```sql
create table user_topic_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  total_attempts integer not null default 0 check (total_attempts >= 0),
  total_correct integer not null default 0 check (total_correct >= 0),
  accuracy numeric(5,4) not null default 0,
  last_attempt_at timestamptz,
  weakness_score numeric(6,4) not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, topic_id)
);
```

### 3.11 Tabela `user_daily_progress`

```sql
create table user_daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  study_minutes integer not null default 0 check (study_minutes >= 0),
  questions_answered integer not null default 0 check (questions_answered >= 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  sessions_completed integer not null default 0 check (sessions_completed >= 0),
  xp_gained integer not null default 0 check (xp_gained >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
```

### 3.12 Tabela `user_gamification`

```sql
create table user_gamification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level > 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  last_study_date date,
  updated_at timestamptz not null default now()
);
```

### 3.13 Tabela `user_recommendations`

```sql
create table user_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  discipline_id uuid not null references disciplines(id),
  topic_id uuid not null references topics(id),
  reason text not null,
  score numeric(6,4) not null,
  status text not null default 'active'
    check (status in ('active', 'consumed', 'expired')),
  generated_at timestamptz not null default now(),
  expires_at timestamptz
);
```

## 4. Indices obrigatorios

Esses indices precisam entrar desde o inicio.

```sql
create index idx_topics_discipline_id on topics(discipline_id);
create index idx_questions_discipline_id on questions(discipline_id);
create index idx_questions_topic_id on questions(topic_id);
create index idx_study_sessions_user_id on study_sessions(user_id);
create index idx_study_sessions_status on study_sessions(status);
create index idx_question_attempts_user_id on question_attempts(user_id);
create index idx_question_attempts_session_id on question_attempts(session_id);
create index idx_user_topic_performance_user_id on user_topic_performance(user_id);
create index idx_user_topic_performance_weakness_score on user_topic_performance(weakness_score desc);
create index idx_user_daily_progress_user_id on user_daily_progress(user_id);
create index idx_user_recommendations_user_id on user_recommendations(user_id);
create index idx_user_recommendations_status on user_recommendations(status);
```

## 5. Seeds minimos

### 5.1 Disciplinas

```sql
insert into disciplines (slug, name, display_order) values
('linguagens', 'Linguagens', 1),
('matematica', 'Matematica', 2),
('natureza', 'Natureza', 3),
('humanas', 'Humanas', 4),
('redacao', 'Redacao', 5);
```

### 5.2 Topicos iniciais

Voce nao precisa subir o ENEM inteiro agora.

#### Matematica

- razoes-proporcoes
- porcentagem
- funcoes

#### Linguagens

- interpretacao-texto
- figuras-linguagem

#### Natureza

- ecologia
- citologia

#### Humanas

- brasil-colonia
- revolucao-francesa

## 6. Organizacao das rotas

Agora a parte que normalmente degrada rapido se nao for disciplinada.

### 6.1 Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`

### 6.2 Perfil / onboarding

- `POST /api/onboarding`
- `GET /api/profile`
- `PATCH /api/profile`

### 6.3 Home / recomendacao

- `GET /api/home`
- `GET /api/recommendations/current`
- `POST /api/recommendations/rebuild`

### 6.4 Estudo

- `POST /api/study-sessions`
- `GET /api/study-sessions/:sessionId`
- `POST /api/study-sessions/:sessionId/answer`
- `POST /api/study-sessions/:sessionId/finish`

### 6.5 Progresso

- `GET /api/progress/summary`
- `GET /api/progress/disciplines`
- `GET /api/progress/topics/weakest`

### 6.6 Gamificacao

- `GET /api/gamification`

## 7. Ordem real de build

Essa ordem importa muito.
Se o Codex comecar por interface complexa ou analytics, voce vai desperdicar tempo.

### Fase 1 - Fundacao de dados

Objetivo: deixar o sistema respiravel.

Construir:

- schema SQL / migration
- seeds de disciplinas
- seeds de topicos
- seeds de questoes
- conexao com banco
- camada de acesso a dados

Pronto quando:

- banco sobe
- consegue ler disciplinas, topicos e questoes

### Fase 2 - Auth + usuario

Objetivo: existir usuario real.

Construir:

- registro
- login
- sessao autenticada
- `/api/me`

Pronto quando:

- usuario consegue criar conta e logar

### Fase 3 - Onboarding

Objetivo: preencher contexto inicial.

Construir:

- endpoint `/api/onboarding`
- tabela `user_profiles`
- geracao da recomendacao inicial
- tela de onboarding

Pronto quando:

- usuario finaliza onboarding e ja recebe recomendacao inicial

### Fase 4 - Home simples

Objetivo: entregar clareza instantanea.

Construir:

- `/api/home`
- `/api/recommendations/current`
- tela Home com missao do dia

Pronto quando:

- ao abrir o app, o usuario entende o que estudar

### Fase 5 - Sessao de estudo

Objetivo: entregar o loop principal.

Construir:

- criar sessao
- listar questoes da sessao
- responder questao
- mostrar feedback
- finalizar sessao

Pronto quando:

- usuario consegue fazer uma sessao completa de ponta a ponta

### Fase 6 - Consolidacao de desempenho

Objetivo: transformar resposta em inteligencia.

Construir:

- `question_attempts`
- `user_topic_performance`
- `user_daily_progress`
- `user_gamification`
- regeneracao de recomendacao

Pronto quando:

- uma sessao finalizada altera progresso e proxima recomendacao

### Fase 7 - Tela de progresso

Objetivo: tornar avanco visivel.

Construir:

- `/api/progress/summary`
- `/api/progress/disciplines`
- `/api/progress/topics/weakest`
- tela Progresso

Pronto quando:

- usuario ve evolucao basica e fraquezas

### Fase 8 - Refino de UX do MVP

Objetivo: deixar produto utilizavel, nao so funcional.

Construir:

- loading states
- empty states
- mensagens curtas
- estados de erro
- refinamento de CTA
- consistencia visual do loop central

## 8. Regras de build para o Codex

Inclua isso no processo de implementacao.

Regras:

- construir primeiro o caminho critico, nao telas perifericas
- nenhuma feature fora do manifesto do MVP
- nenhuma abstracao prematura
- nenhum endpoint sem uso real na interface
- nenhum calculo de progresso so no frontend
- toda consolidacao deve acontecer no backend ao finalizar a sessao
- recomendacao sempre sai do backend
- feedback da questao so aparece apos resposta
- a Home sempre deve depender da recomendacao ativa

## 9. Criterios de aceite por fase

### Aceite Fase 1

- banco sobe sem erro
- seeds entram
- consultas basicas funcionam

### Aceite Fase 2

- registro/login funcionam
- sessao autenticada persiste

### Aceite Fase 3

- onboarding salva
- recomendacao inicial e criada

### Aceite Fase 4

- home mostra missao real e nao mock

### Aceite Fase 5

- sessao completa roda sem quebrar

### Aceite Fase 6

- desempenho muda apos sessao
- proxima recomendacao muda com base no historico

### Aceite Fase 7

- progresso mostra dados reais
