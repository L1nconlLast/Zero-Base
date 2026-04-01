# Sistema de Triagem do Beta

Status: fonte unica de verdade para feedback operacional do beta

Base operacional: [BETA_RODADA_FECHADA.md](c:/Users/DELL/Desktop/Zero%20Base/docs/03_release/BETA_RODADA_FECHADA.md)

## Objetivo

Manter controle do beta sem reabrir escopo, sem regressao e sem "corrigir por feeling".

## Estrutura unica

Todo feedback deve entrar em uma unica estrutura. A ferramenta pode ser `Notion`, `JSON`, planilha ou board, mas a regra e sempre a mesma: uma unica fonte de verdade.

```ts
type BetaFeedback = {
  id: string
  userId?: string
  date: string

  category: 'BUG' | 'UX_FRICTION' | 'IDEIA' | 'IGNORE'

  title: string
  description: string

  screen?: 'home' | 'plano' | 'estudos' | 'dashboard' | 'mentor'

  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  frequency?: number
  reproducible?: boolean

  status: 'OPEN' | 'VALIDATED' | 'FIXED' | 'DISMISSED'
}
```

Template pronto: [BETA_FEEDBACK_TEMPLATE.json](c:/Users/DELL/Desktop/Zero%20Base/docs/03_release/BETA_FEEDBACK_TEMPLATE.json)

Camada de execucao diaria: [BETA_TRIAGEM_BOARD.md](c:/Users/DELL/Desktop/Zero%20Base/docs/03_release/BETA_TRIAGEM_BOARD.md)

## Classificacao obrigatoria

### `BUG`

Use quando algo esta quebrado, incorreto ou bloqueia o fluxo.

Exemplos:

- botao nao funciona
- grafico renderiza errado
- estado fica inconsistente entre `Home`, `Plano` e `Estudos`
- erro visivel ou excecao no console

Acao:

- corrigir sempre

### `UX_FRICTION`

Use quando a pessoa consegue usar, mas com esforco, demora ou confusao.

Exemplos:

- usuario nao entende o proximo passo
- demora para achar como iniciar
- finalizacao esta pouco clara
- a `Home` nao comunica bem o que mudou

Acao:

- corrigir somente quando aparecer em `>= 3 usuarios`
- abaixo disso, continuar observando

### `IDEIA`

Use para sugestao de melhoria, conveniencia ou evolucao futura.

Acao:

- nao fazer agora
- mandar para backlog congelado

### `IGNORE`

Use para ruido, opiniao isolada ou algo fora do escopo do beta.

Acao:

- descartar

## Regra de decisao

```text
BUG -> corrige imediatamente

UX_FRICTION:
  >= 3 usuarios -> corrigir
  < 3 usuarios -> observar

IDEIA -> backlog congelado

IGNORE -> descartar
```

## Regras anti-caos

- Nao abrir feature nova durante o beta
- Nao refatorar sem bug real
- Nao redesenhar tela inteira por causa de um relato isolado
- Nao transformar `IDEIA` em prioridade sem evidencia repetida
- Nao corrigir com base em intuicao quando o fluxo principal nao foi afetado

## Ciclo diario

### 1. Coletar

Entradas validas:

- formulario
- WhatsApp
- relato livre
- observacao direta

### 2. Classificar imediatamente

Cada item deve entrar como exatamente uma categoria:

- `BUG`
- `UX_FRICTION`
- `IDEIA`
- `IGNORE`

### 3. Atualizar frequencia

Se o problema ja existe, nao criar item novo. Atualizar a frequencia do mesmo item.

```ts
frequency += 1
```

### 4. Decidir acao

- `BUG` -> fila de correcao
- `UX_FRICTION` recorrente -> sobe prioridade
- `IDEIA` -> backlog congelado
- `IGNORE` -> encerrado

## Regra de validacao da correcao

Um item so pode sair como corrigido quando:

- o problema foi reproduzido ou confirmado
- a correcao nao quebrou o fluxo principal
- nao gerou efeito colateral visivel
- `build` passou
- os testes relevantes passaram

Status recomendados:

- `OPEN`
- `VALIDATED`
- `FIXED`
- `DISMISSED`

## Regra de nao fazer

Nao mexer quando:

- so `1` usuario relatou
- e preferencia pessoal
- nao afeta `Iniciar -> Finalizar -> Refletir`
- nao bloqueia o uso

## Foco absoluto do beta

Toda decisao deve responder a isto:

```text
INICIAR -> FINALIZAR -> REFLETIR
```

Se o item nao impacta esse loop, ele nao entra como prioridade do beta.

## Template pronto

```md
# Beta Feedback

## [BUG] Grafico nao renderiza
- Usuarios: 4
- Tela: dashboard
- Reproduzivel: sim
- Severidade: HIGH
- Status: OPEN

## [UX_FRICTION] Usuario nao entende "Proximo passo"
- Usuarios: 3
- Tela: home
- Reproduzivel: sim
- Status: VALIDATED

## [IDEIA] Adicionar ranking semanal
- Usuarios: 2
- Status: BACKLOG

## [IGNORE] "Nao gostei da cor"
- Usuarios: 1
- Status: DISMISSED
```

## Regra de ouro

Beta nao e fase de expandir produto.

Beta e fase de descobrir o que esta quebrado, o que confunde e o que precisa de ajuste minimo para o fluxo principal funcionar sem ajuda.
