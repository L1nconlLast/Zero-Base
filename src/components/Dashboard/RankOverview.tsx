import React from 'react';
import { Crown, Gem, Shield, Sparkles, Trophy, Flame, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LEVELS, getLevelByPoints } from '../../data/levels';

interface RankOverviewProps {
  userPoints: number;
  highlightSignal?: number;
  darkMode?: boolean;
}

const RankOverview: React.FC<RankOverviewProps> = ({ userPoints, highlightSignal = 0, darkMode = false }) => {
  const currentLevel = getLevelByPoints(userPoints);
  const [isHighlighted, setIsHighlighted] = React.useState(false);

  const iconByLevel: Record<number, LucideIcon> = {
    1: Shield,
    2: Sparkles,
    3: Trophy,
    4: Gem,
    5: Crown,
    6: Flame,
    7: Star,
    8: Trophy,
    9: Crown,
    10: Flame,
  };

  React.useEffect(() => {
    if (!highlightSignal) {
      return;
    }

    setIsHighlighted(true);
    const timeout = window.setTimeout(() => setIsHighlighted(false), 1000);

    return () => window.clearTimeout(timeout);
  }, [highlightSignal]);

  return (
    <div
      id="ranks-section"
      className={`rounded-2xl border border-slate-700/60 bg-slate-900 p-4 sm:p-6 scroll-mt-24 transition-all duration-500 shadow-[0_10px_30px_-16px_rgba(2,6,23,0.85)] ${
        isHighlighted ? 'ring-2 ring-transparent' : ''
      }`}
      style={
        isHighlighted
          ? {
              boxShadow: darkMode
                ? '0 0 0 2px color-mix(in srgb, var(--color-primary) 45%, transparent), 0 18px 36px -14px rgba(2, 6, 23, 0.75)'
                : '0 0 0 2px color-mix(in srgb, var(--color-primary) 45%, transparent), 0 14px 28px -12px rgba(15, 23, 42, 0.22)',
            }
          : undefined
      }
    >
      <h3 className="text-xl font-bold tracking-tight text-slate-50 mb-1.5">Ranks</h3>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        Você está em <strong>{currentLevel.title}</strong> (Nível {currentLevel.level}).
      </p>

      <div className="space-y-3">
        {LEVELS.map((level) => {
          const isCurrent = level.level === currentLevel.level;
          const isUnlocked = userPoints >= level.minPoints;
          const Icon = iconByLevel[level.level] ?? Trophy;
          const rankProgress =
            level.minPoints === 0
              ? 100
              : Math.min(Math.max((userPoints / level.minPoints) * 100, isUnlocked ? 100 : 8), 100);

          return (
            <div
              key={level.level}
              className={`motion-card motion-enter relative overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all duration-300 ${
                isCurrent
                  ? 'text-white shadow-[0_14px_32px_-16px_rgba(2,6,23,0.85)]'
                  : 'border-slate-700/70 bg-slate-900/60 text-slate-100 hover:bg-slate-800/70 hover:shadow-[0_12px_28px_-16px_rgba(2,6,23,0.9)]'
              }`}
              style={
                isCurrent
                  ? {
                      backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, #0f172a)',
                      border: '1px solid color-mix(in srgb, var(--color-primary) 42%, transparent)',
                      boxShadow:
                        '0 0 0 1px color-mix(in srgb, var(--color-primary) 35%, transparent), 0 14px 34px -16px color-mix(in srgb, var(--color-primary) 38%, #000)',
                    }
                  : undefined
              }
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: isCurrent
                    ? 'linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent)'
                    : 'linear-gradient(90deg, rgba(148,163,184,0.08), transparent)',
                }}
              />

              <div className="relative flex flex-col sm:flex-row sm:items-center items-start gap-3 sm:gap-4">
                <span
                  className="shrink-0"
                  style={
                    isCurrent
                      ? {
                          color: 'var(--color-primary)',
                          filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--color-primary) 45%, transparent))',
                        }
                      : { color: '#9ca3af' }
                  }
                >
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-semibold tracking-tight truncate ${isCurrent ? 'text-slate-50' : 'text-slate-100'}`}>
                      Nível {level.level} · {level.title}
                    </p>
                    <span className={`text-[10px] uppercase tracking-widest hidden sm:inline ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                      Rank
                    </span>
                  </div>

                  <p className={`text-xs mt-0.5 leading-relaxed ${isCurrent ? 'text-slate-300' : 'text-slate-400'}`}>
                    {Number.isFinite(level.maxPoints)
                      ? `${level.minPoints.toLocaleString()} - ${level.maxPoints.toLocaleString()} pts`
                      : `${level.minPoints.toLocaleString()}+ pts`}
                  </p>

                  <div className={`mt-3 h-1.5 rounded-full overflow-hidden ${isCurrent ? 'bg-slate-700/80' : 'bg-slate-700/70'}`}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={
                        {
                          width: `${isCurrent ? 100 : rankProgress}%`,
                          backgroundImage:
                            'linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 85%, #fff 15%), color-mix(in srgb, var(--color-primary) 55%, #fff 45%))',
                          boxShadow: '0 0 10px color-mix(in srgb, var(--color-primary) 42%, transparent)',
                        }
                      }
                    />
                  </div>
                </div>

                <span
                  className={`relative text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                    isCurrent
                      ? 'text-slate-100 border'
                      : isUnlocked
                        ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-700/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                  style={
                    isCurrent
                      ? {
                          backgroundColor: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--color-primary) 35%, transparent)',
                        }
                      : undefined
                  }
                >
                  {isCurrent ? 'Atual' : isUnlocked ? 'Desbloqueado' : 'Bloqueado'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RankOverview;
