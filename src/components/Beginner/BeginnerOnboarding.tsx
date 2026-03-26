import React from 'react';
import { ArrowLeft, ArrowRight, Clock3, Flag, Sparkles } from 'lucide-react';

export type BeginnerOnboardingPayload = {
  focus: 'enem' | 'concursos' | 'hibrido';
  dailyGoalMinutes: 30 | 60 | 120;
};

interface BeginnerOnboardingProps {
  userName?: string;
  initialFocus?: BeginnerOnboardingPayload['focus'];
  initialDailyGoalMinutes?: number;
  onComplete: (payload: BeginnerOnboardingPayload) => void;
}

const focusOptions: Array<{
  id: BeginnerOnboardingPayload['focus'];
  title: string;
  description: string;
}> = [
  {
    id: 'enem',
    title: 'ENEM',
    description: 'Comeco guiado por Matematica, Linguagens e Humanas.',
  },
  {
    id: 'concursos',
    title: 'Concursos',
    description: 'Base inicial com Portugues, Logica e Constitucional.',
  },
  {
    id: 'hibrido',
    title: 'Hibrido',
    description: 'Mistura ENEM e concursos sem te sobrecarregar no inicio.',
  },
];

const timeOptions: Array<{
  value: BeginnerOnboardingPayload['dailyGoalMinutes'];
  title: string;
  description: string;
}> = [
  {
    value: 30,
    title: '30 min por dia',
    description: 'Entrada leve para criar ritmo sem cansar.',
  },
  {
    value: 60,
    title: '1 hora por dia',
    description: 'Equilibrio bom entre constancia e progresso.',
  },
  {
    value: 120,
    title: '2 horas por dia',
    description: 'Volume maior com sessao inicial limitada a 30 min.',
  },
];

const normalizeDailyGoal = (value?: number): BeginnerOnboardingPayload['dailyGoalMinutes'] => {
  if (!value || value <= 45) return 30;
  if (value <= 90) return 60;
  return 120;
};

export const BeginnerOnboarding: React.FC<BeginnerOnboardingProps> = ({
  userName,
  initialFocus = 'enem',
  initialDailyGoalMinutes,
  onComplete,
}) => {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [focus, setFocus] = React.useState<BeginnerOnboardingPayload['focus']>(initialFocus);
  const [dailyGoalMinutes, setDailyGoalMinutes] = React.useState<BeginnerOnboardingPayload['dailyGoalMinutes']>(
    normalizeDailyGoal(initialDailyGoalMinutes),
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
            <Sparkles className="h-4 w-4" />
            Modo iniciante
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            {step === 1
              ? `Vamos montar seu comeco, ${userName || 'estudante'}.`
              : 'Quanto tempo voce quer reservar por dia?'}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Sao so 2 respostas. Depois disso, a home ja te entrega a primeira missao pronta.
          </p>
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-slate-900 transition-all"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        <div className="px-6 py-6">
          {step === 1 ? (
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Flag className="h-4 w-4" />
                1 de 2 · Escolha seu foco
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {focusOptions.map((option) => {
                  const selected = focus === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFocus(option.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-semibold">{option.title}</p>
                      <p className={`mt-2 text-sm ${selected ? 'text-slate-200' : 'text-slate-600'}`}>
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Clock3 className="h-4 w-4" />
                2 de 2 · Tempo disponivel
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {timeOptions.map((option) => {
                  const selected = dailyGoalMinutes === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDailyGoalMinutes(option.value)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? 'border-emerald-600 bg-emerald-50 text-slate-900 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-semibold">{option.title}</p>
                      <p className="mt-2 text-sm text-slate-600">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Primeira missao</p>
            <p className="mt-1 text-sm text-slate-700">
              O app vai te colocar em movimento com uma sessao curta, 10 questoes e uma revisao rapida.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-5">
          {step === 1 ? (
            <div className="text-xs text-slate-500">Sem diagnostico pesado. So o suficiente para comecar.</div>
          ) : (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onComplete({ focus, dailyGoalMinutes })}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Liberar minha 1a missao
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
