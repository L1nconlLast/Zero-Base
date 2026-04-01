import React from 'react';
import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  Clock3,
  Flame,
  Layers3,
  Target,
} from 'lucide-react';
import {
  normalizePresentationLabel,
  normalizeSubjectLabel,
  truncatePresentationLabel,
} from '../../utils/uiLabels';
import { getSubjectPalette } from '../../utils/subjectPalette';
import { buildWeeklyStudySnapshot } from '../../utils/weeklyStudySnapshot';
import { resolveTrackedDisciplineLabel } from '../../utils/disciplineLabels';
import { NextStepHero } from './NextStepHero';
import { WorkspaceLayout } from '../Workspace/WorkspaceLayout';
import { buildHomeTodayState } from './homeTodayState';
import { applyHomeTodayCompletionSignal } from './homeTodayCompletionSignal';
import { buildHomeTodayPresentation, type HomeTrackContext } from './homeTodayPresentation';
import type { HomeWorkspacePageProps } from './homeWorkspaceTypes';

type SubjectProgress = {
  name: string;
  minutes: number;
  progress: number;
  colorHex: string;
};

const MAX_SUBJECT_SLICES = 5;

const formatReviewCount = (value: number, singular: string, plural: string) =>
  `${value} ${value === 1 ? singular : plural}`;

const buildWeekSeries = (sessions: HomeWorkspacePageProps['sessions']) => {
  const snapshot = buildWeeklyStudySnapshot(sessions);
  return snapshot.daily.map((day) => ({
    key: day.dateKey,
    label: day.shortLabel.toUpperCase(),
    isToday: day.isToday,
    value: day.minutes,
  }));
};

const buildSubjectProgress = (
  sessions: HomeWorkspacePageProps['sessions'],
  preferredTrack: NonNullable<HomeWorkspacePageProps['preferredTrack']>,
  hybridEnemWeight: number,
): SubjectProgress[] => {
  const snapshot = buildWeeklyStudySnapshot(sessions);
  const totals = snapshot.subjectBreakdown.reduce<Record<string, number>>((acc, entry) => {
    const subject = resolveTrackedDisciplineLabel(String(entry.subject || ''), preferredTrack, hybridEnemWeight);
    acc[subject] = (acc[subject] || 0) + entry.minutes;
    return acc;
  }, {});

  const sortedEntries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const entries: Array<[string, number]> = sortedEntries.length > MAX_SUBJECT_SLICES
    ? [
        ...sortedEntries.slice(0, MAX_SUBJECT_SLICES - 1),
        ['Outros', sortedEntries.slice(MAX_SUBJECT_SLICES - 1).reduce((sum, [, minutes]) => sum + minutes, 0)],
      ]
    : sortedEntries;

  if (!entries.length) {
    return [
      { name: 'Matematica', minutes: 68, progress: 68, colorHex: getSubjectPalette('Matematica').hex },
      { name: 'Portugues', minutes: 54, progress: 54, colorHex: getSubjectPalette('Portugues').hex },
      { name: 'Biologia', minutes: 41, progress: 41, colorHex: getSubjectPalette('Biologia').hex },
      { name: 'Historia', minutes: 33, progress: 33, colorHex: getSubjectPalette('Historia').hex },
    ];
  }

  const maxMinutes = entries[0]?.[1] || 1;
  return entries.map(([name, minutes]) => ({
    name,
    minutes,
    progress: Math.max(18, Math.round((minutes / maxMinutes) * 100)),
    colorHex: getSubjectPalette(name).hex,
  }));
};

export const HomeWorkspacePageV2: React.FC<HomeWorkspacePageProps> = ({
  darkMode = false,
  preferredTrack = 'enem',
  hybridEnemWeight = 70,
  profileContext = null,
  userName,
  todayMinutes,
  dailyGoalMinutes,
  currentStreak,
  weeklyCompletedSessions,
  weeklyPlannedSessions,
  completedContentCount,
  syncStatusLabel,
  syncStatusTone = 'neutral',
  sessions,
  officialStudyCard,
  reviewQueueItems = [],
  reviewQueueState,
  nextSessionCommit = null,
  continuationMission = null,
  completionSignal = null,
  onStartStudy,
  onOpenPlanning,
  onOpenReviews,
  onOpenStatistics,
  onConsumeCompletionSignal,
}) => {
  const firstName = React.useMemo(() => userName.split(/\s+/).filter(Boolean)[0] || userName, [userName]);
  const normalizedOfficialDiscipline = React.useMemo(
    () => normalizeSubjectLabel(officialStudyCard?.discipline || '', 'Matematica'),
    [officialStudyCard?.discipline],
  );
  const normalizedOfficialTopic = React.useMemo(
    () => normalizePresentationLabel(officialStudyCard?.topic || '', 'Proxima missao'),
    [officialStudyCard?.topic],
  );
  const weekSeries = React.useMemo(() => buildWeekSeries(sessions), [sessions]);
  const subjectProgress = React.useMemo(
    () => buildSubjectProgress(sessions, preferredTrack, hybridEnemWeight),
    [hybridEnemWeight, preferredTrack, sessions],
  );
  const remainingSessions = Math.max(weeklyPlannedSessions - weeklyCompletedSessions, 0);
  const strongest = subjectProgress[0]?.name || 'Matematica';
  const weakest = subjectProgress[subjectProgress.length - 1]?.name || 'Revisoes';
  const effectiveReviewQueueState = reviewQueueState ?? {
    status: reviewQueueItems.length > 0 ? 'pending_today' as const : 'empty' as const,
    dueTodayCount: reviewQueueItems.length,
    completedTodayCount: 0,
    upcomingCount: 0,
    totalPendingCount: reviewQueueItems.length,
    items: reviewQueueItems,
    nextItem: reviewQueueItems[0] || null,
  };
  const isFirstSessionExperience =
    sessions.length === 0
    && todayMinutes === 0
    && weeklyCompletedSessions === 0
    && completedContentCount === 0;
  const hasVisibleContinuation = Boolean(continuationMission || nextSessionCommit);
  const isActivationHome = isFirstSessionExperience && !hasVisibleContinuation;
  const activeWeekDays = weekSeries.filter((day) => day.value > 0).length;
  const derivedStreak = currentStreak > 0 ? currentStreak : (todayMinutes > 0 || weeklyCompletedSessions > 0 ? 1 : 0);
  const focusSubjects = subjectProgress.slice(0, 2);
  const shellCardClass = darkMode
    ? 'border-slate-800/90 bg-slate-950/90 shadow-[0_18px_36px_rgba(2,6,23,0.42)]'
    : 'border-slate-200/90 bg-white/96 shadow-[0_18px_36px_rgba(15,23,42,0.045)]';
  const mutedCardClass = darkMode
    ? 'border-slate-800/90 bg-slate-950/74'
    : 'border-slate-200/80 bg-slate-50/78';
  const syncToneClass = darkMode
    ? syncStatusTone === 'success'
      ? 'bg-emerald-950/40 text-emerald-200'
      : syncStatusTone === 'warning'
        ? 'bg-amber-950/40 text-amber-200'
        : syncStatusTone === 'danger'
          ? 'bg-rose-950/40 text-rose-200'
          : 'bg-slate-900 text-slate-300'
    : syncStatusTone === 'success'
      ? 'bg-emerald-100 text-emerald-700'
      : syncStatusTone === 'warning'
        ? 'bg-amber-100 text-amber-700'
        : syncStatusTone === 'danger'
          ? 'bg-rose-100 text-rose-700'
          : 'bg-slate-100 text-slate-600';

  const baseHomeTodayState = React.useMemo(
    () =>
      buildHomeTodayState({
        firstName,
        isActivationHome,
        todayMinutes,
        dailyGoalMinutes,
        weeklyCompletedSessions,
        weeklyPlannedSessions,
        reviewQueueState: effectiveReviewQueueState,
        officialStudyCard,
        nextSessionCommit,
        continuationMission,
      }),
    [
      continuationMission,
      dailyGoalMinutes,
      effectiveReviewQueueState,
      firstName,
      isActivationHome,
      nextSessionCommit,
      officialStudyCard,
      todayMinutes,
      weeklyCompletedSessions,
      weeklyPlannedSessions,
    ],
  );
  const homeTodayState = React.useMemo(
    () => applyHomeTodayCompletionSignal(baseHomeTodayState, completionSignal),
    [baseHomeTodayState, completionSignal],
  );
  const effectiveProfileContext = React.useMemo<HomeTrackContext>(
    () => profileContext || {
      profile: (preferredTrack === 'concursos' ? 'concurso' : preferredTrack) as HomeTrackContext['profile'],
    },
    [preferredTrack, profileContext],
  );
  const homeTodayPresentation = React.useMemo(
    () => buildHomeTodayPresentation(homeTodayState, effectiveProfileContext),
    [effectiveProfileContext, homeTodayState],
  );

  const startedWeekDays = Math.max(activeWeekDays, todayMinutes > 0 ? 1 : 0);
  const primaryProgress = homeTodayPresentation.dayStatus;
  const secondaryProgressSignals = [
    {
      id: 'week-progress',
      label: 'Semana',
      value: `${weeklyCompletedSessions}/${Math.max(weeklyPlannedSessions, 1)} blocos`,
      detail: startedWeekDays > 0 ? 'Voce ja colocou a semana em movimento.' : 'Seu ritmo desta semana ainda nao comecou.',
      icon: Clock3,
      iconClass: darkMode ? 'bg-cyan-950/40 text-cyan-200' : 'bg-cyan-50 text-cyan-700',
    },
    {
      id: 'pace-progress',
      label: 'Ritmo',
      value: `${derivedStreak} ${derivedStreak === 1 ? 'dia' : 'dias'}`,
      detail: hasVisibleContinuation
        ? 'Seu proximo passo ja esta pronto.'
        : remainingSessions > 0
          ? `${remainingSessions} blocos ainda faltam na semana.`
          : 'Voce ja fechou a meta da semana.',
      icon: Flame,
      iconClass: darkMode ? 'bg-emerald-950/40 text-emerald-200' : 'bg-emerald-50 text-emerald-700',
    },
  ];

  const supportCards = [
    {
      id: 'planning',
      label: 'Planejamento',
      desc: 'Ajuste a ordem da semana sem sair do foco.',
      icon: CalendarRange,
      actionLabel: 'Abrir plano',
      action: onOpenPlanning,
      iconClass: 'group-hover:text-cyan-500',
    },
    {
      id: 'reviews',
      label: 'Revisoes',
      desc: 'Veja o que nao pode esfriar antes do proximo bloco.',
      icon: Layers3,
      actionLabel: 'Abrir revisoes',
      action: onOpenReviews,
      iconClass: 'group-hover:text-violet-500',
    },
    {
      id: 'statistics',
      label: 'Estatisticas',
      desc: 'Leia o progresso e os ajustes com clareza.',
      icon: Target,
      actionLabel: 'Abrir estatisticas',
      action: onOpenStatistics,
      iconClass: 'group-hover:text-emerald-500',
    },
  ];

  const resolvedSupportCards = supportCards.map((item) =>
    item.id !== 'reviews'
      ? item
      : {
          ...item,
          desc: effectiveReviewQueueState.status === 'pending_today'
            ? `${formatReviewCount(effectiveReviewQueueState.dueTodayCount, 'item pede revisao agora', 'itens pedem revisao agora')}.`
            : effectiveReviewQueueState.status === 'completed_today'
              ? 'As revisoes do dia ja foram concluidas e o proximo ciclo esta organizado.'
              : effectiveReviewQueueState.status === 'upcoming'
                ? 'A proxima revisao ja esta programada sem pendencia para hoje.'
                : 'Nenhuma revisao esta pedindo atencao agora.',
        },
  ).map((item) => ({
    ...item,
    action: () => {
      onConsumeCompletionSignal?.();
      item.action();
    },
  }));

  const runHomePrimaryAction = React.useCallback(() => {
    onConsumeCompletionSignal?.();

    if (homeTodayPresentation.hero.primaryActionTarget === 'reviews') {
      onOpenReviews();
      return;
    }

    if (homeTodayPresentation.hero.primaryActionTarget === 'planning') {
      onOpenPlanning();
      return;
    }

    onStartStudy();
  }, [homeTodayPresentation.hero.primaryActionTarget, onConsumeCompletionSignal, onOpenPlanning, onOpenReviews, onStartStudy]);

  const runHomeContinuityAction = React.useCallback(() => {
    onConsumeCompletionSignal?.();

    if (homeTodayPresentation.continuityPanel.actionTarget === 'reviews') {
      onOpenReviews();
      return;
    }

    if (homeTodayPresentation.continuityPanel.actionTarget === 'planning') {
      onOpenPlanning();
      return;
    }

    onStartStudy();
  }, [homeTodayPresentation.continuityPanel.actionTarget, onConsumeCompletionSignal, onOpenPlanning, onOpenReviews, onStartStudy]);
  const primaryPanelToneClass = darkMode
    ? homeTodayPresentation.tone === 'active'
      ? 'border-amber-900/45 bg-amber-950/12'
      : homeTodayPresentation.tone === 'completed'
        ? 'border-emerald-900/45 bg-emerald-950/12'
        : ''
    : homeTodayPresentation.tone === 'active'
      ? 'border-amber-100/90 bg-amber-50/42'
      : homeTodayPresentation.tone === 'completed'
        ? 'border-emerald-100/90 bg-emerald-50/42'
        : '';
  const supportStripClass = homeTodayPresentation.support.tone === 'quiet'
    ? darkMode
      ? 'border-slate-800/80 bg-slate-950/58'
      : 'border-slate-200/80 bg-slate-50/62'
    : mutedCardClass;
  const supportHeadline = homeTodayPresentation.support.headline || `Mais tracao em ${strongest}. Menos ritmo em ${weakest}.`;
  const supportDetail = homeTodayPresentation.support.detail
    || focusSubjects.map((subject) => `${truncatePresentationLabel(subject.name, 18)} ${subject.progress}%`).join(' | ');

  return (
    <WorkspaceLayout
      contentClassName={isActivationHome ? 'mx-auto max-w-3xl space-y-6' : 'mx-auto max-w-[1100px] space-y-4 xl:space-y-5'}
    >
      <NextStepHero
        darkMode={darkMode}
        mode={homeTodayPresentation.hero.mode}
        tone={homeTodayPresentation.tone}
        eyebrow={homeTodayPresentation.hero.eyebrow}
        testId="study-now-card"
        cardStatus={officialStudyCard?.status || 'loading'}
        studyDiscipline={officialStudyCard?.status === 'ready' ? normalizedOfficialDiscipline : undefined}
        studyTopic={officialStudyCard?.status === 'ready' ? normalizedOfficialTopic : undefined}
        title={homeTodayPresentation.hero.title}
        subtitle={homeTodayPresentation.hero.subtitle}
        insight={homeTodayPresentation.hero.insight}
        supportingText={homeTodayPresentation.hero.supportingText}
        chips={homeTodayPresentation.hero.chips}
        primaryActionLabel={homeTodayPresentation.hero.primaryActionLabel}
        onPrimaryAction={runHomePrimaryAction}
      />

      {isActivationHome ? null : (
        <>
          <section
            data-testid="home-progress-strip"
            className="grid gap-3.5 lg:-mt-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
          >
            <article
              data-testid="home-progress-primary"
              data-priority={homeTodayState.priority}
              data-phase={homeTodayState.phase}
              data-tone={homeTodayPresentation.tone}
              className={`motion-enter rounded-[24px] border p-4.5 sm:p-5 ${mutedCardClass}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {primaryProgress.label}
                  </p>
                  <p className={`mt-2 text-[32px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {primaryProgress.value}
                  </p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${darkMode ? 'bg-violet-950/40 text-violet-200' : 'bg-violet-50 text-violet-700'}`}>
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
              <p className={`mt-3 text-sm leading-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {primaryProgress.detail}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                  darkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600 ring-1 ring-slate-200'
                }`}>
                  {primaryProgress.summary}
                </span>
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                  darkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600 ring-1 ring-slate-200'
                }`}>
                  {primaryProgress.remainder}
                </span>
              </div>
            </article>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {secondaryProgressSignals.map((card) => (
                <article
                  key={card.id}
                  className={`motion-enter rounded-[22px] border p-4 ${mutedCardClass}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {card.label}
                      </p>
                      <p className={`mt-2 text-lg font-bold tracking-[-0.03em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {card.value}
                      </p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.iconClass}`}>
                      <card.icon className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <p className={`mt-3 text-sm leading-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {card.detail}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            data-testid="home-priority-grid"
            className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]"
          >
            <article
              data-testid="home-primary-panel"
              data-priority={homeTodayState.priority}
              data-phase={homeTodayState.phase}
              data-tone={homeTodayPresentation.tone}
              className={`motion-enter overflow-hidden rounded-[28px] border p-5 sm:p-6 ${shellCardClass} ${primaryPanelToneClass}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {homeTodayPresentation.primaryPanel.eyebrow}
                  </p>
                  <h2 className={`mt-2 text-[28px] font-black leading-[1.03] tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {homeTodayPresentation.primaryPanel.title}
                  </h2>
                  <p className={`mt-3 max-w-2xl text-sm leading-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {homeTodayPresentation.primaryPanel.description}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${syncToneClass}`}>
                    {syncStatusLabel}
                  </span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${
                    darkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {homeTodayPresentation.primaryPanel.sessionLabel}
                  </span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${
                    darkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {homeTodayPresentation.primaryPanel.stateBadgeLabel}
                  </span>
                </div>
              </div>

              <div className={`mt-5 rounded-[22px] border p-4 ${darkMode ? 'border-slate-800 bg-slate-950/74' : 'border-slate-100/90 bg-slate-50/84'}`}>
                <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {homeTodayPresentation.hero.subtitle}
                </p>
                <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {homeTodayPresentation.hero.insight}
                </p>
              </div>

              <div className="mt-4 grid gap-2.5">
                {homeTodayPresentation.primaryPanel.rows.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 rounded-[20px] border px-4 py-3 ${
                      darkMode ? 'border-slate-800/90 bg-slate-950/76' : 'border-slate-100/90 bg-slate-50/78'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl ${
                      darkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'
                    }`}>
                      <ArrowRight className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                          {item.label}
                        </p>
                        {item.badge ? (
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                            darkMode ? 'bg-slate-950 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'
                          }`}>
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className={`mt-1 text-sm leading-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article
              data-testid="home-continuity-panel"
              className={`motion-enter rounded-[26px] border p-4.5 sm:p-5 ${shellCardClass}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {homeTodayPresentation.continuityPanel.eyebrow}
                  </p>
                  <h3 className={`mt-1.5 text-[22px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {homeTodayPresentation.continuityPanel.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={runHomeContinuityAction}
                  className={`rounded-2xl border px-3.5 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {homeTodayPresentation.continuityPanel.actionLabel}
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {homeTodayPresentation.continuityPanel.rows.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-[20px] border px-4 py-3 ${
                      darkMode ? 'border-slate-800/90 bg-slate-950/76' : 'border-slate-100/90 bg-slate-50/78'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {item.label}
                      </p>
                      {item.badge ? (
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          darkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'
                        }`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className={`mt-2 text-sm leading-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section
            data-testid="home-support-strip"
            data-support-tone={homeTodayPresentation.support.tone}
            className={`motion-enter rounded-[22px] border px-4 py-3.5 ${supportStripClass}`}
          >
            <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {homeTodayPresentation.support.label}
                </p>
                <p className={`mt-2 text-base font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {supportHeadline}
                </p>
                <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {supportDetail}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {resolvedSupportCards.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] ${
                      darkMode
                        ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 transition ${darkMode ? 'text-slate-400' : 'text-slate-500'} ${item.iconClass}`} />
                    {item.actionLabel}
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </WorkspaceLayout>
  );
};

export default HomeWorkspacePageV2;
