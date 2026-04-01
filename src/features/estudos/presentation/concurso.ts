import { resolveContestLabel } from '../../../utils/trackNarrative';
import type { StudyTrackPresentationBuilder } from './types';

export const buildConcursoStudyPresentation: StudyTrackPresentationBuilder = ({
  presentation,
  context,
  state,
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
    sessionHeader: {
      ...presentation.sessionHeader,
      contextLabel: `Concurso / ${state.currentBlockLabel}`,
      sessionTypeLabel: state.showPostFocusState
        ? 'Fechamento do edital'
        : state.showQuestionTransitionState
          ? 'Questoes do edital'
          : 'Bloco do edital',
      currentStepLabel: state.showPostFocusState
        ? 'Fechamento do bloco do edital'
        : state.showQuestionTransitionState
          ? 'Transicao para pratica do edital'
          : presentation.sessionHeader.currentStepLabel,
    },
    executionCore: {
      ...presentation.executionCore,
      eyebrowLabel: 'Nucleo do edital',
      progressTitle: 'Progresso do edital',
      controlsLabel: 'Ritmo da execucao',
      controlsDescription: 'Troque o ritmo da sessao sem sair do bloco principal do edital.',
      secondaryProgressLabel: state.showPostFocusState
        ? presentation.executionCore.secondaryProgressLabel
        : context.concurso?.board
          ? `O bloco continua alinhado ao estilo ${context.concurso.board}.`
          : presentation.executionCore.secondaryProgressLabel,
    },
    supportRail: {
      ...presentation.supportRail,
      eyebrow: 'Apoio do edital',
      intro: `Use esta coluna so para acompanhar o bloco do edital e fechar o registro sem reabrir o resto de ${contestDescriptor}.`,
      checklist: {
        ...presentation.supportRail.checklist,
        title: 'Checklist do edital',
      },
      closure: presentation.supportRail.closure
        ? {
          ...presentation.supportRail.closure,
          title: 'Fechamento do edital',
        }
        : undefined,
    },
    postExecutionBand: {
      ...presentation.postExecutionBand,
      contextTitle: 'Contexto do bloco do edital',
      continuityTitle: 'Depois desta sessao do concurso',
      context: {
        ...presentation.postExecutionBand.context,
        parentLabel: `${contestDescriptor} / ${state.activeStudyMethodName}`,
      },
      continuity: {
        ...presentation.postExecutionBand.continuity,
        progressHintLabel: context.concurso?.board
          ? `Ritmo ativo: ${context.concurso.board}`
          : `Ritmo ativo: ${state.activeStudyMethodName}`,
      },
    },
    executionRail: {
      eyebrow: 'Execucao do concurso',
      title: 'Este bloco do edital conduz a sessao',
      description: state.currentTargetQuestions > 0
        ? `${state.currentTargetQuestions} questoes previstas para validar este bloco do edital.`
        : `Bloco do edital pronto para hoje em ${contestDescriptor}.`,
      blockChipLabel: `Disciplina: ${state.currentBlockLabel}`,
      durationChipLabel: presentation.executionRail.durationChipLabel,
      modeChipLabel: presentation.executionRail.modeChipLabel,
    },
  };
};

export default buildConcursoStudyPresentation;
