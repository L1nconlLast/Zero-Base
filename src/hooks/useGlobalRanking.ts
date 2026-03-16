import { useState, useEffect, useCallback, useRef } from 'react';
import { rankingService } from '../services/ranking.service';
import type { CategoryRankingEntry, UserRankInfo } from '../types/ranking';

interface UseGlobalRankingReturn {
  categories: string[];
  currentCategory: string | null;
  ranking: CategoryRankingEntry[];
  userRank: UserRankInfo | null;
  loading: boolean; 
  error: Error | null;
  setCurrentCategory: (category: string) => void;
  refresh: () => Promise<void>;
}

export function useGlobalRanking(userId?: string): UseGlobalRankingReturn {
  const initializedRef = useRef(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [ranking, setRanking] = useState<CategoryRankingEntry[]>([]);
  const [userRank, setUserRank] = useState<UserRankInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load categories
      const cats = await rankingService.getAllCategories();
      setCategories(cats);

      if (cats.length > 0) {
        // Set first category as default
        const firstCat = currentCategory || cats[0];
        setCurrentCategory(firstCat);

        // Load ranking for current category
        const rankingData = await rankingService.getCategoryRanking(firstCat, 100);
        setRanking(rankingData);

        // Load user rank if userId is provided
        if (userId) {
          const userRankData = await rankingService.getUserRankInCategory(userId, firstCat);
          setUserRank(userRankData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [userId, currentCategory]);

  const handleCategoryChange = useCallback(async (category: string) => {
    setCurrentCategory(category);
    setLoading(true);

    try {
      const rankingData = await rankingService.getCategoryRanking(category, 100);
      setRanking(rankingData);

      if (userId) {
        const userRankData = await rankingService.getUserRankInCategory(userId, category);
        setUserRank(userRankData);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    if (currentCategory) {
      await handleCategoryChange(currentCategory);
    } else {
      await loadData();
    }
  }, [currentCategory, handleCategoryChange, loadData]);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    void loadData();
  }, [loadData]);

  return {
    categories,
    currentCategory,
    ranking,
    userRank,
    loading,
    error,
    setCurrentCategory: handleCategoryChange,
    refresh,
  };
}
