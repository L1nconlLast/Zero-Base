import React from 'react';
import { Brain, ChevronDown, ChevronRight, Sparkles, GitBranch, ShieldCheck } from 'lucide-react';
import {
  GLOBAL_KNOWLEDGE_ROOTS,
  KNOWLEDGE_GRAPH_EDGES,
  PORTUGUESE_KNOWLEDGE_TREE,
  type KnowledgeNode,
} from '../../data/knowledgeTreeBlueprint';
import { learningGraphApiService, type LearningGraphDiscipline, type LearningGraphNextTopic } from '../../services/learningGraphApi.service';

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
  const [nextTopic, setNextTopic] = React.useState<LearningGraphNextTopic | null>(null);
  const [isLoadingNextTopic, setIsLoadingNextTopic] = React.useState(false);
  const [nextTopicError, setNextTopicError] = React.useState<string | null>(null);

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
