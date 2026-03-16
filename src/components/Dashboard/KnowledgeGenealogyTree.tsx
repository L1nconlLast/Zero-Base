import React from 'react';
import { Brain, ChevronDown, ChevronRight, Sparkles, GitBranch, ShieldCheck, ArrowRightCircle } from 'lucide-react';
import {
  GLOBAL_KNOWLEDGE_ROOTS,
  KNOWLEDGE_GRAPH_EDGES,
  PORTUGUESE_KNOWLEDGE_TREE,
  type KnowledgeNode,
} from '../../data/knowledgeTreeBlueprint';
import {
  learningGraphApiService,
  type LearningGraphDiscipline,
  type LearningGraphNextTopic,
  type LearningGraphPrerequisiteEdge,
  type LearningGraphTopic,
  type LearningGraphUserProgress,
  type LearningProgressStatus,
} from '../../services/learningGraphApi.service';

interface KnowledgeGenealogyTreeProps {
  supabaseUserId?: string | null;
}

const kindLabel: Record<KnowledgeNode['kind'], string> = {
  root: 'Raiz',
  area: 'Area',
  topic: 'Topico',
  microtopic: 'Microtopico',
};

const kindStyle: Record<KnowledgeNode['kind'], string> = {
  root: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  area: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  topic: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  microtopic: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const parentByChild = KNOWLEDGE_GRAPH_EDGES.reduce<Record<string, string[]>>((acc, edge) => {
  if (!acc[edge.to]) acc[edge.to] = [];
  acc[edge.to].push(edge.from);
  return acc;
}, {});

const rootLabelById = GLOBAL_KNOWLEDGE_ROOTS.reduce<Record<string, string>>((acc, item) => {
  acc[item.id] = item.name;
  return acc;
}, {});

const statusLabel: Record<LearningProgressStatus, string> = {
  locked: 'Bloqueado',
  available: 'Disponivel',
  studying: 'Estudando',
  completed: 'Concluido',
  review: 'Revisao',
};

const statusStyle: Record<LearningProgressStatus, string> = {
  locked: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  available: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  studying: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const statusFlow: LearningProgressStatus[] = ['locked', 'available', 'studying', 'completed', 'review'];

const getNextStatus = (current: LearningProgressStatus): LearningProgressStatus => {
  const index = statusFlow.indexOf(current);
  if (index < 0 || index === statusFlow.length - 1) {
    return 'completed';
  }
  return statusFlow[index + 1];
};

const KnowledgeNodeRow: React.FC<{ node: KnowledgeNode; level: number }> = ({ node, level }) => {
  const [open, setOpen] = React.useState(level < 2);
  const hasChildren = Boolean(node.children?.length);
  const prerequisites = parentByChild[node.id] || [];

  return (
    <div className="space-y-2">
      <div
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
        style={{ marginLeft: `${level * 14}px` }}
      >
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="text-slate-500"
              aria-label={open ? 'Recolher ramo' : 'Expandir ramo'}
            >
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-4" />
          )}

          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{node.name}</p>

          <span className={`ml-auto text-[11px] font-semibold px-2 py-1 rounded-full ${kindStyle[node.kind]}`}>
            {kindLabel[node.kind]}
          </span>
        </div>

        {prerequisites.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-500 dark:text-slate-400">Prerequisitos:</span>
            {prerequisites.map((dependency) => (
              <span
                key={dependency}
                className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              >
                {dependency}
              </span>
            ))}
          </div>
        )}
      </div>

      {hasChildren && open && (
        <div className="space-y-2">
          {node.children?.map((child) => (
            <KnowledgeNodeRow key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const KnowledgeGenealogyTree: React.FC<KnowledgeGenealogyTreeProps> = ({ supabaseUserId }) => {
  const [disciplines, setDisciplines] = React.useState<LearningGraphDiscipline[]>([]);
  const [selectedDisciplineId, setSelectedDisciplineId] = React.useState<string>('');
  const [topics, setTopics] = React.useState<LearningGraphTopic[]>([]);
  const [prerequisiteEdges, setPrerequisiteEdges] = React.useState<LearningGraphPrerequisiteEdge[]>([]);
  const [progressByTopicId, setProgressByTopicId] = React.useState<Record<string, LearningGraphUserProgress>>({});
  const [isLoadingMap, setIsLoadingMap] = React.useState(false);
  const [isAutoUnlocking, setIsAutoUnlocking] = React.useState(false);
  const [mapError, setMapError] = React.useState<string | null>(null);
  const [nextTopic, setNextTopic] = React.useState<LearningGraphNextTopic | null>(null);
  const [isLoadingNextTopic, setIsLoadingNextTopic] = React.useState(false);
  const [nextTopicError, setNextTopicError] = React.useState<string | null>(null);
  const [updatingTopicId, setUpdatingTopicId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    const loadDisciplines = async () => {
      try {
        const rows = await learningGraphApiService.listDisciplines();
        if (!active) return;
        setDisciplines(rows);
      } catch {
        if (!active) return;
        setDisciplines([]);
      }
    };

    void loadDisciplines();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    let active = true;

    const loadMapData = async () => {
      setIsLoadingMap(true);
      setMapError(null);

      try {
        const [topicRows, edgeRows, progressRows] = await Promise.all([
          learningGraphApiService.listTopics(selectedDisciplineId || undefined),
          learningGraphApiService.listPrerequisiteEdges(selectedDisciplineId || undefined),
          supabaseUserId
            ? learningGraphApiService.getUserProgress(selectedDisciplineId || undefined)
            : Promise.resolve([]),
        ]);

        if (!active) return;

        setTopics(topicRows);
        setPrerequisiteEdges(edgeRows);

        const nextProgressByTopic = (progressRows || []).reduce<Record<string, LearningGraphUserProgress>>((acc, row) => {
          acc[row.topico_id] = row;
          return acc;
        }, {});

        setProgressByTopicId(nextProgressByTopic);
      } catch (error) {
        if (!active) return;
        setMapError(error instanceof Error ? error.message : 'Nao foi possivel carregar o mapa de topicos.');
        setTopics([]);
        setPrerequisiteEdges([]);
        setProgressByTopicId({});
      } finally {
        if (active) {
          setIsLoadingMap(false);
        }
      }
    };

    void loadMapData();

    return () => {
      active = false;
    };
  }, [selectedDisciplineId, supabaseUserId]);

  React.useEffect(() => {
    if (!supabaseUserId || topics.length === 0 || isAutoUnlocking) {
      return;
    }

    const completedStatuses = new Set<LearningProgressStatus>(['completed', 'review']);

    const edgeMap = prerequisiteEdges.reduce<Record<string, string[]>>((acc, edge) => {
      if (!acc[edge.topico_id]) {
        acc[edge.topico_id] = [];
      }
      acc[edge.topico_id].push(edge.prerequisito_id);
      return acc;
    }, {});

    const unlockedCandidates = topics.filter((topic) => {
      const currentStatus = progressByTopicId[topic.id]?.status || 'locked';
      if (currentStatus !== 'locked') {
        return false;
      }

      const prerequisites = edgeMap[topic.id] || [];
      if (prerequisites.length === 0) {
        return true;
      }

      return prerequisites.every((prereqId) => {
        const prereqStatus = progressByTopicId[prereqId]?.status;
        return prereqStatus ? completedStatuses.has(prereqStatus) : false;
      });
    });

    if (unlockedCandidates.length === 0) {
      return;
    }

    let active = true;

    const autoUnlock = async () => {
      setIsAutoUnlocking(true);

      try {
        for (const topic of unlockedCandidates) {
          const updated = await learningGraphApiService.updateTopicProgress({
            topicId: topic.id,
            status: 'available',
          });

          if (!active || !updated) {
            continue;
          }

          setProgressByTopicId((prev) => ({
            ...prev,
            [topic.id]: updated,
          }));
        }
      } catch (error) {
        if (active) {
          setMapError(error instanceof Error ? error.message : 'Falha no desbloqueio automatico de topicos.');
        }
      } finally {
        if (active) {
          setIsAutoUnlocking(false);
        }
      }
    };

    void autoUnlock();

    return () => {
      active = false;
    };
  }, [supabaseUserId, topics, prerequisiteEdges, progressByTopicId, isAutoUnlocking]);

  const handleRecommend = async () => {
    setIsLoadingNextTopic(true);
    setNextTopicError(null);

    try {
      const recommended = await learningGraphApiService.getNextTopic(selectedDisciplineId || undefined);
      setNextTopic(recommended);
    } catch (error) {
      setNextTopic(null);
      setNextTopicError(error instanceof Error ? error.message : 'Nao foi possivel obter recomendacao.');
    } finally {
      setIsLoadingNextTopic(false);
    }
  };

  const getTopicStatus = React.useCallback(
    (topicId: string): LearningProgressStatus => progressByTopicId[topicId]?.status || 'locked',
    [progressByTopicId],
  );

  const handleAdvanceTopic = async (topic: LearningGraphTopic) => {
    if (!supabaseUserId) {
      setMapError('Faca login para atualizar status dos topicos.');
      return;
    }

    const currentStatus = getTopicStatus(topic.id);
    const nextStatus = getNextStatus(currentStatus);

    setUpdatingTopicId(topic.id);
    setMapError(null);

    try {
      const updated = await learningGraphApiService.updateTopicProgress({
        topicId: topic.id,
        status: nextStatus,
        attemptsDelta: 1,
        studyMinutes: nextStatus === 'studying' || nextStatus === 'completed' ? 25 : 0,
        score: nextStatus === 'completed' ? 100 : undefined,
      });

      if (updated) {
        setProgressByTopicId((prev) => ({
          ...prev,
          [topic.id]: updated,
        }));
      }
    } catch (error) {
      setMapError(error instanceof Error ? error.message : 'Nao foi possivel atualizar o topico.');
    } finally {
      setUpdatingTopicId(null);
    }
  };

  const handleStartRecommendedTopic = async () => {
    if (!nextTopic?.topic_id) {
      return;
    }

    const linked = topics.find((topic) => topic.id === nextTopic.topic_id);
    if (!linked) {
      setMapError('Topico recomendado nao esta na lista atual. Selecione a disciplina correspondente.');
      return;
    }

    await handleAdvanceTopic(linked);
  };

  const displayedTopics = React.useMemo(() => topics.slice(0, 14), [topics]);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-500" />
            Arvore genealogica do conhecimento
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualize linhagem de base, ramos e prerequisitos antes de subir para topicos avancados.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Recomendacao IA de proximo topico</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedDisciplineId}
            onChange={(event) => setSelectedDisciplineId(event.target.value)}
            className="w-full sm:max-w-xs px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 text-sm"
          >
            <option value="">Todas as disciplinas</option>
            {disciplines.map((discipline) => (
              <option key={discipline.id} value={discipline.id}>
                {discipline.nome}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              void handleRecommend();
            }}
            disabled={!supabaseUserId || isLoadingNextTopic}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {isLoadingNextTopic ? 'Calculando...' : 'Sugerir proximo topico'}
          </button>
        </div>

        {!supabaseUserId && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            Faca login para receber recomendacao personalizada baseada no seu progresso.
          </p>
        )}

        {nextTopicError && (
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{nextTopicError}</p>
        )}

        {nextTopic && (
          <div className="mt-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {nextTopic.topic_nome}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              Disciplina: {nextTopic.discipline_nome} • Dificuldade: {nextTopic.difficulty} • Score IA: {nextTopic.score}
            </p>
            <button
              type="button"
              onClick={() => {
                void handleStartRecommendedTopic();
              }}
              disabled={!supabaseUserId || updatingTopicId === nextTopic.topic_id}
              className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 disabled:opacity-50"
            >
              {updatingTopicId === nextTopic.topic_id ? 'Atualizando...' : 'Iniciar recomendado'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Grafo executavel (status por no)</p>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isAutoUnlocking ? 'Desbloqueio automatico em andamento...' : '1 clique para avancar etapa'}
          </span>
        </div>

        <div className="mb-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">Linha do tempo de progressao</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {statusFlow.map((status, index) => (
              <React.Fragment key={status}>
                <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${statusStyle[status]}`}>
                  {statusLabel[status]}
                </span>
                {index < statusFlow.length - 1 && <span className="text-slate-400">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {mapError && <p className="text-xs text-rose-600 dark:text-rose-400 mb-2">{mapError}</p>}

        {isLoadingMap ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Carregando topicos e progresso...</p>
        ) : displayedTopics.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Sem topicos para a disciplina selecionada.</p>
        ) : (
          <div className="space-y-2">
            {displayedTopics.map((topic) => {
              const status = getTopicStatus(topic.id);
              const nextStatus = getNextStatus(status);
              const isUpdating = updatingTopicId === topic.id;

              return (
                <div
                  key={topic.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{topic.nome}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Nivel: {topic.nivel_dificuldade || 'intermediario'}
                      </p>
                    </div>

                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${statusStyle[status]}`}>
                      {statusLabel[status]}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleAdvanceTopic(topic);
                      }}
                      disabled={!supabaseUserId || isUpdating}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-50"
                    >
                      <ArrowRightCircle className="w-3.5 h-3.5" />
                      {isUpdating ? 'Atualizando...' : `Avancar para ${statusLabel[nextStatus]}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <KnowledgeNodeRow node={PORTUGUESE_KNOWLEDGE_TREE} level={0} />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-3">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-[0.12em]">Raizes globais mapeadas</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {GLOBAL_KNOWLEDGE_ROOTS.map((root) => (
            <span
              key={root.id}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              title={root.id}
            >
              {rootLabelById[root.id] || root.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default KnowledgeGenealogyTree;
