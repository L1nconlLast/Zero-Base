# Melhorias e Ideias de Implementação — Medicina do Zero v2

**Data:** 25/02/2026  
**Foco:** pontos reais do código que precisam de atenção + ideias concretas de implementação

---

## 1) Problemas Reais Encontrados no Código

### 1.1 `alert()` e `window.confirm()` ainda em uso

**Arquivos:**
- `src/components/Settings/ExportSection.tsx` — linhas 29 e 33
- `src/components/Timer/PomodoroTimer.tsx` — linha 139

**Problema:**  
`alert()` e `window.confirm()` bloqueiam a thread do browser, travam a interface e ficam com estilo nativo do sistema operacional (inconsistente com o design do app).

**Como resolver:**  
Substituir por modais React com design próprio ou usar a biblioteca `react-hot-toast` (já instalada no projeto) para toasts de sucesso/erro, e um modal de confirmação com estado (`useState`).

```tsx
// Antes (ExportSection.tsx)
alert('Dados importados com sucesso!');

// Depois
import toast from 'react-hot-toast';
toast.success('Dados importados com sucesso!');
```

```tsx
// Antes (PomodoroTimer.tsx)
if (isActive && !window.confirm('Deseja trocar de método...?')) return;

// Depois — modal de confirmação com estado
const [showConfirm, setShowConfirm] = useState(false);
// + componente <ConfirmDialog> reutilizável
```

---

### 1.2 `console.log` em código de produção

**Arquivos:**
- `src/services/auth.service.ts` — linhas 313, 398, 423, 488, 513
- `src/services/storage.service.ts` — linhas 62, 137

**Problema:**  
Logs de operações internas (registro, login, logout) aparecem no console de qualquer usuário que abrir as DevTools, expondo informações de fluxo interno.

**Como resolver:**  
Substituir todos por chamadas do `logger` já existente no projeto:

```ts
// Antes
console.log('✅ Usuário registrado:', email);

// Depois
logger.info('Usuário registrado', 'Auth', { email });
```

O `logger` em `src/utils/logger.ts` já suprime logs em produção e persiste apenas erros/warnings.

---

### 1.3 TODOs com funcionalidades importantes em aberto

**Arquivo: `src/services/auth.service.ts`**

```ts
// linha 202
// TODO: Em produção, isso viria de uma API

// linha 510
// TODO: Implementar com backend

// linha 514
// TODO: Enviar email com link de reset de senha
```

**Problema:**  
A autenticação usa somente `localStorage` para armazenar todos os usuários. Em multi-dispositivo ou após limpeza do navegador, todos os dados são perdidos.

**Como resolver:**  
Três opções em ordem de esforço:

| Opção | Esforço | Ganho |
|-------|---------|-------|
| Manter localStorage + exportação fácil de backup | Baixo | Resiliência básica |
| Integrar Supabase Auth (já configurado no projeto) | Médio | Persistência real multi-dispositivo |
| Backend próprio com API REST | Alto | Controle total |

O projeto já tem cliente Supabase configurado em `src/services/supabase.client.ts`. A opção de médio esforço já está quase pronta.

---

### 1.4 `App-COM-METODOS.tsx` na raiz — arquivo legado com encoding corrompido

**Arquivo:** `App-COM-METODOS.tsx` (raiz do projeto)

**Problema:**  
Arquivo órfão fora da pasta `src/`, com texto mojibake (`ðŸŽ‰ PARABÃ‰NS`, `nÃ­vel`). Usa `alert()` para level up e foi base de desenvolvimento anterior, não está importado em nenhum lugar.

**Como resolver:**  
Deletar o arquivo. Já foi substituído pelo `src/App.tsx` oficial.

---

### 1.5 Chunk de gráficos muito pesado

**Arquivo:** `dist/assets/generateCategoricalChart-*.js` (~368 kB / ~102 kB gzip)

**Problema:**  
A biblioteca `recharts` está sendo puxada mesmo em telas sem gráficos, aumentando o custo de execução inicial.

**Como resolver:**  
Separar os componentes com gráficos em chunks lazy dedicados (já feito parcialmente no Dashboard). Completar para `WeeklyReport` e `AdaptiveInsightsPage`:

```tsx
// src/App.tsx
const WeeklyReport = React.lazy(() => import('./components/Dashboard/WeeklyReport'));
const AdaptiveInsightsPage = React.lazy(() => import('./components/AI/AdaptiveInsightsPage'));
```

Resultado esperado: redução do tempo de interação inicial, com recharts carregando sob demanda.

---

### 1.6 Logger com TODO de integração externa nunca concluído

**Arquivo:** `src/utils/logger.ts` — linha 74

```ts
function _sendToRemote(_entry: LogEntry): void {
  // TODO: integrar serviço externo
  // ex: Sentry, Datadog, etc.
}
```

**Problema:**  
Erros de produção não chegam a nenhum canal de monitoramento. Quando um usuário encontra um bug, não há rastreio.

**Como resolver:**  
Integrar com Sentry (gratuito para projetos pequenos):

```ts
// Instalar: npm install @sentry/react
import * as Sentry from '@sentry/react';

function _sendToRemote(entry: LogEntry): void {
  if (entry.level === 'error') {
    Sentry.captureMessage(entry.message, {
      level: 'error',
      extra: { context: entry.context, data: entry.data },
    });
  }
}
```

---

## 2) Ideias de Novas Funcionalidades

### 2.1 Modo Offline com Sincronização Automática

**O que é:**  
Detectar quando o usuário está sem internet, continuar registrando sessões localmente, e sincronizar quando a conexão voltar.

**Como implementar:**
- Usar `navigator.onLine` e evento `online`
- Fila de operações pendentes em `localStorage`
- Processar a fila ao reconectar

**Impacto:** alta — não perde nenhum dado de estudo.

---

### 2.2 Exportação de Relatório em PDF

**O que é:**  
Botão "Exportar PDF" no relatório semanal (já existe, mas está com `alert('Em breve!')`).

**Como implementar:**
- Usar `jsPDF` + `html2canvas` (solução client-side, sem servidor)
- Capturar o componente `WeeklyReport` renderizado e converter para PDF

```ts
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const exportPDF = async () => {
  const element = document.getElementById('weekly-report');
  const canvas = await html2canvas(element!);
  const pdf = new jsPDF();
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 0);
  pdf.save('relatorio-semanal.pdf');
};
```

**Impacto:** médio — muito pedido por quem quer compartilhar progresso.

---

### 2.3 Metas Personalizadas por Matéria

**O que é:**  
Além da meta diária em minutos, o usuário define quanto quer estudar de cada matéria na semana.

**Como implementar:**
- Adicionar campo `materiaGoals: Record<MateriaTipo, number>` no `UserData`
- Exibir barra de progresso por matéria no Dashboard
- Alertar quando uma matéria está sendo ignorada há mais de X dias

**Impacto:** alto — aumenta engajamento e direciona o estudo.

---

### 2.4 Calendário de Sessões (Heatmap Anual)

**O que é:**  
Visualização tipo GitHub contributions — cada dia do ano colorido de acordo com minutos estudados.

**Como implementar:**
- O componente `StudyHeatmap.tsx` já existe
- Expandir para mostrar o ano completo com zoom por mês
- Tooltip com detalhes ao passar o mouse

**Impacto:** médio — muito motivador visualmente.

---

### 2.5 Desafios Semanais

**O que é:**  
Todo início de semana, o app gera 3 desafios automáticos baseados no histórico do usuário.

**Exemplos:**
- "Estude Anatomia por 60 min esta semana"
- "Complete 5 sessões de Pomodoro"
- "Mantenha streak por 7 dias"

**Como implementar:**
- Gerador de desafios em `src/services/challenges.service.ts`
- Persistir desafios ativos no `userData`
- Notificação de conclusão via `useNotifications`

**Impacto:** alto — aumenta retenção.

---

### 2.6 Tema Claro/Escuro por Agendamento (já existe, mas bugado)

**O que é:**  
O sistema de agendamento automático de tema existe em `src/hooks/useTheme.ts`, mas o `isInDarkSchedule` tem lógica de intervalo que pode falhar em horários de virada de meia-noite.

**Como resolver:**

```ts
// Caso atual — pode falhar próximo à meia-noite
if (startTime < endTime) {
  return currentTime >= startTime && currentTime < endTime;
} else {
  return currentTime >= startTime || currentTime < endTime;
}
```

A lógica do `else` está certa, mas falta cobertura de teste. Adicionar casos no Vitest:

```ts
it('aplica dark corretamente quando schedule cruza meia-noite', () => {
  // 22:00 -> 07:00 deve ser dark às 23:30 e às 03:00
});
```

---

## 3) Priorização Recomendada

| # | Item | Esforço | Impacto | Prioridade |
|---|------|---------|---------|------------|
| 1 | Substituir `alert`/`confirm` por modais | Baixo | Alto | **Urgente** |
| 2 | Remover `console.log` de produção | Baixo | Médio | **Urgente** |
| 3 | Deletar `App-COM-METODOS.tsx` legado | Baixo | Baixo | **Fácil** |
| 4 | Lazy loading dos gráficos restantes | Baixo | Alto | **Alta** |
| 5 | Exportação de PDF no relatório | Médio | Alto | **Alta** |
| 6 | Metas por matéria | Médio | Alto | **Alta** |
| 7 | Integrar Supabase Auth | Médio | Muito alto | **Média** |
| 8 | Monitoramento de erros (Sentry) | Baixo | Alto | **Média** |
| 9 | Desafios semanais | Alto | Alto | **Futura** |
| 10 | Calendário heatmap anual | Médio | Médio | **Futura** |

---

## 4) Próximos Passos Imediatos

**Passo 1 — Limpeza (1-2h):**
- Deletar `App-COM-METODOS.tsx`
- Substituir `console.log` por `logger.info` nos serviços
- Substituir `alert()` por toast em `ExportSection.tsx`
- Substituir `window.confirm()` por modal em `PomodoroTimer.tsx`

**Passo 2 — Performance (1-2h):**
- Aplicar lazy loading em `WeeklyReport` e `AdaptiveInsightsPage`
- Medir redução no chunk de recharts com `npm run build`

**Passo 3 — Funcionalidade nova (3-5h):**
- Implementar exportação de PDF no `WeeklyReport`
- Implementar metas por matéria no `UserData` e Dashboard
