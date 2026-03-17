import React, { useCallback, useEffect, useState } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { rankingService } from '../../services/ranking.service';
import type { CategoryRankingEntry, UserRankInfo } from '../../types/ranking';
import { useAuth } from '../../hooks/useAuth';
import './GlobalRankingPage.css';

interface CategoryStats {
  category: string;
  ranking: CategoryRankingEntry[];
  userRank: UserRankInfo | null;
  loading: boolean;
}

export function GlobalRankingPage() {
  const { user, supabaseUserId } = useAuth();
  const [categoryStats, setCategoryStats] = useState<Map<string, CategoryStats>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRankingData = useCallback(async () => {
    setLoading(true);
    try {
      // Get all categories
      const cats = await rankingService.getAllCategories();
      setCategories(cats);

      if (cats.length === 0) {
        setLoading(false);
        return;
      }

      // Set default category to first one
      if (!selectedCategory && cats.length > 0) {
        setSelectedCategory(cats[0]);
      }

      // Load ranking for each category
      const statsMap = new Map<string, CategoryStats>();

      for (const cat of cats) {
        const ranking = await rankingService.getCategoryRanking(cat, 100);
        const userRank = supabaseUserId
          ? await rankingService.getUserRankInCategory(supabaseUserId, cat)
          : null;

        statsMap.set(cat, {
          category: cat,
          ranking,
          userRank,
          loading: false,
        });
      }

      setCategoryStats(statsMap);
    } catch (error) {
      console.error('Error loading ranking data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, supabaseUserId]);

  useEffect(() => {
    void loadRankingData();
  }, [loadRankingData]);

  if (loading) {
    return <div className="global-ranking loading">Carregando rankings...</div>;
  }

  const currentStats = selectedCategory ? categoryStats.get(selectedCategory) : null;

  return (
    <div className="global-ranking-page">
      <div className="ranking-header">
        <h1 className="inline-flex items-center gap-2"><Trophy className="w-6 h-6" /> Ranking Global por Categoria</h1>
        <p>Veja os melhores estudantes em cada prova</p>
      </div>

      {categories.length === 0 ? (
        <div className="no-data">
          <p>Nenhum dado de ranking disponível ainda.</p>
          <p>Complete simulados para aparecer no ranking!</p>
        </div>
      ) : (
        <>
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {currentStats && (
            <div className="ranking-container">
              {user && currentStats.userRank && (
                <div className="user-rank-card">
                  <div className="user-rank-position">
                    <span className="badge">Sua Posição</span>
                    <span className="rank-number">#{currentStats.userRank.rank_position}</span>
                  </div>
                  <div className="user-rank-stats">
                    <div className="stat">
                      <span className="label">Acertos</span>
                      <span className="value">{currentStats.userRank.total_correct}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Respondidas</span>
                      <span className="value">{currentStats.userRank.total_answered}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Taxa de Acerto</span>
                      <span className="value">{currentStats.userRank.accuracy}%</span>
                    </div>
                    <div className="stat">
                      <span className="label">Percentil</span>
                      <span className="value">{currentStats.userRank.percentile}%</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="ranking-table-container">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th className="rank-col">Posição</th>
                      <th className="user-col">Usuário</th>
                      <th className="stats-col">Acertos</th>
                      <th className="stats-col">Total</th>
                      <th className="accuracy-col">Taxa de Acerto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStats.ranking.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="no-data-cell">
                          Nenhum usuário ranking nessa categoria ainda.
                        </td>
                      </tr>
                    ) : (
                      currentStats.ranking.map((entry) => (
                        <tr
                          key={entry.user_id}
                          className={supabaseUserId === entry.user_id ? 'current-user' : ''}
                        >
                          <td className="rank-col">
                            <span className="rank-badge">
                              {entry.rank_position === 1 && <Trophy className="w-4 h-4 text-yellow-500 inline" />}
                              {entry.rank_position === 2 && <Medal className="w-4 h-4 text-slate-400 inline" />}
                              {entry.rank_position === 3 && <Award className="w-4 h-4 text-amber-700 inline" />}
                              {entry.rank_position > 3 && `#${entry.rank_position}`}
                            </span>
                          </td>
                          <td className="user-col">
                            <div className="user-info">
                              {entry.avatar_url && (
                                <img
                                  src={entry.avatar_url}
                                  alt={entry.display_name}
                                  className="user-avatar"
                                />
                              )}
                              <span className="user-name">{entry.display_name}</span>
                            </div>
                          </td>
                          <td className="stats-col">{entry.total_correct}</td>
                          <td className="stats-col">{entry.total_answered}</td>
                          <td className="accuracy-col">
                            <div className="accuracy-bar">
                              <div
                                className="accuracy-fill"
                                style={{ width: `${entry.accuracy}%` }}
                              />
                              <span className="accuracy-text">{entry.accuracy}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default GlobalRankingPage;
