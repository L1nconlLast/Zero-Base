import React from 'react';
import { UserData, MATERIAS_CONFIG, MateriaTipo } from '../../types';
import { Trophy, TrendingUp, Target, Calendar, Flame, Hand, BookOpen, Zap, Brain, Clock3, Layers } from 'lucide-react';
import { predictNextLevel } from '../../utils/levelPrediction';
import { STUDY_METHODS } from '../../data/studyMethods';
import { getDisplayDiscipline } from '../../utils/disciplineLabels';

const DashboardWeeklyProgressChart = React.lazy(() => import('./DashboardWeeklyProgressChart'));

const BASE_WEEK_DATA = [
  { name: 'Seg', horas: 0 },
  { name: 'Ter', horas: 0 },
  { name: 'Qua', horas: 0 },
  { name: 'Qui', horas: 0 },
  { name: 'Sex', horas: 0 },
  { name: 'Sáb', horas: 0 },
  { name: 'Dom', horas: 0 },
];

const DAYS_MAP: Record<string, number> = {
  segunda: 0,
  terca: 1,
  quarta: 2,
  quinta: 3,
  sexta: 4,
  sabado: 5,
  domingo: 6,
};

interface DashboardProps {
  userData: UserData;
  todayMinutes: number;
  userName?: string;
  onStartFocusSession?: () => void;
  onStartLongSession?: () => void;
  onOpenQuestions?: () => void;
  onOpenFlashcards?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  userData,
  todayMinutes,
  userName = 'Estudante',
  onStartFocusSession,
  onStartLongSession,
  onOpenQuestions,
  onOpenFlashcards,
}) => {
  const weekData = React.useMemo(() => {
    const data = BASE_WEEK_DATA.map(d => ({ ...d }));
    Object.entries(userData.weekProgress || {}).forEach(([day, info]) => {
      const idx = DAYS_MAP[day];
      if (idx !== undefined && info.minutes) {
        data[idx].horas = info.minutes / 60;
      }
    });
    return data;
  }, [userData.weekProgress]);

  const subjectDistribution = React.useMemo(() => {
    return userData.sessions?.reduce((acc, session) => {
      const subject = session.subject || 'Outra';
      acc[subject] = (acc[subject] || 0) + session.minutes;
      return acc;
    }, {} as Record<string, number>) || {};
  }, [userData.sessions]);

  const totalMinutesAllTime = React.useMemo(() => {
    return Object.values(subjectDistribution).reduce((sum, m) => sum + m, 0);
  }, [subjectDistribution]);

  const smartPlan = React.useMemo(() => {
    const sessions = userData.sessions || userData.studyHistory || [];
    const fallbackSubject: MateriaTipo = 'Anatomia';

    const sortedSubjects = Object.entries(subjectDistribution)
      .sort(([, a], [, b]) => a - b)
      .map(([subject]) => subject as MateriaTipo)
      .filter((subject) => subject !== 'Outra');

    const weakestSubject = sortedSubjects[0] || fallbackSubject;
    const lastSession = sessions[sessions.length - 1];
    const reviewSubject = (lastSession?.subject && lastSession.subject !== 'Outra'
      ? lastSession.subject
      : weakestSubject) as MateriaTipo;

    const focusMinutes = Math.min(Math.max(25, Math.round(Math.max(0, userData.dailyGoal - todayMinutes))), 90);

    return {
      focusMinutes,
      weakestSubject,
      reviewSubject,
      progressLabel:
        todayMinutes >= userData.dailyGoal
          ? 'Meta diária atingida. Foque em revisão e retenção.'
          : `Faltam ${Math.max(0, userData.dailyGoal - todayMinutes)} min para fechar a meta de hoje.`,
    };
  }, [userData.sessions, userData.studyHistory, userData.dailyGoal, todayMinutes, subjectDistribution]);

  const maxLongBreakMinutes = React.useMemo(
    () => Math.max(...STUDY_METHODS.map((method) => method.longBreakMinutes)),
    []
  );

  // Meta diária
  const dailyGoalProgress = (todayMinutes / userData.dailyGoal) * 100;
  const remainingMinutes = Math.max(0, userData.dailyGoal - todayMinutes);

  // Previsão de nível
  const levelPrediction = React.useMemo(() => {
    const sessions = userData.sessions || userData.studyHistory || [];
    return predictNextLevel(userData.totalPoints, sessions);
  }, [userData.totalPoints, userData.sessions, userData.studyHistory]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header com Boas-vindas e Streak */}
      <header
        className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-2xl shadow-lg text-white"
        style={{ backgroundImage: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}
      >
        <div>
          <h1 className="text-3xl font-bold mb-1 inline-flex items-center gap-2"><Hand className="w-6 h-6" />Olá, {userName}!</h1>
          <p className="text-white/90">Pronto para avançar no Zero Base hoje?</p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/20 mt-4 md:mt-0">
          <Flame className="w-8 h-8 text-orange-400" />
          <div>
            <p className="font-bold text-2xl">{userData.currentStreak || 0} Dias</p>
            <p className="text-xs text-white/85">Sequência atual</p>
          </div>
        </div>
      </header>

      {/* Grid Principal (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Card de Pontos */}
        <div className="motion-card motion-enter bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-[0_10px_28px_-18px_rgba(2,6,23,0.95)] border border-slate-700/70 hover:shadow-[0_14px_30px_-18px_rgba(2,6,23,1)] transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700" style={{ color: 'var(--color-primary)' }}>
              <Trophy className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-700/40 px-3 py-1 rounded-full">
              +{Math.floor(todayMinutes * 10)} hoje
            </span>
          </div>
          <h3 className="text-4xl font-bold text-slate-100 mb-1">
            {userData.totalPoints.toLocaleString()}
          </h3>
          <p className="text-slate-400 text-sm">Pontos Totais</p>
        </div>

        {/* Card de Nível */}
        <div className="motion-card motion-enter bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-[0_10px_28px_-18px_rgba(2,6,23,0.95)] border border-slate-700/70 hover:shadow-[0_14px_30px_-18px_rgba(2,6,23,1)] transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700" style={{ color: 'var(--color-secondary)' }}>
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400">
              Nível {userData.level}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-200 text-lg">
                {userData.level === 1 ? 'Calouro' : userData.level === 2 ? 'Iniciante' : 'Estudante'}
              </span>
              <span className="text-sm text-slate-400">
                {userData.totalPoints}/1000 XP
              </span>
            </div>
            {/* Barra de Progresso Visual */}
            <div className="h-3 w-full bg-slate-700/80 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  backgroundImage: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))',
                  boxShadow: '0 0 10px color-mix(in srgb, var(--color-primary) 35%, transparent)',
                  width: `${Math.min((userData.totalPoints / 1000) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card de Meta Diária */}
        <div className="motion-card motion-enter bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-[0_10px_28px_-18px_rgba(2,6,23,0.95)] border border-slate-700/70 hover:shadow-[0_14px_30px_-18px_rgba(2,6,23,1)] transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-teal-400">
              <Target className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold bg-amber-950/35 text-amber-300 border border-amber-700/40 px-3 py-1 rounded-full">
              Faltam {remainingMinutes}m
            </span>
          </div>
          <h3 className="text-4xl font-bold text-slate-100 mb-1">
            {Math.round(dailyGoalProgress)}%
          </h3>
          <p className="text-slate-400 text-sm">
            Da meta diária ({userData.dailyGoal}min)
          </p>
          {/* Mini barra de progresso */}
          <div className="mt-3 h-2 w-full bg-slate-700/80 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(dailyGoalProgress, 100)}%`,
                backgroundImage: 'linear-gradient(to right, #14b8a6, #2dd4bf)',
                boxShadow: '0 0 10px rgba(45,212,191,0.35)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Previsão de Nível */}
      <div className="motion-card motion-enter bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl border border-slate-700/70 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <Zap className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Previsão de Evolução</p>
          <p className="text-slate-100 font-semibold">{levelPrediction.label}</p>
          {levelPrediction.avgPointsPerDay > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              Média dos últimos 7 dias: <span className="text-blue-400 font-bold">{levelPrediction.avgPointsPerDay} XP/dia</span>
              {levelPrediction.pointsToNext > 0 && (
                <> · Faltam <span className="text-amber-400 font-bold">{levelPrediction.pointsToNext.toLocaleString()} XP</span> para o Nível {levelPrediction.nextLevel}</>
              )}
            </p>
          )}
        </div>
        {levelPrediction.daysToNextLevel !== null && levelPrediction.daysToNextLevel <= 7 && (
          <span className="shrink-0 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> {levelPrediction.daysToNextLevel}d
          </span>
        )}
      </div>

      {/* Plano Diário Inteligente */}
      <div className="motion-card motion-enter bg-slate-900 rounded-2xl border border-slate-700/70 p-6 shadow-[0_10px_28px_-18px_rgba(2,6,23,0.95)]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Plano Diário Inteligente</p>
            <h3 className="text-xl font-bold text-slate-100">Próximos passos para hoje</h3>
            <p className="text-sm text-slate-400 mt-1">{smartPlan.progressLabel}</p>
          </div>
          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full">
            MVP
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={onStartFocusSession}
            className="text-left rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-colors p-4"
          >
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 mb-3">
              <Clock3 className="w-4 h-4" />
            </div>
            <p className="text-sm font-semibold text-slate-100">Foco Guiado</p>
            <p className="text-xs text-slate-400 mt-1">{smartPlan.focusMinutes} min em {getDisplayDiscipline(smartPlan.weakestSubject).label}</p>
          </button>

          <button
            type="button"
            onClick={onStartLongSession}
            className="text-left rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-colors p-4"
          >
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <p className="text-sm font-semibold text-slate-100">Sessão Longa</p>
            <p className="text-xs text-slate-400 mt-1">Long break até {maxLongBreakMinutes} min</p>
          </button>

          <button
            type="button"
            onClick={onOpenQuestions}
            className="text-left rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-colors p-4"
          >
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 mb-3">
              <Brain className="w-4 h-4" />
            </div>
            <p className="text-sm font-semibold text-slate-100">Bloco de Questões</p>
            <p className="text-xs text-slate-400 mt-1">Treinar raciocínio em {getDisplayDiscipline(smartPlan.reviewSubject).label}</p>
          </button>

          <button
            type="button"
            onClick={onOpenFlashcards}
            className="text-left rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-colors p-4"
          >
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-400 mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <p className="text-sm font-semibold text-slate-100">Revisão Ativa</p>
            <p className="text-xs text-slate-400 mt-1">Flashcards para consolidar memória</p>
          </button>
        </div>
      </div>

      {/* Área Principal (Gráfico e Matérias) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico Semanal */}
        <div className="motion-card motion-enter lg:col-span-2 bg-slate-900 p-6 rounded-2xl shadow-[0_10px_28px_-18px_rgba(2,6,23,0.95)] border border-slate-700/70">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            <h3 className="font-bold text-slate-100 text-lg">
              Progresso Semanal
            </h3>
          </div>
          <div className="h-64">
            <React.Suspense
              fallback={
                <div className="h-full w-full rounded-lg border border-slate-700 bg-slate-800/50 animate-pulse" />
              }
            >
              <DashboardWeeklyProgressChart weekData={weekData} />
            </React.Suspense>
          </div>
        </div>

        {/* Distribuição por Matéria */}
        <div className="motion-card motion-enter bg-slate-900 p-6 rounded-2xl shadow-[0_10px_28px_-18px_rgba(2,6,23,0.95)] border border-slate-700/70">
          <h3 className="font-bold text-slate-100 mb-4 text-lg">
            <span className="inline-flex items-center gap-2 text-slate-100"><BookOpen className="w-5 h-5" />Distribuição por Matéria</span>
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(subjectDistribution).length > 0 ? (
              Object.entries(subjectDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([subject, minutes]) => {
                  const percentage = totalMinutesAllTime > 0 
                    ? (minutes / totalMinutesAllTime) * 100 
                    : 0;
                  const materiaConfig = MATERIAS_CONFIG[subject as MateriaTipo] || MATERIAS_CONFIG['Outra'];
                  const discipline = getDisplayDiscipline(subject);
                  const DisciplineIcon = discipline.Icon;
                  
                  return (
                    <div key={subject} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <DisciplineIcon className="w-4 h-4 text-slate-300" />
                          <span className="text-sm font-medium text-slate-200">
                            {discipline.label}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-400">
                          {Math.round(percentage)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-700/80 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${materiaConfig.bgColor.replace('50', '500')}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        {Math.round(minutes)} minutos
                      </p>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">Nenhum estudo registrado ainda</p>
                <p className="text-xs mt-1">Comece a estudar para ver suas estatísticas!</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
