import React from 'react';
import { Activity, Clock3, Flame, History } from 'lucide-react';

import type { OutrosOverviewWeeklyRhythmSnapshot } from '../../../services/outrosDashboard.service';
import { OutrosOverviewCard } from './OutrosOverviewCard';

interface OutrosOverviewWeeklyRhythmProps {
  darkMode?: boolean;
  data: OutrosOverviewWeeklyRhythmSnapshot;
}

const RECENT_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const formatRecentDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return RECENT_DATE_FORMATTER.format(parsed);
};

export const OutrosOverviewWeeklyRhythm: React.FC<OutrosOverviewWeeklyRhythmProps> = ({
  darkMode = false,
  data,
}) => (
  <OutrosOverviewCard
    darkMode={darkMode}
    title="Ritmo da semana"
    description="Sequencia, minutos, meta semanal, sessoes recentes e status do ritmo num unico lugar."
    badge={data.paceStatusLabel}
  >
    <div className="grid gap-3 sm:grid-cols-3">
      <div className={`rounded-2xl border p-3.5 ${
        darkMode ? 'border-slate-800/80 bg-slate-900/80' : 'border-slate-200/80 bg-slate-50/88'
      }`}>
        <div className="flex items-center gap-2">
          <Flame className={`h-4 w-4 ${darkMode ? 'text-amber-300' : 'text-amber-700'}`} />
          <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Sequencia
          </span>
        </div>
        <p className={`mt-2 text-sm font-semibold ${
          darkMode ? 'text-slate-100' : 'text-slate-900'
        }`}>
          {data.streakCurrent} dia(s)
        </p>
        <p className={`mt-2 text-xs ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          Melhor marca: {data.streakBest} dia(s)
        </p>
      </div>

      <div className={`rounded-2xl border p-3.5 ${
        darkMode ? 'border-slate-800/80 bg-slate-900/80' : 'border-slate-200/80 bg-slate-50/88'
      }`}>
        <div className="flex items-center gap-2">
          <Clock3 className={`h-4 w-4 ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`} />
          <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Semana
          </span>
        </div>
        <p className={`mt-2 text-sm font-semibold ${
          darkMode ? 'text-slate-100' : 'text-slate-900'
        }`}>
          {data.weekMinutes} / {data.weekTargetMinutes} min
        </p>
        <p className={`mt-2 text-xs ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {data.activeDaysLast7} dia(s) ativos nos ultimos 7.
        </p>
      </div>

      <div className={`rounded-2xl border p-3.5 ${
        darkMode ? 'border-slate-800/80 bg-slate-900/80' : 'border-slate-200/80 bg-slate-50/88'
      }`}>
        <div className="flex items-center gap-2">
          <Activity className={`h-4 w-4 ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`} />
          <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Status
          </span>
        </div>
        <p className={`mt-2 text-sm font-semibold ${
          darkMode ? 'text-slate-100' : 'text-slate-900'
        }`}>
          {data.paceStatusLabel}
        </p>
        <p className={`mt-2 text-xs ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {data.lastSessionGapDays === null
            ? 'Ainda nao existe sessao concluida neste foco.'
            : data.lastSessionGapDays === 0
              ? 'Voce estudou hoje neste foco.'
              : `Ultima sessao concluida ha ${data.lastSessionGapDays} dia(s).`}
        </p>
      </div>
    </div>

    <div className="mt-4">
      <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
        darkMode ? 'text-slate-500' : 'text-slate-400'
      }`}>
        Sessoes recentes
      </p>
      <div className="mt-3 grid gap-3">
        {data.recentSessions.length > 0 ? (
          data.recentSessions.map((session) => (
            <div
              key={session.id}
              className={`rounded-2xl border p-3.5 ${
                darkMode ? 'border-slate-800/80 bg-slate-900/80' : 'border-slate-200/80 bg-slate-50/88'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-sm font-semibold ${
                    darkMode ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {session.topicName || 'Foco atual'}
                  </p>
                  <p className={`mt-1 text-xs ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <History className="mr-1 inline h-3.5 w-3.5" />
                    {formatRecentDate(session.happenedAt)}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${
                  darkMode ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  {session.minutes} min
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className={`rounded-2xl border p-4 ${
            darkMode ? 'border-slate-800/80 bg-slate-900/80 text-slate-300' : 'border-slate-200/80 bg-slate-50/88 text-slate-600'
          }`}>
            Assim que as primeiras sessoes entrarem no foco atual, elas aparecem aqui.
          </div>
        )}
      </div>
    </div>
  </OutrosOverviewCard>
);

export default OutrosOverviewWeeklyRhythm;
