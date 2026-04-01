# Engineering Playbook

## Regra-mãe
A IA implementa dentro de limites arquiteturais explícitos.

## Fonte Única de Verdade
Todo dado relevante deve ter uma origem canônica.

### Exemplo
```ts
type AppState = {
  plan: PlanState
  sessions: StudySessionState[]
  reviews: ReviewState[]
  processedSessions: Record<string, true>
}
```

## Classificação obrigatória
Toda mudança deve entrar como uma destas categorias:

### Command
Muda estado.
Exemplo:
```ts
finishStudySession(payload)
```

### Event
Representa fato ocorrido no domínio.
Exemplo:
```ts
type StudySessionFinished = {
  type: 'STUDY_SESSION_FINISHED'
  payload: FinishResult
}
```

### Query / Selector
Só lê ou deriva estado.
Exemplo:
```ts
getTodayMinutes(state)
getPendingReviews(state)
getCurrentPlanProgress(state)
```

## Nunca
- criar estado paralelo
- mover regra de domínio para componente
- deixar adapter virar fonte de verdade
- recalcular negócio dentro da Home/Plano/Revisões

## Sempre
- Command produz resultado
- Resultado vira evento
- Estado central aplica o evento
- Selectors derivam UI

## Idempotência
Toda operação crítica deve ser segura para reexecução.

### Exemplo
```ts
if (processedSessions[sessionId]) return state
```

## Baseline de testes
Obrigatório:
- cálculo correto de minutos
- idempotência da finalização
- criação de revisão 24h
- atualização do bloco
- consistência do reducer central

## Checklist de implementação
- Existe SSOT claro?
- A mudança é Command, Event ou Query?
- O contrato de entrada/saída está definido?
- Há risco de estado paralelo?
- A regra pertence ao domínio ou à UI?

## Checklist de PR
- Introduziu estado paralelo?
- Violou SSOT?
- O command está idempotente?
- A query é pura?
- Há lógica de negócio em componente?
- Os testes mínimos passaram?

## Checklist de prompt
- Tarefa pequena e delimitada?
- Contrato definido?
- Invariantes listados?
- Efeitos colaterais permitidos explícitos?
- O que não pode mudar foi declarado?

## Checklist de release
- Fluxo principal passou?
- Retry não duplica efeito?
- Home, Plano e Revisões coerentes?
- Reload mantém estado?
- Build e smokes verdes?
