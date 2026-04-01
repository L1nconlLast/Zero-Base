import type { StudyTrackPresentationBuilder } from './types';

const buildFocusCopy = (focus?: 'aprender' | 'praticar' | 'rotina' | 'evoluir_tema' | null) => {
  if (focus === 'praticar') return 'Pratica guiada';
  if (focus === 'rotina') return 'Constancia da trilha';
  if (focus === 'evoluir_tema') return 'Evolucao no tema';
  return 'Sessao da trilha';
};

export const buildOutrosStudyPresentation: StudyTrackPresentationBuilder = ({
  presentation,
  context,
  state,
}) => {
  const goalTitle = context.outros?.goalTitle || context.summaryTitle || 'Trilha pessoal';
  const focusCopy = buildFocusCopy(context.outros?.focus || null);

  return {
    ...presentation,
    sessionHeader: {
      ...presentation.sessionHeader,
      contextLabel: `Trilha / ${state.currentBlockLabel}`,
      sessionTypeLabel: focusCopy,
    },
    executionCore: {
      ...presentation.executionCore,
      eyebrowLabel: 'Nucleo da trilha',
      progressTitle: 'Progresso da trilha',
      controlsLabel: 'Ritmo da trilha',
      controlsDescription: 'Troque o ritmo da sessao sem sair do tema principal da sua trilha.',
    },
    supportRail: {
      ...presentation.supportRail,
      eyebrow: 'Apoio da trilha',
      intro: `Use esta coluna so para acompanhar a evolucao de ${goalTitle} e fechar o registro quando o bloco terminar.`,
      checklist: {
        ...presentation.supportRail.checklist,
        title: 'Checklist da trilha',
      },
      closure: presentation.supportRail.closure
        ? {
          ...presentation.supportRail.closure,
          title: 'Fechamento da trilha',
        }
        : undefined,
    },
    postExecutionBand: {
      ...presentation.postExecutionBand,
      contextTitle: 'Contexto do tema atual',
      continuityTitle: 'Depois desta sessao da trilha',
      context: {
        ...presentation.postExecutionBand.context,
        parentLabel: `${goalTitle} / Trilha pessoal`,
      },
    },
    executionRail: {
      eyebrow: 'Execucao da trilha',
      title: 'Este tema conduz a sessao',
      description: `A sessao continua sua evolucao em ${goalTitle} com foco em ${focusCopy.toLowerCase()}.`,
      blockChipLabel: `Tema: ${state.currentBlockLabel}`,
      durationChipLabel: presentation.executionRail.durationChipLabel,
      modeChipLabel: presentation.executionRail.modeChipLabel,
    },
  };
};

export default buildOutrosStudyPresentation;
