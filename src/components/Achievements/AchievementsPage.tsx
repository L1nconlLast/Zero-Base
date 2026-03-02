import React, { useState } from 'react';
import { Trophy, Lock, Gift, Sparkles, CheckCircle2, CircleDashed, Flame, Clock3, Flag } from 'lucide-react';
import { ACHIEVEMENTS } from '../../data/achievements';
import { UserData, Achievement } from '../../types';

interface AchievementsPageProps {
  userData: UserData;
}

const AchievementsPage: React.FC<AchievementsPageProps> = ({ userData }) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Achievement['category'] | 'all'>('all');

  const unlockedIds = userData.achievements || [];

  const filteredAchievements = ACHIEVEMENTS.filter((achievement) => {
    const isUnlocked = unlockedIds.includes(achievement.id);

    if (filter === 'unlocked' && !isUnlocked) return false;
    if (filter === 'locked' && isUnlocked) return false;
    if (categoryFilter !== 'all' && achievement.category !== categoryFilter) return false;

    return true;
  });

  const unlockedCount = unlockedIds.length;
  const totalCount = ACHIEVEMENTS.length;
  const lockedCount = totalCount - unlockedCount;
  const percentage = (unlockedCount / totalCount) * 100;
  const unlockedPoints = ACHIEVEMENTS.filter((achievement) => unlockedIds.includes(achievement.id)).reduce(
    (sum, achievement) => sum + achievement.points,
    0
  );

  return (
    <div className="achievements-page max-w-6xl mx-auto p-4 sm:p-6 space-y-0.5">
      <div
        className="text-white rounded-2xl p-4 sm:p-6 mb-5 sm:mb-6 shadow-lg"
        style={{ backgroundImage: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">Conquistas</h1>
              <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                {unlockedCount} de {totalCount} desbloqueadas
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-3xl sm:text-4xl font-bold leading-none">{percentage.toFixed(0)}%</div>
            <div className="text-xs sm:text-sm opacity-80 mt-1">Completude</div>
          </div>
        </div>

        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Desbloqueadas" value={unlockedCount} icon={CheckCircle2} />
        <StatCard label="Bloqueadas" value={lockedCount} icon={CircleDashed} />
        <StatCard label="Pontos ganhos" value={unlockedPoints} icon={Trophy} />
      </div>

      <div className="rounded-xl border border-slate-700/70 bg-slate-900/85 backdrop-blur-sm p-3.5 sm:p-4 mb-6 shadow-[0_10px_26px_-18px_rgba(2,6,23,0.95)]">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-2">Status</p>
          <div className="flex flex-wrap gap-3">
            <FilterButton
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              label="Todas"
              icon={Sparkles}
            />
            <FilterButton
              active={filter === 'unlocked'}
              onClick={() => setFilter('unlocked')}
              label={`Desbloqueadas (${unlockedCount})`}
              icon={CheckCircle2}
            />
            <FilterButton
              active={filter === 'locked'}
              onClick={() => setFilter('locked')}
              label={`Bloqueadas (${lockedCount})`}
              icon={CircleDashed}
            />
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-2">Categoria</p>
          <div className="flex flex-wrap gap-2">
            <CategoryButton
              active={categoryFilter === 'all'}
              onClick={() => setCategoryFilter('all')}
              label="Todas"
              icon={Sparkles}
            />
            <CategoryButton
              active={categoryFilter === 'streak'}
              onClick={() => setCategoryFilter('streak')}
              label="Streak"
              icon={Flame}
            />
            <CategoryButton
              active={categoryFilter === 'time'}
              onClick={() => setCategoryFilter('time')}
              label="Tempo"
              icon={Clock3}
            />
            <CategoryButton
              active={categoryFilter === 'milestone'}
              onClick={() => setCategoryFilter('milestone')}
              label="Marco"
              icon={Flag}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => {
          const isUnlocked = unlockedIds.includes(achievement.id);
          const Icon = achievement.icon;
          const progress = achievement.progress ? achievement.progress(userData) : null;

          return (
            <div
              key={achievement.id}
              className={`
                motion-card motion-enter rounded-xl p-4 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
                ${isUnlocked
                  ? 'bg-slate-900 border-slate-700/70 shadow-[0_10px_24px_-16px_rgba(2,6,23,0.95)]'
                  : 'bg-slate-900/65 border-slate-700/60 opacity-90'
                }
              `}
              style={
                isUnlocked
                  ? {
                      boxShadow:
                        '0 0 0 1px color-mix(in srgb, var(--color-primary) 26%, transparent), 0 14px 30px -16px color-mix(in srgb, var(--color-primary) 22%, #000)',
                    }
                  : undefined
              }
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`
                    p-3 rounded-xl border
                    ${isUnlocked
                      ? 'bg-slate-800/70 border-slate-600/70'
                      : 'bg-slate-800/50 border-slate-700/70'
                    }
                  `}
                  style={isUnlocked ? { color: 'var(--color-primary)' } : { color: '#9ca3af' }}
                >
                  {isUnlocked ? <Icon className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold tracking-tight text-slate-100">{achievement.title}</h3>
                    <span
                      className={`
                        px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide
                        ${getRarityStyle(achievement.rarity)}
                      `}
                    >
                      {achievement.rarity}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        isUnlocked
                          ? 'bg-emerald-950/35 text-emerald-300 border border-emerald-700/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {isUnlocked ? 'Desbloqueada' : 'Bloqueada'}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-400">{achievement.description}</p>
                </div>
              </div>

              {progress && !isUnlocked && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1 text-slate-400">
                    <span>Progresso</span>
                    <span>
                      {progress.current} / {progress.target}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700/80 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        backgroundImage:
                          'linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 85%, #fff 15%), color-mix(in srgb, var(--color-primary) 55%, #fff 45%))',
                        boxShadow: '0 0 10px color-mix(in srgb, var(--color-primary) 40%, transparent)',
                        width: `${Math.min((progress.current / progress.target) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className={isUnlocked ? 'text-emerald-300 font-semibold' : 'text-slate-400'}>
                  +{achievement.points} pontos
                </span>
                {achievement.reward && isUnlocked && (
                  <span
                    className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded flex items-center gap-1"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <Gift className="w-3 h-3" />
                    {achievement.reward.value}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          Nenhuma conquista encontrada com os filtros selecionados.
        </div>
      )}
    </div>
  );
};

const FilterButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = ({ active, onClick, label, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`
      px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5 sm:gap-2
      ${active
        ? 'text-white shadow-sm'
        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
      }
    `}
    style={active ? { backgroundColor: 'var(--color-primary)' } : undefined}
  >
    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
    {label}
  </button>
);

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}> = ({ label, value, icon: Icon }) => (
  <div className="motion-card motion-enter rounded-xl border border-slate-700/70 bg-slate-900 p-3.5 sm:p-4 shadow-[0_10px_24px_-16px_rgba(2,6,23,0.95)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-slate-100">{value}</p>
      </div>
      <div
        className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center"
        style={{ color: 'var(--color-primary)' }}
      >
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
    </div>
  </div>
);

const CategoryButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = ({ active, onClick, label, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`
      px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition flex items-center gap-1.5
      ${active
        ? 'text-white'
        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
      }
    `}
    style={active ? { backgroundColor: 'var(--color-secondary)' } : undefined}
  >
    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
    {label}
  </button>
);

const getRarityStyle = (rarity: Achievement['rarity']) => {
  const styles = {
    common: 'bg-slate-800 text-slate-200 border border-slate-700',
    rare: 'bg-sky-950/40 text-sky-300 border border-sky-800/50',
    epic: 'bg-violet-950/40 text-violet-300 border border-violet-800/50',
    legendary: 'bg-amber-950/40 text-amber-300 border border-amber-800/50',
  };
  return styles[rarity];
};

export default AchievementsPage;
