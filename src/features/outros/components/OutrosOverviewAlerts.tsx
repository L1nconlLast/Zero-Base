import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Info } from 'lucide-react';

import type { OutrosOverviewAlertSnapshot } from '../../../services/outrosDashboard.service';
import { OutrosOverviewCard } from './OutrosOverviewCard';

interface OutrosOverviewAlertsProps {
  darkMode?: boolean;
  alerts: OutrosOverviewAlertSnapshot[];
  onAction: (target: string) => void;
}

const resolveToneClass = (darkMode: boolean, tone: OutrosOverviewAlertSnapshot['tone']) => {
  if (tone === 'warning') {
    return darkMode
      ? 'border-amber-700/40 bg-amber-500/10'
      : 'border-amber-200 bg-amber-50/90';
  }

  if (tone === 'positive') {
    return darkMode
      ? 'border-emerald-700/40 bg-emerald-500/10'
      : 'border-emerald-200 bg-emerald-50/90';
  }

  return darkMode
    ? 'border-sky-700/40 bg-sky-500/10'
    : 'border-sky-200 bg-sky-50/90';
};

const resolveToneIcon = (tone: OutrosOverviewAlertSnapshot['tone']) => {
  if (tone === 'warning') {
    return AlertTriangle;
  }

  if (tone === 'positive') {
    return CheckCircle2;
  }

  return Info;
};

export const OutrosOverviewAlerts: React.FC<OutrosOverviewAlertsProps> = ({
  darkMode = false,
  alerts,
  onAction,
}) => (
  <OutrosOverviewCard
    darkMode={darkMode}
    title="Alertas inteligentes"
    description="Separados do resto da leitura para ficar claro o que precisa de atencao agora."
    badge={`${alerts.length} alerta(s)`}
  >
    <div className="grid gap-3">
      {alerts.map((alert) => {
        const Icon = resolveToneIcon(alert.tone);

        return (
          <div
            key={alert.id}
            className={`rounded-2xl border p-4 ${resolveToneClass(darkMode, alert.tone)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className={`rounded-2xl border p-2 ${
                  darkMode ? 'border-white/10 bg-slate-950/40' : 'border-white/80 bg-white/80'
                }`}>
                  <Icon className={`h-4 w-4 ${
                    alert.tone === 'warning'
                      ? darkMode ? 'text-amber-200' : 'text-amber-700'
                      : alert.tone === 'positive'
                        ? darkMode ? 'text-emerald-200' : 'text-emerald-700'
                        : darkMode ? 'text-sky-200' : 'text-sky-700'
                  }`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${
                    darkMode ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {alert.title}
                  </p>
                  <p className={`mt-2 text-sm leading-6 ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {alert.detail}
                  </p>
                </div>
              </div>

              {alert.actionLabel && alert.actionTarget ? (
                <button
                  type="button"
                  onClick={() => onAction(alert.actionTarget!)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                    darkMode
                      ? 'border-slate-700 bg-slate-950/70 text-slate-100 hover:bg-slate-900'
                      : 'border-white bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {alert.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  </OutrosOverviewCard>
);

export default OutrosOverviewAlerts;
