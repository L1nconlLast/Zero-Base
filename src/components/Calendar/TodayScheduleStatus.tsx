import React from 'react';
import { ArrowRight, CalendarDays, ListTodo, Sparkles } from 'lucide-react';
import type { TodayStudyState } from '../../types';
import {
  hideSuggestedAdjustmentForToday,
  shouldShowSuggestedAdjustment,
} from '../../services/studySchedule.service';
import type { RecentPaceState, SuggestedAdjustment } from '../../services/studySchedule.service';
import { normalizeSubjectLabel } from '../../utils/uiLabels';

interface TodayScheduleStatusProps {
  todayState: TodayStudyState;
  todayCompletedSessions: number;
  enrichedSubjectLabels?: string[];
  suggestedTopicCopy?: string;
  planConfidenceHint?: string;
  recentPaceState?: RecentPaceState;
  suggestedAdjustment?: SuggestedAdjustment;
  onAdjustSchedule: () => void;
  onDefineSubjects: () => void;
  onSuggestedAdjustment?: (suggestion: Exclude<SuggestedAdjustment, null>) => void;
}

const TodayScheduleStatus: React.FC<TodayScheduleStatusProps> = ({
  todayState,
  todayCompletedSessions,
  enrichedSubjectLabels,
  suggestedTopicCopy,
  planConfidenceHint,
  recentPaceState,
  suggestedAdjustment,
  onAdjustSchedule,
  onDefineSubjects,
  onSuggestedAdjustment,
}) => {
  const [isSuggestionVisible, setIsSuggestionVisible] = React.useState(false);

  React.useEffect(() => {
    if (!recentPaceState || !suggestedAdjustment) {
      setIsSuggestionVisible(false);
      return;
    }

    setIsSuggestionVisible(shouldShowSuggestedAdjustment(recentPaceState, new Date()));
  }, [recentPaceState, suggestedAdjustment]);

  const handleDismissSuggestion = React.useCallback(() => {
    if (!recentPaceState) {
      return;
    }

    hideSuggestedAdjustmentForToday(recentPaceState, new Date());
    setIsSuggestionVisible(false);
  }, [recentPaceState]);

  if (todayState.type === 'planned') {
    const effectiveLabels = enrichedSubjectLabels?.length
      ? enrichedSubjectLabels
      : todayState.subjectLabels;
    const normalizedLabels = effectiveLabels.map((label) => normalizeSubjectLabel(label, 'Outra'));
    const shouldShowSuggestedTopicCopy = Boolean(suggestedTopicCopy) && effectiveLabels.length === 1;
    const shouldShowPrimaryAdjustAction = !(suggestedAdjustment && recentPaceState !== 'on_track' && isSuggestionVisible);

    return (
      <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
              Hoje
            </p>
            <h3 className="mt-2 text-xl font-bold text-emerald-950 dark:text-emerald-100">
              Seu estudo de hoje ja esta definido
            </h3>
            <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
              Hoje voce vai estudar: {normalizedLabels.join(', ')}.
            </p>
            {shouldShowSuggestedTopicCopy ? (
              <p className="mt-1 text-xs text-emerald-900/60 dark:text-emerald-100/60">
                {suggestedTopicCopy}.
              </p>
            ) : null}
            <p className="mt-1 text-sm text-emerald-900/70 dark:text-emerald-100/70">
              {todayCompletedSessions > 0
                ? `${todayCompletedSessions} sess${todayCompletedSessions > 1 ? 'oes' : 'ao'} concluida${todayCompletedSessions > 1 ? 's' : ''} hoje`
                : 'Nenhuma sessao concluida hoje ainda'}
            </p>
            {planConfidenceHint ? (
              <p className="mt-2 text-sm font-medium text-emerald-900/80 dark:text-emerald-100/80">
                {planConfidenceHint}
              </p>
            ) : null}
            {suggestedAdjustment && recentPaceState !== 'on_track' && isSuggestionVisible ? (
              <div className="mt-3 inline-flex max-w-xl items-center gap-3 rounded-2xl border border-emerald-200/80 bg-white/80 px-3 py-3 text-left shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/40">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-emerald-950/80 dark:text-emerald-100/90">
                    {suggestedAdjustment.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDismissSuggestion}
                  className="shrink-0 rounded-xl px-3 py-2 text-sm text-emerald-800/50 transition hover:bg-emerald-100 hover:text-emerald-900 dark:text-emerald-100/50 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-100"
                >
                  Agora não
                </button>
                <button
                  type="button"
                  onClick={() => onSuggestedAdjustment?.(suggestedAdjustment)}
                  className="shrink-0 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-50 dark:hover:bg-emerald-900/60"
                >
                  {suggestedAdjustment.actionLabel}
                </button>
              </div>
            ) : null}
          </div>

          {shouldShowPrimaryAdjustAction ? (
            <button
              type="button"
              onClick={onAdjustSchedule}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100 dark:hover:bg-emerald-900/60"
            >
              <CalendarDays className="h-4 w-4" />
              Me ajudar a reorganizar
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (todayState.type === 'inactive') {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Hoje
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              Hoje esta livre no seu cronograma
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Dia desativado. Este dia nao entra no seu plano ate voce reativar no cronograma.
            </p>
          </div>

          <button
            type="button"
            onClick={onAdjustSchedule}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <ArrowRight className="h-4 w-4" />
            Abrir cronograma
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/30 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
            Hoje
          </p>
          <h3 className="mt-2 text-xl font-bold text-amber-950 dark:text-amber-100">
            Hoje esta ativo, mas sem disciplinas definidas
          </h3>
          <p className="mt-2 text-sm text-amber-900/80 dark:text-amber-100/80">
            Nenhuma disciplina definida. Defina para este dia entrar no seu plano.
          </p>
        </div>

        <button
          type="button"
          onClick={onDefineSubjects}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <ListTodo className="h-4 w-4" />
          Definir disciplinas
        </button>
      </div>
    </section>
  );
};

export default TodayScheduleStatus;
