import React from 'react';
import toast from 'react-hot-toast';
import { Activity, RefreshCcw, Trophy, TrendingUp, Users } from 'lucide-react';
import { adminRetentionService, type AdminRetentionDashboard } from '../../services/adminRetention.service';

const SummaryCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{title}</p>
      <span className="text-slate-500 dark:text-slate-400">{icon}</span>
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{value}</p>
  </div>
);

export const RetentionAdminPanel: React.FC = () => {
  const [data, setData] = React.useState<AdminRetentionDashboard | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);
    try {
      const dashboard = await adminRetentionService.getDashboard(12, 10);
      setData(dashboard);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar painel de retenção.';

      if (message.toLowerCase().includes('sem permissão de admin')) {
        setIsUnauthorized(true);
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleRefreshRanking = async () => {
    setRefreshing(true);
    try {
      const updatedUsers = await adminRetentionService.refreshRanking();
      toast.success(`Ranking recalculado para ${updatedUsers} usuário(s).`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao recalcular ranking.');
    } finally {
      setRefreshing(false);
    }
  };

  if (isUnauthorized) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Admin • Retenção & Consistência</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Coorte semanal, ranking de disciplina e taxa de conclusão 4/semana.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefreshRanking()}
          disabled={refreshing || loading}
          className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 inline-flex items-center gap-2"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Recalcular ranking
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">Carregando painel de retenção...</div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <SummaryCard
              title="Retenção semanal"
              value={`${data.summary.current_week_completion_rate}%`}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <SummaryCard
              title="Média últimas 4"
              value={`${data.summary.avg_4_weeks_completion_rate}%`}
              icon={<Activity className="w-4 h-4" />}
            />
            <SummaryCard
              title="Usuários 3+ semanas"
              value={data.summary.users_with_3plus_weeks}
              icon={<Users className="w-4 h-4" />}
            />
            <SummaryCard
              title="Ativos semana atual"
              value={data.summary.active_users_latest_week}
              icon={<Trophy className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Taxa de conclusão por semana</p>
              <div className="space-y-2">
                {data.weekly.map((row) => (
                  <div key={row.week_start}>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span>{row.week_start}</span>
                      <span>{row.completion_rate}% ({row.completed_users}/{row.total_users})</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, row.completion_rate)}%`, backgroundColor: 'var(--color-primary)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Top 10 consistentes</p>
              <div className="space-y-2">
                {data.topUsers.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">#{user.rank} {user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                    <div className="text-right text-xs text-slate-600 dark:text-slate-300">
                      <p>Atual: {user.current_streak} sem</p>
                      <p>Máx: {user.max_streak} sem</p>
                      <p>{user.consistency_rate}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Coortes (cadastro x retenção)</p>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-2">Cohort</th>
                    <th className="py-2">Semana</th>
                    <th className="py-2 text-right">Retidos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cohorts.map((row, index) => (
                    <tr key={`${row.cohort_week}-${row.week_start}-${index}`} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-2 text-slate-700 dark:text-slate-300">{row.cohort_week}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-300">{row.week_start}</td>
                      <td className="py-2 text-right text-slate-800 dark:text-slate-200 font-semibold">{row.retained_users}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
};
