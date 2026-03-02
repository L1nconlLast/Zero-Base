import type { MethodRecommendationInput, StudyMethod } from '../types';
import { STUDY_METHODS } from '../data/studyMethods';

const byId = (id: string): StudyMethod =>
  STUDY_METHODS.find((method) => method.id === id) || STUDY_METHODS[0];

export const recommendMethod = (userStats: MethodRecommendationInput): StudyMethod => {
  if (userStats.dailyAverageMinutes < 60) {
    return byId('pomodoro');
  }

  if (userStats.dailyAverageMinutes >= 180) {
    return byId('deep-work');
  }

  if (userStats.streak >= 7) {
    return byId('90-30');
  }

  if (typeof userStats.daysToExam === 'number' && userStats.daysToExam <= 14) {
    return byId('90-30');
  }

  return byId('52-17');
};
