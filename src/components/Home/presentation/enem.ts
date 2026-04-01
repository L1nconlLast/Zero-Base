import type { HomePriority } from '../homeTodayState';
import type { HomeTrackPresentationBuilder } from './types';

const buildTargetLabel = (targetCourse?: string | null, targetCollege?: string | null) =>
  [targetCourse, targetCollege].filter(Boolean).join(' · ');

const buildHeroTitle = (priority: HomePriority, phase: 'inicio' | 'em_andamento' | 'concluido') => {
  if (phase === 'concluido') {
    if (priority === 'review') return 'Revisao ENEM concluida';
    if (priority === 'plan') return 'Planejamento ENEM concluido';
    return 'Bloco ENEM concluido';
  }

  if (priority === 'review') {
    return phase === 'em_andamento' ? 'Continue a revisao do ENEM' : 'Comece pela revisao do ENEM';
  }

  if (priority === 'continue') {
    return phase === 'em_andamento' ? 'Retome seu bloco ENEM' : 'Seu bloco ENEM espera daqui';
  }

  if (priority === 'plan') {
    return 'Ajuste seu plano ENEM antes de seguir';
  }

  return phase === 'em_andamento' ? 'Continue seu bloco ENEM' : 'Seu bloco ENEM de hoje esta pronto';
};

const buildDayValue = (priority: HomePriority, phase: 'inicio' | 'em_andamento' | 'concluido') => {
  if (phase === 'concluido') {
    if (priority === 'review') return 'Revisao ENEM concluida';
    if (priority === 'plan') return 'Plano ENEM concluido';
    return 'Bloco ENEM concluido';
  }

  if (priority === 'review') {
    return phase === 'em_andamento' ? 'Revisao ENEM em andamento' : 'Revisao ENEM pronta';
  }

  if (priority === 'continue') {
    return phase === 'em_andamento' ? 'Retomada ENEM em andamento' : 'Retomada ENEM pronta';
  }

  if (priority === 'plan') {
    return 'Plano ENEM aberto';
  }

  return phase === 'em_andamento' ? 'Estudo ENEM em andamento' : 'Estudo ENEM pronto';
};

export const buildEnemPresentation: HomeTrackPresentationBuilder = ({
  state,
  presentation,
  context,
}) => {
  const targetLabel = buildTargetLabel(
    context.enem?.targetCourse || null,
    context.enem?.targetCollege || null,
  );
  const summaryLabel = targetLabel || context.summaryTitle || context.examGoal || 'Preparacao ENEM';
  const supportDetail = context.summaryDescription
    || (context.examDate
      ? `Seu ritmo segue ajustado para a meta de ${context.examDate}.`
      : 'A Home continua equilibrando revisao, estudo e simulado.');

  if (state.hero.mode === 'activation') {
    return {
      ...presentation,
      hero: {
        ...presentation.hero,
        eyebrow: 'preparacao enem',
        title: 'Comece sua primeira sessao ENEM',
        supportingText: targetLabel
          ? `Sua meta ja aponta para ${targetLabel}. Comece pelo primeiro bloco.`
          : 'Seu primeiro bloco abre a preparacao do ENEM sem atrito.',
      },
      dayStatus: {
        ...presentation.dayStatus,
        value: 'Primeiro passo ENEM',
        detail: 'Um bloco curto ja coloca sua preparacao ENEM em movimento.',
      },
      primaryPanel: {
        ...presentation.primaryPanel,
        eyebrow: 'preparacao enem',
        title: 'Comece pelo primeiro bloco ENEM',
        description: targetLabel
          ? `A Home abre um inicio simples e coerente com sua meta em ${targetLabel}.`
          : 'A Home abre um inicio simples para sua preparacao ENEM ganhar tracao.',
      },
      continuityPanel: {
        ...presentation.continuityPanel,
        eyebrow: 'depois do enem',
      },
      support: {
        ...presentation.support,
        label: 'Radar ENEM',
        headline: summaryLabel,
        detail: supportDetail,
      },
    };
  }

  return {
    ...presentation,
    hero: {
      ...presentation.hero,
      eyebrow: 'preparacao enem',
      title: buildHeroTitle(state.priority, state.phase),
      supportingText: state.phase === 'concluido'
        ? presentation.hero.supportingText
        : targetLabel
          ? `${presentation.hero.supportingText || supportDetail} Meta ativa: ${targetLabel}.`
          : presentation.hero.supportingText,
    },
    dayStatus: {
      ...presentation.dayStatus,
      value: buildDayValue(state.priority, state.phase),
      detail: state.priority === 'review'
        ? 'A revisao protege a retencao antes do proximo bloco do ENEM.'
        : state.priority === 'plan'
          ? 'O plano organiza o proximo passo da sua preparacao.'
          : presentation.dayStatus.detail,
    },
    primaryPanel: {
      ...presentation.primaryPanel,
      eyebrow: 'preparacao enem',
      title: state.phase === 'concluido'
        ? presentation.primaryPanel.title
        : state.priority === 'review'
          ? (state.phase === 'em_andamento' ? 'Continuar revisao ENEM' : 'Revisar ENEM agora')
          : state.priority === 'continue'
            ? 'Retomar bloco ENEM'
            : state.priority === 'plan'
              ? 'Ajustar plano ENEM'
              : 'Estudar ENEM agora',
      description: state.priority === 'review'
        ? 'A fila de revisao entra antes do proximo bloco para manter o ENEM vivo na memoria.'
        : state.priority === 'plan'
          ? 'Quando a acao do dia nao esta pronta, o plano ENEM puxa a decisao de volta.'
          : targetLabel
            ? `${presentation.primaryPanel.description} Meta ativa: ${targetLabel}.`
            : presentation.primaryPanel.description,
    },
    continuityPanel: {
      ...presentation.continuityPanel,
      eyebrow: 'depois do enem',
      title: state.priority === 'review'
        ? 'Depois da revisao ENEM'
        : state.priority === 'plan'
          ? 'Quando o ENEM abrir'
          : 'Depois desse bloco ENEM',
    },
    support: {
      ...presentation.support,
      label: 'Radar ENEM',
      headline: summaryLabel,
      detail: supportDetail,
    },
  };
};

export default buildEnemPresentation;
