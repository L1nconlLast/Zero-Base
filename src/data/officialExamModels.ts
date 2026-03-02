import type { Question, QuestionTrack } from './questionsBank';

export interface OfficialExamModel {
  id: string;
  nome: string;
  track: Exclude<QuestionTrack, 'ambos'>;
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
  {
    id: 'enem-2025-p1',
    nome: 'ENEM 2025 · Prova 1',
    track: 'enem',
    banca: 'INEP',
    edital: 'ENEM 2025',
    ano: 2025,
    duracaoMinutos: 330,
    questoes: 90,
    disciplinas: ['Linguagens', 'Ciências Humanas'],
    pesosPorDisciplina: {
      Linguagens: 45,
      'Ciências Humanas': 45,
    },
    tagsPrioritarias: ['interpretação', 'texto', 'história', 'geografia', 'sociologia', 'filosofia'],
  },
  {
    id: 'enem-2025-p2',
    nome: 'ENEM 2025 · Prova 2',
    track: 'enem',
    banca: 'INEP',
    edital: 'ENEM 2025',
    ano: 2025,
    duracaoMinutos: 300,
    questoes: 90,
    disciplinas: ['Ciências da Natureza', 'Matemática'],
    pesosPorDisciplina: {
      'Ciências da Natureza': 45,
      Matemática: 45,
    },
    tagsPrioritarias: ['física', 'química', 'biologia', 'funções', 'estatística', 'geometria'],
  },
  {
    id: 'pf-adm-2025',
    nome: 'PF Administrativo 2025',
    track: 'concurso',
    banca: 'Cebraspe',
    edital: 'PF-ADM/2025',
    ano: 2025,
    duracaoMinutos: 270,
    questoes: 120,
    disciplinas: ['Português', 'Raciocínio Lógico', 'Direito Constitucional', 'Direito Administrativo', 'Informática', 'Atualidades'],
    pesosPorDisciplina: {
      Português: 30,
      'Raciocínio Lógico': 20,
      'Direito Constitucional': 25,
      'Direito Administrativo': 25,
      Informática: 10,
      Atualidades: 10,
    },
    tagsPrioritarias: ['administração pública', 'constituição', 'atos administrativos', 'segurança pública', 'lógica'],
  },
  {
    id: 'prf-2025',
    nome: 'PRF 2025',
    track: 'concurso',
    banca: 'Cebraspe',
    edital: 'PRF/2025',
    ano: 2025,
    duracaoMinutos: 300,
    questoes: 120,
    disciplinas: ['Português', 'Raciocínio Lógico', 'Direito Constitucional', 'Direito Administrativo', 'Informática', 'Atualidades'],
    pesosPorDisciplina: {
      Português: 24,
      'Raciocínio Lógico': 18,
      'Direito Constitucional': 26,
      'Direito Administrativo': 20,
      Informática: 16,
      Atualidades: 16,
    },
    tagsPrioritarias: ['trânsito', 'ctb', 'constituição', 'lógica', 'tecnologia'],
  },
  {
    id: 'receita-trib-2025',
    nome: 'Receita Federal 2025',
    track: 'concurso',
    banca: 'FGV',
    edital: 'RFB-TRIB/2025',
    ano: 2025,
    duracaoMinutos: 300,
    questoes: 140,
    disciplinas: ['Português', 'Raciocínio Lógico', 'Direito Constitucional', 'Direito Administrativo', 'Informática', 'Atualidades'],
    pesosPorDisciplina: {
      Português: 22,
      'Raciocínio Lógico': 18,
      'Direito Constitucional': 24,
      'Direito Administrativo': 24,
      Informática: 12,
      Atualidades: 10,
    },
    tagsPrioritarias: ['administração pública', 'tributário', 'constituição', 'processo administrativo'],
  },
  {
    id: 'tj-tecnico-2025',
    nome: 'TJ Técnico 2025',
    track: 'concurso',
    banca: 'Vunesp',
    edital: 'TJ-TEC/2025',
    ano: 2025,
    duracaoMinutos: 240,
    questoes: 100,
    disciplinas: ['Português', 'Raciocínio Lógico', 'Direito Constitucional', 'Direito Administrativo', 'Informática', 'Atualidades'],
    pesosPorDisciplina: {
      Português: 28,
      'Raciocínio Lógico': 14,
      'Direito Constitucional': 20,
      'Direito Administrativo': 20,
      Informática: 10,
      Atualidades: 8,
    },
    tagsPrioritarias: ['jurisprudência', 'constituição', 'administração pública', 'texto'],
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
