import React from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  BookOpen,
  ArrowRightCircle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Compass,
  Eye,
  GitBranch,
  Lock,
  Orbit,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  GLOBAL_KNOWLEDGE_ROOTS,
  KNOWLEDGE_GRAPH_EDGES,
  getKnowledgeTreeByDiscipline,
  type KnowledgeNode,
} from '../../data/knowledgeTreeBlueprint';
import {
  learningGraphApiService,
  type LearningGraphDiscipline,
  type LearningGraphNode,
  type LearningGraphNextTopic,
  type LearningGraphPrerequisiteEdge,
  type LearningGraphPayload,
  type LearningGraphTopic,
  type LearningGraphUserProgress,
  type LearningProgressStatus,
} from '../../services/learningGraphApi.service';

interface KnowledgeGenealogyTreeProps {
  supabaseUserId?: string | null;
  preferredDisciplineName?: string;
}

type LearningMode = 'simple' | 'advanced';
type TrackMode = 'enem' | 'concurso';
type AdvancedViewMode = 'list' | 'graph';

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

interface StageTopic {
  title: string;
  topicHints: string[];
}

interface StageBlock {
  id: string;
  title: string;
  tone: 'green' | 'yellow' | 'orange' | 'blue';
  topics: StageTopic[];
}

const TRACK_STAGE_MAP: Record<TrackMode, StageBlock[]> = {
  enem: [
    {
      id: 'fundamentos',
      title: 'Fundamentos',
      tone: 'green',
      topics: [
        { title: 'Linguagem', topicHints: ['linguagem'] },
        { title: 'Texto', topicHints: ['texto'] },
        { title: 'Interpretacao basica', topicHints: ['interpretacao', 'inferencia'] },
      ],
    },
    {
      id: 'gramatica',
      title: 'Gramatica',
      tone: 'yellow',
      topics: [
        { title: 'Morfologia', topicHints: ['morfologia'] },
        { title: 'Sintaxe', topicHints: ['sintaxe'] },
        { title: 'Concordancia', topicHints: ['concordancia'] },
      ],
    },
    {
      id: 'producao',
      title: 'Producao de texto',
      tone: 'orange',
      topics: [
        { title: 'Argumentacao', topicHints: ['argumentacao'] },
        { title: 'Coesao', topicHints: ['coesao'] },
        { title: 'Redacao ENEM', topicHints: ['redacao'] },
      ],
    },
    {
      id: 'literatura',
      title: 'Literatura',
      tone: 'blue',
      topics: [{ title: 'Escolas literarias', topicHints: ['literatura', 'modernismo', 'realismo'] }],
    },
  ],
  concurso: [
    {
      id: 'base',
      title: 'Base comum',
      tone: 'green',
      topics: [
        { title: 'Portugues', topicHints: ['portugues', 'interpretacao', 'gramatica'] },
        { title: 'Raciocinio logico', topicHints: ['raciocinio', 'logico'] },
        { title: 'Informatica', topicHints: ['informatica', 'tecnologia'] },
      ],
    },
    {
      id: 'direito',
      title: 'Direito publico',
      tone: 'yellow',
      topics: [
        { title: 'Constitucional', topicHints: ['constitucional'] },
        { title: 'Administrativo', topicHints: ['administrativo'] },
        { title: 'Legislacao', topicHints: ['legislacao'] },
      ],
    },
    {
      id: 'edital',
      title: 'Especialidade do edital',
      tone: 'orange',
      topics: [
        { title: 'Topicos de banca', topicHints: ['banca', 'fgv', 'cebraspe', 'fcc', 'vunesp'] },
        { title: 'Simulados da carreira', topicHints: ['simulado', 'carreira', 'cargo'] },
      ],
    },
    {
      id: 'dominio',
      title: 'Dominio avancado',
      tone: 'blue',
      topics: [{ title: 'Revisao intensiva', topicHints: ['revisao', 'questoes', 'prova completa'] }],
    },
  ],
};

const toneStyle: Record<StageBlock['tone'], string> = {
  green: 'bg-slate-50/80 dark:bg-slate-900/60',
  yellow: 'bg-slate-50/80 dark:bg-slate-900/60',
  orange: 'bg-slate-50/80 dark:bg-slate-900/60',
  blue: 'bg-slate-50/80 dark:bg-slate-900/60',
};

const toneAccentStyle: Record<StageBlock['tone'], string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  orange: 'bg-orange-500',
  blue: 'bg-sky-500',
};

const kindLabel: Record<KnowledgeNode['kind'], string> = {
  root: 'Raiz',
  area: 'Area',
  topic: 'Topico',
  microtopic: 'Microtopico',
};

const kindStyle: Record<KnowledgeNode['kind'], string> = {
  root: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
  area: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  topic: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
  microtopic: 'bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300',
};

const statusLabel: Record<LearningProgressStatus, string> = {
  locked: 'Bloqueado',
  available: 'Disponivel',
  studying: 'Estudando',
  completed: 'Concluido',
  review: 'Revisao',
};

const statusStyle: Record<LearningProgressStatus, string> = {
  locked: 'bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300',
  available: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
  studying: 'bg-blue-100 text-blue-800 dark:bg-blue-500/25 dark:text-blue-100',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
  review: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
};

const statusFlow: LearningProgressStatus[] = ['locked', 'available', 'studying', 'completed', 'review'];
const statusColorHex: Record<LearningProgressStatus, string> = {
  locked: '#94a3b8',
  available: '#3b82f6',
  studying: '#2563eb',
  completed: '#10b981',
  review: '#f59e0b',
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

const getNextStatus = (current: LearningProgressStatus): LearningProgressStatus => {
  const index = statusFlow.indexOf(current);
  if (index < 0 || index === statusFlow.length - 1) return 'completed';
  return statusFlow[index + 1];
};

const getDisciplineTrack = (discipline: LearningGraphDiscipline): TrackMode | null => {
  const relation = Array.isArray(discipline.modalidades)
    ? discipline.modalidades[0]
    : discipline.modalidades;
  const modalidadeName = (relation?.nome || '').toLowerCase();
  const fallbackName = (discipline.nome || '').toLowerCase();

  if (modalidadeName.includes('enem')) return 'enem';
  if (modalidadeName.includes('concurso')) return 'concurso';

  if (fallbackName.includes('constitucional') || fallbackName.includes('administrativo') || fallbackName.includes('raciocinio')) {
    return 'concurso';
  }

  if (fallbackName.includes('redacao') || fallbackName.includes('natureza') || fallbackName.includes('humanas')) {
    return 'enem';
  }

  return null;
};

const statusIconByStatus: Record<LearningProgressStatus, React.ComponentType<{ className?: string }>> = {
  locked: Lock,
  available: Circle,
  studying: Sparkles,
  completed: CheckCircle2,
  review: RefreshCw,
};

const nodeIconByType: Record<string, React.ComponentType<{ className?: string }>> = {
  discipline: BookOpen,
  area: Compass,
  topic: Circle,
  subtopic: Orbit,
};

const normalizeDisciplineName = (value?: string | null): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const KnowledgeNodeRow: React.FC<{ node: KnowledgeNode; level: number }> = ({ node, level }) => {
  const [open, setOpen] = React.useState(level < 2);
  const hasChildren = Boolean(node.children?.length);
  const prerequisites = parentByChild[node.id] || [];

  return (
    <div className="space-y-2">
      <div
        className="rounded-2xl bg-slate-50/85 px-4 py-3 shadow-sm shadow-slate-950/5 dark:bg-slate-900/65 dark:shadow-black/10"
        style={{ marginLeft: `${level * 14}px` }}
      >
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
              aria-label={open ? 'Recolher ramo' : 'Expandir ramo'}
            >
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-4" />
          )}

          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{node.name}</p>
          <span className={`ml-auto text-[11px] font-semibold px-2 py-1 rounded-full ${kindStyle[node.kind]}`}>{kindLabel[node.kind]}</span>
        </div>

        {prerequisites.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-slate-500 dark:text-slate-400">Prerequisitos:</span>
            {prerequisites.map((dependency) => (
              <span key={dependency} className="px-2 py-0.5 rounded-full bg-white/85 text-slate-600 dark:bg-slate-950/70 dark:text-slate-300">
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

const KnowledgeGenealogyTree: React.FC<KnowledgeGenealogyTreeProps> = ({
  supabaseUserId,
  preferredDisciplineName,
}) => {
  const [learningMode, setLearningMode] = React.useState<LearningMode>('simple');
  const [advancedViewMode, setAdvancedViewMode] = React.useState<AdvancedViewMode>('graph');
  const [trackMode, setTrackMode] = React.useState<TrackMode>('enem');
  const [disciplines, setDisciplines] = React.useState<LearningGraphDiscipline[]>([]);
  const [selectedDisciplineId, setSelectedDisciplineId] = React.useState<string>('');
  const [topics, setTopics] = React.useState<LearningGraphTopic[]>([]);
  const [prerequisiteEdges, setPrerequisiteEdges] = React.useState<LearningGraphPrerequisiteEdge[]>([]);
  const [graphPayload, setGraphPayload] = React.useState<LearningGraphPayload>({ nodes: [], edges: [], stats: { totalNodes: 0, totalEdges: 0, totalTopics: 0 } });
  const [progressByTopicId, setProgressByTopicId] = React.useState<Record<string, LearningGraphUserProgress>>({});
  const [isLoadingMap, setIsLoadingMap] = React.useState(false);
  const [isAutoUnlocking, setIsAutoUnlocking] = React.useState(false);
  const [mapError, setMapError] = React.useState<string | null>(null);
  const [nextTopic, setNextTopic] = React.useState<LearningGraphNextTopic | null>(null);
  const [isLoadingNextTopic, setIsLoadingNextTopic] = React.useState(false);
  const [nextTopicError, setNextTopicError] = React.useState<string | null>(null);
  const [updatingTopicId, setUpdatingTopicId] = React.useState<string | null>(null);
  const hasAppliedPreferredContext = React.useRef(false);

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

  const contextDisciplineOption = React.useMemo<LearningGraphDiscipline | null>(() => {
    if (!preferredDisciplineName?.trim()) {
      return null;
    }

    return {
      id: `context:${normalizeDisciplineName(preferredDisciplineName)}`,
      nome: preferredDisciplineName.trim(),
    };
  }, [preferredDisciplineName]);
  const allDisciplineOptions = React.useMemo(() => {
    const uniqueDisciplines = new Map<string, LearningGraphDiscipline>();

    disciplines.forEach((discipline) => {
      uniqueDisciplines.set(discipline.id, discipline);
    });

    const hasContextMatch = contextDisciplineOption
      ? Array.from(uniqueDisciplines.values()).some(
        (discipline) => normalizeDisciplineName(discipline.nome) === normalizeDisciplineName(contextDisciplineOption.nome),
      )
      : false;

    if (contextDisciplineOption && !hasContextMatch) {
      uniqueDisciplines.set(contextDisciplineOption.id, contextDisciplineOption);
    }

    return Array.from(uniqueDisciplines.values()).sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));
  }, [contextDisciplineOption, disciplines]);

  React.useEffect(() => {
    hasAppliedPreferredContext.current = false;
  }, [preferredDisciplineName]);

  React.useEffect(() => {
    if (hasAppliedPreferredContext.current) {
      return;
    }

    const normalizedPreferred = normalizeDisciplineName(preferredDisciplineName);

    if (!normalizedPreferred) {
      return;
    }

    if (disciplines.length === 0) {
      if (!selectedDisciplineId && contextDisciplineOption) {
        setSelectedDisciplineId(contextDisciplineOption.id);
      }
      return;
    }

    const matchedDiscipline = disciplines.find((discipline) =>
      normalizeDisciplineName(discipline.nome).includes(normalizedPreferred)
      || normalizedPreferred.includes(normalizeDisciplineName(discipline.nome)),
    );

    if (!matchedDiscipline) {
      if (contextDisciplineOption && selectedDisciplineId !== contextDisciplineOption.id) {
        setSelectedDisciplineId(contextDisciplineOption.id);
      }
      hasAppliedPreferredContext.current = true;
      return;
    }

    const matchedTrack = getDisciplineTrack(matchedDiscipline);
    if (matchedTrack && matchedTrack !== trackMode) {
      setTrackMode(matchedTrack);
    }

    if (matchedDiscipline.id !== selectedDisciplineId) {
      setSelectedDisciplineId(matchedDiscipline.id);
    }

    hasAppliedPreferredContext.current = true;
  }, [contextDisciplineOption, disciplines, preferredDisciplineName, selectedDisciplineId, trackMode]);

  React.useEffect(() => {
    if (allDisciplineOptions.length === 0) {
      setSelectedDisciplineId('');
      return;
    }

    if (!selectedDisciplineId) {
      setSelectedDisciplineId(allDisciplineOptions[0].id);
      return;
    }

    if (!allDisciplineOptions.some((item) => item.id === selectedDisciplineId)) {
      setSelectedDisciplineId(allDisciplineOptions[0].id);
    }
  }, [allDisciplineOptions, selectedDisciplineId]);

  const selectedDisciplineIdForApi = React.useMemo(
    () => (selectedDisciplineId.startsWith('context:') ? undefined : selectedDisciplineId || undefined),
    [selectedDisciplineId],
  );

  React.useEffect(() => {
    let active = true;

    const loadMapData = async () => {
      setIsLoadingMap(true);
      setMapError(null);

      try {
        const [topicRows, edgeRows, graphRows, progressRows] = await Promise.all([
          learningGraphApiService.listTopics(selectedDisciplineIdForApi),
          learningGraphApiService.listPrerequisiteEdges(selectedDisciplineIdForApi),
          learningGraphApiService.getSkillTree({ disciplineId: selectedDisciplineIdForApi, track: trackMode, limit: 1200 }),
          supabaseUserId ? learningGraphApiService.getUserProgress(selectedDisciplineIdForApi) : Promise.resolve([]),
        ]);

        if (!active) return;

        setTopics(topicRows);
        setPrerequisiteEdges(edgeRows);
        setGraphPayload(graphRows);

        const normalizedProgress = (progressRows || []).reduce<Record<string, LearningGraphUserProgress>>((acc, row) => {
          acc[row.topico_id] = row;
          return acc;
        }, {});

        setProgressByTopicId(normalizedProgress);
      } catch (error) {
        if (!active) return;
        setMapError(error instanceof Error ? error.message : 'Nao foi possivel carregar o mapa de topicos.');
        setTopics([]);
        setPrerequisiteEdges([]);
        setGraphPayload({ nodes: [], edges: [], stats: { totalNodes: 0, totalEdges: 0, totalTopics: 0 } });
        setProgressByTopicId({});
      } finally {
        if (active) setIsLoadingMap(false);
      }
    };

    void loadMapData();

    return () => {
      active = false;
    };
  }, [selectedDisciplineIdForApi, supabaseUserId, trackMode]);

  React.useEffect(() => {
    if (!supabaseUserId || topics.length === 0 || isAutoUnlocking) return;

    const completedStatuses = new Set<LearningProgressStatus>(['completed', 'review']);

    const edgeMap = prerequisiteEdges.reduce<Record<string, string[]>>((acc, edge) => {
      if (!acc[edge.topico_id]) acc[edge.topico_id] = [];
      acc[edge.topico_id].push(edge.prerequisito_id);
      return acc;
    }, {});

    const unlockedCandidates = topics.filter((topic) => {
      const currentStatus = progressByTopicId[topic.id]?.status || 'locked';
      if (currentStatus !== 'locked') return false;

      const prerequisites = edgeMap[topic.id] || [];
      if (prerequisites.length === 0) return true;

      return prerequisites.every((prereqId) => {
        const prereqStatus = progressByTopicId[prereqId]?.status;
        return prereqStatus ? completedStatuses.has(prereqStatus) : false;
      });
    });

    if (unlockedCandidates.length === 0) return;

    let active = true;

    const autoUnlock = async () => {
      setIsAutoUnlocking(true);

      try {
        for (const topic of unlockedCandidates) {
          const updated = await learningGraphApiService.updateTopicProgress({ topicId: topic.id, status: 'available' });

          if (!active || !updated) continue;

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
        if (active) setIsAutoUnlocking(false);
      }
    };

    void autoUnlock();

    return () => {
      active = false;
    };
  }, [supabaseUserId, topics, prerequisiteEdges, progressByTopicId, isAutoUnlocking]);

  const getTopicStatus = React.useCallback(
    (topicId: string): LearningProgressStatus => progressByTopicId[topicId]?.status || 'locked',
    [progressByTopicId],
  );

  const findTopicByHint = React.useCallback(
    (hintList: string[]) => {
      const normalizedHints = hintList.map((hint) => hint.toLowerCase());
      return topics.find((topic) => {
        const text = `${topic.nome} ${topic.descricao || ''}`.toLowerCase();
        return normalizedHints.some((hint) => text.includes(hint));
      });
    },
    [topics],
  );

  const handleAdvanceTopic = React.useCallback(async (topic: LearningGraphTopic) => {
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
  }, [supabaseUserId, getTopicStatus]);

  const handleRecommend = async () => {
    setIsLoadingNextTopic(true);
    setNextTopicError(null);

    try {
      const recommended = await learningGraphApiService.getNextTopic(selectedDisciplineIdForApi);
      setNextTopic(recommended);
    } catch (error) {
      setNextTopic(null);
      setNextTopicError(error instanceof Error ? error.message : 'Nao foi possivel obter recomendacao.');
    } finally {
      setIsLoadingNextTopic(false);
    }
  };

  const handleContinue = async () => {
    if (nextTopic?.topic_id) {
      const linkedByRecommendation = topics.find((topic) => topic.id === nextTopic.topic_id);
      if (linkedByRecommendation) {
        await handleAdvanceTopic(linkedByRecommendation);
        return;
      }
    }

    const candidate = topics.find((topic) => {
      const status = getTopicStatus(topic.id);
      return status === 'available' || status === 'studying';
    });

    if (candidate) {
      await handleAdvanceTopic(candidate);
      return;
    }

    setMapError('Nenhum topico disponivel para continuar no momento.');
  };

  const stages = TRACK_STAGE_MAP[trackMode];
  const selectedDiscipline = React.useMemo(
    () => allDisciplineOptions.find((discipline) => discipline.id === selectedDisciplineId),
    [allDisciplineOptions, selectedDisciplineId],
  );
  const selectedReferenceTree = React.useMemo(() => {
    if (selectedDiscipline?.nome) {
      return getKnowledgeTreeByDiscipline(selectedDiscipline.nome);
    }

    return trackMode === 'concurso'
      ? getKnowledgeTreeByDiscipline('direito_constitucional')
      : getKnowledgeTreeByDiscipline('portugues');
  }, [selectedDiscipline, trackMode]);
  const stageSummaries = React.useMemo(
    () =>
      stages.map((stage) => {
        const matchedTopics = stage.topics
          .map((stageTopic) => findTopicByHint(stageTopic.topicHints))
          .filter(Boolean) as LearningGraphTopic[];
        const completedCount = matchedTopics.filter((topic) => {
          const status = getTopicStatus(topic.id);
          return status === 'completed' || status === 'review';
        }).length;

        return {
          stageId: stage.id,
          completedCount,
          totalCount: stage.topics.length,
          label:
            completedCount > 0
              ? `${completedCount}/${stage.topics.length} concluidos`
              : 'Voce ainda nao comecou',
        };
      }),
    [findTopicByHint, getTopicStatus, stages],
  );
  const featuredStageTopicKey = React.useMemo(() => {
    const allStageTopics = stages.flatMap((stage) =>
      stage.topics.map((stageTopic) => ({
        key: `${stage.id}:${stageTopic.title}`,
        stageTitle: stage.title,
        topicTitle: stageTopic.title,
        matched: findTopicByHint(stageTopic.topicHints),
      })),
    );

    if (nextTopic?.topic_id) {
      const recommended = allStageTopics.find((item) => item.matched?.id === nextTopic.topic_id);
      if (recommended) {
        return recommended.key;
      }
    }

    const activeTopic = allStageTopics.find((item) => {
      if (!item.matched) {
        return false;
      }

      const status = getTopicStatus(item.matched.id);
      return status === 'available' || status === 'studying';
    });

    if (activeTopic) {
      return activeTopic.key;
    }

    return allStageTopics.find((item) => Boolean(item.matched))?.key ?? allStageTopics[0]?.key ?? null;
  }, [findTopicByHint, getTopicStatus, nextTopic?.topic_id, stages]);
  const featuredStageTopicMeta = React.useMemo(
    () =>
      stages
        .flatMap((stage) =>
          stage.topics.map((stageTopic) => ({
            key: `${stage.id}:${stageTopic.title}`,
            stageTitle: stage.title,
            topicTitle: stageTopic.title,
          })),
        )
        .find((item) => item.key === featuredStageTopicKey) ?? null,
    [featuredStageTopicKey, stages],
  );
  const totalCompletedTopics = React.useMemo(
    () => stageSummaries.reduce((sum, stage) => sum + stage.completedCount, 0),
    [stageSummaries],
  );
  const totalPlannedTopics = React.useMemo(
    () => stageSummaries.reduce((sum, stage) => sum + stage.totalCount, 0),
    [stageSummaries],
  );
  const selectedDisciplineSummary = React.useMemo(() => {
    if (!selectedDiscipline?.nome) {
      return 'Escolha uma disciplina para abrir um caminho de estudo.';
    }

    if (featuredStageTopicMeta) {
      return `Voce esta em: ${selectedDiscipline.nome} - ${featuredStageTopicMeta.stageTitle}`;
    }

    return `Voce esta em: ${selectedDiscipline.nome}`;
  }, [featuredStageTopicMeta, selectedDiscipline?.nome]);
  const simpleTimelineItems = React.useMemo(
    () =>
      stages.flatMap((stage, stageIndex) =>
        stage.topics.map((stageTopic, topicIndex) => {
          const matched = findTopicByHint(stageTopic.topicHints);
          const status = matched ? getTopicStatus(matched.id) : 'locked';
          const isFeatured = featuredStageTopicKey === `${stage.id}:${stageTopic.title}`;

          return {
            key: `${stage.id}:${stageTopic.title}`,
            stageId: stage.id,
            stageTitle: stage.title,
            stageTone: stage.tone,
            stageSummary: stageSummaries.find((item) => item.stageId === stage.id)?.label || '',
            topicTitle: stageTopic.title,
            matched,
            status,
            isFeatured,
            isFirstInStage: topicIndex === 0,
            isLastItem: stageIndex === stages.length - 1 && topicIndex === stage.topics.length - 1,
          };
        }),
      ),
    [featuredStageTopicKey, findTopicByHint, getTopicStatus, stageSummaries, stages],
  );
  const advancedStageSections = React.useMemo(
    () =>
      stages.map((stage) => {
        const summary = stageSummaries.find((item) => item.stageId === stage.id);
        const topicsInStage = stage.topics.map((stageTopic) => {
          const matched = findTopicByHint(stageTopic.topicHints);
          const status = matched ? getTopicStatus(matched.id) : 'locked';
          const key = `${stage.id}:${stageTopic.title}`;

          return {
            key,
            topicTitle: stageTopic.title,
            matched,
            status,
            isFeatured: featuredStageTopicKey === key,
          };
        });

        return {
          id: stage.id,
          title: stage.title,
          tone: stage.tone,
          summaryLabel: summary?.label || '',
          completedCount: summary?.completedCount || 0,
          totalCount: summary?.totalCount || topicsInStage.length,
          hasFeatured: topicsInStage.some((topic) => topic.isFeatured),
          topics: topicsInStage,
        };
      }),
    [featuredStageTopicKey, findTopicByHint, getTopicStatus, stageSummaries, stages],
  );

  const graphData = React.useMemo(() => {
    const hierarchyEdges = graphPayload.edges.filter((edge) => edge.type === 'hierarchy');
    const depthByNodeId = new Map<string, number>();
    const incoming = hierarchyEdges.reduce<Record<string, string[]>>((acc, edge) => {
      if (!acc[edge.target]) acc[edge.target] = [];
      acc[edge.target].push(edge.source);
      return acc;
    }, {});

    const computeDepth = (nodeId: string, trail: Set<string> = new Set()): number => {
      if (depthByNodeId.has(nodeId)) return depthByNodeId.get(nodeId) || 0;
      if (trail.has(nodeId)) return 0;
      trail.add(nodeId);
      const parents = incoming[nodeId] || [];
      const depth = parents.length === 0 ? 0 : Math.max(...parents.map((parentId) => computeDepth(parentId, new Set(trail)))) + 1;
      depthByNodeId.set(nodeId, depth);
      return depth;
    };

    const columns = new Map<number, LearningGraphNode[]>();
    graphPayload.nodes.forEach((node) => {
      const depth = computeDepth(node.id);
      const list = columns.get(depth) || [];
      list.push(node);
      columns.set(depth, list);
    });

    const nodes: Node[] = [];
    [...columns.entries()].forEach(([depth, groupedNodes]) => {
      groupedNodes.forEach((node, index) => {
        const nodeStatus = node.data.status || 'locked';
        const StatusIcon = statusIconByStatus[nodeStatus as LearningProgressStatus] || Circle;
        const NodeIcon = nodeIconByType[node.type] || Circle;

        nodes.push({
          id: node.id,
          type: 'default',
          position: { x: depth * 300, y: index * 98 },
          data: {
            label: (
              <div className="flex items-center gap-2">
                <NodeIcon className="w-4 h-4 text-slate-500" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-left text-xs font-semibold text-slate-900">{node.data.label}</span>
                  {node.type === 'topic' || node.type === 'subtopic' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                      <StatusIcon className="w-3 h-3" />
                      {statusLabel[nodeStatus as LearningProgressStatus]}
                    </span>
                  ) : null}
                </div>
              </div>
            ),
          },
          draggable: false,
          selectable: true,
          style: {
            borderRadius: 18,
            border: 'none',
            background: node.type === 'discipline' ? '#e2e8f0' : '#f8fafc',
            color: '#0f172a',
            width: node.type === 'discipline' ? 220 : node.type === 'area' ? 210 : 240,
            boxShadow:
              node.type === 'topic' || node.type === 'subtopic'
                ? `inset 0 0 0 1px rgba(148,163,184,0.12), 0 18px 40px rgba(15,23,42,0.08), 0 0 0 2px ${statusColorHex[nodeStatus as LearningProgressStatus]}22`
                : 'inset 0 0 0 1px rgba(148,163,184,0.12), 0 14px 32px rgba(15,23,42,0.06)',
          },
        });
      });
    });

    const edges: Edge[] = graphPayload.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: edge.type === 'related',
      style: {
        stroke: edge.type === 'prerequisite' ? '#64748b' : edge.type === 'related' ? '#c084fc' : '#cbd5e1',
        strokeWidth: edge.type === 'hierarchy' ? 1.2 : 1.8,
        strokeDasharray: edge.type === 'related' ? '4 4' : undefined,
      },
    }));

    return { nodes, edges };
  }, [graphPayload]);

  const handleGraphNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const normalizedId = node.id.startsWith('topic:') ? node.id.replace('topic:', '') : node.id;
      const linkedTopic = topics.find((topic) => topic.id === normalizedId);
      if (!linkedTopic) {
        return;
      }

      void handleAdvanceTopic(linkedTopic);
    },
    [topics, handleAdvanceTopic],
  );
  const contextProgressLabel = totalCompletedTopics > 0
    ? `${totalCompletedTopics}/${totalPlannedTopics} concluidos`
    : 'Voce ainda nao comecou';
  const contextStageTitle = featuredStageTopicMeta?.stageTitle || 'Sem frente definida ainda';
  const contextStepTitle = nextTopic?.topic_nome || featuredStageTopicMeta?.topicTitle || selectedDiscipline?.nome || 'Continue seu estudo';
  const contextDescription = nextTopic
    ? `${nextTopic.discipline_nome} - dificuldade ${nextTopic.difficulty} - score IA ${nextTopic.score}`
    : selectedDisciplineSummary;

  return (
    <section className="rounded-[30px] bg-white/90 p-5 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-sm dark:bg-slate-950/75 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.9)] sm:p-7">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-500" />
            Continue seu estudo
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Menos ruido, mais direcao. Primeiro veja o proximo passo, depois abra a exploracao completa.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <select
          value={selectedDisciplineId}
          onChange={(event) => {
            const nextDisciplineId = event.target.value;
            const nextDiscipline = allDisciplineOptions.find((discipline) => discipline.id === nextDisciplineId) || null;
            const nextTrack = nextDiscipline && !nextDiscipline.id.startsWith('context:')
              ? getDisciplineTrack(nextDiscipline)
              : null;

            setSelectedDisciplineId(nextDisciplineId);
            if (nextTrack && nextTrack !== trackMode) {
              setTrackMode(nextTrack);
            }
          }}
          className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:bg-slate-900"
        >
          {allDisciplineOptions.length === 0 ? (
            <option value="">Escolha uma disciplina</option>
          ) : (
            allDisciplineOptions.map((discipline) => (
              <option key={discipline.id} value={discipline.id}>
                {discipline.nome}
              </option>
            ))
          )}
        </select>

        <div className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-900/80">
          {([
            { id: 'enem', label: 'ENEM' },
            { id: 'concurso', label: 'Concurso' },
          ] as const).map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => setTrackMode(track.id)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                trackMode === track.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {track.label}
            </button>
          ))}
        </div>

        <div className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-900/80">
          {([
            { id: 'simple', label: 'Simples' },
            { id: 'advanced', label: 'Avancado' },
          ] as const).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setLearningMode(mode.id)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                learningMode === mode.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[30px] border border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.94),rgba(248,250,252,0.88)_44%,rgba(241,245,249,0.7)_100%)] p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)] dark:border-white/8 dark:bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),rgba(15,23,42,0.92)_28%,rgba(2,6,23,0.98)_100%)] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-[1.75rem] font-semibold tracking-tight text-slate-950 dark:text-white">
              {selectedDiscipline?.nome || 'Escolha uma disciplina'}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-200">{contextStageTitle}</span>
              <span className="text-slate-300 dark:text-white/15">·</span>
              <span>Proximo passo: {contextStepTitle}</span>
              {learningMode === 'advanced' ? (
                <>
                  <span className="text-slate-300 dark:text-white/15">·</span>
                  <span>{contextProgressLabel}</span>
                </>
              ) : null}
            </div>

            {learningMode === 'advanced' ? (
              <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">{contextDescription}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void handleContinue();
              }}
              disabled={!supabaseUserId || isLoadingMap}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              <ArrowRightCircle className="h-4 w-4" />
              Continuar
            </button>

            {learningMode === 'simple' ? (
              <button
                type="button"
                onClick={() => {
                  setLearningMode('advanced');
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
              >
                Ver mapa completo
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void handleRecommend();
                  }}
                  disabled={!supabaseUserId || isLoadingNextTopic}
                  className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
                >
                  {isLoadingNextTopic ? 'Calculando...' : 'Atualizar passo'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLearningMode('simple');
                  }}
                  className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
                >
                  Ir para o ponto atual
                </button>
              </>
            )}
          </div>
        </div>

        {nextTopicError && <p className="mt-4 text-xs text-rose-600 dark:text-rose-400">{nextTopicError}</p>}
      </div>

      {learningMode === 'simple' && (
        <div className="mt-6 space-y-4">
          <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),rgba(248,250,252,0.88)_48%,rgba(241,245,249,0.72)_100%)] p-4 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.4)] dark:border-white/8 dark:bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.16),rgba(15,23,42,0.92)_26%,rgba(2,6,23,0.96)_100%)] sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-white/8">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Seu caminho agora</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleRecommend();
                }}
                disabled={!supabaseUserId || isLoadingNextTopic}
                className="rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white/70 hover:text-slate-900 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
              >
                {isLoadingNextTopic ? 'Calculando...' : 'Atualizar passo'}
              </button>
            </div>

            <div className="relative mt-6 pl-10 sm:pl-12">
              <div className="absolute bottom-4 left-[15px] top-3 w-px bg-gradient-to-b from-blue-200/80 via-slate-200/80 to-slate-200/10 dark:from-blue-400/40 dark:via-white/12 dark:to-white/5 sm:left-[19px]" />
              <div className="space-y-3">
                {simpleTimelineItems.map((item) => {
                  const isUpdating = item.matched ? updatingTopicId === item.matched.id : false;
                  const isCompletedStep = item.status === 'completed' || item.status === 'review';
                  const isDeferredStep = !item.isFeatured && !isCompletedStep;
                  const stepLabel = item.isFeatured ? 'Agora' : isCompletedStep ? 'Feito' : 'Depois';
                  const statusText = item.isFeatured
                    ? 'Agora'
                    : item.status === 'studying'
                      ? 'Em andamento'
                      : item.status === 'locked'
                        ? 'Depois'
                        : statusLabel[item.status];
                  const actionLabel = item.isFeatured && item.status === 'locked'
                    ? 'Comecar'
                    : item.isFeatured && (item.status === 'available' || item.status === 'studying')
                      ? 'Continuar'
                      : isCompletedStep
                        ? 'Revisar'
                        : `Avancar`;

                  return (
                    <div key={item.key} className={cn('relative', item.isFirstInStage ? 'pt-4 first:pt-0' : '')}>
                      <div
                        className={cn(
                          'absolute left-[-25px] top-5 h-4 w-4 rounded-full ring-4 ring-slate-100 dark:ring-slate-950 sm:left-[-29px]',
                          item.isFeatured
                            ? 'bg-blue-400 shadow-[0_0_0_6px_rgba(59,130,246,0.14)]'
                            : isCompletedStep
                              ? 'bg-emerald-400'
                              : 'bg-slate-300 dark:bg-slate-700',
                        )}
                      />

                      {item.isFirstInStage ? (
                        <div className="mb-4 flex items-center gap-2 pl-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          <span className={`h-2 w-2 rounded-full ${toneAccentStyle[item.stageTone]}`} />
                          <span>{item.stageTitle}</span>
                          {item.stageSummary ? <span className="text-slate-400 dark:text-slate-500">{item.stageSummary}</span> : null}
                        </div>
                      ) : null}

                      <div
                        className={cn(
                          'rounded-[24px] transition',
                          item.isFeatured
                            ? 'border border-blue-500/30 bg-blue-950/72 px-5 py-5 shadow-[0_18px_50px_-30px_rgba(37,99,235,0.75)]'
                            : 'border border-transparent bg-white/35 px-4 py-3.5 hover:bg-white/60 dark:bg-white/[0.025] dark:hover:bg-white/[0.045]',
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={cn(
                                  'text-[11px] font-semibold tracking-[0.14em]',
                                  item.isFeatured ? 'text-blue-100/80' : 'text-slate-400 dark:text-slate-500',
                                )}
                              >
                                {stepLabel}
                              </p>
                              {item.isFeatured ? null : isDeferredStep ? (
                                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                              ) : null}
                            </div>
                            <p
                              className={cn(
                                'mt-1 font-semibold tracking-tight',
                                item.isFeatured
                                  ? 'text-xl text-white'
                                  : 'text-[15px] text-slate-900 dark:text-slate-100',
                              )}
                            >
                              {item.topicTitle}
                            </p>
                            {item.isFeatured ? (
                              <p className="mt-2 text-sm text-blue-100/75">Continue daqui.</p>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 items-center gap-2 pt-1">
                            {item.status === 'locked' && !item.isFeatured ? (
                              <Lock className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                            ) : (
                              React.createElement(statusIconByStatus[item.status], {
                                className: cn(
                                  'h-4 w-4',
                                  item.isFeatured
                                    ? 'text-blue-200'
                                    : isCompletedStep
                                      ? 'text-emerald-500'
                                      : 'text-slate-400 dark:text-slate-500',
                                ),
                              })
                            )}
                            <span
                              className={cn(
                                'text-[11px] font-medium',
                                item.isFeatured ? 'text-blue-100/75' : 'text-slate-400 dark:text-slate-500',
                              )}
                            >
                              {statusText}
                            </span>
                          </div>
                        </div>

                        {item.matched ? (
                          <div className="mt-3 flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                void handleAdvanceTopic(item.matched!);
                              }}
                              disabled={!supabaseUserId || isUpdating}
                              className={cn(
                                'shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50',
                                item.isFeatured
                                  ? 'bg-white/10 text-blue-100 hover:bg-white/15 hover:text-white'
                                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/90 hover:text-slate-900 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white',
                              )}
                            >
                              {isUpdating
                                ? 'Atualizando...'
                                : actionLabel}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-slate-50/80 p-4 dark:bg-slate-900/60">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-[0.12em]">Como a IA decide o proximo topico</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>1. Verifica prerequisitos concluidos.</li>
              <li>2. Prioriza topicos disponiveis com maior impacto.</li>
              <li>3. Ajusta pela dificuldade e progresso recente.</li>
            </ul>
          </div>
        </div>
      )}

      {learningMode === 'advanced' && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.35)] dark:border-white/8 dark:bg-slate-950/70">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  <Eye className="h-3.5 w-3.5" />
                  Visao do mapa
                </p>
                <div className="mt-3 inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-900/80">
                  {([
                    { id: 'graph', label: 'Skill Tree' },
                    { id: 'list', label: 'Capitulos' },
                  ] as const).map((view) => (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => setAdvancedViewMode(view.id)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        advancedViewMode === view.id
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 rounded-[24px] border border-blue-500/20 bg-blue-950/70 p-4 text-white shadow-[0_18px_50px_-32px_rgba(37,99,235,0.7)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100/70">Ponto atual</p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-white">{contextStepTitle}</p>
                  <p className="mt-1 text-sm text-blue-100/75">{contextStageTitle}</p>
                  <p className="mt-3 text-sm text-blue-100/70">{contextDescription}</p>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Capitulos</p>
                  {advancedStageSections.map((section) => (
                    <div
                      key={section.id}
                      className={cn(
                        'rounded-2xl border px-4 py-3',
                        section.hasFeatured
                          ? 'border-blue-500/20 bg-blue-50/80 dark:border-blue-500/25 dark:bg-blue-500/10'
                          : 'border-transparent bg-white/60 dark:bg-white/[0.03]',
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${toneAccentStyle[section.tone]}`} />
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{section.title}</p>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{section.summaryLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {mapError && <p className="text-xs text-rose-600 dark:text-rose-400">{mapError}</p>}

              {isLoadingMap ? (
                <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 text-sm text-slate-500 dark:border-white/8 dark:bg-slate-950/70 dark:text-slate-400">
                  Carregando topicos e progresso...
                </div>
              ) : topics.length === 0 ? (
                <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 text-sm text-slate-500 dark:border-white/8 dark:bg-slate-950/70 dark:text-slate-400">
                  Sem topicos para a disciplina selecionada.
                </div>
              ) : advancedViewMode === 'graph' ? (
                <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.35)] dark:border-white/8 dark:bg-slate-950/70">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-white/8">
                    <div>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Mapa completo da disciplina</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Clique em um topico para avancar e veja os blocos da disciplina como um mapa navegavel.
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {isAutoUnlocking ? 'Desbloqueio automatico em andamento...' : 'Mesmo contexto do modo simples'}
                    </span>
                  </div>

                  <div className="mt-4 h-[520px] w-full overflow-hidden rounded-[24px] bg-slate-100/90 dark:bg-slate-950/85">
                    <ReactFlow
                      nodes={graphData.nodes}
                      edges={graphData.edges}
                      fitView
                      fitViewOptions={{ padding: 0.2 }}
                      nodesConnectable={false}
                      nodesDraggable={false}
                      onNodeClick={handleGraphNodeClick}
                    >
                      <MiniMap pannable zoomable />
                      <Controls showInteractive={false} />
                      <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
                    </ReactFlow>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {advancedStageSections.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.35)] dark:border-white/8 dark:bg-slate-950/70"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-white/8">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`h-2.5 w-2.5 rounded-full ${toneAccentStyle[section.tone]}`} />
                          <div>
                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{section.title}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{section.summaryLabel}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {section.totalCount} passos
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {section.topics.map((item) => {
                          const isUpdating = item.matched ? updatingTopicId === item.matched.id : false;
                          const isCompletedStep = item.status === 'completed' || item.status === 'review';
                          const isUpcomingStep = !item.isFeatured && !isCompletedStep;
                          const actionLabel = item.isFeatured && item.status === 'locked'
                            ? 'Comecar'
                            : item.isFeatured && (item.status === 'available' || item.status === 'studying')
                              ? 'Continuar'
                              : isCompletedStep
                                ? 'Revisar'
                                : 'Avancar';

                          return (
                            <div
                              key={item.key}
                              className={cn(
                                'rounded-2xl border px-4 py-3',
                                item.isFeatured
                                  ? 'border-blue-500/25 bg-blue-950/70 text-white shadow-[0_18px_50px_-34px_rgba(37,99,235,0.75)]'
                                  : 'border-transparent bg-slate-100/80 dark:bg-white/[0.03]',
                              )}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        'text-[11px] font-semibold tracking-[0.14em]',
                                        item.isFeatured ? 'text-blue-100/75' : 'text-slate-400 dark:text-slate-500',
                                      )}
                                    >
                                      {item.isFeatured ? 'Agora' : isCompletedStep ? 'Feito' : 'Depois'}
                                    </span>
                                  </div>
                                  <p
                                    className={cn(
                                      'mt-1 font-semibold tracking-tight',
                                      item.isFeatured ? 'text-lg text-white' : 'text-sm text-slate-900 dark:text-slate-100',
                                    )}
                                  >
                                    {item.topicTitle}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                  {item.status === 'locked' && !item.isFeatured ? (
                                    <Lock className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                                  ) : (
                                    React.createElement(statusIconByStatus[item.status], {
                                      className: cn(
                                        'h-4 w-4',
                                        item.isFeatured
                                          ? 'text-blue-200'
                                          : isCompletedStep
                                            ? 'text-emerald-500'
                                            : 'text-slate-400 dark:text-slate-500',
                                      ),
                                    })
                                  )}
                                  <span
                                    className={cn(
                                      'text-[11px] font-medium',
                                      item.isFeatured ? 'text-blue-100/75' : 'text-slate-400 dark:text-slate-500',
                                    )}
                                  >
                                    {item.isFeatured ? 'Atual' : isUpcomingStep ? 'Depois' : statusLabel[item.status]}
                                  </span>
                                </div>
                              </div>

                              {item.matched ? (
                                <div className="mt-3 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleAdvanceTopic(item.matched!);
                                    }}
                                    disabled={!supabaseUserId || isUpdating}
                                    className={cn(
                                      'rounded-xl px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50',
                                      item.isFeatured
                                        ? 'bg-white/10 text-blue-100 hover:bg-white/15 hover:text-white'
                                        : 'bg-white/90 text-slate-700 hover:bg-white dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.1]',
                                    )}
                                  >
                                    {isUpdating ? 'Atualizando...' : actionLabel}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.35)] dark:border-white/8 dark:bg-slate-950/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                    Mapa de referencia: {selectedReferenceTree?.name || 'Disciplina nao mapeada'}
                  </p>
                  <div className="mt-4">
                    {selectedReferenceTree ? (
                      <KnowledgeNodeRow node={selectedReferenceTree} level={0} />
                    ) : (
                      <div className="rounded-[24px] bg-slate-50/80 p-4 dark:bg-slate-900/60">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Ainda nao existe blueprint detalhado para esta disciplina.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.35)] dark:border-white/8 dark:bg-slate-950/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">Raizes globais mapeadas</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {GLOBAL_KNOWLEDGE_ROOTS.map((root) => (
                      <span
                        key={root.id}
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-white/[0.05] dark:text-slate-300"
                        title={root.id}
                      >
                        {rootLabelById[root.id] || root.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!supabaseUserId && (
        <div className="mt-6 rounded-[24px] bg-amber-50/90 p-4 dark:bg-amber-500/10">
          <p className="text-xs text-amber-700 dark:text-amber-300 inline-flex items-center gap-2">
            <Brain className="w-3.5 h-3.5" />
            Faca login para recomendacao personalizada e salvamento de progresso no grafo.
          </p>
        </div>
      )}
    </section>
  );
};

export default KnowledgeGenealogyTree;
