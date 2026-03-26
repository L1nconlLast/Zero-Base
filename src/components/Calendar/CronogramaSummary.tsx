import React from 'react';
import { Clock3, Layers3, Sparkles, Target } from 'lucide-react';
import type { TodayStudyState } from '../../types';
import type { RecentPaceState, WeeklyConfidenceState } from '../../services/studySchedule.service';

interface CronogramaSummaryProps {
  activeDaysCount: number;
  plannedSubjectsCount: number;
  defaultSessionDuration: number;
  todayState: TodayStudyState;
  todayContextLabel?: string;
  weeklyCompletedSessions: number;
  weeklyGoalSessions?: number;
  weeklyPlanConfidenceState: WeeklyConfidenceState;
  recentPaceState?: RecentPaceState;
  onAutoAdjust?: () => void;
}

const getTodaySummaryLabel = (todayState: TodayStudyState): string => {
  if (todayState.type === 'planned') return 'Planejado';
  if (todayState.type === 'inactive') return 'Sem estudo';
  return 'Sem disciplinas';
};

const getConfidenceLabel = (state: WeeklyConfidenceState): string => {
  if (state === 'on_track') return 'Voce esta no ritmo do seu plano';
  if (state === 'below_pace') return 'Seu plano pode ser ajustado ao seu ritmo';
  return 'Voce ainda nao comecou essa semana';
};

const getConfidenceTone = (state: WeeklyConfidenceState): string => {
  if (state === 'below_pace') return 'text-amber-700 dark:text-amber-300';
  if (state === 'on_track') return 'text-emerald-700 dark:text-emerald-300';
  return 'text-slate-500 dark:text-slate-400';
};

const getRecentPaceHint = (state?: RecentPaceState): string | null => {
  if (state === 'falling_behind') return 'Quer redistribuir para facilitar essa semana?';
  if (state === 'inactive_streak') return 'Quer reorganizar para recomecar leve esta semana?';
  return null;
};

const summaryCards = (
  activeDaysCount: number,
  plannedSubjectsCount: number,
  defaultSessionDuration: number,
  todayState: TodayStudyState,
  todayContextLabel?: string,
) => [
  {
    label: 'Dias ativos',
    value: String(activeDaysCount),
    hint: 'dias com estudo habilitado',
    icon: Layers3,
  },
  {
    label: 'Disciplinas planejadas',
    value: String(plannedSubjectsCount),
    hint: 'alocacoes na semana',
    icon: Target,
  },
  {
    label: 'Duracao padrao',
    value: `${defaultSessionDuration} min`,
    hint: 'tempo base por sessao',
    icon: Clock3,
  },
  {
    label: 'Hoje',
    value: getTodaySummaryLabel(todayState),
    hint: todayContextLabel || 'leitura rapida do dia',
    icon: Sparkles,
  },
];

const CronogramaSummary: React.FC<CronogramaSummaryProps> = ({
  activeDaysCount,
  plannedSubjectsCount,
  defaultSessionDuration,
  todayState,
  todayContextLabel,
  weeklyCompletedSessions,
  weeklyGoalSessions,
  weeklyPlanConfidenceState,
  recentPaceState = 'on_track',
  onAutoAdjust,
}) => {
  const recentPaceHint = getRecentPaceHint(recentPaceState);
  const shouldOfferAutoAdjust =
    Boolean(onAutoAdjust) && (weeklyPlanConfidenceState === 'below_pace' || recentPaceState !== 'on_track');
  const shouldPrioritizeRecentPace = recentPaceState !== 'on_track' && Boolean(recentPaceHint);

  return (
  <section className="space-y-3">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards(activeDaysCount, plannedSubjectsCount, defaultSessionDuration, todayState, todayContextLabel).map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {card.value}
                </p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{card.hint}</p>
          </div>
        );
      })}
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Progresso da semana
          </p>
          {shouldPrioritizeRecentPace ? (
            <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              {recentPaceHint}
            </p>
          ) : null}
          <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            {weeklyGoalSessions
              ? `${weeklyCompletedSessions} de ${weeklyGoalSessions} sessoes concluidas esta semana`
              : `${weeklyCompletedSessions} sessoes concluidas esta semana`}
          </p>
          <p className={`${shouldPrioritizeRecentPace ? 'mt-1 text-xs text-slate-500 dark:text-slate-400' : `mt-1 text-sm ${getConfidenceTone(weeklyPlanConfidenceState)}`}`}>
            {getConfidenceLabel(weeklyPlanConfidenceState)}
          </p>
          {!shouldPrioritizeRecentPace && recentPaceHint ? (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {recentPaceHint}
            </p>
          ) : null}
          {shouldOfferAutoAdjust && onAutoAdjust ? (
            <button
              type="button"
              onClick={onAutoAdjust}
              className="mt-1 text-sm font-medium text-sky-600 transition hover:underline dark:text-sky-400"
            >
              Me ajudar a reorganizar
            </button>
          ) : null}
        </div>
        {weeklyGoalSessions ? (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {Math.min(100, Math.round((weeklyCompletedSessions / weeklyGoalSessions) * 100))}%
          </span>
        ) : null}
      </div>

      {weeklyGoalSessions ? (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-300"
            style={{
              width: `${Math.min(100, (weeklyCompletedSessions / weeklyGoalSessions) * 100)}%`,
            }}
          />
        </div>
      ) : null}
    </div>
  </section>
  );
};

export default CronogramaSummary;
