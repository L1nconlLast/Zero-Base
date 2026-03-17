import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ModalityName = 'ENEM' | 'CONCURSOS';
type EdgeType = 'prerequisite' | 'related';
type NodeType = 'topic' | 'subtopic';

interface DisciplineSeed {
  id: string;
  nome: string;
  modalidade: ModalityName;
  icone: string;
  cor_hex: string;
  ordem: number;
  targetCount: number;
  areas: string[];
}

interface TopicSeed {
  id: string;
  name: string;
  disciplina: string;
  modalidade: ModalityName;
  area: string;
  subarea: string;
  tipo_no: NodeType;
  nivel: number;
  frequencia_enem: number;
  frequencia_concurso: number;
  tempo_estimado: number;
  descricao: string;
  tags: string[];
}

interface EdgeSeed {
  source: string;
  target: string;
  type: EdgeType;
}

interface Manifest {
  generatedAt: string;
  disciplineCount: number;
  topicCount: number;
  edgeCount: number;
  countsByDiscipline: Record<string, number>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const seedRoot = path.join(rootDir, 'supabase', 'seed', 'knowledge-graph');
const coreDir = path.join(seedRoot, 'core');
const generatedDir = path.join(seedRoot, 'generated');

const slugify = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const sqlEscape = (value: string): string => value.replace(/'/g, "''");

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function buildGeneratedTopics(
  disciplines: DisciplineSeed[],
  coreTopics: TopicSeed[],
): TopicSeed[] {
  const generatedTopics = [...coreTopics];
  const existingIds = new Set(coreTopics.map((topic) => topic.id));
  const countsByDiscipline = new Map<string, number>();

  coreTopics.forEach((topic) => {
    countsByDiscipline.set(topic.disciplina, (countsByDiscipline.get(topic.disciplina) || 0) + 1);
  });

  disciplines.forEach((discipline) => {
    const currentCount = countsByDiscipline.get(discipline.id) || 0;
    const missing = Math.max(0, discipline.targetCount - currentCount);

    for (let index = 0; index < missing; index += 1) {
      const ordinal = currentCount + index + 1;
      const area = discipline.areas[index % discipline.areas.length] || 'Geral';
      const areaSlug = slugify(area);
      const modulo = Math.floor(index / Math.max(1, discipline.areas.length * 4)) + 1;
      const nivel = (index % 5) + 1;
      const tipo_no: NodeType = index % 7 === 0 ? 'subtopic' : 'topic';
      const baseFreqEnem = discipline.modalidade === 'ENEM' ? 0.92 : 0.22;
      const baseFreqConcurso = discipline.modalidade === 'CONCURSOS' ? 0.94 : 0.48;
      const freqWave = (index % 9) * 0.025;
      const generatedId = `${discipline.id}_${areaSlug}_${String(ordinal).padStart(4, '0')}`;

      if (existingIds.has(generatedId)) {
        continue;
      }

      existingIds.add(generatedId);
      generatedTopics.push({
        id: generatedId,
        name: `${area} - Topico ${String(ordinal).padStart(4, '0')}`,
        disciplina: discipline.id,
        modalidade: discipline.modalidade,
        area,
        subarea: `Modulo ${modulo}`,
        tipo_no,
        nivel,
        frequencia_enem: Number(clamp(baseFreqEnem - freqWave, 0.05, 0.99).toFixed(2)),
        frequencia_concurso: Number(clamp(baseFreqConcurso - (freqWave / 1.5), 0.05, 0.99).toFixed(2)),
        tempo_estimado: 30 + ((index % 6) * 10),
        descricao: `Topico expandido automaticamente para ${discipline.nome}, area ${area}, modulo ${modulo}.`,
        tags: [discipline.id, areaSlug, `nivel_${nivel}`, tipo_no],
      });
    }
  });

  return generatedTopics;
}

function buildGeneratedEdges(topics: TopicSeed[], coreEdges: EdgeSeed[]): EdgeSeed[] {
  const edgeMap = new Map<string, EdgeSeed>();
  const topicsByDiscipline = new Map<string, TopicSeed[]>();
  const topicsByArea = new Map<string, TopicSeed[]>();

  coreEdges.forEach((edge) => {
    edgeMap.set(`${edge.type}:${edge.source}->${edge.target}`, edge);
  });

  topics.forEach((topic) => {
    const disciplineList = topicsByDiscipline.get(topic.disciplina) || [];
    disciplineList.push(topic);
    topicsByDiscipline.set(topic.disciplina, disciplineList);

    const areaKey = `${topic.disciplina}:${topic.area}`;
    const areaList = topicsByArea.get(areaKey) || [];
    areaList.push(topic);
    topicsByArea.set(areaKey, areaList);
  });

  topicsByDiscipline.forEach((disciplineTopics) => {
    disciplineTopics.sort((left, right) => left.id.localeCompare(right.id));

    for (let index = 1; index < disciplineTopics.length; index += 1) {
      const previous = disciplineTopics[index - 1];
      const current = disciplineTopics[index];
      const edge: EdgeSeed = {
        source: previous.id,
        target: current.id,
        type: 'prerequisite',
      };
      edgeMap.set(`${edge.type}:${edge.source}->${edge.target}`, edge);
    }
  });

  topicsByArea.forEach((areaTopics) => {
    areaTopics.sort((left, right) => left.id.localeCompare(right.id));

    for (let index = 1; index < areaTopics.length; index += 2) {
      const source = areaTopics[index - 1];
      const target = areaTopics[index];
      const edge: EdgeSeed = {
        source: source.id,
        target: target.id,
        type: 'related',
      };
      edgeMap.set(`${edge.type}:${edge.source}->${edge.target}`, edge);
    }
  });

  return [...edgeMap.values()];
}

function buildSeedSql(
  disciplines: DisciplineSeed[],
  topics: TopicSeed[],
  edges: EdgeSeed[],
): string {
  const disciplineValues = disciplines.map((discipline) => `  ('${sqlEscape(discipline.modalidade)}', '${sqlEscape(discipline.nome)}', '${sqlEscape(discipline.icone)}', '${sqlEscape(discipline.cor_hex)}', ${discipline.ordem})`).join(',\n');

  const topicValues = topics.map((topic) => {
    const difficulty = topic.nivel >= 4 ? 'avancado' : topic.nivel >= 2 ? 'intermediario' : 'iniciante';
    return `  ('${sqlEscape(topic.disciplina)}', '${sqlEscape(topic.name)}', '${sqlEscape(topic.descricao)}', '${sqlEscape(topic.area)}', '${sqlEscape(topic.subarea)}', '${sqlEscape(topic.tipo_no)}', '${difficulty}', ${topic.tempo_estimado}, ${topic.nivel}, ${topic.frequencia_enem}, ${topic.frequencia_concurso}, '${sqlEscape(topic.id)}')`;
  }).join(',\n');

  const edgeValues = edges.map((edge) => `  ('${sqlEscape(edge.source)}', '${sqlEscape(edge.target)}', '${sqlEscape(edge.type)}')`).join(',\n');

  return `-- ============================================================
-- Generated knowledge graph seed for Zero Base
-- Arquivo gerado automaticamente por scripts/generate-knowledge-graph-seed.ts
-- ============================================================

with disciplina_seed(modalidade_nome, disciplina_nome, icone, cor_hex, ordem) as (
values
${disciplineValues}
)
insert into public.disciplinas (modalidade_id, nome, icone, cor_hex, ordem)
select m.id, ds.disciplina_nome, ds.icone, ds.cor_hex, ds.ordem
from disciplina_seed ds
join public.modalidades m on m.nome = ds.modalidade_nome
on conflict (modalidade_id, nome) do update
set icone = excluded.icone,
    cor_hex = excluded.cor_hex,
    ordem = excluded.ordem,
    ativo = true;

with topic_seed(disciplina_slug, topic_name, descricao, area, subarea, tipo_no, nivel_dificuldade, tempo_estimado_min, dificuldade, frequencia_enem, frequencia_concursos, codigo) as (
values
${topicValues}
), discipline_map as (
  select lower(regexp_replace(d.nome, '[^a-zA-Z0-9]+', '_', 'g')) as disciplina_slug, d.id as disciplina_id
  from public.disciplinas d
)
insert into public.topicos (
  disciplina_id,
  nome,
  descricao,
  area,
  subarea,
  tipo_no,
  nivel_dificuldade,
  tempo_estimado_min,
  ordem,
  ativo
)
select
  dm.disciplina_id,
  ts.topic_name,
  ts.descricao,
  ts.area,
  ts.subarea,
  ts.tipo_no,
  ts.nivel_dificuldade,
  ts.tempo_estimado_min,
  row_number() over (partition by dm.disciplina_id order by ts.area, ts.topic_name),
  true
from topic_seed ts
join discipline_map dm on dm.disciplina_slug = ts.disciplina_slug
on conflict (disciplina_id, nome) do update
set descricao = excluded.descricao,
    area = excluded.area,
    subarea = excluded.subarea,
    tipo_no = excluded.tipo_no,
    nivel_dificuldade = excluded.nivel_dificuldade,
    tempo_estimado_min = excluded.tempo_estimado_min,
    ativo = true;

with topic_seed(disciplina_slug, topic_name, descricao, area, subarea, tipo_no, nivel_dificuldade, tempo_estimado_min, dificuldade, frequencia_enem, frequencia_concursos, codigo) as (
values
${topicValues}
), topic_map as (
  select
    lower(regexp_replace(d.nome, '[^a-zA-Z0-9]+', '_', 'g')) as disciplina_slug,
    t.nome as topic_name,
    t.id as topico_id
  from public.topicos t
  join public.disciplinas d on d.id = t.disciplina_id
)
insert into public.topico_dna (
  topico_id,
  codigo,
  dificuldade,
  frequencia_enem,
  frequencia_concursos,
  tempo_medio_aprendizado_min,
  relevancia_global
)
select
  tm.topico_id,
  ts.codigo,
  ts.dificuldade,
  ts.frequencia_enem * 100,
  ts.frequencia_concursos * 100,
  ts.tempo_estimado_min,
  round(((ts.frequencia_enem + ts.frequencia_concursos) / 2.0) * 100)
from topic_seed ts
join topic_map tm
  on tm.disciplina_slug = ts.disciplina_slug
 and tm.topic_name = ts.topic_name
on conflict (topico_id) do update
set codigo = excluded.codigo,
    dificuldade = excluded.dificuldade,
    frequencia_enem = excluded.frequencia_enem,
    frequencia_concursos = excluded.frequencia_concursos,
    tempo_medio_aprendizado_min = excluded.tempo_medio_aprendizado_min,
    relevancia_global = excluded.relevancia_global;

with edge_seed(source_codigo, target_codigo, tipo_relacao) as (
values
${edgeValues}
), topic_map as (
  select td.codigo, td.topico_id
  from public.topico_dna td
)
insert into public.topico_prerequisitos (topico_id, prerequisito_id, mastery_required)
select target_topic.topico_id, source_topic.topico_id, 70
from edge_seed es
join topic_map source_topic on source_topic.codigo = es.source_codigo
join topic_map target_topic on target_topic.codigo = es.target_codigo
where es.tipo_relacao = 'prerequisite'
on conflict (topico_id, prerequisito_id) do update
set mastery_required = excluded.mastery_required;

with edge_seed(source_codigo, target_codigo, tipo_relacao) as (
values
${edgeValues}
), topic_map as (
  select td.codigo, td.topico_id
  from public.topico_dna td
)
insert into public.topico_relacoes (source_topico_id, target_topico_id, tipo_relacao, peso)
select
  source_topic.topico_id,
  target_topic.topico_id,
  es.tipo_relacao,
  case when es.tipo_relacao = 'prerequisite' then 0.7 else 0.55 end
from edge_seed es
join topic_map source_topic on source_topic.codigo = es.source_codigo
join topic_map target_topic on target_topic.codigo = es.target_codigo
on conflict (source_topico_id, target_topico_id, tipo_relacao) do update
set peso = excluded.peso;
`;
}

async function main(): Promise<void> {
  await mkdir(generatedDir, { recursive: true });

  const disciplines = await readJsonFile<DisciplineSeed[]>(path.join(coreDir, 'disciplines.json'));
  const coreTopics = await readJsonFile<TopicSeed[]>(path.join(coreDir, 'topics.json'));
  const coreEdges = await readJsonFile<EdgeSeed[]>(path.join(coreDir, 'edges.json'));

  const topics = buildGeneratedTopics(disciplines, coreTopics);
  const edges = buildGeneratedEdges(topics, coreEdges);

  const countsByDiscipline = topics.reduce<Record<string, number>>((accumulator, topic) => {
    accumulator[topic.disciplina] = (accumulator[topic.disciplina] || 0) + 1;
    return accumulator;
  }, {});

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    disciplineCount: disciplines.length,
    topicCount: topics.length,
    edgeCount: edges.length,
    countsByDiscipline,
  };

  await Promise.all([
    writeFile(path.join(generatedDir, 'disciplines.generated.json'), `${JSON.stringify(disciplines, null, 2)}\n`, 'utf-8'),
    writeFile(path.join(generatedDir, 'topics.generated.json'), `${JSON.stringify(topics, null, 2)}\n`, 'utf-8'),
    writeFile(path.join(generatedDir, 'edges.generated.json'), `${JSON.stringify(edges, null, 2)}\n`, 'utf-8'),
    writeFile(path.join(generatedDir, 'manifest.generated.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8'),
    writeFile(path.join(generatedDir, 'knowledge_graph_seed.sql'), buildSeedSql(disciplines, topics, edges), 'utf-8'),
  ]);

  console.log(`Knowledge graph gerado com ${topics.length} topicos e ${edges.length} arestas.`);
}

void main();