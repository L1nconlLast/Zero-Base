import React from 'react';
import { Target, Flame } from 'lucide-react';
import type { StudyMethod, UserData } from '../../types';
import { STUDY_METHODS } from '../../data/studyMethods';
import { recommendMethod } from '../../utils/studyMethodRecommendation';

interface StudyMethodHubProps {
  userData: UserData;
  selectedMethodId: string;
  onSelectMethod: (methodId: string) => void;
  onStartMethod: (methodId: string) => void;
}

const calculateDailyAverageLast7Days = (userData: UserData): number => {
  const sessions = userData.sessions || userData.studyHistory || [];
  if (sessions.length === 0) return 0;

  const today = new Date();
  const last7DaysSet = new Set<string>();
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    last7DaysSet.add(date.toISOString().slice(0, 10));
  }

  const minutesByDay = new Map<string, number>();
  sessions.forEach((session) => {
    const dateKey = new Date(session.date).toISOString().slice(0, 10);
    if (!last7DaysSet.has(dateKey)) return;
    minutesByDay.set(dateKey, (minutesByDay.get(dateKey) || 0) + session.minutes);
  });

  const totalMinutes = Array.from(minutesByDay.values()).reduce((sum, minutes) => sum + minutes, 0);
  return Math.round(totalMinutes / 7);
};

const StudyMethodHub: React.FC<StudyMethodHubProps> = ({
  userData,
  selectedMethodId,
  onSelectMethod,
  onStartMethod,
}) => {
  const [previewMethod, setPreviewMethod] = React.useState<StudyMethod | null>(null);

  const recommended = React.useMemo(() => {
    const dailyAverageMinutes = calculateDailyAverageLast7Days(userData);
    return recommendMethod({
      dailyAverageMinutes,
      streak: userData.currentStreak || userData.streak || 0,
    });
  }, [userData]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 inline-flex items-center gap-2"><Target className="w-6 h-6" /> Métodos de Estudo</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Escolha sua estratégia de foco. O app alterna automaticamente foco, pausa curta e pausa longa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STUDY_METHODS.map((method) => {
          const isSelected = selectedMethodId === method.id;
          const isRecommended = recommended.id === method.id;

          return (
            <div
              key={method.id}
              className={`rounded-2xl border p-5 shadow-sm transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{method.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{method.description}</p>
                </div>
                {isRecommended && (
                  <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                    <span className="inline-flex items-center gap-1"><Flame className="w-3 h-3" /> Recomendado para você</span>
                  </span>
                )}
              </div>

              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                {method.focusMinutes} min foco / {method.breakMinutes} min pausa / {method.longBreakMinutes} min pausa longa · ciclo {method.cyclesBeforeLongBreak}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => onSelectMethod(method.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {isSelected ? 'Selecionado' : 'Usar método'}
                </button>
                <button
                  onClick={() => setPreviewMethod(method)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                >
                  Iniciar agora
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {previewMethod && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{previewMethod.name}</h3>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-6">
              <p>Foco: <strong>{previewMethod.focusMinutes} min</strong></p>
              <p>Pausa curta: <strong>{previewMethod.breakMinutes} min</strong></p>
              <p>Pausa longa: <strong>{previewMethod.longBreakMinutes} min</strong></p>
              <p>Ciclos antes da pausa longa: <strong>{previewMethod.cyclesBeforeLongBreak}</strong></p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onSelectMethod(previewMethod.id);
                  onStartMethod(previewMethod.id);
                  setPreviewMethod(null);
                }}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold"
              >
                Iniciar agora
              </button>
              <button
                onClick={() => setPreviewMethod(null)}
                className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyMethodHub;
