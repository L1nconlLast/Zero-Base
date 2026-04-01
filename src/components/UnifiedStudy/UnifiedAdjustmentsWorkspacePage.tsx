import React, { Suspense } from 'react';
import { StudyExecutionBanner } from '../Study/StudyExecutionBanner';

type UnifiedAdjustmentsTab = 'cronograma' | 'metodos';

interface BannerMeta {
  label: string;
  value: string;
}

interface UnifiedAdjustmentsWorkspacePageProps {
  containerRef?: React.Ref<HTMLDivElement>;
  activeTab: UnifiedAdjustmentsTab;
  onTabChange: (tab: UnifiedAdjustmentsTab) => void;
  onBackToFocus: () => void;
  title: string;
  meta: BannerMeta[];
  cronogramaControls: React.ReactNode;
  calendar: React.ReactNode;
  methodSummary: React.ReactNode;
  methodHub: React.ReactNode;
}

export const UnifiedAdjustmentsWorkspacePage: React.FC<UnifiedAdjustmentsWorkspacePageProps> = ({
  containerRef,
  activeTab,
  onTabChange,
  onBackToFocus,
  title,
  meta,
  cronogramaControls,
  calendar,
  methodSummary,
  methodHub,
}) => {
  return (
    <div ref={containerRef} className="max-w-6xl mx-auto space-y-6">
      <StudyExecutionBanner
        eyebrow="Ajustes do plano"
        title={title}
        description="Aqui voce decide o plano. Depois, volta para continuar a execucao do bloco principal."
        primaryActionLabel="Voltar para estudar"
        onPrimaryAction={onBackToFocus}
        meta={meta}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onTabChange('cronograma')}
          className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
            activeTab === 'cronograma'
              ? 'text-white'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
          style={activeTab === 'cronograma' ? { backgroundColor: 'var(--color-primary)' } : undefined}
        >
          Cronograma
        </button>
        <button
          type="button"
          onClick={() => onTabChange('metodos')}
          className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
            activeTab === 'metodos'
              ? 'text-white'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
          style={activeTab === 'metodos' ? { backgroundColor: 'var(--color-primary)' } : undefined}
        >
          Metodo
        </button>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        {activeTab === 'cronograma' ? (
          <div className="space-y-4">
            {cronogramaControls}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Cronograma inteligente
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Monte sua semana de estudo
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Defina quando e o que estudar. A execucao do dia continua separada.
                </p>
              </div>
              <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando cronograma...</div>}>
                {calendar}
              </Suspense>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            {methodSummary}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Metodo de estudo
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Escolha o metodo padrao fora da tela de execucao
                </h3>
              </div>
              <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando metodos...</div>}>
                {methodHub}
              </Suspense>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default UnifiedAdjustmentsWorkspacePage;
