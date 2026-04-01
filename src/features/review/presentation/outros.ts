import type { ReviewTrackPresentationBuilder } from './types';

export const buildOutrosReviewPresentation: ReviewTrackPresentationBuilder = ({
  presentation,
  context,
}) => {
  const goalTitle = context.outros?.goalTitle || context.summaryTitle || 'Trilha pessoal';

  return {
    ...presentation,
    header: {
      ...presentation.header,
      eyebrow: 'Revisao da trilha',
      metricsTitle: 'Ritmo da trilha',
      contextLabel: context.summaryDescription
        || `Fila diaria de revisao da trilha ${goalTitle}, um item por vez para manter o tema vivo na memoria.`,
      footerLabel: presentation.header.status === 'active'
        ? 'Um item por vez para reforcar a trilha sem quebrar a continuidade do tema.'
        : presentation.header.footerLabel,
    },
    core: {
      ...presentation.core,
      trackLabel: 'Trilha',
      eyebrowLabel: presentation.core.status === 'completed' ? 'Revisao da trilha encerrada' : 'Item atual da trilha',
      sequenceTitle: 'Ritmo da trilha',
      promptLabel: presentation.core.status === 'completed' ? 'Fechamento da trilha' : 'Recuperacao do tema',
      answerVisibleLabel: 'Resposta da trilha',
      answerHiddenLabel: 'Resposta protegida',
    },
    summary: {
      ...presentation.summary,
      eyebrow: 'Resumo da trilha',
      queueTitle: 'Ordem de hoje na trilha',
    },
    queue: {
      ...presentation.queue,
      items: presentation.queue.items.map((item) => ({
        ...item,
        trackLabel: 'Trilha',
      })),
    },
  };
};

export default buildOutrosReviewPresentation;
