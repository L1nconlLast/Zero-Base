import type { HomePriority } from '../homeTodayState';
import type { HomeTrackPresentationBuilder } from './types';

const buildContestLabel = (
  name?: string | null,
  board?: string | null,
  area?: string | null,
) => {
  if (name && board) {
    return `${name} · ${board}`;
  }

  if (name) {
    return name;
  }

  if (area && board) {
    return `${area} · ${board}`;
  }

  return area || board || 'Edital ativo';
};

const buildHeroTitle = (priority: HomePriority, phase: 'inicio' | 'em_andamento' | 'concluido') => {
  if (phase === 'concluido') {
    if (priority === 'review') return 'Revisao do edital concluida';
    if (priority === 'plan') return 'Planejamento do edital concluido';
    return 'Bloco do edital concluido';
  }

  if (priority === 'review') {
    return phase === 'em_andamento' ? 'Continue a revisao do edital' : 'Comece pela revisao do edital';
  }

  if (priority === 'continue') {
    return phase === 'em_andamento' ? 'Retome seu bloco do edital' : 'Seu bloco do edital espera daqui';
  }

  if (priority === 'plan') {
    return 'Ajuste o plano do edital antes de seguir';
  }

  return phase === 'em_andamento' ? 'Continue seu bloco do edital' : 'Seu bloco do edital esta pronto';
};

const buildDayValue = (priority: HomePriority, phase: 'inicio' | 'em_andamento' | 'concluido') => {
  if (phase === 'concluido') {
    if (priority === 'review') return 'Revisao do edital concluida';
    if (priority === 'plan') return 'Plano do edital concluido';
    return 'Bloco do edital concluido';
  }

  if (priority === 'review') {
    return phase === 'em_andamento' ? 'Revisao do edital em andamento' : 'Revisao do edital pronta';
  }

  if (priority === 'continue') {
    return phase === 'em_andamento' ? 'Retomada do edital em andamento' : 'Retomada do edital pronta';
  }

  if (priority === 'plan') {
    return 'Plano do edital aberto';
  }

  return phase === 'em_andamento' ? 'Estudo do edital em andamento' : 'Bloco do edital pronto';
};

export const buildConcursoPresentation: HomeTrackPresentationBuilder = ({
  state,
  presentation,
  context,
}) => {
  const contestLabel = buildContestLabel(
    context.concurso?.name || null,
    context.concurso?.board || null,
    context.concurso?.area || null,
  );
  const supportDetail = context.summaryDescription
    || (context.examDate
      ? `O prazo da prova segue em ${context.examDate} e o edital continua puxando o dia.`
      : 'A Home continua priorizando edital, banca e disciplinas centrais.');

  if (state.hero.mode === 'activation') {
    return {
      ...presentation,
      hero: {
        ...presentation.hero,
        eyebrow: 'modo concurso',
        title: 'Comece seu primeiro bloco do edital',
        supportingText: `${contestLabel}. Comece pelo bloco mais simples para destravar a rotina.`,
      },
      dayStatus: {
        ...presentation.dayStatus,
        value: 'Primeiro passo do edital',
        detail: 'Um bloco curto ja coloca seu concurso em movimento.',
      },
      primaryPanel: {
        ...presentation.primaryPanel,
        eyebrow: 'modo concurso',
        title: 'Comece pelo primeiro bloco do edital',
        description: `A Home abre um inicio direto para ${contestLabel.toLowerCase()}.`,
      },
      continuityPanel: {
        ...presentation.continuityPanel,
        eyebrow: 'depois do edital',
      },
      support: {
        ...presentation.support,
        label: 'Radar do edital',
        headline: contestLabel,
        detail: supportDetail,
      },
    };
  }

  return {
    ...presentation,
    hero: {
      ...presentation.hero,
      eyebrow: 'modo concurso',
      title: buildHeroTitle(state.priority, state.phase),
      supportingText: state.phase === 'concluido'
        ? presentation.hero.supportingText
        : `${presentation.hero.supportingText || supportDetail} ${contestLabel}.`,
    },
    dayStatus: {
      ...presentation.dayStatus,
      value: buildDayValue(state.priority, state.phase),
      detail: state.priority === 'review'
        ? 'A revisao limpa o que venceu antes do proximo bloco do edital.'
        : state.priority === 'plan'
          ? 'O plano reorganiza o edital, a banca e o prazo antes da execucao.'
          : presentation.dayStatus.detail,
    },
    primaryPanel: {
      ...presentation.primaryPanel,
      eyebrow: 'modo concurso',
      title: state.phase === 'concluido'
        ? presentation.primaryPanel.title
        : state.priority === 'review'
          ? (state.phase === 'em_andamento' ? 'Continuar revisao do edital' : 'Revisar edital agora')
          : state.priority === 'continue'
            ? 'Retomar bloco do edital'
            : state.priority === 'plan'
              ? 'Ajustar plano do edital'
              : 'Estudar edital agora',
      description: state.priority === 'review'
        ? 'A revisao entra antes do novo bloco para segurar o edital e a banca no centro da rotina.'
        : `${presentation.primaryPanel.description} ${contestLabel}.`,
      sessionLabel: state.priority === 'review' ? 'Revisao do edital' : presentation.primaryPanel.sessionLabel,
    },
    continuityPanel: {
      ...presentation.continuityPanel,
      eyebrow: 'depois do edital',
      title: state.priority === 'review'
        ? 'Depois da revisao do edital'
        : state.priority === 'plan'
          ? 'Quando o edital abrir'
          : 'Depois desse bloco do edital',
    },
    support: {
      ...presentation.support,
      label: 'Radar do edital',
      headline: contestLabel,
      detail: supportDetail,
    },
  };
};

export default buildConcursoPresentation;
