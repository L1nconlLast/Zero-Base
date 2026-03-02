import React from 'react';
import { ChevronDown, ChevronRight, BookOpen, Layers, CheckCircle2, CircleDashed, Clock3, Target } from 'lucide-react';
import type { StudyHierarchyAreaNode } from '../../services/learningHierarchy.service';

interface StudyHierarchyTreeProps {
  data: StudyHierarchyAreaNode[];
  loading?: boolean;
  focusedDisciplineName?: string | null;
  onTopicSelect?: (payload: { areaName: string; disciplineName: string; topicName: string; target: 'quiz' | 'simulado' }) => void;
}

const statusLabel: Record<string, string> = {
  nao_iniciado: 'Não iniciado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

const StudyHierarchyTree: React.FC<StudyHierarchyTreeProps> = ({
  data,
  loading = false,
  focusedDisciplineName,
  onTopicSelect,
}) => {
  const [openAreas, setOpenAreas] = React.useState<Record<string, boolean>>({});
  const [openDisciplines, setOpenDisciplines] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (data.length === 0) {
      return;
    }

    const areaDefaults: Record<string, boolean> = {};
    const disciplineDefaults: Record<string, boolean> = {};

    data.forEach((area, areaIndex) => {
      areaDefaults[area.id] = areaIndex === 0;
      area.disciplines.forEach((discipline, disciplineIndex) => {
        disciplineDefaults[discipline.id] = areaIndex === 0 && disciplineIndex === 0;
      });
    });

    setOpenAreas((prev) => ({ ...areaDefaults, ...prev }));
    setOpenDisciplines((prev) => ({ ...disciplineDefaults, ...prev }));
  }, [data]);

  React.useEffect(() => {
    if (!focusedDisciplineName) {
      return;
    }

    const normalized = focusedDisciplineName.trim().toLowerCase();
    let matchedAreaId: string | null = null;
    let matchedDisciplineId: string | null = null;

    data.some((area) => area.disciplines.some((discipline) => {
      const matched = discipline.name.trim().toLowerCase() === normalized;
      if (matched) {
        matchedAreaId = area.id;
        matchedDisciplineId = discipline.id;
      }
      return matched;
    }));

    if (matchedAreaId && matchedDisciplineId) {
      setOpenAreas((prev) => ({ ...prev, [matchedAreaId as string]: true }));
      setOpenDisciplines((prev) => ({ ...prev, [matchedDisciplineId as string]: true }));
    }
  }, [data, focusedDisciplineName]);

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Carregando árvore de estudo...</p>;
  }

  if (data.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Sem dados hierárquicos ainda. Continue estudando para montar seu mapa.</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((area) => {
        const isAreaOpen = openAreas[area.id] ?? false;

        return (
          <div key={area.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={() => setOpenAreas((prev) => ({ ...prev, [area.id]: !isAreaOpen }))}
              className="w-full px-4 py-3 flex items-center gap-2 text-left"
            >
              {isAreaOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
              <Layers className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">{area.name}</span>
              <span className="ml-auto text-xs font-semibold text-slate-600 dark:text-slate-300">{area.progressPercent}%</span>
            </button>

            {isAreaOpen && (
              <div className="px-4 pb-4 space-y-2">
                {area.disciplines.map((discipline) => {
                  const isDisciplineOpen = openDisciplines[discipline.id] ?? false;
                  const isFocused = Boolean(
                    focusedDisciplineName && discipline.name.trim().toLowerCase() === focusedDisciplineName.trim().toLowerCase(),
                  );

                  return (
                    <div
                      key={discipline.id}
                      className={`rounded-lg border ${
                        isFocused
                          ? 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenDisciplines((prev) => ({ ...prev, [discipline.id]: !isDisciplineOpen }))}
                        className="w-full px-3 py-2.5 flex items-center gap-2 text-left"
                      >
                        {isDisciplineOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                        <BookOpen className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-slate-800 dark:text-slate-100">{discipline.name}</span>
                        <span className="ml-auto text-xs text-slate-600 dark:text-slate-300">{discipline.progressPercent}%</span>
                      </button>

                      {isDisciplineOpen && (
                        <div className="px-3 pb-3 space-y-2">
                          {discipline.topics.map((topic) => (
                            <div
                              key={topic.id}
                              className="rounded-md border border-slate-200 dark:border-slate-700 p-2.5 bg-slate-50 dark:bg-slate-800/60"
                            >
                              <div className="flex items-center gap-2">
                                {topic.status === 'concluido' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <CircleDashed className="w-4 h-4 text-slate-400" />
                                )}
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{topic.name}</p>
                                <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">{statusLabel[topic.status]}</span>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                                <span className="inline-flex items-center gap-1"><Target className="w-3 h-3" /> {topic.progressPercent}% progresso</span>
                                <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {topic.accuracyPercent}% acurácia</span>
                                <span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3" /> {topic.answeredQuestions} questões</span>
                                <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" /> {topic.estimatedMinutes || 0} min</span>
                              </div>
                              <div className="mt-2 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onTopicSelect?.({ areaName: area.name, disciplineName: discipline.name, topicName: topic.name, target: 'quiz' })}
                                  className="text-[11px] font-semibold px-2 py-1 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                >
                                  Questões
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onTopicSelect?.({ areaName: area.name, disciplineName: discipline.name, topicName: topic.name, target: 'simulado' })}
                                  className="text-[11px] font-semibold px-2 py-1 rounded-md border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                                >
                                  Simulado
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StudyHierarchyTree;
