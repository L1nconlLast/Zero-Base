import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, BookOpen, Brain, Clock, AlertTriangle, CheckCircle, XCircle, RotateCcw, Play, Trophy, ChevronRight, Filter, Landmark, Sigma, Target, Zap } from 'lucide-react';
import { QUESTIONS_BANK, type Question, type QuestionTrack } from '../../data/questionsBank';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { suggestMockExamTopics } from '../../utils/enemCurriculum';
import {
  buildWeightedDistribution,
  getOfficialExamModelsByTrack,
  isQuestionCompatibleWithModel,
  scoreQuestionForModel,
} from '../../data/officialExamModels';
import { questionsCloudService } from '../../services/questionsCloud.service';
import { getDisplayDiscipline } from '../../utils/disciplineLabels';
import { shuffleArray, shuffleQuestionOptions } from '../../utils/questionRandomization';
import ExamResults, { type ExamResultsSnapshot } from './ExamResults';

interface MockExamProps {
  onEarnXP?: (xp: number) => void;
  onCompleteAttempt?: (result: { correctAnswers: number; totalQuestions: number; xpGained: number }) => void;
  supabaseUserId?: string | null;
  initialFilter?: {
    nonce: number;
    subject?: string;
    topicName?: string;
    track?: QuestionTrack | 'ambos';
  };
}

interface MockExamHistoryEntry {
  date: string;
  mistakesByTopic: Record<string, number>;
  totalQuestions: number;
  correctCount: number;
  track: QuestionTrack | 'ambos';
  modelId?: string;
  banca?: string;
  avgTimePerQuestionSec?: number;
}

type ExamState = 'setup' | 'running' | 'finished';

const EMPTY_ERROR_HISTORY_BY_TOPIC: Record<string, number> = {};
const EMPTY_MOCK_EXAM_HISTORY: MockExamHistoryEntry[] = [];

const TRACK_LABEL: Record<QuestionTrack | 'ambos', string> = {
  enem: 'ENEM',
  concurso: 'Concurso',
  ambos: 'Ambos',
};

const ENEM_SUBJECT_ORDER = ['Linguagens', 'Ciências Humanas', 'Ciências da Natureza', 'Matemática', 'Redação'];
const CONCURSO_SUBJECT_ORDER = ['Português', 'Raciocínio Lógico', 'Direito Constitucional', 'Direito Administrativo', 'Informática', 'Atualidades'];

const ENEM_SUBJECTS = new Set(ENEM_SUBJECT_ORDER);
const CONCURSO_SUBJECTS = new Set(CONCURSO_SUBJECT_ORDER);

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const inferTrackBySubject = (subject?: string): QuestionTrack | 'ambos' | undefined => {
  if (!subject || subject === 'Todas') return undefined;
  if (ENEM_SUBJECTS.has(subject)) return 'enem';
  if (CONCURSO_SUBJECTS.has(subject)) return 'concurso';
  return 'ambos';
};

const matchTopic = (question: Question, selectedTopic: string) => {
  if (selectedTopic === 'Todos') return true;
  const normalized = normalizeText(selectedTopic);
  return question.tags.some((tag) => normalizeText(tag).includes(normalized) || normalized.includes(normalizeText(tag)));
};

const matchTrack = (question: Question, selectedTrack: QuestionTrack | 'ambos') => {
  if (selectedTrack === 'ambos') return Boolean(question.track);
  if (!question.track) return false;
  return question.track === selectedTrack || question.track === 'ambos';
};

const getOrderedSubjects = (subjects: string[], selectedTrack: QuestionTrack | 'ambos') => {
  const subjectSet = new Set(subjects);

  if (selectedTrack === 'enem') return ENEM_SUBJECT_ORDER.filter((subject) => subjectSet.has(subject));
  if (selectedTrack === 'concurso') return CONCURSO_SUBJECT_ORDER.filter((subject) => subjectSet.has(subject));

  const enemOrdered = ENEM_SUBJECT_ORDER.filter((subject) => subjectSet.has(subject));
  const concursoOrdered = CONCURSO_SUBJECT_ORDER.filter((subject) => subjectSet.has(subject));
  const known = new Set([...enemOrdered, ...concursoOrdered]);
  const remaining = subjects.filter((subject) => !known.has(subject)).sort((a, b) => a.localeCompare(b));
  return [...enemOrdered, ...concursoOrdered, ...remaining];
};

const getSubjectChipClass = (subject: string, selected: boolean) => {
  if (selected) return 'bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200';
  if (ENEM_SUBJECTS.has(subject)) return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  if (CONCURSO_SUBJECTS.has(subject)) return 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800';
  return 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700';
};

const pickWithDistribution = (pool: Question[], total: number, subjects: string[]) => {
  if (subjects.length === 0) return shuffleArray(pool).slice(0, Math.min(total, pool.length));

  const bySubject = new Map<string, Question[]>();
  subjects.forEach((subject) => bySubject.set(subject, shuffleArray(pool.filter((q) => q.subject === subject))));

  const result: Question[] = [];
  const base = Math.floor(total / subjects.length);
  const remainder = total % subjects.length;

  subjects.forEach((subject, index) => {
    const target = base + (index < remainder ? 1 : 0);
    const candidates = bySubject.get(subject) ?? [];
    result.push(...candidates.slice(0, target));
    bySubject.set(subject, candidates.slice(target));
  });

  if (result.length < total) {
    const leftovers = subjects.flatMap((subject) => bySubject.get(subject) ?? []);
    const usedIds = new Set(result.map((q) => q.id));
    result.push(...shuffleArray(leftovers).filter((q) => !usedIds.has(q.id)).slice(0, total - result.length));
  }

  return shuffleArray(result).slice(0, Math.min(total, pool.length));
};

const pickByExactDistribution = (pool: Question[], distribution: Array<{ subject: string; count: number }>) => {
  if (distribution.length === 0) return [] as Question[];

  const result: Question[] = [];
  const usedIds = new Set<string>();

  distribution.forEach(({ subject, count }) => {
    const selected = shuffleArray(pool)
      .filter((question) => question.subject === subject && !usedIds.has(question.id))
      .slice(0, count);
    selected.forEach((question) => usedIds.add(question.id));
    result.push(...selected);
  });

  if (result.length < distribution.reduce((sum, item) => sum + item.count, 0)) {
    result.push(...shuffleArray(pool).filter((question) => !usedIds.has(question.id)).slice(0, distribution.reduce((sum, item) => sum + item.count, 0) - result.length));
  }

  return shuffleArray(result);
};

const ensureQuestionCount = (questions: Question[], pool: Question[], target: number): Question[] => {
  if (target <= 0 || pool.length === 0) {
    return [];
  }

  if (questions.length >= target) {
    return questions.slice(0, target);
  }

  const expanded = [...questions];
  let cursor = 0;

  while (expanded.length < target) {
    const base = pool[cursor % pool.length];
    expanded.push({
      ...base,
      id: `${base.id}__sim_${expanded.length + 1}`,
    });
    cursor += 1;
  }

  return expanded;
};

const distributeEvenly = (total: number, subjects: string[]) => {
  if (subjects.length === 0 || total <= 0) return [] as Array<{ subject: string; count: number }>;
  const base = Math.floor(total / subjects.length);
  const remainder = total % subjects.length;
  return subjects.map((subject, index) => ({ subject, count: base + (index < remainder ? 1 : 0) }));
};

const getQuestionTopicKey = (question: Question) => `${question.subject}::${question.tags[0] || question.subject}`;

const EXAM_CONFIGS_BY_TRACK: Record<QuestionTrack | 'ambos', Array<{ label: string; questions: number; minutes: number; icon: LucideIcon }>> = {
  enem: [
    { label: 'ENEM Rápido', questions: 20, minutes: 40, icon: Zap },
    { label: 'ENEM Padrão', questions: 45, minutes: 90, icon: BookOpen },
    { label: 'ENEM Intensivo', questions: 90, minutes: 180, icon: Trophy },
  ],
  concurso: [
    { label: 'Concurso Rápido', questions: 20, minutes: 30, icon: Zap },
    { label: 'Concurso Padrão', questions: 40, minutes: 60, icon: BookOpen },
    { label: 'Concurso Intensivo', questions: 60, minutes: 90, icon: Landmark },
  ],
  ambos: [
    { label: 'Misto Rápido', questions: 15, minutes: 25, icon: Zap },
    { label: 'Misto Padrão', questions: 30, minutes: 45, icon: Brain },
    { label: 'Misto Intensivo', questions: 50, minutes: 75, icon: Target },
  ],
};

const ENEM_PRESET_QUESTION_COUNTS = [20, 45, 90] as const;

const TRACK_THEME = {
  enem: {
    hero: 'from-blue-500 via-cyan-500 to-sky-600',
    glow: 'bg-blue-500/15 text-blue-700 dark:text-blue-200 border-blue-200/80 dark:border-blue-800/60',
    soft: 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/60',
    text: 'text-blue-700 dark:text-blue-200',
  },
  concurso: {
    hero: 'from-emerald-500 via-teal-500 to-cyan-600',
    glow: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-200/80 dark:border-emerald-800/60',
    soft: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60',
    text: 'text-emerald-700 dark:text-emerald-200',
  },
  ambos: {
    hero: 'from-amber-400 via-orange-500 to-rose-500',
    glow: 'bg-orange-500/15 text-orange-700 dark:text-orange-200 border-orange-200/80 dark:border-orange-800/60',
    soft: 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-200/80 dark:border-orange-800/60',
    text: 'text-orange-700 dark:text-orange-200',
  },
} as const;

const EXAM_MODE_PROFILES = [
  {
    title: 'Entrada rapida',
    description: 'Baixa friccao para sair do zero, aquecer e ganhar XP sem desgaste longo.',
    impact: 'Bom para ritmo e constancia semanal.',
    level: 'Leve',
  },
  {
    title: 'Sessao principal',
    description: 'Equilibrio entre volume, foco e pressao de prova para medir desempenho real.',
    impact: 'Bom para ranking e progresso de verdade.',
    level: 'Medio',
  },
  {
    title: 'Carga maxima',
    description: 'Mais proximo de prova pesada, com profundidade maior e mais tempo sob pressao.',
    impact: 'Melhor para resistencia e salto perceptivel.',
    level: 'Alto',
  },
] as const;

const MockExam: React.FC<MockExamProps> = ({ onEarnXP, onCompleteAttempt, supabaseUserId, initialFilter }) => {
  const [examState, setExamState] = useState<ExamState>('setup');
  const [selectedConfig, setSelectedConfig] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<QuestionTrack | 'ambos'>('ambos');
  const [selectedSubject, setSelectedSubject] = useState<string>('Todas');
  const [selectedTopic, setSelectedTopic] = useState<string>('Todos');
  const [officialDistribution, setOfficialDistribution] = useState(false);
  const [selectedOfficialModelId, setSelectedOfficialModelId] = useState<string>('none');
  const [adaptiveMode, setAdaptiveMode] = useLocalStorage<boolean>('mock_exam_adaptive_mode', true);
  const [daysToExam, setDaysToExam] = useLocalStorage<number>('mock_exam_days_to_exam', 120);
  const [errorHistoryByTopic, setErrorHistoryByTopic] = useLocalStorage<Record<string, number>>('mock_exam_error_history_by_topic', EMPTY_ERROR_HISTORY_BY_TOPIC);
  const [, setExamHistory] = useLocalStorage<MockExamHistoryEntry[]>('mock_exam_history', EMPTY_MOCK_EXAM_HISTORY);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [examStartedAt, setExamStartedAt] = useState<number>(0);
  const [resultSnapshot, setResultSnapshot] = useState<ExamResultsSnapshot | null>(null);

  const configsForTrack = EXAM_CONFIGS_BY_TRACK[selectedTrack];
  const config = configsForTrack[selectedConfig] ?? configsForTrack[0];
  const officialModels = useMemo(() => getOfficialExamModelsByTrack(selectedTrack), [selectedTrack]);
  const selectedModel = useMemo(
    () => officialModels.find((model) => model.id === selectedOfficialModelId),
    [officialModels, selectedOfficialModelId],
  );

  const subjectsByTrack = useMemo(() => {
    const unique = [...new Set(QUESTIONS_BANK.filter((q) => matchTrack(q, selectedTrack)).map((q) => q.subject))];
    return getOrderedSubjects(unique, selectedTrack);
  }, [selectedTrack]);

  const topicsBySelection = useMemo(() => {
    const topics = new Set<string>();
    QUESTIONS_BANK.forEach((question) => {
      if (!matchTrack(question, selectedTrack)) return;
      if (selectedSubject !== 'Todas' && question.subject !== selectedSubject) return;
      question.tags.forEach((tag) => topics.add(tag));
    });
    return [...topics].sort((a, b) => a.localeCompare(b));
  }, [selectedSubject, selectedTrack]);

  useEffect(() => {
    if (!initialFilter) return;

    const nextTrack = initialFilter.track || inferTrackBySubject(initialFilter.subject) || 'ambos';
    setSelectedTrack(nextTrack);
    setSelectedSubject(initialFilter.subject || 'Todas');
    setSelectedTopic(initialFilter.topicName || 'Todos');
    setSelectedOfficialModelId('none');
    setOfficialDistribution(false);
    setSelectedConfig(0);
    setExamState('setup');
  }, [initialFilter]);

  useEffect(() => {
    if (selectedSubject !== 'Todas' && !subjectsByTrack.includes(selectedSubject)) {
      setSelectedSubject('Todas');
    }
  }, [selectedSubject, subjectsByTrack]);

  useEffect(() => {
    if (selectedTopic !== 'Todos' && !topicsBySelection.includes(selectedTopic)) {
      setSelectedTopic('Todos');
    }
  }, [selectedTopic, topicsBySelection]);

  useEffect(() => {
    setSelectedConfig(0);
    setOfficialDistribution(false);
    setSelectedOfficialModelId('none');
  }, [selectedTrack]);

  useEffect(() => {
    setShowAllTopics(false);
  }, [selectedSubject, selectedTrack]);

  const availablePool = useMemo(() => {
    const base = QUESTIONS_BANK.filter(
      (q) =>
        matchTrack(q, selectedTrack) &&
        (selectedSubject === 'Todas' || q.subject === selectedSubject) &&
        matchTopic(q, selectedTopic),
    );

    if (!selectedModel) return base;

    return base.filter((question) => isQuestionCompatibleWithModel(question, selectedModel));
  }, [selectedSubject, selectedTrack, selectedModel, selectedTopic]);

  const targetQuestionCount = useMemo(() => {
    if (selectedModel) return selectedModel.questoes;

    if (selectedTrack === 'enem') {
      return ENEM_PRESET_QUESTION_COUNTS[selectedConfig] ?? ENEM_PRESET_QUESTION_COUNTS[0];
    }

    return config.questions;
  }, [config.questions, selectedConfig, selectedModel, selectedTrack]);

  const plannedQuestionCount = availablePool.length > 0 ? targetQuestionCount : 0;
  const plannedMinutes = selectedModel?.duracaoMinutos ?? config.minutes;
  const uniqueAvailableCount = availablePool.length;
  const repeatedQuestionsCount = Math.max(0, plannedQuestionCount - uniqueAvailableCount);
  const theme = TRACK_THEME[selectedTrack];
  const configProfile = EXAM_MODE_PROFILES[selectedConfig] ?? EXAM_MODE_PROFILES[0];
  const visibleTopics = showAllTopics ? topicsBySelection : topicsBySelection.slice(0, 12);
  const hiddenTopicsCount = Math.max(0, topicsBySelection.length - 12);

  const frequencyByTopic = useMemo(() => {
    const map: Record<string, number> = {};
    availablePool.forEach((question) => {
      const key = getQuestionTopicKey(question);
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [availablePool]);

  const adaptivePriorityTopics = useMemo(() => {
    if (!adaptiveMode) return [];
    return suggestMockExamTopics({
      errorsByTopic: errorHistoryByTopic,
      enemFrequencyByTopic: frequencyByTopic,
      daysLeftToExam: daysToExam,
      maxTopics: 12,
    });
  }, [adaptiveMode, daysToExam, errorHistoryByTopic, frequencyByTopic]);

  const plannedDistribution = useMemo(() => {
    if (plannedQuestionCount <= 0) return [] as Array<{ subject: string; count: number }>;

    if (selectedSubject !== 'Todas') return [{ subject: selectedSubject, count: plannedQuestionCount }];

    const availableSubjects = [...new Set(availablePool.map((q) => q.subject))];

    if (selectedModel) {
      return buildWeightedDistribution(selectedModel, plannedQuestionCount, availableSubjects);
    }

    if (!officialDistribution) return [{ subject: 'Aleatório', count: plannedQuestionCount }];

    if (selectedTrack === 'enem') {
      return distributeEvenly(plannedQuestionCount, ENEM_SUBJECT_ORDER.filter((subject) => availableSubjects.includes(subject)));
    }

    if (selectedTrack === 'concurso') {
      return distributeEvenly(plannedQuestionCount, CONCURSO_SUBJECT_ORDER.filter((subject) => availableSubjects.includes(subject)));
    }

    const enemSubjects = ENEM_SUBJECT_ORDER.filter((subject) => availableSubjects.includes(subject));
    const concursoSubjects = CONCURSO_SUBJECT_ORDER.filter((subject) => availableSubjects.includes(subject));

    if (enemSubjects.length === 0) return distributeEvenly(plannedQuestionCount, concursoSubjects);
    if (concursoSubjects.length === 0) return distributeEvenly(plannedQuestionCount, enemSubjects);

    const enemTotal = Math.floor(plannedQuestionCount / 2);
    return [
      ...distributeEvenly(enemTotal, enemSubjects),
      ...distributeEvenly(plannedQuestionCount - enemTotal, concursoSubjects),
    ].filter((item) => item.count > 0);
  }, [availablePool, officialDistribution, plannedQuestionCount, selectedSubject, selectedTrack, selectedModel]);

  const highlightedSubjects = useMemo(
    () => plannedDistribution.filter((item) => item.subject !== 'Aleatório').slice(0, 4),
    [plannedDistribution],
  );

  const adaptiveHighlights = useMemo(
    () =>
      adaptivePriorityTopics.slice(0, 3).map((topicKey) => {
        const [subject, topic] = topicKey.split('::');
        return {
          key: topicKey,
          subject,
          topic: topic || subject,
        };
      }),
    [adaptivePriorityTopics],
  );

  const setupCtaLabel = selectedModel ? `Começar ${selectedModel.nome}` : `Iniciar ${config.label}`;
  const setupCtaMeta = `${plannedQuestionCount} questões · ${plannedMinutes} min${selectedModel?.banca ? ` · ${selectedModel.banca}` : ''}`;
  const progressSignals = [
    '+XP ao concluir',
    supabaseUserId ? 'Resultado salvo no histórico' : 'Resultado salvo localmente',
    selectedModel?.category ? `Reforça ranking de ${selectedModel.category}` : 'Reflete no ranking por pontuação',
  ];

  const startExam = () => {
    const adaptiveSet = new Set(adaptivePriorityTopics);
    const prioritizedPool = adaptiveMode
      ? [...availablePool].sort((a, b) => {
        const aTopic = adaptiveSet.has(getQuestionTopicKey(a)) ? 1 : 0;
        const bTopic = adaptiveSet.has(getQuestionTopicKey(b)) ? 1 : 0;
        const modelWeight = selectedModel
          ? scoreQuestionForModel(b, selectedModel, errorHistoryByTopic) - scoreQuestionForModel(a, selectedModel, errorHistoryByTopic)
          : 0;
        if (modelWeight !== 0) return modelWeight;
        if (aTopic !== bTopic) return bTopic - aTopic;
        return Math.random() - 0.5;
      })
      : shuffleArray(availablePool);

    let qs: Question[];

    if (selectedModel && selectedSubject === 'Todas') {
      qs = pickByExactDistribution(prioritizedPool, plannedDistribution);
    } else if (officialDistribution && selectedSubject === 'Todas') {
      if (selectedTrack === 'enem') {
        qs = pickWithDistribution(prioritizedPool, plannedQuestionCount, ENEM_SUBJECT_ORDER.filter((subject) => subjectsByTrack.includes(subject)));
      } else if (selectedTrack === 'concurso') {
        qs = pickWithDistribution(prioritizedPool, plannedQuestionCount, CONCURSO_SUBJECT_ORDER.filter((subject) => subjectsByTrack.includes(subject)));
      } else {
        const enemSubjects = ENEM_SUBJECT_ORDER.filter((subject) => subjectsByTrack.includes(subject));
        const concursoSubjects = CONCURSO_SUBJECT_ORDER.filter((subject) => subjectsByTrack.includes(subject));
        const enemTarget = Math.floor(plannedQuestionCount / 2);
        const enemPool = prioritizedPool.filter((q) => enemSubjects.includes(q.subject));
        const concursoPool = prioritizedPool.filter((q) => concursoSubjects.includes(q.subject));
        qs = shuffleArray([
          ...pickWithDistribution(enemPool, enemTarget, enemSubjects),
          ...pickWithDistribution(concursoPool, plannedQuestionCount - enemTarget, concursoSubjects),
        ]).slice(0, plannedQuestionCount);
      }
    } else {
      qs = prioritizedPool.slice(0, plannedQuestionCount);
    }

    qs = ensureQuestionCount(qs, prioritizedPool, plannedQuestionCount);
    qs = qs.map(shuffleQuestionOptions);

    setQuestions(qs);
    setAnswers({});
    setCurrentIdx(0);
    setTimeLeftSec(plannedMinutes * 60);
    setTimerStarted(false);
    setExamStartedAt(Date.now());
    setResultSnapshot(null);
    setExamState('running');
  };

  const handleAnswer = (letter: string) => {
    if (!timerStarted) setTimerStarted(true);
    const qId = questions[currentIdx].id;
    setAnswers((previous) => ({ ...previous, [qId]: letter }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) setCurrentIdx((previous) => previous + 1);
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx((previous) => previous - 1);
  };

  const handleFinish = useCallback((options?: { finishedByTimeout?: boolean }) => {
    if (questions.length === 0) {
      setExamState('setup');
      return;
    }

    let xp = 0;
    const wrongTopics: string[] = [];
    let correctAnswersCount = 0;

    questions.forEach((question) => {
      if (answers[question.id] === question.correctAnswer) {
        xp += question.xpReward;
        correctAnswersCount += 1;
        return;
      }

      wrongTopics.push(getQuestionTopicKey(question));
    });

    const sessionMistakes = wrongTopics.reduce<Record<string, number>>((acc, topicKey) => {
      acc[topicKey] = (acc[topicKey] || 0) + 1;
      return acc;
    }, {});
    const answered = Object.keys(answers).length;
    const shouldCommitResult = Boolean(options?.finishedByTimeout) || answered === questions.length;

    if (shouldCommitResult && wrongTopics.length > 0) {
      setErrorHistoryByTopic((previous) => {
        const next = { ...previous };
        wrongTopics.forEach((topicKey) => {
          next[topicKey] = (next[topicKey] || 0) + 1;
        });
        return next;
      });
    }

    const elapsedSec = Math.max(0, examStartedAt ? Math.round((Date.now() - examStartedAt) / 1000) : 0);
    const avgTimePerQuestionSec = answered > 0 ? Number((elapsedSec / answered).toFixed(1)) : 0;
    const snapshot: ExamResultsSnapshot = {
      answeredCount: answered,
      avgTimePerQuestionSec,
      correctCount: correctAnswersCount,
      elapsedSec,
      finishedByTimeout: Boolean(options?.finishedByTimeout),
      mistakesByTopic: sessionMistakes,
      remainingTimeSec: options?.finishedByTimeout ? 0 : Math.max(0, timeLeftSec),
      totalQuestions: questions.length,
      xpEarned: shouldCommitResult ? xp : 0,
    };

    const historyEntry: MockExamHistoryEntry = {
      date: new Date().toISOString(),
      mistakesByTopic: sessionMistakes,
      totalQuestions: questions.length,
      correctCount: correctAnswersCount,
      track: selectedTrack,
      modelId: selectedModel?.id,
      banca: selectedModel?.banca,
      avgTimePerQuestionSec,
    };

    if (shouldCommitResult) {
      setExamHistory((previous) => [...previous, historyEntry].slice(-40));

      if (supabaseUserId) {
        void questionsCloudService.saveMockExamSession(supabaseUserId, {
          id: crypto.randomUUID(),
          date: historyEntry.date,
          track: selectedTrack,
          modelId: selectedModel?.id,
          modelName: selectedModel?.nome,
          banca: selectedModel?.banca,
          category: selectedModel?.category,
          totalQuestions: historyEntry.totalQuestions,
          correctCount: historyEntry.correctCount,
          xpEarned: xp,
          avgTimePerQuestionSec,
          mistakesByTopic: sessionMistakes,
        }).catch(() => undefined);
      }
    }

    if (shouldCommitResult) {
      onEarnXP?.(xp);
      onCompleteAttempt?.({
        correctAnswers: correctAnswersCount,
        totalQuestions: questions.length,
        xpGained: xp,
      });
    }
    setResultSnapshot(snapshot);
    setTimerStarted(false);
    setExamState('finished');
  }, [answers, examStartedAt, onCompleteAttempt, onEarnXP, questions, selectedModel, selectedTrack, setErrorHistoryByTopic, setExamHistory, supabaseUserId, timeLeftSec]);

  useEffect(() => {
    if (!timerStarted || examState !== 'running') return;
    if (timeLeftSec <= 0) {
      setTimeLeftSec(0);
      handleFinish({ finishedByTimeout: true });
      return;
    }
    const id = setInterval(() => setTimeLeftSec((previous) => previous - 1), 1000);
    return () => clearInterval(id);
  }, [examState, handleFinish, timeLeftSec, timerStarted]);

  const handleRetryExam = useCallback(() => {
    if (questions.length === 0) {
      setExamState('setup');
      return;
    }

    setQuestions((previous) => previous.map(shuffleQuestionOptions));
    setAnswers({});
    setCurrentIdx(0);
    setTimeLeftSec(plannedMinutes * 60);
    setTimerStarted(false);
    setExamStartedAt(Date.now());
    setResultSnapshot(null);
    setExamState('running');
  }, [plannedMinutes, questions.length]);

  const handleContinueExam = useCallback(() => {
    if (!resultSnapshot || resultSnapshot.remainingTimeSec <= 0) return;

    const firstUnansweredIndex = questions.findIndex((question) => !answers[question.id]);

    setCurrentIdx(firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0);
    setTimeLeftSec(resultSnapshot.remainingTimeSec);
    setTimerStarted(resultSnapshot.answeredCount > 0 || resultSnapshot.elapsedSec > 0);
    setExamStartedAt(Date.now() - resultSnapshot.elapsedSec * 1000);
    setResultSnapshot(null);
    setExamState('running');
  }, [answers, questions, resultSnapshot]);

  const handleNewExam = useCallback(() => {
    setExamState('setup');
    setCurrentIdx(0);
    setAnswers({});
    setQuestions([]);
    setTimeLeftSec(0);
    setTimerStarted(false);
    setExamStartedAt(0);
    setResultSnapshot(null);
  }, []);

  const { correctCount, pct } = useMemo(() => {
    if (examState !== 'finished') return { correctCount: 0, pct: 0 };
    const c = questions.filter((question) => answers[question.id] === question.correctAnswer).length;
    return { correctCount: c, pct: questions.length > 0 ? Math.round((c / questions.length) * 100) : 0 };
  }, [answers, examState, questions]);

  const totalXP = useMemo(() => {
    if (examState !== 'finished') return 0;
    return questions.reduce((sum, question) => sum + (answers[question.id] === question.correctAnswer ? question.xpReward : 0), 0);
  }, [answers, examState, questions]);

  const formatTime = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
  const answeredCount = Object.keys(answers).length;
  const timeWarning = timeLeftSec > 0 && timeLeftSec <= 120;

  if (examState === 'setup') {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <section className={`relative overflow-hidden rounded-[28px] border ${theme.soft} p-6 sm:p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)]`}>
          <div className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-br ${theme.hero} opacity-95`} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.12),transparent_38%)]" />
          <div className="relative space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Simulado recomendado</p>
                <h2 className="mt-2 inline-flex items-center gap-2 text-3xl font-semibold text-white sm:text-[2rem]">
                  <BookOpen className="h-7 w-7" />
                  {selectedModel ? selectedModel.nome : config.label}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-[15px]">
                  {selectedModel
                    ? `Modelo oficial com ${selectedModel.questoes} questoes para treinar no formato ${selectedModel.banca}.`
                    : `${configProfile.description} ${adaptiveMode ? 'A IA prioriza os temas em que voce mais vacila.' : 'Voce entra direto em uma prova limpa e objetiva.'}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['enem', 'concurso', 'ambos'] as const).map((track) => (
                  <button
                    key={track}
                    onClick={() => setSelectedTrack(track)}
                    className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${selectedTrack === track
                      ? 'border-white/50 bg-white text-slate-900 shadow-lg'
                      : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                      }`}
                  >
                    {TRACK_LABEL[track]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65">Questoes</p>
                <p className="mt-2 text-2xl font-semibold text-white">{plannedQuestionCount || config.questions}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65">Tempo</p>
                <p className="mt-2 text-2xl font-semibold text-white">{plannedMinutes} min</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65">Nivel</p>
                <p className="mt-2 text-2xl font-semibold text-white">{configProfile.level}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65">Impacto</p>
                <p className="mt-2 text-sm font-semibold text-white">{selectedModel?.category || 'XP + ranking'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {highlightedSubjects.length > 0 ? highlightedSubjects.map((item) => {
                const discipline = getDisplayDiscipline(item.subject);
                const DisciplineIcon = discipline.Icon;

                return (
                  <span key={item.subject} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
                    <DisciplineIcon className="h-3.5 w-3.5" />
                    {discipline.label} · {item.count}
                  </span>
                );
              }) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
                  <Sigma className="h-3.5 w-3.5" />
                  Distribuicao livre para {TRACK_LABEL[selectedTrack]}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={startExam}
                disabled={availablePool.length === 0}
                className="inline-flex flex-1 items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 py-4 text-left text-white shadow-xl transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                <Play className="h-5 w-5 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold">{setupCtaLabel}</span>
                  <span className="block text-xs font-medium text-white/70 dark:text-slate-500">{setupCtaMeta}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((previous) => !previous)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <Filter className="h-4 w-4" />
                {showAdvancedFilters ? 'Ocultar personalizacao' : 'Personalizar simulado'}
              </button>
            </div>

            {availablePool.length === 0 && (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/40 bg-amber-400/15 px-4 py-3 text-sm text-white">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Nenhuma questao encontrada com os filtros atuais. Abra a personalizacao e alivie os filtros para liberar o simulado.
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {configsForTrack.map((cfg, i) => {
            const ConfigIcon = cfg.icon;
            const profile = EXAM_MODE_PROFILES[i] ?? EXAM_MODE_PROFILES[0];
            const isSelected = selectedConfig === i;

            return (
              <button
                key={cfg.label}
                type="button"
                disabled={Boolean(selectedModel)}
                onClick={() => setSelectedConfig(i)}
                className={`group rounded-[24px] border p-5 text-left transition ${isSelected
                  ? `${theme.soft} shadow-[0_18px_40px_rgba(15,23,42,0.08)]`
                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                  } ${selectedModel ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${isSelected ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                    <ConfigIcon className="h-5 w-5" />
                  </div>
                  {isSelected ? <CheckCircle className={`h-5 w-5 shrink-0 ${theme.text}`} /> : <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400" />}
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{cfg.label}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{profile.description}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {cfg.questions} questoes
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {cfg.minutes} min
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isSelected ? theme.glow : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                    {profile.level}
                  </span>
                </div>
                <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">{profile.impact}</p>
              </button>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">

            {showAdvancedFilters && (
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Modo avancado</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Personalizar simulado</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ajuste banca, disciplina, topicos e distribuicao so se precisar afinar a prova.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <ChevronRight className="h-5 w-5 rotate-90" />
                  </button>
                </div>
                <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Filter className="inline w-3.5 h-3.5 mr-1" />Trilha
          </p>
          <div className="flex flex-wrap gap-2">
            {(['enem', 'concurso', 'ambos'] as const).map((track) => (
              <button
                key={track}
                onClick={() => setSelectedTrack(track)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${selectedTrack === track
                  ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
              >
                {TRACK_LABEL[track]}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Modelo oficial (edital/banca)
            </label>
            <select
              value={selectedOfficialModelId}
              onChange={(event) => setSelectedOfficialModelId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 py-2"
            >
              <option value="none">Sem modelo específico</option>
              {Object.entries(
                officialModels.reduce((acc, model) => {
                  const cat = model.category || 'Outros';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(model);
                  return acc;
                }, {} as Record<string, typeof officialModels>)
              ).map(([category, models]) => (
                <optgroup key={category} label={category}>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.nome} · {model.banca}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedModel && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {selectedModel.edital} · {selectedModel.questoes} questões · {selectedModel.duracaoMinutos} min
              </p>
            )}
          </div>

          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Disciplina</p>
          <div className="flex flex-wrap gap-2">
            {['Todas', ...subjectsByTrack].map((subject) => {
              const discipline = getDisplayDiscipline(subject);
              const DisciplineIcon = discipline.Icon;

              return (<button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${subject === 'Todas'
                  ? selectedSubject === subject
                    ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  : getSubjectChipClass(subject, selectedSubject === subject)
                  }`}
              >
                {subject === 'Todas' ? 'Todas' : <span className="inline-flex items-center gap-1.5"><DisciplineIcon className="w-3.5 h-3.5" />{discipline.label}</span>}
              </button>);
            })}
          </div>

          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tópico</p>
          <div className="flex flex-wrap gap-2">
            {['Todos', ...visibleTopics].map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${selectedTopic === topic
                  ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
              >
                {topic}
              </button>
            ))}
          </div>
          {hiddenTopicsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllTopics((previous) => !previous)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              {showAllTopics ? 'Mostrar menos topicos' : `Ver mais ${hiddenTopicsCount} topicos`}
            </button>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={officialDistribution}
              onChange={(event) => setOfficialDistribution(event.target.checked)}
              disabled={selectedSubject !== 'Todas' || Boolean(selectedModel)}
              className="rounded border-gray-300"
            />
            Distribuição oficial por área
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={adaptiveMode}
              onChange={(event) => setAdaptiveMode(event.target.checked)}
              className="rounded border-gray-300"
            />
            Modo adaptativo IA (prioriza seus erros)
          </label>

          {adaptiveMode && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-blue-700 dark:text-blue-300">Dias até a prova</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">{daysToExam}</span>
              </div>
              <input
                type="range"
                min={15}
                max={365}
                step={5}
                value={daysToExam}
                onChange={(event) => setDaysToExam(Number(event.target.value))}
                className="w-full"
              />
            </div>
          )}
                </div>
              </div>
            )}

        {false && !selectedModel && (
          <div className="space-y-3">
            {configsForTrack.map((cfg, i) => {
              const ConfigIcon = cfg.icon;

              return (<button
                key={cfg.label}
                onClick={() => setSelectedConfig(i)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 ${selectedConfig === i
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
              >
                <ConfigIcon className="w-8 h-8" />
                <div className="text-left flex-1">
                  <p className={`font-bold ${selectedConfig === i ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-100'}`}>
                    {cfg.label}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{cfg.questions} questões · {cfg.minutes} minutos</p>
                </div>
                {selectedConfig === i && <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />}
              </button>);
            })}
          </div>
        )}

        <button
          onClick={startExam}
          disabled={availablePool.length === 0}
          className="hidden"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Play className="w-5 h-5" /> Iniciar Simulado
        </button>

        <div className="hidden">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Distribuição planejada ({plannedQuestionCount} questões{plannedQuestionCount > 0 ? ` · ${uniqueAvailableCount} únicas` : ''})
          </p>
          <div className="flex flex-wrap gap-2">
            {plannedDistribution.length > 0 ? (
              plannedDistribution.map((item) => {
                const discipline = getDisplayDiscipline(item.subject);
                const DisciplineIcon = discipline.Icon;

                return (
                  <span key={item.subject} className="px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                    {item.subject === 'Aleatório' ? <span className="inline-flex items-center gap-1.5"><Sigma className="w-3.5 h-3.5" />Aleatório</span> : <span className="inline-flex items-center gap-1.5"><DisciplineIcon className="w-3.5 h-3.5" />{discipline.label}</span>} · {item.count}
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">Sem questões disponíveis para os filtros atuais.</span>
            )}
          </div>
          {plannedQuestionCount > 0 && repeatedQuestionsCount > 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">
              Banco atual menor que o alvo: repetição controlada de {repeatedQuestionsCount} questão(ões) para completar o simulado.
            </p>
          )}
        </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Preview da prova</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">O que voce vai enfrentar</h3>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.glow}`}>
                  <Clock className="h-3.5 w-3.5" />
                  {plannedMinutes} min
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800/80">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Questoes</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{plannedQuestionCount}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800/80">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Banco disponivel</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{uniqueAvailableCount}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{configProfile.title}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selectedModel ? `Formato ${selectedModel.banca}${selectedModel.category ? ` · ${selectedModel.category}` : ''}` : configProfile.impact}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Materias incluidas</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {highlightedSubjects.length > 0 ? highlightedSubjects.map((item) => {
                      const discipline = getDisplayDiscipline(item.subject);
                      const DisciplineIcon = discipline.Icon;

                      return (
                        <span key={item.subject} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          <DisciplineIcon className="h-3.5 w-3.5" />
                          {discipline.label} · {item.count}
                        </span>
                      );
                    }) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400">A distribuicao aparece assim que houver questoes disponiveis para os filtros atuais.</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Impacto da sessao</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Esse simulado gera progresso visivel</h3>
              <div className="mt-5 space-y-3">
                {progressSignals.map((signal) => (
                  <div key={signal} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${theme.glow}`}>
                      <Trophy className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{signal}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {signal.includes('ranking')
                          ? 'Seu resultado ajuda a transformar estudo em posicao percebida no produto.'
                          : signal.includes('historico')
                            ? 'O desempenho fica guardado para leitura futura e novas recomendacoes.'
                            : 'Quanto melhor o desempenho, maior o ganho de pontos e feedback imediato.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {adaptiveMode && adaptiveHighlights.length > 0 && (
                <div className={`mt-5 rounded-[22px] border p-4 ${theme.soft}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${theme.text}`}>A IA deve puxar voce para</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {adaptiveHighlights.map((item) => (
                      <span key={item.key} className="rounded-full border border-white/50 bg-white/70 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                        {item.subject} · {item.topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Distribuicao planejada ({plannedQuestionCount} questoes{plannedQuestionCount > 0 ? ` · ${uniqueAvailableCount} unicas` : ''})
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {plannedDistribution.length > 0 ? (
                  plannedDistribution.map((item) => {
                    const discipline = getDisplayDiscipline(item.subject);
                    const DisciplineIcon = discipline.Icon;

                    return (
                      <span key={item.subject} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {item.subject.toLowerCase().startsWith('aleat') ? <span className="inline-flex items-center gap-1.5"><Sigma className="h-3.5 w-3.5" />Aleatorio</span> : <span className="inline-flex items-center gap-1.5"><DisciplineIcon className="h-3.5 w-3.5" />{discipline.label}</span>} · {item.count}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">Sem questoes disponiveis para os filtros atuais.</span>
                )}
              </div>
              {plannedQuestionCount > 0 && repeatedQuestionsCount > 0 && (
                <p className="mt-3 text-[11px] text-amber-600 dark:text-amber-400">
                  Banco atual menor que o alvo: repeticao controlada de {repeatedQuestionsCount} questao(oes) para completar o simulado.
                </p>
              )}
            </section>
          </aside>
        </section>
      </div>
    );
  }

  if (examState === 'finished') {
    if (!resultSnapshot) {
      return null;
    }

    return (
      <ExamResults
        answers={answers}
        banca={selectedModel?.banca}
        modelCategory={selectedModel?.category}
        modelName={selectedModel?.nome}
        onContinueExam={handleContinueExam}
        onNewExam={handleNewExam}
        onRetryExam={handleRetryExam}
        questions={questions}
        snapshot={resultSnapshot}
        track={selectedTrack}
      />
    );

    const grade = pct >= 70 ? 'Aprovado' : pct >= 50 ? 'Regular' : 'Reprovado';
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center shadow-sm">
          <div className="flex justify-center mb-3">{pct >= 70 ? <Trophy className="w-12 h-12 text-amber-500" /> : pct >= 50 ? <BarChart3 className="w-12 h-12 text-blue-500" /> : <Brain className="w-12 h-12 text-violet-500" />}</div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{grade}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 mb-5">{pct}% de acerto</p>
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
              <p className="text-2xl font-bold text-green-600">{correctCount}</p>
              <p className="text-xs text-green-600">Acertos</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
              <p className="text-2xl font-bold text-red-500">{questions.length - correctCount}</p>
              <p className="text-xs text-red-500">Erros</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
              <p className="text-2xl font-bold text-blue-600">+{totalXP}</p>
              <p className="text-xs text-blue-600">XP ganho</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
              <p className="text-2xl font-bold text-amber-600">
                {questions.length > 0 ? Math.round((Math.max(0, Date.now() - examStartedAt) / 1000) / questions.length) : 0}s
              </p>
              <p className="text-xs text-amber-600">Tempo/q</p>
            </div>
          </div>

          <div className="text-left space-y-2 max-h-64 overflow-y-auto mb-5 pr-1">
            {questions.map((question, i) => {
              const userAnswer = answers[question.id];
              const correct = userAnswer === question.correctAnswer;
              return (
                <div key={question.id} className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${correct ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
                  {correct ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                  <div>
                    <span className={`font-medium ${correct ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      Q{i + 1}. {question.question.slice(0, 60)}…
                    </span>
                    {!correct && <span className="block text-gray-500 dark:text-gray-400 mt-0.5">Sua resp.: {userAnswer || '—'} · Correta: {question.correctAnswer}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setExamState('setup')}
            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <RotateCcw className="w-4 h-4" /> Novo Simulado
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const userAnswer = answers[currentQuestion?.id];
  const currentDiscipline = getDisplayDiscipline(currentQuestion?.subject || '');
  const CurrentDisciplineIcon = currentDiscipline.Icon;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>Q{currentIdx + 1}/{questions.length}</span>
          <span>·</span>
          <span>{answeredCount} respondidas</span>
        </div>
        <div className={`flex items-center gap-2 font-bold text-lg tabular-nums ${timeWarning ? 'text-red-500 animate-pulse' : 'text-slate-900 dark:text-slate-100'}`}>
          {timeWarning && <AlertTriangle className="w-4 h-4" />}
          <Clock className="w-4 h-4" />
          {timerStarted ? formatTime(timeLeftSec) : formatTime(plannedMinutes * 60)}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800">
            <CurrentDisciplineIcon className="w-3.5 h-3.5 inline" /> {currentDiscipline.label}
          </span>
          {selectedModel && (
            <span className="text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-600 px-2.5 py-1 rounded-full border border-violet-100 dark:border-violet-800">
              {selectedModel.banca} · {selectedModel.edital}
            </span>
          )}
        </div>
        <p className="text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">{currentQuestion?.question}</p>
        <div className="space-y-2">
          {currentQuestion?.options.map((option) => (
            <button
              key={option.letter}
              onClick={() => handleAnswer(option.letter)}
              className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border-2 transition text-sm font-medium ${userAnswer === option.letter
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:border-blue-300'
                }`}
            >
              <span className="font-bold w-5 shrink-0">{option.letter}.</span>
              <span>{option.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40"
        >
          ← Anterior
        </button>
        {currentIdx < questions.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Próxima <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => handleFinish()}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition flex items-center justify-center gap-1"
          >
            <Trophy className="w-4 h-4" /> Entregar
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((question, i) => (
          <button
            key={question.id}
            onClick={() => setCurrentIdx(i)}
            className={`w-8 h-8 rounded-lg text-xs font-bold border transition ${i === currentIdx
              ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : answers[question.id]
                ? 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-300'
              }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MockExam;
