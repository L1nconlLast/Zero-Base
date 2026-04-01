import React from 'react';
import { ChevronDown, ChevronUp, Crown, Flame, Gem, Shield, Sparkles, Star, Trophy } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = React.useState(false);

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

  const nextLevel = LEVELS.find((level) => level.level > currentLevel.level) ?? null;
  const pointsIntoCurrentLevel = Math.max(userPoints - currentLevel.minPoints, 0);
  const currentLevelRange = nextLevel ? Math.max(nextLevel.minPoints - currentLevel.minPoints, 1) : 1;
  const currentLevelProgress = nextLevel
    ? Math.min(100, Math.max(8, Math.round((pointsIntoCurrentLevel / currentLevelRange) * 100)))
    : 100;
  const pointsNeededToNext = nextLevel ? Math.max(nextLevel.minPoints - userPoints, 0) : 0;

  const shellClass = darkMode
    ? 'border-slate-700/60 bg-slate-900 p-4 shadow-[0_10px_30px_-16px_rgba(2,6,23,0.85)] sm:p-6'
    : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(239,246,255,0.95))] p-4 shadow-[0_18px_40px_-30px_rgba(148,163,184,0.3)] sm:p-6';

  const titleClass = darkMode ? 'text-slate-50' : 'text-slate-900';
  const mutedClass = darkMode ? 'text-slate-400' : 'text-slate-600';
  const panelClass = darkMode
    ? 'border-slate-700 bg-slate-950/60'
    : 'border-slate-200 bg-white/82';
  const buttonClass = darkMode
    ? 'border-slate-700 bg-slate-950/70 text-slate-200 hover:border-slate-500 hover:bg-slate-900'
    : 'border-slate-200 bg-white/86 text-slate-700 hover:bg-white';
  const trackBg = darkMode ? 'bg-slate-800' : 'bg-slate-200';

  return (
    <div
      id="ranks-section"
      className={`scroll-mt-24 rounded-2xl border transition-all duration-500 ${shellClass} ${isHighlighted ? 'ring-2 ring-transparent' : ''}`}
      style={
        isHighlighted
          ? {
              boxShadow: darkMode
                ? '0 0 0 2px color-mix(in srgb, var(--color-primary) 45%, transparent), 0 18px 36px -14px rgba(2, 6, 23, 0.75)'
                : '0 0 0 2px color-mix(in srgb, var(--color-primary) 35%, transparent), 0 18px 36px -18px rgba(125, 211, 252, 0.28)',
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={`mb-1.5 text-xl font-bold tracking-tight ${titleClass}`}>Ranks</h3>
          <p className={`text-sm leading-relaxed ${mutedClass}`}>
            Voce esta em <strong>{currentLevel.title}</strong> (Nivel {currentLevel.level}).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${buttonClass}`}
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Recolher' : 'Ver ranks'}
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <div className={`mt-5 rounded-2xl border p-4 ${panelClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Nivel atual</p>
            <p className={`mt-2 text-lg font-semibold ${titleClass}`}>
              Nivel {currentLevel.level} · {currentLevel.title}
            </p>
            <p className={`mt-1 text-sm ${mutedClass}`}>
              {nextLevel
                ? `Faltam ${pointsNeededToNext.toLocaleString()} pts para ${nextLevel.title}.`
                : 'Voce ja esta no topo da trilha atual.'}
            </p>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-primary) 32%, transparent)',
            }}
          >
            Atual
          </span>
        </div>

        <div className={`mt-4 h-2 overflow-hidden rounded-full ${trackBg}`}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${currentLevelProgress}%`,
              backgroundImage:
                'linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 85%, #fff 15%), color-mix(in srgb, var(--color-primary) 55%, #fff 45%))',
              boxShadow: '0 0 10px color-mix(in srgb, var(--color-primary) 42%, transparent)',
            }}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="mt-5 space-y-3">
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
                className={`relative overflow-hidden rounded-xl border p-3.5 transition-all duration-300 sm:p-4 ${
                  isCurrent
                    ? darkMode
                      ? 'text-white shadow-[0_14px_32px_-16px_rgba(2,6,23,0.85)]'
                      : 'text-slate-900 shadow-[0_18px_32px_-22px_rgba(125,211,252,0.24)]'
                    : darkMode
                      ? 'border-slate-700/70 bg-slate-900/60 text-slate-100 hover:bg-slate-800/70'
                      : 'border-slate-200 bg-white/82 text-slate-900 hover:bg-white'
                }`}
                style={
                  isCurrent
                    ? {
                        backgroundColor: darkMode
                          ? 'color-mix(in srgb, var(--color-primary) 10%, #0f172a)'
                          : 'color-mix(in srgb, var(--color-primary) 8%, #ffffff)',
                        border: '1px solid color-mix(in srgb, var(--color-primary) 35%, transparent)',
                      }
                    : undefined
                }
              >
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: isCurrent
                      ? 'linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent)'
                      : darkMode
                        ? 'linear-gradient(90deg, rgba(148,163,184,0.08), transparent)'
                        : 'linear-gradient(90deg, rgba(125,211,252,0.12), transparent)',
                  }}
                />

                <div className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <span
                    className="shrink-0"
                    style={
                      isCurrent
                        ? {
                            color: 'var(--color-primary)',
                            filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--color-primary) 45%, transparent))',
                          }
                        : { color: darkMode ? '#9ca3af' : '#64748b' }
                    }
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate font-semibold tracking-tight ${isCurrent ? titleClass : darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        Nivel {level.level} · {level.title}
                      </p>
                      <span className={`hidden text-[10px] uppercase tracking-widest sm:inline ${darkMode ? (isCurrent ? 'text-slate-300' : 'text-slate-500') : 'text-slate-400'}`}>
                        Rank
                      </span>
                    </div>

                    <p className={`mt-0.5 text-xs leading-relaxed ${darkMode ? (isCurrent ? 'text-slate-300' : 'text-slate-400') : 'text-slate-500'}`}>
                      {Number.isFinite(level.maxPoints)
                        ? `${level.minPoints.toLocaleString()} - ${level.maxPoints.toLocaleString()} pts`
                        : `${level.minPoints.toLocaleString()}+ pts`}
                    </p>

                    <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${darkMode ? 'bg-slate-700/70' : 'bg-slate-200'}`}>
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${isCurrent ? 100 : rankProgress}%`,
                          backgroundImage:
                            'linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 85%, #fff 15%), color-mix(in srgb, var(--color-primary) 55%, #fff 45%))',
                          boxShadow: '0 0 10px color-mix(in srgb, var(--color-primary) 42%, transparent)',
                        }}
                      />
                    </div>
                  </div>

                  <span
                    className={`relative whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      isCurrent
                        ? darkMode
                          ? 'text-slate-100'
                          : 'text-slate-700'
                        : isUnlocked
                          ? darkMode
                            ? 'border-emerald-700/40 bg-emerald-950/30 text-emerald-300'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : darkMode
                            ? 'border-slate-700 bg-slate-800 text-slate-300'
                            : 'border-slate-200 bg-slate-100 text-slate-600'
                    }`}
                    style={
                      isCurrent
                        ? {
                            backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
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
      )}
    </div>
  );
};

export default RankOverview;
