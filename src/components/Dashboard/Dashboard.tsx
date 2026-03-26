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
import type { StudySession, UserData } from '../../types';
import { STUDY_METHODS } from '../../data/studyMethods';
import { getDisplayDiscipline } from '../../utils/disciplineLabels';
import { predictNextLevel } from '../../utils/levelPrediction';

interface DashboardProps {
  userData: UserData;
  todayMinutes: number;
  userName: string;
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

const startOfDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseSessionDate = (session: StudySession): Date => {
  if (session.timestamp) {
    const parsedTimestamp = new Date(session.timestamp);
    if (!Number.isNaN(parsedTimestamp.getTime())) {
      return parsedTimestamp;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(session.date)) {
    const [year, month, day] = session.date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const parsedDate = new Date(session.date);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  return new Date();
};

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
    const today = startOfDay(new Date());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - 6);

    const previousWeekStart = new Date(thisWeekStart);
    previousWeekStart.setDate(thisWeekStart.getDate() - 7);

    const previousWeekEnd = new Date(thisWeekStart);
    previousWeekEnd.setMilliseconds(previousWeekEnd.getMilliseconds() - 1);

    let weekTotal = 0;
    let previousWeekTotal = 0;
    let minutesAllTime = 0;
    const minutesByDate = new Map<string, number>();
    const sessionsByDate = new Map<string, number>();
    const weeklyMinutesBySubject = new Map<string, number>();
    const weeklySessionsBySubject = new Map<string, number>();

    sessions.forEach((session) => {
      const sessionDate = startOfDay(parseSessionDate(session));
      const sessionKey = toDateKey(sessionDate);
      minutesAllTime += session.minutes;

      minutesByDate.set(sessionKey, (minutesByDate.get(sessionKey) || 0) + session.minutes);
      sessionsByDate.set(sessionKey, (sessionsByDate.get(sessionKey) || 0) + 1);

      if (sessionDate >= thisWeekStart && sessionDate <= today) {
        weekTotal += session.minutes;
        weeklyMinutesBySubject.set(session.subject, (weeklyMinutesBySubject.get(session.subject) || 0) + session.minutes);
        weeklySessionsBySubject.set(session.subject, (weeklySessionsBySubject.get(session.subject) || 0) + 1);
      } else if (sessionDate >= previousWeekStart && sessionDate <= previousWeekEnd) {
        previousWeekTotal += session.minutes;
      }
    });

    const nextDailyPulse: DailyPulse[] = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(thisWeekStart);
      date.setDate(thisWeekStart.getDate() + index);
      const key = toDateKey(date);
      return {
        key,
        label: DAY_FORMATTER.format(date).replace('.', '').slice(0, 3),
        minutes: minutesByDate.get(key) || 0,
        isToday: key === toDateKey(today),
      };
    });

    const topDayEntry = Array.from(minutesByDate.entries()).sort((a, b) => b[1] - a[1])[0];
    const parsedBestDay = topDayEntry
      ? {
          key: topDayEntry[0],
          minutes: topDayEntry[1],
          label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
            .format(new Date(`${topDayEntry[0]}T12:00:00`))
            .replace('.', ''),
        }
      : null;

    const weeklySubjectTotal = Array.from(weeklyMinutesBySubject.values()).reduce((sum, value) => sum + value, 0);
    const nextSubjectBreakdown: SubjectBreakdown[] = Array.from(weeklyMinutesBySubject.entries())
      .map(([subject, minutes]) => ({
        subject,
        minutes,
        sessions: weeklySessionsBySubject.get(subject) || 0,
        share: weeklySubjectTotal > 0 ? Math.round((minutes / weeklySubjectTotal) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    return {
      weekMinutes: weekTotal,
      previousWeekMinutes: previousWeekTotal,
      totalMinutes: minutesAllTime,
      totalSessions: sessions.length,
      averageSessionMinutes: sessions.length ? Math.round(minutesAllTime / sessions.length) : 0,
      activeDaysThisWeek: nextDailyPulse.filter((entry) => entry.minutes > 0).length,
      bestDay: parsedBestDay,
      dailyPulse: nextDailyPulse,
      subjectBreakdown: nextSubjectBreakdown,
    };
  }, [sessions]);

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
  const strongestPulse = Math.max(...dailyPulse.map((entry) => entry.minutes), 1);
  const weeklyAverageMinutes = Math.round(weekMinutes / 7);
  const weeklySignalCopy =
    weekMinutes >= weeklyGoalMinutes
      ? 'Meta semanal batida. Este e o melhor momento para transformar volume em consistencia.'
      : `Faltam ${formatMinutes(Math.max(weeklyGoalMinutes - weekMinutes, 0))} para bater sua meta semanal.`;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-700/70 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_right,rgba(14,165,233,0.16),transparent_30%),linear-gradient(145deg,#020617,#0f172a_55%,#111827)] shadow-[0_24px_60px_-30px_rgba(2,6,23,0.98)]">
        <div className="grid gap-8 px-6 py-7 lg:px-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
              <Sparkles className="h-3.5 w-3.5" />
              Painel de progresso
            </div>

            <div className="mt-5 max-w-3xl">
              <p className="text-sm font-medium text-sky-200/80">Ola, {userName.split(' ')[0] || 'estudante'}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
                Seu esforco esta ficando visivel.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Hoje voce soma {formatMinutes(todayMinutes)}. Na semana, ja acumulou {formatMinutes(weekMinutes)} em{' '}
                {activeDaysThisWeek} dias ativos, com um ritmo {weeklyChange.direction === 'down' ? 'mais baixo' : weeklyChange.direction === 'up' ? 'melhor' : 'estavel'} do que na semana passada.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Hoje</span>
                  <Clock3 className="h-4 w-4 text-sky-300" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{formatMinutes(todayMinutes)}</p>
                <p className="mt-2 text-sm text-slate-400">Meta diaria: {formatMinutes(dailyGoalMinutes)}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Semana</span>
                  <Target className="h-4 w-4 text-cyan-300" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{formatMinutes(weekMinutes)}</p>
                <p className="mt-2 text-sm text-slate-400">{weeklyGoalProgress}% da meta semanal</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Evolucao</span>
                  {weeklyChange.direction === 'down' ? (
                    <ArrowDownRight className="h-4 w-4 text-rose-300" />
                  ) : weeklyChange.direction === 'up' ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-300" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  )}
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{weeklyChange.label}</p>
                <p className="mt-2 text-sm text-slate-400">{weeklyChange.helper}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Streak</span>
                  <Flame className="h-4 w-4 text-amber-300" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{streakDays} dias</p>
                <p className="mt-2 text-sm text-slate-400">
                  {streakDays > 0 ? 'Voce esta mantendo o habito ativo.' : 'A primeira sessao ja libera sua sequencia.'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-700/80 bg-slate-950/60 p-5 shadow-[0_18px_36px_-24px_rgba(14,165,233,0.7)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Pulso da semana</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-50">Horas que viram progresso</h3>
              </div>
              <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                {activeDaysThisWeek}/7 dias ativos
              </div>
            </div>

            <div className="mt-6 flex items-end gap-2">
              {dailyPulse.map((entry) => (
                <div key={entry.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end rounded-2xl bg-slate-900/80 px-1.5 pb-1.5">
                    <div
                      className={`w-full rounded-xl transition-all duration-500 ${entry.isToday ? 'bg-gradient-to-t from-cyan-400 to-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.45)]' : 'bg-gradient-to-t from-slate-600 to-slate-300/90'}`}
                      style={{
                        height: `${Math.max(14, Math.round((entry.minutes / strongestPulse) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${entry.isToday ? 'text-sky-200' : 'text-slate-500'}`}>
                      {entry.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{entry.minutes ? formatMinutes(entry.minutes) : '0 min'}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-200">Meta semanal</span>
                <span className="text-slate-400">{formatMinutes(weekMinutes)} / {formatMinutes(weeklyGoalMinutes)}</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-300 transition-all duration-700"
                  style={{ width: `${Math.max(6, weeklyGoalProgress)}%` }}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{weeklySignalCopy}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)_minmax(280px,0.8fr)]">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900 p-6 shadow-[0_12px_28px_-18px_rgba(2,6,23,0.92)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Distribuicao da semana</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-50">Horas por materia</h3>
            </div>
            {topSubjectDisplay ? (
              <div className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-300">
                Lider: {topSubjectDisplay.label}
              </div>
            ) : null}
          </div>

          <div className="mt-6 space-y-4">
            {subjectBreakdown.map((entry) => {
              const discipline = getDisplayDiscipline(entry.subject);
              const Icon = discipline.Icon;

              return (
                <div key={entry.subject} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-2.5 text-sky-200">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100">{discipline.label}</p>
                        <p className="text-sm text-slate-400">{entry.sessions} sessoes registradas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-50">{formatMinutes(entry.minutes)}</p>
                      <p className="text-xs text-slate-400">{entry.share}% da sua semana</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
                      style={{ width: `${Math.max(8, entry.share)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-900 p-6 shadow-[0_12px_28px_-18px_rgba(2,6,23,0.92)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Insights</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-50">O que esse ritmo esta mostrando</h3>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-emerald-700/30 bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-semibold">Melhor dia</span>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-50">
                {bestDay ? `${bestDay.label} · ${formatMinutes(bestDay.minutes)}` : 'Seu melhor dia vai aparecer aqui'}
              </p>
              <p className="mt-1 text-sm text-emerald-200/80">Seu pico atual de volume ja esta claro no historico.</p>
            </div>

            <div className="rounded-2xl border border-sky-700/30 bg-sky-950/20 p-4">
              <div className="flex items-center gap-2 text-sky-300">
                <Brain className="h-4 w-4" />
                <span className="text-sm font-semibold">Materia dominante</span>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-50">
                {topSubjectDisplay ? `${topSubjectDisplay.label} lidera sua semana` : 'Sua materia dominante aparece apos ganhar volume'}
              </p>
              <p className="mt-1 text-sm text-sky-100/75">
                {topSubject ? `${formatMinutes(topSubject.minutes)} acumulados em ${topSubject.sessions} sessoes.` : 'Continue estudando para revelar sua distribuicao.'}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-700/30 bg-amber-950/20 p-4">
              <div className="flex items-center gap-2 text-amber-300">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-semibold">Proximo nivel</span>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-50">{nextLevelPrediction.label}</p>
              <p className="mt-1 text-sm text-amber-100/75">
                Faltam {nextLevelPrediction.pointsToNext.toLocaleString()} pontos para o nivel {nextLevelPrediction.nextLevel}.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock3 className="h-4 w-4" />
                <span className="text-sm font-semibold">Acumulado</span>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-50">{formatMinutes(totalMinutes)} registrados</p>
              <p className="mt-1 text-sm text-slate-400">
                {totalSessions} sessoes concluidas com media de {formatMinutes(averageSessionMinutes)} por sessao.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-900 p-6 shadow-[0_12px_28px_-18px_rgba(2,6,23,0.92)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Proxima melhor acao</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-50">Mantenha o ritmo alto hoje</h3>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-2.5 text-cyan-200">
                <Clock3 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-100">Sessao recomendada</p>
                <p className="text-sm text-slate-400">
                  {recommendedMethod.name} · {recommendedMethod.focusMinutes} min de foco
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">{recommendedMethod.description}</p>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={onStartFocusSession}
              className="flex w-full items-center justify-between rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3.5 text-left text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/50 hover:bg-cyan-500/15"
            >
              <span>Comecar sessao de foco agora</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={onStartLongSession}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3.5 text-left text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
            >
              <span>Reservar bloco longo de estudo</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            <button
              onClick={onOpenQuestions}
              className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 transition hover:border-slate-600 hover:bg-slate-950"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <Target className="h-4 w-4 text-emerald-300" />
                Fazer bloco de questoes
              </span>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </button>

            <button
              onClick={onOpenFlashcards}
              className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 transition hover:border-slate-600 hover:bg-slate-950"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <BookOpen className="h-4 w-4 text-amber-300" />
                Revisar com flashcards
              </span>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ritmo medio</p>
            <p className="mt-2 text-lg font-semibold text-slate-50">{formatMinutes(weeklyAverageMinutes)} por dia nesta semana</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Continue assim para manter o streak ativo e empurrar ranking, progresso semanal e feed social ao mesmo tempo.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
