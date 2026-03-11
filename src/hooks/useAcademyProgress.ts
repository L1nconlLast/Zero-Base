import { useState, useCallback } from 'react';
import { academyService } from '../services/academy.service';
import { logger } from '../utils/logger';

type CompleteStatus = 'saved' | 'already_completed' | 'blocked' | 'saved_offline';

interface CompleteResult {
  status: CompleteStatus;
  message: string;
  xpReward: number;
  newTotalXp: number;
}

export function useAcademyProgress(userId: string | null) {
  const [isLoadingContentId, setIsLoadingContentId] = useState<string | null>(null);

  const saveToLocalFallback = (contentId: string) => {
    const storageKey = 'mdz_offline_academy_progress';
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];

    if (!existing.includes(contentId)) {
      existing.push(contentId);
      localStorage.setItem(storageKey, JSON.stringify(existing));
    }
  };

  const handleCompleteContent = useCallback(
    async (
      contentId: string,
      onOptimisticUpdate: () => void,
      onRevert: () => void,
      onSyncTotalXp?: (newTotalXp: number) => void
    ): Promise<CompleteResult> => {
      setIsLoadingContentId(contentId);

      onOptimisticUpdate();

      if (!userId) {
        saveToLocalFallback(contentId);
        setIsLoadingContentId(null);
        return {
          status: 'saved_offline',
          message: 'Progresso salvo localmente (offline).',
          xpReward: 0,
          newTotalXp: 0,
        };
      }

      try {
        const result = await academyService.completeContent(userId, contentId);

        if (result.alreadyCompleted) {
          onRevert();
          onSyncTotalXp?.(result.newTotalXp);
          return {
            status: 'already_completed',
            message: result.message,
            xpReward: result.xpReward,
            newTotalXp: result.newTotalXp,
          };
        }

        if (!result.success) {
          onRevert();
          onSyncTotalXp?.(result.newTotalXp);
          return {
            status: 'blocked',
            message: result.message,
            xpReward: result.xpReward,
            newTotalXp: result.newTotalXp,
          };
        }

        onSyncTotalXp?.(result.newTotalXp);
        return {
          status: 'saved',
          message: result.message,
          xpReward: result.xpReward,
          newTotalXp: result.newTotalXp,
        };
      } catch (error) {
        logger.warn('Falha ao sincronizar com Supabase. Acionando fallback local.', 'AcademyProgress', error);

        try {
          saveToLocalFallback(contentId);
          return {
            status: 'saved_offline',
            message: 'Progresso salvo localmente enquanto a conexão com a nuvem falhou.',
            xpReward: 0,
            newTotalXp: 0,
          };
        } catch (localError) {
          logger.error('Erro crítico no fallback local', 'AcademyProgress', localError);
          onRevert();
          throw new Error('Erro ao salvar progresso. Verifique sua conexão ou espaço em disco.');
        }
      } finally {
        setIsLoadingContentId(null);
      }
    },
    [userId]
  );

  return {
    handleCompleteContent,
    isLoadingContentId,
  };
}
