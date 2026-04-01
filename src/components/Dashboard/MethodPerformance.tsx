import React from 'react';
import { TrendingUp, Calendar, Lightbulb } from 'lucide-react';
import type { StudySession } from '../../types';
import { STUDY_METHODS } from '../../data/studyMethods';

interface MethodPerformanceProps {
  sessions: StudySession[];
  darkMode?: boolean;
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

const MethodPerformance: React.FC<MethodPerformanceProps> = ({ sessions, darkMode = false }) => {
  const metrics = React.useMemo(() => toMetrics(sessions), [sessions]);
  const weeklyComparison = React.useMemo(() => toWeeklyComparison(sessions), [sessions]);

  const weeklyInsight = React.useMemo(() => {
    if (weeklyComparison.length === 0) {
      return 'Continue registrando sessoes para gerar insights semanais por metodo.';
    }

    const bestEvolution = [...weeklyComparison].sort((a, b) => b.deltaMinutes - a.deltaMinutes)[0];
    const biggestDrop = [...weeklyComparison].sort((a, b) => a.deltaMinutes - b.deltaMinutes)[0];

    if (bestEvolution.deltaMinutes > 0) {
      return `Voce evoluiu mais no metodo ${bestEvolution.name} esta semana (+${bestEvolution.deltaMinutes} min).`;
    }

    if (biggestDrop.deltaMinutes < 0) {
      return `Seu metodo ${biggestDrop.name} caiu ${Math.abs(biggestDrop.deltaMinutes)} min nesta semana. Vale retomar esse ritmo.`;
    }

    return 'Seu ritmo por metodo ficou estavel nesta semana. Excelente consistencia.';
  }, [weeklyComparison]);

  if (metrics.length === 0) {
    return (
      <div className={`rounded-[28px] border p-6 shadow-[0_18px_40px_-30px_rgba(148,163,184,0.3)] ${
        darkMode
          ? 'border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] shadow-[0_24px_60px_-34px_rgba(2,6,23,0.52)]'
          : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(239,246,255,0.95))]'
      }`}>
        <h3 className={`mb-2 inline-flex items-center gap-2 text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          <TrendingUp className="h-5 w-5" /> Performance por Metodo
        </h3>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Ainda nao ha dados suficientes por metodo. Complete algumas sessoes para liberar insights personalizados.
        </p>
      </div>
    );
  }

  const mostUsed = [...metrics].sort((a, b) => b.sessions - a.sessions)[0];
  const mostProductive = [...metrics].sort((a, b) => b.averageMinutes - a.averageMinutes)[0];
  const maxTotal = Math.max(...metrics.map((metric) => metric.totalMinutes), 1);

  return (
    <div className={`space-y-5 rounded-[28px] border p-6 shadow-[0_18px_40px_-30px_rgba(148,163,184,0.3)] ${
      darkMode
        ? 'border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] shadow-[0_24px_60px_-34px_rgba(2,6,23,0.52)]'
        : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(239,246,255,0.95))]'
    }`}>
      <h3 className={`inline-flex items-center gap-2 text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
        <TrendingUp className="h-5 w-5" /> Performance por Metodo
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={`rounded-2xl border p-4 ${darkMode ? 'border-emerald-400/20 bg-emerald-400/10' : 'border-emerald-200 bg-emerald-50/90'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-emerald-200' : 'text-emerald-700'}`}>Metodo mais produtivo</p>
          <p className={`mt-1 text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-emerald-900'}`}>
            Voce rende mais com {mostProductive.name}
          </p>
          <p className={`mt-1 text-sm ${darkMode ? 'text-emerald-100/80' : 'text-emerald-700/90'}`}>
            Media de {mostProductive.averageMinutes} min por sessao
          </p>
        </div>

        <div className={`rounded-2xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900/72' : 'border-slate-200 bg-white/84'}`}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
            Metodo mais usado
          </p>
          <p className={`mt-1 text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            Seu metodo mais usado e {mostUsed.name}
          </p>
          <p className={`mt-1 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {mostUsed.sessions} sessoes · {mostUsed.totalMinutes} min acumulados
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {metrics.map((metric) => {
          const width = Math.max(6, Math.round((metric.totalMinutes / maxTotal) * 100));
          return (
            <div key={metric.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{metric.name}</span>
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                  {metric.totalMinutes} min · media {metric.averageMinutes} min · {metric.sessions} sessao(oes)
                </span>
              </div>
              <div className={`h-2 overflow-hidden rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
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

      <div className={`border-t pt-2 ${darkMode ? 'border-slate-800/90' : 'border-slate-200/90'}`}>
        <h4 className={`mb-3 text-base font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4" /> Esta semana vs semana passada</span>
        </h4>

        <div className={`mb-3 rounded-2xl border px-3 py-2 ${darkMode ? 'border-slate-700 bg-slate-900/72' : 'border-slate-200 bg-white/84'}`}>
          <p className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--color-primary)' }}>
            <Lightbulb className="h-4 w-4" /> {weeklyInsight}
          </p>
        </div>

        {weeklyComparison.length > 0 ? (
          <div className="space-y-2">
            {weeklyComparison.map((item) => {
              const improving = item.deltaMinutes >= 0;
              return (
                <div
                  key={item.key}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm ${darkMode ? 'border-slate-700 bg-slate-900/72' : 'border-slate-200 bg-white/82'}`}
                >
                  <span className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{item.name}</span>
                  <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                    {item.thisWeekMinutes}m vs {item.lastWeekMinutes}m ·{' '}
                    <strong className={improving ? 'text-emerald-600' : 'text-rose-600'}>
                      {improving ? '+' : ''}
                      {item.deltaMinutes}m
                    </strong>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Ainda sem dados nas ultimas duas semanas para comparar por metodo.
          </p>
        )}
      </div>
    </div>
  );
};

export default MethodPerformance;
