import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Download, Clock3, BarChart3, Calendar, Target, Lightbulb } from 'lucide-react';
import { StudySession } from '../../types';
import { resolveTrackedDisciplineLabel, type StudyTrackLabel } from '../../utils/disciplineLabels';
import { calculateWeeklyStats } from '../../utils/weeklyStats';
import { formatMinutes } from '../../utils/export';
import { getSubjectPalette } from '../../utils/subjectPalette';
import toast from 'react-hot-toast';

interface WeeklyReportProps {
  sessions: StudySession[];
  darkMode?: boolean;
  preferredTrack?: StudyTrackLabel;
  hybridEnemWeight?: number;
}

const WeeklyReport: React.FC<WeeklyReportProps> = ({
  sessions,
  darkMode = false,
  preferredTrack = 'enem',
  hybridEnemWeight = 70,
}) => {
  const stats = calculateWeeklyStats(sessions);
  const [exporting, setExporting] = useState(false);
  const axisColor = darkMode ? '#cbd5e1' : '#64748b';
  const axisLineColor = darkMode ? '#334155' : '#cbd5e1';
  const tooltipSurface = darkMode
    ? {
        backgroundColor: '#0f172a',
        border: '1px solid rgba(71, 85, 105, 0.9)',
        borderRadius: '12px',
        color: '#e2e8f0',
      }
    : {
        backgroundColor: '#ffffff',
        border: '1px solid rgba(203,213,225,0.9)',
        borderRadius: '12px',
        color: '#0f172a',
      };
  const resolvedSubjectDistribution = React.useMemo(
    () =>
      stats.subjectDistribution.reduce<Array<{ subject: string; minutes: number; percentage: number }>>((acc, entry) => {
        const subject = resolveTrackedDisciplineLabel(entry.subject, preferredTrack, hybridEnemWeight);
        const existing = acc.find((item) => item.subject === subject);

        if (existing) {
          existing.minutes += entry.minutes;
          existing.percentage += entry.percentage;
          return acc;
        }

        acc.push({
          subject,
          minutes: entry.minutes,
          percentage: entry.percentage,
        });
        return acc;
      }, []).sort((left, right) => right.minutes - left.minutes),
    [hybridEnemWeight, preferredTrack, stats.subjectDistribution],
  );

  const exportPDF = async () => {
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const element = document.getElementById('weekly-report-container');
      if (!element) {
        toast.error('Elemento do relatorio nao encontrado.');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: darkMode ? '#020617' : '#f8fafc',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`relatorio-semanal-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div id="weekly-report-container" className={`weekly-report rounded-[28px] border p-5 shadow-[0_18px_40px_-30px_rgba(148,163,184,0.3)] ${
      darkMode
        ? 'border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] shadow-[0_24px_60px_-34px_rgba(2,6,23,0.52)]'
        : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(239,246,255,0.95))]'
    }`}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Relatorio Semanal</h2>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
            {formatDateBR(stats.weekStart)} - {formatDateBR(stats.weekEnd)}
          </p>
        </div>

        <button
          onClick={() => { void exportPDF(); }}
          disabled={exporting}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Gerando...' : 'Exportar PDF'}
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title="Total Estudado"
          value={formatMinutes(stats.totalMinutes)}
          icon={Clock3}
          darkMode={darkMode}
        />
        <StatCard
          title="Media/Dia"
          value={formatMinutes(Math.round(stats.avgPerDay))}
          icon={BarChart3}
          darkMode={darkMode}
        />
        <StatCard
          title="Dias Ativos"
          value={`${stats.studyDays}/7`}
          icon={Calendar}
          darkMode={darkMode}
        />
        <StatCard
          title="Meta Atingida"
          value={`${stats.goalAchievementRate.toFixed(0)}%`}
          icon={Target}
          darkMode={darkMode}
        />
      </div>

      <div
        className={`
          mb-6 flex items-center gap-2 rounded-lg p-4
          ${stats.comparison.trend === 'up' ? darkMode ? 'border border-emerald-400/25 bg-emerald-400/10' : 'border border-emerald-200 bg-emerald-50/90' : ''}
          ${stats.comparison.trend === 'down' ? darkMode ? 'border border-rose-400/25 bg-rose-400/10' : 'border border-rose-200 bg-rose-50/90' : ''}
          ${stats.comparison.trend === 'stable' ? darkMode ? 'border border-slate-700 bg-slate-900/72' : 'border border-slate-200 bg-white/80' : ''}
        `}
      >
        {stats.comparison.trend === 'up' && <TrendingUp className={`h-5 w-5 ${darkMode ? 'text-emerald-200' : 'text-green-600'}`} />}
        {stats.comparison.trend === 'down' && <TrendingDown className={`h-5 w-5 ${darkMode ? 'text-rose-200' : 'text-red-600'}`} />}
        {stats.comparison.trend === 'stable' && <Minus className={`h-5 w-5 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`} />}

        <span className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          {Math.abs(stats.comparison.percentageChange).toFixed(1)}%
          {stats.comparison.trend === 'up' ? ' a mais' : stats.comparison.trend === 'down' ? ' a menos' : ' igual'}
          {' '}que a semana passada
        </span>
      </div>

      <div className="mb-5">
        <h3 className={`mb-3 font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Minutos por Dia</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.dailyBreakdown}>
            <XAxis
              dataKey="date"
              tickFormatter={(date) => formatDayShort(date)}
              tick={{ fill: axisColor, fontSize: 12 }}
              axisLine={{ stroke: axisLineColor }}
              tickLine={{ stroke: axisLineColor }}
            />
            <YAxis
              tick={{ fill: axisColor, fontSize: 12 }}
              axisLine={{ stroke: axisLineColor }}
              tickLine={{ stroke: axisLineColor }}
            />
            <Tooltip
              labelFormatter={(date) => formatDateBR(date)}
              formatter={(value: number | string) => [`${value} min`, 'Estudado']}
              cursor={{ fill: darkMode ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.1)' }}
              contentStyle={tooltipSurface}
              labelStyle={{ color: darkMode ? '#e2e8f0' : '#0f172a' }}
              itemStyle={{ color: darkMode ? '#cbd5e1' : '#334155' }}
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

      {resolvedSubjectDistribution.length > 0 && (
        <div className="mb-5 overflow-hidden">
          <h3 className={`mb-3 font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Distribuicao por Materia</h3>
          <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={resolvedSubjectDistribution}
                    dataKey="minutes"
                    nameKey="subject"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={false}
                    labelLine={false}
                  >
                    {resolvedSubjectDistribution.map((entry, index) => (
                      <Cell key={`${entry.subject}-${index}`} fill={getSubjectPalette(entry.subject).hex} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | string) => `${value} min`}
                    contentStyle={tooltipSurface}
                    labelStyle={{ color: darkMode ? '#e2e8f0' : '#0f172a' }}
                    itemStyle={{ color: darkMode ? '#cbd5e1' : '#334155' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid content-start gap-2">
              {resolvedSubjectDistribution.map((entry, index) => (
                <div
                  key={`${entry.subject}-${index}`}
                  className={`grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-3 py-2 ${darkMode ? 'border-slate-700 bg-slate-900/72' : 'border-slate-200 bg-white/80'}`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: getSubjectPalette(entry.subject).hex }}
                  />
                  <span className={`min-w-0 truncate text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{entry.subject}</span>
                  <span className={`whitespace-nowrap text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {entry.percentage.toFixed(0)}% &middot; {formatMinutes(entry.minutes)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-2xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900/72' : 'border-slate-200 bg-white/84'}`}>
        <h3 className={`mb-3 flex items-center gap-2 font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          <Lightbulb className="h-4 w-4" /> Insights da Semana
        </h3>
        <ul className="space-y-2">
          {stats.insights.map((insight, index) => (
            <li key={index} className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{insight}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  darkMode?: boolean;
}> = ({
  title,
  value,
  icon: Icon,
  darkMode = false,
}) => (
  <div className={`rounded-2xl border p-4 shadow-[0_14px_30px_-24px_rgba(148,163,184,0.3)] ${
    darkMode
      ? 'border-slate-700 bg-slate-900/78 shadow-[0_18px_36px_-26px_rgba(2,6,23,0.48)]'
      : 'border-slate-200 bg-white/82'
  }`}>
    <div className="mb-2" style={{ color: 'var(--color-primary)' }}><Icon className="h-5 w-5" /></div>
    <div className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{value}</div>
    <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>{title}</div>
  </div>
);

const formatDateBR = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const formatDayShort = (date: Date): string => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  return days[date.getDay()];
};

export default WeeklyReport;
