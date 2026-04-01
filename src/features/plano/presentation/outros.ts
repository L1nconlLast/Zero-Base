import type { PlanoOtherFocus, PlanoTrackPresentationBuilder } from './types';

const buildFocusSupport = (focus?: PlanoOtherFocus | null) => {
  if (focus === 'praticar') return 'A semana prioriza pratica consistente para transformar estudo em execucao.';
  if (focus === 'rotina') return 'A semana prioriza constancia e ritmo para sua trilha ganhar estabilidade.';
  if (focus === 'evoluir_tema') return 'A semana prioriza aprofundamento e progresso continuo no tema escolhido.';
  return 'A semana prioriza aprendizado consistente com passos curtos e claros.';
};

const mapDistributionLabel = (label: string) => {
  if (label === 'Foco principal') return 'Tema principal';
  if (label === 'Em andamento') return 'Tema em andamento';
  if (label === 'Revisao prevista') return 'Revisao da trilha';
  if (label === 'Ja iniciou') return 'Tema ja iniciado';
  return 'Base da trilha';
};

const mapNextStepLabel = (id: string, fallback: string) => {
  if (id === 'next-focus') return 'Proximo tema';
  if (id === 'next-review') return 'Revisao da trilha';
  if (id === 'plan-continuity') return 'Continuidade da trilha';
  return fallback;
};

export const buildOutrosPlanoPresentation: PlanoTrackPresentationBuilder = ({
  presentation,
  context,
}) => {
  const goalTitle = context.outros?.goalTitle || context.summaryTitle || 'Trilha pessoal';
  const focusSupport = buildFocusSupport(context.outros?.focus || null);
  const supportDescription = context.summaryDescription
    || (context.outros?.deadline
      ? `${focusSupport} Prazo em vista: ${context.outros.deadline}.`
      : focusSupport);

  return {
    ...presentation,
    header: {
      ...presentation.header,
      eyebrow: 'Plano da trilha',
      title: 'Plano principal da sua trilha',
      contextLine: `${presentation.header.contextLine} - ${goalTitle}`,
      statusLine: `${presentation.header.statusLine} ${focusSupport}`,
    },
    summaryCards: [
      {
        ...presentation.summaryCards[0],
        eyebrow: 'Carga da trilha',
        detail: 'Distribuida para manter evolucao real sem depender de motivacao aleatoria.',
      },
      {
        ...presentation.summaryCards[1],
        eyebrow: 'Temas ativos',
        support: goalTitle,
      },
      {
        ...presentation.summaryCards[2],
        eyebrow: 'Ritmo da semana',
        support: context.outros?.focus
          ? `Foco atual: ${context.outros.focus}`
          : presentation.summaryCards[2].support,
      },
    ],
    distribution: {
      copy: {
        eyebrow: 'Distribuicao da trilha',
        title: 'Como sua trilha se divide nesta semana',
        description: 'Os temas com mais peso puxam mais carga para manter sua trilha pessoal em progresso real.',
        footer: 'O plano mostra onde o ritmo esta concentrado para voce evoluir com consistencia ao longo da semana.',
      },
      items: presentation.distribution.items.map((item) => ({
        ...item,
        statusLabel: mapDistributionLabel(item.statusLabel),
      })),
    },
    nextSteps: {
      copy: {
        eyebrow: 'Proximos passos da trilha',
        title: 'O que vem a seguir na sua evolucao',
        description: 'Um resumo rapido do que merece atencao agora sem abrir o cronograma completo.',
      },
      items: presentation.nextSteps.items.map((item) => ({
        ...item,
        label: mapNextStepLabel(item.id, item.label),
      })),
    },
    support: {
      label: 'Trilha pessoal',
      title: 'Cronograma completo da trilha',
      description: `${goalTitle}. ${supportDescription}`,
    },
    rebalance: {
      label: presentation.rebalance.label,
      description: 'O ajuste leve redistribui temas e pratica sem desmontar o resto da sua trilha pessoal.',
    },
    loadBalance: {
      ...presentation.loadBalance,
      todayEyebrow: 'Hoje na trilha',
      executeLabel: 'Executar bloco da trilha',
      focusLabel: 'Tema em foco',
      coverageDescription: 'Temas girando ao longo da semana.',
      quickReadLabel: 'Leitura da trilha',
      quickReadDescription: 'Trilha organizada, execucao concentrada. A semana responde abaixo sem quebrar o ritmo que voce quer construir.',
    },
  };
};

export default buildOutrosPlanoPresentation;
