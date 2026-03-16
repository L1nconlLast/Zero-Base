import React from 'react';
import { Hand, Brain, CalendarDays, Target } from 'lucide-react';
import { createDefaultSmartProfile, type DifficultyLevel, type SmartScheduleProfile } from '../../utils/smartScheduleEngine';

interface OnboardingFlowProps {
  userName?: string;
  initialDailyGoal: number;
  initialMethodId: string;
  onComplete: (payload: { dailyGoal: number; methodId: string; smartProfile: SmartScheduleProfile }) => void;
}

const SUBJECTS = ['Matemática', 'Linguagens', 'Humanas', 'Natureza', 'Redação'] as const;
const WEEK_DAYS = [
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
] as const;

const difficultyWeight: Record<DifficultyLevel, number> = {
  fraco: 35,
  medio: 20,
  forte: 10,
};

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  userName,
  initialDailyGoal,
  initialMethodId,
  onComplete,
}) => {
  const [step, setStep] = React.useState(1);
  const [profile, setProfile] = React.useState<SmartScheduleProfile>(() => {
    const base = createDefaultSmartProfile();
    return {
      ...base,
      hoursPerDay: Math.max(1, Math.round((initialDailyGoal || 120) / 60)),
      studyStyle: initialMethodId === 'pomodoro' ? 'pomodoro_25_5' : base.studyStyle,
    };
  });

  const setDifficulty = (subject: string, level: DifficultyLevel) => {
    setProfile((prev) => ({
      ...prev,
      subjectDifficulty: {
        ...prev.subjectDifficulty,
        [subject]: level,
      },
      subjectWeight: {
        ...prev.subjectWeight,
        [subject]: difficultyWeight[level],
      },
    }));
  };

  const toggleWeekDay = (weekDay: number) => {
    setProfile((prev) => {
      const has = prev.availableWeekDays.includes(weekDay);
      const next = has
        ? prev.availableWeekDays.filter((item) => item !== weekDay)
        : [...prev.availableWeekDays, weekDay].sort((a, b) => a - b);

      return {
        ...prev,
        availableWeekDays: next.length > 0 ? next : prev.availableWeekDays,
      };
    });
  };

  const finish = () => {
    const methodId = profile.studyStyle === 'pomodoro_25_5' ? 'pomodoro' : 'livre';
    const dailyGoal = profile.hoursPerDay * 60;
    onComplete({ dailyGoal, methodId, smartProfile: profile });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div
          className="p-5 text-white"
          style={{ backgroundImage: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}
        >
          <p className="text-xs uppercase tracking-wider opacity-90">MVP SaaS • Cronograma Inteligente</p>
          <h2 className="text-2xl font-bold mt-1 inline-flex items-center gap-2"><Hand className="w-5 h-5" /> Bem-vindo(a), {userName || 'estudante'}</h2>
          <p className="text-sm opacity-95 mt-1">Configure seu plano em 4 passos e gere o cronograma automaticamente.</p>
        </div>

        <div className="px-5 pt-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex-1">
                <div
                  className={`h-2 rounded-full ${item <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                  style={item <= step ? { backgroundColor: 'var(--color-primary)' } : undefined}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Passo {step} de 4</p>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white inline-flex items-center gap-2"><Target className="w-4 h-4" /> 1) Objetivo</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Preencha os 3 campos abaixo para o plano entender seu alvo real de prova e calibrar o cronograma.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Tipo de prova</label>
                  <select
                    value={profile.examName}
                    onChange={(event) => setProfile((prev) => ({ ...prev, examName: event.target.value as SmartScheduleProfile['examName'] }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  >
                    <option value="ENEM">ENEM</option>
                    <option value="CONCURSO">Concurso</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Data da prova</label>
                  <input
                    type="date"
                    value={profile.examDate}
                    onChange={(event) => setProfile((prev) => ({ ...prev, examDate: event.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Se ainda não tiver edital, use uma data estimada.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {profile.examName === 'ENEM' ? 'Nota desejada (0 a 1000)' : 'Meta de desempenho (ex: 70)'}
                  </label>
                  <input
                    type="number"
                    min={profile.examName === 'ENEM' ? 0 : 1}
                    max={profile.examName === 'ENEM' ? 1000 : 100}
                    value={profile.desiredScore}
                    onChange={(event) => setProfile((prev) => ({ ...prev, desiredScore: Number(event.target.value || 700) }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                    placeholder={profile.examName === 'ENEM' ? 'Ex: 780' : 'Ex: 70'}
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {profile.examName === 'ENEM'
                      ? 'Use a nota alvo para orientar a intensidade do plano.'
                      : 'Use % de acertos no último simulado para calibrar o nível atual.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white inline-flex items-center gap-2"><CalendarDays className="w-4 h-4" /> 2) Disponibilidade</h3>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((day) => {
                  const selected = profile.availableWeekDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleWeekDay(day.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border ${selected ? 'text-white border-transparent' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                      style={selected ? { backgroundColor: 'var(--color-primary)' } : undefined}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={profile.hoursPerDay}
                  onChange={(event) => setProfile((prev) => ({ ...prev, hoursPerDay: Number(event.target.value || 1) }))}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  placeholder="Horas por dia"
                />
                <select
                  value={profile.preferredPeriod}
                  onChange={(event) => setProfile((prev) => ({ ...prev, preferredPeriod: event.target.value as SmartScheduleProfile['preferredPeriod'] }))}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                >
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                  <option value="noite">Noite</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white inline-flex items-center gap-2"><Brain className="w-4 h-4" /> 3) Nível por matéria</h3>
              <div className="space-y-2">
                {SUBJECTS.map((subject) => {
                  const value = profile.subjectDifficulty[subject] || 'medio';
                  return (
                    <div key={subject} className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-2 items-center">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{subject}</p>
                      <div className="flex gap-2">
                        {(['fraco', 'medio', 'forte'] as const).map((level) => {
                          const selected = value === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setDifficulty(subject, level)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${selected ? 'text-white border-transparent' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                              style={selected ? { backgroundColor: 'var(--color-primary)' } : undefined}
                            >
                              {level === 'fraco' ? 'Fraco' : level === 'medio' ? 'Médio' : 'Forte'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">4) Estilo de estudo</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  { id: 'teoria_questoes', label: 'Teoria + Questões' },
                  { id: 'questoes', label: 'Só Questões' },
                  { id: 'pomodoro_25_5', label: 'Pomodoro (25/5)' },
                ].map((style) => {
                  const selected = profile.studyStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setProfile((prev) => ({ ...prev, studyStyle: style.id as SmartScheduleProfile['studyStyle'] }))}
                      className={`px-3 py-3 rounded-lg text-sm font-semibold border ${selected ? 'text-white border-transparent' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                      style={selected ? { backgroundColor: 'var(--color-primary)' } : undefined}
                    >
                      {style.label}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 space-y-1">
                <p className="text-sm text-gray-700 dark:text-gray-200"><strong>Prova:</strong> {profile.examName}</p>
                <p className="text-sm text-gray-700 dark:text-gray-200"><strong>Meta:</strong> {profile.desiredScore} pontos</p>
                <p className="text-sm text-gray-700 dark:text-gray-200"><strong>Disponibilidade:</strong> {profile.hoursPerDay}h/dia</p>
              </div>

              <button
                onClick={finish}
                className="w-full mt-2 rounded-xl px-4 py-3 text-white font-semibold"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Finalizar e gerar cronograma automaticamente
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep((previous) => Math.max(1, previous - 1))}
              disabled={step === 1}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40"
            >
              Voltar
            </button>

            {step < 4 && (
              <button
                onClick={() => setStep((previous) => Math.min(4, previous + 1))}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Continuar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
