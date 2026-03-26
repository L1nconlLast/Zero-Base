import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';
import type { Question, QuestionTrack } from '../../data/questionsBank';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { getDisplayDiscipline } from '../../utils/disciplineLabels';

export interface ExamResultsSnapshot {
  answeredCount: number;
  avgTimePerQuestionSec: number;
  correctCount: number;
  elapsedSec: number;
  finishedByTimeout: boolean;
  mistakesByTopic: Record<string, number>;
  remainingTimeSec: number;
  totalQuestions: number;
  xpEarned: number;
}

interface ExamResultsProps {
  answers: Record<string, string>;
  banca?: string | null;
  modelCategory?: string | null;
  modelName?: string | null;
  onContinueExam?: () => void;
  onNewExam: () => void;
  onRetryExam: () => void;
  questions: Question[];
  snapshot: ExamResultsSnapshot;
  track: QuestionTrack | 'ambos';
}

const TRACK_THEME: Record<QuestionTrack | 'ambos', { glow: string; hero: string; soft: string; text: string }> = {
  ambos: {
    glow: 'bg-orange-500/15 text-orange-700 dark:text-orange-200 border-orange-200/80 dark:border-orange-800/60',
    hero: 'from-amber-400 via-orange-500 to-rose-500',
    soft: 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-200/80 dark:border-orange-800/60',
    text: 'text-orange-700 dark:text-orange-200',
  },
  concurso: {
    glow: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-200/80 dark:border-emerald-800/60',
    hero: 'from-emerald-500 via-teal-500 to-cyan-600',
    soft: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60',
    text: 'text-emerald-700 dark:text-emerald-200',
  },
  enem: {
    glow: 'bg-blue-500/15 text-blue-700 dark:text-blue-200 border-blue-200/80 dark:border-blue-800/60',
    hero: 'from-blue-500 via-cyan-500 to-sky-600',
    soft: 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/60',
    text: 'text-blue-700 dark:text-blue-200',
  },
};

const DIFFICULTY_WEIGHT: Record<Question['difficulty'], number> = {
  dificil: 3,
  facil: 1,
  medio: 2,
};

const EMPTY_REVIEWED_QUESTION_IDS: string[] = [];

const formatDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
  if (minutes > 0) return `${minutes}min ${seconds.toString().padStart(2, '0')}s`;
  return `${seconds}s`;
};

const formatPace = (secondsPerQuestion: number) => {
  if (secondsPerQuestion <= 0) return 'sem ritmo util';
  const minutes = Math.floor(secondsPerQuestion / 60);
  const seconds = Math.round(secondsPerQuestion % 60);

  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s por questao`;
  return `${seconds}s por questao`;
};

const toPercent = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

const normalizeQuestionId = (questionId: string) => questionId.split('__sim_')[0];

const getPerformanceBadge = (pct: number) => {
  if (pct >= 85) {
    return {
      label: 'Muito acima da media',
      summary: 'Voce terminou forte e com consistencia acima do bloco principal da prova.',
      tone: 'bg-emerald-500/15 text-emerald-700 border-emerald-200 dark:text-emerald-200 dark:border-emerald-800/60',
    };
  }

  if (pct >= 70) {
    return {
      label: 'Acima da media',
      summary: 'Voce ficou num patamar bom e ja tem base para consolidar o que faltou.',
      tone: 'bg-blue-500/15 text-blue-700 border-blue-200 dark:text-blue-200 dark:border-blue-800/60',
    };
  }

  if (pct >= 50) {
    return {
      label: 'Em consolidacao',
      summary: 'Ha base de acerto, mas os erros ainda estao distribuindo sua energia.',
      tone: 'bg-amber-500/15 text-amber-700 border-amber-200 dark:text-amber-200 dark:border-amber-800/60',
    };
  }

  return {
    label: 'Precisa de reforco',
    summary: 'O resultado aponta espacos claros para revisao e uma proxima rodada mais dirigida.',
    tone: 'bg-rose-500/15 text-rose-700 border-rose-200 dark:text-rose-200 dark:border-rose-800/60',
  };
};

const ExamResults: React.FC<ExamResultsProps> = ({
  answers,
  banca,
  modelCategory,
  modelName,
  onContinueExam,
  onNewExam,
  onRetryExam,
  questions,
  snapshot,
  track,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('Todas');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [reviewedQuestionIds, setReviewedQuestionIds] = useLocalStorage<string[]>('mock_exam_reviewed_question_ids', EMPTY_REVIEWED_QUESTION_IDS);
  const reviewSectionRef = useRef<HTMLDivElement | null>(null);
  const theme = TRACK_THEME[track];
  const pct = toPercent(snapshot.correctCount, snapshot.totalQuestions);
  const performance = getPerformanceBadge(pct);
  const unansweredCount = Math.max(0, snapshot.totalQuestions - snapshot.answeredCount);
  const canContinue = Boolean(onContinueExam && unansweredCount > 0 && snapshot.remainingTimeSec > 0 && !snapshot.finishedByTimeout);

  const questionResults = useMemo(() => {
    return questions.map((question, index) => {
      const userAnswer = answers[question.id];
      const correct = userAnswer === question.correctAnswer;
      const topic = question.tags[0] || question.subject;
      const topicKey = `${question.subject}::${topic}`;
      const normalizedId = normalizeQuestionId(question.id);

      return {
        correct,
        difficultyWeight: DIFFICULTY_WEIGHT[question.difficulty],
        displayIndex: index + 1,
        normalizedId,
        question,
        reviewed: reviewedQuestionIds.includes(normalizedId),
        topic,
        topicMistakeCount: snapshot.mistakesByTopic[topicKey] || 0,
        userAnswer,
      };
    });
  }, [answers, questions, reviewedQuestionIds, snapshot.mistakesByTopic]);

  const disciplineStats = useMemo(() => {
    const grouped = new Map<
      string,
      {
        answered: number;
        correct: number;
        subject: string;
        total: number;
        wrong: number;
      }
    >();

    questionResults.forEach((item) => {
      const current = grouped.get(item.question.subject) || {
        answered: 0,
        correct: 0,
        subject: item.question.subject,
        total: 0,
        wrong: 0,
      };

      current.total += 1;
      if (item.userAnswer) current.answered += 1;
      if (item.correct) current.correct += 1;
      else current.wrong += 1;

      grouped.set(item.question.subject, current);
    });

    return [...grouped.values()]
      .map((item) => ({
        ...item,
        pct: toPercent(item.correct, item.total),
      }))
      .sort((a, b) => {
        if (a.pct !== b.pct) return a.pct - b.pct;
        if (a.wrong !== b.wrong) return b.wrong - a.wrong;
        return a.subject.localeCompare(b.subject);
      });
  }, [questionResults]);

  const disciplineAccuracy = useMemo(() => {
    return disciplineStats.reduce<Record<string, number>>((acc, item) => {
      acc[item.subject] = item.pct;
      return acc;
    }, {});
  }, [disciplineStats]);

  const bestDiscipline = disciplineStats.length > 0 ? [...disciplineStats].sort((a, b) => b.pct - a.pct || a.subject.localeCompare(b.subject))[0] : null;
  const worstDiscipline = disciplineStats[0] ?? null;

  const prioritizedErrors = useMemo(() => {
    return questionResults
      .filter((item) => !item.correct)
      .map((item) => ({
        ...item,
        priorityScore: item.topicMistakeCount * 100 + item.difficultyWeight * 20 + (100 - (disciplineAccuracy[item.question.subject] || 0)),
      }))
      .sort((a, b) => {
        if (a.priorityScore !== b.priorityScore) return b.priorityScore - a.priorityScore;
        return a.displayIndex - b.displayIndex;
      });
  }, [disciplineAccuracy, questionResults]);

  const visibleErrors = useMemo(() => {
    return prioritizedErrors.filter((item) => selectedSubject === 'Todas' || item.question.subject === selectedSubject);
  }, [prioritizedErrors, selectedSubject]);

  const reviewedCount = prioritizedErrors.filter((item) => item.reviewed).length;
  const pendingReviewCount = prioritizedErrors.length - reviewedCount;

  const insights = useMemo(() => {
    const nextInsights: string[] = [];

    if (bestDiscipline) {
      nextInsights.push(`Sua melhor area foi ${bestDiscipline.subject} com ${bestDiscipline.correct}/${bestDiscipline.total} acertos.`);
    }

    if (worstDiscipline) {
      nextInsights.push(`A prioridade agora e ${worstDiscipline.subject}, onde seu aproveitamento ficou em ${worstDiscipline.pct}%.`);
    }

    if (unansweredCount > 0) {
      nextInsights.push(`Voce deixou ${unansweredCount} questao(oes) em branco, entao revisar velocidade pode render pontos rapidos.`);
    } else if (snapshot.avgTimePerQuestionSec > 0) {
      nextInsights.push(`Seu ritmo medio ficou em ${formatPace(snapshot.avgTimePerQuestionSec)}.`);
    }

    if (prioritizedErrors[0] && nextInsights.length < 3) {
      nextInsights.push(`O topico mais urgente agora e ${prioritizedErrors[0].topic} em ${prioritizedErrors[0].question.subject}.`);
    }

    return nextInsights.slice(0, 3);
  }, [bestDiscipline, prioritizedErrors, snapshot.avgTimePerQuestionSec, unansweredCount, worstDiscipline]);

  const handleReviewPriority = () => {
    const firstError = prioritizedErrors[0];
    if (!firstError) return;

    setSelectedSubject(firstError.question.subject);
    setExpandedQuestionId(firstError.question.id);
    reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleReviewed = (questionId: string) => {
    const normalizedId = normalizeQuestionId(questionId);
    setReviewedQuestionIds((previous) =>
      previous.includes(normalizedId)
        ? previous.filter((item) => item !== normalizedId)
        : [...previous, normalizedId],
    );
  };

  if (questions.length === 0 || snapshot.totalQuestions === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5" data-testid="mock-exam-results-ready">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">Resultado indisponivel por enquanto</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Este simulado nao gerou dados suficientes para montar o diagnostico completo. Voce pode voltar para o setup e iniciar uma nova rodada.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onNewExam}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              <Play className="h-4 w-4" />
              Novo simulado
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="mock-exam-results-ready">
      <section className={`relative overflow-hidden rounded-[28px] border ${theme.soft} p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-7`}>
        <div className={`absolute inset-x-0 top-0 h-44 bg-gradient-to-br ${theme.hero} opacity-95`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.14),transparent_38%)]" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Resultado do simulado</p>
              <h2 className="mt-2 text-3xl font-semibold text-white sm:text-[2rem]">
                {snapshot.correctCount}/{snapshot.totalQuestions} acertos
              </h2>
              <p className="mt-2 text-sm text-white/80 sm:text-[15px]">
                {modelName ? `${modelName}` : 'Simulado concluido'}{banca ? ` · ${banca}` : ''}{modelCategory ? ` · ${modelCategory}` : ''}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur ${performance.tone}`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {performance.label}
                </span>
                {snapshot.finishedByTimeout ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Tempo encerrado
                  </span>
                ) : unansweredCount > 0 ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                    <Clock3 className="h-3.5 w-3.5" />
                    Entregue com {unansweredCount} em branco
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Prova encerrada com diagnostico completo
                  </span>
                )}
              </div>
            </div>

            <div className="grid min-w-[280px] gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65">% geral</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pct}%</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65">Tempo gasto</p>
                <p className="mt-2 text-3xl font-semibold text-white">{formatDuration(snapshot.elapsedSec)}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65">XP ganho</p>
                <p className="mt-2 text-3xl font-semibold text-white">+{snapshot.xpEarned}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65">Ritmo medio</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatPace(snapshot.avgTimePerQuestionSec)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">Leitura rapida</p>
              <p className="mt-2 text-sm text-white/85">{performance.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {insights.map((insight) => (
                  <span key={insight} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
                    {insight}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                data-testid="mock-exam-results-review-cta"
                onClick={handleReviewPriority}
                disabled={prioritizedErrors.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-xl transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                <Target className="h-4 w-4" />
                Revisar erros prioritarios
              </button>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onRetryExam}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <RotateCcw className="h-4 w-4" />
                  Refazer simulado
                </button>
                <button
                  type="button"
                  onClick={onNewExam}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <Play className="h-4 w-4" />
                  Novo simulado
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {canContinue && (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-5 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Simulado incompleto</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Ainda da para voltar e buscar mais pontos</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Restam {formatDuration(snapshot.remainingTimeSec)} e {unansweredCount} questao(oes) sem resposta.
              </p>
            </div>
            <button
              type="button"
              onClick={onContinueExam}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              <ArrowRight className="h-4 w-4" />
              Continuar simulado
            </button>
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Por disciplina</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Onde voce foi bem e onde precisa agir</h3>
              </div>
              {worstDiscipline && (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                  Pior area: {worstDiscipline.subject}
                </span>
              )}
            </div>

            <div className="mt-5 space-y-3" data-testid="mock-exam-results-by-discipline">
              {disciplineStats.map((item) => {
                const discipline = getDisplayDiscipline(item.subject);
                const DisciplineIcon = discipline.Icon;
                const isWorst = worstDiscipline?.subject === item.subject;

                return (
                  <button
                    key={item.subject}
                    type="button"
                    onClick={() => setSelectedSubject(item.subject)}
                    className={`w-full rounded-[20px] border p-4 text-left transition ${
                      selectedSubject === item.subject
                        ? `${theme.soft}`
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${isWorst ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                          <DisciplineIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{discipline.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.correct}/{item.total} acertos · {item.answered}/{item.total} respondidas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{item.pct}%</p>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">desempenho</p>
                      </div>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${isWorst ? 'from-rose-400 via-rose-500 to-orange-500' : theme.hero}`}
                        style={{ width: `${Math.max(item.pct, item.total > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Resumo rapido</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Melhor area</p>
                <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">{bestDiscipline?.subject || 'Ainda sem leitura'}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{bestDiscipline ? `${bestDiscipline.pct}% de aproveitamento` : 'Faca mais um simulado para gerar comparacao.'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Pior area</p>
                <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">{worstDiscipline?.subject || 'Ainda sem leitura'}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{worstDiscipline ? `${worstDiscipline.wrong} erro(s) concentrados aqui.` : 'O diagnostico aparece assim que houver resultado.'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Revisao</p>
                <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">{pendingReviewCount} item(ns) prioritarios</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{reviewedCount > 0 ? `${reviewedCount} ja marcados como revisados.` : 'Nenhuma revisao marcada ainda.'}</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Proximo passo</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Ataque primeiro o que mais puxa seu resultado para baixo</h3>
            <div className="mt-5 space-y-3">
              {insights.map((insight) => (
                <div key={insight} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${theme.glow}`}>
                    <Zap className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{insight}</p>
                </div>
              ))}
            </div>
          </section>

          <section ref={reviewSectionRef} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Erros prioritarios</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Transforme erro em revisao acionavel</h3>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {pendingReviewCount} pendente(s)
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedSubject('Todas')}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedSubject === 'Todas'
                    ? `${theme.soft}`
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                Todas
              </button>
              {disciplineStats.map((item) => (
                <button
                  key={item.subject}
                  type="button"
                  onClick={() => setSelectedSubject(item.subject)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    selectedSubject === item.subject
                      ? `${theme.soft}`
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {item.subject}
                </button>
              ))}
            </div>

            {prioritizedErrors.length === 0 ? (
              <div className="mt-5 rounded-[22px] border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-200">
                  <Trophy className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Sem erros para revisar</h4>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Este simulado terminou sem respostas erradas. O melhor proximo passo e refazer a prova ou partir para uma rodada nova.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3" data-testid="mock-exam-results-errors-list">
                {visibleErrors.map((item) => {
                  const discipline = getDisplayDiscipline(item.question.subject);
                  const DisciplineIcon = discipline.Icon;
                  const isExpanded = expandedQuestionId === item.question.id;

                  return (
                    <div key={item.question.id} className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                      <button
                        type="button"
                        onClick={() => setExpandedQuestionId(isExpanded ? null : item.question.id)}
                        className="flex w-full items-start justify-between gap-3 p-4 text-left"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/12 text-rose-600 dark:text-rose-200">
                            <XCircle className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                <DisciplineIcon className="h-3.5 w-3.5" />
                                {discipline.label}
                              </span>
                              <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                {item.topic}
                              </span>
                              <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                {item.question.difficulty}
                              </span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Q{item.displayIndex}. {item.question.question}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Sua resposta: {item.userAnswer || 'em branco'} · Correta: {item.question.correctAnswer} · Prioridade {item.priorityScore}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-200 px-4 pb-4 pt-3 dark:border-slate-800">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Diagnostico</p>
                              <div className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                <p>Topico: <span className="font-semibold">{item.topic}</span></p>
                                <p>Falhas nesse topico neste simulado: <span className="font-semibold">{item.topicMistakeCount || 1}</span></p>
                                <p>Aproveitamento da disciplina: <span className="font-semibold">{disciplineAccuracy[item.question.subject] || 0}%</span></p>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Explicacao</p>
                              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{item.question.explanation || 'Sem explicacao cadastrada para esta questao.'}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => toggleReviewed(item.question.id)}
                              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                                item.reviewed
                                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
                                  : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600'
                              }`}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {item.reviewed ? 'Marcado como revisado' : 'Marcar como revisado'}
                            </button>
                            <button
                              type="button"
                              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
                            >
                              <Eye className="h-4 w-4" />
                              Voltar ao resumo
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Acoes rapidas</p>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={handleReviewPriority}
                disabled={prioritizedErrors.length === 0}
                className="inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Abrir revisao priorizada
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={onRetryExam}
                className="inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-700"
              >
                <span className="inline-flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Refazer esta prova
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
};

export default ExamResults;
