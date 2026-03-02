import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TooltipProps } from 'recharts';
import { processarDadosSemanais } from '../../utils/chartHelpers';
import type { StudySession } from '../../types';

interface WeeklyChartRealProps {
  sessions: StudySession[];
  dailyGoalMinutes: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) {
    return null;
  }

  const dados = payload[0].payload as {
    horas: number;
    meta: number;
    detalhes: Record<string, number>;
  };

  const hasStudy = Object.keys(dados.detalhes).length > 0;

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-slate-700/80 text-sm z-50">
      <p className="font-bold text-slate-100 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
        {dados.horas}h <span className="text-xs font-normal text-slate-400">estudadas</span>
      </p>

      {hasStudy ? (
        <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
          {Object.entries(dados.detalhes).map(([materia, min]) => (
            <div key={materia} className="flex justify-between gap-4 text-xs">
              <span className="text-slate-300">{materia}</span>
              <span className="font-medium text-slate-100">{min} min</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-400 italic text-xs mt-2">Sem estudos registrados</p>
      )}

      {dados.horas > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-700">
          <p className={`text-xs font-medium ${dados.horas >= dados.meta ? 'text-green-600' : 'text-amber-600'}`}>
            {dados.horas >= dados.meta ? 'Meta atingida' : `Faltam ${(dados.meta - dados.horas).toFixed(1)}h`}
          </p>
        </div>
      )}
    </div>
  );
};

export const WeeklyChartReal: React.FC<WeeklyChartRealProps> = ({ sessions, dailyGoalMinutes }) => {
  const data = React.useMemo(
    () => processarDadosSemanais(sessions, dailyGoalMinutes),
    [sessions, dailyGoalMinutes]
  );

  const totalHoras = data.reduce((acc, day) => acc + day.horas, 0);
  const mediaDiaria = (totalHoras / 7).toFixed(1);
  const diasComMeta = data.filter((day) => day.horas >= day.meta).length;

  return (
    <div className="space-y-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              dy={10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
            <Bar dataKey="horas" radius={[6, 6, 0, 0]} barSize={40}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.horas >= entry.meta ? '#10B981' : '#F59E0B'}
                  className="transition-opacity hover:opacity-80 cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700/70">
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{totalHoras.toFixed(1)}h</p>
          <p className="text-xs text-slate-400 mt-1">Total Semanal</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{mediaDiaria}h</p>
          <p className="text-xs text-slate-400 mt-1">Média/Dia</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-secondary)' }}>{diasComMeta}/7</p>
          <p className="text-xs text-slate-400 mt-1">Metas Atingidas</p>
        </div>
      </div>

      <div className="flex justify-center gap-4 text-xs pt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500"></div>
          <span className="text-slate-300">Meta atingida</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500"></div>
          <span className="text-slate-300">Abaixo da meta</span>
        </div>
      </div>
    </div>
  );
};
