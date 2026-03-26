# Sprint 3 Operacional - Zero Base MVP v1

## 1. Objetivo da sprint
Transformar cada sessao concluida em uma decisao melhor do sistema: feedback de desempenho, recomendacao pos-sessao e Home orientada por dados reais.

Se a sessao terminar e a proxima decisao continuar generica, a sprint reprova.

Frase-guia da sprint:
> usar erros recentes para decidir o proximo estudo

## 2. Escopo
### Entra
- progresso por disciplina com base em respostas reais
- progresso minimo por topico com base em erros reais
- recomendacao pos-sessao deterministica
- Home orientada por ponto fraco atual e proxima acao
- persistencia real de `weakestDisciplines`
- uso do historico recente para influenciar a proxima decisao

### Nao entra
- simulados
- ranking
- planner
- badges complexos
- IA generativa
- chat
- redesign completo
- dashboard analitico
- qualquer feature fora do nucleo decisorio

## 3. Modelo de dados
Extensao minima. Reusar o que ja existe sempre que possivel.

### 3.1 `question_attempts`
Passa a ser a fonte unica de decisao da sprint.

Campos ja uteis:
- `user_id`
- `session_id`
- `question_id`
- `subject`
- `topic`
- `correct`
- `response_time_seconds`
- `created_at`

Uso nesta sprint:
- calcular erro por disciplina
- calcular erro por topico
- explicar a recomendacao pos-sessao

### 3.2 `user_profiles`
`weakest_disciplines` deixa de ser risco herdado e vira dado obrigatorio do motor.

Regra:
- onboarding deve persistir `weakest_disciplines`
- pos-sessao deve sobrescrever com base no historico recente real
- persistir no maximo 2 disciplinas
- se houver sinal claro apenas de 1 disciplina, persistir apenas 1

### 3.3 `user_recommendations`
Estender o minimo para tornar a decisao auditavel.

Colunas novas/minimas:
```sql
alter table public.user_recommendations
  add column if not exists source_session_id uuid references public.study_sessions(id) on delete set null,
  add column if not exists decision_type text not null default 'initial',
  add column if not exists decision_context jsonb not null default '{}'::jsonb;
```

`decision_type` permitido:
- `initial`
- `error_rate_recent`

`decision_context` minimo esperado:
- `windowSize`
- `windowDays`
- `subjectStats`
- `weakestDiscipline`
- `weakestTopic`
- `sessionAccuracy`

### 3.4 Nao criar tabela nova de analytics nesta sprint
- nao criar dashboard table
- nao criar warehouse interno
- nao criar tabela derivada de metricas
- nao depender de `topic_performance_metrics`
- se `topic_performance_metrics` ja existir, ignorar nesta sprint

## 4. Regras de calculo
Motor simples, deterministico e auditavel.

### 4.1 Progresso por disciplina
Base:
- janela principal: ultimos `N=20` attempts dentro dos ultimos `7` dias
- se houver menos de `10` attempts nessa janela, usar todos os attempts disponiveis

Query conceitual:
```sql
with recent_attempts as (
  select subject, correct, created_at
  from public.question_attempts
  where user_id = :user_id
  order by created_at desc
  limit 20
)
select
  subject,
  count(*) as total_answered,
  sum(case when correct = false then 1 else 0 end) as total_errors
from recent_attempts
group by subject;
```

Calculos por disciplina:
- `totalAnswered`
- `correctAnswers`
- `accuracy = correctAnswers / totalAnswered`
- `errorRate = 1 - accuracy`

Regra:
- so considerar disciplina com pelo menos 3 respostas
- ordenar por maior `errorRate`
- empate em `errorRate`:
  1. maior numero absoluto de erros
  2. erro mais recente
  3. ordem alfabetica estavel por `subject`
- sem pesos diferentes
- sem ranking profundo

Saida minima:
- disciplina mais fraca atual
- total respondido por disciplina
- taxa de erro por disciplina

### 4.2 Progresso por topico
Base:
- respostas recentes em `question_attempts`
- prioridade para os erros da sessao atual

Regra minima de fraqueza:
- pegar o topico com mais erros na sessao atual
- se a sessao atual nao gerar desempate claro, usar os ultimos 20 attempts
- so considerar topico com pelo menos 2 erros recentes
- empate no topico:
  1. maior numero de erros
  2. erro mais recente
- sem tabela agregada persistida

### 4.3 Persistencia de `weakestDisciplines`
Regra:
- se houver historico suficiente, gravar 1 ou 2 disciplinas com pior desempenho em `user_profiles.weakest_disciplines`
- se ainda nao houver historico suficiente, manter onboarding como ordem base
- nunca devolver array vazia se o usuario ja informou preferencias no onboarding

Forma esperada:
```text
user_profiles.weakest_disciplines = [disciplina_com_maior_erro]
```

Opcional:
```text
user_profiles.weakest_disciplines = [disciplina_1, disciplina_2]
```

Contrato:
- sempre no maximo 2 disciplinas
- ordem = prioridade
- formato esperado:
  `weakest_disciplines = [disciplina_principal, opcional_segunda]`

### 4.4 Recomendacao pos-sessao
Entrada:
- erros da sessao atual
- disciplina mais fraca no historico recente
- topico mais fraco atual

Regra:
- escolher a disciplina com maior taxa de erro recente
- dentro dela, escolher o topico com mais erros recentes
- se a sessao atual trouxe erro claro novo, priorizar esse erro
- trocar recomendacao apenas se:
  - nova disciplina tiver `errorRate >= 0.3`
  - e a diferenca para a disciplina atualmente recomendada for `>= 0.1`
- caso contrario, manter a recomendacao atual
- sem heuristica complexa
- sem ML
- sem pesos

Resultado obrigatorio:
- nova recomendacao ativa nao pode ser generica
- `reason` deve citar o dado que motivou a decisao
- `decision_context` deve registrar a base usada

Formato minimo de auditoria:
```json
{
  "decision_type": "error_rate_recent",
  "decision_context": {
    "windowSize": 20,
    "windowDays": 7,
    "subjectStats": []
  }
}
```

Exemplo de `reason`:
```text
Voce errou 4 de 6 em Matematica (66%) nas ultimas sessoes. Foco em Porcentagem.
```

## 5. Endpoints novos ou ajustados
### 5.1 `POST /api/onboarding`
Ajustar para persistir `weakestDisciplines` em `user_profiles.weakest_disciplines`.

### 5.2 `GET /api/onboarding`
Retornar `weakestDisciplines` persistido de verdade.

### 5.3 `GET /api/me`
Retornar `weakestDisciplines` persistido para o app carregar estado consistente.

### 5.4 `POST /api/study-sessions/:sessionId/finish`
Ampliar o finalizador para:
- consolidar desempenho por disciplina
- recalcular `weakest_disciplines`
- expirar recomendacao ativa anterior
- criar nova recomendacao ativa baseada em desempenho real

### 5.5 `GET /api/recommendations/current`
Retornar a recomendacao ativa com contexto minimo da decisao:
- `decisionType`
- `reason`
- `discipline`
- `topic`

### 5.6 `GET /api/home`
Passa a retornar bloco decisorio minimo:
- `currentWeakPoint`
- `nextFocus`
- `nextActionLabel`

Sem graficos. Sem painel. Sem bloco analitico paralelo.

Nao criar endpoint de analytics separado nesta sprint, a menos que seja bloqueio tecnico real.

## 6. Fluxo pos-sessao
```text
usuario finaliza sessao
-> backend consolida respostas da sessao
-> calcula disciplina mais fraca no historico recente
-> calcula topico mais fraco
-> persiste weakestDisciplines no perfil
-> expira recomendacao ativa anterior
-> cria nova recomendacao ativa com base no desempenho
-> Home passa a refletir o novo foco
```

Regra central:
- cada sessao precisa alterar a proxima decisao do sistema

## 7. Atualizacao da Home
Home deixa de ser apenas reativa.

### Blocos minimos
#### 7.1 Ponto fraco atual
- disciplina mais fraca
- topico mais fraco

#### 7.2 Proxima acao
- CTA clara
- texto curto explicando por que esse e o proximo foco

### O que a Home nao deve virar
- dashboard pesado
- tela de metricas decorativas
- painel administrativo disfarcado

## 8. Criterios binarios
### Passa se
- apos finalizar uma sessao real, o sistema identifica a disciplina mais fraca
- persiste `weakest_disciplines`
- gera nova recomendacao com base nos erros da sessao e no historico simples
- a Home reflete o novo foco e a proxima acao
- a recomendacao deixa de ser estatica
- apos 2 sessoes com erros diferentes, a recomendacao muda de acordo com o novo erro dominante
- apos 2 sessoes com erros diferentes, a Home muda de acordo com o novo foco
- a nova sessao passa a seguir a nova recomendacao
- `decision_context` permite auditar a escolha

### Reprova se
- recomendacao continuar generica
- Home nao mudar depois da sessao
- `weakestDisciplines` continuar sem persistencia real
- historico for armazenado mas nao influenciar decisao
- qualquer bloco da Home for apenas cosmetico
- a implementacao depender de mock ou caminho manual
- a logica depender de tabela nao confiavel
- a recomendacao ficar igual mesmo com erro dominante diferente em sessoes diferentes
- a recomendacao oscilar sem cumprir os thresholds definidos
- nao houver rastreabilidade suficiente em `decision_context`

## 9. Restricoes duras
- nao abrir superficie nova
- nao criar simulados
- nao criar ranking
- nao criar planner
- nao criar chat
- nao adicionar IA generativa
- nao transformar a sprint em analytics visual
- nao redesenhar o produto inteiro
- nao mexer na Sprint 2 alem do necessario para suportar a decisao pos-sessao
- qualquer nova tabela precisa ser justificada como bloqueio tecnico real
- nao usar `topic_performance_metrics` como dependencia central da sprint
- nao criar ranking de fraqueza complexo
- nao criar historico profundo
- nao usar multiplos niveis de prioridade
- nao usar pesos por disciplina

## 10. Prompt para Codex
```text
Implemente a Sprint 3 do Zero Base MVP v1.

Objetivo:
Transformar cada sessao concluida em uma decisao melhor do sistema, com feedback de desempenho, recomendacao pos-sessao e Home orientada por dados reais.

Escopo permitido:
- progresso por disciplina
- progresso minimo por topico
- persistencia real de weakestDisciplines
- recomendacao pos-sessao deterministica
- Home com ponto fraco atual, proxima acao e evolucao simples

Tarefas:
1. Garantir persistencia real de weakestDisciplines em user_profiles.
2. Usar question_attempts como historico oficial para desempenho por disciplina.
3. Calcular disciplina e topico mais fracos a partir dos ultimos attempts recentes.
4. Ajustar POST /api/study-sessions/:sessionId/finish para recalcular fraquezas e criar nova recomendacao ativa.
5. Estender user_recommendations com source_session_id, decision_type e decision_context.
6. Ajustar GET /api/home para refletir ponto fraco atual e proxima acao.
7. Ajustar GET /api/recommendations/current, GET /api/me e GET /api/onboarding para devolver estado consistente.

Regra central:
Cada sessao deve melhorar a proxima decisao do sistema.

Determinismo obrigatorio:
- janela = ultimos 20 attempts dentro de 7 dias
- se houver menos de 10 attempts na janela, usar todos disponiveis
- empate por disciplina:
  1. maior numero de erros absolutos
  2. erro mais recente
  3. ordem alfabetica por subject
- empate por topico:
  1. maior numero de erros
  2. erro mais recente
- trocar recomendacao apenas se a nova disciplina tiver errorRate >= 0.3 e diferenca >= 0.1

Restricoes:
- nao criar dashboard analitico
- nao abrir simulados
- nao abrir ranking
- nao abrir planner
- nao usar IA generativa
- nao inflar o schema sem necessidade tecnica real
- nao depender de topic_performance_metrics
- nao criar heuristica complexa
- nao usar pesos por disciplina

Criterio binario:
Passa apenas se, apos sessoes com erros diferentes, a recomendacao mudar com base no desempenho e a Home refletir o novo foco.
```
