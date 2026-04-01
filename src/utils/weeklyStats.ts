import { StudySession, WeeklyStats } from '../types';
import { sanitizeSubjectLabel } from './sanitizeSubject';
import {
  buildWeeklyStudySnapshot,
  parseStudySessionDate,
  toLocalDateKey,
} from './weeklyStudySnapshot';

const DEFAULT_SUBJECT = 'Outra';

export const sanitizeSubject = (raw: unknown): string =>
  sanitizeSubjectLabel(raw, DEFAULT_SUBJECT);

export const calculateWeeklyStats = (
  sessions: StudySession[],
  weekDate: Date = new Date(),
): WeeklyStats => {
  const snapshot = buildWeeklyStudySnapshot(sessions, weekDate);
  const totalMinutes = snapshot.totalMinutes;
  const lastWeekMinutes = snapshot.previousTotalMinutes;
  const studyDays = snapshot.activeDays;
  const avgPerDay = totalMinutes / 7;
  const longestSession = snapshot.longestSession;

  const goalMetDays = new Set(
    snapshot.currentWeekSessions
      .filter((session) => session.goalMet)
      .map((session) => {
        const parsedDate = parseStudySessionDate(session);
        return parsedDate ? toLocalDateKey(parsedDate) : '';
      })
      .filter(Boolean),
  ).size;

  const goalAchievementRate = studyDays > 0 ? (goalMetDays / studyDays) * 100 : 0;

  const subjectDistribution = snapshot.subjectBreakdown.map((entry) => ({
    subject: sanitizeSubject(entry.subject),
    minutes: entry.minutes,
    percentage: totalMinutes > 0 ? (entry.minutes / totalMinutes) * 100 : 0,
  }));

  const dailyBreakdown = snapshot.daily.map((day) => ({
    date: day.date,
    minutes: day.minutes,
  }));

  const percentageChange = lastWeekMinutes > 0
    ? ((totalMinutes - lastWeekMinutes) / lastWeekMinutes) * 100
    : totalMinutes > 0 ? 100 : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(percentageChange) > 5) {
    trend = percentageChange > 0 ? 'up' : 'down';
  }

  const insights = generateInsights({
    totalMinutes,
    studyDays,
    avgPerDay,
    trend,
    percentageChange,
    subjectDistribution,
    longestSession,
  });

  return {
    weekStart: snapshot.weekStart,
    weekEnd: snapshot.weekEnd,
    totalMinutes,
    avgPerDay,
    longestSession,
    studyDays,
    goalAchievementRate,
    subjectDistribution,
    dailyBreakdown,
    comparison: {
      lastWeekMinutes,
      trend,
      percentageChange,
    },
    insights,
  };
};

interface InsightInput {
  totalMinutes: number;
  studyDays: number;
  avgPerDay: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
  subjectDistribution: Array<{ subject: string; minutes: number; percentage: number }>;
  longestSession: number;
}

const generateInsights = (data: InsightInput): string[] => {
  const insights: string[] = [];

  if (data.trend === 'up') {
    insights.push(` Excelente! Voce estudou ${Math.abs(data.percentageChange).toFixed(0)}% a mais que na semana passada.`);
  } else if (data.trend === 'down') {
    insights.push(` Sua produtividade caiu ${Math.abs(data.percentageChange).toFixed(0)}%. Que tal retomar o ritmo?`);
  }

  if (data.studyDays === 7) {
    insights.push(' Parabens! Voce estudou todos os dias da semana!');
  } else if (data.studyDays >= 5) {
    insights.push(` Otima consistencia! Voce estudou ${data.studyDays} dias esta semana.`);
  } else if (data.studyDays <= 3 && data.studyDays > 0) {
    insights.push(' Tente estudar pelo menos 5 dias por semana para melhores resultados.');
  }

  if (data.subjectDistribution.length > 0) {
    const topSubject = data.subjectDistribution[0];
    if (topSubject.percentage > 50) {
      insights.push(` Voce focou em ${topSubject.subject} (${topSubject.percentage.toFixed(0)}% do tempo). Considere balancear com outras materias.`);
    }
  }

  if (data.longestSession >= 180) {
    insights.push(' Impressionante! Voce teve uma sessao de 3+ horas. Lembre-se de fazer pausas!');
  }

  if (insights.length === 0) {
    insights.push(' Continue estudando regularmente para ver insights personalizados!');
  }

  return insights;
};
