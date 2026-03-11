// Types for Global Ranking
export interface CategoryRankingEntry {
  rank_position: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_correct: number;
  total_answered: number;
  accuracy: number;
}

export interface UserRankInfo {
  rank_position: number;
  total_correct: number;
  total_answered: number;
  accuracy: number;
  percentile: number;
}

export interface CategoryStats {
  category: string;
  user_id: string;
  rank_position: number | null;
  total_correct: number;
  total_answered: number;
  accuracy: number;
}
