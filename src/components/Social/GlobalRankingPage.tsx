import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  Medal,
  RefreshCcw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
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

const MOCK_RANKING_PREVIEW: CategoryRankingEntry[] = [
  {
    rank_position: 1,
    user_id: 'preview-1',
    display_name: 'Ana Clara',
    avatar_url: null,
    total_correct: 182,
    total_answered: 210,
    accuracy: 87,
  },
  {
    rank_position: 2,
    user_id: 'preview-2',
    display_name: 'Lucas Melo',
    avatar_url: null,
    total_correct: 171,
    total_answered: 205,
    accuracy: 83,
  },
  {
    rank_position: 3,
    user_id: 'preview-3',
    display_name: 'Marina Costa',
    avatar_url: null,
    total_correct: 163,
    total_answered: 198,
    accuracy: 82,
  },
  {
    rank_position: 4,
    user_id: 'preview-4',
    display_name: 'Felipe Rocha',
    avatar_url: null,
    total_correct: 149,
    total_answered: 190,
    accuracy: 78,
  },
  {
    rank_position: 5,
    user_id: 'preview-5',
    display_name: 'Julia Nunes',
    avatar_url: null,
    total_correct: 141,
    total_answered: 187,
    accuracy: 75,
  },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getPreviewFillWidth(accuracy: number) {
  return `${Math.max(16, Math.min(accuracy, 100))}%`;
}

function EmptyStatePreview({
  entries,
  title,
  subtitle,
}: {
  entries: CategoryRankingEntry[];
  title: string;
  subtitle: string;
}) {
  const podium = [entries[1], entries[0], entries[2]].filter(Boolean) as CategoryRankingEntry[];

  return (
    <div className="ranking-preview">
      <div className="ranking-preview-header">
        <div>
          <span className="ranking-preview-badge">Preview visual</span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className="ranking-preview-tag">Exemplo</span>
      </div>

      <div className="ranking-preview-podium">
        {podium.map((entry) => (
          <div
            key={entry.user_id}
            className={`preview-podium-card preview-podium-card--${entry.rank_position}`}
          >
            <span className="preview-podium-place">
              {entry.rank_position === 1 && <Trophy className="w-4 h-4" />}
              {entry.rank_position === 2 && <Medal className="w-4 h-4" />}
              {entry.rank_position === 3 && <Award className="w-4 h-4" />}
              <strong>#{entry.rank_position}</strong>
            </span>

            <div className="preview-avatar">{getInitials(entry.display_name)}</div>

            <div className="preview-podium-copy">
              <strong>{entry.display_name}</strong>
              <span>{entry.total_correct} acertos acumulados</span>
            </div>

            <div className="preview-progress-track">
              <div
                className="preview-progress-fill"
                style={{ width: getPreviewFillWidth(entry.accuracy) }}
              />
            </div>

            <div className="preview-podium-metrics">
              <span>{entry.total_answered} questoes</span>
              <span>{entry.accuracy}% de acerto</span>
            </div>
          </div>
        ))}
      </div>

      <div className="ranking-preview-list">
        {entries.map((entry) => (
          <div key={entry.user_id} className="ranking-preview-row">
            <div className="ranking-preview-user">
              <span className="ranking-preview-position">#{entry.rank_position}</span>
              <div className="preview-avatar preview-avatar--small">
                {getInitials(entry.display_name)}
              </div>
              <div className="ranking-preview-copy">
                <strong>{entry.display_name}</strong>
                <span>{entry.total_correct} acertos</span>
              </div>
            </div>

            <div className="ranking-preview-row-metrics">
              <span>{entry.total_answered} questoes</span>
              <span>{entry.accuracy}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GlobalRankingPage() {
  const { user, supabaseUserId } = useAuth();
  const [categoryStats, setCategoryStats] = useState<Map<string, CategoryStats>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  const loadRankingData = useCallback(async () => {
    setLoading(true);
    try {
      const cats = await rankingService.getAllCategories();
      setCategories(cats);

      if (cats.length === 0) {
        setLoading(false);
        return;
      }

      if (!selectedCategory && cats.length > 0) {
        setSelectedCategory(cats[0]);
      }

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

  const activeCategory = selectedCategory ?? categories[0] ?? null;
  const currentStats = activeCategory ? categoryStats.get(activeCategory) : null;
  const currentRanking = currentStats?.ranking ?? [];

  const rankingSummary =
    currentRanking.length > 0
      ? {
          totalAnswered: currentRanking.reduce((sum, entry) => sum + entry.total_answered, 0),
          averageAccuracy: Math.round(
            currentRanking.reduce((sum, entry) => sum + entry.accuracy, 0) /
              currentRanking.length,
          ),
          leader: currentRanking[0],
        }
      : null;

  if (loading) {
    return <div className="global-ranking loading">Carregando rankings...</div>;
  }

  return (
    <div className="global-ranking-page">
      <div className="ranking-header">
        <h1 className="inline-flex items-center gap-2">
          <Trophy className="w-6 h-6" /> Ranking Global por Categoria
        </h1>
        <p>Veja quem esta puxando o ritmo dos simulados em cada prova.</p>
      </div>

      {categories.length === 0 ? (
        <div className="ranking-empty-state">
          <div className="ranking-empty-hero">
            <div className="ranking-empty-copy">
              <span className="ranking-empty-kicker">
                <Sparkles className="w-4 h-4" /> Ranking aguardando dados reais
              </span>
              <h2>O ranking global ainda nao foi formado.</h2>
              <p>
                Assim que os primeiros simulados forem concluidos, esta tela mostra quem lidera,
                quem esta subindo e onde voce entra na disputa.
              </p>

              <div className="ranking-empty-actions">
                <button
                  type="button"
                  className="ranking-empty-button"
                  onClick={() => void loadRankingData()}
                >
                  <RefreshCcw className="w-4 h-4" />
                  Atualizar ranking
                </button>
                <button
                  type="button"
                  className="ranking-empty-button ranking-empty-button--ghost"
                  onClick={() => setShowPreview((current) => !current)}
                >
                  <Target className="w-4 h-4" />
                  {showPreview ? 'Ocultar preview' : 'Ver preview visual'}
                </button>
              </div>
            </div>

            <div className="ranking-empty-steps">
              <div className="ranking-empty-step">
                <span>1</span>
                <div>
                  <strong>Faca simulados</strong>
                  <p>Os dados entram no ranking conforme os resultados sao salvos.</p>
                </div>
              </div>
              <div className="ranking-empty-step">
                <span>2</span>
                <div>
                  <strong>Acumule acertos</strong>
                  <p>Acertos, volume e taxa de precisao comecam a separar a lideranca.</p>
                </div>
              </div>
              <div className="ranking-empty-step">
                <span>3</span>
                <div>
                  <strong>Volte para comparar</strong>
                  <p>Quando houver dados, voce ve posicao, percentil e ritmo por categoria.</p>
                </div>
              </div>
            </div>
          </div>

          {showPreview && (
            <EmptyStatePreview
              entries={MOCK_RANKING_PREVIEW}
              title="Como o ranking vai aparecer com dados"
              subtitle="Esse exemplo existe so para validar a experiencia visual enquanto o ranking real ainda esta vazio."
            />
          )}
        </div>
      ) : (
        <>
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
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
                    <span className="badge">Sua posicao</span>
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
                      <span className="label">Taxa de acerto</span>
                      <span className="value">{currentStats.userRank.accuracy}%</span>
                    </div>
                    <div className="stat">
                      <span className="label">Percentil</span>
                      <span className="value">{currentStats.userRank.percentile}%</span>
                    </div>
                  </div>
                </div>
              )}

              {rankingSummary && (
                <div className="ranking-summary-strip">
                  <div className="ranking-summary-item">
                    <span className="summary-label">Lider atual</span>
                    <strong>{rankingSummary.leader.display_name}</strong>
                  </div>
                  <div className="ranking-summary-item">
                    <span className="summary-label">Questoes respondidas</span>
                    <strong>{rankingSummary.totalAnswered}</strong>
                  </div>
                  <div className="ranking-summary-item">
                    <span className="summary-label">Media de acerto</span>
                    <strong>{rankingSummary.averageAccuracy}%</strong>
                  </div>
                </div>
              )}

              {currentRanking.length === 0 ? (
                <div className="ranking-empty-inline">
                  <div className="ranking-empty-inline-copy">
                    <span className="ranking-empty-kicker">
                      <Sparkles className="w-4 h-4" /> Categoria sem pontuacao ainda
                    </span>
                    <h3>{activeCategory} ainda nao tem lideranca formada.</h3>
                    <p>
                      Assim que os resultados dessa categoria forem registrados, o ranking aparece
                      aqui com posicao, acertos e taxa de desempenho.
                    </p>
                  </div>

                  <div className="ranking-empty-actions">
                    <button
                      type="button"
                      className="ranking-empty-button"
                      onClick={() => void loadRankingData()}
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Atualizar categoria
                    </button>
                    <button
                      type="button"
                      className="ranking-empty-button ranking-empty-button--ghost"
                      onClick={() => setShowPreview((current) => !current)}
                    >
                      <Target className="w-4 h-4" />
                      {showPreview ? 'Ocultar preview' : 'Ver preview visual'}
                    </button>
                  </div>

                  {showPreview && (
                    <EmptyStatePreview
                      entries={MOCK_RANKING_PREVIEW}
                      title={`Exemplo visual para ${activeCategory}`}
                      subtitle="Esse preview ajuda a validar hierarquia, disputa e leitura enquanto os dados reais ainda nao chegaram."
                    />
                  )}
                </div>
              ) : (
                <div className="ranking-table-container">
                  <table className="ranking-table">
                    <thead>
                      <tr>
                        <th className="rank-col">Posicao</th>
                        <th className="user-col">Usuario</th>
                        <th className="stats-col">Acertos</th>
                        <th className="stats-col">Total</th>
                        <th className="accuracy-col">Taxa de acerto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRanking.map((entry) => (
                        <tr
                          key={entry.user_id}
                          className={supabaseUserId === entry.user_id ? 'current-user' : ''}
                        >
                          <td className="rank-col">
                            <span className="rank-badge">
                              {entry.rank_position === 1 && (
                                <Trophy className="w-4 h-4 text-yellow-500 inline" />
                              )}
                              {entry.rank_position === 2 && (
                                <Medal className="w-4 h-4 text-slate-400 inline" />
                              )}
                              {entry.rank_position === 3 && (
                                <Award className="w-4 h-4 text-amber-700 inline" />
                              )}
                              {entry.rank_position > 3 && `#${entry.rank_position}`}
                            </span>
                          </td>
                          <td className="user-col">
                            <div className="user-info">
                              {entry.avatar_url ? (
                                <img
                                  src={entry.avatar_url}
                                  alt={entry.display_name}
                                  className="user-avatar"
                                />
                              ) : (
                                <div className="user-avatar user-avatar--fallback">
                                  {getInitials(entry.display_name)}
                                </div>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default GlobalRankingPage;
