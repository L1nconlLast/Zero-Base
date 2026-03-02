// ============================================================
// src/hooks/useStreak.ts
// Calcula e atualiza a sequência (streak) diária de estudos
// ============================================================

import { useEffect } from 'react';
import type { UserData } from '../types';

/** Retorna true se duas datas ISO representam dias consecutivos */
export const areDatesConsecutive = (dateA: string, dateB: string): boolean => {
  const a = new Date(dateA);
  const b = new Date(dateB);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return diff === 1;
};

/** Calcula o streak atual a partir do histórico de sessões */
export const calcStreakFromSessions = (sessions: UserData['sessions']): { current: number; best: number } => {
  if (!sessions || sessions.length === 0) return { current: 0, best: 0 };

  // Extraia datas únicas ordenadas do mais recente para o mais antigo
  const uniqueDates = [
    ...new Set(sessions.map((s) => new Date(s.date).toISOString().split('T')[0])),
  ].sort((a, b) => b.localeCompare(a));

  if (uniqueDates.length === 0) return { current: 0, best: 0 };

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Se o último estudo não foi hoje nem ontem, streak quebrou
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    // Calcula apenas o melhor streak histórico
    return { current: 0, best: calcBestStreak(uniqueDates) };
  }

  let current = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    if (areDatesConsecutive(uniqueDates[i + 1], uniqueDates[i])) {
      current++;
    } else {
      break;
    }
  }

  const best = Math.max(current, calcBestStreak(uniqueDates));
  return { current, best };
};

const calcBestStreak = (sortedDates: string[]): number => {
  let best = 1;
  let current = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    if (areDatesConsecutive(sortedDates[i + 1], sortedDates[i])) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
};

/** 
 * Hook que sincroniza currentStreak/bestStreak no userData de acordo com as sessões.
 * Deve ser chamado no App após qualquer mudança em userData.sessions.
 */
export const useStreak = (
  userData: UserData,
  setUserData: (updater: (prev: UserData) => UserData) => void,
): void => {
  useEffect(() => {
    const sessions = userData.sessions || userData.studyHistory || [];
    const { current, best } = calcStreakFromSessions(sessions);

    const currentStored = userData.currentStreak ?? 0;
    const bestStored = userData.bestStreak ?? 0;

    if (current !== currentStored || best > bestStored) {
      setUserData((prev) => ({
        ...prev,
        currentStreak: current,
        streak: current,
        bestStreak: Math.max(best, prev.bestStreak ?? 0),
      }));
    }
    // Only re-run when sessions change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.sessions, userData.studyHistory]);
};
