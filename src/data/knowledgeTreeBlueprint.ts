export interface KnowledgeNode {
  id: string;
  name: string;
  kind: 'root' | 'area' | 'topic' | 'microtopic';
  children?: KnowledgeNode[];
}

const normalizeKnowledgeDisciplineSlug = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const createTree = (slug: string, name: string, sections: Array<{ area: string; topics: string[] }>): KnowledgeNode => ({
  id: `${slug}-root`,
  name,
  kind: 'root',
  children: sections.map((section, sectionIndex) => ({
    id: `${slug}-area-${sectionIndex + 1}`,
    name: section.area,
    kind: 'area',
    children: section.topics.map((topic, topicIndex) => ({
      id: `${slug}-topic-${sectionIndex + 1}-${topicIndex + 1}`,
      name: topic,
      kind: 'topic',
    })),
  })),
});

export const KNOWLEDGE_TREES_BY_DISCIPLINE: Record<string, KnowledgeNode> = {
  portugues: createTree('portugues', 'Portugues', [
    { area: 'Gramatica', topics: ['Morfologia', 'Sintaxe', 'Semantica'] },
    { area: 'Interpretacao', topics: ['Coesao e coerencia', 'Inferencia', 'Generos textuais'] },
    { area: 'Literatura', topics: ['Romantismo', 'Realismo', 'Modernismo'] },
  ]),
  matematica: createTree('matematica', 'Matematica', [
    { area: 'Aritmetica', topics: ['Operacoes basicas', 'Razoes e proporcoes', 'Porcentagem'] },
    { area: 'Algebra', topics: ['Equacoes', 'Sistemas lineares', 'Progressao aritmetica'] },
    { area: 'Funcoes', topics: ['Funcao afim', 'Funcao quadratica', 'Funcao exponencial'] },
  ]),
  fisica: createTree('fisica', 'Fisica', [
    { area: 'Mecanica', topics: ['Cinematica', 'Dinamica', 'Trabalho e energia'] },
    { area: 'Eletricidade', topics: ['Eletrostatica', 'Eletrodinamica', 'Circuitos'] },
    { area: 'Optica', topics: ['Espelhos', 'Lentes', 'Ondas eletromagneticas'] },
  ]),
  quimica: createTree('quimica', 'Quimica', [
    { area: 'Quimica geral', topics: ['Tabela periodica', 'Ligacoes quimicas', 'Estequiometria'] },
    { area: 'Fisico-quimica', topics: ['Termoquimica', 'Cinética quimica', 'Equilibrio quimico'] },
    { area: 'Quimica organica', topics: ['Funcoes organicas', 'Isomeria', 'Reacoes organicas'] },
  ]),
  biologia: createTree('biologia', 'Biologia', [
    { area: 'Citologia e genetica', topics: ['Citologia', 'Genetica basica', 'Biotecnologia'] },
    { area: 'Ecologia e evolucao', topics: ['Cadeias alimentares', 'Ciclos biogeoquimicos', 'Selecao natural'] },
    { area: 'Fisiologia humana', topics: ['Sistema digestorio', 'Sistema nervoso', 'Sistema endocrino'] },
  ]),
  historia: createTree('historia', 'Historia', [
    { area: 'Historia geral', topics: ['Revolucao Francesa', 'Revolucao Industrial', 'Guerra Fria'] },
    { area: 'Historia do Brasil', topics: ['Brasil Colonia', 'Brasil Imperio', 'Brasil Republica'] },
    { area: 'Historia politica', topics: ['Ditadura Militar', 'Redemocratizacao', 'Nova Republica'] },
  ]),
  geografia: createTree('geografia', 'Geografia', [
    { area: 'Geografia fisica', topics: ['Climatologia', 'Geomorfologia', 'Hidrografia'] },
    { area: 'Geopolitica', topics: ['Globalizacao', 'Blocos economicos', 'Conflitos territoriais'] },
    { area: 'Cartografia', topics: ['Escalas', 'Projecoes', 'Leitura de mapas'] },
  ]),
  filosofia: createTree('filosofia', 'Filosofia', [
    { area: 'Antiga', topics: ['Socrates', 'Platao', 'Aristoteles'] },
    { area: 'Moderna', topics: ['Racionalismo', 'Empirismo', 'Iluminismo'] },
    { area: 'Etica e politica', topics: ['Etica', 'Contratualismo', 'Cidadania'] },
  ]),
  sociologia: createTree('sociologia', 'Sociologia', [
    { area: 'Fundamentos', topics: ['Cultura', 'Socializacao', 'Estratificacao social'] },
    { area: 'Trabalho e poder', topics: ['Mundo do trabalho', 'Estado', 'Movimentos sociais'] },
    { area: 'Contemporanea', topics: ['Globalizacao social', 'Identidade', 'Midia e sociedade'] },
  ]),
  redacao: createTree('redacao', 'Redacao', [
    { area: 'Competencias ENEM', topics: ['Competencia 1', 'Competencia 2', 'Competencia 3'] },
    { area: 'Projeto de texto', topics: ['Tese e repertorio', 'Argumentacao', 'Coesao textual'] },
    { area: 'Fechamento', topics: ['Proposta de intervencao', 'Revisao final', 'Estrategia de prova'] },
  ]),
  ingles: createTree('ingles', 'Ingles', [
    { area: 'Reading', topics: ['Reading comprehension', 'Skimming e scanning', 'False cognates'] },
    { area: 'Vocabulary', topics: ['Phrasal verbs', 'Conectivos', 'Vocabulos tematicos'] },
    { area: 'Grammar', topics: ['Tempos verbais', 'Pronomes', 'Modal verbs'] },
  ]),
  atualidades: createTree('atualidades', 'Atualidades', [
    { area: 'Politica', topics: ['Politica nacional', 'Instituicoes', 'Democracia'] },
    { area: 'Economia e tecnologia', topics: ['Cenario economico', 'Transformacao digital', 'Trabalho e IA'] },
    { area: 'Sociedade e ambiente', topics: ['Mudancas climaticas', 'Geopolitica ambiental', 'Direitos humanos'] },
  ]),
  direito_constitucional: createTree('direito_constitucional', 'Direito Constitucional', [
    { area: 'Base constitucional', topics: ['Principios fundamentais', 'Direitos e garantias', 'Organizacao do Estado'] },
    { area: 'Poderes', topics: ['Poder Legislativo', 'Poder Executivo', 'Poder Judiciario'] },
    { area: 'Controle', topics: ['Controle de constitucionalidade', 'ACOes constitucionais', 'Jurisprudencia'] },
  ]),
  direito_administrativo: createTree('direito_administrativo', 'Direito Administrativo', [
    { area: 'Regime administrativo', topics: ['Atos administrativos', 'Poderes administrativos', 'Responsabilidade do Estado'] },
    { area: 'Contratacoes', topics: ['Licitacoes', 'Contratos administrativos', 'Nova lei de licitacoes'] },
    { area: 'Servicos e agentes', topics: ['Servicos publicos', 'Agentes publicos', 'Improbidade'] },
  ]),
  informatica: createTree('informatica', 'Informatica', [
    { area: 'Sistemas e office', topics: ['Windows e arquivos', 'Pacote Office', 'Navegadores'] },
    { area: 'Redes e internet', topics: ['Protocolos', 'Camadas de rede', 'Servicos web'] },
    { area: 'Seguranca', topics: ['Seguranca da informacao', 'Criptografia', 'Boas praticas'] },
  ]),
  raciocinio_logico: createTree('raciocinio_logico', 'Raciocinio Logico', [
    { area: 'Logica proposicional', topics: ['Proposicoes', 'Conectivos', 'Tabelas verdade'] },
    { area: 'Equivalencias', topics: ['Equivalencias logicas', 'Leis de De Morgan', 'Negacao de proposicoes'] },
    { area: 'Argumentacao', topics: ['Diagramas logicos', 'Silogismos', 'Combinatoria e probabilidade'] },
  ]),
};

export const PORTUGUESE_KNOWLEDGE_TREE: KnowledgeNode = KNOWLEDGE_TREES_BY_DISCIPLINE.portugues;

export const GLOBAL_KNOWLEDGE_ROOTS: Array<Pick<KnowledgeNode, 'id' | 'name' | 'kind'>> = [
  ...Object.entries(KNOWLEDGE_TREES_BY_DISCIPLINE).map(([slug, tree]) => ({
    id: `root-${slug}`,
    name: tree.name,
    kind: 'root' as const,
  })),
];

export const KNOWLEDGE_GRAPH_EDGES: Array<{ from: string; to: string }> = [
  { from: 'portugues-topic-1-1', to: 'portugues-topic-1-2' },
  { from: 'portugues-topic-2-1', to: 'redacao-topic-2-1' },
  { from: 'matematica-topic-1-1', to: 'matematica-topic-2-1' },
  { from: 'matematica-topic-2-1', to: 'matematica-topic-3-1' },
  { from: 'fisica-topic-1-1', to: 'fisica-topic-1-2' },
  { from: 'quimica-topic-1-1', to: 'quimica-topic-1-2' },
  { from: 'biologia-topic-1-1', to: 'biologia-topic-2-3' },
  { from: 'historia-topic-1-3', to: 'geografia-topic-2-1' },
  { from: 'filosofia-topic-3-1', to: 'sociologia-topic-1-1' },
  { from: 'raciocinio_logico-topic-1-1', to: 'raciocinio_logico-topic-1-3' },
  { from: 'direito_constitucional-topic-1-1', to: 'direito_constitucional-topic-1-2' },
  { from: 'direito_administrativo-topic-1-1', to: 'direito_administrativo-topic-2-1' },
  { from: 'informatica-topic-1-1', to: 'informatica-topic-3-1' },
];

export const getKnowledgeTreeByDiscipline = (disciplineNameOrSlug: string): KnowledgeNode | null => {
  const slug = normalizeKnowledgeDisciplineSlug(disciplineNameOrSlug);
  return KNOWLEDGE_TREES_BY_DISCIPLINE[slug] || null;
};
