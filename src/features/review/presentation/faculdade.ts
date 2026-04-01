import type { ReviewTrackPresentationBuilder } from './types';

const buildAcademicDescriptor = (course?: string | null, institution?: string | null) =>
  [course, institution].filter(Boolean).join(' - ');

export const buildFaculdadeReviewPresentation: ReviewTrackPresentationBuilder = ({
  presentation,
  context,
}) => {
  const descriptor = buildAcademicDescriptor(
    context.faculdade?.course || null,
    context.faculdade?.institution || null,
  );

  return {
    ...presentation,
    header: {
      ...presentation.header,
      eyebrow: 'Revisao da faculdade',
      metricsTitle: 'Ritmo academico',
      contextLabel: context.summaryDescription
        || (descriptor
          ? `Fila diaria de revisao das materias em ${descriptor}, um item por vez para reforcar a rotina academica.`
          : 'Fila diaria de revisao das materias, um item por vez para reforcar a rotina academica.'),
      footerLabel: presentation.header.status === 'active'
        ? 'Um item por vez para reforcar materia, prova ou trabalho sem reabrir o resto da semana.'
        : presentation.header.footerLabel,
    },
    core: {
      ...presentation.core,
      trackLabel: 'Faculdade',
      eyebrowLabel: presentation.core.status === 'completed' ? 'Revisao academica encerrada' : 'Item atual da materia',
      sequenceTitle: 'Ritmo academico',
      promptLabel: presentation.core.status === 'completed' ? 'Fechamento academico' : 'Recuperacao da materia',
      answerVisibleLabel: 'Resposta da materia',
      answerHiddenLabel: 'Resposta protegida',
    },
    summary: {
      ...presentation.summary,
      eyebrow: 'Resumo academico',
      queueTitle: 'Ordem de hoje na faculdade',
    },
    queue: {
      ...presentation.queue,
      items: presentation.queue.items.map((item) => ({
        ...item,
        trackLabel: 'Faculdade',
      })),
    },
  };
};

export default buildFaculdadeReviewPresentation;
