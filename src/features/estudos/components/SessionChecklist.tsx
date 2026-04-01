import React from 'react';
import { CheckCircle2, Circle, Clock3, ListChecks } from 'lucide-react';

interface SessionChecklistProps {
  darkMode?: boolean;
  isBlocked: boolean;
  showQuestionTransitionState: boolean;
  showPostFocusState: boolean;
  currentTargetQuestions: number;
}

interface ChecklistItem {
  label: string;
  detail: string;
  checked: boolean;
}

export const SessionChecklist: React.FC<SessionChecklistProps> = ({
  darkMode = false,
  isBlocked,
  showQuestionTransitionState,
  showPostFocusState,
  currentTargetQuestions,
}) => {
  const items: ChecklistItem[] = [
    {
      label: 'Foco',
      detail: isBlocked ? 'Ajuste o plano antes de iniciar.' : 'Bloco principal pronto para executar.',
      checked: !isBlocked,
    },
    {
      label: 'Exercicios',
      detail: `${currentTargetQuestions} questoes previstas para validar a sessao.`,
      checked: showQuestionTransitionState || showPostFocusState,
    },
    {
      label: 'Revisao',
      detail: showPostFocusState ? 'Sessao concluida, pronto para fechar o ciclo.' : 'Entra depois da execucao.',
      checked: showPostFocusState,
    },
  ];

  return (
      <section className={`rounded-[28px] border p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)] ${
      darkMode
        ? 'border-slate-800 bg-slate-950/92 shadow-[0_18px_36px_rgba(2,6,23,0.45)]'
        : 'border-slate-300/85 bg-[linear-gradient(180deg,rgba(226,234,242,0.98)_0%,rgba(216,226,236,0.97)_100%)] shadow-[0_18px_36px_rgba(100,116,139,0.18)]'
    }`}>
      <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
        <ListChecks className="h-4 w-4 text-cyan-500" />
        Etapas do estudo
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
              darkMode ? 'border-slate-800 bg-slate-900/72' : 'border-slate-300/85 bg-slate-200/82'
            }`}
          >
            <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full ${
              item.checked
                ? darkMode ? 'bg-emerald-950/40 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                : darkMode ? 'bg-slate-950 text-slate-500' : 'bg-slate-50 text-slate-500'
            }`}>
              {item.checked ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{item.label}</p>
              <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        darkMode
          ? 'border-slate-700 bg-slate-900 text-slate-300'
          : 'border-slate-300/85 bg-slate-200/82 text-slate-700'
      }`}>
        <Clock3 className="h-3.5 w-3.5 text-violet-500" />
        Loop preparado para fase B
      </div>
    </section>
  );
};

export default SessionChecklist;
