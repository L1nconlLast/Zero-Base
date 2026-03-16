import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, RotateCcw, Play, Trophy, ChevronRight, Filter } from 'lucide-react';
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

interface MockExamProps {
  onEarnXP?: (xp: number) => void;
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

const EXAM_CONFIGS_BY_TRACK: Record<QuestionTrack | 'ambos', Array<{ label: string; questions: number; minutes: number; icon: string }>> = {
  enem: [
    { label: 'ENEM Rápido', questions: 20, minutes: 40, icon: '⚡' },
    { label: 'ENEM Padrão', questions: 45, minutes: 90, icon: '🎓' },
    { label: 'ENEM Intensivo', questions: 90, minutes: 180, icon: '🏁' },
  ],
  concurso: [
    { label: 'Concurso Rápido', questions: 20, minutes: 30, icon: '⚡' },
    { label: 'Concurso Padrão', questions: 40, minutes: 60, icon: '📘' },
    { label: 'Concurso Intensivo', questions: 60, minutes: 90, icon: '🏛️' },
  ],
  ambos: [
    { label: 'Misto Rápido', questions: 15, minutes: 25, icon: '⚡' },
    { label: 'Misto Padrão', questions: 30, minutes: 45, icon: '📝' },
    { label: 'Misto Intensivo', questions: 50, minutes: 75, icon: '🎯' },
  ],
};

const ENEM_PRESET_QUESTION_COUNTS = [20, 45, 90] as const;

const MockExam: React.FC<MockExamProps> = ({ onEarnXP, supabaseUserId, initialFilter }) => {
  const [examState, setExamState] = useState<ExamState>('setup');
  const [selectedConfig, setSelectedConfig] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<QuestionTrack | 'ambos'>('ambos');
  const [selectedSubject, setSelectedSubject] = useState<string>('Todas');
  const [selectedTopic, setSelectedTopic] = useState<string>('Todos');
  const [officialDistribution, setOfficialDistribution] = useState(false);
  const [selectedOfficialModelId, setSelectedOfficialModelId] = useState<string>('none');
  const [adaptiveMode, setAdaptiveMode] = useLocalStorage<boolean>('mock_exam_adaptive_mode', true);
  const [daysToExam, setDaysToExam] = useLocalStorage<number>('mock_exam_days_to_exam', 120);
  const [errorHistoryByTopic, setErrorHistoryByTopic] = useLocalStorage<Record<string, number>>('mock_exam_error_history_by_topic', {});
  const [, setExamHistory] = useLocalStorage<MockExamHistoryEntry[]>('mock_exam_history', []);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [examStartedAt, setExamStartedAt] = useState<number>(0);

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

  useEffect(() => {
    if (!timerStarted || examState !== 'running') return;
    if (timeLeftSec <= 0) {
      setExamState('finished');
      return;
    }
    const id = setInterval(() => setTimeLeftSec((previous) => previous - 1), 1000);
    return () => clearInterval(id);
  }, [timerStarted, examState, timeLeftSec]);

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

  const handleFinish = useCallback(() => {
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

    if (wrongTopics.length > 0) {
      setErrorHistoryByTopic((previous) => {
        const next = { ...previous };
        wrongTopics.forEach((topicKey) => {
          next[topicKey] = (next[topicKey] || 0) + 1;
        });
        return next;
      });
    }

    const answered = Object.keys(answers).length;
    const elapsedSec = Math.max(0, examStartedAt ? Math.round((Date.now() - examStartedAt) / 1000) : 0);
    const avgTimePerQuestionSec = answered > 0 ? Number((elapsedSec / answered).toFixed(1)) : 0;

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

    onEarnXP?.(xp);
    setExamState('finished');
  }, [answers, examStartedAt, onEarnXP, questions, selectedModel, selectedTrack, setErrorHistoryByTopic, setExamHistory, supabaseUserId]);

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
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">🎓 Simulado Cronometrado</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Simule uma prova real por trilha, banca e edital.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm">
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
            {['Todas', ...subjectsByTrack].map((subject) => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${subject === 'Todas'
                  ? selectedSubject === subject
                    ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  : getSubjectChipClass(subject, selectedSubject === subject)
                  }`}
              >
                {subject === 'Todas' ? 'Todas' : `${getDisplayDiscipline(subject).icon} ${getDisplayDiscipline(subject).label}`}
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tópico</p>
          <div className="flex flex-wrap gap-2">
            {['Todos', ...topicsBySelection].map((topic) => (
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

        {!selectedModel && (
          <div className="space-y-3">
            {configsForTrack.map((cfg, i) => (
              <button
                key={cfg.label}
                onClick={() => setSelectedConfig(i)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 ${selectedConfig === i
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
              >
                <span className="text-3xl">{cfg.icon}</span>
                <div className="text-left flex-1">
                  <p className={`font-bold ${selectedConfig === i ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-100'}`}>
                    {cfg.label}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{cfg.questions} questões · {cfg.minutes} minutos</p>
                </div>
                {selectedConfig === i && <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={startExam}
          disabled={availablePool.length === 0}
          className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Play className="w-5 h-5" /> Iniciar Simulado
        </button>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Distribuição planejada ({plannedQuestionCount} questões{plannedQuestionCount > 0 ? ` · ${uniqueAvailableCount} únicas` : ''})
          </p>
          <div className="flex flex-wrap gap-2">
            {plannedDistribution.length > 0 ? (
              plannedDistribution.map((item) => (
                <span key={item.subject} className="px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                  {item.subject === 'Aleatório' ? '🎲 Aleatório' : `${getDisplayDiscipline(item.subject).icon} ${getDisplayDiscipline(item.subject).label}`} · {item.count}
                </span>
              ))
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
    );
  }

  if (examState === 'finished') {
    const grade = pct >= 70 ? 'Aprovado ✅' : pct >= 50 ? 'Regular ⚠️' : 'Reprovado ❌';
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center shadow-sm">
          <div className="text-5xl mb-3">{pct >= 70 ? '🏆' : pct >= 50 ? '📊' : '💪'}</div>
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
            {getDisplayDiscipline(currentQuestion?.subject || '').icon} {getDisplayDiscipline(currentQuestion?.subject || '').label}
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
            onClick={handleFinish}
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
