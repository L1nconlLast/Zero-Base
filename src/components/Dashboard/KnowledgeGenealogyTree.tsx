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
}

type LearningMode = 'simple' | 'advanced';
type TrackMode = 'enem' | 'concurso';
type AdvancedViewMode = 'list' | 'graph';

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
  green: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20',
  yellow: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20',
  orange: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20',
  blue: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
};

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
const statusColorHex: Record<LearningProgressStatus, string> = {
  locked: '#94a3b8',
  available: '#3b82f6',
  studying: '#8b5cf6',
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

const KnowledgeNodeRow: React.FC<{ node: KnowledgeNode; level: number }> = ({ node, level }) => {
  const [open, setOpen] = React.useState(level < 2);
  const hasChildren = Boolean(node.children?.length);
  const prerequisites = parentByChild[node.id] || [];

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2" style={{ marginLeft: `${level * 14}px` }}>
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button type="button" onClick={() => setOpen((prev) => !prev)} className="text-slate-500" aria-label={open ? 'Recolher ramo' : 'Expandir ramo'}>
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
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-500 dark:text-slate-400">Prerequisitos:</span>
            {prerequisites.map((dependency) => (
              <span key={dependency} className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
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

  const trackDisciplines = React.useMemo(
    () => disciplines.filter((discipline) => getDisciplineTrack(discipline) === trackMode),
    [disciplines, trackMode],
  );

  React.useEffect(() => {
    if (trackDisciplines.length === 0) {
      setSelectedDisciplineId('');
      return;
    }

    if (!trackDisciplines.some((item) => item.id === selectedDisciplineId)) {
      setSelectedDisciplineId(trackDisciplines[0].id);
    }
  }, [trackDisciplines, selectedDisciplineId]);

  React.useEffect(() => {
    let active = true;

    const loadMapData = async () => {
      setIsLoadingMap(true);
      setMapError(null);

      try {
        const [topicRows, edgeRows, graphRows, progressRows] = await Promise.all([
          learningGraphApiService.listTopics(selectedDisciplineId || undefined),
          learningGraphApiService.listPrerequisiteEdges(selectedDisciplineId || undefined),
          learningGraphApiService.getSkillTree({ disciplineId: selectedDisciplineId || undefined, track: trackMode, limit: 1200 }),
          supabaseUserId ? learningGraphApiService.getUserProgress(selectedDisciplineId || undefined) : Promise.resolve([]),
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
  }, [selectedDisciplineId, supabaseUserId, trackMode]);

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
      const recommended = await learningGraphApiService.getNextTopic(selectedDisciplineId || undefined);
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

  const displayedTopics = React.useMemo(() => topics.slice(0, 16), [topics]);
  const stages = TRACK_STAGE_MAP[trackMode];
  const selectedDiscipline = React.useMemo(
    () => trackDisciplines.find((discipline) => discipline.id === selectedDisciplineId),
    [trackDisciplines, selectedDisciplineId],
  );
  const selectedReferenceTree = React.useMemo(() => {
    if (selectedDiscipline?.nome) {
      return getKnowledgeTreeByDiscipline(selectedDiscipline.nome);
    }

    return trackMode === 'concurso'
      ? getKnowledgeTreeByDiscipline('direito_constitucional')
      : getKnowledgeTreeByDiscipline('portugues');
  }, [selectedDiscipline, trackMode]);

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
            borderRadius: 12,
            border: `1px solid ${node.type === 'topic' || node.type === 'subtopic' ? statusColorHex[nodeStatus as LearningProgressStatus] : '#cbd5e1'}`,
            background: '#ffffff',
            color: '#0f172a',
            width: node.type === 'discipline' ? 220 : node.type === 'area' ? 210 : 240,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
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

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-500" />
            Arvore do conhecimento
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Interface em trilha para aluno e mapa completo para exploracao avancada.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-2">
        <select
          value={selectedDisciplineId}
          onChange={(event) => setSelectedDisciplineId(event.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
        >
          {trackDisciplines.length === 0 ? (
            <option value="">Sem disciplina mapeada</option>
          ) : (
            trackDisciplines.map((discipline) => (
              <option key={discipline.id} value={discipline.id}>
                {discipline.nome}
              </option>
            ))
          )}
        </select>

        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800">
          {([
            { id: 'enem', label: 'ENEM' },
            { id: 'concurso', label: 'Concurso' },
          ] as const).map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => setTrackMode(track.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${trackMode === track.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}
              style={trackMode === track.id ? { backgroundColor: 'var(--color-primary)' } : undefined}
            >
              {track.label}
            </button>
          ))}
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800">
          {([
            { id: 'simple', label: 'Simples' },
            { id: 'advanced', label: 'Avancado' },
          ] as const).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setLearningMode(mode.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${learningMode === mode.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}
              style={learningMode === mode.id ? { backgroundColor: 'var(--color-primary)' } : undefined}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-indigo-700 dark:text-indigo-300">Continuar estudo</p>
        <p className="text-base font-bold text-indigo-900 dark:text-indigo-100 mt-1">
          {nextTopic?.topic_nome || 'Proximo topico recomendado'}
        </p>
        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
          {nextTopic
            ? `${nextTopic.discipline_nome} • dificuldade ${nextTopic.difficulty} • score IA ${nextTopic.score}`
            : 'Clique para calcular recomendacao personalizada com IA.'}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void handleRecommend();
            }}
            disabled={!supabaseUserId || isLoadingNextTopic}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {isLoadingNextTopic ? 'Calculando...' : 'Proximo topico recomendado'}
          </button>

          <button
            type="button"
            onClick={() => {
              void handleContinue();
            }}
            disabled={!supabaseUserId || isLoadingMap}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-emerald-300 dark:border-emerald-700 bg-white/90 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 disabled:opacity-50"
          >
            <ArrowRightCircle className="w-3.5 h-3.5" />
            Continuar de onde parei
          </button>
        </div>

        {nextTopicError && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{nextTopicError}</p>}
      </div>

      {learningMode === 'simple' && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Trilha atual ({trackMode === 'enem' ? 'ENEM' : 'Concurso'})</p>
          </div>

          {stages.map((stage) => (
            <div key={stage.id} className={`rounded-xl border p-3 ${toneStyle[stage.tone]}`}>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-2">
                <Compass className="w-4 h-4" />
                {stage.title}
              </p>

              <div className="mt-2 space-y-2">
                {stage.topics.map((stageTopic) => {
                  const matched = findTopicByHint(stageTopic.topicHints);
                  const status = matched ? getTopicStatus(matched.id) : 'locked';
                  const isUpdating = matched ? updatingTopicId === matched.id : false;

                  return (
                    <div key={stageTopic.title} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5">
                      <div className="flex items-center gap-2">
                        {React.createElement(statusIconByStatus[status], { className: 'w-4 h-4 text-slate-500' })}
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{stageTopic.title}</p>
                        <span className={`ml-auto text-[11px] font-semibold px-2 py-1 rounded-full ${statusStyle[status]}`}>{statusLabel[status]}</span>
                      </div>

                      {matched && (
                        <button
                          type="button"
                          onClick={() => {
                            void handleAdvanceTopic(matched);
                          }}
                          disabled={!supabaseUserId || isUpdating}
                          className="mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-50"
                        >
                          {isUpdating ? 'Atualizando...' : `Avancar para ${statusLabel[getNextStatus(status)]}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-[0.12em]">Como a IA decide o proximo topico</p>
            <ul className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <li>1. Verifica prerequisitos concluidos.</li>
              <li>2. Prioriza topicos disponiveis com maior impacto.</li>
              <li>3. Ajusta pela dificuldade e progresso recente.</li>
            </ul>
          </div>
        </div>
      )}

      {learningMode === 'advanced' && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Mapa completo (modo avancado)</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">{isAutoUnlocking ? 'Desbloqueio automatico em andamento...' : 'Escala para 2000+ topicos por filtros'}</span>
            </div>

            <div className="mb-3 inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-900">
              {([
                { id: 'graph', label: 'Skill Tree' },
                { id: 'list', label: 'Lista' },
              ] as const).map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setAdvancedViewMode(view.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold ${advancedViewMode === view.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  style={advancedViewMode === view.id ? { backgroundColor: 'var(--color-primary)' } : undefined}
                >
                  {view.label}
                </button>
              ))}
            </div>

            <div className="mb-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2 inline-flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />Linha do tempo de progressao</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {statusFlow.map((status, index) => (
                  <React.Fragment key={status}>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${statusStyle[status]} inline-flex items-center gap-1`}>
                      {React.createElement(statusIconByStatus[status], { className: 'w-3 h-3' })}
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
            ) : topics.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sem topicos para a disciplina selecionada.</p>
            ) : advancedViewMode === 'graph' ? (
              <div className="h-[460px] w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
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
            ) : (
              <div className="space-y-2">
                {displayedTopics.map((topic) => {
                  const status = getTopicStatus(topic.id);
                  const nextStatus = getNextStatus(status);
                  const isUpdating = updatingTopicId === topic.id;

                  return (
                    <div key={topic.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{topic.nome}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Nivel: {topic.nivel_dificuldade || 'intermediario'}</p>
                        </div>

                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${statusStyle[status]}`}>{statusLabel[status]}</span>
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

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-[0.12em]">
              Mapa de referencia: {selectedReferenceTree?.name || 'Disciplina nao mapeada'}
            </p>
            {selectedReferenceTree ? (
              <KnowledgeNodeRow node={selectedReferenceTree} level={0} />
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">Ainda nao existe blueprint detalhado para esta disciplina.</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-3">
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
        </div>
      )}

      {!supabaseUserId && (
        <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
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
