import React from 'react';
import { Clock3, Layers3, Target } from 'lucide-react';
import { normalizeBlockLabel, truncatePresentationLabel } from '../../utils/uiLabels';

interface StudyCycleProgressProps {
  darkMode?: boolean;
  completedSessions: number;
  plannedSessions: number;
  plannedMinutes: number;
  activeDays: number;
  uniqueSubjects: number;
  currentBlockLabel: string;
  defaultSessionDurationMinutes: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const StudyCycleProgress: React.FC<StudyCycleProgressProps> = ({
  darkMode = false,
  completedSessions,
  plannedSessions,
  plannedMinutes,
  activeDays,
  uniqueSubjects,
  currentBlockLabel,
  defaultSessionDurationMinutes,
}) => {
  const ratio = plannedSessions > 0 ? (completedSessions / plannedSessions) * 100 : 0;
  const safeRatio = clamp(Math.round(ratio), 0, 100);
  const safeCurrentBlockLabel = normalizeBlockLabel(currentBlockLabel);

  return (
    <section className={`motion-enter motion-card overflow-hidden rounded-[28px] border p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)] ${
      darkMode
        ? 'border-slate-800 bg-slate-950/92 shadow-[0_16px_34px_rgba(2,6,23,0.45)]'
        : 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(241,245,249,0.94)_100%)] shadow-[0_16px_34px_rgba(148,163,184,0.18)]'
    }`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Planejamento
          </div>
          <h2 className={`mt-1.5 text-[28px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            Seu ciclo da semana ja esta montado
          </h2>
          <p className={`mt-3 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            O cronograma continua sendo um motor de suporte. A execucao oficial segue puxando o bloco do dia
            enquanto voce ajusta a semana so onde precisa.
          </p>
        </div>

        <div className={`min-w-0 rounded-[24px] border p-4 shadow-[0_12px_26px_rgba(15,23,42,0.05)] lg:min-w-[250px] ${
          darkMode
            ? 'border-cyan-900/70 bg-[linear-gradient(135deg,rgba(8,145,178,0.16)_0%,rgba(15,23,42,0.92)_55%,rgba(88,28,135,0.2)_100%)] shadow-[0_12px_26px_rgba(2,6,23,0.45)]'
            : 'border-cyan-100/80 bg-[linear-gradient(135deg,rgba(240,249,255,0.96)_0%,rgba(248,250,252,0.96)_55%,rgba(245,243,255,0.94)_100%)] shadow-[0_12px_26px_rgba(148,163,184,0.14)]'
        }`}>
          <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Bloco em destaque</div>
          <div className={`mt-1.5 truncate text-[26px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} title={safeCurrentBlockLabel}>
            {truncatePresentationLabel(safeCurrentBlockLabel, 28, safeCurrentBlockLabel)}
          </div>
          <div className={`mt-2.5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            darkMode ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'
          }`}>
            <Clock3 className="h-3.5 w-3.5" />
            {defaultSessionDurationMinutes} min por sessao base
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3.5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className={`rounded-[24px] border p-4 ${darkMode ? 'border-slate-800 bg-slate-900/72' : 'border-slate-200/80 bg-slate-50/82'}`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Progresso do ciclo</div>
              <div className={`mt-1.5 text-[28px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {completedSessions}/{Math.max(plannedSessions, 1)}
              </div>
              <div className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {plannedSessions > 0
                  ? safeRatio < 100
                    ? `Faltam ${Math.max(plannedSessions - completedSessions, 0)} sessoes para fechar a meta`
                    : 'Meta semanal no trilho'
                  : 'Monte a semana para destravar o ciclo.'}
              </div>
            </div>
            <div className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${
              darkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-100/92 text-slate-700'
            }`}>
              {safeRatio}%
            </div>
          </div>

          <div className={`mt-3 h-3 rounded-full ${darkMode ? 'bg-slate-950' : 'bg-slate-100/95'}`}>
            <div
              className="h-3 rounded-full bg-[linear-gradient(90deg,#00E5FF_0%,#38bdf8_45%,#818cf8_100%)] transition-all duration-700"
              style={{ width: `${Math.max(plannedSessions > 0 ? safeRatio : 8, plannedSessions > 0 ? 8 : 0)}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`rounded-[22px] border p-3.5 shadow-[0_10px_18px_rgba(15,23,42,0.04)] ${
            darkMode ? 'border-slate-800 bg-slate-950/88 shadow-[0_10px_18px_rgba(2,6,23,0.45)]' : 'border-slate-200/80 bg-slate-50/92 shadow-[0_10px_18px_rgba(148,163,184,0.14)]'
          }`}>
            <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Clock3 className="h-3.5 w-3.5 text-cyan-500" />
              Carga base
            </div>
            <div className={`mt-2.5 text-[26px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{plannedMinutes} min</div>
            <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Planejados para a semana atual.</p>
          </div>

          <div className={`rounded-[22px] border p-3.5 shadow-[0_10px_18px_rgba(15,23,42,0.04)] ${
            darkMode ? 'border-slate-800 bg-slate-950/88 shadow-[0_10px_18px_rgba(2,6,23,0.45)]' : 'border-slate-200/80 bg-slate-50/92 shadow-[0_10px_18px_rgba(148,163,184,0.14)]'
          }`}>
            <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Target className="h-3.5 w-3.5 text-violet-500" />
              Dias ativos
            </div>
            <div className={`mt-2.5 text-[26px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{activeDays}</div>
            <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Dias disponiveis com trilho de estudo.</p>
          </div>

          <div className={`rounded-[22px] border p-3.5 shadow-[0_10px_18px_rgba(15,23,42,0.04)] sm:col-span-2 ${
            darkMode ? 'border-slate-800 bg-slate-950/88 shadow-[0_10px_18px_rgba(2,6,23,0.45)]' : 'border-slate-200/80 bg-slate-50/92 shadow-[0_10px_18px_rgba(148,163,184,0.14)]'
          }`}>
            <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Layers3 className="h-3.5 w-3.5 text-amber-500" />
              Disciplinas no giro
            </div>
            <div className={`mt-2.5 text-[26px] font-black tracking-[-0.04em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{uniqueSubjects}</div>
            <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Entrando na rotacao desta semana.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StudyCycleProgress;
