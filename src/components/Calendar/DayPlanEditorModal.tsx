import React, { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Weekday, WeeklyDayPlan } from '../../types';
import { getSuggestedFrontBySubjectLabel } from '../../utils/contentTree';

interface DayPlanEditorModalProps {
  open: boolean;
  day: Weekday;
  dayLabel: string;
  initialPlan: WeeklyDayPlan;
  initialActive: boolean;
  allSubjects: string[];
  onSave: (payload: {
    day: Weekday;
    plan: WeeklyDayPlan;
    active: boolean;
  }) => void;
  onClose: () => void;
}

const DayPlanEditorModal: React.FC<DayPlanEditorModalProps> = ({
  open,
  day,
  dayLabel,
  initialPlan,
  initialActive,
  allSubjects,
  onSave,
  onClose,
}) => {
  const [draftActive, setDraftActive] = useState(initialActive);
  const [draftSubjects, setDraftSubjects] = useState<string[]>(initialPlan.subjectLabels);

  useEffect(() => {
    if (!open) return;
    setDraftActive(initialActive);
    setDraftSubjects(initialPlan.subjectLabels);
  }, [initialActive, initialPlan.subjectLabels, open]);

  const availableSubjects = useMemo(
    () => allSubjects.filter((subject) => !draftSubjects.includes(subject)),
    [allSubjects, draftSubjects],
  );
  const suggestedFronts = useMemo(
    () =>
      draftSubjects
        .map((subject) => {
          const suggestedFront = getSuggestedFrontBySubjectLabel(subject);
          return suggestedFront
            ? { subject, frontLabel: suggestedFront.label }
            : null;
        })
        .filter(Boolean) as Array<{ subject: string; frontLabel: string }>,
    [draftSubjects],
  );

  if (!open) return null;

  const handleSave = () => {
    onSave({
      day,
      plan: { subjectLabels: draftSubjects },
      active: draftActive,
    });
  };

  const handleToggleSubject = (subject: string) => {
    setDraftSubjects((current) =>
      current.includes(subject)
        ? current.filter((item) => item !== subject)
        : [...current, subject],
    );
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 py-6" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Editar dia
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{dayLabel}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Salvar aplica a disponibilidade e a lista atual de disciplinas. Cancelar descarta tudo.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Fechar editor do dia"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Disponibilidade</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Pausar o dia não apaga as disciplinas já salvas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDraftActive((current) => !current)}
                className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  draftActive
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {draftActive ? 'Dia ativo' : 'Dia inativo'}
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Disciplinas do dia</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Selecione as disciplinas que podem aparecer neste dia.
            </p>

            {draftSubjects.length > 0 ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {draftSubjects.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => handleToggleSubject(subject)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                      title={`Remover ${subject}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {subject}
                      <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase dark:bg-slate-900/10">
                        remover
                      </span>
                    </button>
                  ))}
                </div>

                {suggestedFronts.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/80 p-4 dark:border-sky-900/60 dark:bg-sky-950/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300">
                      Sugestao inicial
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {suggestedFronts.map(({ subject, frontLabel }) => (
                        <p key={`${subject}-${frontLabel}`} className="text-sm text-sky-900/80 dark:text-sky-100/80">
                          <span className="font-medium">{subject}</span>
                          {' -> '}
                          <span>Comecar por {frontLabel}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                Nenhuma disciplina selecionada ainda.
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Adicionar disciplinas</p>

            {availableSubjects.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                Nenhuma disciplina disponível ainda.
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {availableSubjects.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => handleToggleSubject(subject)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {subject}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayPlanEditorModal;
