import type { HomePriority } from '../homeTodayState';
import type { HomeTrackPresentationBuilder } from './types';

const buildContestLabel = (name?: string | null, area?: string | null) =>
  name || area || 'concurso';

const buildHybridHeadline = (
  primaryFocus: 'enem' | 'concurso' | 'equilibrado' | null | undefined,
  contestLabel: string,
) => {
  if (primaryFocus === 'enem') {
    return 'Hoje seu foco principal esta no ENEM, com concurso como continuidade.';
  }

  if (primaryFocus === 'concurso') {
    return `Hoje a prioridade esta no ${contestLabel}, mantendo avanco no ENEM.`;
  }

  return `Hoje o plano esta equilibrado entre ENEM e ${contestLabel}.`;
};

const buildBalanceCopy = (
  primaryFocus: 'enem' | 'concurso' | 'equilibrado' | null | undefined,
  contestLabel: string,
) => {
  if (primaryFocus === 'enem') {
    return `ENEM puxa o centro do dia, enquanto ${contestLabel} entra como continuidade leve.`;
  }

  if (primaryFocus === 'concurso') {
    return `${contestLabel} puxa o centro do dia, sem perder consistencia no ENEM.`;
  }

  return `Os dois focos continuam ativos, com carga controlada entre ENEM e ${contestLabel}.`;
};

const buildHeroTitle = (
  priority: HomePriority,
  phase: 'inicio' | 'em_andamento' | 'concluido',
  primaryFocus: 'enem' | 'concurso' | 'equilibrado' | null | undefined,
  contestLabel: string,
) => {
  if (phase === 'concluido') {
    if (priority === 'review') return 'Revisao da rotina hibrida concluida';
    if (priority === 'plan') return 'Planejamento da rotina hibrida concluido';
    if (primaryFocus === 'concurso') return `Bloco principal de ${contestLabel} concluido`;
    if (primaryFocus === 'enem') return 'Bloco principal do ENEM concluido';
    return 'Bloco principal da rotina hibrida concluido';
  }

  if (priority === 'review') {
    return phase === 'em_andamento'
      ? 'Continue a revisao que protege seu equilibrio'
      : 'Comece pela revisao que protege seu equilibrio';
  }

  if (priority === 'continue') {
    return phase === 'em_andamento'
      ? 'Retome o bloco principal da rotina hibrida'
      : buildHybridHeadline(primaryFocus, contestLabel);
  }

  if (priority === 'plan') {
    return 'Ajuste o balanceamento da rotina hibrida';
  }

  return buildHybridHeadline(primaryFocus, contestLabel);
};

export const buildHibridoPresentation: HomeTrackPresentationBuilder = ({
  state,
  presentation,
  context,
}) => {
  const primaryFocus = context.hibrido?.primaryFocus || 'equilibrado';
  const contestLabel = buildContestLabel(
    context.concurso?.name || null,
    context.concurso?.area || null,
  );
  const balanceCopy = buildBalanceCopy(primaryFocus, contestLabel);
  const supportDetail = context.summaryDescription || balanceCopy;

  if (state.hero.mode === 'activation') {
    return {
      ...presentation,
      hero: {
        ...presentation.hero,
        eyebrow: 'modo hibrido',
        title: 'Comece sua rotina hibrida',
        supportingText: balanceCopy,
      },
      dayStatus: {
        ...presentation.dayStatus,
        value: 'Primeiro passo hibrido',
        detail: 'Um bloco curto ja abre o equilibrio entre ENEM e concurso.',
      },
      primaryPanel: {
        ...presentation.primaryPanel,
        eyebrow: 'modo hibrido',
        title: 'Comece pelo primeiro bloco hibrido',
        description: balanceCopy,
      },
      continuityPanel: {
        ...presentation.continuityPanel,
        eyebrow: 'segundo foco',
        title: 'Depois do primeiro foco',
      },
      support: {
        ...presentation.support,
        label: 'Equilibrio hibrido',
        headline: buildHybridHeadline(primaryFocus, contestLabel),
        detail: supportDetail,
      },
    };
  }

  return {
    ...presentation,
    hero: {
      ...presentation.hero,
      eyebrow: 'modo hibrido',
      title: buildHeroTitle(state.priority, state.phase, primaryFocus, contestLabel),
      supportingText: state.phase === 'concluido'
        ? presentation.hero.supportingText
        : balanceCopy,
    },
    dayStatus: {
      ...presentation.dayStatus,
      value: state.phase === 'concluido'
        ? 'Rotina hibrida concluida'
        : primaryFocus === 'concurso'
          ? 'Concurso no centro'
          : primaryFocus === 'enem'
            ? 'ENEM no centro'
            : 'Rotina hibrida equilibrada',
      detail: state.priority === 'review'
        ? 'A revisao entra antes do proximo bloco para proteger os dois focos.'
        : state.priority === 'plan'
          ? 'O plano reorganiza o balanceamento antes da proxima execucao.'
          : balanceCopy,
    },
    primaryPanel: {
      ...presentation.primaryPanel,
      eyebrow: 'modo hibrido',
      title: state.phase === 'concluido'
        ? presentation.primaryPanel.title
        : state.priority === 'review'
          ? 'Revisar antes de trocar de frente'
          : state.priority === 'continue'
            ? 'Retomar bloco principal'
            : state.priority === 'plan'
              ? 'Ajustar balanceamento'
              : primaryFocus === 'concurso'
                ? 'Estudar bloco principal do concurso'
                : primaryFocus === 'enem'
                  ? 'Estudar bloco principal do ENEM'
                  : 'Estudar bloco principal do dia',
      description: `${presentation.primaryPanel.description} ${balanceCopy}`,
    },
    continuityPanel: {
      ...presentation.continuityPanel,
      eyebrow: 'segundo foco',
      title: state.priority === 'review'
        ? 'Depois da revisao hibrida'
        : primaryFocus === 'equilibrado'
          ? 'Segundo foco do dia'
          : primaryFocus === 'enem'
            ? `Depois do bloco ENEM`
            : `Depois do bloco ${contestLabel}`,
    },
    support: {
      ...presentation.support,
      label: 'Equilibrio hibrido',
      headline: buildHybridHeadline(primaryFocus, contestLabel),
      detail: supportDetail,
    },
  };
};

export default buildHibridoPresentation;
