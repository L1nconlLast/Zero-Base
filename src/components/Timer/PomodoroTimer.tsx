import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  Brain,
  Coffee,
  Info,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { STUDY_METHODS, getStudyMethodById } from '../../data/studyMethods';
import { useStudySessionMachine } from '../../hooks/useStudySessionMachine';
import { MATERIAS_CONFIG, MateriaTipo } from '../../types';
import { trackEvent } from '../../utils/analytics';
import { getCycleDisciplineLabels, type StudyTrackLabel } from '../../utils/disciplineLabels';

interface PomodoroTimerProps {
  onFinishSession: (minutes: number, subject: MateriaTipo, methodId?: string) => void;
  selectedMethodId?: string;
  onSelectMethod?: (methodId: string) => void;
  quickStartSignal?: number;
  preferredSubject?: MateriaTipo;
  initialFocusMinutes?: number;
  preferredTrack?: StudyTrackLabel;
  hybridEnemWeight?: number;
  compact?: boolean;
  displaySubjectLabel?: string;
  sessionStorageScope?: string;
  userEmail?: string;
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

const MODE_STYLES: Record<
  TimerMode,
  { label: string; accent: string; ring: string; bg: string; icon: LucideIcon }
> = {
  focus: {
    label: 'Foco',
    accent: 'text-gray-900 dark:text-white',
    ring: 'ring-gray-800 dark:ring-white',
    bg: 'bg-gray-900 dark:bg-white',
    icon: Brain,
  },
  shortBreak: {
    label: 'Pausa Curta',
    accent: 'text-teal-600',
    ring: 'ring-teal-500',
    bg: 'bg-teal-500',
    icon: Coffee,
  },
  longBreak: {
    label: 'Pausa Longa',
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
  preferredSubject,
  initialFocusMinutes,
  preferredTrack = 'enem',
  hybridEnemWeight = 70,
  compact = false,
  displaySubjectLabel,
  sessionStorageScope = 'default',
  userEmail,
}) => {
  const [methodId, setMethodId] = useState(selectedMethodId);
  const [selectedPhase, setSelectedPhase] = useState<TimerMode>('focus');
  const [subject, setSubject] = useState<MateriaTipo>('Anatomia');
  const [longBreakOverrideMinutes, setLongBreakOverrideMinutes] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousIsRunningRef = useRef(false);
  const handledCompletionKeyRef = useRef<string | null>(null);
  const lastAppliedPreferredSubjectRef = useRef<MateriaTipo | null>(null);

  const cycleDisciplineLabels = useMemo(
    () => getCycleDisciplineLabels(preferredTrack, hybridEnemWeight),
    [preferredTrack, hybridEnemWeight],
  );

  const selectedMethod = getStudyMethodById(methodId);
  const effectiveLongBreakMinutes = longBreakOverrideMinutes ?? selectedMethod.longBreakMinutes;
  const effectiveFocusMinutes =
    methodId === 'pomodoro'
      ? (initialFocusMinutes ?? selectedMethod.focusMinutes)
      : selectedMethod.focusMinutes;

  const getModeMinutes = useCallback(
    (phase: TimerMode): number => {
      if (phase === 'focus') return effectiveFocusMinutes;
      if (phase === 'shortBreak') return selectedMethod.breakMinutes;
      return effectiveLongBreakMinutes;
    },
    [effectiveFocusMinutes, effectiveLongBreakMinutes, selectedMethod.breakMinutes],
  );

  const {
    session,
    status,
    phase,
    isRunning,
    elapsedPhaseMs,
    remainingPhaseMs,
    progressPercent,
    completedFocusCycles,
    start,
    pause,
    resume,
    cancel,
    clear,
    switchPhase,
    syncMetadata,
  } = useStudySessionMachine({
    storageKey: `pomodoro-session_${sessionStorageScope}`,
    exclusiveStorageKeys: [`study-timer-session_${sessionStorageScope}`],
    source: 'pomodoro',
    kind: 'countdown',
    plannedDurationMs: getModeMinutes(selectedPhase) * 60 * 1000,
    phase: selectedPhase,
    subject: preferredSubject ?? subject,
    methodId,
    userEmail,
  });

  const mode = session?.phase ?? selectedPhase;
  const currentMode = MODE_STYLES[mode];
  const totalSeconds = session
    ? Math.max(1, Math.ceil(session.plannedDurationMs / 1000))
    : getModeMinutes(mode) * 60;
  const timeLeft = session
    ? Math.max(0, Math.ceil(remainingPhaseMs / 1000))
    : getModeMinutes(mode) * 60;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = session ? progressPercent : 0;
  const hasTrackedProgress = Boolean(session) && (status === 'running' || status === 'paused' || elapsedPhaseMs > 0);
  const effectiveSubject = session?.subject || subject;
  const quickStartSubject = session?.subject || subject || preferredSubject || 'Anatomia';
  const resolvedSubjectLabel =
    displaySubjectLabel && effectiveSubject === (preferredSubject || effectiveSubject)
      ? displaySubjectLabel
      : cycleDisciplineLabels[effectiveSubject].label;

  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    const persistedOverride = getPersistedOverrideForMethod(selectedMethodId);
    setLongBreakOverrideMinutes(persistedOverride);

    if (status === 'running' || status === 'paused') {
      return;
    }

    setMethodId(selectedMethodId);
    setSelectedPhase('focus');
  }, [selectedMethodId, status]);

  useEffect(() => {
    if (session?.subject && session.subject !== subject) {
      setSubject(session.subject);
      return;
    }

    if (
      !session?.subject &&
      preferredSubject &&
      preferredSubject !== subject &&
      lastAppliedPreferredSubjectRef.current !== preferredSubject
    ) {
      setSubject(preferredSubject);
      lastAppliedPreferredSubjectRef.current = preferredSubject;
    }
  }, [preferredSubject, session?.subject, subject]);

  useEffect(() => {
    if (!session?.methodId || session.methodId === methodId) {
      return;
    }

    setMethodId(session.methodId);
    onSelectMethod?.(session.methodId);
  }, [methodId, onSelectMethod, session?.methodId]);

  useEffect(() => {
    if (!session?.phase || session.phase === selectedPhase) {
      return;
    }

    setSelectedPhase(session.phase);
  }, [selectedPhase, session?.phase]);

  const playTone = useCallback((frequency: number, duration: number, volume = 0.05) => {
    if (typeof window === 'undefined') return;

    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

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
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audioRef.current.volume = 0.5;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (isRunning && !previousIsRunningRef.current) {
      playStartSound();
    }

    previousIsRunningRef.current = isRunning;
  }, [isRunning, playStartSound]);

  useEffect(() => {
    if (!isRunning || timeLeft !== 5) {
      return;
    }

    playWarningSound();
  }, [isRunning, playWarningSound, timeLeft]);

  useEffect(() => {
    if (!quickStartSignal || status === 'running' || status === 'paused') {
      return;
    }

    const nextFocusMinutes = getModeMinutes('focus');
    setSelectedPhase('focus');
    start({
      phase: 'focus',
      plannedDurationMs: nextFocusMinutes * 60 * 1000,
      subject: quickStartSubject,
      methodId,
      completedFocusCycles: 0,
    });

    trackEvent('pomodoro_auto_started', {
      methodId,
      focusMinutes: nextFocusMinutes,
      subject: quickStartSubject,
      source: 'department_focus_cta',
    });
  }, [getModeMinutes, methodId, quickStartSignal, quickStartSubject, start, status]);

  useEffect(() => {
    if (!session || status !== 'running' || remainingPhaseMs > 0) {
      return;
    }

    const completionKey = `${session.sessionId}:${session.phase}:${session.completedFocusCycles}`;
    if (handledCompletionKeyRef.current === completionKey) {
      return;
    }

    handledCompletionKeyRef.current = completionKey;
    audioRef.current?.play().catch(() => {});

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Zero Base', {
        body: `${MODE_STYLES[mode].label} finalizado. ${
          mode === 'focus' ? 'Hora de descansar.' : 'Pronto para estudar novamente?'
        }`,
        icon: '/favicon.ico',
      });
    }

    if (session.phase === 'focus') {
      const completedMinutes = Math.max(1, Math.round(session.plannedDurationMs / 60000));
      const nextCompletedCycles = session.completedFocusCycles + 1;
      const shouldLongBreak =
        nextCompletedCycles % selectedMethod.cyclesBeforeLongBreak === 0;
      const nextPhase: TimerMode = shouldLongBreak ? 'longBreak' : 'shortBreak';

      switchPhase(nextPhase, getModeMinutes(nextPhase) * 60 * 1000, {
        nextStatus: 'running',
        subject: effectiveSubject,
        methodId,
        completedFocusCycles: nextCompletedCycles,
      });
      setSelectedPhase(nextPhase);
      onFinishSession(completedMinutes, effectiveSubject, methodId);
      return;
    }

    switchPhase('focus', getModeMinutes('focus') * 60 * 1000, {
      nextStatus: 'running',
      subject: effectiveSubject,
      methodId,
      completedFocusCycles: session.completedFocusCycles,
    });
    setSelectedPhase('focus');
  }, [
    getModeMinutes,
    methodId,
    mode,
    onFinishSession,
    remainingPhaseMs,
    selectedMethod.cyclesBeforeLongBreak,
    session,
    status,
    effectiveSubject,
    switchPhase,
  ]);

  useEffect(() => {
    if (!session || remainingPhaseMs > 1000) {
      handledCompletionKeyRef.current = null;
    }
  }, [remainingPhaseMs, session]);

  const adjustLongBreakMinutes = useCallback(
    (delta: number) => {
      setLongBreakOverrideMinutes((prev) => {
        const currentValue = prev ?? selectedMethod.longBreakMinutes;
        return Math.min(180, Math.max(10, currentValue + delta));
      });
    },
    [selectedMethod.longBreakMinutes],
  );

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

  const toggleTimer = () => {
    if (isRunning) {
      pause();
      return;
    }

    if (status === 'paused') {
      resume();
      return;
    }

    start({
      phase: mode,
      plannedDurationMs: getModeMinutes(mode) * 60 * 1000,
      subject: quickStartSubject,
      methodId,
      completedFocusCycles,
    });
  };

  const resetTimer = () => {
    if (session) {
      cancel();
      clear();
    }
    setSelectedPhase(mode);
  };

  const changeMode = (newMode: TimerMode) => {
    if (hasTrackedProgress) {
      setConfirmAction({
        message: 'Deseja trocar de modo e interromper a sessao atual?',
        onConfirm: () => {
          cancel();
          clear();
          setSelectedPhase(newMode);
          setConfirmAction(null);
        },
      });
      return;
    }

    setSelectedPhase(newMode);
  };

  const handleMethodChange = (newMethodId: string) => {
    if (hasTrackedProgress) {
      setConfirmAction({
        message: 'Deseja trocar de metodo e interromper a sessao atual?',
        onConfirm: () => {
          cancel();
          clear();
          setMethodId(newMethodId);
          onSelectMethod?.(newMethodId);
          setSelectedPhase('focus');
          setLongBreakOverrideMinutes(getPersistedOverrideForMethod(newMethodId));
          setConfirmAction(null);
        },
      });
      return;
    }

    setMethodId(newMethodId);
    onSelectMethod?.(newMethodId);
    setSelectedPhase('focus');
    setLongBreakOverrideMinutes(getPersistedOverrideForMethod(newMethodId));
  };

  const handleSubjectChange = useCallback((nextSubject: MateriaTipo) => {
    setSubject(nextSubject);

    if (session && (status === 'running' || status === 'paused')) {
      syncMetadata({ subject: nextSubject });
    }
  }, [session, status, syncMetadata]);

  return (
    <>
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-3">
              Confirmar acao
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {confirmAction.message}
            </p>
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

      <div
        className={`${
          compact
            ? 'bg-[#0B1220] border border-slate-800 text-white shadow-[0_18px_48px_-24px_rgba(2,6,23,0.95)]'
            : 'border border-slate-300/85 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.10),transparent_24%),linear-gradient(180deg,rgba(236,242,248,0.98)_0%,rgba(226,235,244,0.96)_100%)] text-slate-900 shadow-[0_18px_38px_rgba(100,116,139,0.16)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.94)_0%,rgba(2,6,23,0.98)_100%)] dark:text-slate-100 dark:shadow-[0_18px_48px_rgba(2,6,23,0.42)]'
        } rounded-3xl overflow-hidden`}
        data-testid="study-pomodoro-timer-ready"
        data-study-session-source="pomodoro"
        data-study-session-status={status}
        data-study-session-phase={mode}
      >
        <div className={`h-1 w-full ${compact ? 'bg-slate-900/80' : 'bg-slate-300 dark:bg-slate-800'}`}>
          <div
            className={`h-full transition-all duration-1000 ease-linear ${currentMode.bg}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className={compact ? 'p-5 sm:p-6' : 'p-6'}>
          {!compact && (
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
                      ${
                        isSelected
                          ? `${MODE_STYLES[modeKey].accent} bg-slate-100 dark:bg-slate-800 ring-1 ring-current`
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }
                    `}
                  >
                    <ModeIcon size={13} />
                    {MODE_STYLES[modeKey].label}
                  </button>
                );
              })}
            </div>
          )}

          {!compact && (
            <div className="mb-5">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Metodo de Estudo
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
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {method.name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                {effectiveFocusMinutes}m foco · {selectedMethod.breakMinutes}m pausa ·{' '}
                {effectiveLongBreakMinutes}m pausa longa · ciclo{' '}
                {selectedMethod.cyclesBeforeLongBreak}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Ajuste pausa longa
                </span>
                <button
                  type="button"
                  onClick={() => adjustLongBreakMinutes(-5)}
                  className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => adjustLongBreakMinutes(5)}
                  className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => adjustLongBreakMinutes(10)}
                  className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
          )}

          {compact && (
            <div className="mb-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Bloco atual
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{resolvedSubjectLabel}</p>
              <p className="mt-2 text-xs text-slate-400">Metodo ativo: {selectedMethod.name}</p>
            </div>
          )}

          <div className="flex justify-center mb-6">
            <div className="relative">
              <svg
                viewBox="0 0 220 220"
                className={`-rotate-90 ${
                  compact
                    ? 'w-[220px] h-[220px] sm:w-[250px] sm:h-[250px]'
                    : 'w-[190px] h-[190px] sm:w-[220px] sm:h-[220px]'
                }`}
              >
                <circle
                  cx="110"
                  cy="110"
                  r={radius}
                  fill="none"
                  strokeWidth="6"
                  className={compact ? 'stroke-slate-800' : 'stroke-slate-300 dark:stroke-slate-700'}
                />
                <circle
                  cx="110"
                  cy="110"
                  r={radius}
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
                <span
                  className={
                    compact
                      ? 'text-5xl sm:text-6xl font-bold font-mono tracking-tight text-white'
                      : `text-4xl sm:text-5xl font-bold font-mono tracking-tight ${currentMode.accent}`
                  }
                >
                  {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                </span>
                <span
                  className={`text-xs font-medium uppercase tracking-widest mt-1 ${
                    isRunning ? 'text-green-400' : compact ? 'text-slate-500' : 'text-gray-400'
                  }`}
                >
                  {isRunning ? 'rodando' : timeLeft < totalSeconds ? 'pausado' : 'pronto'}
                </span>
              </div>
            </div>
          </div>

          {!compact && mode === 'focus' && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center inline-flex items-center justify-center gap-2 w-full">
                <BookOpen className="w-3.5 h-3.5" />
                Materia do Ciclo
              </p>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-center">
                {(Object.keys(MATERIAS_CONFIG) as MateriaTipo[]).map((key) => {
                  const config = MATERIAS_CONFIG[key];
                  const discipline = cycleDisciplineLabels[key];
                  const DisciplineIcon = discipline.Icon;
                  const isSelected = effectiveSubject === key;

                  return (
                    <button
                      key={key}
                      onClick={() => handleSubjectChange(key)}
                      title={discipline.label}
                      className={`
                        flex flex-col items-center p-2 sm:p-2.5 rounded-xl border-2 transition-all min-w-[56px] sm:min-w-[60px]
                        ${
                          isSelected
                            ? `${config.bgColor} ${config.borderColor} ring-1 ring-current scale-105`
                            : 'bg-slate-100 dark:bg-gray-800 border-slate-300 dark:border-gray-600 opacity-70 hover:opacity-100'
                        }
                        cursor-pointer hover:scale-105
                      `}
                    >
                      <DisciplineIcon className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 sm:mb-1" />
                      <span
                        className={`text-[9px] sm:text-[10px] font-medium ${
                          isSelected ? config.color : 'text-slate-600'
                        }`}
                      >
                        {discipline.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-xs mt-3 text-gray-400">
                Estudando:{' '}
                <strong className={`${MATERIAS_CONFIG[effectiveSubject].color} inline-flex items-center gap-1`}>
                  {React.createElement(cycleDisciplineLabels[effectiveSubject].Icon, {
                    className: 'w-3.5 h-3.5',
                  })}
                  {cycleDisciplineLabels[effectiveSubject].label}
                </strong>
              </p>
            </div>
          )}

          {compact ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={toggleTimer}
                data-testid="study-pomodoro-start-button"
                className={`min-w-[220px] rounded-2xl px-6 py-4 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.99] ${
                  isRunning
                    ? 'bg-red-500 hover:bg-red-600'
                    : timeLeft < totalSeconds
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
                aria-label={isRunning ? 'Pausar' : status === 'paused' ? 'Continuar' : 'Iniciar'}
              >
                {isRunning ? 'Pausar foco' : timeLeft < totalSeconds ? 'Continuar foco' : 'Iniciar foco'}
              </button>

              <button
                onClick={resetTimer}
                data-testid="study-pomodoro-reset-button"
                className="rounded-2xl px-5 py-4 text-sm font-semibold text-slate-200 border border-slate-700 bg-slate-900/70 hover:bg-slate-800"
                aria-label="Resetar"
              >
                Reiniciar
              </button>
            </div>
          ) : (
            <div className="flex gap-3 justify-center">
              <button
                onClick={toggleTimer}
                data-testid="study-pomodoro-start-button"
                className={`
                  h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-md
                  transition-all hover:scale-105 active:scale-95
                  ${
                    isRunning
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-100 dark:shadow-red-900/30'
                      : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100 dark:shadow-emerald-900/30'
                  }
                `}
                aria-label={isRunning ? 'Pausar' : status === 'paused' ? 'Continuar' : 'Iniciar'}
              >
                {isRunning ? (
                  <Pause size={24} fill="currentColor" />
                ) : (
                  <Play size={24} fill="currentColor" className="ml-0.5" />
                )}
              </button>

              <button
                onClick={resetTimer}
                data-testid="study-pomodoro-reset-button"
                  className="h-14 w-14 rounded-2xl flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-all hover:scale-105 active:scale-95"
                aria-label="Resetar"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          )}

          {(isRunning || status === 'paused') && (
            <p className={`mt-5 text-center text-xs ${compact ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {mode === 'focus'
                ? `Concentre-se em ${compact ? resolvedSubjectLabel : cycleDisciplineLabels[effectiveSubject].label}`
                : mode === 'shortBreak'
                  ? 'Descanse um pouco'
                  : 'Recarregue as energias'}
            </p>
          )}

          {compact && (
            <p className="mt-4 text-center text-xs text-slate-500">
              Quando terminar este bloco, voce valida com questoes logo abaixo.
            </p>
          )}

          {!compact && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
              Ciclos de foco concluidos: <strong>{completedFocusCycles}</strong>
            </p>
          )}
        </div>

        {!compact && (
          <div className="px-6 pb-5">
            <div className="space-y-1 rounded-xl bg-slate-100/95 p-4 text-xs text-slate-600 dark:bg-slate-800/80 dark:text-slate-400">
              <p className="mb-2 flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <Info className="w-4 h-4" /> Como usar o Pomodoro?
              </p>
              <p>
                • <strong className="text-gray-700 dark:text-gray-300">Foco ({effectiveFocusMinutes}min):</strong>{' '}
                Concentre-se totalmente em uma materia
              </p>
              <p>
                • <strong className="text-gray-700 dark:text-gray-300">Pausa Curta ({selectedMethod.breakMinutes}min):</strong>{' '}
                Descanse apos cada ciclo
              </p>
              <p>
                • <strong className="text-gray-700 dark:text-gray-300">Pausa Longa ({effectiveLongBreakMinutes}min):</strong>{' '}
                Recarregue apos estudos intensos
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
