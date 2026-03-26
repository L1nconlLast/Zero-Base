import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACHIEVEMENTS } from '../data/achievements';
import type { Achievement, UserData } from '../types';
import { achievementsService } from '../services/achievements.service';
import {
  buildAchievementContextFromStorage,
  writeAchievementUnlockMeta,
} from '../services/achievementProgress.service';
import { isSupabaseConfigured } from '../services/supabase.client';
import { logger } from '../utils/logger';

type ApplyAchievementReward = (achievementId: string, points: number) => void;

interface UseAchievementsOptions {
  storageScope?: string;
  weeklyGoalMinutes?: number;
}

export const useAchievements = (
  userData: UserData,
  userId?: string | null,
  onApplyReward?: ApplyAchievementReward,
  options: UseAchievementsOptions = {},
) => {
  const storageScope = options.storageScope || userId || 'default';
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(userData.achievements || []);
  const [unlockQueue, setUnlockQueue] = useState<Achievement[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);
  const syncedRef = useRef(false);
  const syncedUserRef = useRef<string | null>(null);
  const syncInFlightRef = useRef(false);
  const retryAfterRef = useRef(0);
  const handledUnlocksRef = useRef<Set<string>>(new Set(userData.achievements || []));

  const achievementContext = useMemo(
    () =>
      buildAchievementContextFromStorage(userData, {
        weeklyGoalMinutes: options.weeklyGoalMinutes,
      }),
    [userData, options.weeklyGoalMinutes],
  );

  useEffect(() => {
    handledUnlocksRef.current = new Set(userData.achievements || []);
    setUnlockedAchievements(userData.achievements || []);
    setUnlockQueue([]);
    setNewlyUnlocked(null);
  }, [storageScope]);

  useEffect(() => {
    const localIds = userData.achievements || [];
    if (localIds.length === 0) return;

    localIds.forEach((id) => handledUnlocksRef.current.add(id));
    setUnlockedAchievements((prev) => [...new Set([...prev, ...localIds])]);
  }, [userData.achievements]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;

    if (syncedUserRef.current !== userId) {
      syncedRef.current = false;
      syncedUserRef.current = userId;
      retryAfterRef.current = 0;
    }

    if (syncedRef.current || syncInFlightRef.current || Date.now() < retryAfterRef.current) {
      return;
    }

    let cancelled = false;

    const loadCloud = async () => {
      syncInFlightRef.current = true;

      try {
        const cloudIds = await achievementsService.listUnlocked(userId);
        if (cancelled) return;

        const localIds = userData.achievements || [];
        const merged = [...new Set([...localIds, ...cloudIds])];
        merged.forEach((id) => handledUnlocksRef.current.add(id));
        setUnlockedAchievements(merged);

        const cloudSet = new Set(cloudIds);
        const localOnly = localIds.filter((id) => !cloudSet.has(id));
        if (localOnly.length > 0) {
          void achievementsService.unlockBatch(userId, localOnly).catch(() => undefined);
        }

        syncedRef.current = true;
      } catch {
        retryAfterRef.current = Date.now() + 15000;
      } finally {
        syncInFlightRef.current = false;
      }
    };

    void loadCloud();
    return () => {
      cancelled = true;
    };
  }, [userData.achievements, userId]);

  const dismissNewlyUnlocked = useCallback(() => {
    setNewlyUnlocked(null);
    setUnlockQueue((prev) => prev.slice(1));
  }, []);

  useEffect(() => {
    if (newlyUnlocked || unlockQueue.length === 0) return;

    setNewlyUnlocked(unlockQueue[0]);
    const timer = window.setTimeout(() => {
      dismissNewlyUnlocked();
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dismissNewlyUnlocked, newlyUnlocked, unlockQueue]);

  useEffect(() => {
    const mergedUnlocked = new Set([...(userData.achievements || []), ...unlockedAchievements]);
    const nextUnlocks: Achievement[] = [];

    ACHIEVEMENTS.forEach((achievement) => {
      if (mergedUnlocked.has(achievement.id) || handledUnlocksRef.current.has(achievement.id)) {
        return;
      }

      try {
        if (!achievement.condition(achievementContext)) {
          return;
        }

        handledUnlocksRef.current.add(achievement.id);
        mergedUnlocked.add(achievement.id);
        nextUnlocks.push(achievement);
      } catch (error) {
        logger.error(`Erro ao verificar conquista ${achievement.id}`, 'Achievements', error);
      }
    });

    if (nextUnlocks.length === 0) return;

    const nextIds = nextUnlocks.map((achievement) => achievement.id);
    setUnlockedAchievements((prev) => [...new Set([...prev, ...nextIds])]);
    setUnlockQueue((prev) => {
      const queuedIds = new Set(prev.map((achievement) => achievement.id));
      if (newlyUnlocked) {
        queuedIds.add(newlyUnlocked.id);
      }

      return [
        ...prev,
        ...nextUnlocks.filter((achievement) => !queuedIds.has(achievement.id)),
      ];
    });

    nextUnlocks.forEach((achievement) => {
      writeAchievementUnlockMeta(storageScope, achievement.id);
      onApplyReward?.(achievement.id, achievement.points);

      if (userId && isSupabaseConfigured) {
        void achievementsService.unlock(userId, achievement.id).catch(() => undefined);
      }
    });
  }, [
    achievementContext,
    newlyUnlocked,
    onApplyReward,
    storageScope,
    unlockedAchievements,
    userData.achievements,
    userId,
  ]);

  return {
    unlockedAchievements,
    newlyUnlocked,
    dismissNewlyUnlocked,
    totalAchievements: ACHIEVEMENTS.length,
    progressPercentage: (unlockedAchievements.length / ACHIEVEMENTS.length) * 100,
  };
};
