import type { PlanoTrackPresentationBuilder } from './types';

const buildContestLabel = (name?: string | null, area?: string | null) =>
  name || area || 'concurso';

const buildContestHeadline = (
  contestLabel: string,
  board?: string | null,
) => [contestLabel, board].filter(Boolean).join(' - ');

const mapDistributionLabel = (label: string) => {
  if (label === 'Foco principal') return 'Disciplina principal';
  if (label === 'Em andamento') return 'Disciplina em andamento';
  if (label === 'Revisao prevista') return 'Revisao do edital';
  if (label === 'Ja iniciou') return 'Disciplina ja iniciada';
  return 'Base do edital';
};

const mapNextStepLabel = (id: string, fallback: string) => {
  if (id === 'next-focus') return 'Proxima disciplina';
  if (id === 'next-review') return 'Revisao do edital';
  if (id === 'plan-continuity') return 'Continuidade do edital';
  return fallback;
};

export const buildConcursoPlanoPresentation: PlanoTrackPresentationBuilder = ({
  presentation,
  context,
}) => {
  const contestLabel = buildContestLabel(
    context.concurso?.name || null,
    context.concurso?.area || null,
  );
  const contestHeadline = buildContestHeadline(contestLabel, context.concurso?.board || null);
  const supportDescription = context.summaryDescription
    || (context.examDate
      ? `Seu ritmo esta alinhado ao prazo da prova em ${context.examDate}.`
      : 'O plano segue orientado por edital, banca e disciplinas com mais peso.');

  return {
    ...presentation,
    header: {
      ...presentation.header,
      eyebrow: 'Plano do concurso',
      title: 'Plano principal do edital',
      contextLine: `${contestHeadline} - ${presentation.header.contextLine}`,
      statusLine: `${presentation.header.statusLine} O ciclo puxa edital, revisao e pratica em cima do prazo.`,
    },
    summaryCards: [
      {
        ...presentation.summaryCards[0],
        eyebrow: 'Carga do edital',
        detail: 'Distribuida para manter o edital andando sem perder revisao.',
      },
      {
        ...presentation.summaryCards[1],
        eyebrow: 'Disciplinas do edital',
        support: context.concurso?.board
          ? `Banca em foco: ${context.concurso.board}`
          : 'O plano segue o peso das disciplinas desta semana',
      },
      {
        ...presentation.summaryCards[2],
        eyebrow: 'Ciclo do concurso',
        support: context.examDate
          ? `Prazo ativo: ${context.examDate}`
          : presentation.summaryCards[2].support,
      },
    ],
    distribution: {
      copy: {
        eyebrow: 'Distribuicao do edital',
        title: 'Como o edital se divide nesta semana',
        description: 'As disciplinas com maior peso puxam mais carga para manter o concurso em progresso real.',
        footer: 'Edital, revisao e treino entram no mesmo quadro para mostrar onde o plano esta concentrado.',
      },
      items: presentation.distribution.items.map((item) => ({
        ...item,
        statusLabel: mapDistributionLabel(item.statusLabel),
      })),
    },
    nextSteps: {
      copy: {
        eyebrow: 'Proximos passos do edital',
        title: 'O que pede atencao no concurso',
        description: 'Um resumo rapido do que merece atencao agora sem abrir o cronograma completo.',
      },
      items: presentation.nextSteps.items.map((item) => ({
        ...item,
        label: mapNextStepLabel(item.id, item.label),
      })),
    },
    support: {
      label: 'Radar do concurso',
      title: 'Cronograma completo do edital',
      description: `${contestHeadline}. ${supportDescription}`,
    },
    rebalance: {
      label: presentation.rebalance.label,
      description: 'O ajuste leve redistribui edital, revisao e pratica sem desmontar o resto do plano do concurso.',
    },
    loadBalance: {
      ...presentation.loadBalance,
      todayEyebrow: 'Hoje no edital',
      executeLabel: 'Executar bloco do concurso',
      focusLabel: 'Disciplina em foco',
      coverageDescription: 'Disciplinas do edital girando ao longo da semana.',
      quickReadLabel: 'Leitura do edital',
      quickReadDescription: 'Planejamento orientado por banca e prazo. O quadro abaixo mostra onde o edital esta mais pesado agora.',
    },
  };
};

export default buildConcursoPlanoPresentation;
