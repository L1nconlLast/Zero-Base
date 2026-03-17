// ============================================================
// src/utils/levelPrediction.ts
// Previsão de quanto tempo para o próximo nível
// ============================================================

import { StudySession } from '../types';
import { getLevelByPoints } from '../data/levels';

export interface LevelPrediction {
  currentLevel: number;
  nextLevel: number;
  pointsToNext: number;
  avgPointsPerDay: number;
  daysToNextLevel: number | null; // null = sem histórico suficiente
  label: string;
}

export const predictNextLevel = (
  totalPoints: number,
  sessions: StudySession[],
  daysWindow = 7,
): LevelPrediction => {
  const currentLevelData = getLevelByPoints(totalPoints);
  const currentLevel = currentLevelData.level;
  const nextLevel = currentLevel + 1;
  const pointsToNext = Math.max(0, currentLevelData.maxPoints - totalPoints);

  // Média de pontos por dia (últimos N dias)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysWindow);

  const recentSessions = sessions.filter((s) => new Date(s.date) >= cutoff);
  const totalRecentPoints = recentSessions.reduce((sum, s) => sum + s.points, 0);
  const avgPointsPerDay = daysWindow > 0 ? totalRecentPoints / daysWindow : 0;

  let daysToNextLevel: number | null = null;
  let label: string;

  if (avgPointsPerDay <= 0) {
    label = 'Estude hoje para ver a previsão!';
  } else if (pointsToNext <= 0) {
    label = 'Nível máximo atingido!';
  } else {
    daysToNextLevel = Math.ceil(pointsToNext / avgPointsPerDay);
    if (daysToNextLevel <= 1) {
      label = 'Você pode atingir o próximo nível hoje!';
    } else if (daysToNextLevel <= 7) {
      label = `No seu ritmo, você atinge o Nível ${nextLevel} em ${daysToNextLevel} dias`;
    } else if (daysToNextLevel <= 30) {
      const weeks = Math.ceil(daysToNextLevel / 7);
      label = `No seu ritmo, você atinge o Nível ${nextLevel} em ~${weeks} semanas`;
    } else {
      const months = Math.ceil(daysToNextLevel / 30);
      label = `No seu ritmo, você atinge o Nível ${nextLevel} em ~${months} meses`;
    }
  }

  return {
    currentLevel,
    nextLevel,
    pointsToNext,
    avgPointsPerDay: Math.round(avgPointsPerDay),
    daysToNextLevel,
    label,
  };
};
