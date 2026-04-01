import React from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Cloud,
  Package,
  Scale,
  Target,
} from 'lucide-react';
import type { StudyTrackLabel } from '../../utils/disciplineLabels';

export type FocusPreferencesSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

interface SessionContextCardProps {
  darkMode?: boolean;
  preferredStudyTrack: StudyTrackLabel;
  onTrackChange: (track: StudyTrackLabel) => void;
  hybridEnemWeight: number;
  hybridConcursoWeight: number;
  onHybridEnemWeightChange: (weight: number) => void;
  weeklyGoalMinutes: number;
  onWeeklyGoalMinutesChange: (minutes: number) => void;
  activeStudyMethodName: string;
  preferencesSyncStatus: FocusPreferencesSyncStatus;
  lastPreferencesSyncAt: string | null;
}

export const SessionContextCard: React.FC<SessionContextCardProps> = ({
  darkMode = false,
  preferredStudyTrack,
  onTrackChange,
  hybridEnemWeight,
  hybridConcursoWeight,
  onHybridEnemWeightChange,
  weeklyGoalMinutes,
  onWeeklyGoalMinutesChange,
  activeStudyMethodName,
  preferencesSyncStatus,
  lastPreferencesSyncAt,
}) => {
  const activeTrackLabel =
    preferredStudyTrack === 'enem'
      ? 'ENEM'
      : preferredStudyTrack === 'concursos'
        ? 'Concurso'
        : 'Hibrido';

  return (
    <section className={`rounded-[30px] border p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6 ${
      darkMode
        ? 'border-slate-800 bg-slate-950/92 shadow-[0_18px_40px_rgba(2,6,23,0.45)]'
        : 'border-slate-200/85 bg-[linear-gradient(180deg,rgba(244,247,251,0.98)_0%,rgba(236,242,248,0.96)_100%)] shadow-[0_18px_40px_rgba(148,163,184,0.18)]'
    }`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="inline-flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              Objetivo de estudo
            </span>
          </p>
          <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Defina sua trilha principal e ajuste os pesos da rotina.
          </p>
        </div>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full border"
          style={{
            color: 'var(--color-primary)',
            borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
          }}
        >
          Modo ativo: {activeTrackLabel}
        </span>
      </div>

      <div className={`rounded-2xl border p-1.5 ${darkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200/80 bg-slate-100/72'}`}>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'enem' as const, label: 'ENEM' },
            { id: 'concursos' as const, label: 'Concurso' },
            { id: 'hibrido' as const, label: 'Hibrido' },
          ].map((track) => {
            const active = preferredStudyTrack === track.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => onTrackChange(track.id)}
                className={`px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  active
                    ? 'text-white shadow-sm'
                  : darkMode ? 'text-slate-200 hover:bg-slate-700/70' : 'text-slate-700 hover:bg-white/72'
                }`}
                style={active ? { backgroundColor: 'var(--color-primary)' } : undefined}
              >
                {track.label}
              </button>
            );
          })}
        </div>
        <div className={`mt-2 rounded-xl border px-3 py-2.5 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200/80 bg-white/52 backdrop-blur-sm'}`}>
          <p className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            {preferredStudyTrack === 'enem'
              ? 'ENEM: foco em competencias e provas multidisciplinares.'
              : preferredStudyTrack === 'concursos'
                ? 'Concurso: treino orientado por edital, banca e objetividade.'
                : 'Hibrido: equilibrio dinamico entre ENEM e Concurso.'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {preferredStudyTrack === 'hibrido' ? (
          <div className={`rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200/80 bg-slate-100/78'}`}>
            <p className={`mb-2 text-xs uppercase tracking-[0.12em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="inline-flex items-center gap-1">
                <Scale className="h-3.5 w-3.5" />
                Peso por objetivo
              </span>
            </p>
            <div className={`mb-2 flex items-center justify-between text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
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
            <p className={`mt-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Formula ativa: P = {(hybridEnemWeight / 100).toFixed(2)}E + {(hybridConcursoWeight / 100).toFixed(2)}C
            </p>
          </div>
        ) : (
          <div className={`rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200/80 bg-slate-100/78'}`}>
            <p className={`mb-2 text-xs uppercase tracking-[0.12em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Sessao em curso
            </p>
            <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              {preferredStudyTrack === 'enem' ? 'Execucao por competencias' : 'Execucao por edital e banca'}
            </p>
            <p className={`mt-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              O motor prioriza a trilha ativa antes de recalcular o proximo bloco.
            </p>
          </div>
        )}

        <div className={`rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'}`}>
          <p className={`mb-2 text-xs uppercase tracking-[0.12em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Meta semanal
            </span>
          </p>
          <div className={`mb-2 flex items-center justify-between text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
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

      <div className={`mt-3 rounded-lg border p-3 text-xs ${darkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200/80 bg-slate-100/74'}`}>
        {preferencesSyncStatus === 'syncing' ? (
          <p className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-300">
            <Cloud className="h-3.5 w-3.5" />
            Sincronizando preferencias na nuvem...
          </p>
        ) : null}
        {preferencesSyncStatus === 'synced' ? (
          <p className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Preferencias sincronizadas com a nuvem.
          </p>
        ) : null}
        {preferencesSyncStatus === 'error' ? (
          <p className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            Modo local ativo. A sincronizacao sera retomada quando possivel.
          </p>
        ) : null}
        {preferencesSyncStatus === 'local' ? (
          <p className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Package className="h-3.5 w-3.5" />
            Preferencias salvas localmente neste dispositivo.
          </p>
        ) : null}
        {lastPreferencesSyncAt !== null && preferencesSyncStatus === 'synced' ? (
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Ultima sincronizacao:{' '}
            {lastPreferencesSyncAt
              ? new Date(String(lastPreferencesSyncAt)).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '--:--'}
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default SessionContextCard;
