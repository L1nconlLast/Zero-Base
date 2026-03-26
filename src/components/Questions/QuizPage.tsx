import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Brain, CheckCircle, XCircle, ChevronRight, RotateCcw, Filter, Zap, Trophy } from 'lucide-react';
import { QUESTIONS_BANK, type Question, type Difficulty, type QuestionTrack } from '../../data/questionsBank';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { questionsCloudService } from '../../services/questionsCloud.service';
import { quizPreferencesService } from '../../services/quizPreferences.service';
import { getDisplayDiscipline } from '../../utils/disciplineLabels';
import { shuffleArray, shuffleQuestionOptions } from '../../utils/questionRandomization';
import QuizErrorReview from './QuizErrorReview';

interface QuizPageProps {
  onEarnXP?: (xp: number) => void;
  onCompleteAttempt?: (result: { correctAnswers: number; totalQuestions: number; xpGained: number }) => void;
  supabaseUserId?: string | null;
  initialFilter?: {
    nonce: number;
    subject?: string;
    topicName?: string;
    track?: QuestionTrack | 'ambos';
  };
  recommendedContext?: {
    title: string;
    subtitle: string;
  };
}

type QuizState = 'select' | 'answering' | 'result';

interface DailyQuizHistoryEntry {
  id: string;
  date: string;
  track: QuestionTrack | 'ambos';
  totalQuestions: number;
  correctCount: number;
  xpEarned: number;
  streak: number;
  weakTopics: string[];
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
};

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  facil: 'text-green-600 bg-green-50 border-green-200',
  medio: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  dificil: 'text-red-600 bg-red-50 border-red-200',
};

const TRACK_LABEL: Record<QuestionTrack | 'ambos', string> = {
  enem: 'ENEM',
  concurso: 'Concurso',
  ambos: 'Ambos',
};

const QUIZ_QUESTION_OPTIONS = [5, 10, 20, 50] as const;

const ENEM_SUBJECT_ORDER = [
  'Linguagens',
  'Ciências Humanas',
  'Ciências da Natureza',
  'Matemática',
  'Redação',
];

const CONCURSO_SUBJECT_ORDER = [
  'Português',
  'Raciocínio Lógico',
  'Direito Constitucional',
  'Direito Administrativo',
  'Informática',
  'Atualidades',
];

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
  if (selectedTrack === 'ambos') {
    return Boolean(question.track);
  }

  if (question.track) {
    return question.track === selectedTrack || question.track === 'ambos';
  }

  return false;
};

const getOrderedSubjects = (subjects: string[], selectedTrack: QuestionTrack | 'ambos') => {
  const subjectSet = new Set(subjects);

  if (selectedTrack === 'enem') {
    return ENEM_SUBJECT_ORDER.filter((subject) => subjectSet.has(subject));
  }

  if (selectedTrack === 'concurso') {
    return CONCURSO_SUBJECT_ORDER.filter((subject) => subjectSet.has(subject));
  }

  const enemOrdered = ENEM_SUBJECT_ORDER.filter((subject) => subjectSet.has(subject));
  const concursoOrdered = CONCURSO_SUBJECT_ORDER.filter((subject) => subjectSet.has(subject));
  const known = new Set([...enemOrdered, ...concursoOrdered]);
  const remaining = subjects.filter((subject) => !known.has(subject)).sort((a, b) => a.localeCompare(b));
  return [...enemOrdered, ...concursoOrdered, ...remaining];
};

const getSubjectChipClass = (subject: string, selected: boolean) => {
  if (selected) return 'bg-blue-600 text-white border-blue-600';
  if (ENEM_SUBJECTS.has(subject)) return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  if (CONCURSO_SUBJECTS.has(subject)) return 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800';
  return 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700';
};

const QuizPage: React.FC<QuizPageProps> = ({
  onEarnXP,
  onCompleteAttempt,
  supabaseUserId,
  initialFilter,
  recommendedContext,
}) => {
  const userPreferenceScope = supabaseUserId || 'default';
  const [state, setState] = useState<QuizState>('select');
  const [selectedSubject, setSelectedSubject] = useState<string>('Todas');
  const [selectedTopic, setSelectedTopic] = useState<string>('Todos');
  const [selectedTrack, setSelectedTrack] = useState<QuestionTrack | 'ambos'>('ambos');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'todas'>('todas');
  const [quizQuestionCount, setQuizQuestionCount] = useLocalStorage<number>(`preferred_quiz_size_${userPreferenceScope}`, 10);
  const [dailyMode, setDailyMode] = useLocalStorage<boolean>('daily_quiz_enabled', true);
  const [dailyStreak, setDailyStreak] = useLocalStorage<number>('daily_quiz_streak', 0);
  const [dailyLastDoneDate, setDailyLastDoneDate] = useLocalStorage<string | null>('daily_quiz_last_done_date', null);
  const [, setDailyQuizHistory] = useLocalStorage<DailyQuizHistoryEntry[]>('daily_quiz_history', []);
  const [errorHistoryByTopic] = useLocalStorage<Record<string, number>>('mock_exam_error_history_by_topic', {});
  const [answeredIds, setAnsweredIds] = useLocalStorage<string[]>('quiz_answered_ids', []);
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; correct: boolean; xp: number }[]>([]);
  const [startedAt, setStartedAt] = useState<number>(0);

  const currentQuestion = questions[currentIdx];
  const isLastQuestion = currentIdx === questions.length - 1;

  const subjectsByTrack = useMemo(() => {
    const unique = [...new Set(QUESTIONS_BANK.filter((q) => matchTrack(q, selectedTrack)).map((q) => q.subject))];
    return getOrderedSubjects(unique, selectedTrack);
  }, [selectedTrack]);

  const topicsBySelection = useMemo(() => {
    const topics = new Set<string>();

    QUESTIONS_BANK.forEach((question) => {
      if (!matchTrack(question, selectedTrack)) return;
      if (selectedSubject !== 'Todas' && question.subject !== selectedSubject) return;
      if (selectedDifficulty !== 'todas' && question.difficulty !== selectedDifficulty) return;
      question.tags.forEach((tag) => topics.add(tag));
    });

    return [...topics].sort((a, b) => a.localeCompare(b));
  }, [selectedDifficulty, selectedSubject, selectedTrack]);

  useEffect(() => {
    if (!initialFilter) return;

    const nextTrack = initialFilter.track || inferTrackBySubject(initialFilter.subject) || 'ambos';
    setSelectedTrack(nextTrack);
    setSelectedSubject(initialFilter.subject || 'Todas');
    setSelectedTopic(initialFilter.topicName || 'Todos');
    setSelectedDifficulty('todas');
    setState('select');
    setQuestions([]);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAnswers([]);
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
    if (!supabaseUserId) {
      return;
    }

    let cancelled = false;

    const hydrateQuizPreference = async () => {
      try {
        const preferredSize = await quizPreferencesService.getPreferredQuizSize(supabaseUserId);
        if (!cancelled && preferredSize && preferredSize !== quizQuestionCount) {
          setQuizQuestionCount(preferredSize);
        }
      } catch {
        // Keep local preference when sync fails.
      }
    };

    void hydrateQuizPreference();

    return () => {
      cancelled = true;
    };
  }, [quizQuestionCount, setQuizQuestionCount, supabaseUserId]);

  useEffect(() => {
    if (!supabaseUserId) {
      return;
    }

    void quizPreferencesService
      .upsertPreferredQuizSize(supabaseUserId, quizQuestionCount as 5 | 10 | 20 | 50)
      .catch(() => undefined);
  }, [quizQuestionCount, supabaseUserId]);

  const filteredCount = useMemo(() => {
    return QUESTIONS_BANK.filter(
      (q) =>
        matchTrack(q, selectedTrack) &&
        (selectedSubject === 'Todas' || q.subject === selectedSubject) &&
        (selectedDifficulty === 'todas' || q.difficulty === selectedDifficulty) &&
        matchTopic(q, selectedTopic),
    ).length;
  }, [selectedSubject, selectedDifficulty, selectedTrack, selectedTopic]);

  const getTodayKey = () => new Date().toISOString().slice(0, 10);

  // Filter already-answered questions from pool (keep last 50 to allow cycling)
  const recentlyAnsweredSet = useMemo(() => new Set(answeredIds.slice(-50)), [answeredIds]);

  // Handler called by QuizErrorReview to launch a targeted session (Fix #1)
  const handleStartReview = useCallback((topicFilter: string, subjectFilter: string) => {
    setSelectedSubject(subjectFilter !== 'Todos' ? subjectFilter : 'Todas');
    setSelectedTopic(topicFilter !== 'Todos' ? topicFilter : 'Todos');
    setSelectedDifficulty('todas');
  }, []);

  const getQuestionPriority = useCallback(
    (question: Question) => {
      const topicKey = `${question.subject}::${question.tags[0] || question.subject}`;
      return (errorHistoryByTopic[topicKey] || 0) * 5 + (question.difficulty === 'dificil' ? 2 : question.difficulty === 'medio' ? 1 : 0);
    },
    [errorHistoryByTopic],
  );

  const startQuiz = useCallback(() => {
    const subject = selectedSubject === 'Todas' ? undefined : selectedSubject;
    const pool = QUESTIONS_BANK.filter(
      (q) =>
        matchTrack(q, selectedTrack) &&
        (!subject || q.subject === subject) &&
        (selectedDifficulty === 'todas' || q.difficulty === selectedDifficulty) &&
        matchTopic(q, selectedTopic),
    );
    const todayKey = getTodayKey();
    const baseCount = dailyMode ? 5 : quizQuestionCount;
    let selectedQuestions: Question[] = [];

    if (dailyMode) {
      const storedDate = window.localStorage.getItem('daily_quiz_question_date');
      const storedIds = JSON.parse(window.localStorage.getItem('daily_quiz_question_ids') || '[]') as string[];

      if (storedDate === todayKey && storedIds.length > 0) {
        selectedQuestions = storedIds
          .map((id) => pool.find((question) => question.id === id))
          .filter(Boolean) as Question[];
      }

      if (selectedQuestions.length === 0) {
        // Prefer unanswered questions
        const fresh = pool.filter((q) => !recentlyAnsweredSet.has(q.id));
        const source = fresh.length >= Math.min(baseCount, pool.length) ? fresh : pool;
        const prioritized = [...source].sort((a, b) => getQuestionPriority(b) - getQuestionPriority(a));
        const candidatePool = prioritized.slice(0, Math.min(prioritized.length, baseCount * 3));
        selectedQuestions = shuffleArray(candidatePool).slice(0, Math.min(baseCount, source.length));
        window.localStorage.setItem('daily_quiz_question_date', todayKey);
        window.localStorage.setItem('daily_quiz_question_ids', JSON.stringify(selectedQuestions.map((question) => question.id)));
      }
    } else {
      const fresh = pool.filter((q) => !recentlyAnsweredSet.has(q.id));
      const source = fresh.length >= Math.min(baseCount, pool.length) ? fresh : pool;
      selectedQuestions = shuffleArray(source).slice(0, Math.min(baseCount, source.length));
    }

    selectedQuestions = selectedQuestions.map(shuffleQuestionOptions);

    setQuestions(selectedQuestions);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAnswers([]);
    setStartedAt(Date.now());
    setShowResultDetails(false);
    setState('answering');
  }, [dailyMode, getQuestionPriority, quizQuestionCount, recentlyAnsweredSet, selectedDifficulty, selectedSubject, selectedTopic, selectedTrack]);

  const handleAnswer = (letter: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(letter);
    setShowExplanation(true);
  };

  const handleNext = () => {
    const correct = selectedAnswer === currentQuestion.correctAnswer;
    const xp = correct ? currentQuestion.xpReward : 0;
    const newAnswers = [...answers, { questionId: currentQuestion.id, correct, xp }];
    setAnswers(newAnswers);

    if (isLastQuestion) {
      const totalXP = newAnswers.reduce((sum, a) => sum + a.xp, 0);
      const correctTotal = newAnswers.filter((answer) => answer.correct).length;
      onEarnXP?.(totalXP);
      onCompleteAttempt?.({
        correctAnswers: correctTotal,
        totalQuestions: questions.length,
        xpGained: totalXP,
      });

      // Track answered IDs (Fix #5)
      setAnsweredIds((prev) => [...new Set([...prev, ...questions.map((q) => q.id)])].slice(-200));

      if (dailyMode) {
        const todayKey = getTodayKey();
        const weakTopics = questions
          .filter((question, index) => !newAnswers[index]?.correct)
          .map((question) => `${question.subject}::${question.tags[0] || question.subject}`);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().slice(0, 10);

        const nextStreak = dailyLastDoneDate === todayKey
          ? dailyStreak
          : dailyLastDoneDate === yesterdayKey
            ? dailyStreak + 1
            : 1;

        setDailyStreak(nextStreak);
        setDailyLastDoneDate(todayKey);

        const entry: DailyQuizHistoryEntry = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          track: selectedTrack,
          totalQuestions: questions.length,
          correctCount: correctTotal,
          xpEarned: totalXP,
          streak: nextStreak,
          weakTopics,
        };

        setDailyQuizHistory((previous) => [...previous, entry].slice(-60));

        if (supabaseUserId) {
          void questionsCloudService.saveDailyQuizSession(supabaseUserId, {
            id: entry.id,
            date: entry.date,
            track: entry.track,
            totalQuestions: entry.totalQuestions,
            correctCount: entry.correctCount,
            xpEarned: entry.xpEarned,
            streak: entry.streak,
            weakTopics: entry.weakTopics,
          }).catch(() => undefined);
        }
      }

      setState('result');
    } else {
      setCurrentIdx((p) => p + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const handleRestart = () => {
    setState('select');
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAnswers([]);
  };

  const totalXP = answers.reduce((sum, a) => sum + a.xp, 0);
  const correctCount = answers.filter((a) => a.correct).length;
  const pct = Math.round((correctCount / questions.length) * 100);
  const avgSecondsPerQuestion = questions.length > 0 ? Math.round((Math.max(1, Date.now() - startedAt) / 1000) / questions.length) : 0;

  if (state === 'select') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2"><Brain className="w-6 h-6" />Banco de Questões</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {QUESTIONS_BANK.length} questões com correção automática e XP por acerto
          </p>
        </div>

        {recommendedContext && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
              Continuacao do estudo
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100">
              {recommendedContext.title}
            </h3>
            <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
              {recommendedContext.subtitle}
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              <Filter className="inline w-3.5 h-3.5 mr-1" />Trilha
            </label>
            <div className="flex gap-2">
              {(['enem', 'concurso', 'ambos'] as const).map((track) => (
                <button
                  key={track}
                  onClick={() => setSelectedTrack(track)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${selectedTrack === track
                    ? track === 'enem'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : track === 'concurso'
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                    : track === 'enem'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : track === 'concurso'
                        ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                >
                  {TRACK_LABEL[track]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={dailyMode}
              onChange={(event) => setDailyMode(event.target.checked)}
              className="rounded border-slate-300"
            />
            Quiz diário inteligente (5 questões)
            {dailyMode && <span className="text-xs font-semibold text-amber-500 ml-1 inline-flex items-center gap-1"><Zap className="w-3 h-3" />sequência: {dailyStreak}</span>}
          </label>

          {!dailyMode && (
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                Quantas questões você quer resolver agora?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUIZ_QUESTION_OPTIONS.map((count) => (
                  <button
                    key={count}
                    onClick={() => setQuizQuestionCount(count)}
                    className={`py-2 rounded-lg text-sm font-semibold border transition ${quizQuestionCount === count
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              <Filter className="inline w-3.5 h-3.5 mr-1" />Matéria
            </label>
            <div className="flex flex-wrap gap-2">
              {['Todas', ...subjectsByTrack].map((s) => {
                const discipline = getDisplayDiscipline(s);
                const DisciplineIcon = discipline.Icon;
                return (
                  <button
                    key={s}
                    onClick={() => setSelectedSubject(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${s === 'Todas'
                      ? selectedSubject === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      : getSubjectChipClass(s, selectedSubject === s)
                      }`}
                  >
                    {s === 'Todas' ? 'Todas' : <span className="inline-flex items-center gap-1.5"><DisciplineIcon className="w-3.5 h-3.5" />{discipline.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              <Filter className="inline w-3.5 h-3.5 mr-1" />Tópico
            </label>
            <div className="flex flex-wrap gap-2">
              {['Todos', ...topicsBySelection].map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${selectedTopic === topic
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Dificuldade
            </label>
            <div className="flex gap-2">
              {(['todas', 'facil', 'medio', 'dificil'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition capitalize ${selectedDifficulty === d
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                >
                  {d === 'todas' ? 'Todas' : DIFFICULTY_LABEL[d as Difficulty]}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              {filteredCount} questões disponíveis ({TRACK_LABEL[selectedTrack]}) • sessão de até {dailyMode ? 5 : quizQuestionCount} questões
            </p>
            <button
              onClick={startQuiz}
              disabled={filteredCount === 0}
              className="w-full py-3 rounded-xl font-bold text-white transition disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Iniciar Quiz ({dailyMode ? 5 : quizQuestionCount} questões)
            </button>
          </div>
        </div>

        {/* Pontos fracos — Fix #1 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <QuizErrorReview onStartReview={handleStartReview} />
        </div>
      </div>
    );
  }

  if (state === 'result') {
    return (
      <div className="max-w-xl mx-auto space-y-5 text-center">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="flex justify-center mb-4">{pct >= 80 ? <Trophy className="w-12 h-12 text-amber-500" /> : pct >= 50 ? <CheckCircle className="w-12 h-12 text-emerald-500" /> : <Brain className="w-12 h-12 text-blue-500" />}</div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
            {pct >= 80 ? 'Excelente!' : pct >= 50 ? 'Bom trabalho!' : 'Continue praticando!'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            {correctCount} de {questions.length} questões corretas
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
              <p className="text-2xl font-bold text-green-600">{correctCount}</p>
              <p className="text-xs text-green-600">Acertos</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
              <p className="text-2xl font-bold text-red-500">{questions.length - correctCount}</p>
              <p className="text-xs text-red-500">Erros</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
              <p className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-1">
                <Zap className="w-4 h-4" />{totalXP}
              </p>
              <p className="text-xs text-blue-600">XP ganho</p>
            </div>
          </div>

          {dailyMode && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                <p className="text-xl font-bold text-amber-600 inline-flex items-center justify-center gap-1"><Zap className="w-4 h-4" />{dailyStreak}</p>
                <p className="text-xs text-amber-600">Streak diário</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{avgSecondsPerQuestion}s</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">Tempo médio/questão</p>
              </div>
            </div>
          )}

          {/* Review list */}
          <div className="text-left space-y-3 mb-6">
            {questions.map((q, i) => {
              const answer = answers[i];
              const isCorrect = answer?.correct;
              return (
                <div key={q.id} className={`rounded-xl border p-3 text-sm ${isCorrect ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
                  <div className="flex items-start gap-2">
                    {isCorrect ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                    <span className={`font-medium leading-snug ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {q.question}
                    </span>
                  </div>
                  {!isCorrect && showResultDetails && (
                    <div className="mt-2 ml-6 space-y-1">
                      <p className="text-xs text-red-600 dark:text-red-400">Resposta correta: <strong>{q.correctAnswer}</strong></p>
                      {q.explanation && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{q.explanation}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Toggle details */}
          {answers.some((a) => !a.correct) && (
            <button
              onClick={() => setShowResultDetails((v) => !v)}
              className="w-full mb-3 py-2 rounded-xl text-sm font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              {showResultDetails ? 'Ocultar explicações' : 'Ver explicações dos erros'}
            </button>
          )}

          <button
            onClick={handleRestart}
            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <RotateCcw className="w-4 h-4" /> Nova Sessão
          </button>
        </div>
      </div>
    );
  }

  // Answering state
  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
  const currentDiscipline = getDisplayDiscipline(currentQuestion.subject);
  const CurrentDisciplineIcon = currentDiscipline.Icon;
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Progresso */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {currentIdx + 1}/{questions.length}
        </span>
        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, backgroundColor: 'var(--color-primary)' }}
          />
        </div>
        <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
          <Zap className="w-3.5 h-3.5" />{answers.reduce((s, a) => s + a.xp, 0)} XP
        </span>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm">
        {/* Meta info */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800">
            <CurrentDisciplineIcon className="w-3.5 h-3.5 inline" /> {currentDiscipline.label}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${DIFFICULTY_COLOR[currentQuestion.difficulty]}`}>
            {DIFFICULTY_LABEL[currentQuestion.difficulty]}
          </span>
          <span className="text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 px-2.5 py-1 rounded-full border border-purple-100 dark:border-purple-800">
            {TRACK_LABEL[currentQuestion.track ?? 'ambos']}
          </span>
          <span className="text-xs font-medium bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 px-2.5 py-1 rounded-full border border-yellow-100 dark:border-yellow-800 flex items-center gap-1 ml-auto">
            <Trophy className="w-3 h-3" />{currentQuestion.xpReward} XP
          </span>
        </div>

        {/* Enunciado */}
        <p className="text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
          {currentQuestion.question}
        </p>

        {/* Opções */}
        <div className="space-y-2">
          {currentQuestion.options.map((opt) => {
            let btnClass = 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100';
            if (selectedAnswer) {
              if (opt.letter === currentQuestion.correctAnswer) {
                btnClass = 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300';
              } else if (opt.letter === selectedAnswer) {
                btnClass = 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300';
              } else {
                btnClass = 'border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500';
              }
            }
            return (
              <button
                key={opt.letter}
                onClick={() => handleAnswer(opt.letter)}
                disabled={!!selectedAnswer}
                aria-label={`Alternativa ${opt.letter}: ${opt.text}`}
                className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border-2 transition font-medium text-sm ${btnClass} ${!selectedAnswer ? 'hover:border-blue-400 cursor-pointer' : 'cursor-default'}`}
              >
                <span className="font-bold w-5 shrink-0">{opt.letter}.</span>
                <span>{opt.text}</span>
                {selectedAnswer && opt.letter === currentQuestion.correctAnswer && (
                  <CheckCircle className="w-4 h-4 text-green-500 ml-auto shrink-0 mt-0.5" />
                )}
                {selectedAnswer && opt.letter === selectedAnswer && opt.letter !== currentQuestion.correctAnswer && (
                  <XCircle className="w-4 h-4 text-red-500 ml-auto shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explicação */}
        {showExplanation && (
          <div className={`p-4 rounded-xl text-sm border ${isCorrect ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'}`}>
            <p className="font-bold mb-1">{isCorrect ? 'Correto!' : `Resposta correta: ${currentQuestion.correctAnswer}`}</p>
            <p className="leading-relaxed">{currentQuestion.explanation}</p>
          </div>
        )}

        {/* Próxima */}
        {selectedAnswer && (
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {isLastQuestion ? <><Trophy className="w-4 h-4" /> Ver Resultado</> : <><ChevronRight className="w-4 h-4" /> Próxima Questão</>}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
