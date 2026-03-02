import React from 'react';
import { TrendingUp, Calendar, Lightbulb } from 'lucide-react';
import type { StudySession } from '../../types';
import { STUDY_METHODS } from '../../data/studyMethods';

interface MethodPerformanceProps {
  sessions: StudySession[];
}

interface MethodMetric {
  key: string;
  name: string;
  sessions: number;
  totalMinutes: number;
  averageMinutes: number;
}

interface WeeklyMethodComparison {
  key: string;
  name: string;
  thisWeekMinutes: number;
  lastWeekMinutes: number;
  deltaMinutes: number;
}

const METHOD_NAME_BY_ID = STUDY_METHODS.reduce<Record<string, string>>((acc, method) => {
  acc[method.id] = method.name;
  return acc;
}, {});

const normalizeMethod = (session: StudySession): { key: string; name: string } => {
  if (!session.methodId) {
    return { key: 'livre', name: 'Livre' };
  }

  return {
    key: session.methodId,
    name: METHOD_NAME_BY_ID[session.methodId] || session.methodId,
  };
};

const toMetrics = (sessions: StudySession[]): MethodMetric[] => {
  const grouped = new Map<string, MethodMetric>();

  sessions.forEach((session) => {
    const normalized = normalizeMethod(session);
    const existing = grouped.get(normalized.key);

    if (!existing) {
      grouped.set(normalized.key, {
        key: normalized.key,
        name: normalized.name,
        sessions: 1,
        totalMinutes: session.minutes,
        averageMinutes: session.minutes,
      });
      return;
    }

    const nextSessions = existing.sessions + 1;
    const nextTotal = existing.totalMinutes + session.minutes;

    grouped.set(normalized.key, {
      ...existing,
      sessions: nextSessions,
      totalMinutes: nextTotal,
      averageMinutes: Math.round(nextTotal / nextSessions),
    });
  });

  return Array.from(grouped.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
};

const getStartOfWeek = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
};

const toWeeklyComparison = (sessions: StudySession[]): WeeklyMethodComparison[] => {
  const now = new Date();
  const thisWeekStart = getStartOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 7);

  const grouped = new Map<string, WeeklyMethodComparison>();

  sessions.forEach((session) => {
    const normalized = normalizeMethod(session);
    const sessionDate = new Date(session.date);
    const inThisWeek = sessionDate >= thisWeekStart && sessionDate < thisWeekEnd;
    const inLastWeek = sessionDate >= lastWeekStart && sessionDate < thisWeekStart;

    if (!inThisWeek && !inLastWeek) {
      return;
    }

    const existing = grouped.get(normalized.key) || {
      key: normalized.key,
      name: normalized.name,
      thisWeekMinutes: 0,
      lastWeekMinutes: 0,
      deltaMinutes: 0,
    };

    if (inThisWeek) {
      existing.thisWeekMinutes += session.minutes;
    }

    if (inLastWeek) {
      existing.lastWeekMinutes += session.minutes;
    }

    existing.deltaMinutes = existing.thisWeekMinutes - existing.lastWeekMinutes;
    grouped.set(normalized.key, existing);
  });

  return Array.from(grouped.values())
    .sort((a, b) => b.thisWeekMinutes - a.thisWeekMinutes)
    .slice(0, 4);
};

const MethodPerformance: React.FC<MethodPerformanceProps> = ({ sessions }) => {
  const metrics = React.useMemo(() => toMetrics(sessions), [sessions]);
  const weeklyComparison = React.useMemo(() => toWeeklyComparison(sessions), [sessions]);

  const weeklyInsight = React.useMemo(() => {
    if (weeklyComparison.length === 0) {
      return 'Continue registrando sessões para gerar insights semanais por método.';
    }

    const bestEvolution = [...weeklyComparison].sort((a, b) => b.deltaMinutes - a.deltaMinutes)[0];
    const biggestDrop = [...weeklyComparison].sort((a, b) => a.deltaMinutes - b.deltaMinutes)[0];

    if (bestEvolution.deltaMinutes > 0) {
      return `Você evoluiu mais no método ${bestEvolution.name} esta semana (+${bestEvolution.deltaMinutes} min).`;
    }

    if (biggestDrop.deltaMinutes < 0) {
      return `Seu método ${biggestDrop.name} caiu ${Math.abs(biggestDrop.deltaMinutes)} min nesta semana. Vale retomar esse ritmo.`;
    }

    return 'Seu ritmo por método ficou estável nesta semana. Excelente consistência.';
  }, [weeklyComparison]);

  if (metrics.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700/70 shadow-[0_10px_28px_-18px_rgba(2,6,23,0.95)] p-6">
        <h3 className="text-xl font-bold text-slate-100 mb-2 inline-flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Performance por Método</h3>
        <p className="text-sm text-slate-400">
          Ainda não há dados suficientes por método. Complete algumas sessões para liberar insights personalizados.
        </p>
      </div>
    );
  }

  const mostUsed = [...metrics].sort((a, b) => b.sessions - a.sessions)[0];
  const mostProductive = [...metrics].sort((a, b) => b.averageMinutes - a.averageMinutes)[0];
  const maxTotal = Math.max(...metrics.map((metric) => metric.totalMinutes), 1);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700/70 shadow-[0_10px_28px_-18px_rgba(2,6,23,0.95)] p-6 space-y-5">
      <h3 className="text-xl font-bold text-slate-100 inline-flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Performance por Método</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-950/25 p-4">
          <p className="text-xs uppercase tracking-wider font-semibold text-emerald-300">Método mais produtivo</p>
          <p className="text-lg font-bold text-emerald-200 mt-1">
            Você rende mais com {mostProductive.name}
          </p>
          <p className="text-sm text-emerald-300/90 mt-1">
            Média de {mostProductive.averageMinutes} min por sessão
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-primary)' }}>Método mais usado</p>
          <p className="text-lg font-bold mt-1" style={{ color: 'var(--color-primary)' }}>
            Seu método mais usado é {mostUsed.name}
          </p>
          <p className="text-sm text-slate-300 mt-1">
            {mostUsed.sessions} sessões · {mostUsed.totalMinutes} min acumulados
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {metrics.map((metric) => {
          const width = Math.max(6, Math.round((metric.totalMinutes / maxTotal) * 100));
          return (
            <div key={metric.key} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-200">{metric.name}</span>
                <span className="text-slate-400">
                  {metric.totalMinutes} min · média {metric.averageMinutes} min · {metric.sessions} sessão(ões)
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-700/80 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${width}%`,
                    backgroundImage: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))',
                    boxShadow: '0 0 10px color-mix(in srgb, var(--color-primary) 35%, transparent)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-700/70">
        <h4 className="text-base font-bold text-slate-100 mb-3">
          <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4" /> Esta semana vs semana passada</span>
        </h4>

        <div className="mb-3 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2">
          <p className="text-sm inline-flex items-center gap-2" style={{ color: 'var(--color-primary)' }}><Lightbulb className="w-4 h-4" /> {weeklyInsight}</p>
        </div>

        {weeklyComparison.length > 0 ? (
          <div className="space-y-2">
            {weeklyComparison.map((item) => {
              const improving = item.deltaMinutes >= 0;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-lg bg-slate-800/55 px-3 py-2 text-sm border border-slate-700/70"
                >
                  <span className="font-semibold text-slate-200">{item.name}</span>
                  <span className="text-slate-300">
                    {item.thisWeekMinutes}m vs {item.lastWeekMinutes}m ·{' '}
                    <strong className={improving ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                      {improving ? '+' : ''}
                      {item.deltaMinutes}m
                    </strong>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Ainda sem dados nas últimas duas semanas para comparar por método.
          </p>
        )}
      </div>
    </div>
  );
};

export default MethodPerformance;
