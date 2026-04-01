import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Clock3,
  Flame,
  TrendingUp,
} from 'lucide-react';

type SyncTone = 'success' | 'warning' | 'danger' | 'neutral';

interface RightPanelConsistency {
  percent: number;
  streak: number;
  todayMinutes: number;
  dailyGoalMinutes: number;
  syncLabel: string;
  syncTone?: SyncTone;
}

interface RightPanelWeeklyStatus {
  completedSessions: number;
  plannedSessions: number;
  remainingSessions: number;
}

export interface RightPanelAlert {
  id: string;
  tone: 'info' | 'warning' | 'danger' | 'success';
  label: string;
  detail: string;
}

interface RightPanelMentor {
  headline: string;
  recommendation: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface RightPanelProps {
  consistency?: RightPanelConsistency;
  weeklyStatus?: RightPanelWeeklyStatus;
  alerts?: RightPanelAlert[];
  mentor?: RightPanelMentor;
  darkMode?: boolean;
}

const getSyncToneClass = (tone: SyncTone, darkMode: boolean) => {
  if (darkMode) {
    switch (tone) {
      case 'success': return 'bg-emerald-950/40 text-emerald-200';
      case 'warning': return 'bg-amber-950/40 text-amber-200';
      case 'danger': return 'bg-rose-950/40 text-rose-200';
      default: return 'bg-slate-900 text-slate-300';
    }
  }

  switch (tone) {
    case 'success': return 'bg-emerald-100 text-emerald-700';
    case 'warning': return 'bg-amber-100 text-amber-700';
    case 'danger': return 'bg-rose-100 text-rose-700';
    default: return 'bg-slate-100 text-slate-600';
  }
};

const getAlertToneClass = (tone: RightPanelAlert['tone'], darkMode: boolean) => {
  if (darkMode) {
    switch (tone) {
      case 'info': return 'border-sky-900/60 bg-sky-950/30 text-sky-100';
      case 'warning': return 'border-amber-900/60 bg-amber-950/30 text-amber-100';
      case 'danger': return 'border-rose-900/60 bg-rose-950/30 text-rose-100';
      case 'success': return 'border-emerald-900/60 bg-emerald-950/30 text-emerald-100';
    }
  }

  switch (tone) {
    case 'info': return 'border-sky-200 bg-sky-50 text-sky-900';
    case 'warning': return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'danger': return 'border-rose-200 bg-rose-50 text-rose-900';
    case 'success': return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }
};

export const RightPanel: React.FC<RightPanelProps> = ({
  consistency,
  weeklyStatus,
  alerts = [],
  mentor,
  darkMode = false,
}) => {
  return (
    <div className="space-y-5">
      {consistency ? (
        <div className={`motion-enter motion-card rounded-[28px] border p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)] ${
          darkMode
            ? 'border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(2,6,23,0.96)_100%)] shadow-[0_16px_34px_rgba(2,6,23,0.45)]'
            : 'border-cyan-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7feff_100%)]'
        }`}>
          <div className="mb-2.5 flex items-center justify-between">
            <div className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Consistencia</div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSyncToneClass(consistency.syncTone || 'neutral', darkMode)}`}>
              {consistency.syncLabel}
            </span>
          </div>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <div className={`text-4xl font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{consistency.percent}%</div>
              <div className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {consistency.todayMinutes > 0
                  ? 'Voce ja marcou presenca hoje. Continue.'
                  : 'Seu dia ainda esta em aberto. Um bloco muda a semana.'}
              </div>
            </div>
            <div className={`rounded-full px-3 py-1 text-sm font-semibold ${darkMode ? 'bg-cyan-950/45 text-cyan-200' : 'bg-cyan-100 text-cyan-700'}`}>
              +{Math.max(consistency.streak, 1)} dias
            </div>
          </div>
          <div className={`h-3 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <div
              className="h-3 rounded-full bg-[linear-gradient(90deg,#00E5FF_0%,#38bdf8_60%,#818cf8_100%)] transition-all duration-700"
              style={{ width: `${Math.max(consistency.percent, 6)}%` }}
            />
          </div>
          <div className={`mt-3 rounded-2xl p-3.5 shadow-[0_10px_18px_rgba(15,23,42,0.04)] ${darkMode ? 'bg-slate-950/78 shadow-[0_10px_18px_rgba(2,6,23,0.35)]' : 'bg-white'}`}>
            <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Meta do dia</div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                {consistency.todayMinutes} / {consistency.dailyGoalMinutes} min
              </p>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {Math.min(100, Math.max(0, Math.round((consistency.todayMinutes / Math.max(consistency.dailyGoalMinutes, 1)) * 100)))}% concluido
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {weeklyStatus ? (
        <div className={`motion-enter motion-card rounded-[28px] border p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)] ${
          darkMode
            ? 'border-slate-800 bg-slate-950/92 shadow-[0_16px_34px_rgba(2,6,23,0.45)]'
            : 'border-slate-200 bg-white'
        }`}>
          <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
            Progresso semanal
          </div>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <div className={`text-3xl font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {weeklyStatus.completedSessions}/{Math.max(weeklyStatus.plannedSessions, 1)}
              </div>
              <div className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {weeklyStatus.remainingSessions > 0
                  ? `Faltam ${weeklyStatus.remainingSessions} blocos para fechar a meta`
                  : 'Meta semanal em dia'}
              </div>
            </div>
            <div className={`rounded-full px-3 py-1 text-sm font-semibold ${darkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
              {Math.round((weeklyStatus.completedSessions / Math.max(weeklyStatus.plannedSessions, 1)) * 100)}%
            </div>
          </div>
          <div className={`mt-4 h-3 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <div
              className="h-3 rounded-full bg-[linear-gradient(90deg,#00E5FF_0%,#818cf8_100%)] transition-all duration-700"
              style={{ width: `${Math.max(8, Math.min(100, Math.round((weeklyStatus.completedSessions / Math.max(weeklyStatus.plannedSessions, 1)) * 100)))}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 text-sm">
            <div className={`rounded-2xl p-3 ${darkMode ? 'bg-slate-900/72' : 'bg-slate-50'}`}>
              <div className={darkMode ? 'text-slate-500' : 'text-slate-400'}>Concluidos</div>
              <div className={`mt-1 text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{weeklyStatus.completedSessions}</div>
            </div>
            <div className={`rounded-2xl p-3 ${darkMode ? 'bg-slate-900/72' : 'bg-slate-50'}`}>
              <div className={darkMode ? 'text-slate-500' : 'text-slate-400'}>Restantes</div>
              <div className={`mt-1 text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{weeklyStatus.remainingSessions}</div>
            </div>
          </div>
        </div>
      ) : null}

      {alerts.length > 0 ? (
        <div className={`motion-enter motion-card rounded-[28px] border p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)] ${
          darkMode
            ? 'border-slate-800 bg-slate-950/92 shadow-[0_16px_34px_rgba(2,6,23,0.45)]'
            : 'border-slate-200 bg-white'
        }`}>
          <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Alertas
          </div>
          <div className="space-y-2.5">
            {alerts.map((alert) => (
              <div key={alert.id} className={`rounded-2xl border px-3.5 py-3 ${getAlertToneClass(alert.tone, darkMode)}`}>
                <p className="text-sm font-semibold">{alert.label}</p>
                <p className="mt-1 text-sm opacity-80">{alert.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {mentor ? (
        <div className="motion-enter motion-card overflow-hidden rounded-[28px] border border-violet-200/70 bg-[linear-gradient(145deg,#312e81_0%,#1e1b4b_42%,#0f172a_100%)] p-5 text-white shadow-[0_20px_40px_rgba(49,46,129,0.2)]">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-white/82">
              <BrainCircuit className="h-4 w-4 text-cyan-300" />
              Mentor IA
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              diferencial
            </span>
          </div>
          <div className="mt-3 text-xl font-semibold leading-snug">{mentor.headline}</div>
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/8 p-3.5 text-sm text-white/78">
            {mentor.recommendation}
          </div>
          {mentor.onAction && mentor.actionLabel ? (
            <button
              type="button"
              onClick={mentor.onAction}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 active:scale-[0.98]"
            >
              {mentor.actionLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      {consistency ? (
        <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(135deg,#111827_0%,#0f172a_100%)] px-4 py-4 text-white shadow-[0_16px_30px_rgba(15,23,42,0.14)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <Flame className="h-4 w-4" />
            Ritmo
          </div>
          <p className="mt-4 text-3xl font-black tracking-[-0.04em]">{Math.max(consistency.streak, 0)} dias</p>
          <p className="mt-2 text-sm text-white/70">Constancia construida bloco por bloco.</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85">
            <Clock3 className="h-3.5 w-3.5" />
            {consistency.todayMinutes} min hoje
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RightPanel;
