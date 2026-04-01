import {
  normalizeBlockLabel,
  truncatePresentationLabel,
} from '../../utils/uiLabels';
import type { UsePlanoResult } from './hooks/usePlano';
import { buildConcursoPlanoPresentation } from './presentation/concurso';
import { buildEnemPlanoPresentation } from './presentation/enem';
import { buildFaculdadePlanoPresentation } from './presentation/faculdade';
import { buildHibridoPlanoPresentation } from './presentation/hibrido';
import { buildOutrosPlanoPresentation } from './presentation/outros';
import type {
  PlanoPresentation,
  PlanoSummaryCard,
  PlanoTrackContext,
  PlanoTrackPresentationBuilder,
} from './presentation/types';

export type {
  PlanoCollegeFocus,
  PlanoHybridPrimaryFocus,
  PlanoOtherFocus,
  PlanoPresentation,
  PlanoTrackContext,
  PlanoTrackProfile,
} from './presentation/types';

const TRACK_BUILDERS: Record<PlanoTrackContext['profile'], PlanoTrackPresentationBuilder> = {
  enem: buildEnemPlanoPresentation,
  concurso: buildConcursoPlanoPresentation,
  faculdade: buildFaculdadePlanoPresentation,
  outros: buildOutrosPlanoPresentation,
  hibrido: buildHibridoPlanoPresentation,
};

const buildBaseSummaryCards = (
  plan: UsePlanoResult,
  currentBlockLabel: string,
  weeklyCompletedSessions: number,
  weeklyPlannedSessions: number,
): PlanoSummaryCard[] => {
  const normalizedCurrentBlockLabel = normalizeBlockLabel(currentBlockLabel);
  const safeWeeklyPlannedSessions = Math.max(weeklyPlannedSessions, 1);
  const remainingSessions = Math.max(weeklyPlannedSessions - weeklyCompletedSessions, 0);

  return [
    {
      id: 'load',
      eyebrow: 'Carga da semana',
      value: `${plan.plannedMinutes} min previstos`,
      detail: `Distribuidos em ${plan.activeDays} dias ativos`,
      support: `${safeWeeklyPlannedSessions} sessoes-base no ciclo atual`,
    },
    {
      id: 'subjects',
      eyebrow: 'Disciplinas ativas',
      value: `${plan.uniqueSubjects} em andamento`,
      detail: `Com foco em ${truncatePresentationLabel(normalizedCurrentBlockLabel, 22, normalizedCurrentBlockLabel)}`,
      support: 'Rotacao distribuida ao longo da semana',
    },
    {
      id: 'cycle',
      eyebrow: 'Ciclo atual',
      value: weeklyPlannedSessions > 0
        ? remainingSessions > 0
          ? `${remainingSessions} sessoes restantes`
          : 'Meta no trilho'
        : 'Em ajuste',
      detail: weeklyPlannedSessions > 0
        ? `${weeklyCompletedSessions}/${safeWeeklyPlannedSessions} sessoes ja distribuidas`
        : 'Monte a semana para liberar o ciclo atual',
      support: plan.reviewState.label,
    },
  ];
};

const buildBasePlanoPresentation = (
  plan: UsePlanoResult,
  currentBlockLabel: string,
  weeklyCompletedSessions: number,
  weeklyPlannedSessions: number,
): PlanoPresentation => ({
  header: plan.header,
  summaryCards: buildBaseSummaryCards(
    plan,
    currentBlockLabel,
    weeklyCompletedSessions,
    weeklyPlannedSessions,
  ),
  distribution: {
    copy: {
      eyebrow: 'Distribuicao do plano',
      title: 'Como seu estudo se divide neste ciclo',
      description: 'As disciplinas com mais peso recebem mais carga nesta semana. Comece pelo topo para entender onde o plano esta concentrado.',
      footer: 'As disciplinas com mais foco recebem mais sessoes e puxam o ritmo do plano nesta semana.',
    },
    items: plan.distribution,
  },
  nextSteps: {
    copy: {
      eyebrow: 'Proximos passos',
      title: 'O que vem a seguir no plano',
      description: 'Um resumo rapido do que merece atencao agora, sem abrir o cronograma inteiro.',
    },
    items: plan.nextSteps,
  },
  support: {
    label: 'Apoio operacional',
    title: 'Cronograma completo',
    description: 'Entre no detalhe so quando precisar reequilibrar o plano. A leitura principal da semana continua no quadro acima.',
  },
  rebalance: {
    label: plan.recommendedEditCopy,
    description: 'O ajuste leve abre o editor real do dia recomendado para rebalancear a semana sem desmontar o resto do plano.',
  },
  loadBalance: {
    todayEyebrow: 'Hoje no plano',
    executeLabel: 'Executar plano de hoje',
    focusLabel: 'Bloco em foco',
    coverageDescription: 'Disciplinas girando ao longo da semana.',
    quickReadLabel: 'Leitura rapida',
    quickReadDescription: 'Planejamento organizado, execucao concentrada. A semana responde abaixo sem quebrar o loop principal.',
  },
});

export const buildPlanoTrackPresentation = ({
  plan,
  currentBlockLabel,
  weeklyCompletedSessions,
  weeklyPlannedSessions,
  context,
}: {
  plan: UsePlanoResult;
  currentBlockLabel: string;
  weeklyCompletedSessions: number;
  weeklyPlannedSessions: number;
  context?: PlanoTrackContext | null;
}): PlanoPresentation => {
  const basePresentation = buildBasePlanoPresentation(
    plan,
    currentBlockLabel,
    weeklyCompletedSessions,
    weeklyPlannedSessions,
  );
  const resolvedContext: PlanoTrackContext = {
    profile: context?.profile || 'enem',
    ...context,
  };
  const builder = TRACK_BUILDERS[resolvedContext.profile];

  return builder({
    plan,
    presentation: basePresentation,
    context: resolvedContext,
  });
};

export default buildPlanoTrackPresentation;
