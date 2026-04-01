import React from 'react';
import type { ProductPhase, ProductPhaseOverride } from '../../hooks/useEffectivePhase';

type DevPhaseSwitcherProps = {
  detectedPhase: ProductPhase;
  effectivePhase: ProductPhase;
  phaseOverride: ProductPhaseOverride;
  isAdminMode: boolean;
  onChangePhaseOverride: (phase: ProductPhaseOverride) => void;
  onToggleAdminMode: () => void;
  onResetInternalMode: () => void;
};

const PHASE_LABELS: Record<ProductPhase, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediario',
  advanced: 'Avancado',
};

export const DevPhaseSwitcher: React.FC<DevPhaseSwitcherProps> = ({
  detectedPhase,
  effectivePhase,
  phaseOverride,
  isAdminMode,
  onChangePhaseOverride,
  onToggleAdminMode,
  onResetInternalMode,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-4 right-4 z-[90] rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-2xl"
      >
        Modo interno
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[90] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-4 text-white shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Modo interno</p>
          <p className="mt-2 text-sm font-semibold text-white">Simulacao de fase</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAdminMode}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isAdminMode ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Admin {isAdminMode ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
        <div className="rounded-xl bg-slate-900/80 p-3">
          <p className="uppercase tracking-[0.12em] text-slate-500">Detectada</p>
          <p className="mt-2 font-semibold text-white">{PHASE_LABELS[detectedPhase]}</p>
        </div>
        <div className="rounded-xl bg-slate-900/80 p-3">
          <p className="uppercase tracking-[0.12em] text-slate-500">Efetiva</p>
          <p className="mt-2 font-semibold text-white">{PHASE_LABELS[effectivePhase]}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(['beginner', 'intermediate', 'advanced'] as ProductPhase[]).map((phase) => {
          const active = phaseOverride === phase;

          return (
            <button
              key={phase}
              onClick={() => onChangePhaseOverride(phase)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                active ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {PHASE_LABELS[phase]}
            </button>
          );
        })}

        <button
          onClick={() => onChangePhaseOverride(null)}
          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
            phaseOverride === null ? 'bg-cyan-300 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
        >
          Auto
        </button>
      </div>

      <button
        onClick={() => {
          onResetInternalMode();
          setIsCollapsed(true);
        }}
        className="mt-4 w-full rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20"
      >
        Resetar modo interno
      </button>

      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
        <p className="text-[11px] leading-5 text-slate-400">
          Override so altera a visualizacao interna da fase e acelera o QA de UX.
        </p>
      </div>
    </div>
  );
};
