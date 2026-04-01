import type { PlanoHybridPrimaryFocus, PlanoTrackPresentationBuilder } from './types';

const buildContestLabel = (name?: string | null, area?: string | null) =>
  name || area || 'concurso';

const buildPrimaryFocusLabel = (
  primaryFocus: PlanoHybridPrimaryFocus | null | undefined,
  contestLabel: string,
) => {
  if (primaryFocus === 'enem') return 'ENEM no centro';
  if (primaryFocus === 'concurso') return `${contestLabel} no centro`;
  return 'Equilibrio entre as frentes';
};

const buildSecondaryFocusLabel = (
  primaryFocus: PlanoHybridPrimaryFocus | null | undefined,
  contestLabel: string,
) => {
  if (primaryFocus === 'enem') return `${contestLabel} em continuidade`;
  if (primaryFocus === 'concurso') return 'ENEM em continuidade';
  return 'Duas frentes coordenadas';
};

const buildBalanceCopy = (
  primaryFocus: PlanoHybridPrimaryFocus | null | undefined,
  contestLabel: string,
) => {
  if (primaryFocus === 'enem') {
    return `O ENEM puxa a semana, enquanto ${contestLabel} continua ativo sem competir pelo centro.`;
  }

  if (primaryFocus === 'concurso') {
    return `${contestLabel} puxa a semana, enquanto o ENEM entra como continuidade controlada.`;
  }

  return `As duas frentes seguem ativas com carga controlada entre ENEM e ${contestLabel}.`;
};

const mapDistributionLabel = (label: string) => {
  if (label === 'Foco principal') return 'Frente principal';
  if (label === 'Em andamento') return 'Frente em andamento';
  if (label === 'Revisao prevista') return 'Revisao da rotina';
  if (label === 'Ja iniciou') return 'Frente ja iniciada';
  return 'Base do equilibrio';
};

const mapNextStepLabel = (id: string) => {
  if (id === 'next-focus') return 'Frente principal';
  if (id === 'next-review') return 'Revisao da rotina';
  return 'Segunda frente';
};

export const buildHibridoPlanoPresentation: PlanoTrackPresentationBuilder = ({
  presentation,
  context,
}) => {
  const primaryFocus = context.hibrido?.primaryFocus || 'equilibrado';
  const contestLabel = buildContestLabel(
    context.concurso?.name || null,
    context.concurso?.area || null,
  );
  const primaryFocusLabel = buildPrimaryFocusLabel(primaryFocus, contestLabel);
  const secondaryFocusLabel = buildSecondaryFocusLabel(primaryFocus, contestLabel);
  const balanceCopy = buildBalanceCopy(primaryFocus, contestLabel);

  return {
    ...presentation,
    header: {
      ...presentation.header,
      eyebrow: 'Plano hibrido',
      title: primaryFocus === 'enem'
        ? 'Plano hibrido com ENEM no centro'
        : primaryFocus === 'concurso'
          ? 'Plano hibrido com concurso no centro'
          : 'Plano hibrido equilibrado',
      contextLine: `${presentation.header.contextLine} - ${balanceCopy}`,
      statusLine: `${presentation.header.statusLine} O plano coordena frente principal e secundaria sem virar duas rotinas concorrentes.`,
    },
    summaryCards: [
      {
        ...presentation.summaryCards[0],
        eyebrow: 'Carga hibrida',
        detail: balanceCopy,
      },
      {
        ...presentation.summaryCards[1],
        eyebrow: 'Frentes ativas',
        value: primaryFocus === 'equilibrado' ? 'ENEM + Concurso' : 'Duas frentes coordenadas',
        detail: primaryFocusLabel,
        support: secondaryFocusLabel,
      },
      {
        ...presentation.summaryCards[2],
        eyebrow: 'Equilibrio da semana',
        value: primaryFocusLabel,
        detail: secondaryFocusLabel,
        support: presentation.summaryCards[2].value,
      },
    ],
    distribution: {
      copy: {
        eyebrow: 'Distribuicao hibrida',
        title: 'Como ENEM e concurso se distribuem nesta semana',
        description: 'O plano coordena a frente principal e a secundaria sem deixar as duas competirem pelo mesmo espaco.',
        footer: 'A leitura da semana deixa claro onde esta o foco principal e como a segunda frente continua viva.',
      },
      items: presentation.distribution.items.map((item) => ({
        ...item,
        statusLabel: mapDistributionLabel(item.statusLabel),
      })),
    },
    nextSteps: {
      copy: {
        eyebrow: 'Proximos passos do hibrido',
        title: 'O que vem a seguir nas duas frentes',
        description: 'Um resumo rapido do que merece atencao agora sem perder a hierarquia entre foco principal e secundaria.',
      },
      items: presentation.nextSteps.items.map((item) => ({
        ...item,
        label: mapNextStepLabel(item.id),
      })),
    },
    support: {
      label: 'Equilibrio hibrido',
      title: 'Visao completa da semana hibrida',
      description: `${primaryFocusLabel}. ${secondaryFocusLabel}. ${context.summaryDescription || balanceCopy}`,
    },
    rebalance: {
      label: presentation.rebalance.label,
      description: 'O ajuste leve redistribui ENEM e concurso sem deixar as duas frentes brigarem pela mesma carga.',
    },
    loadBalance: {
      ...presentation.loadBalance,
      todayEyebrow: 'Hoje no modo hibrido',
      executeLabel: 'Executar bloco principal',
      focusLabel: 'Frente em foco',
      coverageDescription: 'Temas das duas frentes girando ao longo da semana.',
      quickReadLabel: 'Leitura hibrida',
      quickReadDescription: 'Equilibrio organizado, execucao concentrada. A semana responde abaixo sem transformar ENEM e concurso em dois centros concorrentes.',
    },
  };
};

export default buildHibridoPlanoPresentation;
