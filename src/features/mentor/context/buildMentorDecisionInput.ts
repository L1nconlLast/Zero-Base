import type { AdaptiveSnapshot } from '../../../services/adaptiveLearning.service';
import { adaptiveLearningService } from '../../../services/adaptiveLearning.service';
import { buildAchievementContextFromStorage } from '../../../services/achievementProgress.service';
import type { UserData } from '../../../types';
import type { MentorMemory, MentorMemoryRuntime, MentorTrigger } from '../../../types/mentor';
import { normalizeSubjectLabel } from '../../../utils/uiLabels';
import type {
  MentorDecisionInput,
  MentorKnowledgeContext,
  MentorMemoryFact,
  MentorObjective,
  MentorRiskSnapshot,
  MentorSessionRecommendation,
  MentorShortMemory,
  MentorStudyLevel,
} from '../contracts';

type PreferredTrack = 'enem' | 'concursos' | 'hibrido';

export interface BuildMentorDecisionInputParams {
  userKey: string;
  examGoal?: string;
  examDate?: string;
  preferredTrack?: PreferredTrack;
  userData: UserData;
  weeklyGoalMinutes: number;
  daysToExam: number;
  trigger: MentorTrigger;
  memory: MentorMemory;
  runtime: MentorMemoryRuntime;
  adaptiveSnapshot?: AdaptiveSnapshot;
  now?: Date;
}

const DEFAULT_EXAM_NAME = 'ENEM';

const getSafeNow = (value?: Date): Date => (value ? new Date(value) : new Date());

const isSameCalendarDay = (left: Date, right: Date): boolean => (
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate()
);

const uniqueSubjects = (subjects: Array<string | null | undefined>): string[] =>
  subjects
    .map((subject) => normalizeSubjectLabel(subject || '', ''))
    .filter(Boolean)
    .filter((subject, index, allSubjects) => allSubjects.indexOf(subject) === index);

const buildSubjectDistribution = (subjectMinutes: Record<string, number>) => {
  const entries = Object.entries(subjectMinutes)
    .map(([subject, minutes]) => ({
      subject: normalizeSubjectLabel(subject, 'Outra'),
      minutes: Number(minutes || 0),
    }))
    .filter((entry) => entry.minutes > 0)
    .sort((left, right) => right.minutes - left.minutes);

  const totalMinutes = entries.reduce((total, entry) => total + entry.minutes, 0);

  return entries.map((entry) => ({
    ...entry,
    sharePct: totalMinutes > 0 ? Math.round((entry.minutes / totalMinutes) * 100) : 0,
  }));
};

const resolveObjective = (examGoal?: string, preferredTrack?: PreferredTrack): MentorObjective => {
  if (preferredTrack === 'hibrido') {
    return 'hibrido';
  }

  if (preferredTrack === 'concursos') {
    return 'concurso';
  }

  const safeGoal = String(examGoal || '').toLowerCase();
  if (/(concurso|cebraspe|fcc|fgv|vunesp|cesgranrio)/i.test(safeGoal)) {
    return 'concurso';
  }

  return 'enem';
};

const resolveStudyLevel = (userLevel: number, weeklyPct: number): MentorStudyLevel => {
  if (userLevel >= 8 || weeklyPct >= 85) {
    return 'avancado';
  }

  if (userLevel >= 4 || weeklyPct >= 55) {
    return 'intermediario';
  }

  return 'iniciante';
};

const buildRiskSnapshot = ({
  daysToExam,
  todayMinutes,
  weeklyProgressPct,
  overdueReviews,
}: {
  daysToExam: number;
  todayMinutes: number;
  weeklyProgressPct: number;
  overdueReviews: number;
}): MentorRiskSnapshot => {
  if (daysToExam <= 30 && todayMinutes === 0) {
    return {
      level: 'high',
      label: 'Reta final com dia zerado',
      summary: 'A prova esta proxima e hoje ainda nao houve execucao.',
    };
  }

  if (overdueReviews > 0) {
    return {
      level: overdueReviews >= 3 ? 'high' : 'medium',
      label: 'Revisoes acumuladas',
      summary: `${overdueReviews} revisao(oes) ja passaram da janela ideal.`,
    };
  }

  if (weeklyProgressPct < 40) {
    return {
      level: 'high',
      label: 'Semana abaixo do ritmo',
      summary: `A meta semanal esta em ${weeklyProgressPct}% do planejado.`,
    };
  }

  if (weeklyProgressPct < 70) {
    return {
      level: 'medium',
      label: 'Ritmo abaixo do esperado',
      summary: `A meta semanal esta em ${weeklyProgressPct}% do planejado.`,
    };
  }

  return {
    level: 'low',
    label: 'Ritmo estavel',
    summary: `A meta semanal esta em ${weeklyProgressPct}% e o ritmo atual esta controlado.`,
  };
};

const buildKnowledgeContext = ({
  objective,
  daysToExam,
  weeklyProgressPct,
  pendingReviews,
  overdueReviews,
}: {
  objective: MentorObjective;
  daysToExam: number;
  weeklyProgressPct: number;
  pendingReviews: number;
  overdueReviews: number;
}): MentorKnowledgeContext => {
  const rules = [
    {
      id: 'guardrail-no-shortcuts',
      type: 'guardrail' as const,
      title: 'Sem atalhos ou previsao de prova',
      guidance: 'Nunca recomendar chute, atalho, promessa de acerto ou previsao do que vai cair.',
    },
    {
      id: 'study-short-restart',
      type: 'study' as const,
      title: 'Retomada curta quando o ritmo quebra',
      condition: 'todayMinutes = 0 ou weeklyProgressPct < 40',
      guidance: 'Preferir sessao curta e acionavel antes de tentar compensar a semana inteira.',
    },
    {
      id: 'product-review-priority',
      type: 'product' as const,
      title: 'Revisao pendente e prioridade real',
      condition: pendingReviews > 0 ? 'review backlog presente' : undefined,
      guidance: pendingReviews > 0
        ? 'Quando houver revisoes pendentes, considerar revisao antes de abrir novo conteudo.'
        : 'Sem backlog relevante de revisao neste momento.',
    },
    {
      id: 'product-overdue-review-priority',
      type: 'product' as const,
      title: 'Revisoes vencidas pedem intervencao',
      condition: overdueReviews > 0 ? 'overdueReviews > 0' : undefined,
      guidance: overdueReviews > 0
        ? 'Quando houver revisoes vencidas, orientar bloco curto de consolidacao antes de expandir carga.'
        : 'Sem revisoes vencidas criticas no momento.',
    },
    {
      id: 'goal-track-objective',
      type: 'goal' as const,
      title: `Objetivo atual: ${objective}`,
      guidance: objective === 'concurso'
        ? 'Privilegiar regularidade, leitura de banca e manutencao das disciplinas base.'
        : objective === 'hibrido'
          ? 'Equilibrar ganho de base, revisao e pratica para nao fragmentar a semana.'
          : 'Privilegiar revisao por habilidade, pratica contextualizada e consolidacao das materias mais frageis.',
    },
    {
      id: 'playbook-final-sprint',
      type: 'playbook' as const,
      title: 'Playbook de reta final',
      condition: daysToExam <= 30 ? 'daysToExam <= 30' : undefined,
      guidance: daysToExam <= 30
        ? 'Com prova proxima, reduzir improviso e priorizar revisao, questoes e execucao objetiva.'
        : `A prova ainda esta a ${daysToExam} dias, entao cabe ganho de base com disciplina.`,
    },
    {
      id: 'study-load-calibration',
      type: 'study' as const,
      title: 'Calibracao de carga',
      condition: `weeklyProgressPct=${weeklyProgressPct}`,
      guidance: weeklyProgressPct < 60
        ? 'Nao sugerir aumento bruto de carga. Priorizar bloco viavel e repetivel.'
        : 'Manter consistencia e evitar sobrecarga sem necessidade.',
    },
  ];

  return { rules };
};

const buildMemoryFacts = ({
  memory,
  lastSessionSubject,
  risk,
}: {
  memory: MentorMemory;
  lastSessionSubject?: string;
  risk: MentorRiskSnapshot;
}): MentorMemoryFact[] => {
  const facts: MentorMemoryFact[] = [];
  const recordedAt = new Date(memory.lastUpdatedAt || Date.now()).toISOString();

  if (memory.lastFocus) {
    facts.push({
      key: 'focus_of_week',
      value: memory.lastFocus,
      source: 'system',
      recordedAt,
    });
  }

  if (memory.lastRecommendations[0]) {
    facts.push({
      key: 'last_recommendation',
      value: memory.lastRecommendations[0],
      source: 'mentor',
      recordedAt,
    });
  }

  if (memory.lastActionFollowed) {
    facts.push({
      key: 'last_plan_change',
      value: memory.lastActionFollowed,
      source: 'user',
      recordedAt: new Date(memory.lastActionFollowedAt || memory.lastUpdatedAt || Date.now()).toISOString(),
    });
  }

  if (lastSessionSubject) {
    facts.push({
      key: 'last_studied_subject',
      value: lastSessionSubject,
      source: 'system',
      recordedAt,
    });
  }

  if (memory.focusShiftReason) {
    facts.push({
      key: 'last_difficulty_report',
      value: memory.focusShiftReason,
      source: 'system',
      recordedAt,
    });
  }

  facts.push({
    key: 'current_risk',
    value: `${risk.label}: ${risk.summary}`,
    source: 'system',
    recordedAt,
  });

  return facts;
};

const buildShortMemory = ({
  memory,
  lastSessionSubject,
  risk,
}: {
  memory: MentorMemory;
  lastSessionSubject?: string;
  risk: MentorRiskSnapshot;
}): MentorShortMemory => ({
  version: 1,
  focusOfWeek: memory.lastFocus,
  lastRecommendation: memory.lastRecommendations[0],
  lastActionFollowed: memory.lastActionFollowed || undefined,
  lastDifficultyReport: memory.focusShiftReason || undefined,
  lastStudiedSubject: lastSessionSubject,
  currentRisk: risk,
  facts: buildMemoryFacts({ memory, lastSessionSubject, risk }),
});

const resolveNextRecommendedSession = ({
  daysToExam,
  overdueReviews,
  pendingReviews,
  weeklyProgressPct,
  primarySubject,
}: {
  daysToExam: number;
  overdueReviews: number;
  pendingReviews: number;
  weeklyProgressPct: number;
  primarySubject: string;
}): MentorSessionRecommendation => {
  if (overdueReviews > 0) {
    return {
      subject: primarySubject,
      durationMin: 20,
      format: 'review',
      reason: `Ha ${overdueReviews} revisao(oes) vencida(s) pedindo consolidacao imediata.`,
    };
  }

  if (daysToExam <= 30) {
    return {
      subject: primarySubject,
      durationMin: 20,
      format: pendingReviews > 0 ? 'mixed' : 'questions',
      reason: 'A prova esta proxima, entao o melhor proximo passo e execucao curta com revisao e pratica.',
    };
  }

  if (weeklyProgressPct < 60) {
    return {
      subject: primarySubject,
      durationMin: 20,
      format: 'focus',
      reason: `A meta semanal esta em ${weeklyProgressPct}%, entao a retomada precisa ser curta e sustentavel.`,
    };
  }

  return {
    subject: primarySubject,
    durationMin: 25,
    format: pendingReviews > 0 ? 'mixed' : 'focus',
    reason: 'Existe clareza de proximo passo. O ideal agora e manter ritmo sem aumentar friccao.',
  };
};

export const buildMentorDecisionInput = ({
  userKey,
  examGoal,
  examDate,
  preferredTrack,
  userData,
  weeklyGoalMinutes,
  daysToExam,
  trigger,
  memory,
  runtime,
  adaptiveSnapshot,
  now,
}: BuildMentorDecisionInputParams): MentorDecisionInput => {
  const safeNow = getSafeNow(now);
  const achievementContext = buildAchievementContextFromStorage(userData, { weeklyGoalMinutes });
  const adaptive = adaptiveSnapshot || adaptiveLearningService.getSnapshot(userKey);
  const sessions = (userData.sessions?.length ? userData.sessions : userData.studyHistory || [])
    .slice()
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

  const lastSession = sessions[0];
  const todaySessions = sessions.filter((session) => isSameCalendarDay(new Date(session.date), safeNow));
  const todayMinutes = todaySessions.reduce((total, session) => total + Number(session.minutes || session.duration || 0), 0);

  const reviewSubjects = adaptive.reviewPlan.map((item) => item.subject);
  const mistakeSubjects = adaptive.topicMetrics
    .slice()
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .map((metric) => metric.subject);

  const weakSubjects = uniqueSubjects([
    runtime.recommendedFocus,
    runtime.secondaryFocus,
    ...adaptive.topicMetrics
      .filter((metric) => metric.status !== 'strong')
      .slice(0, 4)
      .map((metric) => metric.subject),
  ]);

  const strongSubjects = uniqueSubjects([
    runtime.strongArea,
    Object.entries(memory.subjectMinutes)
      .slice()
      .sort(([, left], [, right]) => Number(right) - Number(left))[0]?.[0],
  ]);
  const subjectDistribution = buildSubjectDistribution(memory.subjectMinutes);
  const dominantSubject = subjectDistribution[0]?.subject;
  const dominantSubjectSharePct = subjectDistribution[0]?.sharePct || 0;

  const activeSubjects = uniqueSubjects([
    ...Object.keys(memory.subjectMinutes),
    ...sessions.slice(0, 8).map((session) => String(session.subject || '')),
    ...reviewSubjects,
    ...mistakeSubjects,
    runtime.recommendedFocus,
    runtime.secondaryFocus,
    runtime.strongArea,
  ]);

  const overdueReviews = adaptive.reviewPlan.filter((item) => new Date(item.scheduledFor).getTime() <= safeNow.getTime()).length;
  const pendingReviews = adaptive.reviewPlan.length;
  const overduePlanItems = Math.max(0, Math.ceil((weeklyGoalMinutes - runtime.weeklyMinutesDone) / 30));
  const risk = buildRiskSnapshot({
    daysToExam,
    todayMinutes,
    weeklyProgressPct: runtime.weeklyPct,
    overdueReviews,
  });
  const objective = resolveObjective(examGoal, preferredTrack);
  const primarySubject = weakSubjects[0] || normalizeSubjectLabel(runtime.recommendedFocus, 'Outra');
  const nextRecommendedSession = resolveNextRecommendedSession({
    daysToExam,
    overdueReviews,
    pendingReviews,
    weeklyProgressPct: runtime.weeklyPct,
    primarySubject,
  });

  return {
    trigger,
    profile: {
      objective,
      examName: examGoal || DEFAULT_EXAM_NAME,
      examDate: examDate || undefined,
      daysToExam,
      preferredTrack: preferredTrack === 'concursos' ? 'concurso' : preferredTrack,
      level: resolveStudyLevel(userData.level, runtime.weeklyPct),
    },
    execution: {
      todayMinutes,
      todaySessions: todaySessions.length,
      weeklyGoalMinutes,
      weeklyMinutesDone: runtime.weeklyMinutesDone,
      weeklyProgressPct: runtime.weeklyPct,
      sessionsLast7Days: runtime.sessionsLast7Days,
      currentStreak: runtime.currentStreak,
      completedMockExams: achievementContext.completedMockExams,
      lastSessionAt: lastSession?.date,
      lastSessionSubject: lastSession ? normalizeSubjectLabel(String(lastSession.subject || ''), 'Outra') : undefined,
      nextRecommendedSession,
    },
    studyState: {
      activeSubjects,
      weakSubjects,
      strongSubjects,
      subjectDistribution,
      dominantSubject,
      dominantSubjectSharePct,
      currentWeeklyFocus: memory.lastFocus || runtime.recommendedFocus,
      pendingReviews,
      overdueReviews,
      overduePlanItems,
      recentMistakeSubjects: uniqueSubjects(mistakeSubjects).slice(0, 4),
    },
    memory: buildShortMemory({
      memory,
      lastSessionSubject: lastSession ? normalizeSubjectLabel(String(lastSession.subject || ''), 'Outra') : undefined,
      risk,
    }),
    knowledge: buildKnowledgeContext({
      objective,
      daysToExam,
      weeklyProgressPct: runtime.weeklyPct,
      pendingReviews,
      overdueReviews,
    }),
  };
};
