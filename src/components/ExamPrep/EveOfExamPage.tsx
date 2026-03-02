import React, { useState } from 'react';
import { Zap, BookOpen, Brain, Clock, ChevronRight, CheckCircle } from 'lucide-react';
import { MATERIAS_CONFIG, type MateriaTipo } from '../../types';

interface EveOfExamPageProps {
  onStartQuiz?: (subject?: string) => void;
  onStartFlashcards?: () => void;
  onStartTimer?: () => void;
}

const TOPICS_REVIEW = [
  { subject: 'Anatomia', key_points: ['Nervos cranianos (12 pares)', 'Plexo braquial (C5-T1)', 'Válvula mitral — átrio E / ventrículo E', 'Fêmur = maior osso', 'Triângulo femoral: VAN (lat→med)'] },
  { subject: 'Fisiologia', key_points: ['PA normal: 120/80 mmHg', 'FC normal: 60–100 bpm', 'ADH → reabsorção água', 'Repolarização: effluxo K⁺', 'pH = 6,1 + log(HCO₃/0,03×pCO₂)'] },
  { subject: 'Farmacologia', key_points: ['Penicilina → inibe parede celular', 'Propranolol → bloqueia β1 e β2', 'Celecoxibe → COX-2 seletivo', 'NAC = antídoto paracetamol', 'Rifampicina → indutor CYP (↓varfarina)'] },
  { subject: 'Patologia', key_points: ['Infarto = necrose coagulativa', 'TB = granuloma caseoso', 'p53 = guardião do genoma', 'Inflamação aguda: neutrófilos', 'APC → início adenoma-carcinoma colorretal'] },
  { subject: 'Bioquímica', key_points: ['Glicólise → piruvato (2 ATPs)', 'Oxidação glicose: 36–38 ATPs', 'Glucagon → glicogenólise (via PKA/AMPc)', 'B1 (tiamina) = coenzima piruvato-DH', 'PKU = deficiência fenilalanina-hidroxilase'] },
  { subject: 'Histologia', key_points: ['Vasos = endotélio (pav. simples)', 'Kupffer = macrófagos hepáticos', 'Oligodendrócitos → mielina no SNC', 'Fibras tipo I = sóleo (resistentes)', 'BHE = tight junctions extensas'] },
];

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
          const config = MATERIAS_CONFIG[topic.subject as MateriaTipo];
          const checkedInTopic = topic.key_points.filter((_, i) => checked[`${topic.subject}-${i}`]).length;
          const allDone = checkedInTopic === topic.key_points.length;

          return (
            <div
              key={topic.subject}
              className={`bg-white dark:bg-gray-800 rounded-2xl border-2 transition ${allDone ? 'border-green-400 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'} p-4`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{config?.icon}</span>
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
          <div className="text-4xl mb-2">🎉</div>
          <p className="font-bold text-green-700 dark:text-green-400 text-lg">Revisão completa!</p>
          <p className="text-sm text-green-600 dark:text-green-500">Boa prova! Você está pronto(a) para arrasar!</p>
        </div>
      )}
    </div>
  );
};

export default EveOfExamPage;
