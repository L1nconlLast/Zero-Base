# Mentor IA Architecture

## Objetivo

Transformar o Mentor IA de um chat com heuristicas locais em um sistema confiavel de orientacao operacional.

O foco nao e "responder bonito". O foco e responder com:

- contexto real do aluno
- memoria curta util
- regras do produto
- decisao consistente por cenario
- saida curta, segura e acionavel

## Estado atual

Hoje o Mentor IA ja possui partes relevantes, mas elas estao acopladas e ainda com contexto insuficiente:

- `src/components/AI/MentorIA.tsx`
  - mistura UI, hidratacao de historico, disparo de briefing, fallback local e envio de chat
- `src/services/mentorMemory.service.ts`
  - ja guarda memoria curta, mas centrada em foco, progresso e recomendacoes recentes
- `src/services/mentorBriefing.service.ts`
  - opera com um contrato pequeno e ainda depende de fallback em boa parte do tempo
- `src/services/mentorChatApi.service.ts`
  - envia contexto simples demais para respostas realmente situacionais
- `src/services/mentorLLM.service.ts`
  - ainda esta praticamente stubado
- `src/services/mentorResponseValidator.service.ts`
  - valida formato e aderencia basica, mas ainda nao valida contexto real, risco e qualidade operacional

## Diagnostico

Os gargalos principais hoje sao:

1. Contexto insuficiente
   - o modelo sabe pouco sobre plano, revisoes pendentes, ultima sessao, atraso real e proximo passo recomendado
2. Memoria curta rasa
   - existe memoria, mas ela ainda nao opera como briefing operacional estruturado
3. Orquestracao acoplada
   - decisao, chat, fallback e UI moram muito proximos
4. Base de conhecimento fraca
   - faltam regras explicitas do app, playbooks por momento do aluno e heuristicas por objetivo
5. Avaliacao fraca
   - ainda nao existe uma bateria de cenarios para verificar se a recomendacao bate com o estado real do aluno

## Principios de projeto

1. O Mentor decide antes de escrever.
2. O Mentor usa estado real antes de usar texto livre.
3. O Mentor grava memoria curta estruturada, nao chat bruto.
4. O Mentor responde por tipo de situacao, nao por improviso generico.
5. O Mentor deve ter fallback deterministicamente util quando a LLM falhar.
6. O Mentor nunca recomenda volume irreal, atalhos, previsao de prova ou conselho inseguro.

## Arquitetura alvo

### Camada 1. Contrato do sistema

Definir um contrato unico de entrada e saida para o Mentor.

Entrada minima:

- perfil do aluno
- estado atual de execucao
- plano e revisoes
- memoria curta
- trigger do momento
- knowledge base ativa

Saida minima:

- classificacao do momento
- tipo de resposta
- resumo curto
- ate 3 acoes concretas
- risco atual
- dados que devem voltar para a memoria

### Camada 2. Contexto do aluno

O contexto deve ser montado em um snapshot unico por rodada.

Blocos obrigatorios:

- `profile`
  - objetivo, prova, data, dias para prova, trilha, nivel
- `studyState`
  - materias ativas, materias fracas, materias fortes, foco da semana
- `execution`
  - minutos hoje, minutos na semana, percentual da meta, streak, sessoes recentes, ultima sessao
- `plan`
  - backlog pendente, revisoes vencidas, proxima sessao recomendada, carga em atraso
- `performance`
  - simulados recentes, topicos com erro recorrente, tendencia

Sem esse pacote, a IA so conversa. Com ele, a IA orienta.

### Camada 3. Memoria curta estruturada

Memoria curta deve parecer um briefing operacional.

Guardar:

- foco da semana
- ultima recomendacao enviada
- ultima acao seguida
- ultima dificuldade relatada
- ultima materia estudada
- ultimo ajuste de plano
- risco atual
- fatos curtos relevantes com expiracao

Nao guardar:

- conversa longa
- bloco bruto de prompt
- respostas inteiras repetidas
- payloads com ruido

### Camada 4. Knowledge base do produto

Criar uma camada explicita de regras, separada da UI e separada da memoria.

Dominios:

- regras do produto
  - o que significa revisao pendente, prioridade alta, plano ajustado, streak, meta semanal
- regras de estudo
  - quando reduzir carga, quando revisar, quando priorizar questoes, quando retomar com bloco curto
- regras por objetivo
  - ENEM, concurso e cenarios hibridos
- playbooks por momento
  - atraso, reta final, retorno apos pausa, pos-simulado, materia fraca, revisao vencida
- guardrails
  - sem atalhos, sem promessa, sem "vai cair", sem aumentar carga sem contexto

### Camada 5. Motor de decisao

Antes de gerar texto, o Mentor deve classificar o momento do aluno.

Exemplos de momentos:

- `behind_week`
- `restart_needed`
- `review_pressure`
- `weak_subject_pressure`
- `post_mock_recovery`
- `final_sprint`
- `steady_progress`

O motor deve decidir:

- qual o momento atual
- qual o risco principal
- qual a materia prioritara
- qual o tipo de resposta
- quais acoes concretas cabem agora

### Camada 6. Compositor de resposta

So depois da decisao vem a escrita.

Formato ideal:

- 1 titulo curto
- 1 resumo direto
- 1 a 3 acoes com duracao ou proxima etapa
- 1 observacao de seguranca se necessario

Isso reduz alucinacao e melhora consistencia.

### Camada 7. Persistencia e feedback loop

Depois da resposta:

- salvar apenas memoria relevante
- registrar acao sugerida
- marcar acao seguida quando houver clique ou execucao
- usar esse retorno para a proxima rodada

### Camada 8. Avaliacao

Criar testes de cenario antes de dar autonomia proativa.

Perguntas de validacao:

- a materia recomendada bate com o estado real?
- a resposta muda quando o contexto muda?
- a IA evita conselho generico?
- a IA respeita guardrails?
- a IA devolve uma acao viavel para hoje?

## Contrato proposto

O contrato tipado inicial fica em:

- `src/features/mentor/contracts.ts`

Ele organiza:

- entrada do sistema
- snapshot do aluno
- memoria curta
- conhecimento ativo
- classificacao de momento
- decisao
- saida final
- write-back de memoria

## Fluxo de orquestracao

Pipeline proposto:

1. ler estado bruto do aluno
2. montar `MentorDecisionInput`
3. ler memoria curta relevante
4. anexar `MentorKnowledgeContext`
5. classificar momento e risco
6. decidir resposta e acoes
7. compor saida curta
8. validar guardrails
9. persistir somente write-back util

## Estrutura sugerida

```text
src/features/mentor/
  contracts.ts
  context/
    buildMentorDecisionInput.ts
    mentorContextSelectors.ts
  memory/
    mentorShortMemoryStore.ts
    mentorMemoryReducer.ts
  knowledge/
    mentorKnowledgeBase.ts
    mentorPlaybooks.ts
  decision/
    mentorMomentClassifier.ts
    mentorDecisionEngine.ts
  generation/
    mentorResponseComposer.ts
    mentorFallbackComposer.ts
  evaluation/
    mentorScenarioFixtures.ts
    mentorScenarioEvaluator.test.ts
```

## Mapeamento do que falta

### Ja existe

- memoria curta basica
- trigger basico
- briefing com fallback
- chat online com historico
- sanitizacao

### Falta formalizar

- snapshot completo do aluno
- contrato unico do sistema
- knowledge base explicita
- classificador de momento
- resposta por tipo
- write-back estruturado
- avaliacao por cenarios

### Falta fortalecer

- validator contextual
- uso de revisoes pendentes
- uso do plano semanal real
- uso da ultima sessao e do hoje
- uso do resultado de simulado como gatilho operacional

## Roadmap de implementacao

### Fase 1. Fundacao

Entregas:

- contrato do Mentor
- builder de contexto
- memoria curta estruturada
- separacao de UI x orquestracao

Aceite:

- o componente de UI nao decide mais sozinho o conteudo principal

### Fase 2. Conhecimento

Entregas:

- regras do produto
- regras de estudo
- playbooks por momento
- guardrails consolidados

Aceite:

- toda resposta de fallback ja fica util sem depender da LLM

### Fase 3. Decisao e geracao

Entregas:

- classificador de momento
- motor de decisao
- compositor de resposta
- write-back de memoria

Aceite:

- o Mentor responde por cenario e nao por texto generico

### Fase 4. Avaliacao

Entregas:

- fixtures de cenarios
- testes de regressao
- score basico de qualidade

Aceite:

- os cenarios principais passam sem contradicao contextual

### Fase 5. Iniciativa

Entregas:

- alertas automaticos
- briefings semanais proativos
- ajustes de plano guiados

Pre-condicao:

- contexto, memoria, conhecimento e decisao precisam estar estaveis

## Cenarios obrigatorios para teste

1. Hoje zerado, semana fraca, prova proxima
2. Semana boa, mas revisoes vencidas
3. Atraso apos 48h sem estudar
4. Pos-simulado com erro concentrado em uma materia
5. Materia fraca recorrente, mas streak positivo
6. Reta final com carga excessiva no plano
7. Usuario perguntando algo bloqueado

## Proximo passo recomendado

Implementar primeiro a Fase 1:

1. usar `src/features/mentor/contracts.ts` como contrato unico
2. criar um `buildMentorDecisionInput`
3. mover as heuristicas do `MentorIA.tsx` para um motor de decisao
4. fazer o briefing e o fallback consumirem o mesmo input

Assim o Mentor deixa de ser "uma tela com chat" e passa a ser um sistema de orientacao confiavel.
