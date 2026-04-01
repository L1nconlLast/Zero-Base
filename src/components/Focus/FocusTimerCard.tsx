import React from 'react';
import { Info } from 'lucide-react';
import { ModeSelector } from '../Timer/ModeSelector';

type FocusStudyMode = 'pomodoro' | 'livre';

interface FocusTimerCardProps {
  darkMode?: boolean;
  currentMode: FocusStudyMode;
  onModeChange: (mode: FocusStudyMode) => void;
  pomodoroContent: React.ReactNode;
  freeTimerContent: React.ReactNode;
  timerSectionRef?: React.Ref<HTMLDivElement>;
}

export const FocusTimerCard: React.FC<FocusTimerCardProps> = ({
  darkMode = false,
  currentMode,
  onModeChange,
  pomodoroContent,
  freeTimerContent,
  timerSectionRef,
}) => {
  return (
    <section className={`rounded-[30px] border p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6 ${
      darkMode
        ? 'border-slate-800 bg-slate-950/92 shadow-[0_18px_40px_rgba(2,6,23,0.45)]'
        : 'border-slate-300/85 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_24%),linear-gradient(180deg,rgba(231,238,246,0.98)_0%,rgba(220,229,239,0.96)_100%)] shadow-[0_18px_40px_rgba(100,116,139,0.18)]'
    }`}>
      <div className="text-center">
        <h2 className={`text-2xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Zona de foco</h2>
        <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Escolha o modo e comece a pontuar.
        </p>
      </div>

      <div ref={timerSectionRef} data-testid="study-focus-container" className="mt-6">
        <ModeSelector currentMode={currentMode} onModeChange={onModeChange} />

        {currentMode === 'pomodoro' ? (
          <div className="space-y-6">
            {pomodoroContent}
            <div className={`rounded-2xl border p-6 ${
              darkMode
                ? 'border-slate-800 bg-slate-900'
                : 'border-slate-300/85 bg-slate-200/82'
            }`}>
              <h3 className={`mb-2 flex items-center gap-2 font-semibold ${
                darkMode ? 'text-slate-100' : 'text-slate-800'
              }`}>
                <Info className="h-4 w-4" />
                Como usar o Pomodoro?
              </h3>
              <ul className={`space-y-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <li>- Escolha o metodo para carregar foco, pausa curta e pausa longa automaticamente.</li>
                <li>- O timer alterna foco, pausa curta e pausa longa sem perder a sessao.</li>
                <li>- Voce pode trocar entre modos e metodos sem perder o controle.</li>
                <li>- A materia selecionada e o metodo ficam salvos no historico.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {freeTimerContent}
            <div className={`rounded-2xl border p-4 text-sm ${
              darkMode
                ? 'border-slate-700 bg-slate-900/72 text-slate-300'
                : 'border-slate-300/85 bg-slate-200/80 text-slate-700'
            }`}>
              O timer livre mede o bloco em tempo corrido e preserva a disciplina exibida no foco atual.
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FocusTimerCard;
