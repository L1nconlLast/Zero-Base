import type { HomeDayPhase, HomeTodayPanelRow, HomeTodayState } from './homeTodayState';
import { buildConcursoPresentation } from './presentation/concurso';
import { buildEnemPresentation } from './presentation/enem';
import { buildFaculdadePresentation } from './presentation/faculdade';
import { buildHibridoPresentation } from './presentation/hibrido';
import { buildOutrosPresentation } from './presentation/outros';
import type {
  HomePresentationTone,
  HomeSupportTone,
  HomeTodayPresentation,
  HomeTrackContext,
  HomeTrackPresentationBuilder,
} from './presentation/types';

export type {
  HomeCollegeFocus,
  HomeHybridPrimaryFocus,
  HomeOtherFocus,
  HomePresentationTone,
  HomeSupportTone,
  HomeTodayPresentation,
  HomeTrackContext,
  HomeTrackProfile,
} from './presentation/types';

const PRIORITY_LABELS = {
  review: 'Revisao',
  continue: 'Continuidade',
  study: 'Estudo',
  plan: 'Planejamento',
} as const;

const PHASE_LABELS: Record<HomeDayPhase, string> = {
  inicio: 'Inicio',
  em_andamento: 'Em andamento',
  concluido: 'Concluido',
};

const PHASE_TONES: Record<HomeDayPhase, HomePresentationTone> = {
  inicio: 'default',
  em_andamento: 'active',
  concluido: 'completed',
};

const COMPLETED_HERO_TITLES = {
  review: 'Revisao concluida',
  continue: 'Continuidade concluida',
  study: 'Estudo concluido',
  plan: 'Planejamento concluido',
} as const;

const COMPLETED_PANEL_TITLES = {
  review: 'Revisao encerrada',
  continue: 'Continuidade encerrada',
  study: 'Estudo encerrado',
  plan: 'Planejamento encerrado',
} as const;

const TRACK_BUILDERS: Record<HomeTrackContext['profile'], HomeTrackPresentationBuilder> = {
  enem: buildEnemPresentation,
  concurso: buildConcursoPresentation,
  faculdade: buildFaculdadePresentation,
  outros: buildOutrosPresentation,
  hibrido: buildHibridoPresentation,
};

const buildCompletedRows = (
  state: HomeTodayState,
  priorityLabel: string,
): HomeTodayPanelRow[] => {
  const nextRows = state.continuityPanel.rows.slice(0, 2).map((row, index) => ({
    ...row,
    id: `completed-${index}-${row.id}`,
  }));

  return [
    {
      id: `${state.priority}-completed-summary`,
      label: 'Fechamento',
      detail: `${priorityLabel} nao precisa mais disputar sua atencao agora.`,
      badge: 'Concluido',
    },
    ...nextRows,
  ];
};

const buildBaseHomeTodayPresentation = (
  state: HomeTodayState,
): HomeTodayPresentation => {
  const tone = PHASE_TONES[state.phase];
  const priorityLabel = PRIORITY_LABELS[state.priority];
  const phaseLabel = PHASE_LABELS[state.phase];
  const supportTone: HomeSupportTone =
    state.priority === 'study' && state.phase === 'inicio' ? 'default' : 'quiet';

  if (state.hero.mode === 'activation') {
    return {
      tone: 'default',
      hero: {
        ...state.hero,
        chips: [phaseLabel],
      },
      dayStatus: state.dayStatus,
      primaryPanel: {
        ...state.primaryPanel,
        stateBadgeLabel: phaseLabel,
      },
      continuityPanel: state.continuityPanel,
      support: {
        label: 'Apoio rapido',
        tone: 'default',
      },
    };
  }

  if (state.phase === 'concluido') {
    const nextRow = state.continuityPanel.rows[0];

    return {
      tone,
      hero: {
        ...state.hero,
        eyebrow: priorityLabel.toLowerCase(),
        title: COMPLETED_HERO_TITLES[state.priority],
        subtitle: nextRow?.label || state.continuityPanel.title,
        insight: `${priorityLabel} nao precisa mais disputar sua atencao agora.`,
        supportingText: nextRow?.detail || state.dayStatus.remainder,
        primaryActionLabel: state.continuityPanel.actionLabel,
        primaryActionTarget: state.continuityPanel.actionTarget,
        chips: [phaseLabel],
      },
      dayStatus: state.dayStatus,
      primaryPanel: {
        ...state.primaryPanel,
        eyebrow: priorityLabel.toLowerCase(),
        title: COMPLETED_PANEL_TITLES[state.priority],
        description: 'O foco principal foi fechado. O proximo passo entra de forma mais leve a partir daqui.',
        stateBadgeLabel: phaseLabel,
        rows: buildCompletedRows(state, priorityLabel),
      },
      continuityPanel: state.continuityPanel,
      support: {
        label: 'Apoio leve',
        tone: supportTone,
      },
    };
  }

  return {
    tone,
    hero: {
      ...state.hero,
      eyebrow: priorityLabel.toLowerCase(),
      chips: [phaseLabel],
    },
    dayStatus: state.dayStatus,
    primaryPanel: {
      ...state.primaryPanel,
      eyebrow: priorityLabel.toLowerCase(),
      stateBadgeLabel: phaseLabel,
    },
    continuityPanel: state.continuityPanel,
    support: {
      label: supportTone === 'quiet' ? 'Apoio leve' : 'Apoio rapido',
      tone: supportTone,
    },
  };
};

export const buildHomeTodayPresentation = (
  state: HomeTodayState,
  context?: HomeTrackContext | null,
): HomeTodayPresentation => {
  const basePresentation = buildBaseHomeTodayPresentation(state);
  const resolvedContext: HomeTrackContext = {
    profile: context?.profile || 'enem',
    ...context,
  };
  const builder = TRACK_BUILDERS[resolvedContext.profile];

  return builder({
    state,
    presentation: basePresentation,
    context: resolvedContext,
  });
};

export default buildHomeTodayPresentation;
