# Plano de Ação: Correção de Dashboard e Cronograma Inteligente

Aqui está um plano detalhado para atacar os dois problemas mencionados, junto com instruções de onde debugar e sugestões arquiteturais.

## Problema 1: Tela de Progresso travada (Empty State)

Geralmente, quando o frontend "trava" no Empty State mesmo possuindo dados, é porque **a verificação condicional que renderiza a tela está avaliando algo nulo ou vazio**, que está sendo apagado ou sobreposto por um carregamento mal gerenciado.

### Passos Exatos para Debugar o Fluxo de Dados:

1. **Verificar o Retorno da API/Banco (Backend -> Frontend):**
   - No frontend, abra as *DevTools* do navegador (F12) e vá na aba **Network (Rede)**.
   - Recarregue a página de Progresso e procure pela requisição que busca o perfil do usuário ou as sessões de estudo (ex: chamadas para a tabela `study_sessions` no Supabase ou sua API Node).
   - Verifique a aba *Response* (Resposta). O banco está retornando um array de objetos? Exemplo: `[{ id: "123", minutes: 25, ... }]`. Se estiver vazio aqui, o problema está no backend/banco. Se vier cheio, o problema é no estado do React.

2. **Console.log no Frontend (Atualização de Estado):**
   - Supondo que você gerencie o estado de sessões via um objeto `userData` ou um hook como `useStudySchedule`.
   - Adicione logs logo após a resposta da API e logo antes da renderização condicional.
   
```tsx
// Exemplo no componente App.tsx ou DashboardPage.tsx
useEffect(() => {
  const loadData = async () => {
    const data = await fetchSessionsFromApi();
    console.log("1. Dados recebidos da API:", data); // Verifica a chegada
    setUserData(prev => ({ ...prev, sessions: data }));
  };
  loadData();
}, []);

// Antes do return do componente que decide renderizar o Empty State:
console.log("2. Renderizando com sessões:", userData?.sessions);

// A condição do Empty State:
if (!userData?.sessions || userData.sessions.length === 0) {
  return <EmptyState />;
}
return <Dashboard />;
```

**🔎 Dica Mestre (Loop Infinito):** Verifique se não há algum `useEffect` zerando os dados logo após recebê-los. Por exemplo, se o seu hook de persistência local (`useLocalStorage`) depender da referência de um objeto estático como `initialValue`, ele pode causar um re-render infinito que limpa a tela silenciosamente (foi o que encontrei em aplicações similares usando React).

---

## Problema 2: Bugs no Cronograma de Estudos (Weekly Grid Dessincronizado)

Pelo que observei na estrutura do seu código (`StudyScheduleCalendar.tsx` e `useStudySchedule.ts`), o problema central aqui é o **State Management (Gerenciamento de Estado) Duplicado e Dessincronizado**.

O motor gerador (`generateBasePlan`) cria *ScheduleEntries* que são salvas via `addEntry` no hook `useStudySchedule`. No entanto, a grade visual da semana (`weeklyGrid`) possui **seu próprio estado local independente** (`const [weeklyGrid, setWeeklyGrid] = useState(...)`) e até seu próprio LocalStorage (`weeklyGridStorageKey`). 

Quando a IA gera os dados, ela altera as *entries*, mas o `weeklyGrid` não é forçado a se recriar para ouvir essas mudanças imediatamente, exigindo um refresh manual ou clicar no botão de "Restaurar original".

### A Melhor Estrutura de Estado (Como Consertar):

A premissa número um do React é **Single Source of Truth (Fonte Única de Verdade)**. A grade da semana deve ser um dado *Derivado*, e não um estado isolado.

**Como Estruturar:**

1. **Remova o Estado Independente da Grade:**
   Não use `useLocalStorage` nem `useState` persistente para `weeklyGrid`.

2. **Use `useMemo` para Derivar a Grade das Entradas Oficiais:**
   Sempre que a IA mudar `entries`, o React automaticamente recalcula a `weeklyGrid` e atualiza a tela na mesma hora.

```tsx
// Em vez de const [weeklyGrid, setWeeklyGrid] = useState(...)
// Faça isso:

const weeklyGrid = useMemo(() => {
  // 1. Pegue os horários únicos das entries (timeSlots)
  // 2. Cruze com os dias da semana atuais (weekDates)
  // 3. Monte e retorne o grid.
  
  return timeSlots.map((slot) => ({
    time: slot,
    cells: weekDates.map((day) => {
       const entry = entries.find(e => e.date === day.date && e.startTime === slot);
       return entry?.subject || '';
    }),
  }));
}, [entries, weekDates, timeSlots]); // <-- Toda vez que 'entries' mudar, a grade se refaz sozinha!
```

3. **Edições na Grade Visual (`onChange` dos inputs inline):**
   Se o usuário digitar direto na célula da grade para alterar a matéria, em vez de você chamar um `setWeeklyGrid`, você deve chamar a função `updateEntry` do seu hook `useStudySchedule`. Assim, altera-se o dado Real, a API salva no banco, o estado Hook atualiza as `entries`, que dispara o `useMemo`, que atualiza a tela instantaneamente.

Isso elimina qualquer "engasgo" ou dessincronização visual no calendário!
