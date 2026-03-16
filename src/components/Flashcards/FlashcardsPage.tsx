import React, { useState, useMemo, useCallback } from 'react';
import { RotateCcw, ChevronRight, Brain, AlertCircle, Filter } from 'lucide-react';
import { FLASHCARDS_BANK, type Flashcard } from '../../data/flashcardsBank';
import { calcSRS, isDue, createNewCard, getIntervalLabel, type SRSCard } from '../../utils/srsAlgorithm';
import { useLocalStorage } from '../../hooks/useLocalStorage';

type FlashcardTrack = 'enem' | 'concurso' | 'ambos';

const TRACK_LABEL: Record<FlashcardTrack, string> = {
  enem: 'ENEM',
  concurso: 'Concurso',
  ambos: 'Ambos',
};

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

const SUBJECT_ICON: Record<string, string> = {
  Matemática: '📐',
  Linguagens: '📝',
  'Ciências Humanas': '🌍',
  'Ciências da Natureza': '🧪',
  Redação: '✍️',
  Português: '📖',
  'Raciocínio Lógico': '🧠',
  'Direito Constitucional': '⚖️',
  'Direito Administrativo': '🏛️',
  Informática: '💻',
  Atualidades: '📰',
};

const ENEM_SUBJECTS = new Set(ENEM_SUBJECT_ORDER);
const CONCURSO_SUBJECTS = new Set(CONCURSO_SUBJECT_ORDER);

const matchTrack = (card: Flashcard, selectedTrack: FlashcardTrack) => {
  if (selectedTrack === 'ambos') {
    return Boolean(card.track);
  }

  return card.track === selectedTrack || card.track === 'ambos';
};

const getOrderedSubjects = (subjects: string[], selectedTrack: FlashcardTrack) => {
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
  if (selected) return 'bg-slate-700 text-white border-slate-700 shadow-md ring-2 ring-slate-400 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200 dark:shadow-slate-800';
  if (ENEM_SUBJECTS.has(subject)) return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-shadow shadow-sm';
  if (CONCURSO_SUBJECTS.has(subject)) return 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-800/40 transition-shadow shadow-sm';
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

const FlashcardsPage: React.FC = () => {
  const [srsState, setSrsState] = useLocalStorage<Record<string, SRSCard>>('srs_cards_state', {});
  const [selectedTrack, setSelectedTrack] = useState<FlashcardTrack>('ambos');
  const [selectedSubject, setSelectedSubject] = useState<string>('Todas');
  const [selectedTopic, setSelectedTopic] = useState<string>('Todos');
  const [sessionCards, setSessionCards] = useState<Flashcard[] | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);

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
    return [...new Set(cardsBySubject.flatMap((card) => card.tags || []))]
      .sort((a, b) => a.localeCompare(b));
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

  // Conta quantos cards estão vencidos
  const dueCount = useMemo(() => {
    return filteredCards.filter((f) => {
      const state = srsState[f.id] ?? createNewCard(f.id);
      return isDue(state);
    }).length;
  }, [filteredCards, srsState]);

  const startSession = () => {
    const due = filteredCards.filter((f) => {
      const state = srsState[f.id] ?? createNewCard(f.id);
      return isDue(state);
    });
    // Se não houver vencidos, pega todos do filtro (novo usuário)
    const pool = due.length > 0 ? due : filteredCards;
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 20);
    setSessionCards(shuffled);
    setCurrentIdx(0);
    setFlipped(false);
    setSessionDone(0);
  };

  const handleQuality = useCallback((quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (!sessionCards) return;
    const card = sessionCards[currentIdx];
    const currentState = srsState[card.id] ?? createNewCard(card.id);
    const newState = calcSRS(currentState, quality);

    setSrsState((prev) => ({ ...prev, [card.id]: newState }));
    setSessionDone((p) => p + 1);

    if (currentIdx < sessionCards.length - 1) {
      setCurrentIdx((p) => p + 1);
      setFlipped(false);
    } else {
      setSessionCards(null);
    }
  }, [sessionCards, currentIdx, srsState, setSrsState]);

  const resetProgress = () => {
    if (window.confirm !== undefined) {
      setSrsState({});
    }
  };

  // Estatísticas globais
  const stats = useMemo(() => {
    const totalCards = trackCards.length;
    const reviewed = trackCards.filter((card) => Boolean(srsState[card.id])).length;
    const due = filteredCards.filter((card) => isDue(srsState[card.id] ?? createNewCard(card.id))).length;
    return { totalCards, reviewed, due };
  }, [filteredCards, srsState, trackCards]);

  // Tela de sessão
  if (sessionCards) {
    if (currentIdx >= sessionCards.length) {
      return (
        <div className="max-w-xl mx-auto text-center py-12 space-y-4">
          <div className="text-5xl">🎉</div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Sessão concluída!</h2>
          <p className="text-slate-500 dark:text-slate-400">{sessionDone} cards revisados</p>
          <button
            onClick={() => setSessionCards(null)}
            className="mt-4 px-6 py-3 rounded-xl font-bold text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Voltar
          </button>
        </div>
      );
    }

    const card = sessionCards[currentIdx];
    const cardState = srsState[card.id] ?? createNewCard(card.id);

    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>{currentIdx + 1}/{sessionCards.length}</span>
          <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-2 py-1 rounded-full">
            {(SUBJECT_ICON[card.subject] || '📚')} {card.subject}
          </span>
        </div>

        {/* Card com flip */}
        <div
          className="cursor-pointer select-none"
          onClick={() => setFlipped((p) => !p)}
          style={{ perspective: '1000px' }}
        >
          <div
            className="relative w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
              minHeight: '220px',
            }}
          >
            {/* Frente */}
            <div
              className="absolute inset-0 bg-white dark:bg-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">Pergunta</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 text-center leading-relaxed">
                {card.front}
              </p>
              <p className="text-xs text-slate-400 mt-4">Toque para ver a resposta</p>
            </div>
            {/* Verso */}
            <div
              className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 flex flex-col items-center justify-center"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <p className="text-xs text-blue-500 uppercase tracking-wider mb-4">Resposta</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 text-center leading-relaxed">
                {card.back}
              </p>
              {cardState.repetitions > 0 && (
                <p className="text-xs text-slate-400 mt-4">
                  Próxima revisão: {getIntervalLabel(cardState.interval)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Avaliação de qualidade */}
        {flipped && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
            <p className="text-sm font-semibold text-center text-slate-700 dark:text-slate-300">
              Como você se saiu?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleQuality(1)}
                className="py-2.5 rounded-xl text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-100 transition"
              >
                😞 Não recordei
              </button>
              <button
                onClick={() => handleQuality(2)}
                className="py-2.5 rounded-xl text-sm font-semibold bg-orange-50 dark:bg-orange-900/20 text-orange-600 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 transition"
              >
                😐 Difícil
              </button>
              <button
                onClick={() => handleQuality(4)}
                className="py-2.5 rounded-xl text-sm font-semibold bg-green-50 dark:bg-green-900/20 text-green-600 border border-green-200 dark:border-green-800 hover:bg-green-100 transition"
              >
                😊 Bom
              </button>
              <button
                onClick={() => handleQuality(5)}
                className="py-2.5 rounded-xl text-sm font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition"
              >
                🚀 Fácil!
              </button>
            </div>
          </div>
        )}

        {!flipped && (
          <button
            onClick={() => setFlipped(true)}
            className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <ChevronRight className="w-4 h-4" /> Revelar Resposta
          </button>
        )}
      </div>
    );
  }

  // Tela inicial (seleção)
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">🗂️ Flashcards — Revisão Espaçada</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Algoritmo SM-2 (Anki-like) — os cards vencidos aparecem automaticamente
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.totalCards}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-green-600">{stats.reviewed}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Revisados</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-3 text-center">
          <p className="text-xl font-bold text-amber-600">{dueCount}</p>
          <p className="text-xs text-amber-600">Vencidos</p>
        </div>
      </div>

      {/* Filtro de matéria */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-3 shadow-sm">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <Filter className="inline w-3.5 h-3.5 mr-1" />Trilha
        </p>
        <div className="flex gap-2">
          {(['enem', 'concurso', 'ambos'] as const).map((track) => (
            <button
              key={track}
              onClick={() => setSelectedTrack(track)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                selectedTrack === track
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

          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Matéria</p>
        <div className="flex flex-wrap gap-2">
          {['Todas', ...subjectsForTrack].map((s) => {
            const icon = SUBJECT_ICON[s] || '📚';
            return (
              <button
                key={s}
                onClick={() => setSelectedSubject(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-shadow shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                  s === 'Todas'
                    ? selectedSubject === s
                      ? 'bg-slate-700 text-white border-slate-700 shadow-md ring-2 ring-slate-400 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200 dark:shadow-slate-800'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    : getSubjectChipClass(s, selectedSubject === s)
                }`}
              >
                {s === 'Todas' ? 'Todas' : `${icon} ${s}`}
              </button>
            );
          })}
        </div>

        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tópico</p>
        {selectedTrack === 'ambos' && (
          <div className="space-y-2">
            <div>
              <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-300 mb-1">🔥 Mais cobrados ENEM</p>
              <div className="flex flex-wrap gap-2">
                {topTopicsEnem.map((topic) => (
                  <button
                    key={`enem-${topic}`}
                    onClick={() => setSelectedTopic(topic)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-shadow ${
                      selectedTopic === topic
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-violet-600 dark:text-violet-300 mb-1">🏛️ Mais cobrados Concurso</p>
              <div className="flex flex-wrap gap-2">
                {topTopicsConcurso.map((topic) => (
                  <button
                    key={`concurso-${topic}`}
                    onClick={() => setSelectedTopic(topic)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-shadow ${
                      selectedTopic === topic
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800'
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
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-shadow shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                selectedTopic === topic
                  ? 'bg-slate-700 text-white border-slate-700 shadow-md ring-2 ring-slate-400 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200 dark:shadow-slate-800'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        <button
          onClick={startSession}
          disabled={filteredCards.length === 0}
          className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 mt-2 bg-slate-700 dark:bg-slate-200 dark:text-slate-900 transition-shadow shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          <Brain className="w-4 h-4" />
          {filteredCards.length === 0
            ? 'Sem cards para essa trilha/matéria'
            : dueCount > 0
              ? `Revisar ${dueCount} card${dueCount > 1 ? 's' : ''} vencido${dueCount > 1 ? 's' : ''}`
              : `Iniciar Revisão (${TRACK_LABEL[selectedTrack]})`}
        </button>
      </div>

      {/* Como funciona */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-600 dark:text-slate-400 space-y-1">
        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Como funciona?
        </p>
        <p>• Avalie cada card de 😞 a 🚀 após ver a resposta</p>
        <p>• O algoritmo SM-2 calcula quando você deve revisar cada card</p>
        <p>• Cards fáceis aparecem em semanas; difíceis, no dia seguinte</p>
        <p>• Progresso salvo automaticamente no seu navegador</p>
      </div>

      {stats.reviewed > 0 && (
        <button
          onClick={resetProgress}
          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto"
        >
          <RotateCcw className="w-3 h-3" /> Reiniciar progresso
        </button>
      )}
    </div>
  );
};

export default FlashcardsPage;
