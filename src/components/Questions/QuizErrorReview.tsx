import React, { useState, useEffect } from 'react';
import { XCircle, RotateCcw, BookOpen, PartyPopper } from 'lucide-react';
import type { Question } from '../../data/questionsBank';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface QuizErrorReviewProps {
    /** Called when the user wants to start a quiz filtered to error topics */
    onStartReview: (topicFilter: string, subjectFilter: string) => void;
}

/**
 * Shows a summary of recently answered questions that were wrong,
 * grouped by topic. Allows the user to launch a targeted review session.
 */
const QuizErrorReview: React.FC<QuizErrorReviewProps> = ({ onStartReview }) => {
    const [errorTopics] = useLocalStorage<Record<string, number>>('mock_exam_error_history_by_topic', {});
    const [answeredIds] = useLocalStorage<string[]>('quiz_answered_ids', []);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [expanded, setExpanded] = useState<string | null>(null);

    // Lazy-load the questions bank only when this component mounts
    useEffect(() => {
        import('../../data/questionsBank').then(({ QUESTIONS_BANK }) => {
            const answeredSet = new Set(answeredIds);
            // Show only questions the user has answered (registered in quiz_answered_ids)
            const answered = QUESTIONS_BANK.filter((q) => answeredSet.has(q.id));
            setQuestions(answered);
        });
    }, [answeredIds]);

    const topEntries = Object.entries(errorTopics)
        .filter(([, count]) => count > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8);

    if (topEntries.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center">
                <PartyPopper className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <p className="font-semibold text-slate-700 dark:text-slate-200">Sem erros registrados ainda!</p>
                <p className="text-sm text-slate-400 mt-1">Complete alguns quizzes ou simulados para ver seus pontos fracos aqui.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
                <XCircle className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Seus pontos fracos</h3>
                <span className="text-xs text-slate-400 ml-auto">clique para revisar</span>
            </div>

            {topEntries.map(([topicKey, errorCount]) => {
                const [subject, topic] = topicKey.split('::');
                const relatedQuestions = questions.filter(
                    (q) => q.subject === subject && (topic === subject || q.tags.includes(topic)),
                );
                const isOpen = expanded === topicKey;

                return (
                    <div
                        key={topicKey}
                        className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10 overflow-hidden"
                    >
                        {/* Header row */}
                        <button
                            onClick={() => setExpanded(isOpen ? null : topicKey)}
                            className="w-full flex items-center justify-between gap-3 p-3.5 text-left"
                            aria-expanded={isOpen}
                            aria-label={`Revisar erros em ${topic || subject}`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-red-500 font-bold text-sm">{errorCount}×</span>
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm text-red-700 dark:text-red-400 truncate">
                                        {topic && topic !== subject ? topic : subject}
                                    </p>
                                    {topic && topic !== subject && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subject}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStartReview(topic && topic !== subject ? topic : 'Todos', subject);
                                    }}
                                    aria-label={`Iniciar revisão de ${topic || subject}`}
                                    className="flex items-center gap-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-2.5 py-1.5 rounded-lg transition"
                                >
                                    <RotateCcw className="w-3 h-3" /> Revisar
                                </button>
                                <span className="text-slate-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                            </div>
                        </button>

                        {/* Expanded: example questions from this topic */}
                        {isOpen && (
                            <div className="border-t border-red-100 dark:border-red-900/40 px-3.5 pb-3.5 pt-2 space-y-2">
                                {relatedQuestions.length > 0 ? (
                                    relatedQuestions.slice(0, 4).map((q) => (
                                        <div key={q.id} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                                            <BookOpen className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                                            <span className="leading-snug line-clamp-2">{q.question}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-400 italic">
                                        Complete um quiz desta matéria para ver as questões aqui.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default QuizErrorReview;
