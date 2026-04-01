import { useMemo } from 'react';
import type { ScheduleEntry, StudyContextForToday, Weekday, WeeklyStudySchedule } from '../../../types';
import {
  normalizeBlockLabel,
  normalizePresentationLabel,
  normalizeSubjectLabel,
} from '../../../utils/uiLabels';
import { buildHomeReviewQueueState } from '../../review';
import type {
  PlanoDistributionItem,
  PlanoHeaderData,
  PlanoLoadSnapshot,
  PlanoNextStepItem,
  PlanoReviewState,
  PlanoTodayStatus,
  StudyBlock,
  StudyBlockPriority,
  WeekPlan,
} from '../types';

const WEEKDAY_META: Array<{ key: Weekday; label: string; shortLabel: string }> = [
  { key: 'monday', label: 'Segunda', shortLabel: 'SEG' },
  { key: 'tuesday', label: 'Terca', shortLabel: 'TER' },
  { key: 'wednesday', label: 'Quarta', shortLabel: 'QUA' },
  { key: 'thursday', label: 'Quinta', shortLabel: 'QUI' },
  { key: 'friday', label: 'Sexta', shortLabel: 'SEX' },
  { key: 'saturday', label: 'Sabado', shortLabel: 'SAB' },
  { key: 'sunday', label: 'Domingo', shortLabel: 'DOM' },
];

export interface UsePlanoParams {
  weeklySchedule: WeeklyStudySchedule;
  studyContextForToday: StudyContextForToday;
  weeklyCompletedSessions: number;
  weeklyPlannedSessions: number;
  todayCompletedSessions: number;
  currentBlockLabel: string;
  currentBlockObjective?: string;
  currentBlockDurationMinutes: number;
  scheduleEntries?: ScheduleEntry[];
}

export interface UsePlanoResult {
  plan: WeekPlan;
  distribution: PlanoDistributionItem[];
  nextSteps: PlanoNextStepItem[];
  header: PlanoHeaderData;
  reviewState: PlanoReviewState;
  plannedMinutes: number;
  activeDays: number;
  uniqueSubjects: number;
  averageDailyMinutes: number;
  todayStatus: PlanoTodayStatus;
  heaviestDay: PlanoLoadSnapshot | null;
  lightestDay: PlanoLoadSnapshot | null;
  recommendedEditDay: Weekday | null;
  recommendedEditCopy: string;
}

const getTodayStatus = (studyContextForToday: StudyContextForToday): PlanoTodayStatus => {
  if (studyContextForToday.state.type === 'planned') {
    return {
      label: 'Hoje ja tem trilho definido',
      detail: `${studyContextForToday.state.subjectLabels.length} disciplina${studyContextForToday.state.subjectLabels.length === 1 ? '' : 's'} prontas para a execucao oficial.`,
      tone: 'success',
    };
  }

  if (studyContextForToday.state.type === 'empty') {
    return {
      label: 'Hoje esta ativo, mas ainda vazio',
      detail: 'Abra o dia de hoje para preencher as disciplinas e destravar o bloco oficial sem bagunca.',
      tone: 'warning',
    };
  }

  return {
    label: 'Hoje esta livre no cronograma',
    detail: 'Se quiser reativar o dia, abra o ajuste leve abaixo e monte a semana sem sair do fluxo principal.',
    tone: 'neutral',
  };
};

const getBlockPriority = (
  day: { isToday: boolean; isActive: boolean },
  blockIndex: number,
  todayCompletedSessions: number,
): StudyBlockPriority => {
  if (!day.isActive) return 'low';
  if (!day.isToday) return blockIndex === 0 ? 'medium' : 'low';
  if (blockIndex < todayCompletedSessions) return 'low';
  if (blockIndex === todayCompletedSessions) return 'high';
  return 'medium';
};

const buildBlockTopic = ({
  day,
  blockIndex,
  todayCompletedSessions,
  currentBlockObjective,
}: {
  day: { isToday: boolean };
  blockIndex: number;
  todayCompletedSessions: number;
  currentBlockObjective: string;
}) => {
  if (day.isToday && blockIndex === todayCompletedSessions) {
    return currentBlockObjective;
  }

  if (day.isToday && blockIndex < todayCompletedSessions) {
    return 'Sessao concluida hoje';
  }

  if (day.isToday) {
    return 'Sequencia de hoje';
  }

  return 'Bloco planejado da semana';
};

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getDateKeyForWeekday = (weekday: Weekday, today = new Date()): string => {
  const monday = new Date(today);
  const currentDay = today.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() + diffToMonday);

  const dayIndex = WEEKDAY_META.findIndex((meta) => meta.key === weekday);
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + Math.max(dayIndex, 0));
  return toDateKey(targetDate);
};

const buildReviewTopic = (entry: ScheduleEntry): string => {
  const reviewTag = String(entry.aiReason || '').match(/\+(\d+)h/i)?.[1] || '24';
  const reviewTopic = normalizePresentationLabel(entry.topic || 'Revisao programada', 'Revisao programada');
  return `${reviewTag}h - ${reviewTopic}`;
};

const formatWeeklyLoad = (plannedMinutes: number): string => {
  if (plannedMinutes >= 60) {
    const hours = plannedMinutes / 60;
    const roundedHours = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.0', '');
    return `${roundedHours}h por semana`;
  }

  return `${plannedMinutes} min por semana`;
};

const formatReviewCount = (value: number, singular: string, plural: string): string =>
  `${value} ${value === 1 ? singular : plural}`;

const buildWeekPlan = ({
  weeklySchedule,
  studyContextForToday,
  todayCompletedSessions,
  currentBlockObjective,
  scheduleEntries,
}: Pick<
  UsePlanoParams,
  'weeklySchedule' | 'studyContextForToday' | 'todayCompletedSessions' | 'scheduleEntries'
> & {
  currentBlockObjective: string;
}): WeekPlan =>
  WEEKDAY_META.map((dayMeta) => {
    const dayDateKey = getDateKeyForWeekday(dayMeta.key);
    const rawSubjects = weeklySchedule.weekPlan[dayMeta.key]?.subjectLabels || [];
    const isActive = Boolean(weeklySchedule.availability[dayMeta.key]);
    const isToday = studyContextForToday.state.day === dayMeta.key;
    const subjects = rawSubjects.map((subject) => normalizeSubjectLabel(subject, 'Outra'));
    const plannedBlocks: StudyBlock[] = isActive
      ? subjects.map((subject, index) => {
          const status = isToday && index < todayCompletedSessions ? 'done' : 'pending';
          return {
            id: `${dayMeta.key}-${subject}-${index}`,
            subject,
            topic: buildBlockTopic({
              day: { isToday },
              blockIndex: index,
              todayCompletedSessions,
              currentBlockObjective,
            }),
            duration: weeklySchedule.preferences.defaultSessionDurationMinutes,
            priority: getBlockPriority({ isToday, isActive }, index, todayCompletedSessions),
            status,
            kind: 'study',
          };
        })
      : [];
    const reviewBlocks: StudyBlock[] = (scheduleEntries || [])
      .filter((entry) =>
        entry.date === dayDateKey
        && entry.studyType === 'revisao'
        && !entry.done,
      )
      .map((entry) => ({
        id: entry.id,
        subject: normalizeSubjectLabel(entry.subject, 'Revisao'),
        topic: buildReviewTopic(entry),
        duration:
          typeof entry.durationMinutes === 'number' && Number.isFinite(entry.durationMinutes)
            ? entry.durationMinutes
            : weeklySchedule.preferences.defaultSessionDurationMinutes,
        priority: entry.priority === 'alta' ? 'high' : 'medium',
        status: entry.done ? 'done' : 'pending',
        kind: 'review',
      }));
    const blocks = [...plannedBlocks, ...reviewBlocks];

    return {
      id: dayMeta.key,
      date: dayMeta.shortLabel,
      fullLabel: dayMeta.label,
      isToday,
      isActive,
      blocks,
      totalMinutes: blocks.reduce((total, block) => total + block.duration, 0),
    };
  });

const buildRecommendedEditDay = (
  plan: WeekPlan,
  studyContextForToday: StudyContextForToday,
  lightestDay: PlanoLoadSnapshot | null,
): Weekday | null => {
  if (studyContextForToday.state.type === 'empty' || studyContextForToday.state.type === 'inactive') {
    return studyContextForToday.state.day;
  }

  const activeEmptyDay = plan.find((day) => day.isActive && day.blocks.length === 0);
  if (activeEmptyDay) {
    return activeEmptyDay.id;
  }

  const lightestMatch = lightestDay
    ? plan.find((day) => day.fullLabel === lightestDay.label)
    : null;

  if (lightestMatch) {
    return lightestMatch.id;
  }

  return plan.find((day) => day.isToday)?.id ?? plan.find((day) => day.isActive)?.id ?? null;
};

export const usePlano = ({
  weeklySchedule,
  studyContextForToday,
  weeklyCompletedSessions,
  weeklyPlannedSessions,
  todayCompletedSessions,
  currentBlockLabel,
  currentBlockObjective,
  scheduleEntries,
}: UsePlanoParams): UsePlanoResult => {
  const safeCurrentBlockLabel = useMemo(
    () => normalizeBlockLabel(currentBlockLabel),
    [currentBlockLabel],
  );
  const safeCurrentBlockObjective = useMemo(
    () => normalizePresentationLabel(currentBlockObjective || 'Bloco oficial do dia', 'Bloco oficial do dia'),
    [currentBlockObjective],
  );

  const plan = useMemo(
    () =>
      buildWeekPlan({
        weeklySchedule,
        studyContextForToday,
        todayCompletedSessions,
        currentBlockObjective: safeCurrentBlockObjective,
        scheduleEntries,
      }),
    [safeCurrentBlockObjective, scheduleEntries, studyContextForToday, todayCompletedSessions, weeklySchedule],
  );

  const activeRows = useMemo(
    () => plan.filter((day) => day.isActive),
    [plan],
  );
  const activeDays = activeRows.length;
  const uniqueSubjects = useMemo(
    () => new Set(plan.flatMap((day) => day.blocks.map((block) => block.subject))).size,
    [plan],
  );
  const plannedMinutes = useMemo(
    () =>
      Math.max(
        weeklyPlannedSessions * weeklySchedule.preferences.defaultSessionDurationMinutes,
        plan.reduce((total, day) => total + day.totalMinutes, 0),
      ),
    [plan, weeklyPlannedSessions, weeklySchedule.preferences.defaultSessionDurationMinutes],
  );
  const averageDailyMinutes = activeDays > 0 ? Math.round(plannedMinutes / activeDays) : 0;

  const heaviestDay = useMemo<PlanoLoadSnapshot | null>(() => {
    if (!activeRows.length) return null;
    const winner = [...activeRows].sort((left, right) => right.totalMinutes - left.totalMinutes)[0];
    return {
      label: winner.fullLabel,
      minutes: winner.totalMinutes,
      subjects: winner.blocks.length,
    };
  }, [activeRows]);

  const lightestDay = useMemo<PlanoLoadSnapshot | null>(() => {
    if (!activeRows.length) return null;
    const winner = [...activeRows].sort((left, right) => left.totalMinutes - right.totalMinutes)[0];
    return {
      label: winner.fullLabel,
      minutes: winner.totalMinutes,
      subjects: winner.blocks.length,
    };
  }, [activeRows]);

  const todayStatus = useMemo(
    () => getTodayStatus(studyContextForToday),
    [studyContextForToday],
  );

  const todayPlan = useMemo(
    () => plan.find((day) => day.isToday) ?? null,
    [plan],
  );
  const reviewQueueState = useMemo(
    () => buildHomeReviewQueueState(scheduleEntries || []),
    [scheduleEntries],
  );
  const reviewState = useMemo<PlanoReviewState>(() => {
    const leadReview = reviewQueueState.nextItem;

    if (reviewQueueState.status === 'pending_today') {
      return {
        status: 'pending_today',
        label: `${formatReviewCount(reviewQueueState.dueTodayCount, 'revisao pronta hoje', 'revisoes prontas hoje')}`,
        detail: leadReview
          ? `${leadReview.title} lidera a fila de hoje.`
          : 'A fila de revisao de hoje segue aberta.',
      };
    }

    if (reviewQueueState.status === 'completed_today') {
      return {
        status: 'completed_today',
        label: 'Revisoes do dia em dia',
        detail: leadReview
          ? `Proxima revisao em ${leadReview.when.toLowerCase()} - ${leadReview.tag}.`
          : 'Nenhuma revisao nova entrou no radar agora.',
      };
    }

    if (reviewQueueState.status === 'upcoming' && leadReview) {
      return {
        status: 'upcoming',
        label: 'Proxima revisao programada',
        detail: `${leadReview.title} volta em ${leadReview.when.toLowerCase()} - ${leadReview.tag}.`,
      };
    }

    return {
      status: 'empty',
      label: 'Sem revisoes no radar',
      detail: 'Nenhuma revisao esta vencida ou programada para agora.',
    };
  }, [reviewQueueState]);
  const focusSubjectsLine = useMemo(() => {
    const subjectEntries = Array.from(
      plan
        .flatMap((day) => day.blocks)
        .reduce((accumulator, block) => {
          const current = accumulator.get(block.subject) || 0;
          accumulator.set(block.subject, current + 1);
          return accumulator;
        }, new Map<string, number>())
        .entries(),
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 2)
      .map(([subject]) => subject);

    if (subjectEntries.length === 0) {
      return 'ciclo em ajuste inicial';
    }

    if (subjectEntries.length === 1) {
      return `foco em ${subjectEntries[0]}`;
    }

    return `foco em ${subjectEntries[0]} e ${subjectEntries[1]}`;
  }, [plan]);

  const remainingSessions = Math.max(weeklyPlannedSessions - weeklyCompletedSessions, 0);
  const distribution = useMemo<PlanoDistributionItem[]>(() => {
    const bySubject = plan.reduce((accumulator, day) => {
      day.blocks.forEach((block) => {
        const current = accumulator.get(block.subject) || {
          subject: block.subject,
          minutes: 0,
          sessions: 0,
          doneSessions: 0,
          todaySessions: 0,
          reviewSessions: 0,
        };

        current.minutes += block.duration;
        current.sessions += 1;
        current.doneSessions += block.status === 'done' ? 1 : 0;
        current.todaySessions += day.isToday ? 1 : 0;
        current.reviewSessions += block.kind === 'review' ? 1 : 0;
        accumulator.set(block.subject, current);
      });
      return accumulator;
    }, new Map<string, {
      subject: string;
      minutes: number;
      sessions: number;
      doneSessions: number;
      todaySessions: number;
      reviewSessions: number;
    }>());

    const rows = Array.from(bySubject.values()).sort((left, right) => {
      if (right.minutes !== left.minutes) {
        return right.minutes - left.minutes;
      }

      return right.sessions - left.sessions;
    });

    const topMinutes = rows[0]?.minutes || 0;

    return rows.map((row, index) => {
      const shareOfCycle = plannedMinutes > 0 ? Math.round((row.minutes / plannedMinutes) * 100) : 0;
      const relativeWeight = topMinutes > 0 ? Math.max(12, Math.round((row.minutes / topMinutes) * 100)) : 0;
      let statusLabel = 'Base da semana';
      let statusTone: PlanoDistributionItem['statusTone'] = 'default';

      if (index === 0) {
        statusLabel = 'Foco principal';
        statusTone = 'primary';
      } else if (row.subject === safeCurrentBlockLabel || row.todaySessions > 0) {
        statusLabel = 'Em andamento';
        statusTone = 'active';
      } else if (row.reviewSessions > 0) {
        statusLabel = 'Revisao prevista';
        statusTone = 'review';
      } else if (row.doneSessions > 0) {
        statusLabel = 'Ja iniciou';
      }

      return {
        id: row.subject.toLowerCase().replace(/\s+/g, '-'),
        subject: row.subject,
        minutes: row.minutes,
        sessions: row.sessions,
        shareOfCycle,
        relativeWeight,
        statusTone,
        statusLabel,
        detailLabel: `${row.minutes} min previstos`,
      };
    });
  }, [plan, plannedMinutes, safeCurrentBlockLabel]);
  const header = useMemo<PlanoHeaderData>(() => {
    const todayBlocks = todayPlan?.blocks.length ?? 0;

    return {
      eyebrow: 'Plano da semana',
      title: 'Plano principal de estudos',
      contextLine: `${formatWeeklyLoad(plannedMinutes)} - ${focusSubjectsLine}`,
      statusLine:
        todayBlocks > 0
          ? `Ciclo ativo. Hoje voce tem ${todayBlocks} bloco${todayBlocks === 1 ? '' : 's'} pronto${todayBlocks === 1 ? '' : 's'} e ${remainingSessions} ${remainingSessions === 1 ? 'sessao restante' : 'sessoes restantes'}.${reviewQueueState.status === 'pending_today' ? ` ${formatReviewCount(reviewQueueState.dueTodayCount, 'Revisao pronta', 'Revisoes prontas')} para hoje.` : reviewQueueState.status === 'completed_today' ? ' Revisoes do dia em dia.' : ''}`
          : 'Plano inicial. Abra o ajuste leve para preencher so o necessario e seguir no ritmo.',
      metrics: [
        { label: 'Carga', value: formatWeeklyLoad(plannedMinutes) },
        { label: 'Dias ativos', value: `${activeDays} dias` },
        { label: 'Ciclo', value: `${weeklyCompletedSessions}/${Math.max(weeklyPlannedSessions, 1)} sessoes` },
      ],
    };
  }, [
    activeDays,
    focusSubjectsLine,
    plannedMinutes,
    remainingSessions,
    reviewQueueState,
    todayPlan,
    weeklyCompletedSessions,
    weeklyPlannedSessions,
  ]);

  const recommendedEditDay = useMemo(
    () => buildRecommendedEditDay(plan, studyContextForToday, lightestDay),
    [lightestDay, plan, studyContextForToday],
  );

  const recommendedEditCopy = useMemo(() => {
    if (!recommendedEditDay) {
      return 'Abrir cronograma completo';
    }

    const targetDay = plan.find((day) => day.id === recommendedEditDay);
    if (!targetDay) {
      return 'Abrir ajuste leve';
    }

    if (targetDay.isToday && targetDay.blocks.length === 0) {
      return 'Preencher hoje';
    }

    if (!targetDay.isActive) {
      return `Reativar ${targetDay.fullLabel}`;
    }

    return `Ajustar ${targetDay.fullLabel}`;
  }, [plan, recommendedEditDay]);

  const nextSteps = useMemo<PlanoNextStepItem[]>(() => {
    const orderedDays = plan.filter((day) => day.isActive || day.blocks.length > 0);
    const nextFocusEntry = orderedDays
      .flatMap((day) => day.blocks
        .filter((block) => block.status !== 'done' && block.kind !== 'review')
        .map((block) => ({ day, block })))
      [0]
      ?? orderedDays
        .flatMap((day) => day.blocks
          .filter((block) => block.status !== 'done')
          .map((block) => ({ day, block })))
        [0]
      ?? null;
    const nextReviewEntry = orderedDays
      .flatMap((day) => day.blocks
        .filter((block) => block.status !== 'done' && block.kind === 'review')
        .map((block) => ({ day, block })))
      [0]
      ?? null;

    const items: PlanoNextStepItem[] = [];

    if (nextFocusEntry) {
      items.push({
        id: 'next-focus',
        label: 'Proximo foco',
        title: `${nextFocusEntry.block.subject} - ${nextFocusEntry.block.topic}`,
        detail: nextFocusEntry.day.isToday
          ? 'Sessao curta prevista para hoje'
          : `Bloco previsto para ${nextFocusEntry.day.fullLabel}`,
        tone: 'focus',
      });
    }

    if (nextReviewEntry) {
      items.push({
        id: 'next-review',
        label: 'Revisao seguinte',
        title: `${nextReviewEntry.block.subject} - ${nextReviewEntry.block.topic}`,
        detail: reviewQueueState.status === 'completed_today'
          ? nextReviewEntry.day.isToday
            ? 'Revisao de hoje concluida. Nova rodada pronta para hoje.'
            : `Revisao de hoje concluida. Volta ao ciclo em ${nextReviewEntry.day.fullLabel}`
          : nextReviewEntry.day.isToday
            ? 'Revisao pronta para hoje'
            : `Volta ao ciclo em ${nextReviewEntry.day.fullLabel}`,
        tone: 'review',
      });
    } else if (reviewQueueState.status === 'completed_today') {
      items.push({
        id: 'next-review',
        label: 'Revisao do dia',
        title: formatReviewCount(reviewQueueState.completedTodayCount, 'revisao concluida', 'revisoes concluidas'),
        detail: reviewState.detail,
        tone: 'review',
      });
    } else if (reviewQueueState.status === 'upcoming' && reviewQueueState.nextItem) {
      items.push({
        id: 'next-review',
        label: 'Revisao seguinte',
        title: reviewQueueState.nextItem.title,
        detail: `Volta ao ciclo em ${reviewQueueState.nextItem.when.toLowerCase()} - ${reviewQueueState.nextItem.tag}.`,
        tone: 'review',
      });
    }

    items.push({
      id: 'plan-continuity',
      label: 'Continuidade do plano',
      title: remainingSessions > 0
        ? `${remainingSessions} sessoes restantes no ciclo`
        : 'Meta da semana em dia',
      detail: recommendedEditDay
        ? `Ajuste leve recomendado em ${plan.find((day) => day.id === recommendedEditDay)?.fullLabel || 'um dia do ciclo'}`
        : 'Mantenha o ritmo do ciclo atual',
      tone: 'continuity',
    });

    return items.slice(0, 3);
  }, [plan, recommendedEditDay, remainingSessions, reviewQueueState, reviewState.detail]);

  return {
    plan,
    distribution,
    nextSteps,
    header,
    reviewState,
    plannedMinutes,
    activeDays,
    uniqueSubjects,
    averageDailyMinutes,
    todayStatus,
    heaviestDay,
    lightestDay,
    recommendedEditDay,
    recommendedEditCopy,
  };
};

export default usePlano;
