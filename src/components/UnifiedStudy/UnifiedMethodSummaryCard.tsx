import React from 'react';
import { ModeSelector } from '../Timer/ModeSelector';
import { normalizeBlockLabel, truncatePresentationLabel } from '../../utils/uiLabels';

type StudyMode = 'pomodoro' | 'livre';

interface UnifiedMethodSummaryCardProps {
  currentMode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  activeStudyMethodName: string;
  weeklyGoalMinutes: number;
  currentBlockLabel: string;
}

export const UnifiedMethodSummaryCard: React.FC<UnifiedMethodSummaryCardProps> = ({
  currentMode,
  onModeChange,
  activeStudyMethodName,
  weeklyGoalMinutes,
  currentBlockLabel,
}) => {
  const safeCurrentBlockLabel = normalizeBlockLabel(currentBlockLabel);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        Resumo do plano atual
      </p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Use este resumo para decidir sem quebrar o ritmo da execucao atual.
      </p>
      <div className="mt-4">
        <ModeSelector currentMode={currentMode} onModeChange={onModeChange} />
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
          <span>Metodo</span>
          <span>{activeStudyMethodName}</span>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Meta semanal: {(weeklyGoalMinutes / 60).toFixed(1)} h
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          <span title={safeCurrentBlockLabel}>
            Foco atual: {truncatePresentationLabel(safeCurrentBlockLabel, 26, safeCurrentBlockLabel)}
          </span>
        </p>
      </div>
    </div>
  );
};

export default UnifiedMethodSummaryCard;
