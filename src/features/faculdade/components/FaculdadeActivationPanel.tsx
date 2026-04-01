import React from 'react';
import { BookOpen, CalendarDays, ChevronDown, ClipboardList, FileText, Sparkles } from 'lucide-react';

import { ConfirmModal } from '../../../components/UI/ConfirmModal';
import { GuidedEmptyStateCard } from '../../../components/UI/GuidedEmptyStateCard';
import { ItemActionMenu } from '../../../components/UI/ItemActionMenu';
import { PanelActionFeedback } from '../../../components/UI/PanelActionFeedback';
import { usePanelActionFeedback } from '../../../hooks/usePanelActionFeedback';
import { faculdadeDomainService } from '../../../services/faculdadeDomain.service';
import type {
  AcademicAssignmentSummary,
  AcademicCalendarEventSummary,
  AcademicExamSummary,
  AcademicSubjectSummary,
  FaculdadeDashboardData,
} from '../../../services/faculdadeDashboard.service';

interface FaculdadeActivationPanelProps {
  darkMode?: boolean;
  userId?: string | null;
  dashboard: FaculdadeDashboardData | null;
  onRefresh: () => Promise<void>;
}

type SubjectFormState = {
  name: string;
  professorName: string;
  workloadHours: string;
  status: 'ativa' | 'concluida' | 'trancada';
};

type ExamFormState = {
  subjectId: string;
  title: string;
  date: string;
  weight: string;
  status: 'pendente' | 'concluida';
  notes: string;
};

type AssignmentFormState = {
  subjectId: string;
  title: string;
  dueDate: string;
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'nao_iniciado' | 'em_andamento' | 'entregue';
  description: string;
};

type EventFormState = {
  subjectId: string;
  title: string;
  type: 'prova' | 'entrega' | 'aula_importante' | 'estudo' | 'meta';
  startAt: string;
  endAt: string;
  status: 'pendente' | 'concluido' | 'cancelado';
  details: string;
};

type DeleteTarget = {
  kind: 'subject' | 'exam' | 'assignment' | 'event';
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

type FaculdadeListFiltersState = {
  subjectQuery: string;
  subjectStatus: 'all' | SubjectFormState['status'];
  examQuery: string;
  examStatus: 'all' | ExamFormState['status'];
  examSubjectId: 'all' | string;
  assignmentQuery: string;
  assignmentStatus: 'all' | AssignmentFormState['status'];
  assignmentSubjectId: 'all' | string;
  eventQuery: string;
  eventStatus: 'all' | EventFormState['status'];
  eventSubjectId: 'all' | string;
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const emptySubjectForm = (): SubjectFormState => ({
  name: '',
  professorName: '',
  workloadHours: '',
  status: 'ativa',
});

const emptyExamForm = (): ExamFormState => ({
  subjectId: '',
  title: '',
  date: '',
  weight: '',
  status: 'pendente',
  notes: '',
});

const emptyAssignmentForm = (): AssignmentFormState => ({
  subjectId: '',
  title: '',
  dueDate: '',
  priority: 'media',
  status: 'nao_iniciado',
  description: '',
});

const emptyEventForm = (): EventFormState => ({
  subjectId: '',
  title: '',
  type: 'estudo',
  startAt: '',
  endAt: '',
  status: 'pendente',
  details: '',
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

const SUBJECT_STATUS_PRIORITY: Record<SubjectFormState['status'], number> = {
  ativa: 0,
  concluida: 1,
  trancada: 2,
};

const EXAM_STATUS_PRIORITY: Record<ExamFormState['status'], number> = {
  pendente: 0,
  concluida: 1,
};

const ASSIGNMENT_STATUS_PRIORITY: Record<AssignmentFormState['status'], number> = {
  em_andamento: 0,
  nao_iniciado: 1,
  entregue: 2,
};

const ASSIGNMENT_PRIORITY_ORDER: Record<AssignmentFormState['priority'], number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baixa: 3,
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

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getDayDistanceFromToday = (value?: string | null): number => {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return Number.MAX_SAFE_INTEGER;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(parsed);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / DAY_IN_MS);
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

const FaculdadeListGroup = <T,>({
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

const parseOptionalNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = Number(trimmed.replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : null;
};

const buildSubjectForm = (subject: AcademicSubjectSummary): SubjectFormState => ({
  name: subject.name,
  professorName: subject.professorName || '',
  workloadHours: subject.workloadHours ? String(subject.workloadHours) : '',
  status: subject.status,
});

const buildExamForm = (exam: AcademicExamSummary): ExamFormState => ({
  subjectId: exam.subjectId,
  title: exam.title,
  date: toDateTimeLocalValue(exam.date),
  weight: exam.weight ? String(exam.weight) : '',
  status: exam.status,
  notes: exam.notes || '',
});

const buildAssignmentForm = (assignment: AcademicAssignmentSummary): AssignmentFormState => ({
  subjectId: assignment.subjectId,
  title: assignment.title,
  dueDate: toDateTimeLocalValue(assignment.dueDate),
  priority: assignment.priority || 'media',
  status: assignment.status,
  description: assignment.description || '',
});

const buildEventForm = (event: AcademicCalendarEventSummary): EventFormState => ({
  subjectId: event.subjectId || '',
  title: event.title,
  type: event.type,
  startAt: toDateTimeLocalValue(event.startAt),
  endAt: toDateTimeLocalValue(event.endAt),
  status: event.status,
  details: event.details || '',
});

export const FaculdadeActivationPanel: React.FC<FaculdadeActivationPanelProps> = ({
  darkMode = false,
  userId,
  dashboard,
  onRefresh,
}) => {
  const subjects = dashboard?.subjects || [];
  const exams = dashboard?.exams || [];
  const assignments = dashboard?.assignments || [];
  const events = dashboard?.events || [];
  const [listFilters, setListFilters] = React.useState<FaculdadeListFiltersState>({
    subjectQuery: '',
    subjectStatus: 'all',
    examQuery: '',
    examStatus: 'all',
    examSubjectId: 'all',
    assignmentQuery: '',
    assignmentStatus: 'all',
    assignmentSubjectId: 'all',
    eventQuery: '',
    eventStatus: 'all',
    eventSubjectId: 'all',
  });
  const deferredListFilters = React.useDeferredValue(listFilters);
  const sortedSubjects = React.useMemo(
    () =>
      [...subjects].sort(
        (left, right) =>
          SUBJECT_STATUS_PRIORITY[left.status] - SUBJECT_STATUS_PRIORITY[right.status]
          || compareText(left.name, right.name),
      ),
    [subjects],
  );
  const sortedExams = React.useMemo(
    () =>
      [...exams].sort(
        (left, right) =>
          EXAM_STATUS_PRIORITY[left.status] - EXAM_STATUS_PRIORITY[right.status]
          || toSortableTimestamp(left.date) - toSortableTimestamp(right.date)
          || compareText(left.title, right.title),
      ),
    [exams],
  );
  const sortedAssignments = React.useMemo(
    () =>
      [...assignments].sort(
        (left, right) =>
          ASSIGNMENT_STATUS_PRIORITY[left.status] - ASSIGNMENT_STATUS_PRIORITY[right.status]
          || toSortableTimestamp(left.dueDate) - toSortableTimestamp(right.dueDate)
          || ASSIGNMENT_PRIORITY_ORDER[left.priority || 'media'] - ASSIGNMENT_PRIORITY_ORDER[right.priority || 'media']
          || compareText(left.title, right.title),
      ),
    [assignments],
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
  const filteredSubjects = React.useMemo(
    () =>
      sortedSubjects.filter((subject) =>
        (deferredListFilters.subjectStatus === 'all' || subject.status === deferredListFilters.subjectStatus)
        && matchesSearchQuery(deferredListFilters.subjectQuery, subject.name, subject.professorName),
      ),
    [deferredListFilters.subjectQuery, deferredListFilters.subjectStatus, sortedSubjects],
  );
  const filteredExams = React.useMemo(
    () =>
      sortedExams.filter((exam) =>
        (deferredListFilters.examStatus === 'all' || exam.status === deferredListFilters.examStatus)
        && (deferredListFilters.examSubjectId === 'all' || exam.subjectId === deferredListFilters.examSubjectId)
        && matchesSearchQuery(deferredListFilters.examQuery, exam.title, exam.subjectName, exam.notes),
      ),
    [
      deferredListFilters.examQuery,
      deferredListFilters.examStatus,
      deferredListFilters.examSubjectId,
      sortedExams,
    ],
  );
  const filteredAssignments = React.useMemo(
    () =>
      sortedAssignments.filter((assignment) =>
        (deferredListFilters.assignmentStatus === 'all' || assignment.status === deferredListFilters.assignmentStatus)
        && (
          deferredListFilters.assignmentSubjectId === 'all'
          || assignment.subjectId === deferredListFilters.assignmentSubjectId
        )
        && matchesSearchQuery(
          deferredListFilters.assignmentQuery,
          assignment.title,
          assignment.subjectName,
          assignment.description,
        ),
      ),
    [
      deferredListFilters.assignmentQuery,
      deferredListFilters.assignmentStatus,
      deferredListFilters.assignmentSubjectId,
      sortedAssignments,
    ],
  );
  const filteredEvents = React.useMemo(
    () =>
      sortedEvents.filter((event) =>
        (deferredListFilters.eventStatus === 'all' || event.status === deferredListFilters.eventStatus)
        && (
          deferredListFilters.eventSubjectId === 'all'
          || (deferredListFilters.eventSubjectId === 'unlinked' && !event.subjectId)
          || event.subjectId === deferredListFilters.eventSubjectId
        )
        && matchesSearchQuery(
          deferredListFilters.eventQuery,
          event.title,
          event.subjectName,
          event.type,
          event.details,
        ),
      ),
    [
      deferredListFilters.eventQuery,
      deferredListFilters.eventStatus,
      deferredListFilters.eventSubjectId,
      sortedEvents,
    ],
  );
  const groupedSubjects = React.useMemo<GroupedListSection<AcademicSubjectSummary>[]>(() => {
    const active = filteredSubjects.filter((subject) => subject.status === 'ativa');
    const completed = filteredSubjects.filter((subject) => subject.status === 'concluida');
    const paused = filteredSubjects.filter((subject) => subject.status === 'trancada');

    return [
      {
        id: 'subjects-active',
        title: 'Ativas agora',
        helper: 'Base principal do semestre e ponto de partida para prova, trabalho e calendario.',
        items: active,
      },
      {
        id: 'subjects-completed',
        title: 'Concluidas',
        helper: 'Historico ja resolvido, recolhido para reduzir ruido visual.',
        items: completed,
        collapsible: true,
        defaultOpen: false,
      },
      {
        id: 'subjects-paused',
        title: 'Trancadas',
        helper: 'Materias fora da rotina atual, mantidas separadas para nao poluir a leitura.',
        items: paused,
        collapsible: true,
        defaultOpen: false,
      },
    ].filter((group) => group.items.length > 0);
  }, [filteredSubjects]);
  const groupedExams = React.useMemo<GroupedListSection<AcademicExamSummary>[]>(() => {
    const urgent = filteredExams.filter((exam) => exam.status !== 'concluida' && getDayDistanceFromToday(exam.date) <= 3);
    const thisWeek = filteredExams.filter((exam) => {
      const dayDistance = getDayDistanceFromToday(exam.date);
      return exam.status !== 'concluida' && dayDistance > 3 && dayDistance <= 7;
    });
    const upcoming = filteredExams.filter((exam) => exam.status !== 'concluida' && getDayDistanceFromToday(exam.date) > 7);
    const completed = filteredExams.filter((exam) => exam.status === 'concluida');

    return [
      {
        id: 'exams-urgent',
        title: 'Urgentes',
        helper: 'Vencidas ou chegando nos proximos 3 dias.',
        items: urgent,
      },
      {
        id: 'exams-week',
        title: 'Esta semana',
        helper: 'Ainda exigem preparo imediato, mas sem competir com o que vence agora.',
        items: thisWeek,
      },
      {
        id: 'exams-upcoming',
        title: 'Proximas',
        helper: 'Futuras o bastante para planejamento, sem virar ruido na leitura do dia.',
        items: upcoming,
      },
      {
        id: 'exams-completed',
        title: 'Concluidas',
        helper: 'Mantidas recolhidas para consulta rapida sem roubar atencao.',
        items: completed,
        collapsible: true,
        defaultOpen: false,
      },
    ].filter((group) => group.items.length > 0);
  }, [filteredExams]);
  const groupedAssignments = React.useMemo<GroupedListSection<AcademicAssignmentSummary>[]>(() => {
    const urgent = filteredAssignments.filter((assignment) => {
      if (assignment.status === 'entregue') {
        return false;
      }

      const dayDistance = getDayDistanceFromToday(assignment.dueDate);
      return dayDistance <= 3 || assignment.priority === 'critica';
    });
    const thisWeek = filteredAssignments.filter((assignment) => {
      if (assignment.status === 'entregue') {
        return false;
      }

      const dayDistance = getDayDistanceFromToday(assignment.dueDate);
      return dayDistance > 3 && dayDistance <= 7 && assignment.priority !== 'critica';
    });
    const upcoming = filteredAssignments.filter((assignment) => assignment.status !== 'entregue' && getDayDistanceFromToday(assignment.dueDate) > 7);
    const completed = filteredAssignments.filter((assignment) => assignment.status === 'entregue');

    return [
      {
        id: 'assignments-urgent',
        title: 'Urgentes',
        helper: 'Entregas criticas, atrasadas ou nos proximos 3 dias.',
        items: urgent,
      },
      {
        id: 'assignments-week',
        title: 'Esta semana',
        helper: 'Prazo curto o bastante para ficar no radar sem lotar o topo.',
        items: thisWeek,
      },
      {
        id: 'assignments-upcoming',
        title: 'Proximos',
        helper: 'Entregas futuras para organizar com calma.',
        items: upcoming,
      },
      {
        id: 'assignments-completed',
        title: 'Concluidos',
        helper: 'Historico de entregas resolvidas, recolhido por padrao.',
        items: completed,
        collapsible: true,
        defaultOpen: false,
      },
    ].filter((group) => group.items.length > 0);
  }, [filteredAssignments]);
  const groupedEvents = React.useMemo<GroupedListSection<AcademicCalendarEventSummary>[]>(() => {
    const urgent = filteredEvents.filter((event) => event.status === 'pendente' && getDayDistanceFromToday(event.startAt) <= 3);
    const thisWeek = filteredEvents.filter((event) => {
      const dayDistance = getDayDistanceFromToday(event.startAt);
      return event.status === 'pendente' && dayDistance > 3 && dayDistance <= 7;
    });
    const upcoming = filteredEvents.filter((event) => event.status === 'pendente' && getDayDistanceFromToday(event.startAt) > 7);
    const finished = filteredEvents.filter((event) => event.status !== 'pendente');

    return [
      {
        id: 'events-urgent',
        title: 'Urgentes',
        helper: 'Aulas, metas e marcos dos proximos 3 dias.',
        items: urgent,
      },
      {
        id: 'events-week',
        title: 'Esta semana',
        helper: 'Compromissos que ainda batem no planejamento imediato.',
        items: thisWeek,
      },
      {
        id: 'events-upcoming',
        title: 'Proximos',
        helper: 'Calendario mais distante, separado para facilitar a leitura.',
        items: upcoming,
      },
      {
        id: 'events-finished',
        title: 'Concluidos e cancelados',
        helper: 'Eventos ja encerrados, recolhidos para deixar a agenda mais limpa.',
        items: finished,
        collapsible: true,
        defaultOpen: false,
      },
    ].filter((group) => group.items.length > 0);
  }, [filteredEvents]);

  const { busyAction, feedback, retryLastAction, runAction } = usePanelActionFeedback({
    userId,
    onRefresh,
    loginErrorMessage: 'Faca login para editar o modo faculdade.',
  });
  const [pendingDelete, setPendingDelete] = React.useState<DeleteTarget | null>(null);

  const [editingSubjectId, setEditingSubjectId] = React.useState<string | null>(null);
  const [subjectForm, setSubjectForm] = React.useState<SubjectFormState>(emptySubjectForm);

  const [editingExamId, setEditingExamId] = React.useState<string | null>(null);
  const [examForm, setExamForm] = React.useState<ExamFormState>(emptyExamForm);

  const [editingAssignmentId, setEditingAssignmentId] = React.useState<string | null>(null);
  const [assignmentForm, setAssignmentForm] = React.useState<AssignmentFormState>(emptyAssignmentForm);

  const [editingEventId, setEditingEventId] = React.useState<string | null>(null);
  const [eventForm, setEventForm] = React.useState<EventFormState>(emptyEventForm);

  const subjectNameInputRef = React.useRef<HTMLInputElement | null>(null);
  const examTitleInputRef = React.useRef<HTMLInputElement | null>(null);
  const assignmentTitleInputRef = React.useRef<HTMLInputElement | null>(null);
  const eventTitleInputRef = React.useRef<HTMLInputElement | null>(null);

  const resetSubjectForm = React.useCallback(() => {
    setEditingSubjectId(null);
    setSubjectForm(emptySubjectForm());
  }, []);

  const resetExamForm = React.useCallback(() => {
    setEditingExamId(null);
    setExamForm(emptyExamForm());
  }, []);

  const resetAssignmentForm = React.useCallback(() => {
    setEditingAssignmentId(null);
    setAssignmentForm(emptyAssignmentForm());
  }, []);

  const resetEventForm = React.useCallback(() => {
    setEditingEventId(null);
    setEventForm(emptyEventForm());
  }, []);

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
      () => faculdadeDomainService.seedDemoData(userId!),
      'Dados demo de faculdade prontos.',
      {
        loadingTitle: 'Populando faculdade com dados demo...',
        loadingDetail: 'Criando disciplinas, provas, trabalhos e eventos de exemplo.',
        errorTitle: 'Nao foi possivel popular os dados demo de faculdade.',
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
        loadingDetail: 'Buscando os dados mais recentes do shell academico.',
        successDetail: 'As listas e prioridades agora refletem o estado atual.',
        errorTitle: 'Nao foi possivel atualizar o snapshot.',
      },
    );
  }, [runAction]);

  const updateListFilter = React.useCallback(
    <K extends keyof FaculdadeListFiltersState>(key: K, value: FaculdadeListFiltersState[K]) => {
      setListFilters((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const clearSubjectFilters = React.useCallback(() => {
    setListFilters((current) => ({
      ...current,
      subjectQuery: '',
      subjectStatus: 'all',
    }));
  }, []);

  const clearExamFilters = React.useCallback(() => {
    setListFilters((current) => ({
      ...current,
      examQuery: '',
      examStatus: 'all',
      examSubjectId: 'all',
    }));
  }, []);

  const clearAssignmentFilters = React.useCallback(() => {
    setListFilters((current) => ({
      ...current,
      assignmentQuery: '',
      assignmentStatus: 'all',
      assignmentSubjectId: 'all',
    }));
  }, []);

  const clearEventFilters = React.useCallback(() => {
    setListFilters((current) => ({
      ...current,
      eventQuery: '',
      eventStatus: 'all',
      eventSubjectId: 'all',
    }));
  }, []);

  const hasSubjectFilters = listFilters.subjectQuery.trim().length > 0 || listFilters.subjectStatus !== 'all';
  const hasExamFilters =
    listFilters.examQuery.trim().length > 0
    || listFilters.examStatus !== 'all'
    || listFilters.examSubjectId !== 'all';
  const hasAssignmentFilters =
    listFilters.assignmentQuery.trim().length > 0
    || listFilters.assignmentStatus !== 'all'
    || listFilters.assignmentSubjectId !== 'all';
  const hasEventFilters =
    listFilters.eventQuery.trim().length > 0
    || listFilters.eventStatus !== 'all'
    || listFilters.eventSubjectId !== 'all';

  const focusSubjectSetup = React.useCallback(() => {
    resetSubjectForm();
    focusField(subjectNameInputRef.current);
  }, [focusField, resetSubjectForm]);

  const focusExamSetup = React.useCallback(() => {
    if (!sortedSubjects.length) {
      focusSubjectSetup();
      return;
    }

    setEditingExamId(null);
    setExamForm({
      ...emptyExamForm(),
      subjectId: sortedSubjects[0]?.id || '',
    });
    focusField(examTitleInputRef.current);
  }, [focusField, focusSubjectSetup, sortedSubjects]);

  const focusAssignmentSetup = React.useCallback(() => {
    if (!sortedSubjects.length) {
      focusSubjectSetup();
      return;
    }

    setEditingAssignmentId(null);
    setAssignmentForm({
      ...emptyAssignmentForm(),
      subjectId: sortedSubjects[0]?.id || '',
    });
    focusField(assignmentTitleInputRef.current);
  }, [focusField, focusSubjectSetup, sortedSubjects]);

  const focusEventSetup = React.useCallback(() => {
    setEditingEventId(null);
    setEventForm({
      ...emptyEventForm(),
      subjectId: sortedSubjects[0]?.id || '',
    });
    focusField(eventTitleInputRef.current);
  }, [focusField, sortedSubjects]);

  const openSubjectEditor = React.useCallback((subject: AcademicSubjectSummary) => {
    setEditingSubjectId(subject.id);
    setSubjectForm(buildSubjectForm(subject));
    focusField(subjectNameInputRef.current);
  }, [focusField]);

  const openExamEditor = React.useCallback((exam: AcademicExamSummary) => {
    setEditingExamId(exam.id);
    setExamForm(buildExamForm(exam));
    focusField(examTitleInputRef.current);
  }, [focusField]);

  const openAssignmentEditor = React.useCallback((assignment: AcademicAssignmentSummary) => {
    setEditingAssignmentId(assignment.id);
    setAssignmentForm(buildAssignmentForm(assignment));
    focusField(assignmentTitleInputRef.current);
  }, [focusField]);

  const openEventEditor = React.useCallback((event: AcademicCalendarEventSummary) => {
    setEditingEventId(event.id);
    setEventForm(buildEventForm(event));
    focusField(eventTitleInputRef.current);
  }, [focusField]);

  const isFirstFaculdadeSetup = subjects.length === 0 && exams.length === 0 && assignments.length === 0 && events.length === 0;

  const handleConfirmDelete = React.useCallback(async () => {
    if (!pendingDelete) {
      return;
    }

    const target = pendingDelete;

    const deleted = await runAction(
      target.actionKey,
      async () => {
        if (target.kind === 'subject') {
          await faculdadeDomainService.deleteSubject(userId!, target.id);
          if (editingSubjectId === target.id) resetSubjectForm();
          setExamForm((current) => current.subjectId === target.id ? { ...current, subjectId: '' } : current);
          setAssignmentForm((current) => current.subjectId === target.id ? { ...current, subjectId: '' } : current);
          setEventForm((current) => current.subjectId === target.id ? { ...current, subjectId: '' } : current);
          return;
        }

        if (target.kind === 'exam') {
          await faculdadeDomainService.deleteExam(userId!, target.id);
          if (editingExamId === target.id) resetExamForm();
          return;
        }

        if (target.kind === 'assignment') {
          await faculdadeDomainService.deleteAssignment(userId!, target.id);
          if (editingAssignmentId === target.id) resetAssignmentForm();
          return;
        }

        await faculdadeDomainService.deleteCalendarEvent(userId!, target.id);
        if (editingEventId === target.id) resetEventForm();
      },
      target.successMessage,
      {
        loadingTitle: 'Excluindo item do dominio...',
        loadingDetail: 'Aguarde enquanto o shell atualiza o snapshot academico.',
        errorTitle: 'Nao foi possivel excluir esse item.',
      },
    );

    if (deleted) {
      setPendingDelete(null);
    }
  }, [
    editingAssignmentId,
    editingEventId,
    editingExamId,
    editingSubjectId,
    pendingDelete,
    resetAssignmentForm,
    resetEventForm,
    resetExamForm,
    resetSubjectForm,
    runAction,
    userId,
  ]);

  React.useEffect(() => {
    if (examForm.subjectId && !subjects.some((subject) => subject.id === examForm.subjectId)) {
      setExamForm((current) => ({ ...current, subjectId: '' }));
    }
    if (assignmentForm.subjectId && !subjects.some((subject) => subject.id === assignmentForm.subjectId)) {
      setAssignmentForm((current) => ({ ...current, subjectId: '' }));
    }
    if (eventForm.subjectId && !subjects.some((subject) => subject.id === eventForm.subjectId)) {
      setEventForm((current) => ({ ...current, subjectId: '' }));
    }
  }, [assignmentForm.subjectId, eventForm.subjectId, examForm.subjectId, subjects]);

  React.useEffect(() => {
    if (editingSubjectId && !subjects.some((subject) => subject.id === editingSubjectId)) resetSubjectForm();
  }, [editingSubjectId, resetSubjectForm, subjects]);

  React.useEffect(() => {
    if (editingExamId && !exams.some((exam) => exam.id === editingExamId)) resetExamForm();
  }, [editingExamId, exams, resetExamForm]);

  React.useEffect(() => {
    if (editingAssignmentId && !assignments.some((assignment) => assignment.id === editingAssignmentId)) {
      resetAssignmentForm();
    }
  }, [assignments, editingAssignmentId, resetAssignmentForm]);

  React.useEffect(() => {
    if (editingEventId && !events.some((event) => event.id === editingEventId)) resetEventForm();
  }, [editingEventId, events, resetEventForm]);

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-2">
        <PanelActionFeedback
          darkMode={darkMode}
          feedback={feedback}
          onRetry={() => {
            void retryLastAction();
          }}
          className="xl:col-span-2"
        />

        <article className={panelClassName(darkMode)}>
          <p className={labelClassName(darkMode)}>Ativacao do dominio</p>
          <h3 className={`mt-2 text-lg font-black tracking-[-0.03em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            Popular base academica agora
          </h3>
          <p className={helperCopyClassName(darkMode)}>
            Use seed demo para validar o shell com dados reais ou siga abaixo com criacao, edicao e exclusao das entidades do dominio.
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
          </div>

          {isFirstFaculdadeSetup ? (
            <div className="mt-5">
              <GuidedEmptyStateCard
                darkMode={darkMode}
                icon={Sparkles}
                eyebrow="Primeira ativacao"
                title="Comece pela sua primeira disciplina"
                description="A disciplina abre o resto do fluxo: prova, trabalho, calendario e urgencia academica deixam de ficar vazios."
                hint="Se quiser validar o shell inteiro em segundos, a seed demo preenche um exemplo completo."
                primaryActionLabel="Adicionar disciplina"
                onPrimaryAction={focusSubjectSetup}
                secondaryActionLabel="Popular com demo"
                onSecondaryAction={handleSeedDemo}
              />
            </div>
          ) : null}
        </article>

        <article className={panelClassName(darkMode)}>
          <p className={labelClassName(darkMode)}>Disciplinas</p>
          <h3 className={`mt-2 text-lg font-black tracking-[-0.03em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            {editingSubjectId ? 'Editar disciplina' : 'Nova disciplina'}
          </h3>
          <p className={helperCopyClassName(darkMode)}>
            Atualize nome, professor, carga horaria e status. Ao excluir, provas, trabalhos e eventos vinculados saem junto do shell.
          </p>

          <div className="mt-4 space-y-3">
            <input
              ref={subjectNameInputRef}
              className={inputClassName(darkMode)}
              placeholder="Nome da disciplina"
              value={subjectForm.name}
              onChange={(event) => setSubjectForm((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              className={inputClassName(darkMode)}
              placeholder="Professor(a) opcional"
              value={subjectForm.professorName}
              onChange={(event) => setSubjectForm((current) => ({ ...current, professorName: event.target.value }))}
            />
            <input
              className={inputClassName(darkMode)}
              placeholder="Carga horaria em horas"
              inputMode="numeric"
              value={subjectForm.workloadHours}
              onChange={(event) => setSubjectForm((current) => ({ ...current, workloadHours: event.target.value }))}
            />
            <select
              className={inputClassName(darkMode)}
              value={subjectForm.status}
              onChange={(event) =>
                setSubjectForm((current) => ({
                  ...current,
                  status: event.target.value as SubjectFormState['status'],
                }))
              }
            >
              <option value="ativa">Ativa</option>
              <option value="concluida">Concluida</option>
              <option value="trancada">Trancada</option>
            </select>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={buttonClassName(darkMode)}
                onClick={() =>
                  void runAction(
                    editingSubjectId ? `subject:update:${editingSubjectId}` : 'subject:create',
                    async () => {
                      if (!subjectForm.name.trim()) {
                        throw new Error('Informe o nome da disciplina.');
                      }

                      const workloadHours = parseOptionalNumber(subjectForm.workloadHours);
                      if (subjectForm.workloadHours.trim() && workloadHours === null) {
                        throw new Error('Informe uma carga horaria valida.');
                      }

                      if (editingSubjectId) {
                        await faculdadeDomainService.updateSubject(userId!, editingSubjectId, {
                          name: subjectForm.name,
                          professorName: subjectForm.professorName,
                          workloadHours,
                          status: subjectForm.status,
                        });
                      } else {
                        await faculdadeDomainService.createSubject(userId!, {
                          name: subjectForm.name,
                          professorName: subjectForm.professorName,
                          workloadHours,
                        });
                      }

                      resetSubjectForm();
                    },
                    editingSubjectId ? 'Disciplina atualizada com sucesso.' : 'Disciplina criada com sucesso.',
                  )
                }
                disabled={busyAction === (editingSubjectId ? `subject:update:${editingSubjectId}` : 'subject:create')}
              >
                {busyAction === (editingSubjectId ? `subject:update:${editingSubjectId}` : 'subject:create')
                  ? 'Salvando...'
                  : editingSubjectId
                    ? 'Salvar disciplina'
                    : 'Adicionar disciplina'}
              </button>
              {editingSubjectId ? (
                <button
                  type="button"
                  className={buttonClassName(darkMode, 'secondary')}
                  onClick={resetSubjectForm}
                >
                  Cancelar edicao
                </button>
              ) : null}
            </div>
          </div>

          <div className={`mt-5 border-t pt-5 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Disciplinas atuais
            </p>
            {subjects.length > 0 ? (
              <>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input
                    className={inputClassName(darkMode)}
                    placeholder="Buscar disciplina na lista"
                    value={listFilters.subjectQuery}
                    onChange={(event) => updateListFilter('subjectQuery', event.target.value)}
                  />
                  <select
                    className={inputClassName(darkMode)}
                    value={listFilters.subjectStatus}
                    onChange={(event) => updateListFilter('subjectStatus', event.target.value as FaculdadeListFiltersState['subjectStatus'])}
                  >
                    <option value="all">Todos os status</option>
                    <option value="ativa">Ativas</option>
                    <option value="concluida">Concluidas</option>
                    <option value="trancada">Trancadas</option>
                  </select>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className={filterSummaryClassName(darkMode)}>
                    {filteredSubjects.length} de {subjects.length} visiveis - ordenado por status e nome.
                  </p>
                  {hasSubjectFilters ? (
                    <button
                      type="button"
                      className={filterClearButtonClassName(darkMode)}
                      onClick={clearSubjectFilters}
                    >
                      Limpar filtros
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
            <div className="mt-3 space-y-4">
              {subjects.length === 0 ? (
                <GuidedEmptyStateCard
                  darkMode={darkMode}
                  icon={BookOpen}
                  eyebrow="Base academica"
                  title="Nenhuma disciplina por enquanto"
                  description="Cadastre a primeira disciplina para liberar prova, trabalho e leitura real de urgencia no shell."
                  hint="Voce pode comecar por uma materia central do semestre e preencher o resto aos poucos."
                  primaryActionLabel="Adicionar disciplina"
                  onPrimaryAction={focusSubjectSetup}
                  secondaryActionLabel="Popular com demo"
                  onSecondaryAction={handleSeedDemo}
                />
              ) : filteredSubjects.length > 0 ? groupedSubjects.map((group) => (
                <FaculdadeListGroup
                  key={group.id}
                  darkMode={darkMode}
                  title={group.title}
                  helper={group.helper}
                  items={group.items}
                  collapsible={group.collapsible}
                  defaultOpen={group.defaultOpen}
                >
                  {group.items.map((subject) => (
                <article key={subject.id} className={interactiveItemCardClassName(darkMode)}>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className={itemPrimaryActionClassName(darkMode)}
                      aria-label={`Abrir disciplina ${subject.name} para edicao`}
                      onClick={() => openSubjectEditor(subject)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                      <p className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{subject.name}</p>
                      <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {subject.professorName || 'Professor nao informado'} · {subject.workloadHours ? `${subject.workloadHours}h` : 'Carga livre'}
                      </p>
                        </div>
                        <span className={badgeClassName(darkMode)}>{subject.status}</span>
                      </div>
                    </button>
                    <ItemActionMenu
                      darkMode={darkMode}
                      itemLabel={subject.name}
                      actions={[
                        {
                          label: 'Editar',
                          onSelect: () => openSubjectEditor(subject),
                        },
                        {
                          label: 'Excluir',
                          destructive: true,
                          onSelect: () =>
                            setPendingDelete({
                              kind: 'subject',
                              id: subject.id,
                              title: `Excluir ${subject.name}?`,
                              message: 'Isso remove a disciplina e limpa tambem provas, trabalhos e eventos academicos vinculados a ela.',
                              actionKey: `subject:delete:${subject.id}`,
                              successMessage: 'Disciplina removida com sucesso.',
                            }),
                        },
                      ]}
                    />
                  </div>
                </article>
                  ))}
                </FaculdadeListGroup>
              )) : (
                <GuidedEmptyStateCard
                  darkMode={darkMode}
                  icon={BookOpen}
                  eyebrow="Filtros ativos"
                  title="Nenhuma disciplina bate com essa busca"
                  description="Ajuste o nome ou o status para reencontrar a materia certa sem baguncar a leitura operacional."
                  hint="Quando quiser voltar ao panorama completo, limpe os filtros desta secao."
                  primaryActionLabel="Limpar filtros"
                  onPrimaryAction={clearSubjectFilters}
                />
              )}
            </div>
          </div>
        </article>

        <article className={panelClassName(darkMode)}>
          <p className={labelClassName(darkMode)}>Provas</p>
          <h3 className={`mt-2 text-lg font-black tracking-[-0.03em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            {editingExamId ? 'Editar prova' : 'Nova prova'}
          </h3>
          <p className={helperCopyClassName(darkMode)}>
            A prova mexe direto na urgencia do snapshot. Alteracoes aparecem na Home e no radar academico apos refresh.
          </p>

          <div className="mt-4 space-y-3">
            <select
              className={inputClassName(darkMode)}
              value={examForm.subjectId}
              onChange={(event) => setExamForm((current) => ({ ...current, subjectId: event.target.value }))}
            >
              <option value="">Selecione a disciplina</option>
              {sortedSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <input
              ref={examTitleInputRef}
              className={inputClassName(darkMode)}
              placeholder="Titulo da prova"
              value={examForm.title}
              onChange={(event) => setExamForm((current) => ({ ...current, title: event.target.value }))}
            />
            <input
              className={inputClassName(darkMode)}
              type="datetime-local"
              value={examForm.date}
              onChange={(event) => setExamForm((current) => ({ ...current, date: event.target.value }))}
            />
            <input
              className={inputClassName(darkMode)}
              placeholder="Peso opcional"
              inputMode="decimal"
              value={examForm.weight}
              onChange={(event) => setExamForm((current) => ({ ...current, weight: event.target.value }))}
            />
            <select
              className={inputClassName(darkMode)}
              value={examForm.status}
              onChange={(event) =>
                setExamForm((current) => ({
                  ...current,
                  status: event.target.value as ExamFormState['status'],
                }))
              }
            >
              <option value="pendente">Pendente</option>
              <option value="concluida">Concluida</option>
            </select>
            <textarea
              className={textareaClassName(darkMode)}
              placeholder="Notas opcionais da prova"
              value={examForm.notes}
              onChange={(event) => setExamForm((current) => ({ ...current, notes: event.target.value }))}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={buttonClassName(darkMode)}
                onClick={() =>
                  void runAction(
                    editingExamId ? `exam:update:${editingExamId}` : 'exam:create',
                    async () => {
                      if (!examForm.subjectId) throw new Error('Escolha uma disciplina antes de salvar a prova.');
                      if (!examForm.title.trim() || !examForm.date) throw new Error('Preencha titulo e data da prova.');

                      const weight = parseOptionalNumber(examForm.weight);
                      if (examForm.weight.trim() && weight === null) {
                        throw new Error('Informe um peso valido para a prova.');
                      }

                      if (editingExamId) {
                        await faculdadeDomainService.updateExam(userId!, editingExamId, {
                          subjectId: examForm.subjectId,
                          title: examForm.title,
                          date: examForm.date,
                          weight,
                          status: examForm.status,
                          notes: examForm.notes,
                        });
                      } else {
                        await faculdadeDomainService.createExam(userId!, {
                          subjectId: examForm.subjectId,
                          title: examForm.title,
                          date: examForm.date,
                          weight,
                        });
                      }

                      resetExamForm();
                    },
                    editingExamId ? 'Prova atualizada com sucesso.' : 'Prova criada com sucesso.',
                  )
                }
                disabled={busyAction === (editingExamId ? `exam:update:${editingExamId}` : 'exam:create')}
              >
                {busyAction === (editingExamId ? `exam:update:${editingExamId}` : 'exam:create')
                  ? 'Salvando...'
                  : editingExamId
                    ? 'Salvar prova'
                    : 'Adicionar prova'}
              </button>
              {editingExamId ? (
                <button
                  type="button"
                  className={buttonClassName(darkMode, 'secondary')}
                  onClick={resetExamForm}
                >
                  Cancelar edicao
                </button>
              ) : null}
            </div>
          </div>

          <div className={`mt-5 border-t pt-5 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Provas cadastradas
            </p>
            {exams.length > 0 ? (
              <>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <input
                    className={inputClassName(darkMode)}
                    placeholder="Buscar prova na lista"
                    value={listFilters.examQuery}
                    onChange={(event) => updateListFilter('examQuery', event.target.value)}
                  />
                  <select
                    className={inputClassName(darkMode)}
                    value={listFilters.examStatus}
                    onChange={(event) => updateListFilter('examStatus', event.target.value as FaculdadeListFiltersState['examStatus'])}
                  >
                    <option value="all">Todos os status</option>
                    <option value="pendente">Pendentes</option>
                    <option value="concluida">Concluidas</option>
                  </select>
                  <select
                    className={inputClassName(darkMode)}
                    value={listFilters.examSubjectId}
                    onChange={(event) => updateListFilter('examSubjectId', event.target.value)}
                  >
                    <option value="all">Todas as disciplinas</option>
                    {sortedSubjects.map((subject) => (
                      <option key={`exam-filter-${subject.id}`} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className={filterSummaryClassName(darkMode)}>
                    {filteredExams.length} de {exams.length} visiveis - ordenado por prazo.
                  </p>
                  {hasExamFilters ? (
                    <button
                      type="button"
                      className={filterClearButtonClassName(darkMode)}
                      onClick={clearExamFilters}
                    >
                      Limpar filtros
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
            <div className="mt-3 space-y-4">
              {exams.length === 0 ? (
                <GuidedEmptyStateCard
                  darkMode={darkMode}
                  icon={FileText}
                  eyebrow={subjects.length === 0 ? 'Dependencia de base' : 'Urgencia academica'}
                  title={subjects.length === 0 ? 'Cadastre uma disciplina antes da primeira prova' : 'Nenhuma prova no radar ainda'}
                  description={
                    subjects.length === 0
                      ? 'A prova precisa estar ligada a uma disciplina. Assim que a primeira materia entrar, voce ja consegue montar o calendario real.'
                      : 'A primeira prova liga o radar de urgencia da Home e ajuda o shell a priorizar o que vence primeiro.'
                  }
                  hint={
                    subjects.length === 0
                      ? 'Comece pela materia principal do semestre para liberar o restante do dominio.'
                      : 'Use a proxima avaliacao da semana como ponto de partida.'
                  }
                  primaryActionLabel={subjects.length === 0 ? 'Adicionar disciplina' : 'Adicionar prova'}
                  onPrimaryAction={subjects.length === 0 ? focusSubjectSetup : focusExamSetup}
                />
              ) : filteredExams.length > 0 ? groupedExams.map((group) => (
                <FaculdadeListGroup
                  key={group.id}
                  darkMode={darkMode}
                  title={group.title}
                  helper={group.helper}
                  items={group.items}
                  collapsible={group.collapsible}
                  defaultOpen={group.defaultOpen}
                >
                  {group.items.map((exam) => (
                <article key={exam.id} className={interactiveItemCardClassName(darkMode)}>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className={itemPrimaryActionClassName(darkMode)}
                      aria-label={`Abrir prova ${exam.title} para edicao`}
                      onClick={() => openExamEditor(exam)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                      <p className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{exam.title}</p>
                      <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {exam.subjectName} · {formatDateTimeLabel(exam.date)}{exam.weight ? ` · peso ${exam.weight}` : ''}
                      </p>
                      {exam.notes ? (
                        <p className={`mt-2 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          {exam.notes}
                        </p>
                      ) : null}
                        </div>
                        <span className={badgeClassName(darkMode)}>{exam.status}</span>
                      </div>
                    </button>
                    <ItemActionMenu
                      darkMode={darkMode}
                      itemLabel={exam.title}
                      actions={[
                        {
                          label: 'Editar',
                          onSelect: () => openExamEditor(exam),
                        },
                        {
                          label: 'Excluir',
                          destructive: true,
                          onSelect: () =>
                            setPendingDelete({
                              kind: 'exam',
                              id: exam.id,
                              title: `Excluir ${exam.title}?`,
                              message: 'A prova sai do radar de urgencia e qualquer evento de calendario ligado a ela tambem sera removido.',
                              actionKey: `exam:delete:${exam.id}`,
                              successMessage: 'Prova removida com sucesso.',
                            }),
                        },
                      ]}
                    />
                  </div>
                </article>
                  ))}
                </FaculdadeListGroup>
              )) : (
                <GuidedEmptyStateCard
                  darkMode={darkMode}
                  icon={FileText}
                  eyebrow="Filtros ativos"
                  title="Nenhuma prova bate com esse recorte"
                  description="Ajuste nome, status ou disciplina para reencontrar a avaliacao certa sem perder a ordem por prazo."
                  hint="Limpar os filtros devolve o radar completo da secao."
                  primaryActionLabel="Limpar filtros"
                  onPrimaryAction={clearExamFilters}
                />
              )}
            </div>
          </div>
        </article>

        <article className={panelClassName(darkMode)}>
          <p className={labelClassName(darkMode)}>Trabalhos</p>
          <h3 className={`mt-2 text-lg font-black tracking-[-0.03em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            {editingAssignmentId ? 'Editar trabalho' : 'Novo trabalho'}
          </h3>
          <p className={helperCopyClassName(darkMode)}>
            Prioridade, prazo e status influenciam a manutencao do snapshot e evitam item fantasma apos reload.
          </p>

          <div className="mt-4 space-y-3">
            <select
              className={inputClassName(darkMode)}
              value={assignmentForm.subjectId}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, subjectId: event.target.value }))}
            >
              <option value="">Disciplina do trabalho</option>
              {sortedSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <input
              ref={assignmentTitleInputRef}
              className={inputClassName(darkMode)}
              placeholder="Titulo do trabalho"
              value={assignmentForm.title}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, title: event.target.value }))}
            />
            <input
              className={inputClassName(darkMode)}
              type="datetime-local"
              value={assignmentForm.dueDate}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, dueDate: event.target.value }))}
            />
            <select
              className={inputClassName(darkMode)}
              value={assignmentForm.priority}
              onChange={(event) =>
                setAssignmentForm((current) => ({
                  ...current,
                  priority: event.target.value as AssignmentFormState['priority'],
                }))
              }
            >
              <option value="baixa">Prioridade baixa</option>
              <option value="media">Prioridade media</option>
              <option value="alta">Prioridade alta</option>
              <option value="critica">Prioridade critica</option>
            </select>
            <select
              className={inputClassName(darkMode)}
              value={assignmentForm.status}
              onChange={(event) =>
                setAssignmentForm((current) => ({
                  ...current,
                  status: event.target.value as AssignmentFormState['status'],
                }))
              }
            >
              <option value="nao_iniciado">Nao iniciado</option>
              <option value="em_andamento">Em andamento</option>
              <option value="entregue">Entregue</option>
            </select>
            <textarea
              className={textareaClassName(darkMode)}
              placeholder="Descricao opcional do trabalho"
              value={assignmentForm.description}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, description: event.target.value }))}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={buttonClassName(darkMode)}
                onClick={() =>
                  void runAction(
                    editingAssignmentId ? `assignment:update:${editingAssignmentId}` : 'assignment:create',
                    async () => {
                      if (!assignmentForm.subjectId) throw new Error('Escolha uma disciplina antes de salvar o trabalho.');
                      if (!assignmentForm.title.trim() || !assignmentForm.dueDate) {
                        throw new Error('Preencha titulo e prazo do trabalho.');
                      }

                      if (editingAssignmentId) {
                        await faculdadeDomainService.updateAssignment(userId!, editingAssignmentId, {
                          subjectId: assignmentForm.subjectId,
                          title: assignmentForm.title,
                          dueDate: assignmentForm.dueDate,
                          priority: assignmentForm.priority,
                          status: assignmentForm.status,
                          description: assignmentForm.description,
                        });
                      } else {
                        await faculdadeDomainService.createAssignment(userId!, {
                          subjectId: assignmentForm.subjectId,
                          title: assignmentForm.title,
                          dueDate: assignmentForm.dueDate,
                          priority: assignmentForm.priority,
                          description: assignmentForm.description,
                        });
                      }

                      resetAssignmentForm();
                    },
                    editingAssignmentId ? 'Trabalho atualizado com sucesso.' : 'Trabalho criado com sucesso.',
                  )
                }
                disabled={busyAction === (editingAssignmentId ? `assignment:update:${editingAssignmentId}` : 'assignment:create')}
              >
                {busyAction === (editingAssignmentId ? `assignment:update:${editingAssignmentId}` : 'assignment:create')
                  ? 'Salvando...'
                  : editingAssignmentId
                    ? 'Salvar trabalho'
                    : 'Adicionar trabalho'}
              </button>
              {editingAssignmentId ? (
                <button
                  type="button"
                  className={buttonClassName(darkMode, 'secondary')}
                  onClick={resetAssignmentForm}
                >
                  Cancelar edicao
                </button>
              ) : null}
            </div>
          </div>

          <div className={`mt-5 border-t pt-5 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Trabalhos cadastrados
            </p>
            {assignments.length > 0 ? (
              <>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <input
                    className={inputClassName(darkMode)}
                    placeholder="Buscar trabalho na lista"
                    value={listFilters.assignmentQuery}
                    onChange={(event) => updateListFilter('assignmentQuery', event.target.value)}
                  />
                  <select
                    className={inputClassName(darkMode)}
                    value={listFilters.assignmentStatus}
                    onChange={(event) => updateListFilter('assignmentStatus', event.target.value as FaculdadeListFiltersState['assignmentStatus'])}
                  >
                    <option value="all">Todos os status</option>
                    <option value="nao_iniciado">Nao iniciados</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="entregue">Entregues</option>
                  </select>
                  <select
                    className={inputClassName(darkMode)}
                    value={listFilters.assignmentSubjectId}
                    onChange={(event) => updateListFilter('assignmentSubjectId', event.target.value)}
                  >
                    <option value="all">Todas as disciplinas</option>
                    {sortedSubjects.map((subject) => (
                      <option key={`assignment-filter-${subject.id}`} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className={filterSummaryClassName(darkMode)}>
                    {filteredAssignments.length} de {assignments.length} visiveis - ordenado por prazo e prioridade.
                  </p>
                  {hasAssignmentFilters ? (
                    <button
                      type="button"
                      className={filterClearButtonClassName(darkMode)}
                      onClick={clearAssignmentFilters}
                    >
                      Limpar filtros
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
            <div className="mt-3 space-y-4">
              {assignments.length === 0 ? (
                <GuidedEmptyStateCard
                  darkMode={darkMode}
                  icon={ClipboardList}
                  eyebrow={subjects.length === 0 ? 'Dependencia de base' : 'Entrega futura'}
                  title={subjects.length === 0 ? 'Primeiro cadastre uma disciplina' : 'Nenhum trabalho cadastrado ainda'}
                  description={
                    subjects.length === 0
                      ? 'Os trabalhos dependem de uma disciplina para aparecer com contexto e prioridade corretos.'
                      : 'Cadastre a primeira entrega para preencher o radar academico e testar prioridade por prazo.'
                  }
                  hint={
                    subjects.length === 0
                      ? 'Depois da disciplina, voce consegue ligar prova e trabalho no mesmo fluxo.'
                      : 'Um titulo simples e o prazo ja bastam para tirar o shell do vazio.'
                  }
                  primaryActionLabel={subjects.length === 0 ? 'Adicionar disciplina' : 'Adicionar trabalho'}
                  onPrimaryAction={subjects.length === 0 ? focusSubjectSetup : focusAssignmentSetup}
                />
              ) : filteredAssignments.length > 0 ? groupedAssignments.map((group) => (
                <FaculdadeListGroup
                  key={group.id}
                  darkMode={darkMode}
                  title={group.title}
                  helper={group.helper}
                  items={group.items}
                  collapsible={group.collapsible}
                  defaultOpen={group.defaultOpen}
                >
                  {group.items.map((assignment) => (
                <article key={assignment.id} className={interactiveItemCardClassName(darkMode)}>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className={itemPrimaryActionClassName(darkMode)}
                      aria-label={`Abrir trabalho ${assignment.title} para edicao`}
                      onClick={() => openAssignmentEditor(assignment)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                      <p className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{assignment.title}</p>
                      <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {assignment.subjectName} · {formatDateTimeLabel(assignment.dueDate)} · prioridade {assignment.priority || 'media'}
                      </p>
                      {assignment.description ? (
                        <p className={`mt-2 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          {assignment.description}
                        </p>
                      ) : null}
                        </div>
                        <span className={badgeClassName(darkMode)}>{assignment.status}</span>
                      </div>
                    </button>
                    <ItemActionMenu
                      darkMode={darkMode}
                      itemLabel={assignment.title}
                      actions={[
                        {
                          label: 'Editar',
                          onSelect: () => openAssignmentEditor(assignment),
                        },
                        {
                          label: 'Excluir',
                          destructive: true,
                          onSelect: () =>
                            setPendingDelete({
                              kind: 'assignment',
                              id: assignment.id,
                              title: `Excluir ${assignment.title}?`,
                              message: 'O trabalho sai do radar academico e qualquer evento de calendario ligado a ele tambem sera removido.',
                              actionKey: `assignment:delete:${assignment.id}`,
                              successMessage: 'Trabalho removido com sucesso.',
                            }),
                        },
                      ]}
                    />
                  </div>
                </article>
                  ))}
                </FaculdadeListGroup>
              )) : (
                <GuidedEmptyStateCard
                  darkMode={darkMode}
                  icon={ClipboardList}
                  eyebrow="Filtros ativos"
                  title="Nenhum trabalho bate com esse recorte"
                  description="Ajuste nome, status ou disciplina para voltar a enxergar a fila de entrega sem perder a prioridade."
                  hint="Limpar os filtros desta secao traz de volta o panorama completo."
                  primaryActionLabel="Limpar filtros"
                  onPrimaryAction={clearAssignmentFilters}
                />
              )}
            </div>
          </div>
        </article>

        <article className={panelClassName(darkMode)}>
          <p className={labelClassName(darkMode)}>Eventos academicos</p>
          <h3 className={`mt-2 text-lg font-black tracking-[-0.03em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            {editingEventId ? 'Editar evento academico' : 'Novo evento academico'}
          </h3>
          <p className={helperCopyClassName(darkMode)}>
            Aqui entram aulas importantes, blocos de estudo, metas e marcos do calendario. O refresh central garante que a arvore e a Home reflitam a mudanca sem item fantasma.
          </p>

          <div className="mt-4 space-y-3">
            <select
              className={inputClassName(darkMode)}
              value={eventForm.subjectId}
              onChange={(event) => setEventForm((current) => ({ ...current, subjectId: event.target.value }))}
            >
              <option value="">Evento sem disciplina vinculada</option>
              {sortedSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
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
              onChange={(event) =>
                setEventForm((current) => ({
                  ...current,
                  type: event.target.value as EventFormState['type'],
                }))
              }
            >
              <option value="estudo">Bloco de estudo</option>
              <option value="aula_importante">Aula importante</option>
              <option value="meta">Meta</option>
              <option value="prova">Prova</option>
              <option value="entrega">Entrega</option>
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
              onChange={(event) =>
                setEventForm((current) => ({
                  ...current,
                  status: event.target.value as EventFormState['status'],
                }))
              }
            >
              <option value="pendente">Pendente</option>
              <option value="concluido">Concluido</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <textarea
              className={textareaClassName(darkMode)}
              placeholder="Detalhes opcionais do evento"
              value={eventForm.details}
              onChange={(event) => setEventForm((current) => ({ ...current, details: event.target.value }))}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={buttonClassName(darkMode)}
                onClick={() =>
                  void runAction(
                    editingEventId ? `event:update:${editingEventId}` : 'event:create',
                    async () => {
                      if (!eventForm.title.trim() || !eventForm.startAt) {
                        throw new Error('Preencha titulo e inicio do evento.');
                      }

                      if (eventForm.endAt && new Date(eventForm.endAt).getTime() < new Date(eventForm.startAt).getTime()) {
                        throw new Error('O termino do evento precisa ser igual ou posterior ao inicio.');
                      }

                      if (editingEventId) {
                        await faculdadeDomainService.updateCalendarEvent(userId!, editingEventId, {
                          subjectId: eventForm.subjectId || null,
                          title: eventForm.title,
                          type: eventForm.type,
                          startAt: eventForm.startAt,
                          endAt: eventForm.endAt || null,
                          details: eventForm.details,
                          status: eventForm.status,
                        });
                      } else {
                        await faculdadeDomainService.createCalendarEvent(userId!, {
                          subjectId: eventForm.subjectId || null,
                          title: eventForm.title,
                          type: eventForm.type,
                          startAt: eventForm.startAt,
                          endAt: eventForm.endAt || null,
                          details: eventForm.details,
                        });
                      }

                      resetEventForm();
                    },
                    editingEventId ? 'Evento academico atualizado com sucesso.' : 'Evento academico criado com sucesso.',
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
                <button
                  type="button"
                  className={buttonClassName(darkMode, 'secondary')}
                  onClick={resetEventForm}
                >
                  Cancelar edicao
                </button>
              ) : null}
            </div>
          </div>

          <div className={`mt-5 border-t pt-5 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Eventos cadastrados
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
                    onChange={(event) => updateListFilter('eventStatus', event.target.value as FaculdadeListFiltersState['eventStatus'])}
                  >
                    <option value="all">Todos os status</option>
                    <option value="pendente">Pendentes</option>
                    <option value="concluido">Concluidos</option>
                    <option value="cancelado">Cancelados</option>
                  </select>
                  <select
                    className={inputClassName(darkMode)}
                    value={listFilters.eventSubjectId}
                    onChange={(event) => updateListFilter('eventSubjectId', event.target.value)}
                  >
                    <option value="all">Todas as disciplinas</option>
                    <option value="unlinked">Sem disciplina</option>
                    {sortedSubjects.map((subject) => (
                      <option key={`event-filter-${subject.id}`} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className={filterSummaryClassName(darkMode)}>
                    {filteredEvents.length} de {events.length} visiveis - ordenado por data.
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
                  eyebrow="Calendario"
                  title="Nenhum evento academico no calendario"
                  description="Crie revisoes, aulas importantes ou metas para o shell parar de depender so da estrutura e mostrar a semana real."
                  hint="Evento academico pode existir com ou sem disciplina vinculada, entao esse e um bom ponto de partida rapido."
                  primaryActionLabel="Adicionar evento"
                  onPrimaryAction={focusEventSetup}
                  secondaryActionLabel={isFirstFaculdadeSetup ? 'Popular com demo' : undefined}
                  onSecondaryAction={isFirstFaculdadeSetup ? handleSeedDemo : undefined}
                />
              ) : filteredEvents.length > 0 ? groupedEvents.map((group) => (
                <FaculdadeListGroup
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
                        <div className="min-w-0">
                      <p className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{event.title}</p>
                      <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {event.subjectName || 'Sem disciplina'} Â· {event.type} Â· {formatDateTimeLabel(event.startAt)}
                        {event.endAt ? ` ate ${formatDateTimeLabel(event.endAt)}` : ''}
                      </p>
                      {event.details ? (
                        <p className={`mt-2 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          {event.details}
                        </p>
                      ) : null}
                        </div>
                        <span className={badgeClassName(darkMode)}>{event.status}</span>
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
                              title: `Excluir ${event.title}?`,
                              message: 'O evento sai imediatamente do calendario academico e do snapshot do shell.',
                              actionKey: `event:delete:${event.id}`,
                              successMessage: 'Evento academico removido com sucesso.',
                            }),
                        },
                      ]}
                    />
                  </div>
                </article>
                  ))}
                </FaculdadeListGroup>
              )) : (
                <GuidedEmptyStateCard
                  darkMode={darkMode}
                  icon={CalendarDays}
                  eyebrow="Filtros ativos"
                  title="Nenhum evento bate com esse recorte"
                  description="Ajuste nome, status ou disciplina para reencontrar o compromisso certo sem perder a leitura da agenda."
                  hint="Limpar os filtros devolve o calendario inteiro desta secao."
                  primaryActionLabel="Limpar filtros"
                  onPrimaryAction={clearEventFilters}
                />
              )}
            </div>
          </div>
        </article>
      </section>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={pendingDelete?.title || 'Confirmar exclusao'}
        message={pendingDelete?.message || 'Essa acao nao pode ser desfeita.'}
        impact="Essa acao nao pode ser desfeita."
        confirmLabel="Excluir agora"
        cancelLabel="Cancelar"
        variant="danger"
        confirmLoading={busyAction === pendingDelete?.actionKey}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
};

export default FaculdadeActivationPanel;
