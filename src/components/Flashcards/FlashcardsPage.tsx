import React, { useState, useMemo, useCallback } from 'react';
import {
  RotateCcw,
  ChevronRight,
  Brain,
  AlertCircle,
  Filter,
  BookOpen,
  Frown,
  Meh,
  Smile,
  Rocket,
  Landmark,
  Flame,
} from 'lucide-react';
import { FLASHCARDS_BANK, type Flashcard } from '../../data/flashcardsBank';
import { calcSRS, isDue, createNewCard, getIntervalLabel, type SRSCard } from '../../utils/srsAlgorithm';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { getDisplayDiscipline } from '../../utils/disciplineLabels';

type FlashcardTrack = 'enem' | 'concurso' | 'ambos';
type SessionMode = 'due' | 'maintenance';

const TRACK_LABEL: Record<FlashcardTrack, string> = {
  enem: 'ENEM',
  concurso: 'Concurso',
  ambos: 'Ambos',
};

const SESSION_MODE_LABEL: Record<SessionMode, string> = {
  due: 'Sessao para zerar vencidos',
  maintenance: 'Sessao de manutencao',
};

const ENEM_SUBJECT_ORDER = ['Linguagens', 'Ciencias Humanas', 'Ciencias da Natureza', 'Matematica', 'Redacao'];
const CONCURSO_SUBJECT_ORDER = [
  'Portugues',
  'Raciocinio Logico',
  'Direito Constitucional',
  'Direito Administrativo',
  'Informatica',
  'Atualidades',
];

const normalizeLabel = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const ENEM_SUBJECTS = new Set(ENEM_SUBJECT_ORDER.map(normalizeLabel));
const CONCURSO_SUBJECTS = new Set(CONCURSO_SUBJECT_ORDER.map(normalizeLabel));
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAINTENANCE_SESSION_SIZE = 20;

const matchTrack = (card: Flashcard, selectedTrack: FlashcardTrack) => {
  if (selectedTrack === 'ambos') {
    return Boolean(card.track);
  }

  return card.track === selectedTrack || card.track === 'ambos';
};

const getOrderedSubjects = (subjects: string[], selectedTrack: FlashcardTrack) => {
  const byNormalized = new Map(subjects.map((subject) => [normalizeLabel(subject), subject]));

  if (selectedTrack === 'enem') {
    return ENEM_SUBJECT_ORDER.map((subject) => byNormalized.get(normalizeLabel(subject))).filter(Boolean) as string[];
  }

  if (selectedTrack === 'concurso') {
    return CONCURSO_SUBJECT_ORDER.map((subject) => byNormalized.get(normalizeLabel(subject))).filter(Boolean) as string[];
  }

  const enemOrdered = ENEM_SUBJECT_ORDER.map((subject) => byNormalized.get(normalizeLabel(subject))).filter(Boolean) as string[];
  const concursoOrdered = CONCURSO_SUBJECT_ORDER.map((subject) => byNormalized.get(normalizeLabel(subject))).filter(Boolean) as string[];
  const known = new Set([...enemOrdered, ...concursoOrdered]);
  const remaining = subjects.filter((subject) => !known.has(subject)).sort((a, b) => a.localeCompare(b));
  return [...enemOrdered, ...concursoOrdered, ...remaining];
};

const getSubjectChipClass = (subject: string, selected: boolean) => {
  if (selected) {
    return 'bg-slate-700 text-white border-slate-700 shadow-md ring-2 ring-slate-400 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200 dark:shadow-slate-800';
  }

  const normalizedSubject = normalizeLabel(subject);

  if (ENEM_SUBJECTS.has(normalizedSubject)) {
    return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-shadow shadow-sm';
  }

  if (CONCURSO_SUBJECTS.has(normalizedSubject)) {
    return 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-800/40 transition-shadow shadow-sm';
  }

  return 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-shadow shadow-sm';
};

const getTopicFrequency = (cards: Flashcard[]) => {
  const frequency: Record<string, number> = {};
  cards.forEach((card) => {
    card.tags.forEach((tag) => {
      frequency[tag] = (frequency[tag] || 0) + 1;
    });
  });
  return frequency;
};

const sortTopicsByFrequency = (topics: string[], frequency: Record<string, number>) => {
  return [...topics].sort((a, b) => {
    const frequencyDiff = (frequency[b] || 0) - (frequency[a] || 0);
    if (frequencyDiff !== 0) return frequencyDiff;
    return a.localeCompare(b);
  });
};

const getReviewPriorityScore = (card: Flashcard, state: SRSCard) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextReviewDate = new Date(state.nextReview);
  nextReviewDate.setHours(0, 0, 0, 0);

  const overdueDays = Math.max(0, Math.floor((today.getTime() - nextReviewDate.getTime()) / DAY_IN_MS));
  const repetitionsPenalty = Math.max(0, 4 - state.repetitions) * 12;
  const easePenalty = Math.max(0, Math.round((2.6 - state.easeFactor) * 10));
  const tagPenalty = Math.max(0, 5 - card.tags.length);

  return overdueDays * 100 + repetitionsPenalty + easePenalty + tagPenalty;
};

const FlashcardsPage: React.FC = () => {
  const [srsState, setSrsState] = useLocalStorage<Record<string, SRSCard>>('srs_cards_state', {});
  const [selectedTrack, setSelectedTrack] = useState<FlashcardTrack>('ambos');
  const [selectedSubject, setSelectedSubject] = useState<string>('Todas');
  const [selectedTopic, setSelectedTopic] = useState<string>('Todos');
  const [sessionCards, setSessionCards] = useState<Flashcard[] | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);
  const [sessionMode, setSessionMode] = useState<SessionMode | null>(null);
  const [lastSessionSummary, setLastSessionSummary] = useState<{ reviewed: number; mode: SessionMode } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const trackCards = useMemo(() => FLASHCARDS_BANK.filter((card) => matchTrack(card, selectedTrack)), [selectedTrack]);

  const subjectsForTrack = useMemo(() => {
    const unique = [...new Set(trackCards.map((card) => card.subject))];
    return getOrderedSubjects(unique, selectedTrack);
  }, [selectedTrack, trackCards]);

  const cardsBySubject = useMemo(() => {
    return selectedSubject === 'Todas'
      ? trackCards
      : trackCards.filter((card) => card.subject === selectedSubject);
  }, [selectedSubject, trackCards]);

  const topicsForSelection = useMemo(() => {
    return [...new Set(cardsBySubject.flatMap((card) => card.tags || []))].sort((a, b) => a.localeCompare(b));
  }, [cardsBySubject]);

  const topicFrequencyBySelection = useMemo(() => getTopicFrequency(cardsBySubject), [cardsBySubject]);
  const orderedTopicsForSelection = useMemo(
    () => sortTopicsByFrequency(topicsForSelection, topicFrequencyBySelection),
    [topicFrequencyBySelection, topicsForSelection],
  );

  const topTopicsEnem = useMemo(() => {
    const enemCards = cardsBySubject.filter((card) => card.track === 'enem' || card.track === 'ambos' || !card.track);
    const frequency = getTopicFrequency(enemCards);
    return sortTopicsByFrequency(Object.keys(frequency), frequency).slice(0, 6);
  }, [cardsBySubject]);

  const topTopicsConcurso = useMemo(() => {
    const concursoCards = cardsBySubject.filter((card) => card.track === 'concurso' || card.track === 'ambos' || !card.track);
    const frequency = getTopicFrequency(concursoCards);
    return sortTopicsByFrequency(Object.keys(frequency), frequency).slice(0, 6);
  }, [cardsBySubject]);

  const filteredCards = useMemo(() => {
    if (selectedTopic === 'Todos') {
      return cardsBySubject;
    }

    return cardsBySubject.filter((card) => card.tags.includes(selectedTopic));
  }, [cardsBySubject, selectedTopic]);

  React.useEffect(() => {
    if (selectedSubject !== 'Todas' && !subjectsForTrack.includes(selectedSubject)) {
      setSelectedSubject('Todas');
    }
  }, [selectedSubject, subjectsForTrack]);

  React.useEffect(() => {
    if (selectedTopic !== 'Todos' && !topicsForSelection.includes(selectedTopic)) {
      setSelectedTopic('Todos');
    }
  }, [selectedTopic, topicsForSelection]);

  const dueCount = useMemo(() => {
    return filteredCards.filter((card) => {
      const state = srsState[card.id] ?? createNewCard(card.id);
      return isDue(state);
    }).length;
  }, [filteredCards, srsState]);

  const prioritizedDueCards = useMemo(() => {
    return [...filteredCards]
      .filter((card) => isDue(srsState[card.id] ?? createNewCard(card.id)))
      .sort((left, right) => {
        const leftState = srsState[left.id] ?? createNewCard(left.id);
        const rightState = srsState[right.id] ?? createNewCard(right.id);
        return getReviewPriorityScore(right, rightState) - getReviewPriorityScore(left, leftState);
      });
  }, [filteredCards, srsState]);

  const maintenanceCards = useMemo(() => {
    return [...filteredCards]
      .sort((left, right) => {
        const leftState = srsState[left.id] ?? createNewCard(left.id);
        const rightState = srsState[right.id] ?? createNewCard(right.id);
        return getReviewPriorityScore(right, rightState) - getReviewPriorityScore(left, leftState);
      })
      .slice(0, MAINTENANCE_SESSION_SIZE);
  }, [filteredCards, srsState]);

  const reviewQueue = prioritizedDueCards.length > 0 ? prioritizedDueCards : maintenanceCards;
  const reviewMode: SessionMode = prioritizedDueCards.length > 0 ? 'due' : 'maintenance';

  const nextSubjectsPreview = useMemo(() => {
    const counts = reviewQueue.slice(0, 8).reduce<Record<string, number>>((acc, card) => {
      acc[card.subject] = (acc[card.subject] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3);
  }, [reviewQueue]);

  const stats = useMemo(() => {
    const totalCards = trackCards.length;
    const reviewed = trackCards.filter((card) => Boolean(srsState[card.id])).length;
    const due = filteredCards.filter((card) => isDue(srsState[card.id] ?? createNewCard(card.id))).length;
    return { totalCards, reviewed, due };
  }, [filteredCards, srsState, trackCards]);

  const startSession = () => {
    if (reviewQueue.length === 0) {
      return;
    }

    setSessionCards(reviewQueue);
    setSessionMode(reviewMode);
    setCurrentIdx(0);
    setFlipped(false);
    setSessionDone(0);
    setLastSessionSummary(null);
  };

  const handleQuality = useCallback((quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (!sessionCards) return;

    const card = sessionCards[currentIdx];
    const currentState = srsState[card.id] ?? createNewCard(card.id);
    const newState = calcSRS(currentState, quality);

    setSrsState((prev) => ({ ...prev, [card.id]: newState }));
    setSessionDone((prev) => prev + 1);

    if (currentIdx < sessionCards.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setFlipped(false);
      return;
    }

    setLastSessionSummary({
      reviewed: sessionCards.length,
      mode: sessionMode ?? 'due',
    });
    setSessionMode(null);
    setSessionCards(null);
    setCurrentIdx(0);
    setFlipped(false);
  }, [currentIdx, sessionCards, sessionMode, setSrsState, srsState]);

  const resetProgress = () => {
    if (window.confirm('Deseja reiniciar todo o progresso de revisao?')) {
      setSrsState({});
      setLastSessionSummary(null);
    }
  };

  if (sessionCards) {
    const card = sessionCards[currentIdx];
    const cardState = srsState[card.id] ?? createNewCard(card.id);
    const remainingCards = sessionCards.length - currentIdx - 1;
    const DisciplineIcon = getDisplayDiscipline(card.subject).Icon;

    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-200">
                <Brain className="h-3.5 w-3.5" />
                {SESSION_MODE_LABEL[sessionMode ?? 'due']}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white">Revise ate zerar esta fila.</h2>
                <p className="text-sm text-slate-300">
                  {currentIdx + 1} de {sessionCards.length} cards desta sessao. Restam {remainingCards} apos este.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
                <p className="text-lg font-semibold text-white">{sessionDone}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Feitos</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
                <p className="text-lg font-semibold text-amber-300">{remainingCards}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Restantes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span className="text-slate-300">{currentIdx + 1}/{sessionCards.length}</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-100">
            <DisciplineIcon className="h-3.5 w-3.5" />
            {card.subject}
          </span>
        </div>

        <div
          className="cursor-pointer select-none"
          onClick={() => setFlipped((prev) => !prev)}
          style={{ perspective: '1000px' }}
        >
          <div
            className="relative w-full rounded-[28px] border border-white/10 bg-slate-950/70 shadow-[0_20px_80px_rgba(15,23,42,0.35)] transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
              minHeight: '360px',
            }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] bg-slate-950/90 p-8"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Pergunta</p>
              <p className="text-center text-2xl font-semibold leading-relaxed text-white">
                {card.front}
              </p>
              <p className="mt-6 text-xs text-slate-500">Toque para revelar a resposta</p>
            </div>

            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] border border-blue-400/20 bg-blue-950/40 p-8"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-200">Resposta</p>
              <p className="text-center text-base leading-relaxed text-slate-100">
                {card.back}
              </p>
              {cardState.repetitions > 0 && (
                <p className="mt-6 text-xs text-slate-400">
                  Proxima revisao estimada: {getIntervalLabel(cardState.interval)}
                </p>
              )}
            </div>
          </div>
        </div>

        {flipped ? (
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.3)]">
            <p className="mb-4 text-center text-sm font-semibold text-slate-200">
              Como voce se saiu neste card?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleQuality(1)}
                className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
              >
                <span className="inline-flex items-center gap-2">
                  <Frown className="h-4 w-4" />
                  Errei
                </span>
              </button>
              <button
                onClick={() => handleQuality(2)}
                className="rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm font-semibold text-orange-100 transition hover:bg-orange-400/20"
              >
                <span className="inline-flex items-center gap-2">
                  <Meh className="h-4 w-4" />
                  Dificil
                </span>
              </button>
              <button
                onClick={() => handleQuality(4)}
                className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
              >
                <span className="inline-flex items-center gap-2">
                  <Smile className="h-4 w-4" />
                  Bom
                </span>
              </button>
              <button
                onClick={() => handleQuality(5)}
                className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20"
              >
                <span className="inline-flex items-center gap-2">
                  <Rocket className="h-4 w-4" />
                  Facil
                </span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-500"
          >
            <ChevronRight className="h-4 w-4" />
            Revelar resposta
          </button>
        )}
      </div>
    );
  }

  const reviewHeadline = dueCount > 0
    ? `Voce tem ${dueCount} card${dueCount > 1 ? 's' : ''} para revisar hoje`
    : reviewQueue.length > 0
      ? 'Sua revisao urgente esta em dia'
      : 'Nao ha cards disponiveis nesta selecao';

  const reviewSupport = dueCount > 0
    ? 'Entre agora e siga a fila automatica ate limpar os vencidos.'
    : reviewQueue.length > 0
      ? 'Aproveite para manter o ritmo com uma sessao curta de manutencao.'
      : 'Ajuste trilha, materia ou topico para montar uma nova fila.';

  const missionLabel = dueCount > 0 ? 'Missao de hoje' : 'Revisao pronta';
  const primaryActionLabel = dueCount > 0
    ? `Comecar revisao agora`
    : reviewQueue.length > 0
      ? 'Comecar manutencao'
      : 'Sem cards nesta selecao';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.24),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_32px_120px_rgba(15,23,42,0.42)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-100">
                <BookOpen className="h-3.5 w-3.5" />
                {missionLabel}
              </div>
              <div className="space-y-2">
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  {reviewHeadline}
                </h1>
                <p className="max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                  {reviewSupport}
                </p>
              </div>
            </div>

            <div className="max-w-xl rounded-[28px] border border-blue-300/15 bg-blue-500/12 p-5 shadow-[0_18px_60px_rgba(37,99,235,0.18)] sm:p-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/75">
                    {SESSION_MODE_LABEL[reviewMode]}
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {dueCount > 0 ? `Entre e limpe os ${dueCount} vencidos antes de qualquer outra coisa.` : 'Sua fila principal ja esta em dia. Faça uma passada curta para manter o ritmo.'}
                  </p>
                </div>

                <button
                  onClick={startSession}
                  disabled={reviewQueue.length === 0}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto sm:min-w-[320px]"
                >
                  <Brain className="h-5 w-5" />
                  {primaryActionLabel}
                  {reviewQueue.length > 0 ? ` (${dueCount > 0 ? dueCount : reviewQueue.length})` : ''}
                </button>

                <div className="flex flex-wrap gap-2 text-xs text-slate-200/85">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">
                    Trilha {TRACK_LABEL[selectedTrack]}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">
                    {selectedSubject === 'Todas' ? 'Todas as materias' : selectedSubject}
                  </span>
                  {selectedTopic !== 'Todos' && (
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">
                      Topico: {selectedTopic}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 self-start">
            <div className="rounded-[24px] border border-amber-300/15 bg-amber-400/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/80">Agora</p>
              <p className="mt-2 text-5xl font-semibold text-white">{stats.due}</p>
              <p className="mt-1 text-sm text-amber-50/85">cards vencidos esperando revisao</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-2xl font-semibold text-white">{stats.reviewed}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">Revisados</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-2xl font-semibold text-white">{stats.totalCards}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">No banco</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              {reviewQueue.length > 0
                ? `A fila abre com ${reviewQueue.length} cards e prioriza o que esta mais urgente primeiro.`
                : 'Nao existe fila pronta nesta selecao agora.'}
            </div>
          </div>
        </div>
      </div>

      {lastSessionSummary && (
        <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/10 p-5 text-emerald-50 shadow-[0_20px_80px_rgba(5,150,105,0.12)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200/80">Sessao concluida</p>
          <p className="mt-2 text-xl font-semibold">
            {lastSessionSummary.reviewed} cards revisados em uma {lastSessionSummary.mode === 'due' ? 'sessao para zerar vencidos' : 'sessao de manutencao'}.
          </p>
          <p className="mt-1 text-sm text-emerald-100/80">
            Seu progresso ja foi salvo. Se houver mais cards vencidos, a fila sera recalculada automaticamente.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.28)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Proxima execucao</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {dueCount > 0 ? 'Comece pelos vencidos' : 'Mantenha a memoria aquecida'}
              </h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
              {SESSION_MODE_LABEL[reviewMode]}
            </div>
          </div>

          {reviewQueue.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-400/15 bg-blue-950/30 p-4">
                <p className="text-sm text-slate-300">
                  A fila vai abrir com <span className="font-semibold text-white">{reviewQueue.length} cards</span>
                  {dueCount > 0
                    ? ' ordenados por atraso, repeticao e dificuldade.'
                    : ` para uma sessao curta de manutencao com ate ${MAINTENANCE_SESSION_SIZE} itens.`}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Materias que puxam a fila</p>
                <div className="flex flex-wrap gap-2">
                  {nextSubjectsPreview.map(([subject, count]) => (
                    <span
                      key={subject}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-200"
                    >
                      {subject} <span className="text-slate-400">x{count}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                O fluxo continua card apos card: revele, avalie e siga para o proximo sem sair da sessao.
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
              Nao ha cards para esta combinacao de trilha, materia e topico.
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Como funciona</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Revele a resposta e marque o card como <span className="font-semibold text-white">Errei</span>, <span className="font-semibold text-white">Dificil</span>, <span className="font-semibold text-white">Bom</span> ou <span className="font-semibold text-white">Facil</span>.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              O algoritmo SM-2 recalcula o proximo intervalo automaticamente e salva tudo no navegador.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Se nao houver vencidos, a tela puxa uma fila curta de manutencao para manter o ritmo vivo.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.28)]">
        <button
          onClick={() => setFiltersOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            Ajustes opcionais
          </div>
          <span className="inline-flex items-center gap-2 text-sm text-slate-300">
            {filtersOpen ? 'Ocultar' : 'Mostrar'}
            <ChevronRight className={`h-4 w-4 transition ${filtersOpen ? 'rotate-90' : ''}`} />
          </span>
        </button>

        {filtersOpen && (
          <div className="mt-5 space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Trilha</p>
            <div className="flex flex-wrap gap-2">
              {(['enem', 'concurso', 'ambos'] as const).map((track) => (
                <button
                  key={track}
                  onClick={() => setSelectedTrack(track)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    selectedTrack === track
                      ? track === 'enem'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : track === 'concurso'
                          ? 'border-violet-600 bg-violet-600 text-white'
                          : 'border-slate-700 bg-slate-700 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900'
                      : track === 'enem'
                        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                        : track === 'concurso'
                          ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300'
                          : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  {TRACK_LABEL[track]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Materia</p>
            <div className="flex flex-wrap gap-2">
              {['Todas', ...subjectsForTrack].map((subject) => {
                const DisciplineIcon = subject === 'Todas' ? null : getDisplayDiscipline(subject).Icon;

                return (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-shadow shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                      subject === 'Todas'
                        ? selectedSubject === subject
                          ? 'bg-slate-700 text-white border-slate-700 shadow-md ring-2 ring-slate-400 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200 dark:shadow-slate-800'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        : getSubjectChipClass(subject, selectedSubject === subject)
                    }`}
                  >
                    {subject === 'Todas' ? 'Todas' : (
                      <span className="inline-flex items-center gap-1.5">
                        {DisciplineIcon ? <DisciplineIcon className="h-3.5 w-3.5" /> : null}
                        {subject}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Topico</p>

            {selectedTrack === 'ambos' && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-blue-400/10 bg-blue-950/20 p-4">
                  <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-200">
                    <Flame className="h-3.5 w-3.5" />
                    Mais cobrados ENEM
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topTopicsEnem.map((topic) => (
                      <button
                        key={`enem-${topic}`}
                        onClick={() => setSelectedTopic(topic)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                          selectedTopic === topic
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-violet-400/10 bg-violet-950/20 p-4">
                  <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-200">
                    <Landmark className="h-3.5 w-3.5" />
                    Mais cobrados Concurso
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topTopicsConcurso.map((topic) => (
                      <button
                        key={`concurso-${topic}`}
                        onClick={() => setSelectedTopic(topic)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                          selectedTopic === topic
                            ? 'border-violet-600 bg-violet-600 text-white'
                            : 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {['Todos', ...orderedTopicsForSelection].map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-shadow shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                    selectedTopic === topic
                      ? 'bg-slate-700 text-white border-slate-700 shadow-md ring-2 ring-slate-400 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200 dark:shadow-slate-800'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
          </div>
        )}
      </div>

      <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-300 shadow-[0_24px_90px_rgba(15,23,42,0.22)]">
        <p className="mb-2 flex items-center gap-2 font-semibold text-slate-100">
          <AlertCircle className="h-4 w-4" />
          Regra da tela
        </p>
        <p>
          A Revisao existe para limpar o que venceu. Os filtros continuam disponiveis, mas a fila principal sempre tenta
          puxar o que esta mais urgente primeiro.
        </p>
      </div>

      {stats.reviewed > 0 && (
        <button
          onClick={resetProgress}
          className="mx-auto flex items-center gap-1 text-xs text-red-400 transition hover:text-red-300"
        >
          <RotateCcw className="h-3 w-3" />
          Reiniciar progresso
        </button>
      )}
    </div>
  );
};

export default FlashcardsPage;
