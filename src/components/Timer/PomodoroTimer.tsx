import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Bell, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MATERIAS_CONFIG, MateriaTipo } from '../../types';
import { STUDY_METHODS, getStudyMethodById } from '../../data/studyMethods';
import { trackEvent } from '../../utils/analytics';
import { getCycleDisciplineLabels, type StudyTrackLabel } from '../../utils/disciplineLabels';

interface PomodoroTimerProps {
  onFinishSession: (minutes: number, subject: MateriaTipo, methodId?: string) => void;
  selectedMethodId?: string;
  onSelectMethod?: (methodId: string) => void;
  quickStartSignal?: number;
  preferredTrack?: StudyTrackLabel;
  hybridEnemWeight?: number;
}

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const LONG_BREAK_OVERRIDES_KEY = 'mdzLongBreakOverridesByMethod';

const readLongBreakOverrides = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(LONG_BREAK_OVERRIDES_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(parsed).reduce((acc, [method, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        acc[method] = value;
      }
      return acc;
    }, {} as Record<string, number>);
  } catch {
    return {};
  }
};

const writeLongBreakOverrides = (overrides: Record<string, number>) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LONG_BREAK_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // noop
  }
};

const getPersistedOverrideForMethod = (methodId: string): number | null => {
  const value = readLongBreakOverrides()[methodId];
  if (typeof value !== 'number') return null;
  return Math.min(180, Math.max(10, value));
};

const MODE_STYLES: Record<TimerMode, { label: string; accent: string; ring: string; bg: string; icon: LucideIcon }> = {
  focus: {
    label: '🧠 Foco',
    accent: 'text-gray-900 dark:text-white',
    ring: 'ring-gray-800 dark:ring-white',
    bg: 'bg-gray-900 dark:bg-white',
    icon: Brain,
  },
  shortBreak: {
    label: '☕ Pausa Curta',
    accent: 'text-teal-600',
    ring: 'ring-teal-500',
    bg: 'bg-teal-500',
    icon: Coffee,
  },
  longBreak: {
    label: '🔔 Pausa Longa',
    accent: 'text-blue-600',
    ring: 'ring-blue-500',
    bg: 'bg-blue-500',
    icon: Bell,
  },
};

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  onFinishSession,
  selectedMethodId = 'pomodoro',
  onSelectMethod,
  quickStartSignal,
  preferredTrack = 'enem',
  hybridEnemWeight = 70,
}) => {
  const [methodId, setMethodId] = useState(selectedMethodId);
  const [mode, setMode] = useState<TimerMode>('focus');
  const [completedFocusCycles, setCompletedFocusCycles] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [subject, setSubject] = useState<MateriaTipo>('Anatomia');
  const [longBreakOverrideMinutes, setLongBreakOverrideMinutes] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const cycleDisciplineLabels = useMemo(
    () => getCycleDisciplineLabels(preferredTrack, hybridEnemWeight),
    [preferredTrack, hybridEnemWeight]
  );
  const selectedMethod = getStudyMethodById(methodId);
  const effectiveLongBreakMinutes = longBreakOverrideMinutes ?? selectedMethod.longBreakMinutes;
  const [timeLeft, setTimeLeft] = useState(selectedMethod.focusMinutes * 60);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousIsActiveRef = useRef(false);

  const playTone = useCallback((frequency: number, duration: number, volume = 0.05) => {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gainNode.gain.setValueAtTime(volume, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + duration);

    setTimeout(() => {
      context.close().catch(() => {});
    }, Math.ceil(duration * 1000) + 50);
  }, []);

  const playStartSound = useCallback(() => {
    playTone(720, 0.08, 0.04);
    setTimeout(() => playTone(920, 0.12, 0.04), 90);
  }, [playTone]);

  const playWarningSound = useCallback(() => {
    playTone(520, 0.1, 0.05);
    setTimeout(() => playTone(520, 0.1, 0.05), 140);
    setTimeout(() => playTone(520, 0.15, 0.06), 280);
  }, [playTone]);

  useEffect(() => {
    const nextMethod = getStudyMethodById(selectedMethodId);
    const persistedOverride = getPersistedOverrideForMethod(selectedMethodId);
    setMethodId(selectedMethodId);
    setIsActive(false);
    setMode('focus');
    setCompletedFocusCycles(0);
    setLongBreakOverrideMinutes(persistedOverride);
    setTimeLeft(nextMethod.focusMinutes * 60);
  }, [selectedMethodId]);

  useEffect(() => {
    if (!quickStartSignal) {
      return;
    }

    const nextMethod = getStudyMethodById(methodId);
    setMode('focus');
    setTimeLeft(nextMethod.focusMinutes * 60);
    setIsActive(true);

    trackEvent('pomodoro_auto_started', {
      methodId: nextMethod.id,
      focusMinutes: nextMethod.focusMinutes,
      subject,
      source: 'department_focus_cta',
    });
  }, [quickStartSignal, methodId, subject]);

  const getModeMinutes = useCallback((phase: TimerMode): number => {
    if (phase === 'focus') return selectedMethod.focusMinutes;
    if (phase === 'shortBreak') return selectedMethod.breakMinutes;
    return effectiveLongBreakMinutes;
  }, [effectiveLongBreakMinutes, selectedMethod.breakMinutes, selectedMethod.focusMinutes]);

  const adjustLongBreakMinutes = useCallback((delta: number) => {
    setLongBreakOverrideMinutes((prev) => {
      const currentValue = prev ?? selectedMethod.longBreakMinutes;
      return Math.min(180, Math.max(10, currentValue + delta));
    });
  }, [selectedMethod.longBreakMinutes]);

  const resetLongBreakMinutes = useCallback(() => {
    setLongBreakOverrideMinutes(null);
  }, []);

  useEffect(() => {
    const overrides = readLongBreakOverrides();

    if (longBreakOverrideMinutes === null) {
      if (methodId in overrides) {
        delete overrides[methodId];
        writeLongBreakOverrides(overrides);
      }
      return;
    }

    overrides[methodId] = longBreakOverrideMinutes;
    writeLongBreakOverrides(overrides);
  }, [longBreakOverrideMinutes, methodId]);

  const totalSeconds = getModeMinutes(mode) * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audioRef.current.volume = 0.5;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (isActive && !previousIsActiveRef.current) {
      playStartSound();
    }
    previousIsActiveRef.current = isActive;
  }, [isActive, playStartSound]);

  useEffect(() => {
    if (!isActive || timeLeft !== 5) {
      return;
    }
    playWarningSound();
  }, [isActive, timeLeft, playWarningSound]);

  const handleComplete = useCallback(() => {
    audioRef.current?.play().catch(() => {});
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Zero Base', {
        body: `${MODE_STYLES[mode].label} finalizado. ${mode === 'focus' ? 'Hora de descansar.' : 'Pronto para estudar novamente?'}`,
        icon: '/favicon.ico',
      });
    }

    if (mode === 'focus') {
      onFinishSession(selectedMethod.focusMinutes, subject, selectedMethod.id);

      setCompletedFocusCycles((prev) => {
        const nextCycles = prev + 1;
        const shouldLongBreak = nextCycles % selectedMethod.cyclesBeforeLongBreak === 0;
        const nextMode: TimerMode = shouldLongBreak ? 'longBreak' : 'shortBreak';
        setMode(nextMode);
        setTimeLeft(getModeMinutes(nextMode) * 60);
        return nextCycles;
      });
      return;
    }

    setMode('focus');
    setTimeLeft(selectedMethod.focusMinutes * 60);
  }, [getModeMinutes, mode, onFinishSession, selectedMethod, subject]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [handleComplete, isActive, timeLeft]);

  const toggleTimer = () => setIsActive((p) => !p);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(getModeMinutes(mode) * 60);
  };

  const changeMode = (newMode: TimerMode) => {
    if (isActive) {
      setConfirmAction({
        message: 'Deseja parar a sessão atual?',
        onConfirm: () => {
          setMode(newMode);
          setIsActive(false);
          setTimeLeft(getModeMinutes(newMode) * 60);
          setConfirmAction(null);
        },
      });
      return;
    }
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(getModeMinutes(newMode) * 60);
  };

  const currentMode = MODE_STYLES[mode];

  const handleMethodChange = (newMethodId: string) => {
    if (isActive) {
      setConfirmAction({
        message: 'Deseja trocar de método e interromper a sessão atual?',
        onConfirm: () => {
          setMethodId(newMethodId);
          onSelectMethod?.(newMethodId);
          setIsActive(false);
          setMode('focus');
          setCompletedFocusCycles(0);
          setLongBreakOverrideMinutes(getPersistedOverrideForMethod(newMethodId));
          setTimeLeft(getStudyMethodById(newMethodId).focusMinutes * 60);
          setConfirmAction(null);
        },
      });
      return;
    }
    setMethodId(newMethodId);
    onSelectMethod?.(newMethodId);
    setIsActive(false);
    setMode('focus');
    setCompletedFocusCycles(0);
    setLongBreakOverrideMinutes(getPersistedOverrideForMethod(newMethodId));
    setTimeLeft(getStudyMethodById(newMethodId).focusMinutes * 60);
  };

  return (
    <>
    {confirmAction && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-3">Confirmar ação</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{confirmAction.message}</p>
          <div className="flex gap-3">
            <button
              onClick={confirmAction.onConfirm}
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
            >
              Confirmar
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-semibold transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden">

      <div className="h-1 w-full bg-gray-100 dark:bg-gray-700">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${currentMode.bg}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-6">
        <div className="flex justify-center gap-2 mb-6">
          {(Object.keys(MODE_STYLES) as TimerMode[]).map((modeKey) => {
            const ModeIcon = MODE_STYLES[modeKey].icon;
            const isSelected = mode === modeKey;
            return (
              <button
                key={modeKey}
                onClick={() => changeMode(modeKey)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5
                  ${isSelected
                    ? `${MODE_STYLES[modeKey].accent} bg-gray-100 dark:bg-gray-700 ring-1 ring-current`
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                <ModeIcon size={13} />
                {MODE_STYLES[modeKey].label}
              </button>
            );
          })}
        </div>

        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">
            ⏱️ Método de Estudo
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {STUDY_METHODS.map((method) => {
              const selected = method.id === methodId;
              return (
                <button
                  key={method.id}
                  onClick={() => handleMethodChange(method.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    selected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {method.name}
                </button>
              );
            })}
          </div>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
            {selectedMethod.focusMinutes}m foco · {selectedMethod.breakMinutes}m pausa · {effectiveLongBreakMinutes}m pausa longa · ciclo {selectedMethod.cyclesBeforeLongBreak}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Ajuste pausa longa</span>
            <button
              type="button"
              onClick={() => adjustLongBreakMinutes(-5)}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => adjustLongBreakMinutes(5)}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => adjustLongBreakMinutes(10)}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              +10
            </button>
            <button
              type="button"
              onClick={resetLongBreakMinutes}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200"
            >
              Reset
            </button>
            {longBreakOverrideMinutes !== null && (
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200">
                Personalizado
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <div className="relative">
            <svg viewBox="0 0 220 220" className="-rotate-90 w-[190px] h-[190px] sm:w-[220px] sm:h-[220px]">
              <circle
                cx="110" cy="110" r={radius}
                fill="none"
                strokeWidth="6"
                className="stroke-gray-100 dark:stroke-gray-700"
              />
              <circle
                cx="110" cy="110" r={radius}
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-linear ${
                  mode === 'focus'
                    ? 'stroke-gray-900 dark:stroke-white'
                    : mode === 'shortBreak'
                    ? 'stroke-teal-500'
                    : 'stroke-blue-500'
                }`}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl sm:text-5xl font-bold font-mono tracking-tight ${currentMode.accent}`}>
                {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </span>
              <span className={`text-xs font-medium uppercase tracking-widest mt-1 ${
                isActive ? 'text-green-500' : 'text-gray-400'
              }`}>
                {isActive ? '● rodando' : 'pausado'}
              </span>
            </div>
          </div>
        </div>

        {mode === 'focus' && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">
                📚 Matéria do Ciclo
            </p>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-center">
              {(Object.keys(MATERIAS_CONFIG) as MateriaTipo[]).map((key) => {
                const config = MATERIAS_CONFIG[key];
                const discipline = cycleDisciplineLabels[key];
                const isSelected = subject === key;
                return (
                  <button
                    key={key}
                    onClick={() => !isActive && setSubject(key)}
                    disabled={isActive}
                    title={discipline.label}
                    className={`
                      flex flex-col items-center p-2 sm:p-2.5 rounded-xl border-2 transition-all min-w-[56px] sm:min-w-[60px]
                      ${isSelected
                        ? `${config.bgColor} ${config.borderColor} ring-1 ring-current scale-105`
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 opacity-60 hover:opacity-100'
                      }
                      ${isActive ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                    `}
                  >
                    <span className="text-lg sm:text-xl mb-0.5 sm:mb-1">{discipline.icon}</span>
                    <span className={`text-[9px] sm:text-[10px] font-medium ${isSelected ? config.color : 'text-gray-500'}`}>
                      {discipline.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-center text-xs mt-3 text-gray-400">
              Estudando: <strong className={MATERIAS_CONFIG[subject].color}>{cycleDisciplineLabels[subject].icon} {cycleDisciplineLabels[subject].label}</strong>
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={toggleTimer}
            className={`
              h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-md
              transition-all hover:scale-105 active:scale-95
              ${isActive
                ? 'bg-red-500 hover:bg-red-600 shadow-red-100 dark:shadow-red-900/30'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100 dark:shadow-emerald-900/30'
              }
            `}
            aria-label={isActive ? 'Pausar' : 'Iniciar'}
          >
            {isActive
              ? <Pause size={24} fill="currentColor" />
              : <Play size={24} fill="currentColor" className="ml-0.5" />
            }
          </button>

          <button
            onClick={resetTimer}
            className="h-14 w-14 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-600 dark:hover:text-gray-200 transition-all hover:scale-105 active:scale-95"
            aria-label="Resetar"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {isActive && (
          <p className="text-center text-xs text-gray-400 mt-5">
            {mode === 'focus'
              ? `Concentre-se em ${subject}`
              : mode === 'shortBreak'
              ? 'Descanse um pouco'
              : 'Recarregue as energias'}
          </p>
        )}

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
          Ciclos de foco concluídos: <strong>{completedFocusCycles}</strong>
        </p>
      </div>

      <div className="px-6 pb-5">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2">
            <Info className="w-4 h-4" /> Como usar o Pomodoro?
          </p>
          <p>• <strong className="text-gray-700 dark:text-gray-300">Foco (25min):</strong> Concentre-se totalmente em uma matéria</p>
          <p>• <strong className="text-gray-700 dark:text-gray-300">Pausa Curta (5min):</strong> Descanse após cada ciclo</p>
          <p>• <strong className="text-gray-700 dark:text-gray-300">Pausa Longa (15min):</strong> Recarregue após estudos intensos</p>
        </div>
      </div>
    </div>
    </>
  );
};
