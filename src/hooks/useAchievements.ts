import { useState, useEffect, useRef } from 'react';
import { ACHIEVEMENTS } from '../data/achievements';
import { Achievement, UserData } from '../types';
import { achievementsService } from '../services/achievements.service';
import { isSupabaseConfigured } from '../services/supabase.client';
import { logger } from '../utils/logger';

type ApplyAchievementReward = (achievementId: string, points: number) => void;

export const useAchievements = (
  userData: UserData,
  userId?: string | null,
  onApplyReward?: ApplyAchievementReward,
) => {
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);
  const syncedRef = useRef(false);
  const processingRef = useRef<Set<string>>(new Set());

  // ── Cloud sync: carregar conquistas salvas ──
  useEffect(() => {
    if (!userId || !isSupabaseConfigured || syncedRef.current) return;

    let cancelled = false;

    const loadCloud = async () => {
      try {
        const cloudIds = await achievementsService.listUnlocked(userId);
        if (cancelled) return;

        // Merge: cloud + local
        const localIds = userData.achievements || [];
        const merged = [...new Set([...localIds, ...cloudIds])];
        setUnlockedAchievements(merged);

        // Push local-only to cloud
        const cloudSet = new Set(cloudIds);
        const localOnly = localIds.filter((id) => !cloudSet.has(id));
        if (localOnly.length > 0) {
          void achievementsService.unlockBatch(userId, localOnly).catch(() => { });
        }

        syncedRef.current = true;
      } catch {
        // Fallback local
      }
    };

    void loadCloud();
    return () => { cancelled = true; };
  }, [userId, userData.achievements]);

  // ── Verificar novas conquistas ──
  useEffect(() => {
    const checkAchievements = () => {
      const currentUnlocked = userData.achievements || [];

      ACHIEVEMENTS.forEach(achievement => {
        const isUnlocked = currentUnlocked.includes(achievement.id);

        try {
          const meetsCondition = achievement.condition(userData);

          if (!isUnlocked && meetsCondition && !processingRef.current.has(achievement.id)) {
            processingRef.current.add(achievement.id);
            setUnlockedAchievements(prev => [...new Set([...prev, achievement.id])]);
            setNewlyUnlocked(achievement);

            onApplyReward?.(achievement.id, achievement.points);

            // Push to cloud
            if (userId && isSupabaseConfigured) {
              void achievementsService.unlock(userId, achievement.id).catch(() => { });
            }

            setTimeout(() => setNewlyUnlocked(null), 5000);
          }
        } catch (error) {
          logger.error(`Erro ao verificar conquista ${achievement.id}`, 'Achievements', error);
        } finally {
          processingRef.current.delete(achievement.id);
        }
      });
    };

    checkAchievements();
  }, [userData, userId, onApplyReward]);

  return {
    unlockedAchievements,
    newlyUnlocked,
    totalAchievements: ACHIEVEMENTS.length,
    progressPercentage: (unlockedAchievements.length / ACHIEVEMENTS.length) * 100
  };
};
