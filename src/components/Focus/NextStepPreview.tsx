import React from 'react';
import {
  ArrowRight,
  Brain,
  BookOpen,
  Calculator,
  GitBranch,
  Microscope,
  Sparkles,
} from 'lucide-react';
import type { StudyTrackLabel } from '../../utils/disciplineLabels';
import { normalizeBlockLabel, truncatePresentationLabel } from '../../utils/uiLabels';

interface NextStepPreviewProps {
  darkMode?: boolean;
  currentBlockLabel: string;
  currentObjective: string;
  currentMethodName: string;
  currentTargetQuestions: number;
  weeklyGoalMinutes: number;
  suggestedTopicCopy?: string;
  preferredStudyTrack: StudyTrackLabel;
  hybridEnemWeight: number;
  hybridConcursoWeight: number;
}

const TRACK_GUIDES: Record<
  StudyTrackLabel,
  { title: string; items: string[]; icon: React.ComponentType<{ className?: string }> }
> = {
  enem: {
    title: 'Metodo para ENEM',
    icon: Calculator,
    items: [
      'Estude por competencia e contexto, nao por materia solta.',
      'Mantenha redacao e leitura de prova no ciclo semanal.',
      'Feche o bloco com pratica antes de abrir outra frente.',
    ],
  },
  concursos: {
    title: 'Metodo para Concurso',
    icon: BookOpen,
    items: [
      'Direcione o estudo pelo edital e pela banca ativa.',
      'Use a teoria so para sustentar a pratica objetiva.',
      'Revise cedo os assuntos abaixo de 80% de acerto.',
    ],
  },
  hibrido: {
    title: 'Metodo hibrido',
    icon: GitBranch,
    items: [
      'Distribuicao dinamica entre trilha principal e secundaria.',
      'Nenhuma frente zera: o motor rebalanceia conforme o peso ativo.',
      'Interpretacao e tecnica de banca convivem no mesmo ciclo.',
    ],
  },
};

export const NextStepPreview: React.FC<NextStepPreviewProps> = ({
  darkMode = false,
  currentBlockLabel,
  currentObjective,
  currentMethodName,
  currentTargetQuestions,
  weeklyGoalMinutes,
  suggestedTopicCopy,
  preferredStudyTrack,
  hybridEnemWeight,
  hybridConcursoWeight,
}) => {
  const guide = TRACK_GUIDES[preferredStudyTrack];
  const GuideIcon = guide.icon;
  const safeCurrentBlockLabel = normalizeBlockLabel(currentBlockLabel);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[30px] border border-violet-200/70 bg-[linear-gradient(145deg,#312e81_0%,#1e1b4b_42%,#0f172a_100%)] p-6 text-white shadow-[0_22px_45px_rgba(49,46,129,0.22)]">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-white/82">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            Depois do foco
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            proximo passo
          </span>
        </div>
        <div className="mt-4 text-[22px] font-semibold leading-snug">
          {currentTargetQuestions > 0
            ? `${currentTargetQuestions} questoes entram logo depois deste bloco.`
            : 'Quando o bloco fechar, o fluxo continua para a proxima sessao.'}
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/8 p-4 text-sm text-white/78">
          <p className="truncate font-semibold text-white" title={safeCurrentBlockLabel}>
            {truncatePresentationLabel(safeCurrentBlockLabel, 28, safeCurrentBlockLabel)}
          </p>
          <p className="mt-2">{currentObjective}</p>
          {suggestedTopicCopy ? <p className="mt-2 text-white/64">{suggestedTopicCopy}</p> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-white/80">
          <span className="rounded-full bg-white/10 px-3 py-1.5">{currentMethodName}</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5">{weeklyGoalMinutes} min/semana</span>
          {preferredStudyTrack === 'hibrido' ? (
            <span className="rounded-full bg-white/10 px-3 py-1.5">
              {hybridEnemWeight}% ENEM / {hybridConcursoWeight}% Concurso
            </span>
          ) : null}
        </div>
      </div>

      <div className={`rounded-[30px] border p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] ${
        darkMode
          ? 'border-slate-800 bg-slate-950/92 shadow-[0_18px_40px_rgba(2,6,23,0.45)]'
          : 'border-slate-200/85 bg-[linear-gradient(180deg,rgba(244,247,251,0.98)_0%,rgba(236,242,248,0.96)_100%)] shadow-[0_18px_40px_rgba(148,163,184,0.18)]'
      }`}>
        <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <GuideIcon className="h-4 w-4 text-cyan-500" />
          {guide.title}
        </div>
        <div className="mt-4 space-y-3">
          {guide.items.map((item) => (
            <div
              key={item}
              className={`rounded-2xl border px-4 py-3 text-sm ${
                darkMode
                  ? 'border-slate-800 bg-slate-900/72 text-slate-200'
                  : 'border-slate-200/80 bg-slate-100/76 text-slate-700'
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-[24px] border px-5 py-4 shadow-[0_18px_35px_rgba(15,23,42,0.08)] ${
        darkMode
          ? 'border-slate-800 bg-[linear-gradient(135deg,#111827_0%,#0f172a_100%)]'
          : 'border-slate-200/85 bg-[linear-gradient(135deg,rgba(244,247,251,0.98)_0%,rgba(236,242,248,0.96)_100%)] shadow-[0_18px_35px_rgba(148,163,184,0.18)]'
      }`}>
        <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-white/70' : 'text-slate-500'}`}>
          <Brain className="h-4 w-4 text-cyan-500" />
          Sistema adaptativo
        </div>
        <p className={`mt-3 text-sm ${darkMode ? 'text-white/78' : 'text-slate-700'}`}>
          A regra continua ativa: abaixo de 60% revisa em 24h, entre 60% e 80% revisa em 7 dias, acima de 80% revisa em 30 dias.
        </p>
        <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
          darkMode
            ? 'bg-white/10 text-white/80'
            : 'bg-white/58 text-slate-700 backdrop-blur-sm'
        }`}>
          <Microscope className="h-3.5 w-3.5" />
          Inteligencia acompanhando desempenho e retencao
        </div>
      </div>
    </div>
  );
};

export default NextStepPreview;
