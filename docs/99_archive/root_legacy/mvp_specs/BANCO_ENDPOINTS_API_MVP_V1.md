# Banco, Endpoints e Contratos de API — MVP Zero Base v1

## 1. Principio tecnico do MVP

O MVP do Zero Base precisa ser construido como um sistema simples de 3 camadas:

### Camada 1 - dados base

- usuario
- perfil
- disciplinas
- topicos
- questoes

### Camada 2 - execucao

- sessoes
- tentativas
- progresso diario

### Camada 3 - inteligencia inicial

- desempenho por topico
- recomendacao atual

A IA conversacional nao entra como motor estrutural agora.
O motor estrutural e regra deterministica baseada em desempenho.

## 2. Tabelas do banco

### 2.1 Tabela `users`

Responsavel por identidade principal.

Campos:

- `id` UUID PK
- `name` TEXT NOT NULL
- `email` TEXT UNIQUE NOT NULL
- `password_hash` TEXT NULL
- `created_at` TIMESTAMP NOT NULL DEFAULT now()
- `updated_at` TIMESTAMP NOT NULL DEFAULT now()

### 2.2 Tabela `user_profiles`

Responsavel pelo onboarding e preferencias do aluno.

Campos:

- `id` UUID PK
- `user_id` UUID UNIQUE NOT NULL FK -> users.id
- `exam_type` TEXT NOT NULL DEFAULT 'enem'
- `level` TEXT NOT NULL
- `weekly_hours` INTEGER NOT NULL
- `preferred_goal` TEXT NULL
- `weakest_disciplines` JSONB NOT NULL DEFAULT '[]'
- `created_at` TIMESTAMP NOT NULL DEFAULT now()
- `updated_at` TIMESTAMP NOT NULL DEFAULT now()

Observacao:

`weakest_disciplines` pode guardar algo como:

```json
["matematica", "natureza"]
```

### 2.3 Tabela `disciplines`

Catalogo fixo.

Campos:

- `id` UUID PK
- `slug` TEXT UNIQUE NOT NULL
- `name` TEXT NOT NULL
- `display_order` INTEGER NOT NULL DEFAULT 0

Seeds iniciais:

- linguagens
- matematica
- natureza
- humanas
- redacao

### 2.4 Tabela `topics`

Subdivide disciplina.

Campos:

- `id` UUID PK
- `discipline_id` UUID NOT NULL FK -> disciplines.id
- `slug` TEXT NOT NULL
- `name` TEXT NOT NULL
- `difficulty_weight` NUMERIC(4,2) NOT NULL DEFAULT 1.0
- `is_active` BOOLEAN NOT NULL DEFAULT true
- `created_at` TIMESTAMP NOT NULL DEFAULT now()

Indice importante:

- unique (`discipline_id`, `slug`)

### 2.5 Tabela `questions`

Banco de questoes.

Campos:

- `id` UUID PK
- `discipline_id` UUID NOT NULL FK -> disciplines.id
- `topic_id` UUID NOT NULL FK -> topics.id
- `source` TEXT NULL
- `difficulty` TEXT NOT NULL
- `prompt` TEXT NOT NULL
- `option_a` TEXT NOT NULL
- `option_b` TEXT NOT NULL
- `option_c` TEXT NOT NULL
- `option_d` TEXT NOT NULL
- `option_e` TEXT NULL
- `correct_option` TEXT NOT NULL
- `explanation` TEXT NOT NULL
- `is_active` BOOLEAN NOT NULL DEFAULT true
- `created_at` TIMESTAMP NOT NULL DEFAULT now()

Regra:

`correct_option` deve aceitar so:

- A
- B
- C
- D
- E

### 2.6 Tabela `study_sessions`

Cada sessao iniciada pelo usuario.

Campos:

- `id` UUID PK
- `user_id` UUID NOT NULL FK -> users.id
- `discipline_id` UUID NOT NULL FK -> disciplines.id
- `topic_id` UUID NOT NULL FK -> topics.id
- `recommended_reason` TEXT NULL
- `question_count` INTEGER NOT NULL
- `correct_count` INTEGER NOT NULL DEFAULT 0
- `duration_seconds` INTEGER NOT NULL DEFAULT 0
- `status` TEXT NOT NULL DEFAULT 'in_progress'
- `started_at` TIMESTAMP NOT NULL DEFAULT now()
- `finished_at` TIMESTAMP NULL
- `created_at` TIMESTAMP NOT NULL DEFAULT now()

Status permitidos:

- `in_progress`
- `completed`
- `abandoned`

### 2.7 Tabela `session_questions`

Congela a composicao da sessao.

Isso e importante.
Sem isso, a sessao pode mudar no meio do caminho se o banco mudar.

Campos:

- `id` UUID PK
- `session_id` UUID NOT NULL FK -> study_sessions.id
- `question_id` UUID NOT NULL FK -> questions.id
- `position` INTEGER NOT NULL
- `created_at` TIMESTAMP NOT NULL DEFAULT now()

Indices:

- unique (`session_id`, `position`)
- unique (`session_id`, `question_id`)

### 2.8 Tabela `question_attempts`

Tentativa do usuario em uma questao de uma sessao.

Campos:

- `id` UUID PK
- `user_id` UUID NOT NULL FK -> users.id
- `session_id` UUID NOT NULL FK -> study_sessions.id
- `question_id` UUID NOT NULL FK -> questions.id
- `selected_option` TEXT NOT NULL
- `is_correct` BOOLEAN NOT NULL
- `response_time_seconds` INTEGER NULL
- `answered_at` TIMESTAMP NOT NULL DEFAULT now()
- `created_at` TIMESTAMP NOT NULL DEFAULT now()

Regra:

Uma tentativa por questao por sessao:

- unique (`session_id`, `question_id`)

### 2.9 Tabela `user_topic_performance`

Tabela consolidada. Muito importante.

Campos:

- `id` UUID PK
- `user_id` UUID NOT NULL FK -> users.id
- `topic_id` UUID NOT NULL FK -> topics.id
- `total_attempts` INTEGER NOT NULL DEFAULT 0
- `total_correct` INTEGER NOT NULL DEFAULT 0
- `accuracy` NUMERIC(5,4) NOT NULL DEFAULT 0
- `last_attempt_at` TIMESTAMP NULL
- `weakness_score` NUMERIC(6,4) NOT NULL DEFAULT 0
- `updated_at` TIMESTAMP NOT NULL DEFAULT now()

Indice:

- unique (`user_id`, `topic_id`)

### 2.10 Tabela `user_daily_progress`

Resumo por dia.

Campos:

- `id` UUID PK
- `user_id` UUID NOT NULL FK -> users.id
- `date` DATE NOT NULL
- `study_minutes` INTEGER NOT NULL DEFAULT 0
- `questions_answered` INTEGER NOT NULL DEFAULT 0
- `correct_answers` INTEGER NOT NULL DEFAULT 0
- `sessions_completed` INTEGER NOT NULL DEFAULT 0
- `xp_gained` INTEGER NOT NULL DEFAULT 0
- `updated_at` TIMESTAMP NOT NULL DEFAULT now()

Indice:

- unique (`user_id`, `date`)

### 2.11 Tabela `user_gamification`

Estado gamificado consolidado.

Campos:

- `id` UUID PK
- `user_id` UUID UNIQUE NOT NULL FK -> users.id
- `xp` INTEGER NOT NULL DEFAULT 0
- `level` INTEGER NOT NULL DEFAULT 1
- `streak_days` INTEGER NOT NULL DEFAULT 0
- `last_study_date` DATE NULL
- `updated_at` TIMESTAMP NOT NULL DEFAULT now()

### 2.12 Tabela `user_recommendations`

Recomendacao vigente.

Campos:

- `id` UUID PK
- `user_id` UUID NOT NULL FK -> users.id
- `discipline_id` UUID NOT NULL FK -> disciplines.id
- `topic_id` UUID NOT NULL FK -> topics.id
- `reason` TEXT NOT NULL
- `score` NUMERIC(6,4) NOT NULL
- `status` TEXT NOT NULL DEFAULT 'active'
- `generated_at` TIMESTAMP NOT NULL DEFAULT now()
- `expires_at` TIMESTAMP NULL

Status:

- `active`
- `consumed`
- `expired`

## 3. Relacoes entre entidades

Relacoes criticas:

- user 1:1 user_profile
- user 1:1 user_gamification
- discipline 1:N topics
- discipline 1:N questions
- topic 1:N questions
- user 1:N study_sessions
- study_session 1:N session_questions
- study_session 1:N question_attempts
- user 1:N user_topic_performance
- user 1:N user_daily_progress
- user 1:N user_recommendations

## 4. Endpoints minimos

Agora o mais importante: nao sair criando API demais.

Voce so precisa dos endpoints que sustentam o loop principal.

### 4.1 Auth / usuario

#### `POST /api/auth/register`

Cria usuario.

#### `POST /api/auth/login`

Autentica usuario.

#### `GET /api/me`

Retorna dados basicos do usuario autenticado.

### 4.2 Onboarding / perfil

#### `POST /api/onboarding`

Salva onboarding inicial.

#### `GET /api/profile`

Retorna perfil do usuario.

#### `PATCH /api/profile`

Atualiza perfil simples.

### 4.3 Home / recomendacao

#### `GET /api/home`

Retorna payload da home.

#### `GET /api/recommendations/current`

Retorna recomendacao ativa.

#### `POST /api/recommendations/rebuild`

Forca regeneracao da recomendacao do usuario.

### 4.4 Sessao de estudo

#### `POST /api/study-sessions`

Cria nova sessao a partir da recomendacao atual ou filtro manual.

#### `GET /api/study-sessions/:sessionId`

Retorna estado completo da sessao.

#### `POST /api/study-sessions/:sessionId/answer`

Registra resposta de uma questao.

#### `POST /api/study-sessions/:sessionId/finish`

Finaliza sessao e consolida progresso.

### 4.5 Progresso

#### `GET /api/progress/summary`

Resumo geral:

- tempo
- streak
- sessoes
- acerto geral

#### `GET /api/progress/disciplines`

Resumo por disciplina.

#### `GET /api/progress/topics/weakest`

Lista topicos mais fracos.

### 4.6 Gamificacao

#### `GET /api/gamification`

Retorna XP, nivel e streak.

## 5. Contratos de request/response

Agora o ponto mais importante para nao deixar o Codex inventar payload estranho.

### 5.1 `POST /api/onboarding`

Request:

```json
{
  "examType": "enem",
  "level": "iniciante",
  "weeklyHours": 6,
  "preferredGoal": "melhorar base e constancia",
  "weakestDisciplines": ["matematica", "natureza"]
}
```

Response:

```json
{
  "success": true,
  "profile": {
    "examType": "enem",
    "level": "iniciante",
    "weeklyHours": 6,
    "preferredGoal": "melhorar base e constancia",
    "weakestDisciplines": ["matematica", "natureza"]
  },
  "initialRecommendation": {
    "disciplineSlug": "matematica",
    "topicSlug": "razoes-proporcoes",
    "reason": "Voce indicou dificuldade em Matematica e este topico e um bom ponto de entrada."
  }
}
```

### 5.2 `GET /api/home`

Response:

```json
{
  "user": {
    "name": "Soares"
  },
  "mission": {
    "discipline": "Matematica",
    "topic": "Razoes e Proporcoes",
    "reason": "Seu desempenho recente foi menor neste topico.",
    "ctaLabel": "Comecar agora"
  },
  "weeklyProgress": {
    "studyMinutes": 75,
    "sessionsCompleted": 4,
    "goalMinutes": 360
  },
  "gamification": {
    "xp": 140,
    "level": 2,
    "streakDays": 3
  },
  "lastSession": {
    "discipline": "Linguagens",
    "accuracy": 0.7,
    "completedAt": "2026-03-21T18:00:00Z"
  }
}
```

### 5.3 `GET /api/recommendations/current`

Response:

```json
{
  "recommendation": {
    "id": "uuid",
    "disciplineId": "uuid",
    "disciplineSlug": "matematica",
    "disciplineName": "Matematica",
    "topicId": "uuid",
    "topicSlug": "razoes-proporcoes",
    "topicName": "Razoes e Proporcoes",
    "reason": "Seu desempenho recente caiu neste topico.",
    "score": 0.8421,
    "generatedAt": "2026-03-21T18:10:00Z"
  }
}
```

### 5.4 `POST /api/study-sessions`

Request modo recomendado:

```json
{
  "mode": "recommended"
}
```

Request modo manual:

```json
{
  "mode": "manual",
  "disciplineSlug": "linguagens",
  "topicSlug": "interpretacao-texto",
  "questionCount": 10
}
```

Response:

```json
{
  "session": {
    "id": "uuid",
    "status": "in_progress",
    "discipline": "Matematica",
    "topic": "Razoes e Proporcoes",
    "reason": "Seu desempenho recente caiu neste topico.",
    "questionCount": 10,
    "currentQuestionIndex": 0
  },
  "questions": [
    {
      "id": "uuid-q1",
      "position": 1,
      "prompt": "Texto da questao",
      "options": {
        "A": "Alternativa A",
        "B": "Alternativa B",
        "C": "Alternativa C",
        "D": "Alternativa D",
        "E": "Alternativa E"
      }
    }
  ]
}
```

Regra importante:

Nao retornar `correct_option` nem `explanation` antes da resposta.

### 5.5 `GET /api/study-sessions/:sessionId`

Response:

```json
{
  "session": {
    "id": "uuid",
    "status": "in_progress",
    "discipline": "Matematica",
    "topic": "Razoes e Proporcoes",
    "questionCount": 10,
    "answeredCount": 3,
    "correctCount": 2,
    "startedAt": "2026-03-21T18:20:00Z"
  },
  "questions": [
    {
      "id": "uuid-q1",
      "position": 1,
      "answered": true,
      "selectedOption": "B",
      "isCorrect": true
    },
    {
      "id": "uuid-q4",
      "position": 4,
      "answered": false
    }
  ]
}
```

### 5.6 `POST /api/study-sessions/:sessionId/answer`

Request:

```json
{
  "questionId": "uuid-q4",
  "selectedOption": "C",
  "responseTimeSeconds": 42
}
```

Response:

```json
{
  "result": {
    "questionId": "uuid-q4",
    "selectedOption": "C",
    "correctOption": "A",
    "isCorrect": false,
    "explanation": "A resposta correta e A porque..."
  },
  "sessionProgress": {
    "answeredCount": 4,
    "correctCount": 2,
    "remainingCount": 6
  }
}
```

### 5.7 `POST /api/study-sessions/:sessionId/finish`

Request:

```json
{
  "durationSeconds": 780
}
```

Response:

```json
{
  "sessionResult": {
    "sessionId": "uuid",
    "discipline": "Matematica",
    "topic": "Razoes e Proporcoes",
    "questionCount": 10,
    "correctCount": 6,
    "accuracy": 0.6,
    "durationSeconds": 780
  },
  "progressImpact": {
    "xpGained": 32,
    "newLevel": 2,
    "streakDays": 4,
    "studyMinutesToday": 13
  },
  "nextRecommendation": {
    "discipline": "Linguagens",
    "topic": "Interpretacao de Texto",
    "reason": "Este topico segue com baixa acuracia recente."
  }
}
```

### 5.8 `GET /api/progress/summary`

Response:

```json
{
  "summary": {
    "studyMinutesTotal": 240,
    "studyMinutesWeek": 75,
    "sessionsCompleted": 8,
    "questionsAnswered": 80,
    "accuracyOverall": 0.6625,
    "streakDays": 4,
    "xp": 140,
    "level": 2
  }
}
```

### 5.9 `GET /api/progress/disciplines`

Response:

```json
{
  "disciplines": [
    {
      "slug": "matematica",
      "name": "Matematica",
      "attempts": 30,
      "correct": 16,
      "accuracy": 0.5333
    },
    {
      "slug": "linguagens",
      "name": "Linguagens",
      "attempts": 20,
      "correct": 15,
      "accuracy": 0.75
    }
  ]
}
```

### 5.10 `GET /api/progress/topics/weakest`

Response:

```json
{
  "topics": [
    {
      "disciplineSlug": "matematica",
      "topicSlug": "razoes-proporcoes",
      "topicName": "Razoes e Proporcoes",
      "accuracy": 0.42,
      "weaknessScore": 0.87,
      "lastAttemptAt": "2026-03-21T18:00:00Z"
    }
  ]
}
```

### 5.11 `GET /api/gamification`

Response:

```json
{
  "gamification": {
    "xp": 140,
    "level": 2,
    "streakDays": 4,
    "lastStudyDate": "2026-03-21"
  }
}
```

## 6. Regras internas do backend

Essas regras precisam estar escritas para o Codex nao decidir errado.

### 6.1 Ao criar sessao recomendada

O backend deve:

1. buscar recomendacao ativa
2. selecionar 10 questoes do topico recomendado
3. criar `study_session`
4. criar `session_questions`

### 6.2 Ao responder questao

O backend deve:

1. validar que a questao pertence a sessao
2. impedir resposta duplicada
3. gravar tentativa
4. atualizar `correct_count` parcial da sessao

### 6.3 Ao finalizar sessao

O backend deve:

1. marcar sessao como `completed`
2. atualizar `duration_seconds`
3. recalcular `user_topic_performance`
4. atualizar `user_daily_progress`
5. atualizar `user_gamification`
6. consumir recomendacao atual
7. gerar nova recomendacao

### 6.4 Recalcular `user_topic_performance`

Para o topico da sessao:

- `total_attempts += tentativas da sessao`
- `total_correct += acertos da sessao`
- `accuracy = total_correct / total_attempts`
- `last_attempt_at = now()`
- recalcular `weakness_score`

### 6.5 Atualizar streak

- se `last_study_date` for ontem: `streak_days += 1`
- se for hoje: mantem
- se for anterior a ontem: `streak_days = 1`

### 6.6 Atualizar level

Regra inicial simples:

- nivel 1: 0-99 XP
- nivel 2: 100-249 XP
- nivel 3: 250-449 XP
- nivel 4: 450-699 XP

Depois voce melhora.

## 7. Padrao de erros da API

Voce precisa padronizar isso desde ja.

Formato padrao de erro:

```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Sessao nao encontrada."
  }
}
```

Codigos minimos:

- `UNAUTHORIZED`
- `VALIDATION_ERROR`
- `PROFILE_NOT_FOUND`
- `RECOMMENDATION_NOT_FOUND`
- `SESSION_NOT_FOUND`
- `QUESTION_NOT_IN_SESSION`
- `QUESTION_ALREADY_ANSWERED`
- `SESSION_ALREADY_FINISHED`
- `INSUFFICIENT_QUESTIONS`

## 8. Seeds obrigatorios

Sem isso o MVP nao respira.

Seeds obrigatorios:

- disciplinas
- topicos iniciais por disciplina
- 20 a 50 questoes por topico inicial do MVP

Comece com poucos topicos de alta utilidade. Nao tente subir o ENEM inteiro agora.

Exemplo de recorte inicial:

### Matematica

- Razoes e proporcoes
- Porcentagem
- Funcoes

### Linguagens

- Interpretacao de texto
- Figuras de linguagem

### Natureza

- Ecologia
- Citologia

### Humanas

- Brasil Colonia
- Revolucao Francesa

Isso basta para validar sistema.

## 9. Regras de implementacao

- nao criar features fora do MVP
- nao criar endpoint sem caso de uso claro
- nao retornar dados desnecessarios
- nao expor resposta correta antes do envio da tentativa
- sempre consolidar progresso ao finalizar sessao
- recomendacao deve ser deterministica no v1
- priorizar simplicidade e previsibilidade
