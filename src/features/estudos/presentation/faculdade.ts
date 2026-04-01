import type { StudyTrackPresentationBuilder } from './types';

const buildAcademicDescriptor = (course?: string | null, institution?: string | null) =>
  [course, institution].filter(Boolean).join(' - ');

const buildSessionType = (focus?: 'rotina' | 'provas' | 'trabalhos' | null) => {
  if (focus === 'provas') return 'Preparacao para prova';
  if (focus === 'trabalhos') return 'Bloco de trabalho';
  return 'Sessao da disciplina';
};

export const buildFaculdadeStudyPresentation: StudyTrackPresentationBuilder = ({
  presentation,
  context,
  state,
}) => {
  const descriptor = buildAcademicDescriptor(
    context.faculdade?.course || null,
    context.faculdade?.institution || null,
  );
  const focusLabel = buildSessionType(context.faculdade?.focus || null);

  return {
    ...presentation,
    sessionHeader: {
      ...presentation.sessionHeader,
      contextLabel: `Faculdade / ${state.currentBlockLabel}`,
      sessionTypeLabel: focusLabel,
      currentStepLabel: presentation.sessionHeader.currentStepLabel,
    },
    executionCore: {
      ...presentation.executionCore,
      eyebrowLabel: 'Nucleo academico',
      progressTitle: 'Progresso da sessao',
      controlsLabel: 'Ritmo academico',
      controlsDescription: 'Troque o ritmo da sessao sem sair da materia ou entrega atual.',
    },
    supportRail: {
      ...presentation.supportRail,
      eyebrow: 'Apoio academico',
      intro: descriptor
        ? `Use esta coluna so para acompanhar a sessao de ${descriptor} e fechar o registro quando o bloco terminar.`
        : 'Use esta coluna so para acompanhar a sessao da disciplina e fechar o registro quando o bloco terminar.',
      checklist: {
        ...presentation.supportRail.checklist,
        title: 'Checklist da sessao academica',
      },
      closure: presentation.supportRail.closure
        ? {
          ...presentation.supportRail.closure,
          title: 'Fechamento academico',
        }
        : undefined,
    },
    postExecutionBand: {
      ...presentation.postExecutionBand,
      contextTitle: 'Contexto da sessao academica',
      continuityTitle: 'Depois desta sessao da faculdade',
      context: {
        ...presentation.postExecutionBand.context,
        parentLabel: descriptor
          ? `${descriptor} / Rotina academica`
          : 'Rotina academica',
      },
      continuity: {
        ...presentation.postExecutionBand.continuity,
        progressHintLabel: context.faculdade?.focus
          ? `Foco atual: ${context.faculdade.focus}`
          : presentation.postExecutionBand.continuity.progressHintLabel,
      },
    },
    executionRail: {
      eyebrow: 'Execucao da faculdade',
      title: focusLabel === 'Preparacao para prova'
        ? 'Esta sessao prepara sua prova atual'
        : focusLabel === 'Bloco de trabalho'
          ? 'Este bloco de entrega conduz a sessao'
          : 'Esta materia conduz a sessao',
      description: descriptor
        ? `A sessao segue o contexto academico de ${descriptor}.`
        : 'A sessao segue o contexto da sua rotina academica.',
      blockChipLabel: `Materia: ${state.currentBlockLabel}`,
      durationChipLabel: presentation.executionRail.durationChipLabel,
      modeChipLabel: presentation.executionRail.modeChipLabel,
    },
  };
};

export default buildFaculdadeStudyPresentation;
