import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  Flame,
  Gift,
  Lock,
  Rocket,
  ScrollText,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { ACHIEVEMENTS } from '../../data/achievements';
import {
  buildAchievementContextFromStorage,
  getAchievementProgressRatio,
  isAchievementRecentlyUnlocked,
  readAchievementUnlockMeta,
  type AchievementUnlockMeta,
} from '../../services/achievementProgress.service';
import type { Achievement, AchievementCategory, UserData } from '../../types';

interface AchievementsPageProps {
  userData: UserData;
  storageScope: string;
  weeklyGoalMinutes: number;
}

const formatMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
};

const formatUnlockDate = (value?: string) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const CATEGORY_OPTIONS: Array<{
  value: AchievementCategory | 'all';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'all', label: 'Todas', icon: Sparkles },
  { value: 'streak', label: 'Streak', icon: Flame },
  { value: 'time', label: 'Tempo', icon: Clock3 },
  { value: 'milestone', label: 'Execucao', icon: Rocket },
  { value: 'exam', label: 'Simulados', icon: ScrollText },
  { value: 'goal', label: 'Metas', icon: Target },
];

const AchievementsPage: React.FC<AchievementsPageProps> = ({
  userData,
  storageScope,
  weeklyGoalMinutes,
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Achievement['category'] | 'all'>('all');
  const [unlockMeta, setUnlockMeta] = useState<AchievementUnlockMeta>(() => readAchievementUnlockMeta(storageScope));

  const unlockedIds = userData.achievements || [];
  const achievementsSignature = unlockedIds.join('|');

  useEffect(() => {
    setUnlockMeta(readAchievementUnlockMeta(storageScope));
  }, [achievementsSignature, storageScope]);

  const achievementContext = useMemo(
    () =>
      buildAchievementContextFromStorage(userData, {
        weeklyGoalMinutes,
      }),
    [userData, weeklyGoalMinutes],
  );

  const achievementCards = useMemo(
    () =>
      ACHIEVEMENTS.map((achievement) => {
        const isUnlocked = unlockedIds.includes(achievement.id);
        const progress = achievement.progress ? achievement.progress(achievementContext) : null;
        const progressRatio = getAchievementProgressRatio(progress);
        const unlockEntry = unlockMeta[achievement.id];
        const isFreshUnlock = isUnlocked && isAchievementRecentlyUnlocked(unlockEntry);

        return {
          achievement,
          isUnlocked,
          progress,
          progressRatio,
          unlockEntry,
          isFreshUnlock,
        };
      }),
    [achievementContext, unlockMeta, unlockedIds],
  );

  const filteredAchievements = useMemo(
    () =>
      achievementCards.filter(({ achievement, isUnlocked }) => {
        if (filter === 'unlocked' && !isUnlocked) return false;
        if (filter === 'locked' && isUnlocked) return false;
        if (categoryFilter !== 'all' && achievement.category !== categoryFilter) return false;

        return true;
      }),
    [achievementCards, categoryFilter, filter],
  );

  const latestUnlocked = useMemo(
    () =>
      achievementCards
        .filter(({ isUnlocked, unlockEntry }) => isUnlocked && Boolean(unlockEntry?.unlockedAt))
        .sort((left, right) => {
          const leftTime = Date.parse(left.unlockEntry?.unlockedAt || '');
          const rightTime = Date.parse(right.unlockEntry?.unlockedAt || '');
          return rightTime - leftTime;
        })[0] ?? null,
    [achievementCards],
  );

  const nextAchievement = useMemo(() => {
    const lockedCards = achievementCards.filter(({ isUnlocked }) => !isUnlocked);
    if (lockedCards.length === 0) return null;

    const ranked = [...lockedCards].sort((left, right) => {
      if (right.progressRatio !== left.progressRatio) {
        return right.progressRatio - left.progressRatio;
      }

      const leftGap = (left.progress?.target || 0) - (left.progress?.current || 0);
      const rightGap = (right.progress?.target || 0) - (right.progress?.current || 0);
      return leftGap - rightGap;
    });

    return ranked[0];
  }, [achievementCards]);

  const unlockedCount = unlockedIds.length;
  const totalCount = ACHIEVEMENTS.length;
  const lockedCount = totalCount - unlockedCount;
  const percentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;
  const unlockedPoints = ACHIEVEMENTS.filter((achievement) => unlockedIds.includes(achievement.id)).reduce(
    (sum, achievement) => sum + achievement.points,
    0,
  );

  return (
    <div className="achievements-page mx-auto max-w-6xl space-y-6 p-4 sm:p-6" data-testid="achievements-page-ready">
      <section
        className="overflow-hidden rounded-[28px] border border-slate-800/70 px-5 py-5 text-white shadow-[0_20px_60px_-28px_rgba(15,23,42,0.8)] sm:px-6 sm:py-6"
        style={{
          background:
            'radial-gradient(circle at top right, rgba(251,191,36,0.28), transparent 36%), linear-gradient(135deg, #0f172a 0%, #1e293b 56%, #111827 100%)',
        }}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100/90">
              <Trophy className="h-3.5 w-3.5" />
              Conquistas ativas
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Recompensa o esforco que ja virou habito.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Timer, simulados e consistencia agora alimentam desbloqueios de verdade. Cada conquista mostra o
              que voce ja conquistou e o que falta para o proximo salto.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HeroStat
                label="Desbloqueadas"
                value={`${unlockedCount}/${totalCount}`}
                caption={`${percentage.toFixed(0)}% do mural`}
              />
              <HeroStat
                label="Horas acumuladas"
                value={formatMinutes(achievementContext.totalMinutes)}
                caption={`${achievementContext.sessionCount} sessoes completas`}
              />
              <HeroStat
                label="Streak atual"
                value={`${achievementContext.currentStreak} dias`}
                caption={`Melhor marca: ${achievementContext.bestStreak} dias`}
              />
              <HeroStat
                label="Simulados"
                value={`${achievementContext.completedMockExams}`}
                caption={`Melhor prova: ${Math.round(achievementContext.bestMockExamAccuracy)}%`}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur" data-testid="achievements-latest-unlocked">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                Ultima conquista
              </p>
              {latestUnlocked ? (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                      {latestUnlocked.achievement.rarity}
                    </span>
                    {latestUnlocked.isFreshUnlock && (
                      <span
                        data-testid="achievements-new-badge"
                        className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200"
                      >
                        NEW
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-2xl font-bold text-white">{latestUnlocked.achievement.title}</h2>
                  <p className="mt-2 text-sm text-slate-300">{latestUnlocked.achievement.description}</p>
                  <p className="mt-3 text-xs text-slate-400">
                    {formatUnlockDate(latestUnlocked.unlockEntry?.unlockedAt) || 'Desbloqueada recentemente'}
                  </p>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-white/15 bg-slate-950/35 p-4">
                  <p className="text-lg font-bold text-white">Sua primeira conquista esta a uma sessao de distancia.</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Complete uma sessao de foco ou entregue um simulado para abrir o mural de recompensas.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur" data-testid="achievements-next-target">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Proxima da fila
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-white">
                    {nextAchievement ? nextAchievement.achievement.title : 'Mural completo'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {nextAchievement
                      ? nextAchievement.achievement.description
                      : 'Voce desbloqueou todas as conquistas disponiveis nesta fase.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 text-right">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Pontos ganhos</p>
                  <p className="text-xl font-black text-white">{unlockedPoints}</p>
                </div>
              </div>

              {nextAchievement?.progress && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                    <span>Progresso atual</span>
                    <span>
                      {nextAchievement.progress.current} / {nextAchievement.progress.target}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(nextAchievement.progressRatio * 100, 6)}%`,
                        background:
                          'linear-gradient(90deg, rgba(251,191,36,0.95) 0%, rgba(249,115,22,0.95) 100%)',
                        boxShadow: '0 0 18px rgba(251,191,36,0.35)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bloqueadas" value={lockedCount} icon={CircleDashed} />
        <StatCard label="Meta semanal" value={formatMinutes(weeklyGoalMinutes)} icon={Target} />
        <StatCard label="Semana atual" value={formatMinutes(achievementContext.weeklyStudiedMinutes)} icon={Clock3} />
        <StatCard label="Pontos ganhos" value={`${unlockedPoints}`} icon={Trophy} />
      </section>

      <section className="rounded-3xl border border-slate-800/70 bg-slate-950/80 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.95)] sm:p-5">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Status</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label="Todas" icon={Sparkles} />
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
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Categoria</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map(({ value, label, icon }) => (
              <CategoryButton
                key={value}
                active={categoryFilter === value}
                onClick={() => setCategoryFilter(value)}
                label={label}
                icon={icon}
              />
            ))}
          </div>
        </div>
      </section>

      {unlockedCount === 0 && (
        <section className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/70 p-5 text-center shadow-[0_18px_36px_-28px_rgba(15,23,42,0.95)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-300">Primeiro marco</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-100">Sua primeira conquista esta perto.</h2>
          <p className="mt-2 text-sm text-slate-400">
            Uma sessao concluida ou um simulado entregue ja desbloqueia o mural e inicia sua cadeia de recompensas.
          </p>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="achievements-grid">
        {filteredAchievements.map(({ achievement, isUnlocked, progress, unlockEntry, isFreshUnlock }) => {
          const Icon = achievement.icon;
          const progressWidth = `${Math.max(getAchievementProgressRatio(progress) * 100, progress ? 6 : 0)}%`;

          return (
            <div
              key={achievement.id}
              data-testid={`achievement-card-${achievement.id}`}
              data-achievement-status={isUnlocked ? 'unlocked' : 'locked'}
              className={`rounded-3xl border p-4 transition-all duration-200 ${
                isUnlocked
                  ? 'bg-slate-950 border-slate-800 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.95)]'
                  : 'bg-slate-950/70 border-slate-800/70 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.95)]'
              }`}
              style={
                isFreshUnlock
                  ? {
                      boxShadow:
                        '0 0 0 1px rgba(251,191,36,0.28), 0 0 30px rgba(251,191,36,0.16), 0 18px 40px -24px rgba(15,23,42,0.95)',
                    }
                  : undefined
              }
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                    isUnlocked
                      ? 'border-amber-300/25 bg-amber-400/10 text-amber-200'
                      : 'border-slate-700 bg-slate-900 text-slate-500'
                  }`}
                >
                  {isUnlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100">{achievement.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getRarityStyle(achievement.rarity)}`}>
                      {achievement.rarity}
                    </span>
                    {isFreshUnlock && (
                      <span
                        data-testid={`achievement-new-${achievement.id}`}
                        className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300"
                      >
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{achievement.description}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs">
                <span
                  className={`rounded-full px-2 py-1 font-semibold uppercase tracking-wide ${
                    isUnlocked
                      ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                      : 'border border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  {isUnlocked ? 'Desbloqueada' : 'Em progresso'}
                </span>
                <span className="text-slate-400">+{achievement.points} pontos</span>
              </div>

              {progress && !isUnlocked && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Progresso</span>
                    <span>
                      {progress.current} / {progress.target}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: progressWidth,
                        background:
                          'linear-gradient(90deg, rgba(249,115,22,0.96) 0%, rgba(245,158,11,0.96) 100%)',
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>{unlockEntry?.unlockedAt ? formatUnlockDate(unlockEntry.unlockedAt) : 'Ainda nao desbloqueada'}</span>
                {achievement.reward && isUnlocked && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-amber-200">
                    <Gift className="h-3 w-3" />
                    {achievement.reward.value}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {filteredAchievements.length === 0 && (
        <div className="py-12 text-center text-sm text-slate-400">
          Nenhuma conquista encontrada com os filtros selecionados.
        </div>
      )}
    </div>
  );
};

const HeroStat: React.FC<{
  label: string;
  value: string;
  caption: string;
}> = ({ label, value, caption }) => (
  <div className="rounded-2xl border border-white/10 bg-white/6 p-3 backdrop-blur">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">{label}</p>
    <p className="mt-2 text-xl font-black text-white">{value}</p>
    <p className="mt-1 text-xs text-slate-400">{caption}</p>
  </div>
);

const FilterButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = ({ active, onClick, label, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
      active
        ? 'text-white shadow-[0_12px_30px_-20px_rgba(249,115,22,0.85)]'
        : 'border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
    }`}
    style={active ? { backgroundColor: 'var(--color-primary)' } : undefined}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

const CategoryButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = ({ active, onClick, label, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
      active
        ? 'text-white shadow-[0_10px_28px_-22px_rgba(99,102,241,0.95)]'
        : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
    }`}
    style={active ? { backgroundColor: 'var(--color-secondary)' } : undefined}
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
  </button>
);

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}> = ({ label, value, icon: Icon }) => (
  <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.95)]">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-black text-slate-100">{value}</p>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-[var(--color-primary)]">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const getRarityStyle = (rarity: Achievement['rarity']) => {
  const styles = {
    common: 'border border-slate-700 bg-slate-800 text-slate-200',
    rare: 'border border-sky-800/40 bg-sky-950/40 text-sky-300',
    epic: 'border border-violet-800/40 bg-violet-950/40 text-violet-300',
    legendary: 'border border-amber-800/40 bg-amber-950/40 text-amber-300',
  };

  return styles[rarity];
};

export default AchievementsPage;
