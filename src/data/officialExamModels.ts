import type { Question, QuestionTrack } from './questionsBank';

export interface OfficialExamModel {
  id: string;
  nome: string;
  track: Exclude<QuestionTrack, 'ambos'>;
  category: 'Vestibulares' | 'Bancos' | 'Policial' | 'Militar' | 'Jurídica' | 'Outros';
  banca: string;
  edital: string;
  ano: number;
  duracaoMinutos: number;
  questoes: number;
  disciplinas: string[];
  pesosPorDisciplina?: Record<string, number>;
  tagsPrioritarias?: string[];
}

export const OFFICIAL_EXAM_MODELS: OfficialExamModel[] = [
  // VESTIBULARES
  {
    id: 'enem-2025-p1',
    nome: 'ENEM 2025 · Prova 1',
    track: 'enem',
    category: 'Vestibulares',
    banca: 'INEP',
    edital: 'ENEM 2025',
    ano: 2025,
    duracaoMinutos: 330,
    questoes: 90,
    disciplinas: ['Linguagens', 'Ciências Humanas'],
    pesosPorDisciplina: { Linguagens: 45, 'Ciências Humanas': 45 },
    tagsPrioritarias: ['interpretação', 'texto', 'história', 'geografia', 'sociologia', 'filosofia'],
  },
  {
    id: 'enem-2025-p2',
    nome: 'ENEM 2025 · Prova 2',
    track: 'enem',
    category: 'Vestibulares',
    banca: 'INEP',
    edital: 'ENEM 2025',
    ano: 2025,
    duracaoMinutos: 300,
    questoes: 90,
    disciplinas: ['Ciências da Natureza', 'Matemática'],
    pesosPorDisciplina: { 'Ciências da Natureza': 45, Matemática: 45 },
    tagsPrioritarias: ['física', 'química', 'biologia', 'funções', 'estatística', 'geometria'],
  },
  {
    id: 'enem-ppl-2024',
    nome: 'ENEM PPL 2024 (Reaplicação)',
    track: 'enem',
    category: 'Vestibulares',
    banca: 'INEP',
    edital: 'ENEM PPL',
    ano: 2024,
    duracaoMinutos: 300,
    questoes: 90,
    disciplinas: ['Linguagens', 'Ciências Humanas', 'Ciências da Natureza', 'Matemática'],
    pesosPorDisciplina: { Linguagens: 22, 'Ciências Humanas': 23, 'Ciências da Natureza': 22, Matemática: 23 },
    tagsPrioritarias: ['interpretação', 'física', 'matemática básica'],
  },
  {
    id: 'enem-base-foco',
    nome: 'Simulado ENEM · Fechando a Base',
    track: 'enem',
    category: 'Vestibulares',
    banca: 'Zero Base',
    edital: 'Simulado Focado',
    ano: 2025,
    duracaoMinutos: 180,
    questoes: 60,
    disciplinas: ['Matemática', 'Linguagens', 'Ciências da Natureza'],
    pesosPorDisciplina: { Matemática: 30, Linguagens: 15, 'Ciências da Natureza': 15 },
    tagsPrioritarias: ['matemática básica', 'interpretação', 'biologia'],
  },
  {
    id: 'uespi-2025',
    nome: 'UESPI 2025',
    track: 'enem',
    category: 'Vestibulares',
    banca: 'NUCEPE',
    edital: 'UESPI/2025',
    ano: 2025,
    duracaoMinutos: 240,
    questoes: 80,
    disciplinas: ['Linguagens', 'Ciências Humanas', 'Ciências da Natureza', 'Matemática'],
    pesosPorDisciplina: { Linguagens: 20, 'Ciências Humanas': 20, 'Ciências da Natureza': 20, Matemática: 20 },
    tagsPrioritarias: ['literatura', 'história', 'geografia'],
  },

  // POLICIAL
  {
    id: 'pf-adm-2025',
    nome: 'PF Administrativo 2025',
    track: 'concurso',
    category: 'Policial',
    banca: 'Cebraspe',
    edital: 'PF-ADM/2025',
    ano: 2025,
    duracaoMinutos: 270,
    questoes: 120,
    disciplinas: ['Português', 'Raciocínio Lógico', 'Direito Constitucional', 'Direito Administrativo', 'Informática', 'Atualidades'],
    pesosPorDisciplina: { Português: 30, 'Raciocínio Lógico': 20, 'Direito Constitucional': 25, 'Direito Administrativo': 25, Informática: 10, Atualidades: 10 },
    tagsPrioritarias: ['administração pública', 'constituição', 'atos administrativos', 'segurança pública', 'lógica'],
  },
  {
    id: 'pf-agente-2025',
    nome: 'PF Agente 2025',
    track: 'concurso',
    category: 'Policial',
    banca: 'Cebraspe',
    edital: 'PF-AGE/2025',
    ano: 2025,
    duracaoMinutos: 300,
    questoes: 120,
    disciplinas: ['Português', 'Raciocínio Lógico', 'Informática', 'Direito Penal', 'Direito Processual Penal', 'Administração', 'Contabilidade'],
    pesosPorDisciplina: { Português: 24, Informática: 36, Contabilidade: 24, 'Direito Penal': 12, 'Raciocínio Lógico': 12, 'Direito Processual Penal': 12 },
    tagsPrioritarias: ['contabilidade geral', 'tecnologia', 'banco de dados', 'crimes', 'processo penal'],
  },
  {
    id: 'prf-2025',
    nome: 'PRF 2025',
    track: 'concurso',
    category: 'Policial',
    banca: 'Cebraspe',
    edital: 'PRF/2025',
    ano: 2025,
    duracaoMinutos: 300,
    questoes: 120,
    disciplinas: ['Português', 'Raciocínio Lógico', 'Direito Constitucional', 'Direito Administrativo', 'Direito Penal', 'Direito Processual Penal', 'Legislação de Trânsito', 'Informática', 'Atualidades'],
    pesosPorDisciplina: { 'Legislação de Trânsito': 30, Português: 20, 'Direito Constitucional': 10, 'Direito Administrativo': 10, 'Direito Penal': 10, 'Direito Processual Penal': 10, Informática: 10, 'Raciocínio Lógico': 10, Atualidades: 10 },
    tagsPrioritarias: ['trânsito', 'ctb', 'constituição', 'crimes', 'lógica', 'tecnologia'],
  },
  {
    id: 'pm-pi-2025',
    nome: 'PM-PI Soldado 2025',
    track: 'concurso',
    category: 'Policial',
    banca: 'NUCEPE',
    edital: 'PMPI/2025',
    ano: 2025,
    duracaoMinutos: 240,
    questoes: 60,
    disciplinas: ['Português', 'Raciocínio Lógico', 'Informática', 'Legislação PMPI', 'Direito Constitucional', 'Direito Penal'],
    pesosPorDisciplina: { Português: 10, 'Raciocínio Lógico': 10, Informática: 10, 'Legislação PMPI': 10, 'Direito Constitucional': 10, 'Direito Penal': 10 },
    tagsPrioritarias: ['legislação militar', 'direito penal', 'constituição'],
  },

  // BANCOS E TECNOLOGIA
  {
    id: 'bb-escriturario-2025',
    nome: 'Banco do Brasil · Escriturário',
    track: 'concurso',
    category: 'Bancos',
    banca: 'Cesgranrio',
    edital: 'BB/2025',
    ano: 2025,
    duracaoMinutos: 300,
    questoes: 70,
    disciplinas: ['Português', 'Inglês', 'Matemática', 'Atualidades do Mercado Financeiro', 'Conhecimentos Bancários', 'Informática', 'Vendas e Negociação'],
    pesosPorDisciplina: { 'Conhecimentos Bancários': 15, 'Informática': 15, 'Vendas e Negociação': 15, Português: 10, Matemática: 5, Inglês: 5, 'Atualidades do Mercado Financeiro': 5 },
    tagsPrioritarias: ['bancos', 'cdb', 'vendas', 'internet', 'inglês'],
  },
  {
    id: 'bb-ti-2025',
    nome: 'Banco do Brasil · TI',
    track: 'concurso',
    category: 'Bancos',
    banca: 'Cesgranrio',
    edital: 'BB-TI/2025',
    ano: 2025,
    duracaoMinutos: 300,
    questoes: 70,
    disciplinas: ['Português', 'Inglês', 'Matemática', 'Atualidades do Mercado Financeiro', 'Tecnologia da Informação', 'Conhecimentos Bancários'],
    pesosPorDisciplina: { 'Tecnologia da Informação': 35, Português: 10, Inglês: 5, Matemática: 5, 'Atualidades do Mercado Financeiro': 5, 'Conhecimentos Bancários': 10 },
    tagsPrioritarias: ['tecnologia', 'banco de dados', 'java', 'sistemas', 'redes'],
  },
  {
    id: 'cef-2025',
    nome: 'Caixa Econômica Federal',
    track: 'concurso',
    category: 'Bancos',
    banca: 'Cesgranrio',
    edital: 'CEF/2025',
    ano: 2025,
    duracaoMinutos: 300,
    questoes: 60,
    disciplinas: ['Português', 'Inglês', 'Matemática Financeira', 'Conhecimentos Bancários', 'Informática', 'Atendimento'],
    pesosPorDisciplina: { 'Conhecimentos Bancários': 15, 'Atendimento': 15, Informática: 10, Português: 10, 'Matemática Financeira': 5, Inglês: 5 },
    tagsPrioritarias: ['bancos', 'vendas', 'caixa', 'atendimento', 'finanças'],
  },
  {
    id: 'serpro-2025',
    nome: 'Serpro / Dataprev',
    track: 'concurso',
    category: 'Bancos',
    banca: 'Cebraspe',
    edital: 'TI/2025',
    ano: 2025,
    duracaoMinutos: 210,
    questoes: 120,
    disciplinas: ['Português', 'Inglês', 'Raciocínio Lógico', 'Legislação', 'Tecnologia da Informação'],
    pesosPorDisciplina: { 'Tecnologia da Informação': 70, Português: 15, Inglês: 10, 'Raciocínio Lógico': 10, Legislação: 15 },
    tagsPrioritarias: ['tecnologia', 'desenvolvimento', 'dados', 'agile'],
  },

  // JURÍDICA / TRIBUNAL
  {
    id: 'oab-1fase-2025',
    nome: 'OAB 1ª Fase 2025',
    track: 'concurso',
    category: 'Jurídica',
    banca: 'FGV',
    edital: 'Exame de Ordem',
    ano: 2025,
    duracaoMinutos: 300,
    questoes: 80,
    disciplinas: ['Ética', 'Direito Civil', 'Direito Processual Civil', 'Direito Penal', 'Direito Processual Penal', 'Direito Constitucional', 'Direito Administrativo', 'Direito do Trabalho', 'Direito Processual do Trabalho', 'Direito Tributário', 'Direito Empresarial'],
    pesosPorDisciplina: { Ética: 8, 'Direito Civil': 7, 'Direito Processual Civil': 7, 'Direito Penal': 6, 'Direito Processual Penal': 6, 'Direito Constitucional': 6, 'Direito Administrativo': 6, 'Direito do Trabalho': 5, 'Direito Processual do Trabalho': 5, 'Direito Tributário': 5, 'Direito Empresarial': 5 },
    tagsPrioritarias: ['ética', 'estatuto oab', 'civil', 'penal', 'constituição'],
  },
  {
    id: 'receita-trib-2025',
    nome: 'Receita Federal 2025',
    track: 'concurso',
    category: 'Jurídica',
    banca: 'FGV',
    edital: 'RFB-TRIB/2025',
    ano: 2025,
    duracaoMinutos: 300,
    questoes: 140,
    disciplinas: ['Português', 'Raciocínio Lógico', 'Direito Constitucional', 'Direito Administrativo', 'Direito Tributário', 'Contabilidade'],
    pesosPorDisciplina: { 'Direito Tributário': 40, Contabilidade: 40, Português: 20, 'Direito Constitucional': 20, 'Direito Administrativo': 10, 'Raciocínio Lógico': 10 },
    tagsPrioritarias: ['administração pública', 'tributário', 'constituição', 'processo administrativo', 'contabilidade'],
  },
  {
    id: 'tj-tecnico-2025',
    nome: 'TJ Técnico 2025',
    track: 'concurso',
    category: 'Jurídica',
    banca: 'Vunesp',
    edital: 'TJ-TEC/2025',
    ano: 2025,
    duracaoMinutos: 240,
    questoes: 100,
    disciplinas: ['Português', 'Raciocínio Lógico', 'Direito Constitucional', 'Direito Administrativo', 'Informática', 'Atualidades'],
    pesosPorDisciplina: { Português: 28, 'Raciocínio Lógico': 14, 'Direito Constitucional': 20, 'Direito Administrativo': 20, Informática: 10, Atualidades: 8 },
    tagsPrioritarias: ['jurisprudência', 'constituição', 'administração pública', 'texto'],
  },

  // MILITARES
  {
    id: 'esa-2025',
    nome: 'ESA 2025',
    track: 'concurso',
    category: 'Militar',
    banca: 'Exército',
    edital: 'ESA/2025',
    ano: 2025,
    duracaoMinutos: 240,
    questoes: 50,
    disciplinas: ['Matemática', 'Português', 'História e Geografia', 'Inglês'],
    pesosPorDisciplina: { Matemática: 14, Português: 14, 'História e Geografia': 12, Inglês: 10 },
    tagsPrioritarias: ['geometria', 'álgebra', 'história do brasil', 'geografia do brasil'],
  },
  {
    id: 'espcex-2025',
    nome: 'EsPCEx 2025',
    track: 'concurso',
    category: 'Militar',
    banca: 'Exército',
    edital: 'EsPCEx/2025',
    ano: 2025,
    duracaoMinutos: 270,
    questoes: 100,
    disciplinas: ['Matemática', 'Física', 'Química', 'Português', 'História', 'Geografia', 'Inglês'],
    pesosPorDisciplina: { Matemática: 20, Português: 20, Física: 12, Química: 12, História: 12, Geografia: 12, Inglês: 12 },
    tagsPrioritarias: ['cinemática', 'físico-química', 'história geral', 'funções'],
  },
];

export const getOfficialExamModelsByTrack = (track: QuestionTrack | 'ambos') => {
  if (track === 'ambos') {
    return OFFICIAL_EXAM_MODELS;
  }

  return OFFICIAL_EXAM_MODELS.filter((model) => model.track === track);
};

export const isQuestionCompatibleWithModel = (question: Question, model: OfficialExamModel): boolean => {
  if (model.track !== question.track && question.track !== 'ambos') {
    return false;
  }

  return model.disciplinas.includes(question.subject);
};

export const scoreQuestionForModel = (
  question: Question,
  model: OfficialExamModel,
  errorsByTopic: Record<string, number>,
): number => {
  const topicKey = `${question.subject}::${question.tags[0] || question.subject}`;
  const errorWeight = (errorsByTopic[topicKey] || 0) * 5;
  const subjectWeight = model.pesosPorDisciplina?.[question.subject] || 0;
  const tagBoost = question.tags.some((tag) => model.tagsPrioritarias?.includes(tag.toLowerCase())) ? 8 : 0;

  return errorWeight + subjectWeight + tagBoost;
};

export const buildWeightedDistribution = (
  model: OfficialExamModel,
  totalQuestions: number,
  availableSubjects: string[],
): Array<{ subject: string; count: number }> => {
  if (totalQuestions <= 0) {
    return [];
  }

  const subjects = model.disciplinas.filter((subject) => availableSubjects.includes(subject));
  if (subjects.length === 0) {
    return [];
  }

  const weights = subjects.map((subject) => ({
    subject,
    weight: model.pesosPorDisciplina?.[subject] ?? 1,
  }));

  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0) || 1;
  const base = weights.map((item) => ({
    subject: item.subject,
    count: Math.floor((item.weight / totalWeight) * totalQuestions),
  }));

  let assigned = base.reduce((sum, item) => sum + item.count, 0);
  const sortedRemainder = [...weights].sort((a, b) => b.weight - a.weight);
  let index = 0;

  while (assigned < totalQuestions && sortedRemainder.length > 0) {
    const subject = sortedRemainder[index % sortedRemainder.length].subject;
    const slot = base.find((item) => item.subject === subject);
    if (slot) {
      slot.count += 1;
      assigned += 1;
    }
    index += 1;
  }

  return base.filter((item) => item.count > 0);
};
