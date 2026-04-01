# Board Operacional do Beta

Status: pronto para uso diario

Base de decisao: [BETA_TRIAGEM_FEEDBACK.md](c:/Users/DELL/Desktop/Zero%20Base/docs/03_release/BETA_TRIAGEM_FEEDBACK.md)

## Regra de ouro

Se nao esta no board, nao existe.

## Estrutura do board

```text
INBOX
-> CLASSIFICADO
-> VALIDADO
-> EM CORRECAO
-> FIXED
-> DISMISSED
```

## Regras por coluna

### `INBOX`

Use para feedback bruto, sem tratamento.

Deve conter:

- relato original
- data
- origem

Nao decidir nada aqui.

### `CLASSIFICADO`

Use quando o item ja foi limpo e classificado.

Deve conter:

- categoria (`BUG`, `UX_FRICTION`, `IDEIA`, `IGNORE`)
- tela
- descricao objetiva
- frequencia inicial

### `VALIDADO`

Use quando o item passou a regra de decisao e merece acao.

Entra aqui quando:

- `BUG` foi confirmado
- `UX_FRICTION` apareceu em `>= 3 usuarios`

### `EM CORRECAO`

Use quando alguem assumiu a resolucao.

Deve conter:

- responsavel
- recorte claro
- plano curto

### `FIXED`

Use quando o item foi corrigido e validado.

Checklist minimo:

- correcao implementada
- validacao manual feita
- `build` passou
- testes relevantes passaram

### `DISMISSED`

Use para:

- `IDEIA`
- `IGNORE`
- item invalidado

Registrar o motivo do descarte.

## Campos visuais minimos

Cada card do board deve mostrar:

- tipo (`BUG`, `UX_FRICTION`, `IDEIA`, `IGNORE`)
- frequencia
- severidade
- tela
- status

Campos recomendados:

- `id`
- `title`
- `description`
- `owner`
- `lastUpdated`

## Regra de velocidade

- `BUG` `CRITICAL` -> resolver no mesmo dia
- `BUG` `HIGH` ou `MEDIUM` -> resolver em ate `24h`
- `UX_FRICTION` validado -> agrupar em lote semanal
- `IDEIA` -> nao entra em desenvolvimento durante o beta

## Criterio de passagem

### `INBOX -> CLASSIFICADO`

- relato entendido
- descricao limpa
- categoria definida

### `CLASSIFICADO -> VALIDADO`

- `BUG` confirmado
- ou `UX_FRICTION` com recorrencia suficiente

### `VALIDADO -> EM CORRECAO`

- responsavel definido
- escopo curto
- sem abrir frente paralela desnecessaria

### `EM CORRECAO -> FIXED`

- validacao manual
- `build` ok
- testes relevantes ok

### `CLASSIFICADO -> DISMISSED`

- `IDEIA`
- `IGNORE`
- relato fora do escopo do beta

## Metricas simples

Medir so o necessario:

- numero de `BUG` abertos
- numero de `BUG` corrigidos
- numero de `UX_FRICTION` recorrentes
- tempo medio de correcao

## Filtro de prioridade

Sempre decidir nesta ordem:

1. Quebra `Iniciar -> Finalizar -> Refletir`?
2. Afeta muita gente?
3. Aumenta tempo para comecar?
4. Gera confusao recorrente em `Home`, `Plano` ou `Estudos`?

## Modelo de uso diario

### Manha

- revisar `INBOX`
- classificar relatos novos
- atualizar frequencia

### Meio do dia

- puxar para `VALIDADO` apenas o que passou a regra
- mover para `EM CORRECAO` so o que tiver responsavel

### Fim do dia

- validar itens concluidos
- mover para `FIXED` ou `DISMISSED`
- registrar o que ficou para o dia seguinte

## Template pronto

Modelo estruturado: [BETA_TRIAGEM_BOARD_TEMPLATE.json](c:/Users/DELL/Desktop/Zero%20Base/docs/03_release/BETA_TRIAGEM_BOARD_TEMPLATE.json)
