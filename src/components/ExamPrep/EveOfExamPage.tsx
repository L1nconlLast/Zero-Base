import React, { useState } from 'react';
import { Zap, Trophy, BookOpen, Brain, Clock, ChevronRight, CheckCircle, Languages, Globe2, Microscope, Calculator, PenTool } from 'lucide-react';

interface EveOfExamPageProps {
  onStartQuiz?: (subject?: string) => void;
  onStartFlashcards?: () => void;
  onStartTimer?: () => void;
}

const TOPICS_REVIEW = [
  {
    subject: 'Linguagens',
    icon: Languages,
    key_points: [
      'Interpretação de texto: identificar tese e argumento central',
      'Reconhecer função de figuras de linguagem no contexto',
      'Relacionar linguagem verbal e não verbal em tirinhas/anúncios',
      'Revisar coesão e coerência em textos dissertativos',
      'Identificar variação linguística sem julgamento normativo',
    ],
  },
  {
    subject: 'Ciências Humanas',
    icon: Globe2,
    key_points: [
      'Revisar processos históricos do Brasil (Colônia → República)',
      'Interpretar temas de geopolítica contemporânea',
      'Relacionar cidadania, Estado e direitos fundamentais',
      'Identificar conceitos de sociologia em situações práticas',
      'Reconhecer correntes filosóficas e suas contribuições',
    ],
  },
  {
    subject: 'Ciências da Natureza',
    icon: Microscope,
    key_points: [
      'Revisar leitura de gráficos e experimentos em Física',
      'Identificar funções orgânicas e reações mais cobradas em Química',
      'Conectar ecologia, genética e fisiologia em Biologia',
      'Revisar energia, trabalho e potência com foco em aplicação',
      'Conferir balanceamento e interpretação de equações químicas',
    ],
  },
  {
    subject: 'Matemática',
    icon: Calculator,
    key_points: [
      'Funções (afim e quadrática): leitura e interpretação de gráfico',
      'Razão, proporção e porcentagem em problemas contextualizados',
      'Geometria plana: áreas e perímetros mais frequentes',
      'Probabilidade básica e análise combinatória essencial',
      'Estatística: média, mediana e desvio com leitura de tabelas',
    ],
  },
  {
    subject: 'Português',
    icon: BookOpen,
    key_points: [
      'Concordância verbal e nominal em estruturas frequentes',
      'Regência e uso de crase em contextos de prova',
      'Pontuação e efeitos de sentido no período composto',
      'Classes de palavras e funções sintáticas principais',
      'Interpretação textual com foco em inferência',
    ],
  },
  {
    subject: 'Redação',
    icon: PenTool,
    key_points: [
      'Estruturar introdução com tese clara e recorte temático',
      'Construir repertório sociocultural pertinente ao tema',
      'Manter progressão argumentativa em cada parágrafo',
      'Evitar fuga ao tema e garantir coesão textual',
      'Fechar com proposta de intervenção completa (agente, ação, meio e finalidade)',
    ],
  },
] as const;

const EveOfExamPage: React.FC<EveOfExamPageProps> = ({ onStartQuiz, onStartFlashcards, onStartTimer }) => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggleCheck = (key: string) => setChecked((p) => ({ ...p, [key]: !p[key] }));

  const totalItems = TOPICS_REVIEW.reduce((sum, t) => sum + t.key_points.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((checkedCount / totalItems) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div
        className="rounded-2xl p-5 text-white"
        style={{ backgroundImage: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Modo Véspera de Prova</h2>
        </div>
        <p className="text-white/90 text-sm mb-4">
          Revisão rápida dos pontos mais cobrados — marque cada item conforme revisar
        </p>
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex justify-between text-sm mb-1.5">
            <span>{checkedCount}/{totalItems} itens revisados</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-white transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onStartQuiz?.()}
          className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 transition text-sm font-semibold text-gray-700 dark:text-gray-300"
        >
          <Brain className="w-6 h-6 text-blue-500" />
          Quiz Rápido
        </button>
        <button
          onClick={onStartFlashcards}
          className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-purple-400 transition text-sm font-semibold text-gray-700 dark:text-gray-300"
        >
          <BookOpen className="w-6 h-6 text-purple-500" />
          Flashcards
        </button>
        <button
          onClick={onStartTimer}
          className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-green-400 transition text-sm font-semibold text-gray-700 dark:text-gray-300"
        >
          <Clock className="w-6 h-6 text-green-500" />
          Pomodoro
        </button>
      </div>

      {/* Tópicos por matéria */}
      <div className="space-y-3">
        {TOPICS_REVIEW.map((topic) => {
          const TopicIcon = topic.icon;
          const checkedInTopic = topic.key_points.filter((_, i) => checked[`${topic.subject}-${i}`]).length;
          const allDone = checkedInTopic === topic.key_points.length;

          return (
            <div
              key={topic.subject}
              className={`bg-white dark:bg-gray-800 rounded-2xl border-2 transition ${allDone ? 'border-green-400 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'} p-4`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TopicIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  <h3 className="font-bold text-gray-900 dark:text-white">{topic.subject}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allDone ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    {checkedInTopic}/{topic.key_points.length}
                  </span>
                  {allDone && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>
              </div>
              <div className="space-y-1.5">
                {topic.key_points.map((point, i) => {
                  const key = `${topic.subject}-${i}`;
                  const isChecked = checked[key];
                  return (
                    <button
                      key={i}
                      onClick={() => toggleCheck(key)}
                      className={`w-full flex items-center gap-2.5 text-left text-sm p-2 rounded-lg transition ${isChecked ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-500'}`}>
                        {isChecked && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <span className={isChecked ? 'line-through opacity-60' : ''}>{point}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => onStartQuiz?.(topic.subject)}
                className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-700 transition"
              >
                Praticar questões de {topic.subject} <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {pct === 100 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-5 text-center">
          <div className="flex justify-center mb-2"><Trophy className="w-10 h-10 text-green-600 dark:text-green-400" /></div>
          <p className="font-bold text-green-700 dark:text-green-400 text-lg">Revisão completa!</p>
          <p className="text-sm text-green-600 dark:text-green-500">Boa prova! Você está pronto(a) para arrasar!</p>
        </div>
      )}
    </div>
  );
};

export default EveOfExamPage;
