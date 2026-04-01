import type { PlanoTrackPresentationBuilder } from './types';

const buildTargetLabel = (targetCourse?: string | null, targetCollege?: string | null) =>
  [targetCourse, targetCollege].filter(Boolean).join(' - ');

const mapDistributionLabel = (label: string) => {
  if (label === 'Foco principal') return 'Area principal';
  if (label === 'Em andamento') return 'Area em andamento';
  if (label === 'Revisao prevista') return 'Revisao ativa';
  if (label === 'Ja iniciou') return 'Area ja iniciada';
  return 'Base da preparacao';
};

const mapNextStepLabel = (id: string, fallback: string) => {
  if (id === 'next-focus') return 'Proximo bloco ENEM';
  if (id === 'next-review') return 'Revisao ENEM';
  if (id === 'plan-continuity') return 'Continuidade ENEM';
  return fallback;
};

export const buildEnemPlanoPresentation: PlanoTrackPresentationBuilder = ({
  presentation,
  context,
}) => {
  const targetLabel = buildTargetLabel(
    context.enem?.targetCourse || null,
    context.enem?.targetCollege || null,
  );
  const supportHeadline = targetLabel || context.summaryTitle || context.examGoal || 'Preparacao ENEM';
  const supportDescription = context.summaryDescription
    || (context.examDate
      ? `Sua preparacao segue organizada para a meta de ${context.examDate}.`
      : 'O plano mantem revisao, pratica e consistencia visiveis na semana.');

  return {
    ...presentation,
    header: {
      ...presentation.header,
      eyebrow: 'Plano ENEM',
      title: 'Plano principal do ENEM',
      contextLine: targetLabel
        ? `${presentation.header.contextLine} - ${targetLabel}`
        : presentation.header.contextLine,
      statusLine: `${presentation.header.statusLine} A leitura do ciclo prioriza revisao, pratica e constancia.`,
    },
    summaryCards: [
      {
        ...presentation.summaryCards[0],
        eyebrow: 'Carga ENEM',
        detail: 'Distribuida para manter sua preparacao viva ao longo da semana.',
      },
      {
        ...presentation.summaryCards[1],
        eyebrow: 'Areas ativas',
        support: targetLabel ? `Meta ativa: ${targetLabel}` : presentation.summaryCards[1].support,
      },
      {
        ...presentation.summaryCards[2],
        eyebrow: 'Ciclo ENEM',
        support: presentation.summaryCards[2].support,
      },
    ],
    distribution: {
      copy: {
        eyebrow: 'Distribuicao ENEM',
        title: 'Como sua preparacao ENEM se divide',
        description: 'As areas com mais peso puxam mais carga nesta semana para manter o ENEM em progresso real.',
        footer: 'Revisao e pratica entram no peso do ciclo para sustentar a preparacao sem dispersao.',
      },
      items: presentation.distribution.items.map((item) => ({
        ...item,
        statusLabel: mapDistributionLabel(item.statusLabel),
      })),
    },
    nextSteps: {
      copy: {
        eyebrow: 'Proximos passos ENEM',
        title: 'O que vem a seguir na sua preparacao',
        description: 'Um resumo rapido do que merece atencao agora sem abrir o cronograma completo.',
      },
      items: presentation.nextSteps.items.map((item) => ({
        ...item,
        label: mapNextStepLabel(item.id, item.label),
      })),
    },
    support: {
      label: 'Radar ENEM',
      title: 'Cronograma ENEM completo',
      description: `${supportHeadline}. ${supportDescription}`,
    },
    rebalance: {
      label: presentation.rebalance.label,
      description: 'O ajuste leve redistribui areas, revisao e pratica sem desmontar o resto do ciclo ENEM.',
    },
    loadBalance: {
      ...presentation.loadBalance,
      todayEyebrow: 'Hoje na preparacao',
      executeLabel: 'Executar bloco ENEM',
      focusLabel: 'Area em foco',
      coverageDescription: 'Areas girando ao longo da semana.',
      quickReadLabel: 'Leitura ENEM',
      quickReadDescription: 'Preparacao organizada, execucao concentrada. A semana responde abaixo sem quebrar o loop principal.',
    },
  };
};

export default buildEnemPlanoPresentation;
