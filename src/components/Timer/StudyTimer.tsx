import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle,
  Clock3,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStudySessionMachine } from '../../hooks/useStudySessionMachine';
import { MATERIAS_CONFIG, MateriaTipo } from '../../types';
import { getCycleDisciplineLabels, type StudyTrackLabel } from '../../utils/disciplineLabels';
import { formatTime } from '../../utils/helpers';
import { ConfirmModal } from '../UI/ConfirmModal';

const FREE_TIMER_TARGET_SECONDS = 60 * 60;

interface StudyTimerProps {
  onFinishSession: (minutes: number, subject: MateriaTipo) => void;
  preferredTrack?: StudyTrackLabel;
  hybridEnemWeight?: number;
  compact?: boolean;
  displaySubjectLabel?: string;
  sessionStorageScope?: string;
  userEmail?: string;
}

export const StudyTimer: React.FC<StudyTimerProps> = ({
  onFinishSession,
  preferredTrack = 'enem',
  hybridEnemWeight = 70,
  compact = false,
  displaySubjectLabel,
  sessionStorageScope = 'default',
  userEmail,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<MateriaTipo>('Anatomia');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const cycleDisciplineLabels = useMemo(
    () => getCycleDisciplineLabels(preferredTrack, hybridEnemWeight),
    [preferredTrack, hybridEnemWeight],
  );

  const {
    session,
    status,
    isRunning,
    elapsedFocusMs,
    progressPercent,
    start,
    pause,
    resume,
    complete,
    cancel,
    clear,
  } = useStudySessionMachine({
    storageKey: `study-timer-session_${sessionStorageScope}`,
    exclusiveStorageKeys: [`pomodoro-session_${sessionStorageScope}`],
    source: 'study_timer',
    kind: 'countup',
    plannedDurationMs: FREE_TIMER_TARGET_SECONDS * 1000,
    phase: 'focus',
    subject: selectedSubject,
    userEmail,
  });

  const previousIsRunningRef = useRef(false);
  const warnedFiveSecondsRef = useRef(false);
  const reachedTargetRef = useRef(false);

  const elapsedSeconds = Math.floor(elapsedFocusMs / 1000);
  const progress = progressPercent;
  const sessionLocked = status === 'running' || status === 'paused';
  const resolvedSubjectLabel =
    displaySubjectLabel || cycleDisciplineLabels[selectedSubject].label;

  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    if (session?.subject && session.subject !== selectedSubject) {
      setSelectedSubject(session.subject);
    }
  }, [selectedSubject, session?.subject]);

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

  const playTargetReachedSound = useCallback(() => {
    playTone(620, 0.12, 0.05);
    setTimeout(() => playTone(820, 0.14, 0.05), 130);
    setTimeout(() => playTone(980, 0.16, 0.05), 280);
  }, [playTone]);

  useEffect(() => {
    if (isRunning && !previousIsRunningRef.current) {
      playStartSound();
    }
    previousIsRunningRef.current = isRunning;
  }, [isRunning, playStartSound]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (elapsedSeconds === FREE_TIMER_TARGET_SECONDS - 5 && !warnedFiveSecondsRef.current) {
      warnedFiveSecondsRef.current = true;
      playWarningSound();
    }

    if (elapsedSeconds >= FREE_TIMER_TARGET_SECONDS && !reachedTargetRef.current) {
      reachedTargetRef.current = true;
      playTargetReachedSound();
      toast.success('Meta de 60 minutos atingida!');
    }
  }, [elapsedSeconds, isRunning, playTargetReachedSound, playWarningSound]);

  useEffect(() => {
    if (elapsedSeconds === 0) {
      warnedFiveSecondsRef.current = false;
      reachedTargetRef.current = false;
    }
  }, [elapsedSeconds]);

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
      subject: selectedSubject,
      phase: 'focus',
      plannedDurationMs: FREE_TIMER_TARGET_SECONDS * 1000,
    });
  };

  const handleFinish = () => {
    const minutes = Math.floor(elapsedFocusMs / 60000);

    if (minutes === 0) {
      toast.error('Estude pelo menos 1 minuto antes de finalizar');
      return;
    }

    setShowFinishModal(true);
  };

  const confirmFinish = () => {
    const minutes = Math.floor(elapsedFocusMs / 60000);
    complete();
    onFinishSession(minutes, selectedSubject);
    clear();
    setShowFinishModal(false);
  };

  const handleReset = () => {
    if (elapsedSeconds > 0) {
      setShowResetModal(true);
    }
  };

  const confirmReset = () => {
    cancel();
    clear();
    toast.success('Cronometro resetado');
    setShowResetModal(false);
  };

  return (
    <div
      className={`${
        compact
          ? 'bg-[#0B1220] border border-slate-800 text-white shadow-[0_18px_48px_-24px_rgba(2,6,23,0.95)]'
          : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'
      } rounded-3xl overflow-hidden`}
      data-testid="study-free-timer-ready"
      data-study-session-source="study_timer"
      data-study-session-status={status}
    >
      <div className={`h-1 w-full ${compact ? 'bg-slate-900/80' : 'bg-gray-100 dark:bg-gray-700'}`}>
        <div
          className="h-full bg-blue-500 transition-all duration-700 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className={compact ? 'p-5 sm:p-6' : 'p-6'}>
        {!compact && (
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            <span className="inline-flex items-center gap-2">
              <Clock3 className="w-6 h-6" /> Cronometro de Estudos
            </span>
          </h2>
        )}

        <div className="mb-6">
          {compact && (
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Bloco atual
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{resolvedSubjectLabel}</p>
            </div>
          )}

          {!compact && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center inline-flex items-center justify-center gap-2 w-full">
              <BookOpen className="w-3.5 h-3.5" />
              Materia do Ciclo
            </p>
          )}

          {!compact && (
            <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-center">
              {(Object.keys(MATERIAS_CONFIG) as MateriaTipo[]).map((key) => {
                const config = MATERIAS_CONFIG[key];
                const discipline = cycleDisciplineLabels[key];
                const DisciplineIcon = discipline.Icon;
                const isSelected = selectedSubject === key;

                return (
                  <button
                    key={key}
                    onClick={() => !sessionLocked && setSelectedSubject(key)}
                    disabled={sessionLocked}
                    title={discipline.label}
                    className={`
                      flex flex-col items-center p-2 sm:p-2.5 rounded-xl border-2 transition-all min-w-[56px] sm:min-w-[60px]
                      ${
                        isSelected
                          ? `${config.bgColor} ${config.borderColor} ring-1 ring-current scale-105`
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 opacity-60 hover:opacity-100'
                      }
                      ${sessionLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                    `}
                  >
                    <DisciplineIcon className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 sm:mb-1" />
                    <span
                      className={`text-[9px] sm:text-[10px] font-medium ${
                        isSelected ? config.color : 'text-gray-500'
                      }`}
                    >
                      {discipline.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-center text-xs mt-3 text-gray-400">
            Estudando:{' '}
            <strong
              className={`${
                !compact ? MATERIAS_CONFIG[selectedSubject].color : 'text-slate-200'
              } inline-flex items-center gap-1`}
            >
              {!compact &&
                React.createElement(cycleDisciplineLabels[selectedSubject].Icon, {
                  className: 'w-3.5 h-3.5',
                })}
              {resolvedSubjectLabel}
            </strong>
          </p>
        </div>

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
                className={compact ? 'stroke-slate-800' : 'stroke-gray-100 dark:stroke-gray-700'}
              />
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                className="stroke-blue-500 transition-all duration-700 ease-linear"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={
                  compact
                    ? 'text-5xl sm:text-6xl font-bold font-mono tracking-tight text-white'
                    : 'text-4xl sm:text-5xl font-bold font-mono tracking-tight text-gray-900 dark:text-white'
                }
              >
                {formatTime(elapsedSeconds)}
              </span>
              <span
                className={`text-xs font-medium uppercase tracking-widest mt-1 ${
                  isRunning ? 'text-emerald-400' : compact ? 'text-slate-500' : 'text-gray-400'
                }`}
              >
                {isRunning ? 'rodando' : elapsedSeconds > 0 ? 'pausado' : 'pronto'}
              </span>
            </div>
          </div>
        </div>

        {compact ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center mb-4">
            <button
              onClick={toggleTimer}
              data-testid="study-free-start-button"
              className={`min-w-[220px] rounded-2xl px-6 py-4 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.99] ${
                isRunning
                  ? 'bg-red-500 hover:bg-red-600'
                  : elapsedSeconds > 0
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
              aria-label={isRunning ? 'Pausar' : status === 'paused' ? 'Continuar' : 'Iniciar'}
            >
              {isRunning ? 'Pausar foco' : elapsedSeconds > 0 ? 'Continuar foco' : 'Iniciar foco'}
            </button>

            <button
              onClick={handleReset}
              disabled={elapsedSeconds === 0}
              data-testid="study-free-reset-button"
              className="rounded-2xl px-5 py-4 text-sm font-semibold text-slate-200 border border-slate-700 bg-slate-900/70 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Resetar"
            >
              Reiniciar
            </button>
          </div>
        ) : (
          <div className="flex gap-3 justify-center mb-4">
            <button
              onClick={toggleTimer}
              data-testid="study-free-start-button"
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
              onClick={handleReset}
              disabled={elapsedSeconds === 0}
              data-testid="study-free-reset-button"
              className="h-14 w-14 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-600 dark:hover:text-gray-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Resetar"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        )}

        <button
          onClick={handleFinish}
          data-testid="study-free-finish-button"
          disabled={elapsedSeconds === 0}
          className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            compact
              ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <CheckCircle size={20} />
          <span>Finalizar Sessao</span>
        </button>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-5">
          <span className="inline-flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5" /> A cada minuto estudado voce ganha{' '}
            <strong className="text-gray-700 dark:text-gray-200">10 pontos</strong>.
          </span>
        </p>

        {compact && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Termine este bloco e siga direto para validar o que acabou de estudar.
          </p>
        )}
      </div>

      <ConfirmModal
        open={showFinishModal}
        title="Finalizar Sessao"
        message={`Finalizar sessao de ${Math.floor(elapsedFocusMs / 60000)} minuto${
          Math.floor(elapsedFocusMs / 60000) !== 1 ? 's' : ''
        } de ${cycleDisciplineLabels[selectedSubject].label}?`}
        confirmLabel="Finalizar"
        variant="success"
        onConfirm={confirmFinish}
        onCancel={() => setShowFinishModal(false)}
      />

      <ConfirmModal
        open={showResetModal}
        title="Resetar Cronometro"
        message="Tem certeza que deseja resetar o cronometro? O tempo atual sera perdido."
        confirmLabel="Resetar"
        variant="warning"
        onConfirm={confirmReset}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
};
