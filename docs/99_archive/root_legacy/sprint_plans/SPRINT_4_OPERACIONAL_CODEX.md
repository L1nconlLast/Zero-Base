# Sprint 4 Operacional - Zero Base MVP v1

## 1. Objetivo
Transformar erro em revisao imediata reutilizavel.

Frase-guia da sprint:
> permitir revisar imediatamente o que errou e usar isso no proximo foco

Se o usuario errar, terminar a sessao e nao tiver uma revisao direta e reutilizavel, a sprint reprova.

## 2. Escopo
### Entra
- identificar erros da sessao finalizada
- habilitar revisao imediata no resultado da sessao
- carregar apenas questoes erradas da sessao
- registrar tentativas de revisao no mesmo historico oficial
- usar tentativas de revisao no mesmo motor de decisao da Sprint 3
- mostrar na Home apenas a existencia de erros pendentes para revisar

### Nao entra
- historico completo de erros
- dashboard
- graficos
- filtros
- ranking de erros
- flashcards complexos
- IA explicativa
- redesign da Home
- nova arquitetura paralela
- sessao de revisao completa separada do fluxo atual

## 3. Modelo de dados
Manter o modelo minimo e reaproveitar `question_attempts` como fonte unica.

### 3.1 `question_attempts`
Continuar usando a tabela oficial de tentativas.

Campos ja existentes relevantes:
- `user_id`
- `session_id`
- `question_id`
- `subject`
- `topic`
- `correct`
- `response_time_seconds`
- `created_at`

Extensao minima obrigatoria:
```sql
alter table public.question_attempts
  add column if not exists attempt_type text not null default 'normal',
  add column if not exists source_session_id uuid references public.study_sessions(id) on delete set null;

alter table public.question_attempts
  drop constraint if exists question_attempts_attempt_type_check;

alter table public.question_attempts
  add constraint question_attempts_attempt_type_check
  check (attempt_type in ('normal', 'review'));
```

Regras:
- attempt normal:
  - `attempt_type = 'normal'`
  - `session_id = study_session.id`
  - `source_session_id = study_session.id`
- attempt de revisao:
  - `attempt_type = 'review'`
  - `session_id = null`
  - `source_session_id = sessao_original_que_gerou_o_erro`

Observacao:
- no contrato conceitual o erro aparece como `is_correct = false`
- no schema real do projeto o campo usado e `correct = false`

### 3.2 Sem tabela nova de revisao
Nao criar:
- `review_sessions`
- `review_items`
- `error_history`
- qualquer tabela paralela de analytics

Tudo deve sair de:
- `question_attempts`
- `study_sessions`
- `session_questions`

### 3.3 Definicao de erro pendente
Erro pendente de revisao:
- attempt `normal`
- `correct = false`
- da sessao finalizada escolhida para revisao
- sem nenhum attempt posterior com:
  - mesmo `question_id`
  - mesmo `source_session_id`
  - `attempt_type = 'review'`

Isso mantem a regra simples:
- um erro vira pendente ao fim da sessao
- deixa de ser pendente quando pelo menos uma revisao for feita

## 4. Fluxo pos-sessao
```text
usuario finaliza sessao
-> backend identifica attempts errados da sessao
-> se houver erros:
   - resultado habilita "Revisar erros desta sessao"
   - payload retorna quantidade de erros revisaveis
-> se nao houver erros:
   - nenhum fluxo de revisao e aberto
```

Regra:
- a revisao nasce da sessao finalizada
- nao criar fluxo paralelo sem relacao com a sessao original

## 5. Fluxo de revisao
```text
usuario toca em "Revisar erros desta sessao"
-> sistema carrega apenas questoes erradas da sessao original
-> ordem = ordem original da sessao
-> usuario responde novamente
-> sistema mostra explicacao da questao
-> registra novo attempt como review
-> ao fim, usuario volta para Home ou resultado
```

Regras duras:
- revisao nao cria nova sessao completa
- revisao nao mistura questoes novas
- revisao nao altera a composicao original da sessao
- revisao deve mostrar explicacao apos a resposta

## 6. Regras de persistencia
### 6.1 Buscar erros da sessao
Fonte:
- `question_attempts`

Filtro:
```sql
select
  qa.question_id,
  qa.created_at,
  sq.position
from public.question_attempts qa
join public.session_questions sq
  on sq.session_id = qa.source_session_id
 and sq.question_id = qa.question_id
where qa.user_id = :user_id
  and qa.source_session_id = :session_id
  and qa.attempt_type = 'normal'
  and qa.correct = false
order by sq.position asc, qa.created_at asc;
```

### 6.2 Registrar resposta de revisao
Cada resposta de revisao gera novo registro em `question_attempts`.

Payload minimo persistido:
- `user_id`
- `question_id`
- `subject`
- `topic`
- `correct`
- `response_time_seconds`
- `attempt_type = 'review'`
- `source_session_id = session_id original`
- `created_at`

### 6.3 Sem persistencia paralela
Nao criar:
- status de revisao em tabela separada
- contador paralelo de erros
- resumo persistido fora do fluxo principal

### 6.4 Definicao de “revisado”
Para esta sprint, um erro conta como revisado quando existir pelo menos um attempt:
- `attempt_type = 'review'`
- para o mesmo `question_id`
- com o mesmo `source_session_id`

Nao exigir “acertou na revisao” para sair da fila nesta sprint.
O impacto de acertar ou errar novamente vai sair naturalmente do historico de attempts.

## 7. Impacto na recomendacao
Nao criar motor paralelo.

Regra:
- o motor da Sprint 3 continua sendo a unica logica de decisao
- attempts de review entram na mesma janela de analise
- se a revisao vier correta, a taxa de erro daquela disciplina/topico cai naturalmente
- se a revisao vier errada, o sinal negativo continua vivo naturalmente

Conclusao:
- nao criar peso especial
- nao criar desconto manual
- nao criar heuristica extra
- usar o mesmo motor recente baseado em `question_attempts`

## 8. Home (minima)
Adicionar no maximo um indicador simples:

```text
Voce tem X erros para revisar
```

Regras:
- mostrar apenas se `X > 0`
- calcular `X` a partir da sessao revisavel mais recente
- nao virar card analitico
- nao adicionar grafico
- nao adicionar historico visual

## 9. Criterio binario
### Passa se
- apos sessao com erro, o botao `Revisar erros desta sessao` aparece
- a revisao carrega apenas questoes erradas da sessao original
- a ordem da revisao respeita a ordem original da sessao
- o usuario consegue responder novamente
- a explicacao aparece na revisao
- novos attempts sao gravados com `attempt_type = 'review'`
- os attempts de review entram no mesmo motor de decisao
- apos revisar, a recomendacao pode mudar ou o erro dominante pode enfraquecer
- a Home pode mostrar `Voce tem X erros para revisar`

### Reprova se
- revisao misturar com sessao normal
- revisao puxar questoes nao erradas
- nao houver persistencia de attempt `review`
- a revisao for apenas UI sem impacto no historico
- a recomendacao ignorar attempts de review
- a Home virar dashboard
- a implementacao depender de logica paralela ao motor da Sprint 3

## 10. Restricoes
- nao abrir simulados
- nao abrir ranking
- nao abrir planner
- nao abrir chat
- nao abrir IA generativa
- nao criar dashboard de erros
- nao criar historico completo de erros
- nao criar filtro por disciplina/topico
- nao redesenhar a Home
- nao criar nova arquitetura de revisao
- nao refatorar Sprint 1, 2 ou 3 alem do necessario
- nao criar logica paralela de recomendacao

## 11. Prompt para Codex
```text
Implemente a Sprint 4 do Zero Base MVP v1 com base em SPRINT_4_OPERACIONAL_CODEX.md.

Objetivo:
transformar erro em revisao imediata reutilizavel.

Contrato obrigatorio:
- usar question_attempts como fonte unica
- nao criar tabela nova de revisao
- adicionar o minimo necessario em question_attempts:
  - attempt_type = 'normal' | 'review'
  - source_session_id
- revisao deve nascer da sessao finalizada
- revisao nao pode virar nova sessao completa
- revisao deve carregar apenas questoes erradas da sessao original
- revisao deve registrar novas tentativas como review
- o motor da Sprint 3 continua sendo o unico motor de recomendacao
- attempts de review entram na mesma conta do historico recente
- Home pode mostrar apenas:
  - "Voce tem X erros para revisar"

Fluxo obrigatorio:
1. finalizar sessao
2. identificar attempts errados dessa sessao
3. se houver erros, habilitar "Revisar erros desta sessao"
4. carregar apenas os erros da sessao em ordem original
5. permitir responder novamente
6. mostrar explicacao
7. registrar novo attempt com:
   - attempt_type = review
   - source_session_id = sessao original
8. deixar esse review influenciar naturalmente a recomendacao futura

Restricoes:
- nao criar dashboard
- nao criar historico completo
- nao criar filtros
- nao criar IA explicativa
- nao criar ranking de erros
- nao criar logica paralela ao motor da Sprint 3
- nao inflar a Home

Criterio binario:
Passa apenas se um erro real virar revisao imediata, essa revisao gerar persistence real em question_attempts e esse novo sinal puder influenciar o proximo foco do sistema.
```
