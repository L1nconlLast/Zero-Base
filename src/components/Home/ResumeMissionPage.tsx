import React from 'react';
import { ArrowRight, Clock3, Flame, Target } from 'lucide-react';

export interface ResumeMissionPageProps {
  subject: string;
  topic: string;
  questionsDone: number;
  totalQuestions: number;
  estimatedMinutesRemaining: number;
  source?: 'auto' | 'notification';
  onContinue: () => void;
}

export const ResumeMissionPage: React.FC<ResumeMissionPageProps> = ({
  subject,
  topic,
  questionsDone,
  totalQuestions,
  estimatedMinutesRemaining,
  source = 'auto',
  onContinue,
}) => {
  const normalizedQuestionsDone = Math.max(0, Math.min(totalQuestions, questionsDone));
  const normalizedTotalQuestions = Math.max(1, totalQuestions);
  const normalizedEstimatedMinutes = Math.max(1, estimatedMinutesRemaining);

  return (
    <div data-testid="resume-mission-page" className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
          <Flame className="h-3.5 w-3.5" />
          {source === 'notification' ? 'continuidade pronta' : 'retomar agora'}
        </div>

        <h1 id="resume1" className="mt-5 text-3xl font-black tracking-[-0.04em] text-slate-900">
          Hoje voce continua daqui
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Sua proxima sessao ja esta pronta. Sem menu e sem escolha nova.
        </p>
        <p className="mt-2 text-sm font-medium text-slate-700">
          3 questoes rapidas + revisao curta, direto no ponto em que voce parou.
        </p>

        <section
          id="resume2"
          className="mt-8 rounded-[26px] border border-slate-200 bg-slate-50 px-5 py-5 sm:px-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Sua proxima sessao esta pronta
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-900">
            {subject} - {topic}
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Target className="h-3.5 w-3.5" />
                Progresso
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {normalizedQuestionsDone} de {normalizedTotalQuestions}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Hoje voce continua daqui: {normalizedQuestionsDone} de {normalizedTotalQuestions}
              </p>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
              <p id="tempo1" className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                Tempo restante
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                Faltam so ~{normalizedEstimatedMinutes} min
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Leitura curta, bloco curto e continuidade clara.
              </p>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={onContinue}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-slate-900 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
        >
          Continuar sessao
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ResumeMissionPage;
