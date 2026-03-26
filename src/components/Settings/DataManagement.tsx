import React, { useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { safeParseAndValidate } from '../../utils/validation';
import { analytics } from '../../utils/analytics';
import { CURRENT_DEPARTMENT_MISSION_HEURISTIC_RATIONALE } from '../../services/departmentMission.service';
import { ConfirmModal } from '../UI/ConfirmModal';
import toast from 'react-hot-toast';

interface DataManagementProps {
  data: {
    sessions: unknown[];
    userLevel: number;
    xp: number;
    exportedAt: string;
  };
  onClear: () => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({ data, onClear }) => {
  const [importJson, setImportJson] = useState('');
  const [error, setError] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const beginnerFunnel = React.useMemo(() => analytics.getBeginnerFunnelSnapshot(), []);
  const beginnerPriorities = React.useMemo(() => analytics.getBeginnerPriorityTable(), []);
  const topBeginnerPriorities = React.useMemo(() => beginnerPriorities.slice(0, 3), [beginnerPriorities]);
  const beginnerOperation = React.useMemo(() => analytics.getBeginnerOperationSnapshot(), []);
  const intermediateSnapshot = React.useMemo(() => analytics.getIntermediateSnapshot(), []);
  const intermediatePriorities = React.useMemo(() => analytics.getIntermediatePriorityTable(), []);
  const topIntermediatePriorities = React.useMemo(() => intermediatePriorities.slice(0, 3), [intermediatePriorities]);
  const intermediateOperation = React.useMemo(() => analytics.getIntermediateOperationSnapshot(), []);
  const advancedSnapshot = React.useMemo(() => analytics.getAdvancedSnapshot(), []);
  const advancedPriorities = React.useMemo(() => analytics.getAdvancedPriorityTable(), []);
  const topAdvancedPriorities = React.useMemo(() => advancedPriorities.slice(0, 3), [advancedPriorities]);
  const advancedOperation = React.useMemo(() => analytics.getAdvancedOperationSnapshot(), []);
  const advancedWeeklyScorecard = React.useMemo(() => analytics.getAdvancedWeeklyScorecard(), []);
  const globalPriorities = React.useMemo(() => analytics.getGlobalPriorityTable(), []);
  const topGlobalPriorities = React.useMemo(
    () => globalPriorities.filter((item) => item.severity !== 'Baixa').slice(0, 3),
    [globalPriorities],
  );
  const departmentDecisionSnapshot = React.useMemo(() => analytics.getDepartmentDecisionSnapshot(), []);
  const globalOperation = React.useMemo(() => analytics.getGlobalOperationSnapshot(), []);
  const globalWeeklyScorecard = React.useMemo(() => analytics.getGlobalWeeklyScorecard(), []);

  const primaryStyle = { color: 'var(--color-primary)' };
  const primaryBgStyle = { backgroundColor: 'var(--color-primary)' };
  const primarySoftStyle = {
    backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-primary) 28%, transparent)',
  };

  const secondaryStyle = { color: 'var(--color-secondary)' };
  const secondaryBgStyle = { backgroundColor: 'var(--color-secondary)' };
  const secondarySoftStyle = {
    backgroundColor: 'color-mix(in srgb, var(--color-secondary) 12%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-secondary) 28%, transparent)',
  };
  const secondaryRingStyle = {
    '--tw-ring-color': 'var(--color-secondary)',
  } as unknown as React.CSSProperties;
  const formatRate = (value: number | null) => (typeof value === 'number' ? `${value}%` : '--');
  const formatScorecardKpiValue = (kpi: string, value: number | null) => {
    if (typeof value !== 'number') {
      return '--';
    }

    if (kpi === 'blocked_feature_clicks' || kpi === 'intermediate_overload_signal') {
      return `${value}`;
    }

    return `${value}%`;
  };
  const getSeverityClasses = (severity: 'Critica' | 'Alta' | 'Media' | 'Baixa') => {
    if (severity === 'Critica') {
      return 'bg-rose-100 text-rose-700 border border-rose-200';
    }

    if (severity === 'Alta') {
      return 'bg-orange-100 text-orange-700 border border-orange-200';
    }

    if (severity === 'Media') {
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    }

    return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  };
  const getPhaseClasses = (phase: 'beginner' | 'intermediate') =>
    phase === 'beginner'
      ? 'bg-sky-100 text-sky-700 border border-sky-200'
      : 'bg-violet-100 text-violet-700 border border-violet-200';
  const getTrendClasses = (status: 'Melhorou' | 'Piorou' | 'Estavel' | 'Mudou' | 'Sem historico') => {
    if (status === 'Melhorou') {
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    }

    if (status === 'Piorou') {
      return 'bg-rose-100 text-rose-700 border border-rose-200';
    }

    if (status === 'Mudou') {
      return 'bg-sky-100 text-sky-700 border border-sky-200';
    }

    if (status === 'Estavel') {
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    }

    return 'bg-slate-100 text-slate-700 border border-slate-200';
  };
  const getAdvancedTrendClasses = (status: 'melhorou' | 'piorou' | 'estavel' | 'mudou_o_problema') => {
    if (status === 'melhorou') {
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    }

    if (status === 'piorou') {
      return 'bg-rose-100 text-rose-700 border border-rose-200';
    }

    if (status === 'mudou_o_problema') {
      return 'bg-sky-100 text-sky-700 border border-sky-200';
    }

    return 'bg-amber-100 text-amber-700 border border-amber-200';
  };

  const handleExport = () => {
    const exportData = {
      ...data,
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zero-base-dados-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Dados exportados com sucesso!');
  };

  const handleImport = () => {
    setError('');
    if (!importJson.trim()) {
      setError('Cole o JSON para importar');
      return;
    }

    const result = safeParseAndValidate(importJson);
    if (!result.success) {
      setError(result.error);
      return;
    }

    // Dados validados, agora insere no localStorage
    const backup = result.data;
    const importedData = backup.data;
    localStorage.setItem('zero-base-sessions', JSON.stringify(importedData.sessions));
    localStorage.setItem('zero-base-level', importedData.level.toString());
    localStorage.setItem('zero-base-xp', importedData.totalPoints.toString());
    // Legacy fallback para versões antigas do app.
    localStorage.setItem('medicina-sessions', JSON.stringify(importedData.sessions));
    localStorage.setItem('medicina-level', importedData.level.toString());
    localStorage.setItem('medicina-xp', importedData.totalPoints.toString());

    toast.success('Dados importados com sucesso! A página será recarregada.');
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl border" style={primarySoftStyle}>
          <p className="text-sm mb-2" style={primaryStyle}>Sessões Registradas</p>
          <p className="text-3xl font-bold" style={primaryStyle}>{data.sessions.length}</p>
        </div>
        <div className="p-6 rounded-xl border" style={secondarySoftStyle}>
          <p className="text-sm mb-2" style={secondaryStyle}>Nível Atual</p>
          <p className="text-3xl font-bold" style={secondaryStyle}>{data.userLevel}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200">
          <p className="text-sm text-emerald-600 mb-2">XP Total</p>
          <p className="text-3xl font-bold text-emerald-700">{data.xp.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Prioridade do Produto (Geral)</h3>
          <p className="text-sm text-gray-600 mt-1">
            Visao unica para decidir onde atacar primeiro no produto inteiro, com iniciante pesando mais que intermediario.
          </p>
        </div>

        {topGlobalPriorities.length > 0 ? (
          <div className="space-y-3">
            {topGlobalPriorities.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPhaseClasses(item.phase)}`}>
                          {item.phaseLabel}
                        </span>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClasses(item.severity)}`}>
                          {item.severity}
                        </span>
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {item.category}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.stage}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.signal}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.kpi}</p>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Problema</p>
                    <p className="mt-2 text-slate-700">{item.diagnosis}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Acao direta</p>
                    <p className="mt-2 text-slate-700">{item.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Nenhuma prioridade global urgente no momento.</p>
            <p className="mt-1 text-sm text-emerald-800">
              Continue monitorando as duas fases antes de abrir novas frentes de produto.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Modo Operacao Global</p>
            {globalOperation.weeklyDecision ? (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Fase</p>
                  <p className="mt-2 font-semibold text-slate-900">{globalOperation.weeklyDecision.phaseLabel}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Foco</p>
                  <p className="mt-2 font-semibold text-slate-900">{globalOperation.weeklyDecision.focus}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Por que</p>
                  <p className="mt-2 text-slate-700">{globalOperation.weeklyDecision.why}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Acao</p>
                  <p className="mt-2 text-slate-700">{globalOperation.weeklyDecision.action}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">KPI</p>
                  <p className="mt-2 font-semibold text-slate-900">{globalOperation.weeklyDecision.kpi}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-700">
                Nenhuma decisao global dominante nesta semana. Mantenha a leitura do funil e evite abrir escopo sem necessidade.
              </p>
            )}
          </div>

          {globalOperation.quickContext && (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Contexto rapido</p>
              <p className="mt-2 text-sm text-slate-700">{globalOperation.quickContext}</p>
            </div>
          )}

          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">Ignorar por enquanto</p>
            <ul className="mt-2 space-y-2 text-sm text-rose-900">
              {globalOperation.dontTouch.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Scorecard semanal</p>
              <p className="text-xs text-slate-500 mt-1">
                O que foi foco, o que mudou e qual prioridade segue agora.
              </p>
            </div>
            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getTrendClasses(globalWeeklyScorecard.change.status)}`}>
              {globalWeeklyScorecard.change.status}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Semana passada</p>
              {globalWeeklyScorecard.previousWeek ? (
                <div className="mt-2 space-y-2 text-slate-700">
                  <p><span className="font-semibold text-slate-900">{globalWeeklyScorecard.previousWeek.phaseLabel}</span> • {globalWeeklyScorecard.previousWeek.focus}</p>
                  <p>{globalWeeklyScorecard.previousWeek.action}</p>
                  <p className="font-semibold text-slate-900">
                    {globalWeeklyScorecard.previousWeek.kpiLabel}: {formatScorecardKpiValue(globalWeeklyScorecard.previousWeek.kpi, globalWeeklyScorecard.previousWeek.kpiValue)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-slate-700">Ainda nao existe registro da semana passada.</p>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Semana atual</p>
              {globalWeeklyScorecard.currentWeek ? (
                <div className="mt-2 space-y-2 text-slate-700">
                  <p><span className="font-semibold text-slate-900">{globalWeeklyScorecard.currentWeek.phaseLabel}</span> • {globalWeeklyScorecard.currentWeek.focus}</p>
                  <p>{globalWeeklyScorecard.currentWeek.action}</p>
                  <p className="font-semibold text-slate-900">
                    {globalWeeklyScorecard.currentWeek.kpiLabel}: {formatScorecardKpiValue(globalWeeklyScorecard.currentWeek.kpi, globalWeeklyScorecard.currentWeek.kpiValue)}
                  </p>
                  <p className="text-xs text-slate-500">Severidade atual: {globalWeeklyScorecard.currentWeek.severity}</p>
                </div>
              ) : (
                <p className="mt-2 text-slate-700">Ainda nao existe foco semanal registrado.</p>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Mudanca percebida</p>
              <div className="mt-2 space-y-2 text-slate-700">
                <p>{globalWeeklyScorecard.change.summary}</p>
                {globalWeeklyScorecard.currentWeek && (
                  <p className="font-semibold text-slate-900">
                    KPI observado: {globalWeeklyScorecard.currentWeek.kpiLabel}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Departamento v1.5</h3>
          <p className="text-sm text-gray-600 mt-1">
            Protocolo operacional da heuristica: status acionavel, rationale atual e leitura por versao.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Rationale atual</p>
              <p className="mt-1 text-xs text-slate-500">
                Versao {CURRENT_DEPARTMENT_MISSION_HEURISTIC_RATIONALE.version} • {CURRENT_DEPARTMENT_MISSION_HEURISTIC_RATIONALE.date}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {CURRENT_DEPARTMENT_MISSION_HEURISTIC_RATIONALE.changedWeights.map((weight) => (
                <span key={weight} className="rounded-full bg-white border border-slate-200 px-3 py-1 font-semibold text-slate-700">
                  {weight === 'none' ? 'sem ajuste de peso' : weight}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Por que mudou</p>
              <p className="mt-2 text-slate-700">{CURRENT_DEPARTMENT_MISSION_HEURISTIC_RATIONALE.rationale}</p>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Resultado esperado</p>
              <p className="mt-2 text-slate-700">{CURRENT_DEPARTMENT_MISSION_HEURISTIC_RATIONALE.expectedOutcome}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Recomendacoes</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{departmentDecisionSnapshot.totals.recommended}</p>
            <p className="mt-1 text-xs text-slate-500">Exibidas no Centro de Missao</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Aceites</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{departmentDecisionSnapshot.totals.accepted}</p>
            <p className="mt-1 text-xs text-slate-500">{formatRate(departmentDecisionSnapshot.totals.acceptanceRate)} de aceite</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Overrides</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{departmentDecisionSnapshot.totals.overridden}</p>
            <p className="mt-1 text-xs text-slate-500">{formatRate(departmentDecisionSnapshot.totals.overrideRate)} de override</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Versao observada</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {departmentDecisionSnapshot.heuristicVersions[departmentDecisionSnapshot.heuristicVersions.length - 1] || 'sem dados'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {departmentDecisionSnapshot.heuristicVersions.length > 1
                ? `${departmentDecisionSnapshot.heuristicVersions.length} versoes observadas`
                : 'Aguardando eventos do Departamento'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Janela de decisao</p>
              <p className="mt-1 text-xs text-slate-500">
                Compare a janela curta ({departmentDecisionSnapshot.windows.shortDays}d) com a media ({departmentDecisionSnapshot.windows.mediumDays}d) antes de mexer em peso.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white border border-slate-200 px-3 py-1 font-semibold text-slate-700">
                Min recs: {departmentDecisionSnapshot.windows.minRecommendedSample}
              </span>
              <span className="rounded-full bg-white border border-slate-200 px-3 py-1 font-semibold text-slate-700">
                Min acoes: {departmentDecisionSnapshot.windows.minDecisionSample}
              </span>
              <span className="rounded-full bg-white border border-slate-200 px-3 py-1 font-semibold text-slate-700">
                7d {formatRate(departmentDecisionSnapshot.totals.acceptanceRate7d)} aceite
              </span>
              <span className="rounded-full bg-white border border-slate-200 px-3 py-1 font-semibold text-slate-700">
                28d {formatRate(departmentDecisionSnapshot.totals.acceptanceRate28d)} aceite
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Versoes observadas</p>
            <p className="text-xs text-slate-500 mt-1">
              Compare performance por versao antes de concluir que um ajuste melhorou ou piorou a recomendacao.
            </p>
          </div>

          {departmentDecisionSnapshot.versions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {departmentDecisionSnapshot.versions.map((version) => (
                <div key={version.version} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">{version.version}</p>
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p>{version.recommended} recs</p>
                    <p>{formatRate(version.acceptanceRate)} aceite</p>
                    <p>{formatRate(version.overrideRate)} override</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Ainda nao ha versoes observadas o suficiente para comparacao.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Protocolo por decisionReasonCode</p>
              <p className="text-xs text-slate-500 mt-1">
                O status operacional define se vale agir, monitorar ou esperar mais evidencia.
              </p>
            </div>

            {departmentDecisionSnapshot.reasons.length > 0 ? (
              <div className="space-y-3">
                {departmentDecisionSnapshot.reasons.map((reason) => (
                  <div key={reason.code} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{reason.code}</p>
                        <p className="mt-1 text-xs text-slate-500">{reason.label}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Versoes: {reason.heuristicVersions.join(', ') || 'sem versao'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-white border border-slate-200 px-3 py-1 font-semibold text-slate-700">
                          {reason.recommended} recs
                        </span>
                        <span className={`rounded-full px-3 py-1 font-semibold ${
                          reason.sampleStatus === 'sufficient_sample'
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : 'bg-amber-50 border border-amber-200 text-amber-700'
                        }`}>
                          {reason.sampleStatus === 'sufficient_sample' ? 'amostra suficiente' : 'amostra insuficiente'}
                        </span>
                        <span className={`rounded-full px-3 py-1 font-semibold ${
                          reason.operationalStatus === 'candidate_for_adjustment'
                            ? 'bg-rose-50 border border-rose-200 text-rose-700'
                            : reason.operationalStatus === 'review_post_change'
                              ? 'bg-sky-50 border border-sky-200 text-sky-700'
                              : reason.operationalStatus === 'monitor'
                                ? 'bg-violet-50 border border-violet-200 text-violet-700'
                                : 'bg-slate-100 border border-slate-200 text-slate-700'
                        }`}>
                          {reason.operationalStatus === 'candidate_for_adjustment'
                            ? 'candidato a ajuste'
                            : reason.operationalStatus === 'review_post_change'
                              ? 'revisar pos-mudanca'
                              : reason.operationalStatus === 'monitor'
                                ? 'monitorar'
                                : 'nao agir'}
                        </span>
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 font-semibold text-emerald-700">
                          {formatRate(reason.acceptanceRate)} aceite
                        </span>
                        <span className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 font-semibold text-rose-700">
                          {formatRate(reason.overrideRate)} override
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
                      <div className="rounded-lg bg-white p-3 border border-slate-200">
                        <p className="uppercase tracking-[0.12em] text-slate-500">Acao operacional</p>
                        <p className="mt-2 text-slate-700">{reason.operationalSummary}</p>
                      </div>
                      <div className="rounded-lg bg-white p-3 border border-slate-200">
                        <p className="uppercase tracking-[0.12em] text-slate-500">Ultimos 7 dias</p>
                        <div className="mt-2 space-y-1">
                          <p className="font-semibold text-slate-900">{reason.recommended7d} recs</p>
                          <p>{formatRate(reason.acceptanceRate7d)} aceite</p>
                          <p>{formatRate(reason.overrideRate7d)} override</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-white p-3 border border-slate-200 md:col-span-2">
                        <p className="uppercase tracking-[0.12em] text-slate-500">Ultimos 28 dias</p>
                        <div className="mt-2 space-y-1">
                          <p className="font-semibold text-slate-900">{reason.recommended28d} recs</p>
                          <p>{formatRate(reason.acceptanceRate28d)} aceite</p>
                          <p>{formatRate(reason.overrideRate28d)} override</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Ainda nao ha eventos suficientes do Departamento para comparar motivos.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Disciplinas mais sobrescritas</p>
              <p className="text-xs text-slate-500 mt-1">
                Recomendacoes que mais perderam para outra escolha do usuario.
              </p>
            </div>

            {departmentDecisionSnapshot.topOverriddenRecommendations.length > 0 ? (
              <div className="space-y-3">
                {departmentDecisionSnapshot.topOverriddenRecommendations.map((item, index) => (
                  <div key={item.disciplineId} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{item.disciplineId}</p>
                        <p className="text-xs text-slate-500">{item.overrides} override(s) como recomendacao principal</p>
                        {item.lastReasonCode ? (
                          <p className="text-xs text-slate-600">
                            Ultimo motivo: <span className="font-semibold text-slate-900">{item.lastReasonCode}</span>
                          </p>
                        ) : null}
                        {item.heuristicVersions.length > 0 ? (
                          <p className="text-xs text-slate-500">Versoes: {item.heuristicVersions.join(', ')}</p>
                        ) : null}
                        {item.lastReasonLabel ? (
                          <p className="text-xs text-slate-500">{item.lastReasonLabel}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Nenhuma recomendacao sobrescrita ainda.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Funil do modo iniciante</h3>
          <p className="text-sm text-gray-600 mt-1">
            Snapshot local dos eventos para mostrar onde o fluxo esta quebrando.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Onboarding - sessao</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(beginnerFunnel.conversion.onboardingToSessionStart)}</p>
            <p className="mt-1 text-xs text-slate-500">{beginnerFunnel.counts.sessionStarted}/{beginnerFunnel.counts.onboardingCompleted}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Sessao concluida</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(beginnerFunnel.conversion.sessionStartToComplete)}</p>
            <p className="mt-1 text-xs text-slate-500">{beginnerFunnel.counts.sessionCompleted}/{beginnerFunnel.counts.sessionStarted}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Questoes concluidas</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(beginnerFunnel.conversion.questionsStartToComplete)}</p>
            <p className="mt-1 text-xs text-slate-500">{beginnerFunnel.counts.questionsCompleted}/{beginnerFunnel.counts.questionsStarted}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Retorno Dia 2</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{beginnerFunnel.counts.returnedNextDay}</p>
            <p className="mt-1 text-xs text-slate-500">KPI principal</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-800 mb-3">Leitura rapida</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
            <p>Missao vista: <span className="font-semibold text-slate-900">{beginnerFunnel.counts.missionViewed}</span></p>
            <p>Pos-sessao visto: <span className="font-semibold text-slate-900">{beginnerFunnel.counts.postSessionViewed}</span></p>
            <p>Proximo passo clicado: <span className="font-semibold text-slate-900">{beginnerFunnel.counts.nextStepClicked}</span></p>
            <p>Bloqueio acionado: <span className="font-semibold text-slate-900">{beginnerFunnel.counts.blockedFeatureClicked}</span></p>
            <p>Week Summary visto: <span className="font-semibold text-slate-900">{beginnerFunnel.counts.weekSummaryViewed}</span></p>
            <p>Week Summary concluido: <span className="font-semibold text-slate-900">{beginnerFunnel.counts.weekSummaryCompleted}</span></p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900 mb-2">Diagnostico automatico</p>
          {beginnerFunnel.diagnoses.length > 0 ? (
            <ul className="space-y-2 text-sm text-amber-900">
              {beginnerFunnel.diagnoses.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-amber-900">Sem alertas relevantes no snapshot atual.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Tabela de prioridade</h3>
          <p className="text-sm text-gray-600 mt-1">
            Transformacao direta de dado em hipotese, acao e KPI para decidir o que corrigir primeiro.
          </p>
        </div>

        <div className="space-y-3">
          {beginnerPriorities.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.stage}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.signal}</p>
                </div>
                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClasses(item.severity)}`}>
                  {item.severity}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Diagnostico</p>
                  <p className="mt-2 text-slate-700">{item.diagnosis}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Acao recomendada</p>
                  <p className="mt-2 text-slate-700">{item.action}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">KPI afetado</p>
                  <p className="mt-2 font-semibold text-slate-900">{item.kpi}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Prioridade pratica</p>
                  <p className="mt-2 text-slate-700">
                    {item.severity === 'Critica' || item.severity === 'Alta'
                      ? 'Corrigir antes de expandir produto.'
                      : item.severity === 'Media'
                        ? 'Entrar no proximo ciclo de ajuste.'
                        : 'So monitorar por enquanto.'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Top 3 para corrigir esta semana</h3>
          <p className="text-sm text-gray-600 mt-1">
            Foco semanal direto para evitar dispersao e atacar primeiro o que mais impacta o funil.
          </p>
        </div>

        {topBeginnerPriorities.some((item) => item.severity !== 'Baixa') ? (
          <div className="space-y-3">
            {topBeginnerPriorities.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.stage}</p>
                      <p className="text-xs text-slate-500">{item.signal}</p>
                    </div>
                  </div>
                  <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClasses(item.severity)}`}>
                    {item.severity}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Problema</p>
                    <p className="mt-2 text-slate-700">{item.diagnosis}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Acao</p>
                    <p className="mt-2 text-slate-700">{item.action}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">KPI</p>
                    <p className="mt-2 font-semibold text-slate-900">{item.kpi}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Nenhum ponto critico esta semana.</p>
            <p className="mt-1 text-sm text-emerald-800">
              Continue monitorando o funil e rode novos testes antes de abrir novas frentes.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Modo Operacao</h3>
          <p className="text-sm text-gray-600 mt-1">
            Uma decisao clara para a semana e um limite explicito do que nao mexer agora.
          </p>
        </div>

        {beginnerOperation.weeklyDecision ? (
          <>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">Decisao da semana</p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Foco</p>
                  <p className="mt-2 font-semibold text-slate-900">{beginnerOperation.weeklyDecision.focus}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Hipotese</p>
                  <p className="mt-2 text-slate-700">{beginnerOperation.weeklyDecision.hypothesis}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Acao</p>
                  <p className="mt-2 text-slate-700">{beginnerOperation.weeklyDecision.action}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">KPI</p>
                  <p className="mt-2 font-semibold text-slate-900">{beginnerOperation.weeklyDecision.kpi}</p>
                </div>
              </div>
            </div>

            {beginnerOperation.quickContext && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Contexto rapido</p>
                <p className="mt-2 text-sm text-slate-700">{beginnerOperation.quickContext}</p>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Nenhuma urgencia dominante nesta semana.</p>
            <p className="mt-1 text-sm text-emerald-800">
              Continue monitorando o funil, rode novos testes e evite abrir novas frentes sem necessidade.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">O que nao mexer agora</p>
          <ul className="mt-3 space-y-2 text-sm text-rose-900">
            {beginnerOperation.dontTouch.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Autonomia guiada • Intermediario</h3>
          <p className="text-sm text-gray-600 mt-1">
            KPIs e alertas para validar se o usuario ganhou liberdade sem perder direcao.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Continuar automatico</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(intermediateSnapshot.conversion.continueAutomaticRate)}</p>
            <p className="mt-1 text-xs text-slate-500">{intermediateSnapshot.counts.continueAutomaticClicked}/{intermediateSnapshot.counts.homeViewed}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Ajuste leve</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(intermediateSnapshot.conversion.adjustLightRate)}</p>
            <p className="mt-1 text-xs text-slate-500">{intermediateSnapshot.counts.adjustLightClicked}/{intermediateSnapshot.counts.homeViewed}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Plano do dia concluido</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(intermediateSnapshot.conversion.dayPlanCompletionRate)}</p>
            <p className="mt-1 text-xs text-slate-500">{intermediateSnapshot.counts.dayPlanCompleted}/{intermediateSnapshot.counts.planViewed}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Ferramenta recomendada usada</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(intermediateSnapshot.conversion.recommendedToolUsageRate)}</p>
            <p className="mt-1 text-xs text-slate-500">{intermediateSnapshot.counts.recommendedToolUsed}/{intermediateSnapshot.counts.planViewed}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Retorno no dia seguinte</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(intermediateSnapshot.conversion.nextDayReturnRate)}</p>
            <p className="mt-1 text-xs text-slate-500">{intermediateSnapshot.counts.returnedNextDay}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Bounce de ferramenta</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(intermediateSnapshot.conversion.toolBounceRate)}</p>
            <p className="mt-1 text-xs text-slate-500">{intermediateSnapshot.counts.toolBounced} bounce(s)</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-800 mb-3">Leitura rapida</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
            <p>Home vista: <span className="font-semibold text-slate-900">{intermediateSnapshot.counts.homeViewed}</span></p>
            <p>Plano visto: <span className="font-semibold text-slate-900">{intermediateSnapshot.counts.planViewed}</span></p>
            <p>Escolha manual: <span className="font-semibold text-slate-900">{intermediateSnapshot.counts.manualChoiceMade}</span></p>
            <p>Metodos abertos: <span className="font-semibold text-slate-900">{intermediateSnapshot.counts.methodOpened}</span></p>
            <p>Cronograma aberto: <span className="font-semibold text-slate-900">{intermediateSnapshot.counts.scheduleOpened}</span></p>
            <p>Questoes abertas: <span className="font-semibold text-slate-900">{intermediateSnapshot.counts.questionsOpened}</span></p>
            <p>Choice abandoned: <span className="font-semibold text-slate-900">{intermediateSnapshot.counts.choiceAbandoned}</span></p>
            <p>Overload signal: <span className="font-semibold text-slate-900">{intermediateSnapshot.counts.overloadSignal}</span></p>
          </div>
        </div>

        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
          <p className="text-sm font-semibold text-cyan-900 mb-2">Alertas de autonomia guiada</p>
          {intermediateSnapshot.diagnoses.length > 0 ? (
            <ul className="space-y-2 text-sm text-cyan-900">
              {intermediateSnapshot.diagnoses.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-cyan-900">Sem alertas relevantes no intermediario por enquanto.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Prioridade do intermediario</h3>
          <p className="text-sm text-gray-600 mt-1">
            Leitura enxuta para mostrar onde a autonomia guiada esta quebrando primeiro.
          </p>
        </div>

        <div className="space-y-3">
          {intermediatePriorities.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.stage}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.signal}</p>
                </div>
                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClasses(item.severity)}`}>
                  {item.severity}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Diagnostico</p>
                  <p className="mt-2 text-slate-700">{item.diagnosis}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Acao recomendada</p>
                  <p className="mt-2 text-slate-700">{item.action}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">KPI afetado</p>
                  <p className="mt-2 font-semibold text-slate-900">{item.kpi}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Leitura pratica</p>
                  <p className="mt-2 text-slate-700">
                    {item.severity === 'Critica' || item.severity === 'Alta'
                      ? 'Ajustar antes de abrir mais liberdade.'
                      : item.severity === 'Media'
                        ? 'Entrar no proximo ciclo de refinamento.'
                        : 'So monitorar por enquanto.'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Top 3 do intermediario para esta semana</h3>
          <p className="text-sm text-gray-600 mt-1">
            Recomendacoes diretas para ajustar autonomia guiada sem abrir frentes demais.
          </p>
        </div>

        {topIntermediatePriorities.some((item) => item.severity !== 'Baixa') ? (
          <div className="space-y-3">
            {topIntermediatePriorities.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.stage}</p>
                      <p className="text-xs text-slate-500">{item.signal}</p>
                    </div>
                  </div>
                  <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClasses(item.severity)}`}>
                    {item.severity}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Problema</p>
                    <p className="mt-2 text-slate-700">{item.diagnosis}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Acao</p>
                    <p className="mt-2 text-slate-700">{item.action}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">KPI</p>
                    <p className="mt-2 font-semibold text-slate-900">{item.kpi}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Nenhum ponto urgente no intermediario esta semana.</p>
            <p className="mt-1 text-sm text-emerald-800">
              Continue monitorando a autonomia guiada antes de abrir novas camadas de liberdade.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Modo Operacao do intermediario</h3>
          <p className="text-sm text-gray-600 mt-1">
            Uma recomendacao clara para a semana e um limite explicito do que nao expandir agora.
          </p>
        </div>

        {intermediateOperation.weeklyDecision ? (
          <>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">Decisao da semana</p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Foco</p>
                  <p className="mt-2 font-semibold text-slate-900">{intermediateOperation.weeklyDecision.focus}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Hipotese</p>
                  <p className="mt-2 text-slate-700">{intermediateOperation.weeklyDecision.hypothesis}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Acao</p>
                  <p className="mt-2 text-slate-700">{intermediateOperation.weeklyDecision.action}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">KPI</p>
                  <p className="mt-2 font-semibold text-slate-900">{intermediateOperation.weeklyDecision.kpi}</p>
                </div>
              </div>
            </div>

            {intermediateOperation.quickContext && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Contexto rapido</p>
                <p className="mt-2 text-sm text-slate-700">{intermediateOperation.quickContext}</p>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Nenhuma correcao dominante no intermediario nesta semana.</p>
            <p className="mt-1 text-sm text-emerald-800">
              Mantenha o foco na leitura dos KPIs e evite abrir mais liberdade sem necessidade.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">O que nao mexer agora</p>
          <ul className="mt-3 space-y-2 text-sm text-rose-900">
            {intermediateOperation.dontTouch.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Controle estrategico • Avancado</h3>
          <p className="text-sm text-gray-600 mt-1">
            Leitura minima para validar se autonomia alta esta virando execucao, consistencia e estrategia aplicada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Execucao do plano</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(advancedSnapshot.planExecutionRate)}</p>
            <p className="mt-1 text-xs text-slate-500">controle virando execucao</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Consistencia semanal</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(advancedSnapshot.weeklyConsistencyRate)}</p>
            <p className="mt-1 text-xs text-slate-500">ritmo sob maior autonomia</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Planejamento sem execucao</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(advancedSnapshot.planningWithoutExecutionRate)}</p>
            <p className="mt-1 text-xs text-slate-500">principal risco da fase</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Fragmentacao por ferramentas</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(advancedSnapshot.toolFragmentationRate)}</p>
            <p className="mt-1 text-xs text-slate-500">dispersao vs fluxo estrategico</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Revisao aplicada</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(advancedSnapshot.strategicReviewApplyRate)}</p>
            <p className="mt-1 text-xs text-slate-500">analise virando ajuste</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Conclusao de simulados</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatRate(advancedSnapshot.mockCompletionRate)}</p>
            <p className="mt-1 text-xs text-slate-500">pratica estrategica completa</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Prioridade do avancado</h3>
          <p className="text-sm text-gray-600 mt-1">
            Sinais de estrategia para mostrar onde controle alto ainda nao esta virando resultado real.
          </p>
        </div>

        <div className="space-y-3">
          {advancedPriorities.map((item) => (
            <div key={`${item.stage}-${item.kpi}`} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.stage}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.problem}</p>
                </div>
                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClasses(item.severity)}`}>
                  {item.severity}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Leitura</p>
                  <p className="mt-2 text-slate-700">{item.diagnosis}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Ajuste recomendado</p>
                  <p className="mt-2 text-slate-700">{item.recommendedAction}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">KPI central</p>
                  <p className="mt-2 font-semibold text-slate-900">{item.kpi}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Categoria</p>
                  <p className="mt-2 text-slate-700">{item.category}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Top 3 do avancado para esta semana</h3>
          <p className="text-sm text-gray-600 mt-1">
            Ajustes mais relevantes para manter controle estrategico sem cair em overthinking.
          </p>
        </div>

        {topAdvancedPriorities.some((item) => item.severity !== 'Baixa') ? (
          <div className="space-y-3">
            {topAdvancedPriorities.map((item, index) => (
              <div key={`${item.stage}-${item.kpi}`} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.stage}</p>
                      <p className="text-xs text-slate-500">{item.problem}</p>
                    </div>
                  </div>
                  <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClasses(item.severity)}`}>
                    {item.severity}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Sinal de estrategia</p>
                    <p className="mt-2 text-slate-700">{item.diagnosis}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Ajuste</p>
                    <p className="mt-2 text-slate-700">{item.recommendedAction}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">KPI</p>
                    <p className="mt-2 font-semibold text-slate-900">{item.kpi}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Nenhum ajuste dominante no avancado esta semana.</p>
            <p className="mt-1 text-sm text-emerald-800">
              Continue observando execucao, consistencia e estrategia aplicada antes de expandir a fase.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Modo Operacao do avancado</h3>
          <p className="text-sm text-gray-600 mt-1">
            Uma leitura estrategica clara para a semana e um limite explicito do que nao expandir agora.
          </p>
        </div>

        {advancedOperation.weeklyDecision ? (
          <>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">Ajuste da semana</p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Foco</p>
                  <p className="mt-2 font-semibold text-slate-900">{advancedOperation.weeklyDecision.focus}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Hipotese</p>
                  <p className="mt-2 text-slate-700">{advancedOperation.weeklyDecision.hypothesis}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Acao</p>
                  <p className="mt-2 text-slate-700">{advancedOperation.weeklyDecision.action}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">KPI</p>
                  <p className="mt-2 font-semibold text-slate-900">{advancedOperation.weeklyDecision.kpi}</p>
                </div>
              </div>
            </div>

            {advancedOperation.quickContext && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Contexto estrategico</p>
                <p className="mt-2 text-sm text-slate-700">{advancedOperation.quickContext}</p>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Nenhum ajuste dominante no avancado nesta semana.</p>
            <p className="mt-1 text-sm text-emerald-800">
              Mantenha a observacao dos sinais de execucao e evite aumentar complexidade sem necessidade.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">O que nao mexer agora</p>
          <ul className="mt-3 space-y-2 text-sm text-rose-900">
            {advancedOperation.dontChangeNow.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Scorecard semanal do avancado</h3>
          <p className="text-sm text-gray-600 mt-1">
            Memoria operacional para ver se o ajuste estrategico da fase realmente mudou o comportamento.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Mudanca percebida</p>
              <p className="text-xs text-slate-500 mt-1">
                O que foi foco, o que mudou e se a estrategia ficou melhor ou pior.
              </p>
            </div>
            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getAdvancedTrendClasses(advancedWeeklyScorecard.change)}`}>
              {advancedWeeklyScorecard.change}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Semana passada</p>
              {advancedWeeklyScorecard.previousWeek ? (
                <div className="mt-2 space-y-2 text-slate-700">
                  <p className="font-semibold text-slate-900">{advancedWeeklyScorecard.previousWeek.focus}</p>
                  <p>KPI: {advancedWeeklyScorecard.previousWeek.kpi}</p>
                  <p>Valor: {formatRate(advancedWeeklyScorecard.previousWeek.value)}</p>
                  <p className="text-xs text-slate-500">Severidade: {advancedWeeklyScorecard.previousWeek.severity}</p>
                </div>
              ) : (
                <p className="mt-2 text-slate-700">Ainda nao existe registro da semana passada.</p>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Semana atual</p>
              {advancedWeeklyScorecard.currentWeek ? (
                <div className="mt-2 space-y-2 text-slate-700">
                  <p className="font-semibold text-slate-900">{advancedWeeklyScorecard.currentWeek.focus}</p>
                  <p>KPI: {advancedWeeklyScorecard.currentWeek.kpi}</p>
                  <p>Valor: {formatRate(advancedWeeklyScorecard.currentWeek.value)}</p>
                  <p className="text-xs text-slate-500">Severidade: {advancedWeeklyScorecard.currentWeek.severity}</p>
                </div>
              ) : (
                <p className="mt-2 text-slate-700">Ainda nao existe foco semanal registrado no avancado.</p>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Leitura rapida</p>
              <div className="mt-2 space-y-2 text-slate-700">
                <p>{advancedWeeklyScorecard.summary}</p>
                {advancedWeeklyScorecard.currentWeek && (
                  <p className="font-semibold text-slate-900">
                    KPI observado: {advancedWeeklyScorecard.currentWeek.kpi}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Download size={20} style={primaryStyle} />
          Exportar Dados
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          Faça backup de todos os seus dados em um arquivo JSON.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 py-3 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={primaryBgStyle}
          >
            <Download size={18} />
            Download JSON
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Upload size={20} style={secondaryStyle} />
          Importar Dados
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          Restaure seus dados a partir de um backup anterior.
        </p>
        
        <div className="space-y-4">
          <textarea
            value={importJson}
            onChange={(e) => {
              setImportJson(e.target.value);
              setError('');
            }}
            placeholder="Cole aqui o JSON exportado..."
            className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 font-mono text-sm"
            style={secondaryRingStyle}
          />
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
               {error}
            </div>
          )}

          <button
            onClick={handleImport}
            className="w-full py-3 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={secondaryBgStyle}
          >
            <Upload size={18} />
            Importar Dados
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6">
        <h3 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
          <Trash2 size={20} />
          Zona de Perigo
        </h3>
        <p className="text-red-600 mb-4 text-sm">
          Esta ação é irreversível. Todos os seus dados serão apagados permanentemente.
        </p>
        <button
          onClick={() => setShowClearModal(true)}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <Trash2 size={18} />
          Apagar Todos os Dados
        </button>

        <ConfirmModal
          open={showClearModal}
          title="Apagar Todos os Dados"
          message="Esta ação é irreversível. Todos os seus dados serão apagados permanentemente."
          confirmLabel="Apagar Tudo"
          variant="danger"
          onConfirm={() => {
            onClear();
            setShowClearModal(false);
            toast.success('Dados apagados.');
          }}
          onCancel={() => setShowClearModal(false)}
        />
      </div>

      {/* Info */}
      <div className="border rounded-lg p-4 text-sm" style={{ ...primarySoftStyle, color: 'var(--color-primary)' }}>
        <p className="font-semibold mb-2"> Informações sobre Dados</p>
        <ul className="space-y-1 text-xs">
          <li>• Seus dados são salvos localmente no seu navegador</li>
          <li>• Exporte regularmente para não perder informações</li>
          <li>• Use a importação para restaurar dados em outro dispositivo ou navegador</li>
          <li>• Última atualização: {new Date(data.exportedAt).toLocaleString('pt-BR')}</li>
        </ul>
      </div>
    </div>
  );
};
