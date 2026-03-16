export interface KnowledgeNode {
  id: string;
  name: string;
  kind: 'root' | 'area' | 'topic' | 'microtopic';
  children?: KnowledgeNode[];
}

export const PORTUGUESE_KNOWLEDGE_TREE: KnowledgeNode = {
  id: 'pt-root',
  name: 'Portugues',
  kind: 'root',
  children: [
    {
      id: 'pt-gramatica',
      name: 'Gramatica',
      kind: 'area',
      children: [
        {
          id: 'pt-morfologia',
          name: 'Morfologia',
          kind: 'topic',
          children: [
            { id: 'pt-substantivo', name: 'Substantivo', kind: 'microtopic' },
            { id: 'pt-adjetivo', name: 'Adjetivo', kind: 'microtopic' },
            { id: 'pt-pronome', name: 'Pronome', kind: 'microtopic' },
            {
              id: 'pt-verbo',
              name: 'Verbo',
              kind: 'microtopic',
              children: [
                { id: 'pt-verbo-tempo', name: 'Tempo verbal', kind: 'microtopic' },
                { id: 'pt-verbo-modo', name: 'Modo verbal', kind: 'microtopic' },
                { id: 'pt-verbo-voz', name: 'Voz verbal', kind: 'microtopic' },
              ],
            },
          ],
        },
        {
          id: 'pt-sintaxe',
          name: 'Sintaxe',
          kind: 'topic',
          children: [
            { id: 'pt-sujeito', name: 'Sujeito', kind: 'microtopic' },
            { id: 'pt-predicado', name: 'Predicado', kind: 'microtopic' },
            { id: 'pt-periodo-simples', name: 'Periodo simples', kind: 'microtopic' },
            { id: 'pt-periodo-composto', name: 'Periodo composto', kind: 'microtopic' },
            { id: 'pt-concordancia-verbal', name: 'Concordancia verbal', kind: 'microtopic' },
            { id: 'pt-regencia', name: 'Regencia', kind: 'microtopic' },
            { id: 'pt-crase', name: 'Crase', kind: 'microtopic' },
          ],
        },
        {
          id: 'pt-semantica',
          name: 'Semantica',
          kind: 'topic',
          children: [
            { id: 'pt-sinonimia', name: 'Sinonimia e antonimia', kind: 'microtopic' },
            { id: 'pt-conotacao', name: 'Denotacao e conotacao', kind: 'microtopic' },
            { id: 'pt-ambiguidade', name: 'Ambiguidade', kind: 'microtopic' },
          ],
        },
      ],
    },
    {
      id: 'pt-interpretacao',
      name: 'Interpretacao de texto',
      kind: 'area',
      children: [
        { id: 'pt-coesao', name: 'Coesao e coerencia', kind: 'topic' },
        { id: 'pt-inferencia', name: 'Inferencia', kind: 'topic' },
        { id: 'pt-generos', name: 'Generos textuais', kind: 'topic' },
      ],
    },
    {
      id: 'pt-redacao',
      name: 'Redacao',
      kind: 'area',
      children: [
        { id: 'pt-redacao-tese', name: 'Tese e argumentacao', kind: 'topic' },
        { id: 'pt-redacao-coesao', name: 'Coesao textual', kind: 'topic' },
        { id: 'pt-redacao-intervencao', name: 'Proposta de intervencao', kind: 'topic' },
      ],
    },
    {
      id: 'pt-literatura',
      name: 'Literatura',
      kind: 'area',
      children: [
        { id: 'pt-lit-romantismo', name: 'Romantismo', kind: 'topic' },
        { id: 'pt-lit-realismo', name: 'Realismo', kind: 'topic' },
        { id: 'pt-lit-modernismo', name: 'Modernismo', kind: 'topic' },
      ],
    },
  ],
};

export const GLOBAL_KNOWLEDGE_ROOTS: Array<Pick<KnowledgeNode, 'id' | 'name' | 'kind'>> = [
  { id: 'root-portugues', name: 'Portugues', kind: 'root' },
  { id: 'root-matematica', name: 'Matematica', kind: 'root' },
  { id: 'root-fisica', name: 'Fisica', kind: 'root' },
  { id: 'root-quimica', name: 'Quimica', kind: 'root' },
  { id: 'root-biologia', name: 'Biologia', kind: 'root' },
  { id: 'root-historia', name: 'Historia', kind: 'root' },
  { id: 'root-geografia', name: 'Geografia', kind: 'root' },
  { id: 'root-filosofia', name: 'Filosofia', kind: 'root' },
  { id: 'root-sociologia', name: 'Sociologia', kind: 'root' },
  { id: 'root-redacao', name: 'Redacao', kind: 'root' },
  { id: 'root-ingles', name: 'Ingles', kind: 'root' },
  { id: 'root-atualidades', name: 'Atualidades', kind: 'root' },
];

export const KNOWLEDGE_GRAPH_EDGES: Array<{ from: string; to: string }> = [
  { from: 'pt-sujeito', to: 'pt-verbo' },
  { from: 'pt-verbo', to: 'pt-concordancia-verbal' },
  { from: 'pt-regencia', to: 'pt-crase' },
  { from: 'pt-coesao', to: 'pt-redacao-tese' },
  { from: 'pt-redacao-tese', to: 'pt-redacao-intervencao' },
];
