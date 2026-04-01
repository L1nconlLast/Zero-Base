import React from 'react';
import { BookOpen, Compass, GitBranch, RotateCcw } from 'lucide-react';

import type { OutrosOverviewPlanStateSnapshot } from '../../../services/outrosDashboard.service';
import { OutrosOverviewCard } from './OutrosOverviewCard';

interface OutrosOverviewPlanStateProps {
  darkMode?: boolean;
  data: OutrosOverviewPlanStateSnapshot;
}

const Row: React.FC<{
  darkMode: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}> = ({ darkMode, icon, label, value, detail }) => (
  <div className={`rounded-2xl border p-4 ${
    darkMode ? 'border-slate-800/80 bg-slate-900/80' : 'border-slate-200/80 bg-slate-50/88'
  }`}>
    <div className="flex items-center gap-2">
      {icon}
      <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
        darkMode ? 'text-slate-400' : 'text-slate-500'
      }`}>
        {label}
      </span>
    </div>
    <p className={`mt-2 text-sm font-semibold ${
      darkMode ? 'text-slate-100' : 'text-slate-900'
    }`}>
      {value}
    </p>
    <p className={`mt-2 text-sm leading-6 ${
      darkMode ? 'text-slate-300' : 'text-slate-600'
    }`}>
      {detail}
    </p>
  </div>
);

export const OutrosOverviewPlanState: React.FC<OutrosOverviewPlanStateProps> = ({
  darkMode = false,
  data,
}) => (
  <OutrosOverviewCard
    darkMode={darkMode}
    title="Estado do plano"
    description="Tema, objetivo, trilha, progresso e proxima revisao sem poluir a leitura."
    badge={data.progressPercent !== null ? `${data.progressPercent}%` : 'setup'}
  >
    <div className="grid gap-3">
      <Row
        darkMode={darkMode}
        icon={<Compass className={`h-4 w-4 ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`} />}
        label="Tema ativo"
        value={data.topicLabel}
        detail={data.topicDetail}
      />
      <Row
        darkMode={darkMode}
        icon={<BookOpen className={`h-4 w-4 ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`} />}
        label="Objetivo ativo"
        value={data.goalLabel}
        detail={data.goalDetail}
      />
      <Row
        darkMode={darkMode}
        icon={<GitBranch className={`h-4 w-4 ${darkMode ? 'text-amber-300' : 'text-amber-700'}`} />}
        label="Trilha atual"
        value={data.pathLabel}
        detail={data.pathDetail}
      />
      <Row
        darkMode={darkMode}
        icon={<RotateCcw className={`h-4 w-4 ${darkMode ? 'text-violet-300' : 'text-violet-700'}`} />}
        label="Proxima revisao"
        value={data.nextReviewLabel}
        detail={data.nextReviewDetail}
      />
    </div>
  </OutrosOverviewCard>
);

export default OutrosOverviewPlanState;
