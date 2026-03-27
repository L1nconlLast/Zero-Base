import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
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

interface UpcomingOperationalScheduleProps {
  days: OperationalScheduleWindowDay[];
  weeklyLoadSummary: WeeklyLoadSummary;
  availableSubjectOptions: string[];
  defaultSessionDurationMinutes: number;
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

interface ManualEntryDraft {
  subject: string;
  durationMinutes: number;
}

const UpcomingOperationalSchedule: React.FC<UpcomingOperationalScheduleProps> = ({
  days,
  weeklyLoadSummary,
  availableSubjectOptions,
  defaultSessionDurationMinutes,
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

  return (
    <section
      data-testid="upcoming-schedule-panel"
      className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
    >
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Semana operacional
        </p>
        <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
          Transforme os proximos dias em uma fila viva de estudo
        </h3>
      </div>
      <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
        Cada item usa o mesmo loop oficial para manter cronograma, home e progresso no mesmo trilho.
      </p>
    </div>

      <div
        data-testid="weekly-load-summary"
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Leitura da semana
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
        {days.map((day) => (
          (() => {
            const load = loadByDate.get(day.date);
            const loadMeta = load ? LOAD_LEVEL_META[load.level] : null;
            const canRebalance = Boolean(day.isActive && rebalancingSuggestions[day.date]);
            const canReinforce = Boolean(day.isActive && reinforcementSuggestions[day.date]);

            return (
              <article
                key={day.date}
                data-testid="upcoming-schedule-day"
                data-day-offset={day.offsetDays}
                className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30"
              >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                D+{day.offsetDays}
              </p>
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
                {day.items.map((item) => {
                  const statusMeta = STATUS_META[item.status];
                  const selectedMoveTarget = moveTargets[item.id] ?? '';
                  const moveOptions = moveOptionsByDay[day.date] ?? [];
                  const reasonCopy = item.reason ? mapReasonSummaryToCopy(item.reason) : null;
                  const currentDurationMinutes = item.durationMinutes ?? defaultSessionDurationMinutes;

                  return (
                    <div
                      key={item.id}
                      data-testid="upcoming-schedule-item"
                      data-item-id={item.id}
                      data-item-status={item.status}
                      data-item-source={item.source}
                      data-item-subject={item.subject}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.subject}</p>
                          <span
                            data-testid="schedule-item-status"
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.tone}`}
                          >
                            {statusMeta.icon}
                            {statusMeta.label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          {item.topic || 'Topico alinhado ao plano semanal'}
                        </p>
                      </div>
                      {onStartOfficialStudy ? (
                        <button
                          data-testid="upcoming-schedule-item-cta"
                          type="button"
                          onClick={onStartOfficialStudy}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
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
              </div>
            )}
              </article>
            );
          })()
        ))}
      </div>

      <datalist id="schedule-manual-subject-options">
        {availableSubjectOptions.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>
    </section>
  );
};

export default UpcomingOperationalSchedule;
