export type EnemCognitiveAxis = 'DL' | 'CF' | 'SP' | 'CA' | 'EP';
export type EnemArea = 'Linguagens' | 'Matematica' | 'Natureza' | 'Humanas';
export type OrganizerProfile = 'cebraspe' | 'fcc' | 'fgv';

export interface EnemAxisDefinition {
  code: EnemCognitiveAxis;
  label: string;
  description: string;
}

export interface EnemAreaDefinition {
  area: EnemArea;
  focus: string;
  highLeverageActions: string[];
}

export interface OrganizerDefinition {
  key: OrganizerProfile;
  label: string;
  signature: string;
  strategy: string[];
}

export const ENEM_COGNITIVE_AXES: EnemAxisDefinition[] = [
  { code: 'DL', label: 'Dominar Linguagens', description: 'Interpretar e usar linguagens textual, visual e matematica.' },
  { code: 'CF', label: 'Compreender Fenomenos', description: 'Conectar processos naturais, sociais e tecnologicos.' },
  { code: 'SP', label: 'Situacao-Problema', description: 'Resolver problemas contextualizados com escolhas justificadas.' },
  { code: 'CA', label: 'Construir Argumentacao', description: 'Relacionar evidencias para defender conclusoes consistentes.' },
  { code: 'EP', label: 'Elaborar Propostas', description: 'Sugerir solucoes viaveis com responsabilidade social.' },
];

export const ENEM_AREA_GUIDANCE: EnemAreaDefinition[] = [
  {
    area: 'Linguagens',
    focus: 'Interpretacao de genero, repertorio e funcao social do texto.',
    highLeverageActions: [
      'Treinar leitura ativa de enunciados longos e opinativos.',
      'Resolver questoes com foco em intencao comunicativa e argumento.',
      'Comparar textos multimodais (grafico, charge e artigo) na mesma sessao.',
    ],
  },
  {
    area: 'Matematica',
    focus: 'Modelagem de problemas com dados, porcentagem e leitura de graficos.',
    highLeverageActions: [
      'Transformar problemas em equacoes curtas antes de calcular.',
      'Priorizar estatistica basica, proporcao e interpretacao de tabela.',
      'Fazer revisao de erros por tipo de modelagem (nao por capitulo).',
    ],
  },
  {
    area: 'Natureza',
    focus: 'Aplicacao de conceitos de Fisica, Quimica e Biologia em contexto real.',
    highLeverageActions: [
      'Relacionar fenomeno, variavel e impacto ambiental em cada questao.',
      'Treinar questoes interdisciplinares de energia, saude e tecnologia.',
      'Usar mapas de causa e efeito para conteudos de alta cobranca.',
    ],
  },
  {
    area: 'Humanas',
    focus: 'Analise critica de processos historicos, politicos e sociais.',
    highLeverageActions: [
      'Resolver questoes comparando periodos historicos e atualidade.',
      'Revisar conceitos-chave de cidadania, estado e direitos sociais.',
      'Praticar inferencia de ponto de vista e conflito de interesses.',
    ],
  },
];

export const ORGANIZER_GUIDANCE: OrganizerDefinition[] = [
  {
    key: 'cebraspe',
    label: 'CEBRASPE',
    signature: 'Certo/Errado com penalidade por chute e alta interpretacao.',
    strategy: [
      'Responder apenas quando o grau de confianca estiver alto.',
      'Mapear termos absolutos no enunciado (sempre, nunca, somente).',
      'Treinar decisoes de risco-beneficio antes de marcar resposta.',
    ],
  },
  {
    key: 'fcc',
    label: 'FCC',
    signature: 'Objetiva e conteudista, com peso grande de lei seca.',
    strategy: [
      'Revisar artigo-chave e literalidade de normas recorrentes.',
      'Fazer bloco de questoes diretas por assunto tronco do edital.',
      'Consolidar caderno de excecoes e pegadinhas normativas.',
    ],
  },
  {
    key: 'fgv',
    label: 'FGV',
    signature: 'Enunciados longos, interpretacao refinada e alta variabilidade.',
    strategy: [
      'Comecar pela rodada curta para ganhar tempo de prova.',
      'Treinar sintaxe, logica e leitura criteriosa de contexto.',
      'Simular prova completa com controle de tempo por bloco.',
    ],
  },
];
