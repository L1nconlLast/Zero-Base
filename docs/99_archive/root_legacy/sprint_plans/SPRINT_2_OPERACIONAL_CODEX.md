# Sprint 2 Operacional - Zero Base MVP v1

## 1. Objetivo da sprint
Implementar o primeiro loop real de estudo:

Home -> Comecar agora -> Resolver questoes -> Ver resultado -> Voltar com progresso atualizado

Se esse loop nao fechar ponta a ponta com persistencia real, a sprint reprova.

## 2. Escopo
### Incluido
- criacao de sessao de estudo
- entrega de questoes
- registro de respostas
- calculo simples de acertos
- finalizacao de sessao
- atualizacao de progresso
- atualizacao de recomendacao basica
- retorno para Home com dados atualizados

### Excluido
- simulados
- ranking
- IA avancada
- redacao
- planner
- gamificacao complexa
- analytics profundo

## 3. Modelo de dados
### 3.1 study_sessions
```sql
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  total_questions integer not null,
  correct_answers integer not null default 0,
  created_at timestamptz default now(),
  finished_at timestamptz
);
```

### 3.2 session_questions
```sql
create table public.session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.study_sessions(id) on delete cascade,
  question_id uuid not null,
  position integer not null
);
```

### 3.3 question_attempts
```sql
create table public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions(id),
  question_id uuid not null,
  is_correct boolean not null,
  answered_at timestamptz default now()
);
```

### 3.4 user_daily_progress
```sql
create table public.user_daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  questions_answered integer default 0,
  correct_answers integer default 0,
  created_at timestamptz default now(),
  unique(user_id, date)
);
```

## 4. Endpoints
### 4.1 Criar sessao
`POST /api/study-sessions`

Entrada:
```json
{
  "limit": 5
}
```

Saida:
```json
{
  "sessionId": "...",
  "questions": [
    {
      "id": "...",
      "prompt": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "...",
        "E": "..."
      }
    }
  ]
}
```

### 4.2 Responder questao
`POST /api/study-sessions/:sessionId/answer`

Entrada:
```json
{
  "questionId": "...",
  "isCorrect": true
}
```

Saida minima:
```json
{
  "success": true
}
```

### 4.3 Finalizar sessao
`POST /api/study-sessions/:sessionId/finish`

Saida:
```json
{
  "total": 5,
  "correct": 3,
  "accuracy": 0.6
}
```

### 4.4 Buscar sessao
`GET /api/study-sessions/:sessionId`

## 5. Regras de negocio
- sessao comeca como `active`
- sessao so pode finalizar uma vez
- respostas incrementam `correct_answers`
- progresso diario acumula por usuario e data
- recomendacao pode ser atualizada apos sessao com regra simples
- Home deve refletir o estado novo depois da conclusao

## 6. Fluxo do usuario
```text
Home
-> Comecar agora
-> cria sessao
-> retorna questoes
-> usuario responde
-> salva respostas
-> finaliza sessao
-> calcula resultado
-> atualiza progresso
-> retorna para Home
```

## 7. Frontend minimo
### Home
- botao `Comecar agora`
- progresso basico visivel

### Tela de sessao
- pergunta
- opcoes
- botao responder

### Resultado
- total
- acertos
- precisao

## 8. Ordem de build
### P0
1. banco: `study_sessions`, `session_questions`, `question_attempts`, `user_daily_progress`
2. endpoint `POST /api/study-sessions`
3. endpoint `POST /api/study-sessions/:sessionId/answer`
4. endpoint `POST /api/study-sessions/:sessionId/finish`
5. endpoint `GET /api/study-sessions/:sessionId`
6. fluxo basico no frontend

### P1
7. progresso diario na Home
8. atualizacao simples da recomendacao apos sessao

## 9. Criterio de aceite
A Sprint 2 passa se:
- usuario inicia sessao
- responde perguntas
- finaliza sessao
- ve resultado
- volta para Home com dados atualizados

Sem mock. Sem estrutura preparada. Sem integracao pendente.

## 10. Restricoes
- sem mock
- sem feature extra
- sem estrutura pronta sem integracao
- sem alterar Sprint 1
- sem IA avancada
- sem simulados
- sem ranking
- sem planner

## 11. Riscos herdados da Sprint 1
- `weakestDisciplines` nao persiste no perfil/onboarding
- latencia pontual observada no `register`

Esses riscos devem ficar apenas registrados nesta sprint. Nao corrigir agora, a menos que reaparecam como bloqueio real do loop de estudo.

## 12. Prompt para execucao
```text
Implemente a Sprint 2 do Zero Base MVP v1.

Objetivo:
Criar o loop de estudo funcional: iniciar sessao, responder questoes, finalizar e atualizar progresso.

Tarefas:

1. Criar tabelas:
- study_sessions
- session_questions
- question_attempts
- user_daily_progress

2. Implementar endpoints:
- POST /api/study-sessions
- POST /api/study-sessions/:sessionId/answer
- POST /api/study-sessions/:sessionId/finish
- GET /api/study-sessions/:sessionId

3. Regras:
- sessao comeca ativa
- registrar respostas
- calcular acertos
- atualizar progresso diario

4. Frontend:
- botao "Comecar agora"
- fluxo de perguntas
- tela de resultado

Restricoes:
- nao criar features fora do escopo
- nao usar mocks
- nao alterar Sprint 1
- nao adicionar IA avancada

Criterio:
o usuario deve conseguir iniciar, responder e finalizar uma sessao com persistencia real.
```
