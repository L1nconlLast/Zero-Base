import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { WeeklyChartDatum } from '../../utils/chartHelpers';
import { processarDadosSemanais } from '../../utils/chartHelpers';
import type { StudySession } from '../../types';

interface WeeklyChartRealProps {
  sessions: StudySession[];
  dailyGoalMinutes: number;
}

const formatHoursFromMinutes = (minutes: number): string => {
  if (minutes <= 0) {
    return '0h';
  }

  const hours = minutes / 60;
  if (hours < 1) {
    return `${minutes} min`;
  }

  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`;
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) {
    return null;
  }

  const dados = payload[0].payload as WeeklyChartDatum;
  const hasStudy = dados.detalhes.length > 0;

  return (
    <div className="w-[240px] rounded-xl border border-slate-200 bg-white/96 p-3 text-sm shadow-xl backdrop-blur-sm">
      <p className="mb-1 font-bold text-slate-900">{label}</p>
      <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
        {dados.horas}h <span className="text-xs font-normal text-slate-500">estudadas</span>
      </p>

      {hasStudy ? (
        <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
          {dados.detalhes.map(({ label: detailLabel, minutes }) => (
            <div key={detailLabel} className="flex items-start justify-between gap-4 text-xs">
              <span className="min-w-0 break-words text-slate-600">{detailLabel}</span>
              <span className="font-medium text-slate-900">{minutes} min</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs italic text-slate-500">Sem estudos registrados</p>
      )}

      {dados.minutos > 0 && dados.metaMinutes > 0 && (
        <div className="mt-2 border-t border-slate-200 pt-2">
          <p className={`text-xs font-medium ${dados.metGoal ? 'text-green-600' : 'text-amber-600'}`}>
            {dados.metGoal
              ? 'Meta atingida'
              : `Faltam ${formatHoursFromMinutes(Math.max(dados.metaMinutes - dados.minutos, 0))}`}
          </p>
        </div>
      )}
    </div>
  );
};

export const WeeklyChartReal: React.FC<WeeklyChartRealProps> = ({ sessions, dailyGoalMinutes }) => {
  const data = React.useMemo(
    () => processarDadosSemanais(sessions, dailyGoalMinutes),
    [sessions, dailyGoalMinutes],
  );

  const totalHoras = data.reduce((acc, day) => acc + day.horas, 0);
  const mediaDiaria = (totalHoras / 7).toFixed(1);
  const diasComMeta = data.filter((day) => day.metGoal).length;

  return (
    <div className="space-y-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              dy={10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
            <Bar dataKey="horas" radius={[6, 6, 0, 0]} barSize={40}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.metGoal ? '#10B981' : '#F59E0B'}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{totalHoras.toFixed(1)}h</p>
          <p className="mt-1 text-xs text-slate-500">Total Semanal</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{mediaDiaria}h</p>
          <p className="mt-1 text-xs text-slate-500">Media/Dia</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-secondary)' }}>{diasComMeta}/7</p>
          <p className="mt-1 text-xs text-slate-500">Metas Atingidas</p>
        </div>
      </div>

      <div className="flex justify-center gap-4 pt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-emerald-500" />
          <span className="text-slate-600">Meta atingida</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-amber-500" />
          <span className="text-slate-600">Abaixo da meta</span>
        </div>
      </div>
    </div>
  );
};
