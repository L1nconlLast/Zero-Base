import type { HomePriority } from '../homeTodayState';
import type { HomeTrackPresentationBuilder } from './types';

const buildGoalLabel = (goalTitle?: string | null, summaryTitle?: string | null) =>
  goalTitle || summaryTitle || 'Trilha personalizada';

const buildFocusCopy = (focus?: 'aprender' | 'praticar' | 'rotina' | 'evoluir_tema' | null) => {
  if (focus === 'praticar') return 'pratica e aplicacao';
  if (focus === 'rotina') return 'consistencia e rotina';
  if (focus === 'evoluir_tema') return 'aprofundamento continuo';
  return 'aprendizado e evolucao';
};

const buildHeroTitle = (priority: HomePriority, phase: 'inicio' | 'em_andamento' | 'concluido') => {
  if (phase === 'concluido') {
    if (priority === 'review') return 'Revisao da sua trilha concluida';
    if (priority === 'plan') return 'Planejamento da sua trilha concluido';
    return 'Bloco da sua trilha concluido';
  }

  if (priority === 'review') {
    return phase === 'em_andamento' ? 'Continue a revisao da sua trilha' : 'Comece pela revisao do que voce ja avancou';
  }

  if (priority === 'continue') {
    return phase === 'em_andamento' ? 'Retome sua trilha atual' : 'Seu bloco de evolucao espera daqui';
  }

  if (priority === 'plan') {
    return 'Ajuste sua trilha antes de seguir';
  }

  return phase === 'em_andamento' ? 'Continue seu bloco de evolucao' : 'Seu proximo bloco de evolucao esta pronto';
};

export const buildOutrosPresentation: HomeTrackPresentationBuilder = ({
  state,
  presentation,
  context,
}) => {
  const goalLabel = buildGoalLabel(context.outros?.goalTitle || null, context.summaryTitle || null);
  const focusCopy = buildFocusCopy(context.outros?.focus || null);
  const supportDetail = context.summaryDescription
    || `A Home esta protegendo ${focusCopy} sem prender seu estudo a um calendario rigido.`;

  if (state.hero.mode === 'activation') {
    return {
      ...presentation,
      hero: {
        ...presentation.hero,
        eyebrow: 'trilha pessoal',
        title: 'Comece sua trilha personalizada',
        supportingText: `${goalLabel}. O primeiro bloco abre sua evolucao com leveza.`,
      },
      dayStatus: {
        ...presentation.dayStatus,
        value: 'Primeiro passo da trilha',
        detail: 'Um bloco curto ja tira seu objetivo pessoal do zero.',
      },
      primaryPanel: {
        ...presentation.primaryPanel,
        eyebrow: 'trilha pessoal',
        title: 'Comece pelo primeiro bloco da trilha',
        description: `A Home abre um inicio simples para sustentar ${focusCopy}.`,
      },
      continuityPanel: {
        ...presentation.continuityPanel,
        eyebrow: 'depois da trilha',
      },
      support: {
        ...presentation.support,
        label: 'Trilha pessoal',
        headline: goalLabel,
        detail: supportDetail,
      },
    };
  }

  return {
    ...presentation,
    hero: {
      ...presentation.hero,
      eyebrow: 'trilha pessoal',
      title: buildHeroTitle(state.priority, state.phase),
      supportingText: state.phase === 'concluido'
        ? presentation.hero.supportingText
        : `${presentation.hero.supportingText || supportDetail} ${goalLabel}.`,
    },
    dayStatus: {
      ...presentation.dayStatus,
      value: state.phase === 'concluido'
        ? 'Bloco da trilha concluido'
        : state.priority === 'plan'
          ? 'Trilha aberta'
          : presentation.dayStatus.value,
      detail: state.priority === 'review'
        ? 'A revisao protege o que voce ja construiu antes do proximo bloco.'
        : state.priority === 'plan'
          ? 'O plano reorganiza sua trilha antes da proxima execucao.'
          : presentation.dayStatus.detail,
    },
    primaryPanel: {
      ...presentation.primaryPanel,
      eyebrow: 'trilha pessoal',
      title: state.phase === 'concluido'
        ? presentation.primaryPanel.title
        : state.priority === 'review'
          ? 'Revisar antes de seguir'
          : state.priority === 'continue'
            ? 'Retomar trilha atual'
            : state.priority === 'plan'
              ? 'Ajustar trilha'
              : 'Avancar agora',
      description: `${presentation.primaryPanel.description} O foco atual esta em ${focusCopy}.`,
    },
    continuityPanel: {
      ...presentation.continuityPanel,
      eyebrow: 'depois da trilha',
      title: state.priority === 'review'
        ? 'Depois da revisao da trilha'
        : state.priority === 'plan'
          ? 'Quando a trilha abrir'
          : 'Depois desse bloco da trilha',
    },
    support: {
      ...presentation.support,
      label: 'Trilha pessoal',
      headline: goalLabel,
      detail: supportDetail,
    },
  };
};

export default buildOutrosPresentation;
