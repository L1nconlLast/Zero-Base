import React from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Brain,
  Clock3,
  Flame,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import type { UserData } from '../../types';
import { STUDY_METHODS } from '../../data/studyMethods';
import {
  getDisplayDiscipline,
  resolveTrackedDisciplineLabel,
  type StudyTrackLabel,
} from '../../utils/disciplineLabels';
import { predictNextLevel } from '../../utils/levelPrediction';
import { getSubjectPalette, withAlpha } from '../../utils/subjectPalette';
import {
  buildWeeklyStudySnapshot,
  getSessionMinutes,
} from '../../utils/weeklyStudySnapshot';

interface DashboardProps {
  userData: UserData;
  todayMinutes: number;
  userName: string;
  darkMode?: boolean;
  preferredTrack?: StudyTrackLabel;
  hybridEnemWeight?: number;
  onStartFocusSession: () => void;
  onStartLongSession: () => void;
  onOpenQuestions: () => void;
  onOpenFlashcards: () => void;
}

interface DailyPulse {
  key: string;
  label: string;
  minutes: number;
  isToday: boolean;
}

interface SubjectBreakdown {
  subject: string;
  minutes: number;
  sessions: number;
  share: number;
}

type TrendDirection = 'up' | 'down' | 'flat';

const DAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

const formatMinutes = (minutes: number): string => {
  if (!minutes) {
    return '0 min';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) {
    return `${minutes} min`;
  }

  if (!remainingMinutes) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
};

const formatChange = (
  currentMinutes: number,
  previousMinutes: number,
): { label: string; helper: string; direction: TrendDirection } => {
  if (currentMinutes <= 0 && previousMinutes <= 0) {
    return {
      label: 'Sem mudanca',
      helper: 'Sua semana ainda nao tem sessoes suficientes para comparar.',
      direction: 'flat',
    };
  }

  if (previousMinutes <= 0 && currentMinutes > 0) {
    return {
      label: '+100%',
      helper: 'Primeira semana com ritmo claro registrado.',
      direction: 'up',
    };
  }

  const delta = currentMinutes - previousMinutes;
  if (delta === 0) {
    return {
      label: '0%',
      helper: 'Seu volume ficou estavel em relacao a semana passada.',
      direction: 'flat',
    };
  }

  const percentage = Math.round((delta / previousMinutes) * 100);

  if (percentage > 0) {
    return {
      label: `+${percentage}%`,
      helper: `Voce estudou ${formatMinutes(delta)} a mais do que na semana passada.`,
      direction: 'up',
    };
  }

  return {
    label: `${percentage}%`,
    helper: `Seu ritmo caiu ${formatMinutes(Math.abs(delta))} em relacao a semana passada.`,
    direction: 'down',
  };
};

const getRecommendedMethod = (averageSessionMinutes: number) => {
  if (averageSessionMinutes >= 80) {
    return STUDY_METHODS.find((method) => method.id === 'deep-work') || STUDY_METHODS[0];
  }

  if (averageSessionMinutes >= 45) {
    return STUDY_METHODS.find((method) => method.id === '52-17') || STUDY_METHODS[0];
  }

  return STUDY_METHODS.find((method) => method.id === 'pomodoro') || STUDY_METHODS[0];
};

export const Dashboard: React.FC<DashboardProps> = ({
  userData,
  todayMinutes,
  userName,
  darkMode = false,
  preferredTrack = 'enem',
  hybridEnemWeight = 70,
  onStartFocusSession,
  onStartLongSession,
  onOpenQuestions,
  onOpenFlashcards,
}) => {
  const sessions = React.useMemo(
    () => (userData.sessions?.length ? userData.sessions : userData.studyHistory || []),
    [userData.sessions, userData.studyHistory],
  );

  const {
    weekMinutes,
    previousWeekMinutes,
    totalMinutes,
    totalSessions,
    averageSessionMinutes,
    activeDaysThisWeek,
    bestDay,
    dailyPulse,
    subjectBreakdown,
  } = React.useMemo(() => {
    const snapshot = buildWeeklyStudySnapshot(sessions);
    const trackedSessions = sessions.filter((session) => getSessionMinutes(session) > 0);
    const minutesAllTime = trackedSessions.reduce((sum, session) => sum + getSessionMinutes(session), 0);
    const nextDailyPulse: DailyPulse[] = snapshot.daily.map((day) => ({
      key: day.dateKey,
      label: DAY_FORMATTER.format(day.date).replace('.', '').slice(0, 3),
      minutes: day.minutes,
      isToday: day.isToday,
    }));
    const nextSubjectBreakdownMap = snapshot.subjectBreakdown.reduce<Record<string, SubjectBreakdown>>((acc, entry) => {
      const subject = resolveTrackedDisciplineLabel(entry.subject, preferredTrack, hybridEnemWeight);
      const current = acc[subject];

      if (!current) {
        acc[subject] = {
          subject,
          minutes: entry.minutes,
          sessions: entry.sessions,
          share: 0,
        };
        return acc;
      }

      current.minutes += entry.minutes;
      current.sessions += entry.sessions;
      return acc;
    }, {});

    const nextSubjectBreakdown: SubjectBreakdown[] = Object.values(nextSubjectBreakdownMap)
      .map((entry) => ({
        ...entry,
        share: snapshot.totalMinutes > 0 ? Math.round((entry.minutes / snapshot.totalMinutes) * 100) : 0,
      }))
      .sort((left, right) => right.minutes - left.minutes)
      .slice(0, 5);

    return {
      weekMinutes: snapshot.totalMinutes,
      previousWeekMinutes: snapshot.previousTotalMinutes,
      totalMinutes: minutesAllTime,
      totalSessions: trackedSessions.length,
      averageSessionMinutes: trackedSessions.length ? Math.round(minutesAllTime / trackedSessions.length) : 0,
      activeDaysThisWeek: snapshot.activeDays,
      bestDay: snapshot.bestDay,
      dailyPulse: nextDailyPulse,
      subjectBreakdown: nextSubjectBreakdown,
    };
  }, [hybridEnemWeight, preferredTrack, sessions]);

  const streakDays = Math.max(userData.currentStreak || 0, userData.streak || 0);
  const dailyGoalMinutes = userData.dailyGoal || 180;
  const weeklyGoalMinutes = dailyGoalMinutes * 7;
  const weeklyGoalProgress = weeklyGoalMinutes > 0 ? Math.min(100, Math.round((weekMinutes / weeklyGoalMinutes) * 100)) : 0;
  const weeklyChange = React.useMemo(
    () => formatChange(weekMinutes, previousWeekMinutes),
    [previousWeekMinutes, weekMinutes],
  );
  const nextLevelPrediction = React.useMemo(
    () => predictNextLevel(userData.totalPoints, sessions),
    [sessions, userData.totalPoints],
  );
  const recommendedMethod = React.useMemo(
    () => getRecommendedMethod(averageSessionMinutes),
    [averageSessionMinutes],
  );
  const topSubject = subjectBreakdown[0];
  const topSubjectDisplay = topSubject ? getDisplayDiscipline(topSubject.subject) : null;
  const topSubjectPalette = getSubjectPalette(topSubject?.subject || 'Outra');
  const strongestPulse = Math.max(...dailyPulse.map((entry) => entry.minutes), 1);
  const weeklyAverageMinutes = Math.round(weekMinutes / 7);
  const weeklySignalCopy =
    weekMinutes >= weeklyGoalMinutes
      ? 'Meta semanal batida. Este e o melhor momento para transformar volume em consistencia.'
      : `Faltam ${formatMinutes(Math.max(weeklyGoalMinutes - weekMinutes, 0))} para bater sua meta semanal.`;

  return (
    <div className="space-y-5">
      <section className={`overflow-hidden rounded-[26px] border shadow-[0_22px_50px_-28px_rgba(100,116,139,0.26)] ${
        darkMode
          ? 'border-slate-800/80 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_right,rgba(59,130,246,0.10),transparent_28%),linear-gradient(145deg,rgba(15,23,42,0.98),rgba(17,24,39,0.98)_58%,rgba(2,6,23,0.98))] shadow-[0_26px_70px_-32px_rgba(2,6,23,0.52)]'
          : 'border-slate-300/80 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_35%),radial-gradient(circle_at_right,rgba(14,165,233,0.10),transparent_28%),linear-gradient(145deg,rgba(230,237,245,0.98),rgba(220,229,239,0.98)_58%,rgba(226,234,242,0.96))]'
      }`}>
        <div className="grid gap-6 px-5 py-6 lg:px-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(290px,0.95fr)]">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${
              darkMode
                ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200'
                : 'border-sky-300/80 bg-sky-100/80 text-sky-700'
            }`}>
              <Sparkles className="h-3.5 w-3.5" />
              Painel de progresso
            </div>

            <div className="mt-5 max-w-3xl">
              <p className={`text-sm font-medium ${darkMode ? 'text-cyan-200/80' : 'text-sky-700/80'}`}>Ola, {userName.split(' ')[0] || 'estudante'}</p>
              <h2 className={`mt-2 text-[30px] font-semibold tracking-tight sm:text-[36px] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                Seu esforco esta ficando visivel.
              </h2>
              <p className={`mt-3 max-w-2xl text-sm leading-6 sm:text-base ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Hoje voce soma {formatMinutes(todayMinutes)}. Na semana, ja acumulou {formatMinutes(weekMinutes)} em{' '}
                {activeDaysThisWeek} dias ativos, com um ritmo {weeklyChange.direction === 'down' ? 'mais baixo' : weeklyChange.direction === 'up' ? 'melhor' : 'estavel'} do que na semana passada.
              </p>
            </div>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              <div className={`rounded-2xl border p-3.5 backdrop-blur-sm ${darkMode ? 'border-slate-700/80 bg-slate-900/72' : 'border-slate-300/80 bg-white/76'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Hoje</span>
                  <Clock3 className="h-4 w-4 text-sky-600" />
                </div>
                <p className={`mt-2.5 text-[28px] font-semibold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>{formatMinutes(todayMinutes)}</p>
                <p className={`mt-1.5 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Meta diaria: {formatMinutes(dailyGoalMinutes)}</p>
              </div>

              <div className={`rounded-2xl border p-3.5 backdrop-blur-sm ${darkMode ? 'border-slate-700/80 bg-slate-900/72' : 'border-slate-300/80 bg-white/76'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Semana</span>
                  <Target className="h-4 w-4 text-cyan-600" />
                </div>
                <p className={`mt-2.5 text-[28px] font-semibold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>{formatMinutes(weekMinutes)}</p>
                <p className={`mt-1.5 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{weeklyGoalProgress}% da meta semanal</p>
              </div>

              <div className={`rounded-2xl border p-3.5 backdrop-blur-sm ${darkMode ? 'border-slate-700/80 bg-slate-900/72' : 'border-slate-300/80 bg-white/76'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Evolucao</span>
                  {weeklyChange.direction === 'down' ? (
                    <ArrowDownRight className="h-4 w-4 text-rose-500" />
                  ) : weeklyChange.direction === 'up' ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                  )}
                </div>
                <p className={`mt-2.5 text-[28px] font-semibold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>{weeklyChange.label}</p>
                <p className={`mt-1.5 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{weeklyChange.helper}</p>
              </div>

              <div className={`rounded-2xl border p-3.5 backdrop-blur-sm ${darkMode ? 'border-slate-700/80 bg-slate-900/72' : 'border-slate-300/80 bg-white/76'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Streak</span>
                  <Flame className="h-4 w-4 text-amber-500" />
                </div>
                <p className={`mt-2.5 text-[28px] font-semibold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>{streakDays} dias</p>
                <p className={`mt-1.5 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {streakDays > 0 ? 'Voce esta mantendo o habito ativo.' : 'A primeira sessao ja libera sua sequencia.'}
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-[24px] border p-4 shadow-[0_16px_30px_-22px_rgba(56,189,248,0.22)] ${
            darkMode
              ? 'border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(17,24,39,0.94))]'
              : 'border-slate-300/80 bg-[linear-gradient(180deg,rgba(239,245,250,0.96),rgba(226,235,243,0.94))]'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pulso da semana</p>
                <h3 className={`mt-2 text-xl font-semibold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>Horas que viram progresso</h3>
              </div>
              <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${darkMode ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-emerald-300 bg-emerald-100/85 text-emerald-700'}`}>
                {activeDaysThisWeek}/7 dias ativos
              </div>
            </div>

            <div className="mt-5 flex items-end gap-1.5">
              {dailyPulse.map((entry) => (
                <div key={entry.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className={`flex h-28 w-full items-end rounded-2xl px-1.5 pb-1.5 ${darkMode ? 'bg-slate-800/90' : 'bg-slate-200/85'}`}>
                    <div
                      className={`w-full rounded-xl transition-all duration-500 ${entry.isToday ? 'bg-gradient-to-t from-cyan-500 to-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.28)]' : 'bg-gradient-to-t from-slate-500 to-slate-300'}`}
                      style={{
                        height: `${Math.max(14, Math.round((entry.minutes / strongestPulse) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${entry.isToday ? (darkMode ? 'text-cyan-300' : 'text-sky-700') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                      {entry.label}
                    </p>
                    <p className={`mt-1 text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{entry.minutes ? formatMinutes(entry.minutes) : '0 min'}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={`mt-5 rounded-2xl border p-3.5 ${darkMode ? 'border-slate-700/80 bg-slate-900/72' : 'border-slate-300/80 bg-white/72'}`}>
              <div className="flex items-center justify-between text-sm">
                <span className={`font-medium ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Meta semanal</span>
                <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>{formatMinutes(weekMinutes)} / {formatMinutes(weeklyGoalMinutes)}</span>
              </div>
              <div className={`mt-3 h-3 overflow-hidden rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-300 transition-all duration-700"
                  style={{ width: `${Math.max(6, weeklyGoalProgress)}%` }}
                />
              </div>
              <p className={`mt-3 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{weeklySignalCopy}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.94fr)_minmax(260px,0.78fr)]">
        <div className={`rounded-2xl border p-5 shadow-[0_12px_28px_-18px_rgba(100,116,139,0.24)] ${
          darkMode
            ? 'border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(17,24,39,0.94))]'
            : 'border-slate-300/80 bg-[linear-gradient(180deg,rgba(233,240,246,0.98),rgba(223,232,241,0.96))]'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Distribuicao da semana</p>
              <h3 className={`mt-2 text-xl font-semibold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>Horas por materia</h3>
            </div>
            {topSubjectDisplay ? (
              <div
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}
                style={{
                  backgroundColor: darkMode ? withAlpha(topSubjectPalette.hex, 0.16) : withAlpha(topSubjectPalette.hex, 0.1),
                  borderColor: darkMode ? withAlpha(topSubjectPalette.hex, 0.28) : withAlpha(topSubjectPalette.hex, 0.22),
                }}
              >
                Lider: {topSubjectDisplay.label}
              </div>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            {subjectBreakdown.map((entry) => {
              const discipline = getDisplayDiscipline(entry.subject);
              const Icon = discipline.Icon;
              const palette = getSubjectPalette(entry.subject);

              return (
                <div key={entry.subject} className={`rounded-2xl border p-3.5 ${darkMode ? 'border-slate-700/80 bg-slate-900/72' : 'border-slate-300/80 bg-white/76'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-2xl border p-2.5"
                        style={{
                          backgroundColor: darkMode ? withAlpha(palette.hex, 0.16) : withAlpha(palette.hex, 0.1),
                          borderColor: darkMode ? withAlpha(palette.hex, 0.28) : withAlpha(palette.hex, 0.18),
                          color: palette.hex,
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{discipline.label}</p>
                        <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{entry.sessions} sessoes registradas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatMinutes(entry.minutes)}</p>
                      <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{entry.share}% da sua semana</p>
                    </div>
                  </div>
                  <div className={`mt-2.5 h-2.5 overflow-hidden rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(8, entry.share)}%`,
                        backgroundColor: palette.hex,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`rounded-2xl border p-5 shadow-[0_12px_28px_-18px_rgba(100,116,139,0.24)] ${
          darkMode
            ? 'border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(17,24,39,0.94))]'
            : 'border-slate-300/80 bg-[linear-gradient(180deg,rgba(233,240,246,0.98),rgba(223,232,241,0.96))]'
        }`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Insights</p>
          <h3 className={`mt-2 text-xl font-semibold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>O que esse ritmo esta mostrando</h3>

          <div className="mt-5 grid gap-2.5">
            <div className={`rounded-2xl border p-3.5 ${darkMode ? 'border-emerald-400/25 bg-emerald-400/10' : 'border-emerald-300 bg-emerald-50/85'}`}>
              <div className={`flex items-center gap-2 ${darkMode ? 'text-emerald-200' : 'text-emerald-700'}`}>
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-semibold">Melhor dia</span>
              </div>
              <p className={`mt-3 text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {bestDay ? `${bestDay.label} · ${formatMinutes(bestDay.minutes)}` : 'Seu melhor dia vai aparecer aqui'}
              </p>
              <p className={`mt-1 text-sm ${darkMode ? 'text-emerald-100/80' : 'text-emerald-800/80'}`}>Seu pico atual de volume ja esta claro no historico.</p>
            </div>

            <div
              className="rounded-2xl border p-3.5"
              style={{
                backgroundColor: darkMode ? withAlpha(topSubjectPalette.hex, 0.14) : withAlpha(topSubjectPalette.hex, 0.08),
                borderColor: darkMode ? withAlpha(topSubjectPalette.hex, 0.26) : withAlpha(topSubjectPalette.hex, 0.2),
              }}
            >
              <div className="flex items-center gap-2" style={{ color: topSubjectPalette.hex }}>
                <Brain className="h-4 w-4" />
                <span className="text-sm font-semibold">Materia dominante</span>
              </div>
              <p className={`mt-3 text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {topSubjectDisplay ? `${topSubjectDisplay.label} lidera sua semana` : 'Sua materia dominante aparece apos ganhar volume'}
              </p>
              <p className={`mt-1 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {topSubject ? `${formatMinutes(topSubject.minutes)} acumulados em ${topSubject.sessions} sessoes.` : 'Continue estudando para revelar sua distribuicao.'}
              </p>
            </div>

            <div className={`rounded-2xl border p-3.5 ${darkMode ? 'border-amber-400/20 bg-amber-400/10' : 'border-amber-300 bg-amber-50/88'}`}>
              <div className={`flex items-center gap-2 ${darkMode ? 'text-amber-200' : 'text-amber-700'}`}>
                <Zap className="h-4 w-4" />
                <span className="text-sm font-semibold">Proximo nivel</span>
              </div>
              <p className={`mt-3 text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{nextLevelPrediction.label}</p>
              <p className={`mt-1 text-sm ${darkMode ? 'text-amber-100/80' : 'text-amber-800/80'}`}>
                Faltam {nextLevelPrediction.pointsToNext.toLocaleString()} pontos para o nivel {nextLevelPrediction.nextLevel}.
              </p>
            </div>

            <div className={`rounded-2xl border p-3.5 ${darkMode ? 'border-slate-700 bg-slate-900/72' : 'border-slate-300 bg-white/76'}`}>
              <div className={`flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                <Clock3 className="h-4 w-4" />
                <span className="text-sm font-semibold">Acumulado</span>
              </div>
              <p className={`mt-3 text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatMinutes(totalMinutes)} registrados</p>
              <p className={`mt-1 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {totalSessions} sessoes concluidas com media de {formatMinutes(averageSessionMinutes)} por sessao.
              </p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-5 shadow-[0_12px_28px_-18px_rgba(100,116,139,0.24)] ${
          darkMode
            ? 'border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(17,24,39,0.94))]'
            : 'border-slate-300/80 bg-[linear-gradient(180deg,rgba(233,240,246,0.98),rgba(223,232,241,0.96))]'
        }`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Proxima melhor acao</p>
          <h3 className={`mt-2 text-xl font-semibold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>Mantenha o ritmo alto hoje</h3>

          <div className={`mt-5 rounded-2xl border p-3.5 ${darkMode ? 'border-slate-700 bg-slate-900/72' : 'border-slate-300 bg-white/76'}`}>
            <div className="flex items-center gap-3">
              <div className={`rounded-2xl border p-2.5 ${darkMode ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200' : 'border-cyan-300 bg-cyan-100/80 text-cyan-700'}`}>
                <Clock3 className="h-4 w-4" />
              </div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Sessao recomendada</p>
                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {recommendedMethod.name} · {recommendedMethod.focusMinutes} min de foco
                </p>
              </div>
            </div>
            <p className={`mt-4 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{recommendedMethod.description}</p>
          </div>

          <div className="mt-5 space-y-2.5">
            <button
              onClick={onStartFocusSession}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                darkMode
                  ? 'border-cyan-400/25 bg-cyan-400/14 text-cyan-100 hover:border-cyan-400/35 hover:bg-cyan-400/20'
                  : 'border-cyan-300 bg-cyan-100/75 text-cyan-800 hover:border-cyan-400 hover:bg-cyan-100'
              }`}
            >
              <span>Comecar sessao de foco agora</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={onStartLongSession}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                darkMode
                  ? 'border-slate-700 bg-slate-900/72 text-slate-100 hover:border-slate-600 hover:bg-slate-900'
                  : 'border-slate-300 bg-white/76 text-slate-800 hover:border-slate-400 hover:bg-white'
              }`}
            >
              <span>Reservar bloco longo de estudo</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-2.5">
            <button
              onClick={onOpenQuestions}
              className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 text-sm transition ${
                darkMode
                  ? 'border-slate-700 bg-slate-900/72 text-slate-100 hover:border-slate-600 hover:bg-slate-900'
                  : 'border-slate-300 bg-white/72 text-slate-800 hover:border-slate-400 hover:bg-white'
              }`}
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <Target className="h-4 w-4 text-emerald-600" />
                Fazer bloco de questoes
              </span>
                <ArrowRight className={`h-4 w-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            </button>

            <button
              onClick={onOpenFlashcards}
              className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 text-sm transition ${
                darkMode
                  ? 'border-slate-700 bg-slate-900/72 text-slate-100 hover:border-slate-600 hover:bg-slate-900'
                  : 'border-slate-300 bg-white/72 text-slate-800 hover:border-slate-400 hover:bg-white'
              }`}
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <BookOpen className="h-4 w-4 text-amber-600" />
                Revisar com flashcards
              </span>
                <ArrowRight className={`h-4 w-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            </button>
          </div>

          <div className={`mt-5 rounded-2xl border p-3.5 ${darkMode ? 'border-slate-700 bg-slate-900/72' : 'border-slate-300 bg-white/72'}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Ritmo medio</p>
            <p className={`mt-2 text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatMinutes(weeklyAverageMinutes)} por dia nesta semana</p>
            <p className={`mt-2 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Continue assim para manter o streak ativo e empurrar ranking, progresso semanal e feed social ao mesmo tempo.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
