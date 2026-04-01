import type { HomePriority } from '../homeTodayState';
import type { HomeTrackPresentationBuilder } from './types';

const buildAcademicLabel = (course?: string | null, institution?: string | null) =>
  [course, institution].filter(Boolean).join(' · ');

const buildFocusCopy = (focus?: 'rotina' | 'provas' | 'trabalhos' | null) => {
  if (focus === 'provas') return 'provas e revisoes da semana';
  if (focus === 'trabalhos') return 'trabalhos, entregas e execucao';
  return 'rotina academica e constancia';
};

const buildHeroTitle = (priority: HomePriority, phase: 'inicio' | 'em_andamento' | 'concluido') => {
  if (phase === 'concluido') {
    if (priority === 'review') return 'Revisao da faculdade concluida';
    if (priority === 'plan') return 'Planejamento da faculdade concluido';
    return 'Bloco da faculdade concluido';
  }

  if (priority === 'review') {
    return phase === 'em_andamento' ? 'Continue o bloco de revisao da faculdade' : 'Comece pelo bloco que sustenta a semana';
  }

  if (priority === 'continue') {
    return phase === 'em_andamento' ? 'Retome seu bloco da faculdade' : 'Seu bloco da faculdade espera daqui';
  }

  if (priority === 'plan') {
    return 'Ajuste sua rotina da faculdade antes de seguir';
  }

  return phase === 'em_andamento' ? 'Continue seu bloco da faculdade' : 'Seu bloco da faculdade esta pronto';
};

export const buildFaculdadePresentation: HomeTrackPresentationBuilder = ({
  state,
  presentation,
  context,
}) => {
  const focusCopy = buildFocusCopy(context.faculdade?.focus || null);
  const academicLabel = buildAcademicLabel(
    context.faculdade?.course || null,
    context.faculdade?.institution || null,
  ) || context.summaryTitle || 'Rotina da faculdade';
  const supportDetail = context.summaryDescription
    || `A Home esta protegendo ${focusCopy} sem perder continuidade no semestre.`;

  if (state.hero.mode === 'activation') {
    return {
      ...presentation,
      hero: {
        ...presentation.hero,
        eyebrow: 'modo faculdade',
        title: 'Comece sua rotina da faculdade',
        supportingText: `${academicLabel}. O primeiro bloco abre a semana sem sobrecarga.`,
      },
      dayStatus: {
        ...presentation.dayStatus,
        value: 'Primeiro passo da faculdade',
        detail: 'Um bloco curto ja tira sua rotina academica do zero.',
      },
      primaryPanel: {
        ...presentation.primaryPanel,
        eyebrow: 'modo faculdade',
        title: 'Comece pelo primeiro bloco da faculdade',
        description: `A Home abre um inicio simples para organizar ${focusCopy}.`,
      },
      continuityPanel: {
        ...presentation.continuityPanel,
        eyebrow: 'depois da faculdade',
      },
      support: {
        ...presentation.support,
        label: 'Contexto academico',
        headline: academicLabel,
        detail: supportDetail,
      },
    };
  }

  return {
    ...presentation,
    hero: {
      ...presentation.hero,
      eyebrow: 'modo faculdade',
      title: buildHeroTitle(state.priority, state.phase),
      supportingText: state.phase === 'concluido'
        ? presentation.hero.supportingText
        : `${presentation.hero.supportingText || supportDetail} ${academicLabel}.`,
    },
    dayStatus: {
      ...presentation.dayStatus,
      value: state.phase === 'concluido'
        ? 'Bloco da faculdade concluido'
        : state.priority === 'plan'
          ? 'Rotina da faculdade aberta'
          : presentation.dayStatus.value,
      detail: state.priority === 'review'
        ? 'A revisao entra para sustentar provas, aulas e entregas antes do proximo bloco.'
        : state.priority === 'plan'
          ? 'O plano reorganiza seu semestre antes da proxima execucao.'
          : presentation.dayStatus.detail,
    },
    primaryPanel: {
      ...presentation.primaryPanel,
      eyebrow: 'modo faculdade',
      title: state.phase === 'concluido'
        ? presentation.primaryPanel.title
        : state.priority === 'review'
          ? 'Revisar antes de seguir'
          : state.priority === 'continue'
            ? 'Retomar bloco da faculdade'
            : state.priority === 'plan'
              ? 'Ajustar rotina da faculdade'
              : 'Estudar agora na faculdade',
      description: `${presentation.primaryPanel.description} O foco atual esta em ${focusCopy}.`,
    },
    continuityPanel: {
      ...presentation.continuityPanel,
      eyebrow: 'depois da faculdade',
      title: state.priority === 'review'
        ? 'Depois da revisao da faculdade'
        : state.priority === 'plan'
          ? 'Quando a rotina abrir'
          : 'Depois desse bloco da faculdade',
    },
    support: {
      ...presentation.support,
      label: 'Contexto academico',
      headline: academicLabel,
      detail: supportDetail,
    },
  };
};

export default buildFaculdadePresentation;
