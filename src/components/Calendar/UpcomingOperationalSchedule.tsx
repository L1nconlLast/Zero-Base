import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  ChevronsUp,
  PlayCircle,
  SkipForward,
} from 'lucide-react';
import type {
  OperationalScheduleWindowItem,
  OperationalScheduleWindowDay,
  ScheduledStudyFocusStatus,
} from '../../services/studySchedule.service';
import type { Weekday } from '../../types';
import { mapReasonSummaryToCopy } from '../../services/prioritizationReason';
import {
  type DailyLoadMetrics,
  type WeeklyLoadSummary,
  suggestRebalanceDay,
  suggestReinforceDay,
} from '../../services/weeklyLoad.service';
import {
  normalizePresentationLabel,
  normalizeSubjectLabel,
  truncatePresentationLabel,
} from '../../utils/uiLabels';

interface UpcomingOperationalScheduleProps {
  days: OperationalScheduleWindowDay[];
  weeklyLoadSummary: WeeklyLoadSummary;
  availableSubjectOptions: string[];
  defaultSessionDurationMinutes: number;
  plannerVariant?: 'default' | 'faculdade';
  itemActionLabel: string;
  emptyActionLabel: string;
  onStartOfficialStudy?: (() => void) | null;
  onEditDay: (day: Weekday) => void;
  onMoveItem: (item: OperationalScheduleWindowItem, fromDate: string, toDate: string) => void;
  onPostponeItem: (item: OperationalScheduleWindowItem, fromDate: string) => void;
  onPrioritizeItem: (item: OperationalScheduleWindowItem, date: string) => void;
  onReorderItem: (
    item: OperationalScheduleWindowItem,
    date: string,
    direction: 'up' | 'down',
  ) => void;
  onUpdateItemDuration: (
    item: OperationalScheduleWindowItem,
    date: string,
    durationMinutes: number,
  ) => void;
  onCreateManualEntry: (
    date: string,
    input: {
      subject: string;
      durationMinutes: number;
    },
  ) => void;
  onRebalanceDay: (date: string) => void;
  onReinforceDay: (date: string) => void;
}

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: 'Segunda',
  tuesday: 'Terca',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sabado',
  sunday: 'Domingo',
};

const STATUS_META: Record<
  ScheduledStudyFocusStatus,
  { label: string; tone: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pendente',
    tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200',
    icon: <Clock3 className="h-3.5 w-3.5" />,
  },
  completed: {
    label: 'Concluido',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  overdue: {
    label: 'Atrasado',
    tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
};

const formatDateLabel = (date: string): string => {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
};

const formatMoveOptionLabel = (day: OperationalScheduleWindowDay): string =>
  `${WEEKDAY_LABELS[day.weekday]} (${formatDateLabel(day.date)})`;

const getStudyTypeLabel = (studyType?: string): string => {
  if (studyType === 'teoria_questoes') return 'Teoria + Questoes';
  if (studyType === 'questoes') return 'Questoes';
  if (studyType === 'revisao') return 'Revisao';
  if (studyType === 'simulado') return 'Simulado';
  return 'Estudo';
};

const LOAD_LEVEL_META: Record<
  DailyLoadMetrics['level'],
  { label: string; tone: string; barTone: string; message: string }
> = {
  low: {
    label: 'Leve',
    tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
    barTone: 'bg-amber-400',
    message: 'Dia com pouca carga',
  },
  ok: {
    label: 'OK',
    tone: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    barTone: 'bg-emerald-500',
    message: 'Dia equilibrado',
  },
  high: {
    label: 'Pesado',
    tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200',
    barTone: 'bg-rose-500',
    message: 'Dia com carga alta',
  },
};

const QUICK_DURATION_OPTIONS = [15, 25, 40] as const;

const PLANNER_COPY = {
  default: {
    eyebrow: 'Semana operacional',
    title: 'Transforme os proximos dias em uma fila viva de estudo',
    description: 'Mostrando poucos dias por vez para manter a leitura leve.',
    support: 'Cada item usa o mesmo loop oficial para manter cronograma, home e progresso no mesmo trilho.',
    summaryEyebrow: 'Leitura da semana',
  },
  faculdade: {
    eyebrow: 'Semana academica',
    title: 'O que fazer agora e o que vem depois',
    description: 'Provas, entregas e blocos mais urgentes sobem primeiro para facilitar a leitura da semana.',
    support: 'A fila academica destaca o que pede acao hoje sem esconder o que pode esperar alguns dias.',
    summaryEyebrow: 'Radar da semana',
  },
} as const;

const getOperationalItemWeight = (item: OperationalScheduleWindowItem): number => {
  if (item.status === 'overdue') {
    return 0;
  }

  if (item.status === 'pending' && item.priority === 'alta') {
    return 1;
  }

  if (item.status === 'pending') {
    return 2;
  }

  if (item.status === 'completed') {
    return 3;
  }

  return 4;
};

interface ManualEntryDraft {
  subject: string;
  durationMinutes: number;
}

const UpcomingOperationalSchedule: React.FC<UpcomingOperationalScheduleProps> = ({
  days,
  weeklyLoadSummary,
  availableSubjectOptions,
  defaultSessionDurationMinutes,
  plannerVariant = 'default',
  itemActionLabel,
  emptyActionLabel,
  onStartOfficialStudy,
  onEditDay,
  onMoveItem,
  onPostponeItem,
  onPrioritizeItem,
  onReorderItem,
  onUpdateItemDuration,
  onCreateManualEntry,
  onRebalanceDay,
  onReinforceDay,
}) => {
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [manualComposerByDate, setManualComposerByDate] = useState<Record<string, boolean>>({});
  const [manualDraftsByDate, setManualDraftsByDate] = useState<Record<string, ManualEntryDraft>>({});
  const [showAllDays, setShowAllDays] = useState(false);
  const [expandedDaysByDate, setExpandedDaysByDate] = useState<Record<string, boolean>>({});
  const plannerCopy = PLANNER_COPY[plannerVariant];
  const moveOptionsByDay = useMemo(
    () =>
      days.reduce((acc, day) => {
        acc[day.date] = days.filter((candidate) => candidate.date !== day.date);
        return acc;
      }, {} as Record<string, OperationalScheduleWindowDay[]>),
    [days],
  );
  const loadByDate = useMemo(
    () => new Map(weeklyLoadSummary.days.map((day) => [day.date, day])),
    [weeklyLoadSummary.days],
  );
  const rebalancingSuggestions = useMemo(
    () =>
      days.reduce((acc, day) => {
        acc[day.date] = suggestRebalanceDay(days, day.date);
        return acc;
      }, {} as Record<string, ReturnType<typeof suggestRebalanceDay>>),
    [days],
  );
  const reinforcementSuggestions = useMemo(
    () =>
      days.reduce((acc, day) => {
        acc[day.date] = suggestReinforceDay(days, day.date);
        return acc;
      }, {} as Record<string, ReturnType<typeof suggestReinforceDay>>),
    [days],
  );
  const getManualDraft = (date: string): ManualEntryDraft =>
    manualDraftsByDate[date] ?? {
      subject: '',
      durationMinutes: defaultSessionDurationMinutes,
    };

  const toggleManualComposer = (date: string) => {
    setManualComposerByDate((current) => ({
      ...current,
      [date]: !current[date],
    }));
  };

  const updateManualDraft = (date: string, patch: Partial<ManualEntryDraft>) => {
    setManualDraftsByDate((current) => ({
      ...current,
      [date]: {
        ...(current[date] ?? {
          subject: '',
          durationMinutes: defaultSessionDurationMinutes,
        }),
        ...patch,
      },
    }));
  };

  const visibleDays = showAllDays ? days : days.slice(0, 3);
  const plannerSnapshot = useMemo(() => {
    const flattened = days.flatMap((day) =>
      day.items.map((item) => ({
        ...item,
        date: day.date,
        weekday: day.weekday,
        offsetDays: day.offsetDays,
        isToday: day.isToday,
      })),
    );
    const criticalItems = flattened.filter((item) => item.status === 'overdue' || (item.status === 'pending' && item.priority === 'alta'));
    const pendingItems = flattened.filter((item) => item.status === 'pending');
    const completedItems = flattened.filter((item) => item.status === 'completed');
    const nextCriticalItem = [...(criticalItems.length > 0 ? criticalItems : pendingItems)].sort((left, right) =>
      Number(right.isToday) - Number(left.isToday)
      || getOperationalItemWeight(left) - getOperationalItemWeight(right)
      || left.offsetDays - right.offsetDays
      || normalizeSubjectLabel(left.subject, 'Outra').localeCompare(normalizeSubjectLabel(right.subject, 'Outra'))
    )[0] ?? null;

    return {
      criticalCount: criticalItems.length,
      pendingCount: pendingItems.length,
      completedCount: completedItems.length,
      todayCount: flattened.filter((item) => item.isToday).length,
      nextCriticalItem,
    };
  }, [days]);

  return (
    <section
      data-testid="upcoming-schedule-panel"
      className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
    >
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {plannerCopy.eyebrow}
        </p>
        <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
          {plannerCopy.title}
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {plannerCopy.description} Mostrando {Math.min(visibleDays.length, days.length)} de {days.length} dias agora.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
          {plannerCopy.support}
        </p>
        {days.length > 3 ? (
          <button
            type="button"
            onClick={() => setShowAllDays((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {showAllDays ? 'Mostrar 3 dias' : 'Ver semana inteira'}
            {showAllDays ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>
    </div>

      {plannerVariant === 'faculdade' ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-4 dark:border-cyan-900 dark:bg-cyan-950/20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
              Radar academico
            </p>
            <h4 className="mt-2 text-base font-bold text-cyan-950 dark:text-cyan-100">
              O que pede atencao agora
            </h4>
            <p className="mt-2 text-sm text-cyan-900/80 dark:text-cyan-100/80">
              {plannerSnapshot.nextCriticalItem
                ? `${normalizeSubjectLabel(plannerSnapshot.nextCriticalItem.subject, 'Outra')} em ${WEEKDAY_LABELS[plannerSnapshot.nextCriticalItem.weekday]} (${formatDateLabel(plannerSnapshot.nextCriticalItem.date)}).`
                : 'Sem item critico imediato no radar academico desta janela.'}
            </p>
            {plannerSnapshot.nextCriticalItem?.topic ? (
              <p className="mt-1 text-xs text-cyan-900/70 dark:text-cyan-100/70">
                {normalizePresentationLabel(plannerSnapshot.nextCriticalItem.topic, 'Topico alinhado ao plano semanal')}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Fazer agora
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {plannerSnapshot.criticalCount}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Proximos dias
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {plannerSnapshot.pendingCount}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Concluidos no radar
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {plannerSnapshot.completedCount}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {plannerSnapshot.todayCount} bloco(s) entram no recorte de hoje.
            </p>
          </div>
        </div>
      ) : null}

      <div
        data-testid="weekly-load-summary"
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              {plannerCopy.summaryEyebrow}
            </p>
            <p
              data-testid="weekly-load-summary-copy"
              className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              {weeklyLoadSummary.summaryCopy}
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Media de {Math.round(weeklyLoadSummary.averageMinutes)} min por dia ativo
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {visibleDays.map((day) => (
          (() => {
            const load = loadByDate.get(day.date);
            const loadMeta = load ? LOAD_LEVEL_META[load.level] : null;
            const canRebalance = Boolean(day.isActive && rebalancingSuggestions[day.date]);
            const canReinforce = Boolean(day.isActive && reinforcementSuggestions[day.date]);
            const orderedItems = [...day.items].sort((left, right) =>
              getOperationalItemWeight(left) - getOperationalItemWeight(right)
              || normalizeSubjectLabel(left.subject, 'Outra').localeCompare(normalizeSubjectLabel(right.subject, 'Outra'))
            );
            const criticalItemsCount = orderedItems.filter((item) => item.status === 'overdue' || (item.status === 'pending' && item.priority === 'alta')).length;
            const queuedItemsCount = orderedItems.filter((item) => item.status === 'pending' && item.priority !== 'alta').length;
            const completedItemsCount = orderedItems.filter((item) => item.status === 'completed').length;
            const visibleItems = expandedDaysByDate[day.date] ? orderedItems : orderedItems.slice(0, 2);
            const dayLabel = day.isToday ? 'Hoje' : day.offsetDays === 1 ? 'Amanha' : 'Proximos';
            const shouldHighlightDay = plannerVariant === 'faculdade' && criticalItemsCount > 0;

            return (
              <article
                key={day.date}
                data-testid="upcoming-schedule-day"
                data-day-offset={day.offsetDays}
                className={`rounded-3xl border p-4 ${
                  shouldHighlightDay
                    ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/20'
                    : 'border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        D+{day.offsetDays}
                      </p>
                      {plannerVariant === 'faculdade' ? (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          shouldHighlightDay
                            ? 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                            : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                        }`}>
                          {dayLabel}
                        </span>
                      ) : null}
                    </div>
                    <h4 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                      {WEEKDAY_LABELS[day.weekday]}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatDateLabel(day.date)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditDay(day.weekday)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Ajustar
                  </button>
                </div>

                {load && loadMeta ? (
                  <div
                    data-testid="upcoming-schedule-day-load"
                    className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-900/80"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {load.totalMinutes} min • {load.sessions} {load.sessions === 1 ? 'sessao' : 'sessoes'}
                        </p>
                        <p
                          data-testid="upcoming-schedule-day-load-message"
                          className="mt-1 text-xs text-slate-500 dark:text-slate-400"
                        >
                          {loadMeta.message}
                        </p>
                      </div>
                      <span
                        data-testid="upcoming-schedule-day-level"
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${loadMeta.tone}`}
                      >
                        {loadMeta.label}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        data-testid="upcoming-schedule-day-load-bar"
                        className={`h-full rounded-full transition-all ${loadMeta.barTone}`}
                        style={{ width: `${Math.max(load.totalMinutes > 0 ? 8 : 0, Math.round(load.ratio * 100))}%` }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canRebalance ? (
                        <button
                          data-testid="schedule-day-rebalance-cta"
                          type="button"
                          onClick={() => onRebalanceDay(day.date)}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
                        >
                          <SkipForward className="h-3.5 w-3.5" />
                          Aliviar dia
                        </button>
                      ) : null}
                      {canReinforce ? (
                        <button
                          data-testid="schedule-day-reinforce-cta"
                          type="button"
                          onClick={() => onReinforceDay(day.date)}
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                        >
                          <ChevronsUp className="h-3.5 w-3.5" />
                          Reforcar dia
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {plannerVariant === 'faculdade' ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                      Fazer agora {criticalItemsCount}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200">
                      Proximos {queuedItemsCount}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                      Concluidos {completedItemsCount}
                    </span>
                  </div>
                ) : null}

                <div className="mt-3">
                  <button
                    data-testid="schedule-day-add-manual-cta"
                    type="button"
                    onClick={() => toggleManualComposer(day.date)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Adicionar sessao
                  </button>
                </div>

                {manualComposerByDate[day.date] ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-900/80">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Nova sessao manual
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <input
                        data-testid="schedule-day-manual-subject-input"
                        value={getManualDraft(day.date).subject}
                        onChange={(event) => updateManualDraft(day.date, { subject: event.target.value })}
                        list="schedule-manual-subject-options"
                        placeholder="Disciplina"
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                      <div className="flex flex-wrap gap-2">
                        {QUICK_DURATION_OPTIONS.map((durationOption) => (
                          <button
                            key={`${day.date}-manual-${durationOption}`}
                            data-testid={`schedule-day-manual-duration-${durationOption}-cta`}
                            type="button"
                            onClick={() => updateManualDraft(day.date, { durationMinutes: durationOption })}
                            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                              getManualDraft(day.date).durationMinutes === durationOption
                                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            {durationOption} min
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          data-testid="schedule-day-manual-submit-cta"
                          type="button"
                          disabled={!getManualDraft(day.date).subject.trim()}
                          onClick={() => {
                            const draft = getManualDraft(day.date);
                            if (!draft.subject.trim()) {
                              return;
                            }

                            onCreateManualEntry(day.date, {
                              subject: draft.subject.trim(),
                              durationMinutes: draft.durationMinutes,
                            });
                            setManualDraftsByDate((current) => ({
                              ...current,
                              [day.date]: {
                                subject: '',
                                durationMinutes: defaultSessionDurationMinutes,
                              },
                            }));
                            setManualComposerByDate((current) => ({
                              ...current,
                              [day.date]: false,
                            }));
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          Salvar sessao
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleManualComposer(day.date)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

            {day.items.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                <p>Nenhum item planejado para esse dia ainda.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {onStartOfficialStudy ? (
                    <button
                      data-testid="upcoming-schedule-empty-cta"
                      type="button"
                      onClick={onStartOfficialStudy}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      {emptyActionLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {visibleItems.map((item) => {
                  const statusMeta = STATUS_META[item.status];
                  const selectedMoveTarget = moveTargets[item.id] ?? '';
                  const moveOptions = moveOptionsByDay[day.date] ?? [];
                  const reasonCopy = item.reason ? mapReasonSummaryToCopy(item.reason) : null;
                  const currentDurationMinutes = item.durationMinutes ?? defaultSessionDurationMinutes;
                  const isCriticalItem =
                    plannerVariant === 'faculdade'
                    && (item.status === 'overdue' || (item.status === 'pending' && item.priority === 'alta'));
                  const isCompletedItem = plannerVariant === 'faculdade' && item.status === 'completed';

                  return (
                    <div
                      key={item.id}
                      data-testid="upcoming-schedule-item"
                      data-item-id={item.id}
                      data-item-status={item.status}
                      data-item-source={item.source}
                      data-item-subject={item.subject}
                      className={`rounded-2xl border p-4 shadow-sm ${
                        isCriticalItem
                          ? 'border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/20'
                          : isCompletedItem
                            ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                    <div className="flex flex-col gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isCriticalItem ? (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                              Fazer agora
                            </span>
                          ) : null}
                          <p className="max-w-full truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={normalizeSubjectLabel(item.subject, 'Outra')}>
                            {truncatePresentationLabel(item.subject, 20, 'Outra')}
                          </p>
                          <span
                            data-testid="schedule-item-status"
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.tone}`}
                          >
                            {statusMeta.icon}
                            {statusMeta.label}
                          </span>
                        </div>
                        <p
                          className="mt-2 max-w-full truncate text-sm text-slate-600 dark:text-slate-400"
                          title={normalizePresentationLabel(item.topic || 'Topico alinhado ao plano semanal', 'Topico alinhado ao plano semanal')}
                        >
                          {truncatePresentationLabel(item.topic || 'Topico alinhado ao plano semanal', 34, 'Topico alinhado ao plano semanal')}
                        </p>
                      </div>
                      {onStartOfficialStudy ? (
                        <button
                          data-testid="upcoming-schedule-item-cta"
                          type="button"
                          onClick={onStartOfficialStudy}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 xl:w-auto xl:self-start dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          {itemActionLabel}
                        </button>
                      ) : null}
                    </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                        {getStudyTypeLabel(item.studyType)}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                        {item.source === 'entry' ? 'Bloco real' : 'Plano semanal'}
                      </span>
                      {item.priority === 'alta' ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                          Prioridade alta
                        </span>
                      ) : null}
                      {item.startTime ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                          {item.startTime} {item.endTime ? `- ${item.endTime}` : ''}
                        </span>
                      ) : null}
                      </div>

                      {reasonCopy ? (
                        <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-300">{reasonCopy}</p>
                      ) : item.note ? (
                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{item.note}</p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          data-testid="schedule-item-duration-label"
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {currentDurationMinutes} min
                        </span>
                        {QUICK_DURATION_OPTIONS.map((durationOption) => (
                          <button
                            key={`${item.id}-duration-${durationOption}`}
                            data-testid={`schedule-item-duration-${durationOption}-cta`}
                            type="button"
                            onClick={() => onUpdateItemDuration(item, day.date, durationOption)}
                            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                              currentDurationMinutes === durationOption
                                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            {durationOption} min
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          data-testid="schedule-item-prioritize-cta"
                          type="button"
                          onClick={() => onPrioritizeItem(item, day.date)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <ChevronsUp className="h-3.5 w-3.5" />
                          Priorizar
                        </button>
                        <button
                          data-testid="schedule-item-postpone-cta"
                          type="button"
                          onClick={() => onPostponeItem(item, day.date)}
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                        >
                          <SkipForward className="h-3.5 w-3.5" />
                          Adiar
                        </button>
                        <button
                          data-testid="schedule-item-move-up-cta"
                          type="button"
                          onClick={() => onReorderItem(item, day.date, 'up')}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          ↑ Subir
                        </button>
                        <button
                          data-testid="schedule-item-move-down-cta"
                          type="button"
                          onClick={() => onReorderItem(item, day.date, 'down')}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          ↓ Descer
                        </button>
                      </div>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <select
                          data-testid="schedule-item-reschedule-select"
                          value={selectedMoveTarget}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setMoveTargets((current) => ({
                              ...current,
                              [item.id]: nextValue,
                            }));
                          }}
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <option value="">Escolher novo dia</option>
                          {moveOptions.map((targetDay) => (
                            <option key={`${item.id}-${targetDay.date}`} value={targetDay.date}>
                              {formatMoveOptionLabel(targetDay)}
                            </option>
                          ))}
                        </select>
                        <button
                          data-testid="schedule-item-reschedule-cta"
                          type="button"
                          disabled={!selectedMoveTarget}
                          onClick={() => {
                            if (!selectedMoveTarget) {
                              return;
                            }

                            onMoveItem(item, day.date, selectedMoveTarget);
                            setMoveTargets((current) => ({
                              ...current,
                              [item.id]: '',
                            }));
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          Remarcar
                        </button>
                      </div>
                    </div>
                  );
                })}
                {orderedItems.length > 2 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedDaysByDate((current) => ({
                        ...current,
                        [day.date]: !current[day.date],
                      }))
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {expandedDaysByDate[day.date] ? 'Ver menos itens' : `Ver mais ${orderedItems.length - visibleItems.length} itens`}
                    {expandedDaysByDate[day.date] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                ) : null}
              </div>
            )}
              </article>
            );
          })()
        ))}
      </div>

      <datalist id="schedule-manual-subject-options">
        {availableSubjectOptions.map((label) => (
          <option key={label} value={normalizeSubjectLabel(label, label)} />
        ))}
      </datalist>
    </section>
  );
};

export default UpcomingOperationalSchedule;
