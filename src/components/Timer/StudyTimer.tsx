import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, Clock3, Lightbulb, BookOpen } from 'lucide-react';
import { useTimer } from '../../hooks/useTimer';
import { formatTime } from '../../utils/helpers';
import { MATERIAS_CONFIG, MateriaTipo } from '../../types';
import { ConfirmModal } from '../UI/ConfirmModal';
import toast from 'react-hot-toast';
import { getCycleDisciplineLabels, type StudyTrackLabel } from '../../utils/disciplineLabels';

const FREE_TIMER_TARGET_SECONDS = 60 * 60;

interface StudyTimerProps {
  onFinishSession: (minutes: number, subject: MateriaTipo) => void;
  preferredTrack?: StudyTrackLabel;
  hybridEnemWeight?: number;
}

export const StudyTimer: React.FC<StudyTimerProps> = ({
  onFinishSession,
  preferredTrack = 'enem',
  hybridEnemWeight = 70,
}) => {
  const { seconds, isRunning, reset, toggle } = useTimer();
  const [selectedSubject, setSelectedSubject] = useState<MateriaTipo>('Anatomia');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const cycleDisciplineLabels = useMemo(
    () => getCycleDisciplineLabels(preferredTrack, hybridEnemWeight),
    [preferredTrack, hybridEnemWeight]
  );
  const previousIsRunningRef = useRef(false);
  const warnedFiveSecondsRef = useRef(false);
  const reachedTargetRef = useRef(false);

  const elapsedSeconds = seconds;
  const progress = Math.min((elapsedSeconds / FREE_TIMER_TARGET_SECONDS) * 100, 100);
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

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

    if (seconds === FREE_TIMER_TARGET_SECONDS - 5 && !warnedFiveSecondsRef.current) {
      warnedFiveSecondsRef.current = true;
      playWarningSound();
    }

    if (seconds >= FREE_TIMER_TARGET_SECONDS && !reachedTargetRef.current) {
      reachedTargetRef.current = true;
      playTargetReachedSound();
      toast.success('Meta de 60 minutos atingida!');
    }
  }, [isRunning, seconds, playWarningSound, playTargetReachedSound]);

  useEffect(() => {
    if (seconds === 0) {
      warnedFiveSecondsRef.current = false;
      reachedTargetRef.current = false;
    }
  }, [seconds]);

  const handleFinish = () => {
    const minutes = Math.floor(seconds / 60);
    
    if (minutes === 0) {
      toast.error('Estude pelo menos 1 minuto antes de finalizar');
      return;
    }

    setShowFinishModal(true);
  };

  const confirmFinish = () => {
    const minutes = Math.floor(seconds / 60);
    onFinishSession(minutes, selectedSubject);
    reset();
    setShowFinishModal(false);
  };

  const handleReset = () => {
    if (seconds > 0) {
      setShowResetModal(true);
    }
  };

  const confirmReset = () => {
    reset();
    toast.success('Cronômetro resetado');
    setShowResetModal(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="h-1 w-full bg-gray-100 dark:bg-gray-700">
        <div
          className="h-full bg-blue-500 transition-all duration-700 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          <span className="inline-flex items-center gap-2"><Clock3 className="w-6 h-6" /> Cronômetro de Estudos</span>
        </h2>

        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center inline-flex items-center justify-center gap-2 w-full">
            <BookOpen className="w-3.5 h-3.5" />
            Matéria do Ciclo
          </p>
          <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-center">
            {(Object.keys(MATERIAS_CONFIG) as MateriaTipo[]).map((key) => {
              const config = MATERIAS_CONFIG[key];
              const discipline = cycleDisciplineLabels[key];
              const DisciplineIcon = discipline.Icon;
              const isSelected = selectedSubject === key;
              return (
                <button
                  key={key}
                  onClick={() => !isRunning && setSelectedSubject(key)}
                  disabled={isRunning}
                  title={discipline.label}
                  className={`
                    flex flex-col items-center p-2 sm:p-2.5 rounded-xl border-2 transition-all min-w-[56px] sm:min-w-[60px]
                    ${isSelected
                      ? `${config.bgColor} ${config.borderColor} ring-1 ring-current scale-105`
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 opacity-60 hover:opacity-100'}
                    ${isRunning ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                  `}
                >
                  <DisciplineIcon className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 sm:mb-1" />
                  <span className={`text-[9px] sm:text-[10px] font-medium ${isSelected ? config.color : 'text-gray-500'}`}>
                    {discipline.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-center text-xs mt-3 text-gray-400">
            Estudando: <strong className={`${MATERIAS_CONFIG[selectedSubject].color} inline-flex items-center gap-1`}>{React.createElement(cycleDisciplineLabels[selectedSubject].Icon, { className: 'w-3.5 h-3.5' })}{cycleDisciplineLabels[selectedSubject].label}</strong>
          </p>
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
                className="stroke-blue-500 transition-all duration-700 ease-linear"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-gray-900 dark:text-white">
                {formatTime(seconds)}
              </span>
              <span className={`text-xs font-medium uppercase tracking-widest mt-1 ${
                isRunning ? 'text-emerald-500' : 'text-gray-400'
              }`}>
                {isRunning ? '● rodando' : 'pausado'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center mb-4">
          <button
            onClick={toggle}
            className={`
              h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-md
              transition-all hover:scale-105 active:scale-95
              ${isRunning
                ? 'bg-red-500 hover:bg-red-600 shadow-red-100 dark:shadow-red-900/30'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100 dark:shadow-emerald-900/30'
              }
            `}
            aria-label={isRunning ? 'Pausar' : 'Iniciar'}
          >
            {isRunning
              ? <Pause size={24} fill="currentColor" />
              : <Play size={24} fill="currentColor" className="ml-0.5" />
            }
          </button>

          <button
            onClick={handleReset}
            disabled={seconds === 0}
            className="h-14 w-14 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-600 dark:hover:text-gray-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Resetar"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        <button
          onClick={handleFinish}
          disabled={seconds === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle size={20} />
          <span>Finalizar Sessão</span>
        </button>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-5">
          <span className="inline-flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> A cada minuto estudado você ganha <strong className="text-gray-700 dark:text-gray-200">10 pontos</strong>.</span>
        </p>
      </div>

      <ConfirmModal
        open={showFinishModal}
        title="Finalizar Sessão"
        message={`Finalizar sessão de ${Math.floor(seconds / 60)} minuto${Math.floor(seconds / 60) !== 1 ? 's' : ''} de ${cycleDisciplineLabels[selectedSubject].label}?`}
        confirmLabel="Finalizar"
        variant="success"
        onConfirm={confirmFinish}
        onCancel={() => setShowFinishModal(false)}
      />

      <ConfirmModal
        open={showResetModal}
        title="Resetar Cronômetro"
        message="Tem certeza que deseja resetar o cronômetro? O tempo atual será perdido."
        confirmLabel="Resetar"
        variant="warning"
        onConfirm={confirmReset}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
};
