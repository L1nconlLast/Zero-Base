# Seção Estudo — Escopo Funcional Implementado

## 1) Cronograma
Componente principal: `StudyScheduleCalendar`.

### Cronograma Inteligente
- Botão **Gerar cronograma base (30 dias)**
  - aciona `handleGenerateBaseSchedule`;
  - usa `generateBasePlan` para montar o plano inicial.
- Botão **Ajustar cronograma automaticamente**
  - aciona `handleAiAdjust`;
  - aplica `adjustPlanWithAi` e atualiza o resumo.
- **Resumo do ajuste**
  - exibido em bloco dedicado (`aiSummary`) com destaque visual.

### Grade semanal (editável)
- Grade interativa com edição direta por célula (disciplina).
- Ações disponíveis:
  - **➕ Adicionar horário**;
  - **🧹 Limpar tudo**;
  - **↩️ Restaurar original** (recarrega a grade a partir da agenda real);
  - **✖️ Remover última linha**.
- Persistência local por semana via `localStorage` para manter edições manuais.

---

## 2) Métodos
Componente principal: `StudyMethodHub` (aba `metodos`).

- Hub com métodos de estudo (ex.: Pomodoro, Feynman e outros do catálogo).
- Permite selecionar método e iniciar diretamente o modo Foco.
- Integração com estado global `selectedMethodId`.

---

## 3) Foco
Implementado na aba `foco` em `App.tsx`.

### Objetivo de estudo
- Seleção por botões: **ENEM**, **Concurso**, **Híbrido**.

### Configurações
- Peso dinâmico por slider no modo híbrido.
- Meta semanal em minutos (com conversão para horas).
- Status de sincronização (`preferencesSyncStatus`) e último horário de sync.

### Regras por trilha
- ENEM: ciclo semanal + redação + regra 70/20/10.
- Concurso: método 4F + regra 80/15/5.
- Híbrido: pesos dinâmicos e distribuição mista.

### Regra adaptativa
- < 60%: revisão em 24h.
- 60% a 80%: revisão em 7 dias.
- > 80%: revisão em 30 dias.

### Modos de sessão
- Alternância entre Pomodoro e modo livre.
- Sessões registradas com pontuação/XP.

---

## 4) Questões
Componente principal: `QuizPage` (aba `questoes`).

### Filtros
- Trilha: ENEM / Concurso / Ambos.
- Matéria: dinâmica por trilha.
- Tópico: extraído das tags das questões.
- Dificuldade: Fácil, Médio, Difícil, Todas.

### Quiz diário inteligente
- Ativado por checkbox (`dailyMode`).
- Seleciona 5 questões priorizando tópicos com maior incidência de erro.

### Histórico diário
- Armazena em `dailyQuizHistory` (localStorage).
- Se logado, também envia para nuvem via `questionsCloudService`.
- Campos: data, trilha, total, acertos, XP, streak e tópicos fracos.
- `dailyStreak` mantido e exibido na interface.

### Feedback de execução
- Explicação imediata após resposta.
- Resultado final com acertos, XP, tempo médio e revisão das respostas.

---

## Funcionalidade extra atendida
- Inclusão de mais horários na grade semanal por botão dedicado (**➕ Adicionar horário**), com funcionamento integrado ao fluxo da seção.

---

## Conclusão
O escopo da seção **Estudo** está implementado com:
- cronograma inteligente;
- grade semanal editável com persistência local;
- hub de métodos;
- foco com regras adaptativas;
- quiz com filtros, modo diário e histórico.

A estrutura está pronta para uso e evolução incremental.
