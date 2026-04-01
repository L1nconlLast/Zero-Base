import React from 'react';
import { ArrowRight, Gauge, Layers3, Sparkles, TimerReset } from 'lucide-react';
import { normalizeBlockLabel, truncatePresentationLabel } from '../../utils/uiLabels';

interface LoadBalanceSnapshot {
  label: string;
  minutes: number;
  subjects: number;
}

interface TodayStatusCard {
  label: string;
  detail: string;
  tone: 'success' | 'warning' | 'neutral';
}

interface LoadBalancePanelCopy {
  todayEyebrow?: string;
  executeLabel?: string;
  focusLabel?: string;
  coverageDescription?: string;
  quickReadLabel?: string;
  quickReadDescription?: string;
}

interface LoadBalancePanelProps {
  darkMode?: boolean;
  todayStatus: TodayStatusCard;
  averageDailyMinutes: number;
  activeDays: number;
  uniqueSubjects: number;
  todayCompletedSessions: number;
  currentBlockLabel: string;
  heaviestDay?: LoadBalanceSnapshot | null;
  lightestDay?: LoadBalanceSnapshot | null;
  onStartStudy: () => void;
  copy?: LoadBalancePanelCopy;
}

const getToneClass = (tone: TodayStatusCard['tone'], darkMode: boolean) => {
  if (darkMode) {
    switch (tone) {
      case 'success': return 'border-emerald-900 bg-emerald-950/30 text-emerald-100';
      case 'warning': return 'border-amber-900 bg-amber-950/30 text-amber-100';
      default: return 'border-slate-800 bg-slate-900/80 text-slate-100';
    }
  }

  switch (tone) {
    case 'success': return 'border-emerald-200/80 bg-emerald-50/82 text-emerald-900';
    case 'warning': return 'border-amber-200/80 bg-amber-50/82 text-amber-900';
    default: return 'border-slate-200/80 bg-slate-50/82 text-slate-900';
  }
};

export const LoadBalancePanel: React.FC<LoadBalancePanelProps> = ({
  darkMode = false,
  todayStatus,
  averageDailyMinutes,
  activeDays,
  uniqueSubjects,
  todayCompletedSessions,
  currentBlockLabel,
  heaviestDay,
  lightestDay,
  onStartStudy,
  copy,
}) => {
  const safeCurrentBlockLabel = normalizeBlockLabel(currentBlockLabel);
  const todayEyebrow = copy?.todayEyebrow || 'Hoje no plano';
  const executeLabel = copy?.executeLabel || 'Executar plano de hoje';
  const focusLabel = copy?.focusLabel || 'Bloco em foco';
  const coverageDescription = copy?.coverageDescription || 'Disciplinas girando ao longo da semana.';
  const quickReadLabel = copy?.quickReadLabel || 'Leitura rapida';
  const quickReadDescription = copy?.quickReadDescription || 'Planejamento organizado, execucao concentrada. A semana responde abaixo sem quebrar o loop principal.';

  return (
    <div className="space-y-4">
      <section className={`rounded-[26px] border p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ${getToneClass(todayStatus.tone, darkMode)}`}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-70">{todayEyebrow}</div>
        <h3 className="mt-2 text-[22px] font-black tracking-[-0.04em]">{todayStatus.label}</h3>
        <p className="mt-3 text-sm opacity-80">{todayStatus.detail}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${darkMode ? 'bg-slate-950/70' : 'bg-white/80'}`}>
            {todayCompletedSessions} sessao{todayCompletedSessions === 1 ? '' : 'es'} concluida{todayCompletedSessions === 1 ? '' : 's'}
          </span>
          <span className={`max-w-full rounded-full px-3 py-1.5 text-sm font-semibold ${darkMode ? 'bg-slate-950/70' : 'bg-white/80'}`} title={`${focusLabel}: ${safeCurrentBlockLabel}`}>
            {focusLabel}: {truncatePresentationLabel(safeCurrentBlockLabel, 24, safeCurrentBlockLabel)}
          </span>
        </div>
        <button
          type="button"
          onClick={onStartStudy}
          className={`mt-4 inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
            darkMode
              ? 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {executeLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <section className={`rounded-[26px] border p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ${
        darkMode
          ? 'border-slate-800 bg-slate-950/88 shadow-[0_12px_28px_rgba(2,6,23,0.3)]'
          : 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(241,245,249,0.94)_100%)] shadow-[0_12px_28px_rgba(148,163,184,0.12)]'
      }`}>
        <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <Gauge className="h-4 w-4 text-cyan-500" />
          Balanceamento
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
          <div className={`rounded-[20px] p-3.5 ${darkMode ? 'bg-slate-900/72' : 'bg-slate-100/80'}`}>
            <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Media diaria</div>
            <div className={`mt-2 text-[22px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{averageDailyMinutes} min</div>
            <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{activeDays} dias ativos no ciclo atual.</p>
          </div>
          <div className={`rounded-[20px] p-3.5 ${darkMode ? 'bg-slate-900/72' : 'bg-slate-100/80'}`}>
            <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cobertura</div>
            <div className={`mt-2 text-[22px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{uniqueSubjects}</div>
            <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{coverageDescription}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {heaviestDay ? (
            <div className={`rounded-[20px] border p-3.5 ${darkMode ? 'border-rose-900 bg-rose-950/25' : 'border-rose-100/80 bg-rose-50/78'}`}>
              <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-rose-200' : 'text-rose-700'}`}>
                <TimerReset className="h-4 w-4" />
                Dia mais pesado
              </div>
              <p className={`mt-2 text-base font-bold ${darkMode ? 'text-rose-100' : 'text-rose-950'}`}>{heaviestDay.label}</p>
              <p className={`mt-1 text-sm ${darkMode ? 'text-rose-100/80' : 'text-rose-900/80'}`}>
                {heaviestDay.minutes} min e {heaviestDay.subjects} disciplina{heaviestDay.subjects === 1 ? '' : 's'} previstas.
              </p>
            </div>
          ) : null}

          {lightestDay ? (
            <div className={`rounded-[20px] border p-3.5 ${darkMode ? 'border-amber-900 bg-amber-950/25' : 'border-amber-100/80 bg-amber-50/78'}`}>
              <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-amber-200' : 'text-amber-700'}`}>
                <Sparkles className="h-4 w-4" />
                Melhor janela para reforco
              </div>
              <p className={`mt-2 text-base font-bold ${darkMode ? 'text-amber-100' : 'text-amber-950'}`}>{lightestDay.label}</p>
              <p className={`mt-1 text-sm ${darkMode ? 'text-amber-100/80' : 'text-amber-900/80'}`}>
                {lightestDay.minutes} min planejados. Use os CTAs de reforco ou alivio no cronograma para rebalancear.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className={`overflow-hidden rounded-[24px] border p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${
        darkMode
          ? 'border-slate-800 bg-slate-950/80 text-slate-100 shadow-[0_10px_24px_rgba(2,6,23,0.26)]'
          : 'border-slate-200/80 bg-slate-50/74 text-slate-900 shadow-[0_10px_24px_rgba(148,163,184,0.08)]'
      }`}>
        <div className={`flex items-center gap-2 text-sm font-semibold ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          <Layers3 className={`h-4 w-4 ${darkMode ? 'text-cyan-300' : 'text-cyan-500'}`} />
          {quickReadLabel}
        </div>
        <p className={`mt-3 truncate text-[22px] font-black tracking-[-0.04em] ${
          darkMode ? 'text-slate-100' : 'text-slate-900'
        }`} title={safeCurrentBlockLabel}>
          {truncatePresentationLabel(safeCurrentBlockLabel, 28, safeCurrentBlockLabel)}
        </p>
        <p className={`mt-1.5 text-sm ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {quickReadDescription}
        </p>
      </section>
    </div>
  );
};

export default LoadBalancePanel;
