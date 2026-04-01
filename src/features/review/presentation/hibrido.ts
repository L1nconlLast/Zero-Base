import {
  resolveContestLabel,
  resolveHybridOriginFromLabel,
} from '../../../utils/trackNarrative';
import type { DailyReviewQueueItem } from '../types';
import type { ReviewTrackPresentationBuilder } from './types';

const resolveTrackLabel = (
  item: DailyReviewQueueItem,
  primaryFocus: 'enem' | 'concurso' | 'equilibrado' | null | undefined,
): 'ENEM' | 'Concurso' => {
  const source = item.subjectLabel || item.title;
  return resolveHybridOriginFromLabel(source, primaryFocus) === 'concurso' ? 'Concurso' : 'ENEM';
};

export const buildHibridoReviewPresentation: ReviewTrackPresentationBuilder = ({
  presentation,
  context,
}) => {
  const primaryFocus = context.hibrido?.primaryFocus || 'equilibrado';
  const contestLabel = resolveContestLabel(
    context.concurso?.name || null,
    context.concurso?.area || null,
  );
  const activeTrackLabel = presentation.queue.currentItemId
    ? resolveTrackLabel(
      presentation.queue.items.find((item) => item.id === presentation.queue.currentItemId)
      || presentation.queue.items[0],
      primaryFocus,
    )
    : (primaryFocus === 'concurso' ? 'Concurso' : 'ENEM');

  return {
    ...presentation,
    header: {
      ...presentation.header,
      eyebrow: 'Revisao hibrida',
      metricsTitle: 'Ritmo das duas frentes',
      contextLabel: context.summaryDescription
        || `Fila diaria com ENEM e ${contestLabel}, um item por vez, para manter as duas frentes em equilibrio.`,
      footerLabel: presentation.header.status === 'active'
        ? `Um item por vez para limpar a fila hibrida sem perder ${activeTrackLabel} do centro atual.`
        : presentation.header.footerLabel,
    },
    core: {
      ...presentation.core,
      trackLabel: activeTrackLabel,
      eyebrowLabel: presentation.core.status === 'completed' ? 'Revisao hibrida encerrada' : 'Item atual da rotina hibrida',
      sequenceTitle: 'Ritmo das duas frentes',
      promptLabel: presentation.core.status === 'completed' ? 'Fechamento da rotina' : 'Recuperacao da frente atual',
      answerVisibleLabel: 'Resposta da frente atual',
      answerHiddenLabel: 'Resposta protegida',
    },
    summary: {
      ...presentation.summary,
      eyebrow: 'Resumo da rotina hibrida',
      queueTitle: 'Ordem de hoje nas duas frentes',
      nextStepLabel: presentation.summary.nextStepLabel,
    },
    queue: {
      ...presentation.queue,
      items: presentation.queue.items.map((item) => ({
        ...item,
        trackLabel: resolveTrackLabel(item, primaryFocus),
      })),
    },
  };
};

export default buildHibridoReviewPresentation;
