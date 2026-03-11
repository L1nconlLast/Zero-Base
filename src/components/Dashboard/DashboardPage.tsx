import React from 'react';
import { Hand, Zap, Target, PartyPopper, Flame, BookOpen, TrendingUp } from 'lucide-react';
import { ACADEMY_CONTENT } from '../../data/academyContent';
import { getLevelByPoints } from '../../data/levels';
import { predictNextLevel } from '../../utils/levelPrediction';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import type { StudySession } from '../../types';
import { buildWeeklyRetentionSnapshot } from '../../utils/weeklyRetention';
import StudyHierarchyTree from './StudyHierarchyTree';
import { learningHierarchyService, type StudyHierarchyAreaNode, type StudyHierarchyTrack } from '../../services/learningHierarchy.service';
import { CYCLE_DISCIPLINE_LABELS } from '../../utils/disciplineLabels';

interface MockExamHistoryEntry {
  date: string;
  mistakesByTopic: Record<string, number>;
  totalQuestions: number;
  correctCount: number;
  track: 'enem' | 'concurso' | 'ambos';
  modelId?: string;
  banca?: string;
  avgTimePerQuestionSec?: number;
}

interface DailyQuizHistoryEntry {
  id: string;
  date: string;
  track: 'enem' | 'concurso' | 'ambos';
  totalQuestions: number;
  correctCount: number;
  xpEarned: number;
  streak: number;
  weakTopics: string[];
}

interface DashboardPageProps {
  userName?: string;
  totalPoints: number;
  level: number;
  todayMinutes: number;
  completedContentIds: string[];
  currentStreak?: number;
  sessions?: StudySession[];
  supabaseUserId?: string | null;
  onContinueNow: () => void;
  onOpenRanks?: () => void;
  onNavigate?: (tab: string) => void;
  preferredTrack?: 'enem' | 'concursos' | 'hibrido';
  onOpenTopicQuestions?: (payload: { areaName: string; disciplineName: string; topicName: string; target: 'quiz' | 'simulado' }) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  userName,
  totalPoints,
  level,
  todayMinutes,
  completedContentIds,
  currentStreak = 0,
  sessions = [],
  supabaseUserId,
  onContinueNow,
  onOpenRanks,
  onNavigate,
  preferredTrack = 'enem',
  onOpenTopicQuestions,
}) => {
  const [mockExamHistory] = useLocalStorage<MockExamHistoryEntry[]>('mock_exam_history', []);
  const [dailyQuizHistory] = useLocalStorage<DailyQuizHistoryEntry[]>('daily_quiz_history', []);
  const [hierarchyData, setHierarchyData] = React.useState<StudyHierarchyAreaNode[]>([]);
  const [isHierarchyLoading, setIsHierarchyLoading] = React.useState(false);
  const [focusedDisciplineName, setFocusedDisciplineName] = React.useState<string | null>(null);
  const [hierarchyTrack, setHierarchyTrack] = React.useState<StudyHierarchyTrack>(preferredTrack);
  const weekDayLabels = React.useMemo(() => ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'], []);

  React.useEffect(() => {
    setHierarchyTrack(preferredTrack);
  }, [preferredTrack]);

  const currentLevel = React.useMemo(() => getLevelByPoints(totalPoints), [totalPoints]);
  const levelPred = React.useMemo(() => predictNextLevel(totalPoints, sessions), [totalPoints, sessions]);

  const nextContentInfo = React.useMemo(() => {
    const content = ACADEMY_CONTENT.find((item) => !item.isPremium && !completedContentIds.includes(item.id));
    if (!content) return null;

    const totalInCategory = ACADEMY_CONTENT.filter((item) => !item.isPremium && item.subDepartment === content.subDepartment);
    const doneInCategory = totalInCategory.filter((item) => completedContentIds.includes(item.id)).length;

    return { content, position: doneInCategory + 1, total: totalInCategory.length };
  }, [completedContentIds]);

  const progressCenter = React.useMemo(() => {
    const totalTracks = ACADEMY_CONTENT.filter((item) => !item.isPremium).length;
    const doneTracks = completedContentIds.length;
    const overall = totalTracks > 0 ? Math.round((doneTracks / totalTracks) * 100) : 0;

    const minutesBySubject = sessions.reduce<Record<string, number>>((acc, session) => {
      acc[session.subject] = (acc[session.subject] || 0) + session.minutes;
      return acc;
    }, {});

    const topSubjects = Object.entries(minutesBySubject)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const maxMinutes = topSubjects[0]?.[1] || 0;

    return {
      overall,
      doneTracks,
      totalTracks,
      bySubject: topSubjects.map(([subject, minutes]) => ({
        subject,
        percent: maxMinutes > 0 ? Math.round((minutes / maxMinutes) * 100) : 0,
        minutes,
      })),
    };
  }, [completedContentIds, sessions]);

  const weakAreas = React.useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const recentSubjects = new Set(sessions.filter((session) => new Date(session.date) >= cutoff).map((session) => session.subject));
    const allSubjects = ['Anatomia', 'Fisiologia', 'Farmacologia', 'Patologia', 'Bioquímica', 'Histologia'];
    return allSubjects.filter((subject) => !recentSubjects.has(subject as never)).slice(0, 3);
  }, [sessions]);

  const questionMetrics = React.useMemo(() => {
    const mockTotals = mockExamHistory.reduce(
      (acc, item) => {
        acc.total += item.totalQuestions;
        acc.correct += item.correctCount;
        acc.timeWeighted += (item.avgTimePerQuestionSec || 0) * item.totalQuestions;
        if (item.banca) {
          const banca = acc.byBanca[item.banca] || { total: 0, correct: 0 };
          banca.total += item.totalQuestions;
          banca.correct += item.correctCount;
          acc.byBanca[item.banca] = banca;
        }
        return acc;
      },
      { total: 0, correct: 0, timeWeighted: 0, byBanca: {} as Record<string, { total: number; correct: number }> },
    );

    const quizTotals = dailyQuizHistory.reduce(
      (acc, item) => {
        acc.total += item.totalQuestions;
        acc.correct += item.correctCount;
        acc.bestStreak = Math.max(acc.bestStreak, item.streak);
        return acc;
      },
      { total: 0, correct: 0, bestStreak: 0 },
    );

    const totalQuestions = mockTotals.total + quizTotals.total;
    const totalCorrect = mockTotals.correct + quizTotals.correct;

    const topBanca = Object.entries(mockTotals.byBanca)
      .map(([name, stats]) => ({ name, accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0 }))
      .sort((a, b) => b.accuracy - a.accuracy)[0];

    return {
      totalQuestions,
      accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      avgTimePerQuestion: mockTotals.total > 0 ? Math.round(mockTotals.timeWeighted / mockTotals.total) : 0,
      bestDailyStreak: quizTotals.bestStreak,
      topBanca,
    };
  }, [dailyQuizHistory, mockExamHistory]);

  const studyInsights = React.useMemo(() => {
    const now = new Date();
    const last7Start = new Date(now);
    last7Start.setDate(now.getDate() - 7);

    const prev7Start = new Date(now);
    prev7Start.setDate(now.getDate() - 14);

    const last7Minutes = sessions
      .filter((session) => new Date(session.date) >= last7Start)
      .reduce((sum, session) => sum + session.minutes, 0);

    const prev7Minutes = sessions
      .filter((session) => {
        const d = new Date(session.date);
        return d >= prev7Start && d < last7Start;
      })
      .reduce((sum, session) => sum + session.minutes, 0);

    const deltaPercent = prev7Minutes > 0 ? Math.round(((last7Minutes - prev7Minutes) / prev7Minutes) * 100) : 0;

    return {
      last7Minutes,
      deltaPercent,
      trendLabel:
        prev7Minutes === 0
          ? 'Sem base de comparação'
          : deltaPercent >= 0
            ? `Você estudou ${deltaPercent}% a mais que na semana anterior.`
            : `Você estudou ${Math.abs(deltaPercent)}% a menos que na semana anterior.`,
    };
  }, [sessions]);

  const weeklyRetention = React.useMemo(() => buildWeeklyRetentionSnapshot(sessions, 4), [sessions]);

  const localHierarchyFallback = React.useMemo(
    () => learningHierarchyService.buildLocalFallback(sessions, weakAreas, hierarchyTrack),
    [sessions, weakAreas, hierarchyTrack],
  );

  React.useEffect(() => {
    let active = true;

    const loadHierarchy = async () => {
      if (!supabaseUserId) {
        if (active) {
          setHierarchyData(localHierarchyFallback);
          setIsHierarchyLoading(false);
        }
        return;
      }

      if (active) {
        setIsHierarchyLoading(true);
      }

      try {
        const cloudTree = await learningHierarchyService.listForUser(supabaseUserId);
        if (!active) {
          return;
        }

        if (cloudTree.length > 0) {
          setHierarchyData(learningHierarchyService.normalizeHierarchyForTrack(cloudTree, hierarchyTrack));
        } else {
          setHierarchyData(localHierarchyFallback);
        }
      } catch {
        if (active) {
          setHierarchyData(localHierarchyFallback);
        }
      } finally {
        if (active) {
          setIsHierarchyLoading(false);
        }
      }
    };

    void loadHierarchy();

    return () => {
      active = false;
    };
  }, [supabaseUserId, localHierarchyFallback, hierarchyTrack]);

  const focusPriorityInTree = React.useCallback((disciplineName: string) => {
    setFocusedDisciplineName(disciplineName);
    const section = document.getElementById('study-tree-section');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleTopicSelect = React.useCallback(
    (payload: { areaName: string; disciplineName: string; topicName: string; target: 'quiz' | 'simulado' }) => {
      onOpenTopicQuestions?.(payload);
    },
    [onOpenTopicQuestions],
  );

  return (
    <div className="flex flex-col gap-6">
      <section
        className="rounded-[20px] p-6 sm:p-8"
        style={{
          background: '#ffffff',
          border: '1px solid #e8ecf3',
          boxShadow: '0 1px 4px rgba(0,0,0,.04), 0 4px 24px rgba(0,0,0,.04)',
          color: '#0f172a'
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight flex items-center gap-2 mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
              <Hand className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
              Bom te ver de novo, {userName || 'Estudante'}.
            </h1>
            <p className="text-[13.5px] sm:text-[14.5px] text-slate-500 font-medium">Seu foco agora é simples: voltar para a próxima sessão.</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold mb-0.5">Hoje</p>
            <p className="text-[26px] font-extrabold text-indigo-600 leading-none" style={{ fontFamily: "'Syne', sans-serif" }}>{todayMinutes}min</p>
          </div>
        </div>

        <div className="mt-6 rounded-[16px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6" style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 border border-blue-200">
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-[15px] font-bold text-slate-800">Retomar estudo</h2>
          </div>

          {nextContentInfo ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">{nextContentInfo.content.subDepartment}</span>
                <span className="text-[11px] font-semibold text-slate-400 ml-auto bg-white px-2 py-0.5 rounded border border-slate-200">{nextContentInfo.position}/{nextContentInfo.total}</span>
              </div>
              <p className="text-[14px] font-semibold text-slate-800">{nextContentInfo.content.title}</p>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden my-2">
                <div className="h-full rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" style={{ width: `${((nextContentInfo.position - 1) / nextContentInfo.total) * 100}%` }} />
              </div>
              <p className="text-[12px] font-medium text-slate-500">+{nextContentInfo.content.xpReward} XP <span className="mx-1.5 text-slate-300">•</span> {nextContentInfo.content.estimatedMinutes} min</p>
            </div>
          ) : (
            <div>
              <p className="text-[14px] font-semibold text-slate-800 inline-flex items-center gap-2">
                <PartyPopper className="w-4 h-4 text-orange-500" /> Tudo em dia!
              </p>
              <p className="text-[12.5px] text-slate-500 mt-1.5">Você pode revisar, simular prova ou avançar para conteúdos premium.</p>
            </div>
          )}

          <button
            onClick={onContinueNow}
            className="mt-5 w-full sm:w-auto min-w-[260px] text-white font-bold text-[14px] py-3.5 px-6 rounded-xl flex justify-center items-center gap-2 transition-all hover:translate-y-[-1px] hover:shadow-lg shadow-[0_4px_14px_rgba(37,99,235,0.3)]"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            ▶ Começar sessão de estudo
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-300">Missão semanal</p>
            <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mt-1">Retenção de 7 dias</h3>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
              {weeklyRetention.isMaintained
                ? '✅ Sequência semanal garantida. Continue para criar hábito.'
                : `Faltam ${weeklyRetention.remainingDays} dia(s) para fechar sua semana (${weeklyRetention.studiedDays}/${weeklyRetention.targetDays}).`}
            </p>
          </div>
          <button
            onClick={onContinueNow}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Estudar 25 min
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {weekDayLabels.map((label, index) => {
            const studied = weeklyRetention.studiedDayIndexes.includes(index);
            return (
              <div
                key={label}
                className={`rounded-lg border p-2 text-center ${studied
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900/30'
                    : 'border-indigo-200 dark:border-indigo-800 bg-white/80 dark:bg-slate-900/40'
                  }`}
              >
                <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{label}</p>
                <p className="text-sm mt-1">{studied ? '●' : '○'}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 h-2 w-full rounded-full bg-indigo-100 dark:bg-indigo-900/50 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.round((weeklyRetention.studiedDays / weeklyRetention.targetDays) * 100))}%`, backgroundColor: 'var(--color-primary)' }}
          />
        </div>

        {weeklyRetention.remainingDays === 1 && !weeklyRetention.isMaintained && (
          <p className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
            ⚠ Falta 1 sessão para manter sua sequência semanal.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Progresso geral</h3>
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Zap className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /> {totalPoints.toLocaleString()} XP
            </span>
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Flame className="w-4 h-4 text-orange-400" /> {currentStreak} dias
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Centro de Progresso</p>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-100 mt-2">{progressCenter.overall}%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{progressCenter.doneTracks}/{progressCenter.totalTracks} trilhas concluídas</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Nível {level} · {currentLevel.title}</p>
            {onOpenRanks && (
              <button
                onClick={onOpenRanks}
                className="mt-3 px-3 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Ver ranks
              </button>
            )}
          </div>

          <div className="lg:col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-3">Disciplinas com mais estudo</p>
            <div className="space-y-3">
              {progressCenter.bySubject.length > 0 ? (
                progressCenter.bySubject.map((item) => (
                  <div key={item.subject}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-slate-800 dark:text-slate-100">{CYCLE_DISCIPLINE_LABELS[item.subject as keyof typeof CYCLE_DISCIPLINE_LABELS]?.label ?? item.subject}</span>
                      <span className="text-slate-500 dark:text-slate-300">{item.percent}% · {item.minutes} min</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: 'var(--color-primary)' }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Sem dados de sessão ainda. Faça a primeira sessão para começar seu centro de progresso.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
          <h3 className="text-base font-bold text-amber-800 dark:text-amber-300 mb-2">Prioridades da semana</h3>
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">Matérias sem estudo nos últimos 7 dias.</p>
          {weakAreas.length > 0 ? (
            <div className="space-y-2">
              {weakAreas.map((area) => (
                <div key={area} className="flex items-center justify-between gap-2">
                  <span className="font-medium text-amber-900 dark:text-amber-300">{CYCLE_DISCIPLINE_LABELS[area as keyof typeof CYCLE_DISCIPLINE_LABELS]?.label ?? area}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => focusPriorityInTree(area)}
                      className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg transition"
                    >
                      Ver detalhe
                    </button>
                    <button
                      onClick={() => onNavigate?.('foco')}
                      className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg transition"
                    >
                      Estudar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-700 dark:text-amber-400">Sem pendências críticas nesta semana. Mantenha o ritmo.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Estatísticas e insights</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Acurácia</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{questionMetrics.accuracy}%</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Tempo médio/Q</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{questionMetrics.avgTimePerQuestion}s</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <TrendingUp className="w-4 h-4 text-blue-500" /> {studyInsights.trendLabel}
            </p>
            <p className="text-slate-600 dark:text-slate-300">Questões resolvidas: <span className="font-semibold">{questionMetrics.totalQuestions}</span></p>
            <p className="text-slate-600 dark:text-slate-300">Melhor banca: <span className="font-semibold">{questionMetrics.topBanca ? `${questionMetrics.topBanca.name} (${questionMetrics.topBanca.accuracy}%)` : 'Sem dados'}</span></p>
            <p className="text-slate-600 dark:text-slate-300">Streak diário máx (quiz): <span className="font-semibold">{questionMetrics.bestDailyStreak}</span></p>
            {levelPred.avgPointsPerDay > 0 && (
              <p className="text-blue-600 dark:text-blue-300 font-medium">{levelPred.label}</p>
            )}
          </div>
        </div>
      </section>

      <section id="study-tree-section" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap sm:flex-nowrap">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">Mapa de estudos por hierarquia</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Área → Disciplina → Tópico</span>
          </div>

          <div className="w-full sm:w-auto sm:ml-auto">
            <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl border border-slate-300/80 dark:border-slate-600 bg-slate-100/90 dark:bg-slate-800/80 shadow-sm sm:float-right">
              {([
                { key: 'enem', label: 'ENEM' },
                { key: 'concursos', label: 'Concurso' },
                { key: 'hibrido', label: 'Híbrido' },
              ] as const).map((option) => {
                const selected = hierarchyTrack === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setHierarchyTrack(option.key)}
                    className={`min-w-[92px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500 ${selected
                        ? 'text-white shadow-md border border-transparent'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700/70'
                      }`}
                    style={selected ? { backgroundColor: 'var(--color-primary)', boxShadow: '0 6px 18px -10px var(--color-primary)' } : undefined}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <StudyHierarchyTree
          data={hierarchyData}
          loading={isHierarchyLoading}
          focusedDisciplineName={focusedDisciplineName}
          onTopicSelect={handleTopicSelect}
        />
      </section>
    </div>
  );
};

export default DashboardPage;
