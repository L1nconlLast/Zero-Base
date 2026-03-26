import React from 'react';
import {
  Activity,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Compass,
  Filter,
  LineChart,
  ShieldCheck,
  Target,
  Wrench,
} from 'lucide-react';
import type {
  AdvancedHealthState,
  AdvancedOperationSnapshot,
  AdvancedPriorityItem,
  AdvancedSnapshot,
  AdvancedWeeklyScorecard,
} from '../../types';

export type AdvancedTodayPlan = {
  focusBlock: string;
  questionBlock: string;
  reviewBlock: string;
  status: 'nao_iniciado' | 'em_andamento' | 'concluido';
};

type AdvancedToolRecommendation = {
  id: 'cronograma' | 'metodos' | 'questoes';
  label: string;
  reason: string;
};

export type AdvancedDashboardHomeProps = {
  snapshot: AdvancedSnapshot;
  priorityTable: AdvancedPriorityItem[];
  operation: AdvancedOperationSnapshot;
  scorecard: AdvancedWeeklyScorecard;
  healthState: AdvancedHealthState;
  todayPlan: AdvancedTodayPlan;
  strongest: string;
  weakest: string;
  recommendedAdjustment: string;
  lastMockLabel?: string;
  trendLabel?: string;
  recommendations: AdvancedToolRecommendation[];
  onAdjustPlan: () => void;
  onKeepStrategy: () => void;
  onExecuteDayPlan: () => void;
  onApplyAdjustment: () => void;
  onStartMock: () => void;
  onReviewPerformance: () => void;
  onOpenTool: (toolId: string) => void;
};

const HEALTH_COPY: Record<
  AdvancedHealthState,
  { title: string; subtitle: string; badgeClassName: string; badgeLabel: string }
> = {
  healthy: {
    title: 'Sua estrategia esta funcionando porque esta virando execucao',
    subtitle: 'Voce manteve consistencia e esta convertendo plano em pratica. O foco agora e sustentar esse ritmo sem dispersar.',
    badgeClassName: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    badgeLabel: 'healthy',
  },
  at_risk: {
    title: 'Sua estrategia perdeu ritmo e precisa voltar para execucao',
    subtitle: 'O plano ainda faz sentido, mas a semana comeca a enfraquecer sem pratica suficiente hoje.',
    badgeClassName: 'bg-amber-100 text-amber-700 border border-amber-200',
    badgeLabel: 'at_risk',
  },
  overplanning: {
    title: 'Voce esta ajustando mais do que executando',
    subtitle: 'O excesso de planejamento esta reduzindo avanco real. Hoje o ganho vem de fazer, nao de reorganizar.',
    badgeClassName: 'bg-rose-100 text-rose-700 border border-rose-200',
    badgeLabel: 'overplanning',
  },
  fragmented: {
    title: 'Seu controle esta virando dispersao',
    subtitle: 'Voce abriu caminhos demais. O proximo ganho vem de concentrar energia no plano principal.',
    badgeClassName: 'bg-sky-100 text-sky-700 border border-sky-200',
    badgeLabel: 'fragmented',
  },
};

const WEEKLY_PLAN_COPY: Record<
  AdvancedHealthState,
  {
    title: string;
    summary: string;
    primaryActionLabel: string;
    secondaryActionLabel: string;
    primaryAction: 'keep' | 'adjust';
  }
> = {
  healthy: {
    title: 'Sua estrategia esta bem montada. O foco agora e proteger consistencia.',
    summary: 'Sua semana esta forte quando planejamento e execucao andam juntos.',
    primaryActionLabel: 'Manter direcao',
    secondaryActionLabel: 'Revisar semana',
    primaryAction: 'keep',
  },
  at_risk: {
    title: 'A semana ainda e recuperavel, mas depende de execucao hoje e amanha.',
    summary: 'Sua semana esta pedindo menos ajuste e mais consistencia.',
    primaryActionLabel: 'Recuperar ritmo',
    secondaryActionLabel: 'Ajustar prioridade',
    primaryAction: 'keep',
  },
  overplanning: {
    title: 'O problema da semana nao esta no plano. Esta na conversao do plano em acao.',
    summary: 'O principal gargalo agora esta entre planejar e cumprir.',
    primaryActionLabel: 'Executar plano',
    secondaryActionLabel: 'Simplificar semana',
    primaryAction: 'keep',
  },
  fragmented: {
    title: 'A semana esta perdendo forca por excesso de frentes abertas.',
    summary: 'Sua semana esta pedindo menos caminhos paralelos e mais linha principal.',
    primaryActionLabel: 'Voltar ao plano central',
    secondaryActionLabel: 'Recentrar semana',
    primaryAction: 'keep',
  },
};

const DAILY_EXECUTION_COPY: Record<
  AdvancedHealthState,
  {
    title: string;
    subtitle: string;
    ctaLabel: string;
  }
> = {
  healthy: {
    title: 'Hoje e dia de manter a vantagem',
    subtitle: 'O plano ja esta certo. Agora voce so precisa transformar isso em pratica.',
    ctaLabel: 'Manter ritmo hoje',
  },
  at_risk: {
    title: 'Hoje decide se sua semana recupera ou escorrega',
    subtitle: 'Sem execucao hoje, a estrategia perde forca rapido.',
    ctaLabel: 'Recuperar execucao',
  },
  overplanning: {
    title: 'Hoje vale mais executar do que ajustar',
    subtitle: 'O bloco principal precisa sair antes de qualquer nova mudanca.',
    ctaLabel: 'Executar primeiro bloco',
  },
  fragmented: {
    title: 'Hoje voce precisa escolher uma linha e seguir',
    subtitle: 'Menos troca de contexto. Mais continuidade real.',
    ctaLabel: 'Voltar ao plano central',
  },
};

const formatRate = (value: number | null) => (typeof value === 'number' ? `${value}%` : '--');

type ResolvedPrimaryAction = {
  label: string;
  helper: string;
  action: 'execute_day_plan' | 'apply_adjustment' | 'keep_strategy' | 'adjust_plan';
};

type ResolvedPrimaryInsight = {
  eyebrow: string;
  title: string;
  description: string;
  supportLabel: string;
  supportValue: string;
  kpiLabel: string;
  kpiValue: string;
};

const getStatusLabel = (status: AdvancedTodayPlan['status']) => {
  if (status === 'concluido') {
    return {
      label: 'Concluido',
      className: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    };
  }

  if (status === 'em_andamento') {
    return {
      label: 'Em andamento',
      className: 'bg-amber-100 text-amber-700 border border-amber-200',
    };
  }

  return {
    label: 'Nao iniciado',
    className: 'bg-slate-100 text-slate-700 border border-slate-200',
  };
};

const resolvePrimaryAction = (
  healthState: AdvancedHealthState,
  topPriority: AdvancedPriorityItem | null,
): ResolvedPrimaryAction => {
  if (healthState === 'healthy') {
    return {
      label: 'Continuar plano de hoje',
      helper: 'Se voce mantiver o plano hoje, fortalece a semana sem precisar reajustar nada.',
      action: 'keep_strategy',
    };
  }

  if (healthState === 'overplanning') {
    return {
      label: 'Parar de ajustar e executar',
      helper: 'Se voce fizer o primeiro bloco agora, transforma controle em avanco real.',
      action: 'execute_day_plan',
    };
  }

  if (healthState === 'fragmented') {
    return {
      label: 'Voltar ao plano principal',
      helper: 'Se voce concentrar esforco hoje, reduz ruido e volta a ganhar direcao.',
      action: 'execute_day_plan',
    };
  }

  if (topPriority?.kpi === 'strategicReviewApplyRate') {
    return {
      label: 'Aplicar ajuste recomendado',
      helper: 'Sua leitura ja mostrou o ajuste. Agora ele precisa virar mudanca real.',
      action: 'apply_adjustment',
    };
  }

  if (topPriority?.kpi === 'planningWithoutExecutionRate') {
    return {
      label: 'Ajustar plano da semana',
      helper: 'Simplifique a semana antes de adicionar mais controle.',
      action: 'adjust_plan',
    };
  }

  return {
    label: 'Recuperar execucao agora',
    helper: 'Se voce executar hoje, ainda consegue recuperar a semana antes da queda consolidar.',
    action: 'execute_day_plan',
  };
};

const resolvePrimaryInsight = (
  healthState: AdvancedHealthState,
  _snapshot: AdvancedSnapshot,
  topPriority: AdvancedPriorityItem | null,
  operation: AdvancedOperationSnapshot,
): ResolvedPrimaryInsight => {
  const priorityKpi = topPriority?.kpi || 'planExecutionRate';

  if (healthState === 'healthy') {
    return {
      eyebrow: 'Insight principal',
      title: 'Voce esta no ponto de consolidar a semana',
      description: 'Seu plano esta funcionando porque execucao e consistencia estao andando juntas. O melhor movimento agora e repetir o que ja esta funcionando.',
      supportLabel: 'Leitura atual',
      supportValue: 'Execucao acima do minimo esperado',
      kpiLabel: 'KPI lider',
      kpiValue: 'taxa de execucao do plano',
    };
  }

  if (healthState === 'overplanning') {
    return {
      eyebrow: 'Ajuste prioritario',
      title: 'Voce ja pensou o suficiente para hoje',
      description: 'O sistema mostra mais ajuste do que pratica. Seu proximo ganho nao vem de refinar o plano, e sim de cumprir o bloco principal.',
      supportLabel: 'Leitura atual',
      supportValue: 'Planejamento alto, execucao baixa',
      kpiLabel: 'KPI lider',
      kpiValue: 'planejamento sem execucao',
    };
  }

  if (healthState === 'fragmented') {
    return {
      eyebrow: 'Ajuste prioritario',
      title: 'Voce precisa reduzir dispersao antes de perder a semana',
      description: 'Ha sinais de fragmentacao entre ferramentas e frentes abertas. O ganho mais importante agora e voltar para uma unica linha de execucao.',
      supportLabel: 'Leitura atual',
      supportValue: 'Muitas rotas, pouca continuidade',
      kpiLabel: 'KPI lider',
      kpiValue: 'fragmentacao por ferramentas',
    };
  }

  return {
    eyebrow: 'Ajuste prioritario',
    title: 'Seu problema nao e estrategia. E tracao.',
    description:
      operation.weeklyDecision?.hypothesis ||
      'O plano ainda esta bom, mas a execucao caiu abaixo do necessario para sustentar resultado. Hoje precisa virar pratica antes de qualquer ajuste.',
    supportLabel: 'Leitura atual',
    supportValue: 'Plano coerente, execucao abaixo do ideal',
    kpiLabel: 'KPI lider',
    kpiValue: priorityKpi === 'weeklyConsistencyRate' ? 'consistencia semanal' : priorityKpi,
  };
};

const AdvancedHeader: React.FC<{
  healthState: AdvancedHealthState;
  operation: AdvancedOperationSnapshot;
}> = ({ healthState, operation }) => {
  const copy = HEALTH_COPY[healthState];

  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
            Controle estrategico
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">{copy.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{operation.quickContext || copy.subtitle}</p>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${copy.badgeClassName}`}>
          {copy.badgeLabel}
        </span>
      </div>
    </section>
  );
};

const AdvancedWeeklyPlanCard: React.FC<{
  healthState: AdvancedHealthState;
  snapshot: AdvancedSnapshot;
  onAdjustPlan: () => void;
  onKeepStrategy: () => void;
}> = ({ healthState, snapshot, onAdjustPlan, onKeepStrategy }) => {
  const copy = WEEKLY_PLAN_COPY[healthState];
  const primaryActionHandler = copy.primaryAction === 'keep' ? onKeepStrategy : onAdjustPlan;
  const secondaryActionHandler = copy.primaryAction === 'keep' ? onAdjustPlan : onKeepStrategy;

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">Plano estrategico da semana</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{copy.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{copy.summary}</p>
        </div>
        <CalendarRange className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Execucao</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(snapshot.planExecutionRate)}</p>
        </div>
        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Consistencia</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(snapshot.weeklyConsistencyRate)}</p>
        </div>
        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Planejamento sem execucao</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(snapshot.planningWithoutExecutionRate)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={primaryActionHandler}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {copy.primaryActionLabel}
        </button>
        <button
          onClick={secondaryActionHandler}
          className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {copy.secondaryActionLabel}
        </button>
      </div>
    </section>
  );
};

const AdvancedPrimaryInsightCard: React.FC<{
  healthState: AdvancedHealthState;
  snapshot: AdvancedSnapshot;
  topPriority: AdvancedPriorityItem | null;
  operation: AdvancedOperationSnapshot;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  primaryActionHelper: string;
}> = ({
  healthState,
  snapshot,
  topPriority,
  operation,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionHelper,
}) => {
  const insight = resolvePrimaryInsight(healthState, snapshot, topPriority, operation);

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-indigo-700">{insight.eyebrow}</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{insight.title}</h3>
        </div>
        <Compass className="h-5 w-5 text-indigo-500" />
      </div>

      <p className="mt-3 text-sm text-slate-700">{insight.description}</p>

      <div className="mt-4 rounded-xl border border-indigo-200 bg-white/80 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{insight.supportLabel}</p>
        <p className="mt-2 text-sm text-slate-700">{insight.supportValue}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{insight.kpiLabel}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{insight.kpiValue}</p>
      </div>

      {topPriority && healthState !== 'healthy' && (
        <p className="mt-3 text-xs text-slate-500">Diagnostico de apoio: {topPriority.diagnosis}</p>
      )}

      <button
        onClick={onPrimaryAction}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        {primaryActionLabel}
        <ArrowRight className="h-4 w-4" />
      </button>

      <p className="mt-2 text-xs text-slate-500">{primaryActionHelper}</p>
    </section>
  );
};

const AdvancedDailyExecutionCard: React.FC<{
  healthState: AdvancedHealthState;
  todayPlan: AdvancedTodayPlan;
  onExecuteDayPlan: () => void;
}> = ({ healthState, todayPlan, onExecuteDayPlan }) => {
  const status = getStatusLabel(todayPlan.status);
  const copy = DAILY_EXECUTION_COPY[healthState];

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">Execucao do dia</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{copy.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Bloco 1</p>
          <p className="mt-2 text-sm text-slate-700">{todayPlan.focusBlock}</p>
        </div>
        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Bloco 2</p>
          <p className="mt-2 text-sm text-slate-700">{todayPlan.questionBlock}</p>
        </div>
        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Bloco 3</p>
          <p className="mt-2 text-sm text-slate-700">{todayPlan.reviewBlock}</p>
        </div>
      </div>

      <button
        onClick={onExecuteDayPlan}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        {copy.ctaLabel}
        <CheckCircle2 className="h-4 w-4" />
      </button>
    </section>
  );
};

const AdvancedStrategicReviewCard: React.FC<{
  strongest: string;
  weakest: string;
  applyRate: number | null;
  recommendedAdjustment: string;
  onApplyAdjustment: () => void;
}> = ({ strongest, weakest, applyRate, recommendedAdjustment, onApplyAdjustment }) => (
  <section className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">Revisao estrategica</p>
        <h3 className="mt-1 text-lg font-bold text-slate-900">Transforme leitura em correcao de rota</h3>
      </div>
      <ShieldCheck className="h-5 w-5 text-slate-400" />
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Ponto forte</p>
        <p className="mt-2 text-sm text-slate-700">{strongest}</p>
      </div>
      <div className="rounded-xl border bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Ponto a melhorar</p>
        <p className="mt-2 text-sm text-slate-700">{weakest}</p>
      </div>
    </div>

    <div className="mt-3 rounded-xl border bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Ajuste recomendado</p>
      <p className="mt-2 text-sm text-slate-700">{recommendedAdjustment}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">Aplicacao atual</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{formatRate(applyRate)}</p>
    </div>

    <button
      onClick={onApplyAdjustment}
      className="mt-4 rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      Aplicar ajuste
    </button>
  </section>
);

const AdvancedMockPerformanceCard: React.FC<{
  mockCompletionRate: number | null;
  lastMockLabel?: string;
  trendLabel?: string;
  onStartMock: () => void;
  onReviewPerformance: () => void;
}> = ({ mockCompletionRate, lastMockLabel, trendLabel, onStartMock, onReviewPerformance }) => (
  <section className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">Simulado e performance</p>
        <h3 className="mt-1 text-lg font-bold text-slate-900">Pressao real para validar a estrategia</h3>
      </div>
      <Activity className="h-5 w-5 text-slate-400" />
    </div>

    <div className="mt-4 rounded-xl border bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Conclusao de simulados</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(mockCompletionRate)}</p>
      <p className="mt-2 text-sm text-slate-700">{lastMockLabel || 'Sem leitura forte de simulado ainda.'}</p>
      <p className="mt-1 text-xs text-slate-500">{trendLabel || 'Acompanhe a tendencia pelo scorecard da fase.'}</p>
    </div>

    <div className="mt-4 flex flex-wrap gap-2">
      <button
        onClick={onStartMock}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Iniciar simulado
      </button>
      <button
        onClick={onReviewPerformance}
        className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Revisar desempenho
      </button>
    </div>
  </section>
);

const TOOL_ICONS: Record<AdvancedToolRecommendation['id'], React.ComponentType<{ className?: string }>> = {
  cronograma: CalendarRange,
  metodos: Wrench,
  questoes: Filter,
};

const AdvancedRecommendedToolsCard: React.FC<{
  recommendations: AdvancedToolRecommendation[];
  onOpenTool: (toolId: string) => void;
}> = ({ recommendations, onOpenTool }) => (
  <section className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">Ferramentas recomendadas</p>
        <h3 className="mt-1 text-lg font-bold text-slate-900">Mais poder, ainda com contexto</h3>
      </div>
      <Target className="h-5 w-5 text-slate-400" />
    </div>

    <div className="mt-4 space-y-3">
      {recommendations.map((tool) => {
        const Icon = TOOL_ICONS[tool.id];

        return (
          <button
            key={tool.id}
            onClick={() => onOpenTool(tool.id)}
            className="flex w-full items-start justify-between rounded-xl border bg-slate-50 p-4 text-left hover:bg-slate-100"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white p-2">
                <Icon className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{tool.label}</p>
                <p className="mt-1 text-sm text-slate-600">{tool.reason}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </button>
        );
      })}
    </div>
  </section>
);

const AdvancedCompactScorecard: React.FC<{
  scorecard: AdvancedWeeklyScorecard;
}> = ({ scorecard }) => (
  <section className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">Scorecard compacto</p>
        <h3 className="mt-1 text-lg font-bold text-slate-900">Semana passada vs semana atual</h3>
      </div>
      <LineChart className="h-5 w-5 text-slate-400" />
    </div>

    <div className="mt-4 grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Semana passada</p>
        {scorecard.previousWeek ? (
          <>
            <p className="mt-2 text-sm font-semibold text-slate-900">{scorecard.previousWeek.focus}</p>
            <p className="mt-1 text-xs text-slate-500">{scorecard.previousWeek.kpi}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Sem registro anterior ainda.</p>
        )}
      </div>

      <div className="rounded-xl border bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Semana atual</p>
        {scorecard.currentWeek ? (
          <>
            <p className="mt-2 text-sm font-semibold text-slate-900">{scorecard.currentWeek.focus}</p>
            <p className="mt-1 text-xs text-slate-500">{scorecard.currentWeek.kpi}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Sem foco registrado ainda.</p>
        )}
      </div>

      <div className="rounded-xl border bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Mudanca percebida</p>
        <p className="mt-2 text-sm text-slate-700">{scorecard.summary}</p>
      </div>
    </div>
  </section>
);

export const AdvancedDashboardHome: React.FC<AdvancedDashboardHomeProps> = ({
  snapshot,
  priorityTable,
  operation,
  scorecard,
  healthState,
  todayPlan,
  strongest,
  weakest,
  recommendedAdjustment,
  lastMockLabel,
  trendLabel,
  recommendations,
  onAdjustPlan,
  onKeepStrategy,
  onExecuteDayPlan,
  onApplyAdjustment,
  onStartMock,
  onReviewPerformance,
  onOpenTool,
}) => {
  const topPriority = priorityTable[0] || null;
  const primaryAction = resolvePrimaryAction(healthState, topPriority);
  const handlePrimaryAction = React.useMemo(() => {
    if (primaryAction.action === 'keep_strategy') {
      return onKeepStrategy;
    }

    if (primaryAction.action === 'adjust_plan') {
      return onAdjustPlan;
    }

    if (primaryAction.action === 'apply_adjustment') {
      return onApplyAdjustment;
    }

    return onExecuteDayPlan;
  }, [onAdjustPlan, onApplyAdjustment, onExecuteDayPlan, onKeepStrategy, primaryAction.action]);

  return (
    <div className="space-y-5">
      <AdvancedHeader healthState={healthState} operation={operation} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <AdvancedPrimaryInsightCard
          healthState={healthState}
          snapshot={snapshot}
          topPriority={topPriority}
          operation={operation}
          onPrimaryAction={handlePrimaryAction}
          primaryActionLabel={primaryAction.label}
          primaryActionHelper={primaryAction.helper}
        />
        <AdvancedDailyExecutionCard
          healthState={healthState}
          todayPlan={todayPlan}
          onExecuteDayPlan={onExecuteDayPlan}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdvancedWeeklyPlanCard
          healthState={healthState}
          snapshot={snapshot}
          onAdjustPlan={onAdjustPlan}
          onKeepStrategy={onKeepStrategy}
        />
        <AdvancedStrategicReviewCard
          strongest={strongest}
          weakest={weakest}
          applyRate={snapshot.strategicReviewApplyRate}
          recommendedAdjustment={recommendedAdjustment}
          onApplyAdjustment={onApplyAdjustment}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdvancedMockPerformanceCard
          mockCompletionRate={snapshot.mockCompletionRate}
          lastMockLabel={lastMockLabel}
          trendLabel={trendLabel}
          onStartMock={onStartMock}
          onReviewPerformance={onReviewPerformance}
        />
        <AdvancedRecommendedToolsCard
          recommendations={recommendations}
          onOpenTool={onOpenTool}
        />
      </div>

      <AdvancedCompactScorecard scorecard={scorecard} />
    </div>
  );
};
