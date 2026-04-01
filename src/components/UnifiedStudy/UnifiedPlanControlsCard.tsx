import React from 'react';
import { AlertTriangle, CheckCircle2, Cloud, Package } from 'lucide-react';
import { ModeSelector } from '../Timer/ModeSelector';
import type { StudyTrackLabel } from '../../utils/disciplineLabels';

type StudyMode = 'pomodoro' | 'livre';
type PreferencesSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

interface UnifiedPlanControlsCardProps {
  eyebrow: string;
  description: string;
  currentMode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  preferredStudyTrack: StudyTrackLabel;
  onTrackChange: (track: StudyTrackLabel) => void;
  hybridEnemWeight: number;
  hybridConcursoWeight: number;
  onHybridEnemWeightChange: (weight: number) => void;
  weeklyGoalMinutes: number;
  onWeeklyGoalMinutesChange: (minutes: number) => void;
  activeStudyMethodName: string;
  showModeBadge?: boolean;
  showSyncStatus?: boolean;
  preferencesSyncStatus?: PreferencesSyncStatus;
}

const TRACK_LABELS: Record<StudyTrackLabel, string> = {
  enem: 'ENEM',
  concursos: 'Concurso',
  hibrido: 'Hibrido',
};

export const UnifiedPlanControlsCard: React.FC<UnifiedPlanControlsCardProps> = ({
  eyebrow,
  description,
  currentMode,
  onModeChange,
  preferredStudyTrack,
  onTrackChange,
  hybridEnemWeight,
  hybridConcursoWeight,
  onHybridEnemWeightChange,
  weeklyGoalMinutes,
  onWeeklyGoalMinutesChange,
  activeStudyMethodName,
  showModeBadge = false,
  showSyncStatus = false,
  preferencesSyncStatus = 'local',
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {eyebrow}
      </p>
      <div className="mt-4">
        <ModeSelector currentMode={currentMode} onModeChange={onModeChange} />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Configuracao do estudo
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
        {showModeBadge ? (
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full border"
            style={{
              color: 'var(--color-primary)',
              borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
            }}
          >
            Modo ativo: {TRACK_LABELS[preferredStudyTrack]}
          </span>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900">
        <div className="grid grid-cols-3 gap-1.5">
          {(['enem', 'concursos', 'hibrido'] as const).map((track) => (
            <button
              key={track}
              type="button"
              onClick={() => onTrackChange(track)}
              className={`px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                preferredStudyTrack === track
                  ? 'text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              style={preferredStudyTrack === track ? { backgroundColor: 'var(--color-primary)' } : undefined}
            >
              {TRACK_LABELS[track]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {preferredStudyTrack === 'hibrido' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">
              Peso por objetivo
            </p>
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              <span>ENEM: {hybridEnemWeight}%</span>
              <span>Concurso: {hybridConcursoWeight}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={hybridEnemWeight}
              onChange={(event) => onHybridEnemWeightChange(Number(event.target.value))}
              className="w-full accent-[var(--color-primary)]"
            />
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">
            Meta semanal
          </p>
          <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            <span>{weeklyGoalMinutes} min/semana</span>
            <span>{activeStudyMethodName}</span>
          </div>
          <input
            type="range"
            min={300}
            max={2400}
            step={30}
            value={weeklyGoalMinutes}
            onChange={(event) => onWeeklyGoalMinutesChange(Number(event.target.value))}
            className="w-full accent-[var(--color-primary)]"
          />
        </div>
      </div>

      {showSyncStatus ? (
        <div className="mt-4 text-xs rounded-lg bg-white border border-slate-200 p-3 dark:bg-slate-900 dark:border-slate-700">
          {preferencesSyncStatus === 'syncing' ? (
            <p className="text-sky-600 dark:text-sky-300 inline-flex items-center gap-1">
              <Cloud className="w-3.5 h-3.5" />
              Sincronizando preferencias na nuvem...
            </p>
          ) : null}
          {preferencesSyncStatus === 'synced' ? (
            <p className="text-emerald-600 dark:text-emerald-300 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Preferencias sincronizadas com a nuvem.
            </p>
          ) : null}
          {preferencesSyncStatus === 'error' ? (
            <p className="text-amber-600 dark:text-amber-300 inline-flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Modo local ativo. A sincronizacao sera retomada quando possivel.
            </p>
          ) : null}
          {preferencesSyncStatus === 'local' ? (
            <p className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              Preferencias salvas localmente neste dispositivo.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default UnifiedPlanControlsCard;
