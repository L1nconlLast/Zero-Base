import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { Download } from 'lucide-react';
import { mentorAdminApiService, type MentorAdminMetricsResponse } from '../services/mentorAdminApi.service';
import toast from 'react-hot-toast';

interface MentorAdminDashboardProps {
  userEmail?: string;
}

const formatNumber = (value: number): string => new Intl.NumberFormat('pt-BR').format(value || 0);
const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).format(value || 0);

const cardClassName = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm';

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((id) => (
        <div key={id} className={`${cardClassName} h-28`} />
      ))}
    </div>
    <div className={`${cardClassName} h-80`} />
    <div className={`${cardClassName} h-80`} />
  </div>
);

const MentorAdminDashboard: React.FC<MentorAdminDashboardProps> = () => {
  const [data, setData] = useState<MentorAdminMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '15d' | '30d' | 'current_month'>('30d');
  const [exporting, setExporting] = useState(false);

  const loadMetrics = async (selectedPeriod: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await mentorAdminApiService.getMetrics(selectedPeriod);
      setData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nao foi possivel carregar o dashboard.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMetrics(period);
  }, [period]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await mentorAdminApiService.exportCsv(period);
      toast.success(`CSV exportado: mentor_usage_${period}.csv`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao exportar CSV';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const trendData = useMemo(() => {
    return (data?.trend || []).map((item) => ({
      ...item,
      dayLabel: item.date.slice(5),
    }));
  }, [data]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className={`${cardClassName} text-center space-y-2`}>
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nao foi possivel carregar o Dashboard do Mentor</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{error || 'Erro desconhecido.'}</p>
      </div>
    );
  }

  const periodLabel = {
    '7d': 'Últimos 7 Dias',
    '15d': 'Últimos 15 Dias',
    '30d': 'Últimos 30 Dias',
    'current_month': 'Mês Atual',
  }[period];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 font-semibold">Admin</p>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Dashboard Financeiro Mentor IA</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Monitoramento de consumo de tokens e custo estimado da operacao.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex-1 flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as '7d' | '15d' | '30d' | 'current_month')}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="7d">Últimos 7 Dias</option>
            <option value="15d">Últimos 15 Dias</option>
            <option value="30d">Últimos 30 Dias</option>
            <option value="current_month">Mês Atual</option>
          </select>
          <span className="text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 whitespace-nowrap">
            {periodLabel}
          </span>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cardClassName}>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Total Tokens ({period})</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">{formatNumber(data.kpis.totalTokens)}</p>
        </div>
        <div className={cardClassName}>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Requisicoes ({period})</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">{formatNumber(data.kpis.totalRequests)}</p>
        </div>
        <div className={cardClassName}>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Custo Estimado (USD)</p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{formatCurrency(data.kpis.estimatedCostUsd)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Base: {formatCurrency(data.kpis.costPerMillionTokensUsd)} / 1M tokens</p>
        </div>
      </div>

      <div className={cardClassName}>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Tendencia diaria de consumo</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
              <XAxis dataKey="dayLabel" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.35)',
                  backgroundColor: 'rgba(15,23,42,0.95)',
                  color: '#e2e8f0',
                }}
              />
              <Line type="monotone" dataKey="totalTokens" stroke="var(--color-primary)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cardClassName}>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Top 5 Heavy Users ({period})</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-4 font-semibold">User ID</th>
                <th className="py-2 pr-4 font-semibold">Total Tokens</th>
                <th className="py-2 font-semibold">Requisicoes</th>
              </tr>
            </thead>
            <tbody>
              {data.topUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-slate-500 dark:text-slate-400">Sem consumo registrado neste periodo.</td>
                </tr>
              )}

              {data.topUsers.map((user) => (
                <tr key={user.userId} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4 font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-300">{user.userId}</td>
                  <td className="py-2 pr-4 font-semibold text-slate-900 dark:text-slate-100">{formatNumber(user.totalTokens)}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-300">{formatNumber(user.totalRequests)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={cardClassName}>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Requisicoes por dia (apoio operacional)</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 5, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
              <XAxis dataKey="dayLabel" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.35)',
                  backgroundColor: 'rgba(15,23,42,0.95)',
                  color: '#e2e8f0',
                }}
              />
              <Bar dataKey="totalRequests" radius={[8, 8, 0, 0]} fill="var(--color-secondary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MentorAdminDashboard;
