import type { StudySession } from '../types';
import { buildWeeklyStudySnapshot } from './weeklyStudySnapshot';

export interface WeeklyChartDetail {
  label: string;
  minutes: number;
}

export interface WeeklyChartDatum {
  key: string;
  name: string;
  horas: number;
  minutos: number;
  metaHoras: number;
  metaMinutes: number;
  metGoal: boolean;
  detalhes: WeeklyChartDetail[];
}

const clampChartLabel = (label: string, max = 26): string => {
  if (label.length <= max) {
    return label;
  }

  return `${label.slice(0, Math.max(1, max - 1)).trimEnd()}...`;
};

export const processarDadosSemanais = (
  sessions: StudySession[],
  dailyGoalMinutes: number,
): WeeklyChartDatum[] => {
  const snapshot = buildWeeklyStudySnapshot(sessions);
  const safeGoalMinutes = Math.max(0, Number(dailyGoalMinutes) || 0);

  return snapshot.daily.map((day) => {
    const majorSubjects = day.subjects.slice(0, 4).map((subject) => ({
      label: clampChartLabel(subject.subject),
      minutes: subject.minutes,
    }));
    const otherMinutes = day.subjects
      .slice(4)
      .reduce((sum, subject) => sum + subject.minutes, 0);

    return {
      key: day.dateKey,
      name: day.shortLabel,
      horas: Number((day.minutes / 60).toFixed(1)),
      minutos: day.minutes,
      metaHoras: Number((safeGoalMinutes / 60).toFixed(1)),
      metaMinutes: safeGoalMinutes,
      metGoal: day.minutes >= safeGoalMinutes && safeGoalMinutes > 0,
      detalhes: otherMinutes > 0
        ? [...majorSubjects, { label: 'Outras', minutes: otherMinutes }]
        : majorSubjects,
    };
  });
};
