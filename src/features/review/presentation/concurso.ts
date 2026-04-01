import { resolveContestLabel } from '../../../utils/trackNarrative';
import type { ReviewTrackPresentationBuilder } from './types';

export const buildConcursoReviewPresentation: ReviewTrackPresentationBuilder = ({
  presentation,
  context,
}) => {
  const contestLabel = resolveContestLabel(
    context.concurso?.name || null,
    context.concurso?.area || null,
  );
  const contestDescriptor = context.concurso?.board
    ? `${contestLabel} - ${context.concurso.board}`
    : contestLabel;

  return {
    ...presentation,
    header: {
      ...presentation.header,
      eyebrow: 'Revisao do concurso',
      metricsTitle: 'Ritmo do edital',
      contextLabel: context.summaryDescription
        || `Fila diaria de revisao do edital em ${contestDescriptor}, um item por vez, sem reabrir o resto do plano.`,
      footerLabel: presentation.header.status === 'active'
        ? 'Um item por vez para limpar a revisao do edital sem perder o ritmo da banca.'
        : presentation.header.footerLabel,
    },
    core: {
      ...presentation.core,
      trackLabel: 'Concurso',
      eyebrowLabel: presentation.core.status === 'completed' ? 'Revisao do edital encerrada' : 'Item atual do edital',
      sequenceTitle: 'Ritmo do edital',
      promptLabel: presentation.core.status === 'completed' ? 'Fechamento do edital' : 'Recuperacao do edital',
      answerVisibleLabel: 'Resposta do edital',
      answerHiddenLabel: 'Resposta protegida',
    },
    summary: {
      ...presentation.summary,
      eyebrow: 'Resumo do edital',
      queueTitle: 'Ordem de hoje no concurso',
    },
    queue: {
      ...presentation.queue,
      items: presentation.queue.items.map((item) => ({
        ...item,
        trackLabel: 'Concurso',
      })),
    },
  };
};

export default buildConcursoReviewPresentation;
