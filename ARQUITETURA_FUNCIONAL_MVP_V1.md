# Arquitetura Funcional do MVP Zero Base v1

## 1. Tese operacional do MVP

Zero Base v1 nao e uma plataforma completa.

Ele e:

> um sistema que le erro recente, escolhe o foco do dia e empurra o aluno para uma sessao curta com progresso visivel.

Toda a arquitetura precisa obedecer isso.

## 2. Telas obrigatorias do MVP

### 2.1 Home

Funcao:

- mostrar a recomendacao principal
- exibir progresso curto
- iniciar a proxima sessao

### 2.2 Sessao de estudo

Funcao:

- entregar questoes
- registrar resposta
- mostrar correcao
- avancar sem friccao

### 2.3 Resultado da sessao

Funcao:

- resumir desempenho
- mostrar impacto
- definir proximo passo

### 2.4 Progresso

Funcao:

- exibir evolucao basica
- mostrar desempenho por disciplina/assunto
- reforcar progresso visivel

### 2.5 Perfil simples

Funcao:

- mostrar nivel
- streak
- XP
- meta semanal
- configuracoes minimas

### 2.6 Onboarding inicial

Funcao:

- capturar objetivo
- disponibilidade
- nivel inicial
- disciplinas prioritarias

## 3. O que cada tela deve conter

### 3.1 Home

Deve mostrar:

- saudacao curta
- recomendacao do dia
- motivo da recomendacao
- botao `Comecar agora`
- streak atual
- tempo estudado na semana
- progresso semanal
- ultimo desempenho resumido

Estrutura ideal:

#### Bloco 1 - Missao do dia

- titulo: `Hoje seu foco e Matematica`
- subtitulo: `Voce errou mais em Razoes e Proporcoes nas ultimas sessoes`
- CTA: `Comecar agora`

#### Bloco 2 - Progresso rapido

- streak
- minutos estudados na semana
- sessoes concluidas

#### Bloco 3 - Proximo marco

- ex.: `faltam 2 sessoes para fechar sua meta semanal`

O que nao deve ter:

- ranking
- grupos
- multiplos widgets analiticos
- feed longo
- muitas recomendacoes simultaneas

### 3.2 Sessao de estudo

Deve mostrar:

- disciplina atual
- assunto atual
- progresso da sessao
- questao
- alternativas
- botao responder
- feedback
- proxima questao

Fluxo da questao:

1. questao aparece
2. usuario responde
3. sistema mostra:
   correto/incorreto
   explicacao curta
   gabarito
4. usuario clica em continuar

Elementos obrigatorios:

- contador de questao: `3/10`
- timer opcional discreto
- botao `Responder`
- botao `Continuar`

O que evitar:

- informacoes demais por questao
- analise muito longa
- distracoes laterais

### 3.3 Resultado da sessao

Deve mostrar:

- total de acertos
- taxa de acerto
- tempo total
- principal ponto fraco detectado
- recomendacao seguinte
- XP ganho

Exemplo:

- `Voce acertou 6 de 10`
- `Seu maior ponto de atencao hoje: Interpretacao`
- `Proximo foco recomendado: Linguagens`
- botao: `Fazer proxima sessao`

Objetivo dessa tela:

Fechar o loop e empurrar retorno.

### 3.4 Progresso

Deve mostrar:

- taxa de acerto geral
- taxa por disciplina
- assuntos com pior desempenho
- assuntos em evolucao
- minutos estudados
- sessoes concluidas

Estrutura:

#### Resumo geral

- acerto total
- tempo total
- streak

#### Disciplinas

- Matematica - 62%
- Linguagens - 71%
- Natureza - 55%

#### Alertas

- `Voce precisa reforcar Funcoes`
- `Voce evoluiu em Interpretacao`

O que nao precisa agora:

- heatmap avancado
- comparacao anual
- grafico complexo

### 3.5 Perfil simples

Deve mostrar:

- nome
- nivel
- XP
- streak
- meta semanal
- preferencias basicas

O que entra:

- editar nome
- objetivo
- horas por semana
- resetar progresso
- tema

O que nao entra ainda:

- mural complexo de conquistas
- multiplas abas profundas
- reputacao social

### 3.6 Onboarding inicial

Passos:

1. voce esta estudando para:
   ENEM
2. quanto tempo consegue estudar por semana:
   ate 3h
   4-7h
   8-14h
   15h+
3. como voce se considera:
   iniciante
   intermediario
   avancado
4. quais areas sente mais dificuldade:
   Linguagens
   Matematica
   Natureza
   Humanas
   Redacao
5. CTA:
   `Montar meu plano inicial`

## 4. Fluxo principal do usuario

Esse e o fluxo sagrado do MVP.

### Fluxo A - primeiro uso

1. usuario cria conta
2. faz onboarding
3. sistema gera recomendacao inicial
4. home mostra missao do dia
5. usuario inicia primeira sessao
6. conclui
7. ve resultado
8. home atualiza progresso

### Fluxo B - uso diario

1. usuario abre o app
2. home mostra o foco do dia
3. usuario clica em `Comecar agora`
4. resolve sessao curta
5. ve resultado
6. ganha XP
7. recebe proxima recomendacao

### Fluxo C - retorno apos falha

1. usuario fica 2 ou 3 dias sem entrar
2. home volta com mensagem curta:
   `Seu melhor retorno hoje e Linguagens`
3. sessao mais curta
4. objetivo: reativar habito

## 5. Entidades minimas do MVP

### 5.1 User

Campos:

- id
- name
- email
- created_at

### 5.2 UserProfile

Campos:

- user_id
- exam_type (`enem`)
- level (`iniciante`, `intermediario`, `avancado`)
- weekly_hours
- preferred_goal
- created_at
- updated_at

### 5.3 Discipline

Campos:

- id
- name

Valores iniciais:

- Linguagens
- Matematica
- Natureza
- Humanas
- Redacao

### 5.4 Topic

Campos:

- id
- discipline_id
- name
- difficulty_weight

Exemplos:

- Razoes e Proporcoes
- Funcoes
- Interpretacao de Texto
- Citologia
- Revolucao Francesa

### 5.5 Question

Campos:

- id
- discipline_id
- topic_id
- prompt
- option_a
- option_b
- option_c
- option_d
- option_e
- correct_option
- explanation
- source
- difficulty

### 5.6 StudySession

Campos:

- id
- user_id
- discipline_id
- topic_id
- recommended_reason
- question_count
- correct_count
- duration_seconds
- started_at
- finished_at

### 5.7 QuestionAttempt

Campos:

- id
- user_id
- session_id
- question_id
- selected_option
- is_correct
- answered_at
- response_time_seconds

### 5.8 UserTopicPerformance

Tabela consolidada. Fundamental.

Campos:

- id
- user_id
- topic_id
- total_attempts
- total_correct
- accuracy
- last_attempt_at
- weakness_score

Essa tabela vai alimentar recomendacao.

### 5.9 UserDailyProgress

Campos:

- id
- user_id
- date
- study_minutes
- questions_answered
- correct_answers
- sessions_completed
- xp_gained

### 5.10 UserGamification

Campos:

- user_id
- xp
- level
- streak_days
- last_study_date

## 6. Regra inicial de recomendacao

Nada de LLM para isso agora.
Faca uma regra deterministica simples e boa.

### Logica base

O sistema escolhe o proximo foco com base em:

1. assuntos com menor acuracia
2. assuntos com mais erros recentes
3. assuntos sem pratica recente
4. prioridades declaradas no onboarding

### Formula inicial sugerida

#### Weakness Score

Para cada topico:

`weakness_score = ((1 - accuracy) * 0.5) + (error_recency_factor * 0.3) + (inactivity_factor * 0.2)`

#### Onde:

- `accuracy` = acertos / tentativas
- `error_recency_factor` = peso maior se errou recentemente
- `inactivity_factor` = sobe se faz tempo que nao pratica

### Regra pratica simplificada

Se quiser ainda mais simples no v1:

1. pega os topicos com pelo menos 3 tentativas
2. ordena por menor acuracia
3. desempata por erro mais recente
4. seleciona o topico vencedor
5. monta sessao de 5 a 10 questoes daquele topico
6. mostra motivo:
   `Recomendado porque seu desempenho recente caiu em Razoes e Proporcoes`

## 7. Regras de negocio do MVP

### Sessao padrao

- 10 questoes
- 8 a 15 minutos
- 1 disciplina / 1 topico por sessao

### Atualizacao de desempenho

Ao terminar cada sessao:

- atualizar attempts
- atualizar performance por topico
- atualizar progresso diario
- atualizar XP
- recalcular streak
- gerar proxima recomendacao

### XP inicial

Sugestao:

- sessao concluida: +20 XP
- acerto por questao: +2 XP
- sessao 100%: bonus +10 XP
- streak diario mantido: +5 XP

## 8. Estrutura de navegacao do MVP

### Desktop

Sidebar minima:

- Home
- Estudar
- Progresso
- Perfil

`Estudar` pode abrir:

- sessao recomendada
- treino por disciplina

### Mobile

Bottom nav:

- Home
- Estudar
- Progresso
- Perfil

Nada alem disso no MVP.

## 9. O que o Codex precisa construir primeiro

### Ordem correta de implementacao

#### Fase 1

- autenticacao simples
- onboarding
- disciplinas e topicos seedados
- banco de questoes
- home basica

#### Fase 2

- motor de sessao
- resposta de questoes
- tela de resultado

#### Fase 3

- consolidacao de desempenho
- recomendacao automatica
- progresso

#### Fase 4

- gamificacao basica
- refinamento de UX

## 10. Criterio de qualidade deste bloco

Voce so avanca quando estas 4 perguntas tiverem resposta clara:

### 1.

O usuario sabe em 5 segundos o que fazer ao abrir o app?

### 2.

Existe uma sessao curta funcional do inicio ao fim?

### 3.

O sistema consegue registrar erro e transformar isso em proxima recomendacao?

### 4.

O usuario termina a sessao sentindo progresso visivel?

Se qualquer uma for `nao`, ainda nao esta pronto.

## Proximo passo

O passo 3, agora, e o mais util para build:

**Arquitetura de banco de dados + endpoints minimos + contratos de API do MVP**

Esse e o bloco que ja vira tarefa de implementacao quase direta para o Codex.
