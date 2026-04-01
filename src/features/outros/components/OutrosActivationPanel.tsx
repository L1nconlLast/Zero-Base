import React from 'react';
import { CalendarDays, CheckSquare, ChevronDown, Lightbulb, Map as MapIcon, Sparkles, Target } from 'lucide-react';

import { ConfirmModal } from '../../../components/UI/ConfirmModal';
import { GuidedEmptyStateCard } from '../../../components/UI/GuidedEmptyStateCard';
import { ItemActionMenu } from '../../../components/UI/ItemActionMenu';
import { PanelActionFeedback } from '../../../components/UI/PanelActionFeedback';
import { usePanelActionFeedback } from '../../../hooks/usePanelActionFeedback';
import type {
  LearningGoalSummary,
  LearningPathSummary,
  LearningTopicSummary,
  OutrosDashboardData,
  PathStepSummary,
  PersonalGoalEventSummary,
} from '../../../services/outrosDashboard.service';
import { outrosDomainService } from '../../../services/outrosDomain.service';

interface OutrosActivationPanelProps {
  darkMode?: boolean;
  userId?: string | null;
  dashboard: OutrosDashboardData | null;
  onRefresh: () => Promise<void>;
}

type TopicFormState = {
  name: string;
  category: string;
  level: 'iniciante' | 'intermediario' | 'avancado';
  status: 'ativo' | 'pausado' | 'concluido';
};

type GoalFormState = {
  topicId: string;
  goalType: 'aprender_do_zero' | 'praticar' | 'rotina' | 'aprofundar';
  description: string;
  status: 'ativo' | 'concluido' | 'arquivado';
};

type PathFormState = {
  topicId: string;
  title: string;
  status: 'ativa' | 'pausada' | 'concluida';
  steps: string[];
};

type StepFormState = {
  pathId: string;
  title: string;
  description: string;
  status: 'nao_iniciado' | 'em_andamento' | 'concluido';
};

type EventFormState = {
  topicId: string;
  title: string;
  type: 'meta' | 'estudo' | 'revisao';
  startAt: string;
  endAt: string;
  status: 'pendente' | 'concluido' | 'cancelado';
};

type DeleteTarget = {
  kind: 'topic' | 'goal' | 'path' | 'step' | 'event';
  id: string;
  title: string;
  message: string;
  actionKey: string;
  successMessage: string;
};

type GroupedListSection<T> = {
  id: string;
  title: string;
  helper?: string;
  items: T[];
  collapsible?: boolean;
  defaultOpen?: boolean;
};

type OutrosListFiltersState = {
  topicQuery: string;
  topicStatus: 'all' | TopicFormState['status'];
  goalQuery: string;
  goalStatus: 'all' | GoalFormState['status'];
  goalTopicId: 'all' | string;
  pathQuery: string;
  pathStatus: 'all' | PathFormState['status'];
  pathTopicId: 'all' | string;
  stepQuery: string;
  stepStatus: 'all' | StepFormState['status'] | 'next';
  stepPathId: 'all' | string;
  eventQuery: string;
  eventStatus: 'all' | EventFormState['status'];
  eventTopicId: 'all' | 'unlinked' | string;
};

const GOAL_TYPE_LABELS = {
  aprender_do_zero: 'Aprender do zero',
  praticar: 'Praticar',
  rotina: 'Rotina',
  aprofundar: 'Aprofundar',
} as const;

const TOPIC_STATUS_LABELS = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  concluido: 'Concluido',
} as const;

const PATH_STATUS_LABELS = {
  ativa: 'Ativa',
  pausada: 'Pausada',
  concluida: 'Concluida',
} as const;

const STEP_STATUS_LABELS = {
  nao_iniciado: 'Nao iniciado',
  em_andamento: 'Em andamento',
  concluido: 'Concluido',
} as const;

const EVENT_TYPE_LABELS = {
  meta: 'Meta',
  estudo: 'Estudo',
  revisao: 'Revisao',
} as const;

const EVENT_STATUS_LABELS = {
  pendente: 'Pendente',
  concluido: 'Concluido',
  cancelado: 'Cancelado',
} as const;

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const emptyTopicForm = (): TopicFormState => ({
  name: '',
  category: '',
  level: 'iniciante',
  status: 'ativo',
});

const emptyGoalForm = (): GoalFormState => ({
  topicId: '',
  goalType: 'praticar',
  description: '',
  status: 'ativo',
});

const emptyPathForm = (): PathFormState => ({
  topicId: '',
  title: '',
  status: 'ativa',
  steps: ['', '', ''],
});

const emptyStepForm = (): StepFormState => ({
  pathId: '',
  title: '',
  description: '',
  status: 'em_andamento',
});

const emptyEventForm = (): EventFormState => ({
  topicId: '',
  title: '',
  type: 'meta',
  startAt: '',
  endAt: '',
  status: 'pendente',
});

const inputClassName = (darkMode: boolean): string =>
  `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
    darkMode
      ? 'border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus:border-cyan-600'
      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-400'
  }`;

const textareaClassName = (darkMode: boolean): string =>
  `${inputClassName(darkMode)} min-h-[104px] resize-y`;

const panelClassName = (darkMode: boolean): string =>
  `rounded-[26px] border p-5 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.16)] ${
    darkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200/80 bg-white/88'
  }`;

const buttonClassName = (darkMode: boolean, variant: 'primary' | 'secondary' | 'danger' = 'primary'): string => {
  if (variant === 'secondary') {
    return `inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
      darkMode
        ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
    }`;
  }

  if (variant === 'danger') {
    return `inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
      darkMode
        ? 'border-rose-800 bg-rose-500/12 text-rose-100 hover:bg-rose-500/20'
        : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
    }`;
  }

  return `inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
    darkMode
      ? 'border-cyan-700/70 bg-cyan-500/18 text-cyan-100 hover:bg-cyan-500/24'
      : 'border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
  }`;
};

const labelClassName = (darkMode: boolean): string =>
  `text-[11px] font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`;

const helperCopyClassName = (darkMode: boolean): string =>
  `mt-2 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`;

const itemCardClassName = (darkMode: boolean): string =>
  `rounded-2xl border p-4 ${
    darkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50/80'
  }`;

const badgeClassName = (darkMode: boolean): string =>
  `inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
    darkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600'
  }`;

const itemPrimaryActionClassName = (darkMode: boolean): string =>
  `group flex-1 cursor-pointer rounded-[18px] text-left outline-none transition ${
    darkMode
      ? 'hover:opacity-95 focus-visible:ring-2 focus-visible:ring-cyan-500/70'
      : 'hover:opacity-90 focus-visible:ring-2 focus-visible:ring-cyan-500/40'
  }`;

const interactiveItemCardClassName = (darkMode: boolean): string =>
  `${itemCardClassName(darkMode)} transition ${
    darkMode ? 'hover:border-slate-700 hover:bg-slate-950' : 'hover:border-slate-300 hover:bg-white'
  }`;

const TOPIC_STATUS_PRIORITY: Record<TopicFormState['status'], number> = {
  ativo: 0,
  pausado: 1,
  concluido: 2,
};

const GOAL_STATUS_PRIORITY: Record<GoalFormState['status'], number> = {
  ativo: 0,
  concluido: 1,
  arquivado: 2,
};

const PATH_STATUS_PRIORITY: Record<PathFormState['status'], number> = {
  ativa: 0,
  pausada: 1,
  concluida: 2,
};

const STEP_STATUS_PRIORITY: Record<StepFormState['status'], number> = {
  em_andamento: 0,
  nao_iniciado: 1,
  concluido: 2,
};

const EVENT_STATUS_PRIORITY: Record<EventFormState['status'], number> = {
  pendente: 0,
  concluido: 1,
  cancelado: 2,
};

const compareText = (left: string, right: string): number =>
  left.localeCompare(right, 'pt-BR', { sensitivity: 'base' });

const normalizeSearchText = (value?: string | null): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const matchesSearchQuery = (query: string, ...values: Array<string | null | undefined>): boolean => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) => normalizeSearchText(value).includes(normalizedQuery));
};

const toSortableTimestamp = (value?: string | null): number => {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

const formatDateTimeLabel = (value?: string | null): string => {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sem data';
  return DATE_TIME_FORMATTER.format(parsed);
};

const toDateTimeLocalValue = (value?: string | null): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const listGroupClassName = (darkMode: boolean): string =>
  `rounded-[22px] border p-4 ${
    darkMode ? 'border-slate-800/90 bg-slate-950/55' : 'border-slate-200/80 bg-white/75'
  }`;

const listGroupCountClassName = (darkMode: boolean): string =>
  `inline-flex min-w-[2rem] items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
    darkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-700'
  }`;

const filterSummaryClassName = (darkMode: boolean): string =>
  `text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`;

const filterClearButtonClassName = (darkMode: boolean): string =>
  `inline-flex items-center justify-center rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
    darkMode
      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
  }`;

const emphasisPillClassName = (darkMode: boolean, variant: 'accent' | 'muted' = 'accent'): string => {
  if (variant === 'muted') {
    return `inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
      darkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600'
    }`;
  }

  return `inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
    darkMode ? 'border-cyan-700/80 bg-cyan-500/12 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-700'
  }`;
};

const OutrosListGroup = <T,>({
  darkMode,
  title,
  helper,
  items,
  collapsible = false,
  defaultOpen = true,
  children,
}: React.PropsWithChildren<{
  darkMode: boolean;
  title: string;
  helper?: string;
  items: T[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}>) => {
  if (items.length === 0) {
    return null;
  }

  if (collapsible) {
    return (
      <details open={defaultOpen} className={`${listGroupClassName(darkMode)} group`}>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
          <div>
            <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{title}</p>
            {helper ? (
              <p className={`mt-1 text-xs leading-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{helper}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className={listGroupCountClassName(darkMode)}>{items.length}</span>
            <ChevronDown className={`h-4 w-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>
        </summary>
        <div className="mt-3 space-y-3">{children}</div>
      </details>
    );
  }

  return (
    <section className={listGroupClassName(darkMode)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{title}</p>
          {helper ? (
            <p className={`mt-1 text-xs leading-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{helper}</p>
          ) : null}
        </div>
        <span className={listGroupCountClassName(darkMode)}>{items.length}</span>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
};

const buildTopicForm = (topic: LearningTopicSummary): TopicFormState => ({
  name: topic.name,
  category: topic.category || '',
  level: topic.level,
  status: topic.status,
});

const buildGoalForm = (goal: LearningGoalSummary): GoalFormState => ({
  topicId: goal.topicId,
  goalType: goal.goalType,
  description: goal.description || '',
  status: goal.status,
});

const buildPathForm = (path: LearningPathSummary): PathFormState => ({
  topicId: path.topicId,
  title: path.title,
  status: path.status,
  steps: ['', '', ''],
});

const buildStepForm = (step: PathStepSummary): StepFormState => ({
  pathId: step.pathId,
  title: step.title,
  description: step.description || '',
  status: step.status,
});

const buildEventForm = (event: PersonalGoalEventSummary): EventFormState => ({
  topicId: event.topicId || '',
  title: event.title,
  type: event.type,
  startAt: toDateTimeLocalValue(event.startAt),
  endAt: toDateTimeLocalValue(event.endAt),
  status: event.status,
});

export const OutrosActivationPanel: React.FC<OutrosActivationPanelProps> = ({
  darkMode = false,
  userId,
  dashboard,
  onRefresh,
}) => {
  const topics = dashboard?.topics || [];
  const goals = dashboard?.goals || [];
  const paths = dashboard?.paths || [];
  const steps = dashboard?.steps || [];
  const events = dashboard?.events || [];
  const nextStep = dashboard?.nextStep || null;
  const [listFilters, setListFilters] = React.useState<OutrosListFiltersState>({
    topicQuery: '',
    topicStatus: 'all',
    goalQuery: '',
    goalStatus: 'all',
    goalTopicId: 'all',
    pathQuery: '',
    pathStatus: 'all',
    pathTopicId: 'all',
    stepQuery: '',
    stepStatus: 'all',
    stepPathId: 'all',
    eventQuery: '',
    eventStatus: 'all',
    eventTopicId: 'all',
  });
  const deferredListFilters = React.useDeferredValue(listFilters);
  const sortedTopics = React.useMemo(
    () =>
      [...topics].sort(
        (left, right) =>
          TOPIC_STATUS_PRIORITY[left.status] - TOPIC_STATUS_PRIORITY[right.status]
          || compareText(left.name, right.name),
      ),
    [topics],
  );
  const sortedGoals = React.useMemo(
    () =>
      [...goals].sort(
        (left, right) =>
          GOAL_STATUS_PRIORITY[left.status] - GOAL_STATUS_PRIORITY[right.status]
          || compareText(left.description || GOAL_TYPE_LABELS[left.goalType], right.description || GOAL_TYPE_LABELS[right.goalType]),
      ),
    [goals],
  );
  const sortedPaths = React.useMemo(
    () =>
      [...paths].sort((left, right) => {
        const leftIsCurrent = nextStep?.pathId === left.id ? 1 : 0;
        const rightIsCurrent = nextStep?.pathId === right.id ? 1 : 0;

        return rightIsCurrent - leftIsCurrent
          || PATH_STATUS_PRIORITY[left.status] - PATH_STATUS_PRIORITY[right.status]
          || compareText(left.title, right.title);
      }),
    [nextStep?.pathId, paths],
  );
  const sortedSteps = React.useMemo(
    () =>
      [...steps].sort((left, right) => {
        const leftIsNext = nextStep?.id === left.id ? 1 : 0;
        const rightIsNext = nextStep?.id === right.id ? 1 : 0;

        return rightIsNext - leftIsNext
          || STEP_STATUS_PRIORITY[left.status] - STEP_STATUS_PRIORITY[right.status]
          || left.stepOrder - right.stepOrder
          || compareText(left.title, right.title);
      }),
    [nextStep?.id, steps],
  );
  const sortedEvents = React.useMemo(
    () =>
      [...events].sort(
        (left, right) =>
          EVENT_STATUS_PRIORITY[left.status] - EVENT_STATUS_PRIORITY[right.status]
          || toSortableTimestamp(left.startAt) - toSortableTimestamp(right.startAt)
          || compareText(left.title, right.title),
      ),
    [events],
  );
  const topicNameById = React.useMemo(() => new Map(topics.map((topic) => [topic.id, topic.name])), [topics]);
  const pathTitleById = React.useMemo(() => new Map(paths.map((path) => [path.id, path.title])), [paths]);
  const filteredTopics = React.useMemo(
    () =>
      sortedTopics.filter((topic) =>
        (deferredListFilters.topicStatus === 'all' || topic.status === deferredListFilters.topicStatus)
        && matchesSearchQuery(deferredListFilters.topicQuery, topic.name, topic.category, topic.level),
      ),
    [deferredListFilters.topicQuery, deferredListFilters.topicStatus, sortedTopics],
  );
  const filteredGoals = React.useMemo(
    () =>
      sortedGoals.filter((goal) =>
        (deferredListFilters.goalStatus === 'all' || goal.status === deferredListFilters.goalStatus)
        && (deferredListFilters.goalTopicId === 'all' || goal.topicId === deferredListFilters.goalTopicId)
        && matchesSearchQuery(
          deferredListFilters.goalQuery,
          goal.description,
          GOAL_TYPE_LABELS[goal.goalType],
          topicNameById.get(goal.topicId),
        ),
      ),
    [
      deferredListFilters.goalQuery,
      deferredListFilters.goalStatus,
      deferredListFilters.goalTopicId,
      sortedGoals,
      topicNameById,
    ],
  );
  const filteredPaths = React.useMemo(
    () =>
      sortedPaths.filter((path) =>
        (deferredListFilters.pathStatus === 'all' || path.status === deferredListFilters.pathStatus)
        && (deferredListFilters.pathTopicId === 'all' || path.topicId === deferredListFilters.pathTopicId)
        && matchesSearchQuery(
          deferredListFilters.pathQuery,
          path.title,
          topicNameById.get(path.topicId),
          `${path.progressPercent}%`,
        ),
      ),
    [
      deferredListFilters.pathQuery,
      deferredListFilters.pathStatus,
      deferredListFilters.pathTopicId,
      sortedPaths,
      topicNameById,
    ],
  );
  const filteredSteps = React.useMemo(
    () =>
      sortedSteps.filter((step) => {
        const matchesStatus =
          deferredListFilters.stepStatus === 'all'
          || (
            deferredListFilters.stepStatus === 'next'
              ? nextStep?.id === step.id && step.status !== 'concluido'
              : step.status === deferredListFilters.stepStatus
          );

        return matchesStatus
          && (deferredListFilters.stepPathId === 'all' || step.pathId === deferredListFilters.stepPathId)
          && matchesSearchQuery(
            deferredListFilters.stepQuery,
            step.title,
            step.description,
            pathTitleById.get(step.pathId),
          );
      }),
    [
      deferredListFilters.stepPathId,
      deferredListFilters.stepQuery,
      deferredListFilters.stepStatus,
      nextStep?.id,
      pathTitleById,
      sortedSteps,
    ],
  );
  const filteredEvents = React.useMemo(
    () =>
      sortedEvents.filter((event) =>
        (deferredListFilters.eventStatus === 'all' || event.status === deferredListFilters.eventStatus)
        && (
          deferredListFilters.eventTopicId === 'all'
          || (deferredListFilters.eventTopicId === 'unlinked' && !event.topicId)
          || event.topicId === deferredListFilters.eventTopicId
        )
        && matchesSearchQuery(
          deferredListFilters.eventQuery,
          event.title,
          event.topicName,
          EVENT_TYPE_LABELS[event.type],
        ),
      ),
    [
      deferredListFilters.eventQuery,
      deferredListFilters.eventStatus,
      deferredListFilters.eventTopicId,
      sortedEvents,
    ],
  );
  const groupedTopics = React.useMemo<GroupedListSection<LearningTopicSummary>[]>(() => {
    const active = filteredTopics.filter((topic) => topic.status === 'ativo');
    const paused = filteredTopics.filter((topic) => topic.status === 'pausado');
    const completed = filteredTopics.filter((topic) => topic.status === 'concluido');

    return [
      {
        id: 'topics-active',
        title: 'Em progresso',
        helper: 'Tema principal e focos vivos do modo livre.',
        items: active,
      },
      {
        id: 'topics-paused',
        title: 'Em pausa',
        helper: 'Guardados sem competir com o foco atual.',
        items: paused,
        collapsible: true,
        defaultOpen: false,
      },
      {
        id: 'topics-completed',
        title: 'Concluidos',
        helper: 'Historico resolvido, recolhido para nao poluir a leitura.',
        items: completed,
        collapsible: true,
        defaultOpen: false,
      },
    ].filter((group) => group.items.length > 0);
  }, [filteredTopics]);
  const groupedGoals = React.useMemo<GroupedListSection<LearningGoalSummary>[]>(() => {
    const active = filteredGoals.filter((goal) => goal.status === 'ativo');
    const completed = filteredGoals.filter((goal) => goal.status === 'concluido');
    const archived = filteredGoals.filter((goal) => goal.status === 'arquivado');

    return [
      {
        id: 'goals-active',
        title: 'Em progresso',
        helper: 'Objetivos que ainda orientam o tema e a trilha ativa.',
        items: active,
      },
      {
        id: 'goals-completed',
        title: 'Concluidos',
        helper: 'Metas ja fechadas, separadas para consulta rapida.',
        items: completed,
        collapsible: true,
        defaultOpen: false,
      },
      {
        id: 'goals-archived',
        title: 'Arquivados',
        helper: 'Guardados fora da rota principal do momento.',
        items: archived,
        collapsible: true,
        defaultOpen: false,
      },
    ].filter((group) => group.items.length > 0);
  }, [filteredGoals]);
  const groupedPaths = React.useMemo<GroupedListSection<LearningPathSummary>[]>(() => {
    const active = filteredPaths.filter((path) => path.status === 'ativa');
    const paused = filteredPaths.filter((path) => path.status === 'pausada');
    const completed = filteredPaths.filter((path) => path.status === 'concluida');

    return [
      {
        id: 'paths-active',
        title: 'Em progresso',
        helper: 'Trilhas ativas, com o foco atual puxado para cima.',
        items: active,
      },
      {
        id: 'paths-paused',
        title: 'Em pausa',
        helper: 'Continuidades guardadas para retomar depois.',
        items: paused,
        collapsible: true,
        defaultOpen: false,
      },
      {
        id: 'paths-completed',
        title: 'Concluidas',
        helper: 'Historico finalizado, recolhido por padrao.',
        items: completed,
        collapsible: true,
        defaultOpen: false,
      },
    ].filter((group) => group.items.length > 0);
  }, [filteredPaths]);
  const groupedSteps = React.useMemo<GroupedListSection<PathStepSummary>[]>(() => {
    const nextUp = nextStep ? filteredSteps.filter((step) => step.id === nextStep.id && step.status !== 'concluido') : [];
    const inProgress = filteredSteps.filter((step) => step.status !== 'concluido' && step.id !== nextStep?.id);
    const completed = filteredSteps.filter((step) => step.status === 'concluido');

    return [
      {
        id: 'steps-next',
        title: 'Proximo passo',
        helper: 'O item mais importante para continuar a trilha sem pensar demais.',
        items: nextUp,
      },
      {
        id: 'steps-progress',
        title: 'Em progresso',
        helper: 'Passos em andamento ou na fila imediata do dominio.',
        items: inProgress,
      },
      {
        id: 'steps-completed',
        title: 'Concluidos',
        helper: 'Historico de passos resolvidos, recolhido por padrao.',
        items: completed,
        collapsible: true,
        defaultOpen: false,
      },
    ].filter((group) => group.items.length > 0);
  }, [filteredSteps, nextStep]);
  const groupedEvents = React.useMemo<GroupedListSection<PersonalGoalEventSummary>[]>(() => {
    const support = filteredEvents.filter((event) => event.status === 'pendente');
    const history = filteredEvents.filter((event) => event.status !== 'pendente');

    return [
      {
        id: 'events-support',
        title: 'Eventos de apoio',
        helper: 'Metas, revisoes e blocos que sustentam a continuidade do tema.',
        items: support,
      },
      {
        id: 'events-history',
        title: 'Historico',
        helper: 'Eventos ja encerrados, recolhidos para manter o foco no que segue vivo.',
        items: history,
        collapsible: true,
        defaultOpen: false,
      },
    ].filter((group) => group.items.length > 0);
  }, [filteredEvents]);

  const { busyAction, feedback, retryLastAction, runAction } = usePanelActionFeedback({
    userId,
    onRefresh,
    loginErrorMessage: 'Faca login para editar o modo livre.',
  });
  const [pendingDelete, setPendingDelete] = React.useState<DeleteTarget | null>(null);

  const [editingTopicId, setEditingTopicId] = React.useState<string | null>(null);
  const [topicForm, setTopicForm] = React.useState<TopicFormState>(emptyTopicForm);

  const [editingGoalId, setEditingGoalId] = React.useState<string | null>(null);
  const [goalForm, setGoalForm] = React.useState<GoalFormState>(emptyGoalForm);

  const [editingPathId, setEditingPathId] = React.useState<string | null>(null);
  const [pathForm, setPathForm] = React.useState<PathFormState>(emptyPathForm);

  const [editingStepId, setEditingStepId] = React.useState<string | null>(null);
  const [stepForm, setStepForm] = React.useState<StepFormState>(emptyStepForm);

  const [editingEventId, setEditingEventId] = React.useState<string | null>(null);
  const [eventForm, setEventForm] = React.useState<EventFormState>(emptyEventForm);

  const topicNameInputRef = React.useRef<HTMLInputElement | null>(null);
  const goalDescriptionRef = React.useRef<HTMLTextAreaElement | null>(null);
  const pathTitleInputRef = React.useRef<HTMLInputElement | null>(null);
  const stepTitleInputRef = React.useRef<HTMLInputElement | null>(null);
  const eventTitleInputRef = React.useRef<HTMLInputElement | null>(null);

  const resetTopicForm = React.useCallback(() => {
    setEditingTopicId(null);
    setTopicForm(emptyTopicForm());
  }, []);

  const resetGoalForm = React.useCallback(() => {
    setEditingGoalId(null);
    setGoalForm(emptyGoalForm());
  }, []);

  const resetPathForm = React.useCallback(() => {
    setEditingPathId(null);
    setPathForm(emptyPathForm());
  }, []);

  const resetStepForm = React.useCallback(() => {
    setEditingStepId(null);
    setStepForm(emptyStepForm());
  }, []);

  const resetEventForm = React.useCallback(() => {
    setEditingEventId(null);
    setEventForm({
      ...emptyEventForm(),
      topicId: sortedTopics[0]?.id || '',
    });
  }, [sortedTopics]);

  const focusField = React.useCallback((element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null) => {
    if (!element || typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.select();
      }
    });
  }, []);

  const handleSeedDemo = React.useCallback(() => {
    void runAction(
      'seed',
      () => outrosDomainService.seedDemoData(userId!),
      'Dados demo do modo livre prontos.',
      {
        loadingTitle: 'Populando modo livre com dados demo...',
        loadingDetail: 'Criando tema, objetivo, trilha, passos e evento de exemplo.',
        errorTitle: 'Nao foi possivel popular os dados demo do modo livre.',
      },
    );
  }, [runAction, userId]);

  const handleRefreshSnapshot = React.useCallback(() => {
    void runAction(
      'snapshot:refresh',
      async () => {},
      'Snapshot atualizado com sucesso.',
      {
        loadingTitle: 'Atualizando snapshot...',
        loadingDetail: 'Buscando tema, trilha, progresso e eventos mais recentes.',
        successDetail: 'O shell agora mostra o estado atual do modo livre.',
        errorTitle: 'Nao foi possivel atualizar o snapshot.',
      },
    );
  }, [runAction]);

  const updateListFilter = React.useCallback(
    <K extends keyof OutrosListFiltersState>(key: K, value: OutrosListFiltersState[K]) => {
      setListFilters((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const clearTopicFilters = React.useCallback(() => {
    setListFilters((current) => ({
      ...current,
      topicQuery: '',
      topicStatus: 'all',
    }));
  }, []);

  const clearGoalFilters = React.useCallback(() => {
    setListFilters((current) => ({
      ...current,
      goalQuery: '',
      goalStatus: 'all',
      goalTopicId: 'all',
    }));
  }, []);

  const clearPathFilters = React.useCallback(() => {
    setListFilters((current) => ({
      ...current,
      pathQuery: '',
      pathStatus: 'all',
      pathTopicId: 'all',
    }));
  }, []);

  const clearStepFilters = React.useCallback(() => {
    setListFilters((current) => ({
      ...current,
      stepQuery: '',
      stepStatus: 'all',
      stepPathId: 'all',
    }));
  }, []);

  const clearEventFilters = React.useCallback(() => {
    setListFilters((current) => ({
      ...current,
      eventQuery: '',
      eventStatus: 'all',
      eventTopicId: 'all',
    }));
  }, []);

  const hasTopicFilters = listFilters.topicQuery.trim().length > 0 || listFilters.topicStatus !== 'all';
  const hasGoalFilters =
    listFilters.goalQuery.trim().length > 0
    || listFilters.goalStatus !== 'all'
    || listFilters.goalTopicId !== 'all';
  const hasPathFilters =
    listFilters.pathQuery.trim().length > 0
    || listFilters.pathStatus !== 'all'
    || listFilters.pathTopicId !== 'all';
  const hasStepFilters =
    listFilters.stepQuery.trim().length > 0
    || listFilters.stepStatus !== 'all'
    || listFilters.stepPathId !== 'all';
  const hasEventFilters =
    listFilters.eventQuery.trim().length > 0
    || listFilters.eventStatus !== 'all'
    || listFilters.eventTopicId !== 'all';

  const focusTopicSetup = React.useCallback(() => {
    resetTopicForm();
    focusField(topicNameInputRef.current);
  }, [focusField, resetTopicForm]);

  const focusGoalSetup = React.useCallback(() => {
    if (!sortedTopics.length) {
      focusTopicSetup();
      return;
    }

    setEditingGoalId(null);
    setGoalForm({
      ...emptyGoalForm(),
      topicId: sortedTopics[0]?.id || '',
    });
    focusField(goalDescriptionRef.current);
  }, [focusField, focusTopicSetup, sortedTopics]);

  const focusPathSetup = React.useCallback(() => {
    if (!sortedTopics.length) {
      focusTopicSetup();
      return;
    }

    setEditingPathId(null);
    setPathForm({
      ...emptyPathForm(),
      topicId: sortedTopics[0]?.id || '',
    });
    focusField(pathTitleInputRef.current);
  }, [focusField, focusTopicSetup, sortedTopics]);

  const focusEventSetup = React.useCallback(() => {
    setEditingEventId(null);
    setEventForm({
      ...emptyEventForm(),
      topicId: sortedTopics[0]?.id || '',
    });
    focusField(eventTitleInputRef.current);
  }, [focusField, sortedTopics]);

  const openTopicEditor = React.useCallback((topic: LearningTopicSummary) => {
    setEditingTopicId(topic.id);
    setTopicForm(buildTopicForm(topic));
    focusField(topicNameInputRef.current);
  }, [focusField]);

  const openGoalEditor = React.useCallback((goal: LearningGoalSummary) => {
    setEditingGoalId(goal.id);
    setGoalForm(buildGoalForm(goal));
    focusField(goalDescriptionRef.current);
  }, [focusField]);

  const openPathEditor = React.useCallback((path: LearningPathSummary) => {
    setEditingPathId(path.id);
    setPathForm(buildPathForm(path));
    focusField(pathTitleInputRef.current);
  }, [focusField]);

  const openStepEditor = React.useCallback((step: PathStepSummary) => {
    setEditingStepId(step.id);
    setStepForm(buildStepForm(step));
    focusField(stepTitleInputRef.current);
  }, [focusField]);

  const openEventEditor = React.useCallback((event: PersonalGoalEventSummary) => {
    setEditingEventId(event.id);
    setEventForm(buildEventForm(event));
    focusField(eventTitleInputRef.current);
  }, [focusField]);

  const handleStepStatusAction = React.useCallback((step: PathStepSummary) => {
    if (step.status === 'concluido') {
      void runAction(
        `step:reopen:${step.id}`,
        () =>
          outrosDomainService.updatePathStep(userId!, step.id, {
            title: step.title,
            description: step.description || '',
            status: 'em_andamento',
          }),
        'Passo reaberto com sucesso.',
        {
          loadingTitle: 'Reabrindo passo...',
          loadingDetail: 'A trilha esta sendo recalculada para refletir a reabertura.',
          errorTitle: 'Nao foi possivel reabrir esse passo.',
        },
      );
      return;
    }

    void runAction(
      `step:complete:${step.id}`,
      () => outrosDomainService.completeStep(userId!, step.id),
      'Passo concluido com sucesso.',
      {
        loadingTitle: 'Concluindo passo...',
        loadingDetail: 'Atualizando progresso da trilha e o proximo passo.',
        errorTitle: 'Nao foi possivel concluir esse passo.',
      },
    );
  }, [runAction, userId]);

  const isFirstOutrosSetup =
    topics.length === 0 && goals.length === 0 && paths.length === 0 && steps.length === 0 && events.length === 0;

  const handleConfirmDelete = React.useCallback(async () => {
    if (!pendingDelete) {
      return;
    }

    const target = pendingDelete;

    const deleted = await runAction(
      target.actionKey,
      async () => {
        if (target.kind === 'topic') {
          await outrosDomainService.deleteTopic(userId!, target.id);
          if (editingTopicId === target.id) resetTopicForm();
          if (goalForm.topicId === target.id) setGoalForm((current) => ({ ...current, topicId: '' }));
          if (pathForm.topicId === target.id) setPathForm((current) => ({ ...current, topicId: '' }));
          if (eventForm.topicId === target.id) setEventForm((current) => ({ ...current, topicId: '' }));
          return;
        }

        if (target.kind === 'goal') {
          await outrosDomainService.deleteGoal(userId!, target.id);
          if (editingGoalId === target.id) resetGoalForm();
          return;
        }

        if (target.kind === 'path') {
          await outrosDomainService.deletePath(userId!, target.id);
          if (editingPathId === target.id) resetPathForm();
          if (stepForm.pathId === target.id) resetStepForm();
          return;
        }

        if (target.kind === 'step') {
          await outrosDomainService.deletePathStep(userId!, target.id);
          if (editingStepId === target.id) resetStepForm();
          return;
        }

        await outrosDomainService.deleteGoalEvent(userId!, target.id);
        if (editingEventId === target.id) resetEventForm();
      },
      target.successMessage,
      {
        loadingTitle: 'Excluindo item do modo livre...',
        loadingDetail: 'Atualizando trilhas, eventos e progresso do shell.',
        errorTitle: 'Nao foi possivel excluir esse item.',
      },
    );

    if (deleted) {
      setPendingDelete(null);
    }
  }, [
    editingEventId,
    editingGoalId,
    editingPathId,
    editingStepId,
    editingTopicId,
    eventForm.topicId,
    goalForm.topicId,
    pathForm.topicId,
    pendingDelete,
    resetEventForm,
    resetGoalForm,
    resetPathForm,
    resetStepForm,
    resetTopicForm,
    runAction,
    stepForm.pathId,
    userId,
  ]);

  React.useEffect(() => {
    if (goalForm.topicId && !topics.some((topic) => topic.id === goalForm.topicId)) {
      setGoalForm((current) => ({ ...current, topicId: '' }));
    }
    if (pathForm.topicId && !topics.some((topic) => topic.id === pathForm.topicId)) {
      setPathForm((current) => ({ ...current, topicId: '' }));
    }
    if (eventForm.topicId && !topics.some((topic) => topic.id === eventForm.topicId)) {
      setEventForm((current) => ({ ...current, topicId: '' }));
    }
  }, [eventForm.topicId, goalForm.topicId, pathForm.topicId, topics]);

  React.useEffect(() => {
    if (editingEventId || eventForm.topicId || !sortedTopics[0]?.id) {
      return;
    }

    setEventForm((current) => ({
      ...current,
      topicId: sortedTopics[0]?.id || '',
    }));
  }, [editingEventId, eventForm.topicId, sortedTopics]);

  React.useEffect(() => {
    if (stepForm.pathId && !paths.some((path) => path.id === stepForm.pathId)) {
      setStepForm((current) => ({ ...current, pathId: '' }));
    }
  }, [paths, stepForm.pathId]);

  React.useEffect(() => {
    if (editingTopicId && !topics.some((topic) => topic.id === editingTopicId)) resetTopicForm();
  }, [editingTopicId, resetTopicForm, topics]);

  React.useEffect(() => {
    if (editingGoalId && !goals.some((goal) => goal.id === editingGoalId)) resetGoalForm();
  }, [editingGoalId, goals, resetGoalForm]);

  React.useEffect(() => {
    if (editingPathId && !paths.some((path) => path.id === editingPathId)) resetPathForm();
  }, [editingPathId, paths, resetPathForm]);

  React.useEffect(() => {
    if (editingStepId && !steps.some((step) => step.id === editingStepId)) resetStepForm();
  }, [editingStepId, resetStepForm, steps]);

  React.useEffect(() => {
    if (editingEventId && !events.some((event) => event.id === editingEventId)) resetEventForm();
  }, [editingEventId, events, resetEventForm]);

  const activationAndTopicSection = (
    <>
      <PanelActionFeedback
        darkMode={darkMode}
        feedback={feedback}
        onRetry={() => {
          void retryLastAction();
        }}
        className="xl:col-span-2"
      />

      <article className={panelClassName(darkMode)}>
        <p className={labelClassName(darkMode)}>Ativacao do modo livre</p>
        <h3 className={`mt-2 text-lg font-black tracking-[-0.03em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
          Popular, editar e manter o dominio
        </h3>
        <p className={helperCopyClassName(darkMode)}>
          O shell livre agora consegue sair do vazio com seed demo e seguir com manutencao real de tema, objetivo, trilha,
          passo e evento.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonClassName(darkMode)}
            onClick={handleSeedDemo}
            disabled={busyAction === 'seed'}
          >
            {busyAction === 'seed' ? 'Populando...' : 'Popular demo'}
          </button>
          <button
            type="button"
            className={buttonClassName(darkMode, 'secondary')}
            onClick={handleRefreshSnapshot}
            disabled={busyAction === 'snapshot:refresh'}
          >
            {busyAction === 'snapshot:refresh' ? 'Atualizando...' : 'Atualizar snapshot'}
          </button>
          {nextStep ? (
            <button
              type="button"
              className={buttonClassName(darkMode, 'secondary')}
              onClick={() =>
                void runAction(
                  'step:complete-next',
                  () => outrosDomainService.completeStep(userId!, nextStep.id),
                  'Proximo passo concluido e trilha atualizada.',
                )
              }
              disabled={busyAction === 'step:complete-next'}
            >
              {busyAction === 'step:complete-next' ? 'Atualizando...' : 'Concluir proximo passo'}
            </button>
          ) : null}
        </div>

        {isFirstOutrosSetup ? (
          <div className="mt-5">
            <GuidedEmptyStateCard
              darkMode={darkMode}
              icon={Sparkles}
              eyebrow="Primeira ativacao"
              title="Defina o primeiro tema para tirar o modo livre do vazio"
              description="Tema, objetivo, trilha e proximo passo passam a conversar entre si assim que voce escolhe um foco principal."
              hint="Se quiser ver o fluxo inteiro imediatamente, a seed demo monta um exemplo completo para continuar editando."
              primaryActionLabel="Adicionar tema"
              onPrimaryAction={focusTopicSetup}
              secondaryActionLabel="Popular com demo"
              onSecondaryAction={handleSeedDemo}
            />
          </div>
        ) : null}
      </article>

      <article className={panelClassName(darkMode)}>
        <p className={labelClassName(darkMode)}>Tema</p>
        <h3 className={`mt-2 text-lg font-black tracking-[-0.03em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
          {editingTopicId ? 'Editar tema' : 'Novo tema'}
        </h3>
        <p className={helperCopyClassName(darkMode)}>
          Nome, categoria, nivel e status ficam no mesmo fluxo para manter o shell coerente no reload.
        </p>

        <div className="mt-4 space-y-3">
          <input
            ref={topicNameInputRef}
            className={inputClassName(darkMode)}
            placeholder="Tema principal"
            value={topicForm.name}
            onChange={(event) => setTopicForm((current) => ({ ...current, name: event.target.value }))}
          />
          <input
            className={inputClassName(darkMode)}
            placeholder="Categoria opcional"
            value={topicForm.category}
            onChange={(event) => setTopicForm((current) => ({ ...current, category: event.target.value }))}
          />
          <select
            className={inputClassName(darkMode)}
            value={topicForm.level}
            onChange={(event) =>
              setTopicForm((current) => ({ ...current, level: event.target.value as TopicFormState['level'] }))
            }
          >
            <option value="iniciante">Nivel iniciante</option>
            <option value="intermediario">Nivel intermediario</option>
            <option value="avancado">Nivel avancado</option>
          </select>
          <select
            className={inputClassName(darkMode)}
            value={topicForm.status}
            onChange={(event) =>
              setTopicForm((current) => ({ ...current, status: event.target.value as TopicFormState['status'] }))
            }
          >
            <option value="ativo">Ativo</option>
            <option value="pausado">Pausado</option>
            <option value="concluido">Concluido</option>
          </select>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonClassName(darkMode)}
              onClick={() =>
                void runAction(
                  editingTopicId ? `topic:update:${editingTopicId}` : 'topic:create',
                  async () => {
                    if (!topicForm.name.trim()) {
                      throw new Error('Informe o nome do tema principal.');
                    }

                    if (editingTopicId) {
                      await outrosDomainService.updateTopic(userId!, editingTopicId, {
                        name: topicForm.name,
                        category: topicForm.category,
                        level: topicForm.level,
                        status: topicForm.status,
                      });
                    } else {
                      await outrosDomainService.createTopic(userId!, {
                        name: topicForm.name,
                        category: topicForm.category,
                        level: topicForm.level,
                      });
                    }

                    resetTopicForm();
                  },
                  editingTopicId ? 'Tema atualizado com sucesso.' : 'Tema criado com sucesso.',
                )
              }
              disabled={busyAction === (editingTopicId ? `topic:update:${editingTopicId}` : 'topic:create')}
            >
              {busyAction === (editingTopicId ? `topic:update:${editingTopicId}` : 'topic:create')
                ? 'Salvando...'
                : editingTopicId
                  ? 'Salvar tema'
                  : 'Adicionar tema'}
            </button>
            {editingTopicId ? (
              <button type="button" className={buttonClassName(darkMode, 'secondary')} onClick={resetTopicForm}>
                Cancelar edicao
              </button>
            ) : null}
          </div>
        </div>

        <div className={`mt-5 border-t pt-5 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Temas atuais
          </p>
          {topics.length > 0 ? (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  className={inputClassName(darkMode)}
                  placeholder="Buscar tema na lista"
                  value={listFilters.topicQuery}
                  onChange={(event) => updateListFilter('topicQuery', event.target.value)}
                />
                <select
                  className={inputClassName(darkMode)}
                  value={listFilters.topicStatus}
                  onChange={(event) => updateListFilter('topicStatus', event.target.value as OutrosListFiltersState['topicStatus'])}
                >
                  <option value="all">Todos os status</option>
                  <option value="ativo">Em progresso</option>
                  <option value="pausado">Em pausa</option>
                  <option value="concluido">Concluidos</option>
                </select>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className={filterSummaryClassName(darkMode)}>
                  {filteredTopics.length} de {topics.length} visiveis - organizado por progresso do tema.
                </p>
                {hasTopicFilters ? (
                  <button
                    type="button"
                    className={filterClearButtonClassName(darkMode)}
                    onClick={clearTopicFilters}
                  >
                    Limpar filtros
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
          <div className="mt-3 space-y-4">
            {topics.length === 0 ? (
              <GuidedEmptyStateCard
                darkMode={darkMode}
                icon={Lightbulb}
                eyebrow="Tema principal"
                title="Nenhum tema definido ainda"
                description="Escolha um tema para dar contexto ao modo livre e permitir objetivo, trilha, eventos e progresso real."
                hint="Comece com algo concreto, como Ingles, TS aplicado ou oratoria."
                primaryActionLabel="Adicionar tema"
                onPrimaryAction={focusTopicSetup}
                secondaryActionLabel="Popular com demo"
                onSecondaryAction={handleSeedDemo}
              />
            ) : filteredTopics.length > 0 ? (
              groupedTopics.map((group) => (
                <OutrosListGroup
                  key={group.id}
                  darkMode={darkMode}
                  title={group.title}
                  helper={group.helper}
                  items={group.items}
                  collapsible={group.collapsible}
                  defaultOpen={group.defaultOpen}
                >
                  {group.items.map((topic) => (
                    <article key={topic.id} className={interactiveItemCardClassName(darkMode)}>
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          className={itemPrimaryActionClassName(darkMode)}
                          aria-label={`Abrir tema ${topic.name} para edicao`}
                          onClick={() => openTopicEditor(topic)}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-2">
                            <h4 className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                              {topic.name}
                            </h4>
                            <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {topic.category ? `${topic.category} · ${topic.level}` : `Nivel ${topic.level}`}
                            </p>
                        </div>
                        <span className={badgeClassName(darkMode)}>{TOPIC_STATUS_LABELS[topic.status]}</span>
                      </div>
                    </button>
                    <ItemActionMenu
                      darkMode={darkMode}
                      itemLabel={topic.name}
                      actions={[
                        {
                          label: 'Editar',
                          onSelect: () => openTopicEditor(topic),
                        },
                        {
                          label: 'Excluir',
                          destructive: true,
                          onSelect: () =>
                            setPendingDelete({
                              kind: 'topic',
                              id: topic.id,
                              title: topic.name,
                              message: `Excluir ${topic.name}? Objetivos e trilhas ligados a esse tema saem junto do dominio.`,
                              actionKey: `topic:delete:${topic.id}`,
                              successMessage: 'Tema removido com sucesso.',
                            }),
                        },
                      ]}
                        />
                      </div>
                    </article>
                  ))}
                </OutrosListGroup>
              ))
            ) : (
              <GuidedEmptyStateCard
                darkMode={darkMode}
                icon={Lightbulb}
                eyebrow="Filtros ativos"
                title="Nenhum tema bate com esse recorte"
                description="Ajuste busca ou status para reencontrar o foco atual sem perder a leitura por progresso."
                hint="Limpar os filtros desta secao devolve o panorama completo."
                primaryActionLabel="Limpar filtros"
                onPrimaryAction={clearTopicFilters}
              />
            )}
          </div>
        </div>
      </article>
    </>
  );

  const goalAndPathSection = (
    <>
      <article className={panelClassName(darkMode)}>
        <p className={labelClassName(darkMode)}>Objetivo</p>
        <h3 className={`mt-2 text-lg font-black tracking-[-0.03em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
          {editingGoalId ? 'Editar objetivo' : 'Novo objetivo'}
        </h3>
        <p className={helperCopyClassName(darkMode)}>
          O objetivo agora pode mudar de tema, profundidade, descricao e status sem perder o refresh central.
        </p>

        <div className="mt-4 space-y-3">
          <select
            className={inputClassName(darkMode)}
            value={goalForm.topicId}
            onChange={(event) => setGoalForm((current) => ({ ...current, topicId: event.target.value }))}
          >
            <option value="">Tema do objetivo</option>
            {sortedTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
          <select
            className={inputClassName(darkMode)}
            value={goalForm.goalType}
            onChange={(event) =>
              setGoalForm((current) => ({ ...current, goalType: event.target.value as GoalFormState['goalType'] }))
            }
          >
            <option value="aprender_do_zero">Aprender do zero</option>
            <option value="praticar">Praticar</option>
            <option value="rotina">Criar rotina</option>
            <option value="aprofundar">Aprofundar</option>
          </select>
          <textarea
            ref={goalDescriptionRef}
            className={textareaClassName(darkMode)}
            placeholder="Descricao do objetivo"
            value={goalForm.description}
            onChange={(event) => setGoalForm((current) => ({ ...current, description: event.target.value }))}
          />
          <select
            className={inputClassName(darkMode)}
            value={goalForm.status}
            onChange={(event) =>
              setGoalForm((current) => ({ ...current, status: event.target.value as GoalFormState['status'] }))
            }
          >
            <option value="ativo">Ativo</option>
            <option value="concluido">Concluido</option>
            <option value="arquivado">Arquivado</option>
          </select>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonClassName(darkMode)}
              onClick={() =>
                void runAction(
                  editingGoalId ? `goal:update:${editingGoalId}` : 'goal:create',
                  async () => {
                    if (!goalForm.topicId) {
                      throw new Error('Escolha um tema antes de salvar o objetivo.');
                    }

                    if (editingGoalId) {
                      await outrosDomainService.updateGoal(userId!, editingGoalId, {
                        topicId: goalForm.topicId,
                        goalType: goalForm.goalType,
                        description: goalForm.description,
                        status: goalForm.status,
                      });
                    } else {
                      await outrosDomainService.createGoal(userId!, {
                        topicId: goalForm.topicId,
                        goalType: goalForm.goalType,
                        description: goalForm.description,
                      });
                    }

                    resetGoalForm();
                  },
                  editingGoalId ? 'Objetivo atualizado com sucesso.' : 'Objetivo criado com sucesso.',
                )
              }
              disabled={busyAction === (editingGoalId ? `goal:update:${editingGoalId}` : 'goal:create')}
            >
              {busyAction === (editingGoalId ? `goal:update:${editingGoalId}` : 'goal:create')
                ? 'Salvando...'
                : editingGoalId
                  ? 'Salvar objetivo'
                  : 'Adicionar objetivo'}
            </button>
            {editingGoalId ? (
              <button type="button" className={buttonClassName(darkMode, 'secondary')} onClick={resetGoalForm}>
                Cancelar edicao
              </button>
            ) : null}
          </div>
        </div>

        <div className={`mt-5 border-t pt-5 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Objetivos atuais
          </p>
          {goals.length > 0 ? (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input
                  className={inputClassName(darkMode)}
                  placeholder="Buscar objetivo na lista"
                  value={listFilters.goalQuery}
                  onChange={(event) => updateListFilter('goalQuery', event.target.value)}
                />
                <select
                  className={inputClassName(darkMode)}
                  value={listFilters.goalStatus}
                  onChange={(event) => updateListFilter('goalStatus', event.target.value as OutrosListFiltersState['goalStatus'])}
                >
                  <option value="all">Todos os status</option>
                  <option value="ativo">Em progresso</option>
                  <option value="concluido">Concluidos</option>
                  <option value="arquivado">Arquivados</option>
                </select>
                <select
                  className={inputClassName(darkMode)}
                  value={listFilters.goalTopicId}
                  onChange={(event) => updateListFilter('goalTopicId', event.target.value)}
                >
                  <option value="all">Todos os temas</option>
                  {sortedTopics.map((topic) => (
                    <option key={`goal-filter-${topic.id}`} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className={filterSummaryClassName(darkMode)}>
                  {filteredGoals.length} de {goals.length} visiveis - filtrado por progresso e tema.
                </p>
                {hasGoalFilters ? (
                  <button
                    type="button"
                    className={filterClearButtonClassName(darkMode)}
                    onClick={clearGoalFilters}
                  >
                    Limpar filtros
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
          <div className="mt-3 space-y-4">
            {goals.length === 0 ? (
              <GuidedEmptyStateCard
                darkMode={darkMode}
                icon={Target}
                eyebrow={topics.length === 0 ? 'Dependencia de base' : 'Direcao do tema'}
                title={topics.length === 0 ? 'Defina um tema antes do primeiro objetivo' : 'Nenhum objetivo orientando a trilha'}
                description={
                  topics.length === 0
                    ? 'O objetivo precisa nascer dentro de um tema. Assim que o tema entrar, voce ja consegue dizer se quer aprender, praticar ou aprofundar.'
                    : 'O objetivo da clareza para o tema e ajuda o shell a decidir ritmo, profundidade e proximo passo.'
                }
                hint={
                  topics.length === 0
                    ? 'Comece com o foco principal que voce quer desenvolver agora.'
                    : 'Uma frase curta ja basta para orientar o dominio.'
                }
                primaryActionLabel={topics.length === 0 ? 'Adicionar tema' : 'Adicionar objetivo'}
                onPrimaryAction={topics.length === 0 ? focusTopicSetup : focusGoalSetup}
              />
            ) : filteredGoals.length > 0 ? (
              groupedGoals.map((group) => (
                <OutrosListGroup
                  key={group.id}
                  darkMode={darkMode}
                  title={group.title}
                  helper={group.helper}
                  items={group.items}
                  collapsible={group.collapsible}
                  defaultOpen={group.defaultOpen}
                >
                  {group.items.map((goal) => (
                    <article key={goal.id} className={interactiveItemCardClassName(darkMode)}>
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          className={itemPrimaryActionClassName(darkMode)}
                          aria-label={`Abrir objetivo ${goal.description || GOAL_TYPE_LABELS[goal.goalType]} para edicao`}
                          onClick={() => openGoalEditor(goal)}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-2">
                          <h4 className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            {GOAL_TYPE_LABELS[goal.goalType]}
                          </h4>
                          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {goal.description || 'Sem descricao adicional.'}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            Tema: {topicNameById.get(goal.topicId) || 'Sem tema'}
                          </p>
                        </div>
                        <span className={badgeClassName(darkMode)}>{goal.status}</span>
                      </div>
                    </button>
                    <ItemActionMenu
                      darkMode={darkMode}
                      itemLabel={goal.description || GOAL_TYPE_LABELS[goal.goalType]}
                      actions={[
                        {
                          label: 'Editar',
                          onSelect: () => openGoalEditor(goal),
                        },
                        {
                          label: 'Excluir',
                          destructive: true,
                          onSelect: () =>
                            setPendingDelete({
                              kind: 'goal',
                              id: goal.id,
                              title: GOAL_TYPE_LABELS[goal.goalType],
                              message: `Excluir ${GOAL_TYPE_LABELS[goal.goalType]}?`,
                              actionKey: `goal:delete:${goal.id}`,
                              successMessage: 'Objetivo removido com sucesso.',
                            }),
                        },
                      ]}
                        />
                      </div>
                    </article>
                  ))}
                </OutrosListGroup>
              ))
            ) : (
              <GuidedEmptyStateCard
                darkMode={darkMode}
                icon={Target}
                eyebrow="Filtros ativos"
                title="Nenhum objetivo bate com esse recorte"
                description="Ajuste busca, status ou tema para recuperar a visao de progresso sem baguncar a leitura da trilha."
                hint="Limpar os filtros devolve todos os objetivos desta secao."
                primaryActionLabel="Limpar filtros"
                onPrimaryAction={clearGoalFilters}
              />
            )}
          </div>
        </div>
      </article>

      <article className={panelClassName(darkMode)}>
        <p className={labelClassName(darkMode)}>Trilha</p>
        <h3 className={`mt-2 text-lg font-black tracking-[-0.03em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
          {editingPathId ? 'Editar trilha' : 'Nova trilha'}
        </h3>
        <p className={helperCopyClassName(darkMode)}>
          A trilha agora cobre titulo, tema, status e as etapas iniciais para o primeiro uso real.
        </p>

        <div className="mt-4 space-y-3">
          <select
            className={inputClassName(darkMode)}
            value={pathForm.topicId}
            onChange={(event) => setPathForm((current) => ({ ...current, topicId: event.target.value }))}
          >
            <option value="">Tema da trilha</option>
            {sortedTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
          <input
            ref={pathTitleInputRef}
            className={inputClassName(darkMode)}
            placeholder="Titulo da trilha"
            value={pathForm.title}
            onChange={(event) => setPathForm((current) => ({ ...current, title: event.target.value }))}
          />
          <select
            className={inputClassName(darkMode)}
            value={pathForm.status}
            onChange={(event) => setPathForm((current) => ({ ...current, status: event.target.value as PathFormState['status'] }))}
          >
            <option value="ativa">Ativa</option>
            <option value="pausada">Pausada</option>
            <option value="concluida">Concluida</option>
          </select>
          {!editingPathId ? (
            <>
              {pathForm.steps.map((step, index) => (
                <input
                  key={`path-step-${index + 1}`}
                  className={inputClassName(darkMode)}
                  placeholder={`Passo ${index + 1}`}
                  value={step}
                  onChange={(event) =>
                    setPathForm((current) => ({
                      ...current,
                      steps: current.steps.map((currentStep, currentIndex) =>
                        currentIndex === index ? event.target.value : currentStep,
                      ),
                    }))
                  }
                />
              ))}
            </>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonClassName(darkMode)}
              onClick={() =>
                void runAction(
                  editingPathId ? `path:update:${editingPathId}` : 'path:create',
                  async () => {
                    if (!pathForm.topicId) {
                      throw new Error('Escolha um tema antes de salvar a trilha.');
                    }
                    if (!pathForm.title.trim()) {
                      throw new Error('Informe o titulo da trilha.');
                    }

                    if (editingPathId) {
                      await outrosDomainService.updatePath(userId!, editingPathId, {
                        topicId: pathForm.topicId,
                        title: pathForm.title,
                        status: pathForm.status,
                      });
                    } else {
                      await outrosDomainService.createPath(userId!, {
                        topicId: pathForm.topicId,
                        title: pathForm.title,
                        steps: pathForm.steps,
                      });
                    }

                    resetPathForm();
                  },
                  editingPathId ? 'Trilha atualizada com sucesso.' : 'Trilha criada com sucesso.',
                )
              }
              disabled={busyAction === (editingPathId ? `path:update:${editingPathId}` : 'path:create')}
            >
              {busyAction === (editingPathId ? `path:update:${editingPathId}` : 'path:create')
                ? 'Salvando...'
                : editingPathId
                  ? 'Salvar trilha'
                  : 'Adicionar trilha'}
            </button>
            {editingPathId ? (
              <button type="button" className={buttonClassName(darkMode, 'secondary')} onClick={resetPathForm}>
                Cancelar edicao
              </button>
            ) : null}
          </div>
        </div>

        <div className={`mt-5 border-t pt-5 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Trilhas atuais
          </p>
          {paths.length > 0 ? (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input
                  className={inputClassName(darkMode)}
                  placeholder="Buscar trilha na lista"
                  value={listFilters.pathQuery}
                  onChange={(event) => updateListFilter('pathQuery', event.target.value)}
                />
                <select
                  className={inputClassName(darkMode)}
                  value={listFilters.pathStatus}
                  onChange={(event) => updateListFilter('pathStatus', event.target.value as OutrosListFiltersState['pathStatus'])}
                >
                  <option value="all">Todos os status</option>
                  <option value="ativa">Em progresso</option>
                  <option value="pausada">Em pausa</option>
                  <option value="concluida">Concluidas</option>
                </select>
                <select
                  className={inputClassName(darkMode)}
                  value={listFilters.pathTopicId}
                  onChange={(event) => updateListFilter('pathTopicId', event.target.value)}
                >
                  <option value="all">Todos os temas</option>
                  {sortedTopics.map((topic) => (
                    <option key={`path-filter-${topic.id}`} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className={filterSummaryClassName(darkMode)}>
                  {filteredPaths.length} de {paths.length} visiveis - foco atual continua priorizado quando entra no recorte.
                </p>
                {hasPathFilters ? (
                  <button
                    type="button"
                    className={filterClearButtonClassName(darkMode)}
                    onClick={clearPathFilters}
                  >
                    Limpar filtros
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
          <div className="mt-3 space-y-4">
            {paths.length === 0 ? (
              <GuidedEmptyStateCard
                darkMode={darkMode}
                icon={MapIcon}
                eyebrow={topics.length === 0 ? 'Dependencia de base' : 'Trilha ativa'}
                title={topics.length === 0 ? 'Crie um tema antes da primeira trilha' : 'Nenhuma trilha montada ainda'}
                description={
                  topics.length === 0
                    ? 'A trilha precisa de um tema para nascer com contexto. Depois disso, voce ja consegue abrir os primeiros passos.'
                    : 'Monte uma trilha simples com 2 ou 3 passos para o shell mostrar progresso de verdade.'
                }
                hint={
                  topics.length === 0
                    ? 'Tema primeiro, trilha logo depois.'
                    : 'Titulo claro e passos curtos ja bastam para sair do vazio.'
                }
                primaryActionLabel={topics.length === 0 ? 'Adicionar tema' : 'Adicionar trilha'}
                onPrimaryAction={topics.length === 0 ? focusTopicSetup : focusPathSetup}
              />
            ) : filteredPaths.length > 0 ? (
              groupedPaths.map((group) => (
                <OutrosListGroup
                  key={group.id}
                  darkMode={darkMode}
                  title={group.title}
                  helper={group.helper}
                  items={group.items}
                  collapsible={group.collapsible}
                  defaultOpen={group.defaultOpen}
                >
                  {group.items.map((path) => (
                    <article key={path.id} className={interactiveItemCardClassName(darkMode)}>
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          className={itemPrimaryActionClassName(darkMode)}
                          aria-label={`Abrir trilha ${path.title} para edicao`}
                          onClick={() => openPathEditor(path)}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-2">
                              {nextStep?.pathId === path.id && path.status !== 'concluida' ? (
                                <span className={emphasisPillClassName(darkMode)}>Foco atual</span>
                              ) : null}
                      <h4 className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {path.title}
                      </h4>
                      <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {topicNameById.get(path.topicId) || 'Sem tema'} · {path.progressPercent}% concluido
                      </p>
                        </div>
                        <span className={badgeClassName(darkMode)}>{PATH_STATUS_LABELS[path.status]}</span>
                      </div>
                    </button>
                    <ItemActionMenu
                      darkMode={darkMode}
                      itemLabel={path.title}
                      actions={[
                        {
                          label: 'Editar',
                          onSelect: () => openPathEditor(path),
                        },
                        {
                          label: 'Excluir',
                          destructive: true,
                          onSelect: () =>
                            setPendingDelete({
                              kind: 'path',
                              id: path.id,
                              title: path.title,
                              message: `Excluir ${path.title}? Os passos ligados a essa trilha saem junto.`,
                              actionKey: `path:delete:${path.id}`,
                              successMessage: 'Trilha removida com sucesso.',
                            }),
                        },
                      ]}
                        />
                      </div>
                    </article>
                  ))}
                </OutrosListGroup>
              ))
            ) : (
              <GuidedEmptyStateCard
                darkMode={darkMode}
                icon={MapIcon}
                eyebrow="Filtros ativos"
                title="Nenhuma trilha bate com esse recorte"
                description="Ajuste busca, status ou tema para voltar a ver a continuidade do dominio sem perder o foco atual."
                hint="Limpar os filtros traz de volta todas as trilhas desta secao."
                primaryActionLabel="Limpar filtros"
                onPrimaryAction={clearPathFilters}
              />
            )}
          </div>
        </div>
      </article>
    </>
  );

  const stepAndEventSection = (
    <>
      <article className={panelClassName(darkMode)}>
        <p className={labelClassName(darkMode)}>Passo da trilha</p>
        <h3 className={`mt-2 text-lg font-black tracking-[-0.03em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
          {editingStepId ? 'Editar passo' : 'Selecione um passo para editar'}
        </h3>
        <p className={helperCopyClassName(darkMode)}>
          Aqui entram edicao, conclusao e exclusao do passo. A criacao inicial continua vindo pela trilha.
        </p>

        <div className="mt-4 space-y-3">
          <select
            className={inputClassName(darkMode)}
            value={stepForm.pathId}
            onChange={(event) => setStepForm((current) => ({ ...current, pathId: event.target.value }))}
          >
            <option value="">Trilha do passo</option>
            {sortedPaths.map((path) => (
              <option key={path.id} value={path.id}>
                {path.title}
              </option>
            ))}
          </select>
          <input
            ref={stepTitleInputRef}
            className={inputClassName(darkMode)}
            placeholder="Titulo do passo"
            value={stepForm.title}
            onChange={(event) => setStepForm((current) => ({ ...current, title: event.target.value }))}
            disabled={!editingStepId}
          />
          <textarea
            className={textareaClassName(darkMode)}
            placeholder="Descricao opcional do passo"
            value={stepForm.description}
            onChange={(event) => setStepForm((current) => ({ ...current, description: event.target.value }))}
            disabled={!editingStepId}
          />
          <select
            className={inputClassName(darkMode)}
            value={stepForm.status}
            onChange={(event) => setStepForm((current) => ({ ...current, status: event.target.value as StepFormState['status'] }))}
            disabled={!editingStepId}
          >
            <option value="nao_iniciado">Nao iniciado</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluido</option>
          </select>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonClassName(darkMode)}
              onClick={() =>
                void runAction(
                  `step:update:${editingStepId || 'idle'}`,
                  async () => {
                    if (!editingStepId) {
                      throw new Error('Escolha um passo da lista para editar.');
                    }
                    if (!stepForm.title.trim()) {
                      throw new Error('Informe o titulo do passo.');
                    }

                    await outrosDomainService.updatePathStep(userId!, editingStepId, {
                      title: stepForm.title,
                      description: stepForm.description,
                      status: stepForm.status,
                    });

                    resetStepForm();
                  },
                  'Passo atualizado com sucesso.',
                )
              }
              disabled={!editingStepId || busyAction === `step:update:${editingStepId || 'idle'}`}
            >
              {busyAction === `step:update:${editingStepId || 'idle'}` ? 'Salvando...' : 'Salvar passo'}
            </button>
            {editingStepId ? (
              <button type="button" className={buttonClassName(darkMode, 'secondary')} onClick={resetStepForm}>
                Cancelar edicao
              </button>
            ) : null}
          </div>
        </div>

        <div className={`mt-5 border-t pt-5 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Passos atuais
          </p>
          {steps.length > 0 ? (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input
                  className={inputClassName(darkMode)}
                  placeholder="Buscar passo na lista"
                  value={listFilters.stepQuery}
                  onChange={(event) => updateListFilter('stepQuery', event.target.value)}
                />
                <select
                  className={inputClassName(darkMode)}
                  value={listFilters.stepStatus}
                  onChange={(event) => updateListFilter('stepStatus', event.target.value as OutrosListFiltersState['stepStatus'])}
                >
                  <option value="all">Todos os estados</option>
                  <option value="next">Proximo passo</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="nao_iniciado">Nao iniciados</option>
                  <option value="concluido">Concluidos</option>
                </select>
                <select
                  className={inputClassName(darkMode)}
                  value={listFilters.stepPathId}
                  onChange={(event) => updateListFilter('stepPathId', event.target.value)}
                >
                  <option value="all">Todas as trilhas</option>
                  {sortedPaths.map((path) => (
                    <option key={`step-filter-${path.id}`} value={path.id}>
                      {path.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className={filterSummaryClassName(darkMode)}>
                  {filteredSteps.length} de {steps.length} visiveis - proximo passo continua destacado quando entra no recorte.
                </p>
                {hasStepFilters ? (
                  <button
                    type="button"
                    className={filterClearButtonClassName(darkMode)}
                    onClick={clearStepFilters}
                  >
                    Limpar filtros
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
          <div className="mt-3 space-y-4">
            {steps.length === 0 ? (
              <GuidedEmptyStateCard
                darkMode={darkMode}
                icon={CheckSquare}
                eyebrow={paths.length === 0 ? 'Primeira trilha' : 'Proximo passo'}
                title={paths.length === 0 ? 'Sem trilha, sem passos' : 'Sua trilha ainda nao tem passos ativos'}
                description={
                  paths.length === 0
                    ? 'Os passos nascem junto da trilha. Crie uma trilha simples para liberar edicao, conclusao e progresso.'
                    : 'Adicione uma trilha com passos iniciais para o shell saber o que vem agora.'
                }
                hint={
                  paths.length === 0
                    ? 'Dois ou tres passos curtos ja bastam para validar o fluxo completo.'
                    : 'Passos objetivos deixam a progressao mais clara e menos pesada.'
                }
                primaryActionLabel="Adicionar trilha"
                onPrimaryAction={focusPathSetup}
              />
            ) : filteredSteps.length > 0 ? (
              groupedSteps.map((group) => (
                <OutrosListGroup
                  key={group.id}
                  darkMode={darkMode}
                  title={group.title}
                  helper={group.helper}
                  items={group.items}
                  collapsible={group.collapsible}
                  defaultOpen={group.defaultOpen}
                >
                  {group.items.map((step) => (
                    <article
                      key={step.id}
                      className={`${interactiveItemCardClassName(darkMode)} ${
                        step.status === 'concluido' ? (darkMode ? 'opacity-80' : 'opacity-85') : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          className={itemPrimaryActionClassName(darkMode)}
                          aria-label={`Abrir passo ${step.title} para edicao`}
                          onClick={() => openStepEditor(step)}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          {nextStep?.id === step.id && step.status !== 'concluido' ? (
                            <span className={emphasisPillClassName(darkMode)}>Proximo</span>
                          ) : null}
                      <h4 className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {step.title}
                      </h4>
                      <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {step.description || 'Sem descricao adicional.'}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {pathTitleById.get(step.pathId) || 'Trilha'} · Etapa {step.stepOrder}
                      </p>
                        </div>
                        <span className={badgeClassName(darkMode)}>{STEP_STATUS_LABELS[step.status]}</span>
                      </div>
                    </button>
                    <ItemActionMenu
                      darkMode={darkMode}
                      itemLabel={step.title}
                      actions={[
                        {
                          label: 'Editar',
                          onSelect: () => openStepEditor(step),
                        },
                        {
                          label: step.status === 'concluido' ? 'Reabrir passo' : 'Concluir passo',
                          onSelect: () => handleStepStatusAction(step),
                        },
                        {
                          label: 'Excluir',
                          destructive: true,
                          onSelect: () =>
                            setPendingDelete({
                              kind: 'step',
                              id: step.id,
                              title: step.title,
                              message: `Excluir ${step.title}?`,
                              actionKey: `step:delete:${step.id}`,
                              successMessage: 'Passo removido com sucesso.',
                            }),
                        },
                      ]}
                        />
                      </div>
                    </article>
                  ))}
                </OutrosListGroup>
              ))
            ) : (
              <GuidedEmptyStateCard
                darkMode={darkMode}
                icon={CheckSquare}
                eyebrow="Filtros ativos"
                title="Nenhum passo bate com esse recorte"
                description="Ajuste busca, estado ou trilha para voltar a enxergar o que esta em progresso e o que vem depois."
                hint="Limpar os filtros traz de volta toda a fila da trilha."
                primaryActionLabel="Limpar filtros"
                onPrimaryAction={clearStepFilters}
              />
            )}
          </div>
        </div>
      </article>

      <article className={panelClassName(darkMode)}>
        <p className={labelClassName(darkMode)}>Evento leve</p>
        <h3 className={`mt-2 text-lg font-black tracking-[-0.03em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
          {editingEventId ? 'Editar evento' : 'Novo evento'}
        </h3>
        <p className={helperCopyClassName(darkMode)}>
          O calendario leve agora cobre create, edit e delete com tipo, data e status persistidos.
        </p>

        <div className="mt-4 space-y-3">
          <select
            className={inputClassName(darkMode)}
            value={eventForm.topicId}
            onChange={(event) => setEventForm((current) => ({ ...current, topicId: event.target.value }))}
          >
            <option value="">Evento sem tema especifico</option>
            {sortedTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
          <input
            ref={eventTitleInputRef}
            className={inputClassName(darkMode)}
            placeholder="Titulo do evento"
            value={eventForm.title}
            onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))}
          />
          <select
            className={inputClassName(darkMode)}
            value={eventForm.type}
            onChange={(event) => setEventForm((current) => ({ ...current, type: event.target.value as EventFormState['type'] }))}
          >
            <option value="meta">Meta</option>
            <option value="estudo">Estudo</option>
            <option value="revisao">Revisao</option>
          </select>
          <input
            className={inputClassName(darkMode)}
            type="datetime-local"
            value={eventForm.startAt}
            onChange={(event) => setEventForm((current) => ({ ...current, startAt: event.target.value }))}
          />
          <input
            className={inputClassName(darkMode)}
            type="datetime-local"
            value={eventForm.endAt}
            onChange={(event) => setEventForm((current) => ({ ...current, endAt: event.target.value }))}
          />
          <select
            className={inputClassName(darkMode)}
            value={eventForm.status}
            onChange={(event) => setEventForm((current) => ({ ...current, status: event.target.value as EventFormState['status'] }))}
          >
            <option value="pendente">Pendente</option>
            <option value="concluido">Concluido</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonClassName(darkMode)}
              onClick={() =>
                void runAction(
                  editingEventId ? `event:update:${editingEventId}` : 'event:create',
                  async () => {
                    if (!eventForm.title.trim() || !eventForm.startAt) {
                      throw new Error('Preencha titulo e data inicial do evento.');
                    }

                    if (editingEventId) {
                      await outrosDomainService.updateGoalEvent(userId!, editingEventId, {
                        topicId: eventForm.topicId || null,
                        title: eventForm.title,
                        type: eventForm.type,
                        startAt: eventForm.startAt,
                        endAt: eventForm.endAt || null,
                        status: eventForm.status,
                      });
                    } else {
                      await outrosDomainService.createGoalEvent(userId!, {
                        topicId: eventForm.topicId || null,
                        title: eventForm.title,
                        type: eventForm.type,
                        startAt: eventForm.startAt,
                        endAt: eventForm.endAt || null,
                      });
                    }

                    resetEventForm();
                  },
                  editingEventId ? 'Evento atualizado com sucesso.' : 'Evento criado com sucesso.',
                )
              }
              disabled={busyAction === (editingEventId ? `event:update:${editingEventId}` : 'event:create')}
            >
              {busyAction === (editingEventId ? `event:update:${editingEventId}` : 'event:create')
                ? 'Salvando...'
                : editingEventId
                  ? 'Salvar evento'
                  : 'Adicionar evento'}
            </button>
            {editingEventId ? (
              <button type="button" className={buttonClassName(darkMode, 'secondary')} onClick={resetEventForm}>
                Cancelar edicao
              </button>
            ) : null}
          </div>
        </div>

        <div className={`mt-5 border-t pt-5 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Eventos atuais
          </p>
          {events.length > 0 ? (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input
                  className={inputClassName(darkMode)}
                  placeholder="Buscar evento na lista"
                  value={listFilters.eventQuery}
                  onChange={(event) => updateListFilter('eventQuery', event.target.value)}
                />
                <select
                  className={inputClassName(darkMode)}
                  value={listFilters.eventStatus}
                  onChange={(event) => updateListFilter('eventStatus', event.target.value as OutrosListFiltersState['eventStatus'])}
                >
                  <option value="all">Todos os status</option>
                  <option value="pendente">Pendentes</option>
                  <option value="concluido">Concluidos</option>
                  <option value="cancelado">Cancelados</option>
                </select>
                <select
                  className={inputClassName(darkMode)}
                  value={listFilters.eventTopicId}
                  onChange={(event) => updateListFilter('eventTopicId', event.target.value)}
                >
                  <option value="all">Todos os temas</option>
                  <option value="unlinked">Sem tema</option>
                  {sortedTopics.map((topic) => (
                    <option key={`event-filter-${topic.id}`} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className={filterSummaryClassName(darkMode)}>
                  {filteredEvents.length} de {events.length} visiveis - apoio e historico seguem separados.
                </p>
                {hasEventFilters ? (
                  <button
                    type="button"
                    className={filterClearButtonClassName(darkMode)}
                    onClick={clearEventFilters}
                  >
                    Limpar filtros
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
          <div className="mt-3 space-y-4">
            {events.length === 0 ? (
              <GuidedEmptyStateCard
                darkMode={darkMode}
                icon={CalendarDays}
                eyebrow="Calendario leve"
                title="Nenhum evento no radar"
                description="Crie uma meta, sessao de estudo ou revisao para o modo livre ganhar ritmo visivel no calendario."
                hint="Evento pode ficar sem tema especifico, entao esse e um bom jeito de comecar rapido."
                primaryActionLabel="Adicionar evento"
                onPrimaryAction={focusEventSetup}
                secondaryActionLabel={isFirstOutrosSetup ? 'Popular com demo' : undefined}
                onSecondaryAction={isFirstOutrosSetup ? handleSeedDemo : undefined}
              />
            ) : filteredEvents.length > 0 ? (
              groupedEvents.map((group) => (
                <OutrosListGroup
                  key={group.id}
                  darkMode={darkMode}
                  title={group.title}
                  helper={group.helper}
                  items={group.items}
                  collapsible={group.collapsible}
                  defaultOpen={group.defaultOpen}
                >
                  {group.items.map((event) => (
                    <article key={event.id} className={interactiveItemCardClassName(darkMode)}>
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          className={itemPrimaryActionClassName(darkMode)}
                          aria-label={`Abrir evento ${event.title} para edicao`}
                          onClick={() => openEventEditor(event)}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-2">
                      <h4 className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {event.title}
                      </h4>
                      <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {formatDateTimeLabel(event.startAt)}
                        {event.endAt ? ` → ${formatDateTimeLabel(event.endAt)}` : ''}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {event.topicName || 'Sem tema'} · {EVENT_TYPE_LABELS[event.type]}
                      </p>
                        </div>
                        <span className={badgeClassName(darkMode)}>{EVENT_STATUS_LABELS[event.status]}</span>
                      </div>
                    </button>
                    <ItemActionMenu
                      darkMode={darkMode}
                      itemLabel={event.title}
                      actions={[
                        {
                          label: 'Editar',
                          onSelect: () => openEventEditor(event),
                        },
                        {
                          label: 'Excluir',
                          destructive: true,
                          onSelect: () =>
                            setPendingDelete({
                              kind: 'event',
                              id: event.id,
                              title: event.title,
                              message: `Excluir ${event.title}?`,
                              actionKey: `event:delete:${event.id}`,
                              successMessage: 'Evento removido com sucesso.',
                            }),
                        },
                      ]}
                        />
                      </div>
                    </article>
                  ))}
                </OutrosListGroup>
              ))
            ) : (
              <GuidedEmptyStateCard
                darkMode={darkMode}
                icon={CalendarDays}
                eyebrow="Filtros ativos"
                title="Nenhum evento bate com esse recorte"
                description="Ajuste busca, status ou tema para voltar a enxergar os apoios do calendario sem baguncar o historico."
                hint="Limpar os filtros devolve o panorama inteiro desta secao."
                primaryActionLabel="Limpar filtros"
                onPrimaryAction={clearEventFilters}
              />
            )}
          </div>
        </div>
      </article>
    </>
  );

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-2">
        {activationAndTopicSection}
        {goalAndPathSection}
        {stepAndEventSection}
      </section>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={pendingDelete ? `Excluir ${pendingDelete.title}?` : 'Excluir item?'}
        message={pendingDelete?.message || 'Essa acao remove o item selecionado do dominio.'}
        impact="Essa acao nao pode ser desfeita."
        confirmLabel="Excluir agora"
        cancelLabel="Cancelar"
        variant="danger"
        confirmLoading={busyAction === pendingDelete?.actionKey}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
};

export default OutrosActivationPanel;
