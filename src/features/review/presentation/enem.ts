import type { ReviewTrackPresentationBuilder } from './types';

export const buildEnemReviewPresentation: ReviewTrackPresentationBuilder = ({
  presentation,
  context,
}) => ({
  ...presentation,
  header: {
    ...presentation.header,
    eyebrow: 'Revisao ENEM',
    metricsTitle: 'Ritmo da preparacao',
    contextLabel: context.summaryDescription
      || 'Fila diaria de revisao da preparacao, um item por vez, para manter o ENEM vivo na memoria.',
    footerLabel: presentation.header.status === 'active'
      ? 'Um item por vez para limpar a fila da preparacao sem reabrir o resto do plano.'
      : presentation.header.footerLabel,
  },
  core: {
    ...presentation.core,
    trackLabel: 'ENEM',
    eyebrowLabel: presentation.core.status === 'completed' ? 'Revisao ENEM encerrada' : 'Item atual da preparacao',
    sequenceTitle: 'Ritmo da preparacao',
    promptLabel: presentation.core.status === 'completed' ? 'Fechamento da preparacao' : 'Recuperacao ENEM',
    answerVisibleLabel: 'Resposta da preparacao',
    answerHiddenLabel: 'Resposta protegida',
  },
  summary: {
    ...presentation.summary,
    eyebrow: 'Resumo da preparacao',
    queueTitle: 'Ordem de hoje no ENEM',
    nextStepLabel: presentation.summary.nextStepLabel,
  },
  queue: {
    ...presentation.queue,
    items: presentation.queue.items.map((item) => ({
      ...item,
      trackLabel: 'ENEM',
    })),
  },
});

export default buildEnemReviewPresentation;
