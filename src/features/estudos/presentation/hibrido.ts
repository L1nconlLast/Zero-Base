import {
  resolveContestLabel,
  resolveHybridOriginFromLabel,
} from '../../../utils/trackNarrative';
import type { StudyTrackPresentationBuilder } from './types';

export const buildHibridoStudyPresentation: StudyTrackPresentationBuilder = ({
  presentation,
  context,
  state,
}) => {
  const primaryFocus = context.hibrido?.primaryFocus || 'equilibrado';
  const origin = resolveHybridOriginFromLabel(state.currentBlockLabel, primaryFocus);
  const contestLabel = resolveContestLabel(
    context.concurso?.name || null,
    context.concurso?.area || null,
  );
  const originLabel = origin === 'concurso' ? 'Concurso' : 'ENEM';
  const continuityLabel = origin === 'concurso' ? 'ENEM' : contestLabel;

  return {
    ...presentation,
    sessionHeader: {
      ...presentation.sessionHeader,
      contextLabel: `${originLabel} / ${state.currentBlockLabel}`,
      sessionTypeLabel: state.showPostFocusState
        ? 'Fechamento do bloco'
        : state.showQuestionTransitionState
          ? 'Continuacao do bloco'
          : origin === 'concurso'
            ? 'Bloco principal'
            : 'Bloco principal',
      currentStepLabel: state.showPostFocusState
        ? `Fechamento do bloco ${originLabel}`
        : presentation.sessionHeader.currentStepLabel,
    },
    executionCore: {
      ...presentation.executionCore,
      eyebrowLabel: 'Nucleo da rotina hibrida',
      progressTitle: 'Progresso do bloco atual',
      controlsLabel: 'Ritmo do bloco atual',
      controlsDescription: origin === 'concurso'
        ? `Hoje este bloco esta focado em Concurso, com ${continuityLabel} como continuidade.`
        : `Hoje este bloco esta focado em ENEM, com ${continuityLabel} como continuidade.`,
      secondaryProgressLabel: state.showPostFocusState
        ? presentation.executionCore.secondaryProgressLabel
        : origin === 'concurso'
          ? `${continuityLabel} continua vivo depois deste bloco principal.`
          : `${continuityLabel} continua vivo depois deste bloco principal.`,
    },
    supportRail: {
      ...presentation.supportRail,
      eyebrow: 'Equilibrio da sessao',
      intro: origin === 'concurso'
        ? `Use esta coluna so para fechar o bloco de Concurso e manter ${continuityLabel} como segunda frente.`
        : `Use esta coluna so para fechar o bloco de ENEM e manter ${continuityLabel} como segunda frente.`,
      checklist: {
        ...presentation.supportRail.checklist,
        title: origin === 'concurso' ? 'Checklist do bloco Concurso' : 'Checklist do bloco ENEM',
      },
      closure: presentation.supportRail.closure
        ? {
          ...presentation.supportRail.closure,
          title: 'Fechamento da rotina hibrida',
        }
        : undefined,
    },
    postExecutionBand: {
      ...presentation.postExecutionBand,
      contextTitle: origin === 'concurso' ? 'Contexto do bloco Concurso' : 'Contexto do bloco ENEM',
      continuityTitle: 'Depois deste bloco hibrido',
      context: {
        ...presentation.postExecutionBand.context,
        parentLabel: primaryFocus === 'concurso'
          ? `Hibrido / Concurso no centro / ${state.activeStudyMethodName}`
          : primaryFocus === 'enem'
            ? `Hibrido / ENEM no centro / ${state.activeStudyMethodName}`
            : `Hibrido / Equilibrado / ${state.activeStudyMethodName}`,
      },
      continuity: {
        ...presentation.postExecutionBand.continuity,
        nextStepLabel: origin === 'concurso'
          ? `Depois desta sessao: fechar Concurso e manter ${continuityLabel} em continuidade.`
          : `Depois desta sessao: fechar ENEM e manter ${continuityLabel} em continuidade.`,
        progressHintLabel: primaryFocus === 'equilibrado'
          ? 'Equilibrio ativo entre as duas frentes'
          : primaryFocus === 'concurso'
            ? 'Concurso no centro hoje'
            : 'ENEM no centro hoje',
      },
    },
    executionRail: {
      eyebrow: 'Execucao hibrida',
      title: origin === 'concurso'
        ? 'Este bloco de Concurso conduz a sessao'
        : 'Este bloco de ENEM conduz a sessao',
      description: origin === 'concurso'
        ? `${continuityLabel} fica como segunda frente depois do bloco principal.`
        : `${continuityLabel} fica como segunda frente depois do bloco principal.`,
      blockChipLabel: `Origem: ${originLabel}`,
      durationChipLabel: presentation.executionRail.durationChipLabel,
      modeChipLabel: presentation.executionRail.modeChipLabel,
    },
  };
};

export default buildHibridoStudyPresentation;
