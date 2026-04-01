import React from 'react';
import { FileText, NotebookPen } from 'lucide-react';
import type { FinishInputs, FinishPayload } from '../types';

interface SessionInputsProps {
  darkMode?: boolean;
  values: FinishInputs;
  onChange: (partial: Partial<FinishInputs>) => void;
  onFinish?: (payload?: FinishPayload) => void;
  loading?: boolean;
  finishEnabled?: boolean;
  finishDisabledReason?: string;
  embedded?: boolean;
  hideHeader?: boolean;
}

export const SessionInputs: React.FC<SessionInputsProps> = ({
  darkMode = false,
  values,
  onChange,
  onFinish,
  loading = false,
  finishEnabled = true,
  finishDisabledReason = 'Conclua o bloco no timer antes de fechar este registro.',
  embedded = false,
  hideHeader = false,
}) => {
  const isDisabled = loading || !finishEnabled;
  const containerClass = embedded
    ? darkMode
      ? 'border-slate-800/90 bg-slate-950/36 shadow-none'
      : 'border-slate-200/80 bg-white/52 shadow-none'
    : darkMode
      ? 'border-slate-800 bg-slate-950/92 shadow-[0_18px_36px_rgba(2,6,23,0.45)]'
      : 'border-slate-300/85 bg-[linear-gradient(180deg,rgba(226,234,242,0.98)_0%,rgba(216,226,236,0.97)_100%)] shadow-[0_18px_36px_rgba(100,116,139,0.18)]';

  return (
    <section className={`rounded-[24px] border p-4 ${containerClass}`}>
      {!hideHeader ? (
        <>
          <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
            <NotebookPen className="h-4 w-4 text-cyan-500" />
            Fechamento da sessao
          </div>
          <p className={`mt-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {finishEnabled
              ? 'Capture paginas, aulas e notas do bloco concluido. O fechamento agora alimenta a fila central de revisao.'
              : finishDisabledReason}
          </p>
        </>
      ) : null}

      <div className={`${hideHeader ? '' : 'mt-4'} space-y-3`}>
        <label className="block">
          <span className={`mb-1 block text-xs font-semibold uppercase tracking-[0.14em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Paginas</span>
          <input
            type="number"
            min={0}
            value={values.pages}
            onChange={(event) => onChange({ pages: Number(event.target.value) || 0 })}
            placeholder="Paginas estudadas"
            className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition focus:border-cyan-300 ${
              darkMode
                ? 'border-slate-700 bg-slate-900 text-slate-100 focus:bg-slate-900'
                : 'border-slate-300/85 bg-slate-200/86 text-slate-900 focus:bg-slate-100'
            }`}
          />
        </label>

        <label className="block">
          <span className={`mb-1 block text-xs font-semibold uppercase tracking-[0.14em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Aulas</span>
          <input
            type="number"
            min={0}
            value={values.lessons}
            onChange={(event) => onChange({ lessons: Number(event.target.value) || 0 })}
            placeholder="Aulas ou videos"
            className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition focus:border-cyan-300 ${
              darkMode
                ? 'border-slate-700 bg-slate-900 text-slate-100 focus:bg-slate-900'
                : 'border-slate-300/85 bg-slate-200/86 text-slate-900 focus:bg-slate-100'
            }`}
          />
        </label>

        <label className="block">
          <span className={`mb-1 block text-xs font-semibold uppercase tracking-[0.14em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Notas</span>
          <textarea
            value={values.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder="Notas rapidas da sessao..."
            rows={4}
            className={`w-full resize-none rounded-2xl border px-3 py-2.5 text-sm outline-none transition focus:border-cyan-300 ${
              darkMode
                ? 'border-slate-700 bg-slate-900 text-slate-100 focus:bg-slate-900'
                : 'border-slate-300/85 bg-slate-200/86 text-slate-900 focus:bg-slate-100'
            }`}
          />
        </label>

        <label className="block">
          <span className={`mb-1 block text-xs font-semibold uppercase tracking-[0.14em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Dificuldade percebida</span>
          <select
            value={values.difficulty}
            onChange={(event) => onChange({ difficulty: Number(event.target.value) as 1 | 2 | 3 | 4 | 5 })}
            className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition focus:border-cyan-300 ${
              darkMode
                ? 'border-slate-700 bg-slate-900 text-slate-100 focus:bg-slate-900'
                : 'border-slate-300/85 bg-slate-200/86 text-slate-900 focus:bg-slate-100'
            }`}
          >
            <option value={1}>1 · Muito facil</option>
            <option value={2}>2 · Facil</option>
            <option value={3}>3 · Moderada</option>
            <option value={4}>4 · Dificil</option>
            <option value={5}>5 · Muito dificil</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={() => !isDisabled && onFinish?.({
          pages: values.pages,
          lessons: values.lessons,
          notes: values.notes,
          difficulty: values.difficulty,
        })}
        disabled={isDisabled}
        data-testid="study-finish-submit-button"
        className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          embedded
            ? darkMode
              ? 'border-slate-700 bg-slate-900 text-white hover:bg-slate-800'
              : 'border-slate-300/85 bg-slate-900 text-white hover:bg-slate-800'
            : 'border-slate-200 bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        <FileText className="h-4 w-4" />
        {loading ? 'Salvando...' : finishEnabled ? 'Confirmar fechamento' : 'Conclua o timer primeiro'}
      </button>
    </section>
  );
};

export default SessionInputs;
