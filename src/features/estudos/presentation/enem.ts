import type { StudyTrackPresentationBuilder } from './types';

const buildTargetLabel = (targetCourse?: string | null, targetCollege?: string | null) =>
  [targetCourse, targetCollege].filter(Boolean).join(' - ');

export const buildEnemStudyPresentation: StudyTrackPresentationBuilder = ({
  presentation,
  context,
  state,
}) => {
  const targetLabel = buildTargetLabel(
    context.enem?.targetCourse || null,
    context.enem?.targetCollege || null,
  );

  return {
    ...presentation,
    sessionHeader: {
      ...presentation.sessionHeader,
      contextLabel: `ENEM / ${state.currentBlockLabel}`,
      sessionTypeLabel: state.showPostFocusState
        ? 'Fechamento da preparacao'
        : state.showQuestionTransitionState
          ? 'Validacao ENEM'
          : 'Bloco de preparacao',
      title: presentation.sessionHeader.title,
      currentStepLabel: state.showPostFocusState
        ? 'Fechamento do bloco ENEM'
        : state.showQuestionTransitionState
          ? 'Transicao para pratica ENEM'
          : presentation.sessionHeader.currentStepLabel,
    },
    executionCore: {
      ...presentation.executionCore,
      eyebrowLabel: 'Nucleo do ENEM',
      progressTitle: 'Progresso da preparacao',
      controlsLabel: 'Ritmo da preparacao',
      controlsDescription: 'Troque o ritmo da sessao sem sair do bloco principal do ENEM.',
      secondaryProgressLabel: state.showPostFocusState
        ? presentation.executionCore.secondaryProgressLabel
        : state.currentTargetQuestions > 0
          ? `${state.currentTargetQuestions} questoes fecham a validacao deste bloco ENEM.`
          : presentation.executionCore.secondaryProgressLabel,
    },
    supportRail: {
      ...presentation.supportRail,
      eyebrow: 'Apoio ENEM',
      intro: targetLabel
        ? `Use esta coluna so para acompanhar a preparacao de ${targetLabel} e fechar o registro quando o bloco terminar.`
        : 'Use esta coluna so para acompanhar a preparacao e fechar o registro quando o bloco terminar.',
      checklist: {
        ...presentation.supportRail.checklist,
        title: 'Checklist da preparacao',
      },
      closure: presentation.supportRail.closure
        ? {
          ...presentation.supportRail.closure,
          title: 'Fechamento ENEM',
        }
        : undefined,
    },
    postExecutionBand: {
      ...presentation.postExecutionBand,
      contextTitle: 'Contexto do bloco ENEM',
      continuityTitle: 'Depois desta sessao ENEM',
      context: {
        ...presentation.postExecutionBand.context,
        parentLabel: targetLabel
          ? `Preparacao ENEM / ${targetLabel}`
          : 'Preparacao ENEM',
      },
      continuity: {
        ...presentation.postExecutionBand.continuity,
        progressHintLabel: `Ritmo ativo: ${state.activeStudyMethodName} no ENEM`,
      },
    },
    executionRail: {
      eyebrow: 'Execucao ENEM',
      title: 'Este bloco de preparacao conduz a sessao',
      description: state.currentTargetQuestions > 0
        ? `${state.currentTargetQuestions} questoes previstas para validar este bloco do ENEM.`
        : 'Bloco de preparacao ENEM pronto para hoje.',
      blockChipLabel: `Area: ${state.currentBlockLabel}`,
      durationChipLabel: presentation.executionRail.durationChipLabel,
      modeChipLabel: presentation.executionRail.modeChipLabel,
    },
  };
};

export default buildEnemStudyPresentation;
