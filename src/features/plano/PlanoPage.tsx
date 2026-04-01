import React, { Suspense } from 'react';
import { Clock3, Layers3, Target } from 'lucide-react';
import { LoadBalancePanel } from '../../components/Planning/LoadBalancePanel';
import { WorkspaceLayout } from '../../components/Workspace/WorkspaceLayout';
import type { ScheduleEntry, StudyContextForToday, Weekday, WeeklyStudySchedule } from '../../types';
import { usePlano } from './hooks/usePlano';
import { PlanDistributionPanel } from './components/PlanDistributionPanel';
import { PlanNextStepsPanel } from './components/PlanNextStepsPanel';
import { PlanoHeader } from './components/PlanoHeader';
import { RebalanceButton } from './components/RebalanceButton';
import {
  buildPlanoTrackPresentation,
  type PlanoTrackContext,
} from './planoTrackPresentation';

export interface PlanoPageProps {
  darkMode?: boolean;
  weeklySchedule: WeeklyStudySchedule;
  studyContextForToday: StudyContextForToday;
  weeklyCompletedSessions: number;
  weeklyPlannedSessions: number;
  todayCompletedSessions: number;
  currentBlockLabel: string;
  currentBlockObjective?: string;
  currentBlockDurationMinutes: number;
  scheduleEntries?: ScheduleEntry[];
  onStartStudy: () => void;
  onEditDay?: (day: Weekday) => void;
  calendar: React.ReactNode;
  profileContext?: PlanoTrackContext | null;
}

export const PlanoPage: React.FC<PlanoPageProps> = ({
  darkMode = false,
  weeklySchedule,
  studyContextForToday,
  weeklyCompletedSessions,
  weeklyPlannedSessions,
  todayCompletedSessions,
  currentBlockLabel,
  currentBlockObjective,
  currentBlockDurationMinutes,
  scheduleEntries,
  onStartStudy,
  onEditDay,
  calendar,
  profileContext = null,
}) => {
  const plano = usePlano({
    weeklySchedule,
    studyContextForToday,
    weeklyCompletedSessions,
    weeklyPlannedSessions,
    todayCompletedSessions,
    currentBlockLabel,
    currentBlockObjective,
    currentBlockDurationMinutes,
    scheduleEntries,
  });
  const rebalanceDay = plano.recommendedEditDay;
  const supportBlockRef = React.useRef<HTMLElement | null>(null);
  const presentation = React.useMemo(
    () => buildPlanoTrackPresentation({
      plan: plano,
      currentBlockLabel,
      weeklyCompletedSessions,
      weeklyPlannedSessions,
      context: profileContext,
    }),
    [currentBlockLabel, plano, profileContext, weeklyCompletedSessions, weeklyPlannedSessions],
  );
  const summaryCardIcons = {
    load: Clock3,
    subjects: Layers3,
    cycle: Target,
  } as const;
  const handleAdjustPlan = React.useCallback(() => {
    if (rebalanceDay && onEditDay) {
      onEditDay(rebalanceDay);
    }
  }, [onEditDay, rebalanceDay]);
  const handleViewCalendar = React.useCallback(() => {
    supportBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="space-y-4 lg:space-y-5">
      <PlanoHeader
        darkMode={darkMode}
        eyebrow={presentation.header.eyebrow}
        title={presentation.header.title}
        contextLine={presentation.header.contextLine}
        statusLine={presentation.header.statusLine}
        metrics={presentation.header.metrics}
        onAdjustPlan={rebalanceDay && onEditDay ? handleAdjustPlan : undefined}
        onViewCalendar={handleViewCalendar}
      />

      <section
        data-testid="plan-summary-strip"
        className="grid gap-2.5 lg:grid-cols-3"
      >
        {presentation.summaryCards.map((card) => {
          const Icon = summaryCardIcons[card.id];
          return (
            <article
              key={card.id}
              data-testid={`plan-summary-${card.id}`}
              className={`rounded-[22px] border p-3.5 shadow-[0_10px_20px_rgba(15,23,42,0.035)] ${
                darkMode
                  ? 'border-slate-800 bg-slate-950/82 text-slate-100 shadow-[0_10px_20px_rgba(2,6,23,0.26)]'
                  : 'border-slate-200/80 bg-slate-50/82 text-slate-900 shadow-[0_10px_20px_rgba(148,163,184,0.08)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
                    darkMode ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    {card.eyebrow}
                  </p>
                  <h2
                    className={`mt-1.5 truncate text-[20px] font-black tracking-[-0.04em] ${
                      darkMode ? 'text-slate-100' : 'text-slate-900'
                    }`}
                    title={card.value}
                  >
                    {card.value}
                  </h2>
                </div>
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-[18px] ${
                  darkMode
                    ? 'bg-slate-900 text-slate-300'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className={`mt-2.5 text-sm ${
                darkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                {card.detail}
              </p>
              <p className={`mt-1 text-[13px] ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {card.support}
              </p>
            </article>
          );
        })}
      </section>

      <WorkspaceLayout
        contentClassName="space-y-5"
        rightPanel={(
          <div data-testid="plan-next-steps-column" className="space-y-4">
            <PlanNextStepsPanel
              darkMode={darkMode}
              eyebrow={presentation.nextSteps.copy.eyebrow}
              title={presentation.nextSteps.copy.title}
              description={presentation.nextSteps.copy.description}
              items={presentation.nextSteps.items}
            />

            <LoadBalancePanel
              darkMode={darkMode}
              todayStatus={plano.todayStatus}
              averageDailyMinutes={plano.averageDailyMinutes}
              activeDays={plano.activeDays}
              uniqueSubjects={plano.uniqueSubjects}
              todayCompletedSessions={todayCompletedSessions}
              currentBlockLabel={currentBlockLabel}
              heaviestDay={plano.heaviestDay}
              lightestDay={plano.lightestDay}
              onStartStudy={onStartStudy}
              copy={presentation.loadBalance}
            />

            <RebalanceButton
              label={presentation.rebalance.label}
              description={presentation.rebalance.description}
              onClick={rebalanceDay && onEditDay ? () => onEditDay(rebalanceDay) : undefined}
              disabled={!rebalanceDay || !onEditDay}
            />
          </div>
        )}
      >
        <div data-testid="plan-distribution-block">
          <PlanDistributionPanel
            darkMode={darkMode}
            eyebrow={presentation.distribution.copy.eyebrow}
            title={presentation.distribution.copy.title}
            description={presentation.distribution.copy.description}
            footer={presentation.distribution.copy.footer}
            items={presentation.distribution.items}
          />
        </div>

        <section
          ref={supportBlockRef}
          data-testid="plan-support-block"
          className={`space-y-3 rounded-[26px] border p-4 shadow-[0_12px_26px_rgba(15,23,42,0.04)] ${
            darkMode
              ? 'border-slate-800 bg-slate-950/70 shadow-[0_12px_26px_rgba(2,6,23,0.28)]'
              : 'border-slate-200/80 bg-slate-50/72 shadow-[0_12px_26px_rgba(148,163,184,0.08)]'
          }`}
        >
          <div className="space-y-2 px-1">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {presentation.support.label}
            </p>
            <h2 className={`text-[24px] font-black tracking-[-0.04em] ${
              darkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              {presentation.support.title}
            </h2>
            <p className={`max-w-3xl text-sm ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {presentation.support.description}
            </p>
          </div>

          <div className="min-w-0 rounded-[22px] border border-slate-200/70 bg-white/65 p-1.5 dark:border-slate-800/70 dark:bg-slate-950/55">
            <Suspense fallback={<div className="py-6 text-center text-sm text-slate-500">Carregando cronograma...</div>}>
              {calendar}
            </Suspense>
          </div>
        </section>
      </WorkspaceLayout>
    </div>
  );
};

export default PlanoPage;
