import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Download, Clock3, BarChart3, Calendar, Target, Lightbulb } from 'lucide-react';
import { StudySession } from '../../types';
import { calculateWeeklyStats } from '../../utils/weeklyStats';
import { formatMinutes } from '../../utils/export';
import toast from 'react-hot-toast';

interface WeeklyReportProps {
  sessions: StudySession[];
}

const COLORS = ['#60a5fa', '#22d3ee', '#34d399', '#818cf8', '#a78bfa', '#38bdf8'];

const WeeklyReport: React.FC<WeeklyReportProps> = ({ sessions }) => {
  const stats = calculateWeeklyStats(sessions);
  
  const exportPDF = () => {
    toast('Exportação de PDF será implementada em breve!', { icon: '📄' });
  };
  
  return (
    <div className="weekly-report bg-slate-900 rounded-lg border border-slate-700/70 shadow-[0_10px_28px_-18px_rgba(2,6,23,0.95)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Relatório Semanal</h2>
          <p className="text-slate-400">
            {formatDateBR(stats.weekStart)} - {formatDateBR(stats.weekEnd)}
          </p>
        </div>
        
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Download className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Estudado"
          value={formatMinutes(stats.totalMinutes)}
          icon={Clock3}
        />
        <StatCard
          title="Média/Dia"
          value={formatMinutes(Math.round(stats.avgPerDay))}
          icon={BarChart3}
        />
        <StatCard
          title="Dias Ativos"
          value={`${stats.studyDays}/7`}
          icon={Calendar}
        />
        <StatCard
          title="Meta Atingida"
          value={`${stats.goalAchievementRate.toFixed(0)}%`}
          icon={Target}
        />
      </div>
      
      <div className={`
        flex items-center gap-2 p-4 rounded-lg mb-6
        ${stats.comparison.trend === 'up' ? 'bg-emerald-950/25 border border-emerald-700/40' : ''}
        ${stats.comparison.trend === 'down' ? 'bg-red-950/25 border border-red-700/40' : ''}
        ${stats.comparison.trend === 'stable' ? 'bg-slate-800/65 border border-slate-700' : ''}
      `}>
        {stats.comparison.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-600" />}
        {stats.comparison.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-600" />}
        {stats.comparison.trend === 'stable' && <Minus className="w-5 h-5 text-gray-600" />}
        
        <span className="font-semibold text-slate-100">
          {Math.abs(stats.comparison.percentageChange).toFixed(1)}% 
          {stats.comparison.trend === 'up' ? ' a mais' : stats.comparison.trend === 'down' ? ' a menos' : ' igual'}
          {' '}que a semana passada
        </span>
      </div>
      
      <div className="mb-6">
        <h3 className="font-semibold mb-3 text-slate-100">Minutos por Dia</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.dailyBreakdown}>
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => formatDayShort(date)}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
            />
            <Tooltip 
              labelFormatter={(date) => formatDateBR(date)}
              formatter={(value: number | string) => [`${value} min`, 'Estudado']}
              cursor={{ fill: 'rgba(148,163,184,0.12)' }}
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid rgba(148,163,184,0.25)',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
              labelStyle={{ color: '#e2e8f0' }}
              itemStyle={{ color: '#cbd5e1' }}
            />
            <Bar dataKey="minutes" fill="url(#weeklyReportGradient)" radius={[8, 8, 0, 0]} />
            <defs>
              <linearGradient id="weeklyReportGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {stats.subjectDistribution.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3 text-slate-100">Distribuição por Matéria</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stats.subjectDistribution}
                dataKey="minutes"
                nameKey="subject"
                cx="50%"
                cy="50%"
                outerRadius={80}
                labelLine={false}
                label={(entry) => `${entry.subject}: ${entry.percentage.toFixed(0)}%`}
              >
                {stats.subjectDistribution.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | string) => `${value} min`}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(148,163,184,0.25)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#cbd5e1' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <div className="bg-slate-800/65 border border-slate-700 rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" /> Insights da Semana
        </h3>
        <ul className="space-y-2">
          {stats.insights.map((insight, index) => (
            <li key={index} className="text-sm text-slate-300">{insight}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ComponentType<{ className?: string }> }> = ({
  title,
  value,
  icon: Icon
}) => (
  <div className="bg-slate-800/65 border border-slate-700 rounded-lg p-4">
    <div className="mb-2" style={{ color: 'var(--color-primary)' }}><Icon className="w-5 h-5" /></div>
    <div className="text-2xl font-bold text-slate-100">{value}</div>
    <div className="text-sm text-slate-400">{title}</div>
  </div>
);

const formatDateBR = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const formatDayShort = (date: Date): string => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[date.getDay()];
};

export default WeeklyReport;
