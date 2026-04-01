import React, { Suspense } from 'react';

interface UnifiedAdjustmentsCombinedPanelProps {
  controls: React.ReactNode;
  methodHub: React.ReactNode;
  calendar: React.ReactNode;
}

export const UnifiedAdjustmentsCombinedPanel: React.FC<UnifiedAdjustmentsCombinedPanelProps> = ({
  controls,
  methodHub,
  calendar,
}) => {
  return (
    <div className="mt-6 space-y-6">
      {controls}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Metodo
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Escolha metodo so quando isso ajudar a executar melhor
            </h3>
          </div>
          <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando metodos...</div>}>
            {methodHub}
          </Suspense>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Cronograma
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Seu plano base ja esta definido. Ajuste so se precisar.
            </h3>
          </div>
          <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando cronograma...</div>}>
            {calendar}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default UnifiedAdjustmentsCombinedPanel;
