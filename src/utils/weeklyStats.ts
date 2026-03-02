import { StudySession, WeeklyStats } from '../types';

export const calculateWeeklyStats = (
  sessions: StudySession[],
  weekDate: Date = new Date()
): WeeklyStats => {
  const weekStart = startOfWeek(weekDate);
  const weekEnd = endOfWeek(weekDate);
  
  const weekSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= weekStart && sessionDate <= weekEnd;
  });
  
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekEnd);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
  
  const lastWeekSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= lastWeekStart && sessionDate <= lastWeekEnd;
  });
  
  const totalMinutes = weekSessions.reduce((sum, s) => sum + (s.minutes || s.duration), 0);
  const lastWeekMinutes = lastWeekSessions.reduce((sum, s) => sum + (s.minutes || s.duration), 0);
  
  const studyDays = new Set(weekSessions.map(s => s.date)).size;
  const avgPerDay = totalMinutes / 7;
  const longestSession = Math.max(...weekSessions.map(s => s.minutes || s.duration), 0);
  
  const goalMetDays = weekSessions.filter(s => s.goalMet).length;
  const goalAchievementRate = studyDays > 0 ? (goalMetDays / studyDays) * 100 : 0;
  
  const subjectMap = new Map<string, number>();
  weekSessions.forEach(s => {
    const subject = s.subject || 'Geral';
    subjectMap.set(subject, (subjectMap.get(subject) || 0) + (s.minutes || s.duration));
  });
  
  const subjectDistribution = Array.from(subjectMap.entries())
    .map(([subject, minutes]) => ({
      subject,
      minutes,
      percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0
    }))
    .sort((a, b) => b.minutes - a.minutes);
  
  const allDays = eachDayOfInterval(weekStart, weekEnd);
  const dailyBreakdown = allDays.map(date => {
    const dateKey = formatDateKey(date);
    const dayMinutes = weekSessions
      .filter(s => s.date === dateKey)
      .reduce((sum, s) => sum + (s.minutes || s.duration), 0);
    
    return { date, minutes: dayMinutes };
  });
  
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
    longestSession
  });
  
  return {
    weekStart,
    weekEnd,
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
      percentageChange
    },
    insights
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
    insights.push(` Excelente! Você estudou ${Math.abs(data.percentageChange).toFixed(0)}% a mais que na semana passada.`);
  } else if (data.trend === 'down') {
    insights.push(` Sua produtividade caiu ${Math.abs(data.percentageChange).toFixed(0)}%. Que tal retomar o ritmo?`);
  }
  
  if (data.studyDays === 7) {
    insights.push(' Parabéns! Você estudou todos os dias da semana!');
  } else if (data.studyDays >= 5) {
    insights.push(` Ótima consistência! Você estudou ${data.studyDays} dias esta semana.`);
  } else if (data.studyDays <= 3 && data.studyDays > 0) {
    insights.push(' Tente estudar pelo menos 5 dias por semana para melhores resultados.');
  }
  
  if (data.subjectDistribution.length > 0) {
    const topSubject = data.subjectDistribution[0];
    if (topSubject.percentage > 50) {
      insights.push(` Você focou em ${topSubject.subject} (${topSubject.percentage.toFixed(0)}% do tempo). Considere balancear com outras matérias.`);
    }
  }
  
  if (data.longestSession >= 180) {
    insights.push(' Impressionante! Você teve uma sessão de 3+ horas. Lembre-se de fazer pausas!');
  }
  
  if (insights.length === 0) {
    insights.push(' Continue estudando regularmente para ver insights personalizados!');
  }
  
  return insights;
};

const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

const endOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  return new Date(d.setDate(diff));
};

const eachDayOfInterval = (start: Date, end: Date): Date[] => {
  const days: Date[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return days;
};

const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};
