import React from 'react';
import { Hand, Brain, CalendarDays, Target, GraduationCap, Landmark, BookOpen, Globe2, Clock3, CalendarCheck2, Award, Goal } from 'lucide-react';
import { createDefaultSmartProfile, type DifficultyLevel, type SmartScheduleProfile } from '../../utils/smartScheduleEngine';
import { OFFICIAL_EXAM_MODELS } from '../../data/officialExamModels';
import { trackEvent } from '../../utils/analytics';
import { mvpApiService } from '../../services/mvpApi.service';

interface OnboardingFlowProps {
  userName?: string;
  initialDailyGoal: number;
  initialMethodId: string;
  onComplete: (payload: {
    dailyGoal: number;
    methodId: string;
    smartProfile: SmartScheduleProfile;
    onboardingMeta?: {
      focus: FocusType;
      concurso: ConcursoMeta | null;
      enem: {
        goalId: string | null;
        targetCollege: string | null;
        targetCourse: string | null;
      } | null;
    };
  }) => void;
  onStepProgressSave?: (payload: {
    step: number;
    focusType: FocusType;
    smartProfile: SmartScheduleProfile;
  }) => void;
}

const ENEM_SUBJECTS = ['Matemática', 'Linguagens', 'Humanas', 'Natureza', 'Redação'] as const;
type EnemSubject = (typeof ENEM_SUBJECTS)[number];
type EnemGoalProfile = {
  id: string;
  faculdade: string;
  curso: string;
  pesos: Partial<Record<EnemSubject, number>>;
};
type DifficultyScale = 1 | 2 | 3 | 4 | 5;

const ENEM_GOALS: EnemGoalProfile[] = [
  {
    id: 'med-usp',
    faculdade: 'USP',
    curso: 'Medicina',
    pesos: { Natureza: 5, Redação: 5, Matemática: 4, Linguagens: 3, Humanas: 3 },
  },
  {
    id: 'ads-ifpi',
    faculdade: 'IFPI',
    curso: 'Análise e Desenvolvimento de Sistemas',
    pesos: { Matemática: 5, Natureza: 4, Linguagens: 3, Humanas: 2, Redação: 3 },
  },
  {
    id: 'dir-ufpi',
    faculdade: 'UFPI',
    curso: 'Direito',
    pesos: { Redação: 5, Humanas: 5, Linguagens: 4, Matemática: 2, Natureza: 2 },
  },
];
const CONCURSO_SUBJECTS = [
  'Português',
  'Raciocínio Lógico',
  'Direito Constitucional',
  'Direito Administrativo',
  'Informática',
  'Atualidades',
] as const;
type ConcursoCatalogItem = {
  id: string;
  label: string;
  banca: string;
  area: string;
  subjects: string[];
};

type ConcursoMeta = {
  id: string;
  nome: string;
  banca: string;
  area: string;
};

const CONCURSO_CATALOGO: ConcursoCatalogItem[] = [
  {
    id: 'bb-escriturario-cesgranrio-2025',
    label: 'Banco do Brasil · Escriturário · Cesgranrio',
    banca: 'Cesgranrio',
    area: 'Bancária',
    subjects: [
      'Conhecimentos Bancários',
      'Matemática Financeira',
      'Probabilidade e Estatística',
      'Português',
      'Inglês',
      'Atualidades do Mercado Financeiro',
      'Informática',
    ],
  },
  {
    id: 'caixa-ti-cesgranrio-2025',
    label: 'Caixa Econômica · TI · Cesgranrio',
    banca: 'Cesgranrio',
    area: 'TI',
    subjects: [
      'Português',
      'Raciocínio Lógico',
      'Governança de TI',
      'Banco de Dados',
      'Redes',
      'Segurança da Informação',
      'Engenharia de Software',
    ],
  },
  {
    id: 'pf-adm-cebraspe-2025',
    label: 'PF Administrativo · Cebraspe',
    banca: 'Cebraspe',
    area: 'Administrativa',
    subjects: [
      'Português',
      'Raciocínio Lógico',
      'Direito Administrativo',
      'Direito Constitucional',
      'Administração Pública',
      'Arquivologia',
      'Informática',
    ],
  },
  {
    id: 'oab-1fase-fgv-2025',
    label: 'OAB 1ª Fase · FGV',
    banca: 'FGV',
    area: 'Jurídica',
    subjects: [
      'Ética Profissional',
      'Constitucional',
      'Administrativo',
      'Civil',
      'Processo Civil',
      'Penal',
      'Processo Penal',
      'Trabalho',
      'Processo do Trabalho',
      'Tributário',
      'Empresarial',
    ],
  },
];
const CONCURSO_MODELS = OFFICIAL_EXAM_MODELS.filter((model) => model.track === 'concurso');
const DEFAULT_CONCURSO_MODEL_ID = CONCURSO_CATALOGO[0]?.id || CONCURSO_MODELS[0]?.id || '';
const WEEK_DAYS = [
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
] as const;
const MAX_SELECTED_DAYS = 6;
const STEP3_LEVELS_STORAGE_KEY = 'onboarding_step3_levels_by_focus_v1';
const STREAK_DAYS_STORAGE_KEY = 'zb_streak_days';
const STREAK_LAST_DAY_STORAGE_KEY = 'zb_streak_last_day';
const FACULDADE_MIN_SELECTED = 1;
const FACULDADE_MAX_SELECTED = 10;
const MIN_SUBJECT_LEN = 2;
const COURSE_CATALOG: Record<string, string[]> = {
  'análise e desenvolvimento de sistemas (ads)': [
    'Algoritmos',
    'Lógica de Programação',
    'Estrutura de Dados',
    'Programação Orientada a Objetos',
    'Programação Web',
    'Banco de Dados',
    'Engenharia de Software',
    'Desenvolvimento Web',
    'Redes de Computadores',
    'Sistemas Operacionais',
    'Projeto Integrador',
  ],
  'analise e desenvolvimento de sistemas (ads)': [
    'Algoritmos',
    'Lógica de Programação',
    'Estrutura de Dados',
    'Programação Orientada a Objetos',
    'Programação Web',
    'Banco de Dados',
    'Engenharia de Software',
    'Desenvolvimento Web',
    'Redes de Computadores',
    'Sistemas Operacionais',
    'Projeto Integrador',
  ],
};

const FOCUS_SUBJECT_MAP: Record<FocusType, string[]> = {
  enem: [...ENEM_SUBJECTS],
  concurso: ['Português', 'Raciocínio Lógico', 'Direito Constitucional', 'Direito Administrativo', 'Informática'],
  faculdade: [],
  outros: [],
};

const LEGACY_BLOCKED_SUBJECTS = new Set<string>([
  ...ENEM_SUBJECTS,
  ...CONCURSO_SUBJECTS,
]);

type Step3Copy = {
  title: string;
  subtitle: string;
  cta: string;
  highPriorityTitle: string;
  highPriorityEmpty: string;
  maintenanceTitle: string;
  maintenanceEmpty: string;
  breakdownTitle: string;
  successTitle: string;
  successMessage: string;
};

const FOCUS_COPY_MAP: Record<FocusType, Step3Copy> = {
  enem: {
    title: '🧠 3) Nível por matéria',
    subtitle: 'A IA usa isso para ajustar dificuldade, ordem de revisão e carga por matéria.',
    cta: '🚀 Gerar plano ENEM',
    highPriorityTitle: '🔥 Prioridade alta (ENEM)',
    highPriorityEmpty: 'Nenhuma área marcada para reforço intenso.',
    maintenanceTitle: '⚖️ Manutenção (ENEM)',
    maintenanceEmpty: 'Defina áreas para manter revisão equilibrada.',
    breakdownTitle: 'Seu plano ENEM está focado em:',
    successTitle: 'Plano ENEM calibrado',
    successMessage: 'Perfeito. Equilibramos evolução e revisão para acelerar sua nota.',
  },
  concurso: {
    title: '🧠 3) Nível por disciplina (Concurso)',
    subtitle: 'A IA prioriza disciplinas com maior peso no edital e histórico da banca.',
    cta: '🚀 Gerar plano de concurso',
    highPriorityTitle: '🔥 Prioridade alta (edital)',
    highPriorityEmpty: 'Nenhuma disciplina marcada para reforço intenso.',
    maintenanceTitle: '⚖️ Manutenção (edital)',
    maintenanceEmpty: 'Defina disciplinas para revisão equilibrada.',
    breakdownTitle: 'Seu plano de concurso está focado em:',
    successTitle: 'Plano de concurso calibrado',
    successMessage: 'Perfeito. Distribuição pronta para teoria + questões com constância.',
  },
  faculdade: {
    title: '🧠 3) Nível por frente acadêmica',
    subtitle: 'A IA equilibra provas, trabalhos e prática conforme sua rotina da graduação.',
    cta: '🚀 Gerar plano da faculdade',
    highPriorityTitle: '🔥 Prioridade alta (faculdade)',
    highPriorityEmpty: 'Nenhuma frente marcada para reforço intenso.',
    maintenanceTitle: '⚖️ Manutenção (faculdade)',
    maintenanceEmpty: 'Defina frentes para manter a rotina equilibrada.',
    breakdownTitle: 'Seu plano da faculdade está focado em:',
    successTitle: 'Plano da faculdade calibrado',
    successMessage: 'Perfeito. Sua rotina ficou mais previsível e sustentável.',
  },
  outros: {
    title: '🧠 3) Nível por frente de evolução',
    subtitle: 'A IA organiza sua trilha para acelerar progresso com consistência.',
    cta: '🚀 Gerar meu plano',
    highPriorityTitle: '🔥 Prioridade alta (objetivo)',
    highPriorityEmpty: 'Nenhum bloco marcado para reforço intenso.',
    maintenanceTitle: '⚖️ Manutenção (objetivo)',
    maintenanceEmpty: 'Defina blocos para manter progresso equilibrado.',
    breakdownTitle: 'Seu plano personalizado está focado em:',
    successTitle: 'Plano personalizado calibrado',
    successMessage: 'Perfeito. Sua trilha foi organizada para manter progresso real.',
  },
};

const difficultyWeight: Record<DifficultyLevel, number> = {
  fraco: 35,
  medio: 20,
  forte: 10,
};

const LEVELS = [
  { id: 'improve', label: '🧩 Preciso melhorar', weight: 3, difficulty: 'fraco' as DifficultyLevel },
  { id: 'ok', label: '⚖️ Estou ok', weight: 2, difficulty: 'medio' as DifficultyLevel },
  { id: 'good', label: '🚀 Estou bem', weight: 1, difficulty: 'forte' as DifficultyLevel },
] as const;

type LevelId = (typeof LEVELS)[number]['id'];

type FocusType = 'enem' | 'concurso' | 'faculdade' | 'outros';
type StepId = 'contexto' | 'ritmo' | 'nivel' | 'final';
type EnemSituation = 'base' | 'terceiro' | 'repetente' | 'concluiu';
type CollegeFocus = 'provas' | 'trabalhos' | 'rotina';
type OtherFocus = 'idiomas' | 'leitura' | 'novo_aprendizado';
type LevelsByFocus = Record<FocusType, Record<string, LevelId>>;
type FormDataShape = {
  focus?: FocusType;
  course?: string;
  concursoId?: string;
  concursoMeta?: ConcursoMeta | null;
  enemGoalId?: string;
  enemTargetCollege?: string;
  enemTargetCourse?: string;
  selectedSubjects?: string[];
  manualSubjects?: string[];
};

type SummaryCard = {
  id: string;
  icon: string;
  title: string;
  description: string;
  badge?: string;
};

type FocusProfile = {
  tone: string;
  header: {
    title: string;
    subtitle: string;
  };
  step2: {
    subtitle: string;
    impactLabels: {
      low: string;
      mid: string;
      high: string;
    };
  };
  greenBoxMessages: {
    step1: string;
    step2: string;
    step3: string;
  };
  finalCards: SummaryCard[];
  cta: {
    continue: string;
    finish: string;
  };
};

const FLOW_BY_FOCUS: Record<FocusType, StepId[]> = {
  enem: ['contexto', 'ritmo', 'nivel', 'final'],
  concurso: ['contexto', 'ritmo', 'nivel', 'final'],
  faculdade: ['contexto', 'ritmo', 'nivel', 'final'],
  outros: ['contexto', 'ritmo', 'nivel', 'final'],
};

const FOCUS_PROFILES: Record<FocusType, FocusProfile> = {
  enem: {
    tone: 'alta_performance',
    header: {
      title: 'ENEM · Reta final para alta nota',
      subtitle: 'Vamos otimizar sua preparação com foco em aprovação.',
    },
    step2: {
      subtitle: 'Organize sua semana para maximizar revisão e simulados sem sobrecarga.',
      impactLabels: {
        low: 'Base sólida 👍',
        mid: 'Ótimo ritmo de evolução 🚀',
        high: 'Ritmo intenso de reta final 🔥',
      },
    },
    greenBoxMessages: {
      step1: 'Perfeito. Vamos adaptar seu plano para alta performance no ENEM.',
      step2: 'Excelente. Sua carga semanal está calibrada para evolução constante.',
      step3: 'Fechado. Vamos equilibrar teoria, revisão e simulados na sua rotina.',
    },
    finalCards: [
      {
        id: 'enem_nota',
        icon: '🎯',
        title: 'Meta de nota definida',
        description: 'Estratégia ajustada para alcançar sua pontuação alvo.',
        badge: 'Prioridade alta',
      },
      {
        id: 'enem_revisao',
        icon: '📚',
        title: 'Revisão inteligente',
        description: 'Ciclos ativos para reforçar retenção e velocidade.',
        badge: 'Memória ativa',
      },
      {
        id: 'enem_simulados',
        icon: '📝',
        title: 'Simulados estratégicos',
        description: 'Treino recorrente para performance de prova real.',
        badge: 'Performance',
      },
      {
        id: 'enem_ritmo',
        icon: '⏱️',
        title: 'Ritmo semanal calibrado',
        description: 'Plano equilibrado para constância até a prova.',
        badge: 'Consistência',
      },
    ],
    cta: {
      continue: 'Continuar estratégia ENEM',
      finish: 'Gerar plano ENEM',
    },
  },
  concurso: {
    tone: 'estrategia_edital',
    header: {
      title: 'Concurso · Estratégia por edital',
      subtitle: 'Plano orientado por disciplinas, peso e banca.',
    },
    step2: {
      subtitle: 'Monte uma rotina sustentável para manter volume e qualidade de questões.',
      impactLabels: {
        low: 'Ritmo de manutenção 👍',
        mid: 'Ótimo equilíbrio para evolução 🚀',
        high: 'Ritmo competitivo de preparação 🔥',
      },
    },
    greenBoxMessages: {
      step1: 'Perfeito. Vamos priorizar disciplinas de maior impacto no seu edital.',
      step2: 'Excelente. Sua semana está equilibrada para teoria + questões.',
      step3: 'Fechado. Vamos intensificar os tópicos com maior peso de cobrança.',
    },
    finalCards: [
      {
        id: 'conc_edital',
        icon: '📜',
        title: 'Foco por edital',
        description: 'Distribuição estratégica conforme conteúdo exigido.',
        badge: 'Direcionado',
      },
      {
        id: 'conc_banca',
        icon: '🏛️',
        title: 'Leitura de banca',
        description: 'Plano alinhado ao padrão de cobrança da banca.',
        badge: 'Técnico',
      },
      {
        id: 'conc_questoes',
        icon: '✅',
        title: 'Questões com prioridade',
        description: 'Treino contínuo para ganho de acerto.',
        badge: 'Prática',
      },
      {
        id: 'conc_rotina',
        icon: '⏱️',
        title: 'Ritmo competitivo',
        description: 'Carga semanal sustentável para longo prazo.',
        badge: 'Constância',
      },
    ],
    cta: {
      continue: 'Continuar estratégia de concurso',
      finish: 'Gerar plano de concurso',
    },
  },
  faculdade: {
    tone: 'organizacao_academica',
    header: {
      title: 'Faculdade · Organização acadêmica',
      subtitle: 'Vamos equilibrar provas, trabalhos e rotina do semestre.',
    },
    step2: {
      subtitle: 'Crie uma agenda realista para estudar sem acumular atividades.',
      impactLabels: {
        low: 'Ritmo leve e sustentável 👍',
        mid: 'Ótimo equilíbrio com a faculdade 🚀',
        high: 'Carga forte — atenção aos prazos 🔥',
      },
    },
    greenBoxMessages: {
      step1: 'Perfeito. Vamos adaptar seu plano ao curso, período e foco atual.',
      step2: 'Excelente. Sua rotina semanal ficou equilibrada para evitar correria.',
      step3: 'Fechado. Vamos distribuir provas e trabalhos com antecedência.',
    },
    finalCards: [
      {
        id: 'fac_curso',
        icon: '🏫',
        title: 'Contexto acadêmico mapeado',
        description: 'Plano adaptado à sua faculdade, curso e período.',
        badge: 'Personalizado',
      },
      {
        id: 'fac_provas',
        icon: '📚',
        title: 'Preparação para provas',
        description: 'Blocos de estudo organizados para melhor retenção.',
        badge: 'Acadêmico',
      },
      {
        id: 'fac_trabalhos',
        icon: '📝',
        title: 'Trabalhos e prazos',
        description: 'Execução antecipada para evitar acúmulo de entrega.',
        badge: 'Sem correria',
      },
      {
        id: 'fac_rotina',
        icon: '⚖️',
        title: 'Rotina equilibrada',
        description: 'Carga semanal pensada para constância sem sobrecarga.',
        badge: 'Sustentável',
      },
    ],
    cta: {
      continue: 'Continuar rotina da faculdade',
      finish: 'Gerar plano da faculdade',
    },
  },
  outros: {
    tone: 'habito_evolucao',
    header: {
      title: 'Outros · Evolução pessoal',
      subtitle: 'Vamos criar uma trilha consistente para seu objetivo.',
    },
    step2: {
      subtitle: 'Defina um ritmo simples de manter para evoluir com constância.',
      impactLabels: {
        low: 'Começo consistente 👍',
        mid: 'Ótimo ritmo de evolução 🚀',
        high: 'Ritmo intenso — mantenha pausas 🔥',
      },
    },
    greenBoxMessages: {
      step1: 'Perfeito. Vamos transformar seu objetivo em rotina prática.',
      step2: 'Excelente. Sua consistência semanal está bem definida.',
      step3: 'Fechado. Vamos criar marcos para acompanhar sua evolução.',
    },
    finalCards: [
      {
        id: 'out_objetivo',
        icon: '🎯',
        title: 'Objetivo definido',
        description: 'Plano focado no que você realmente quer evoluir.',
        badge: 'Clareza',
      },
      {
        id: 'out_rotina',
        icon: '📅',
        title: 'Rotina prática',
        description: 'Blocos simples para manter progresso semanal.',
        badge: 'Consistência',
      },
      {
        id: 'out_habito',
        icon: '🔁',
        title: 'Formação de hábito',
        description: 'Pequenas vitórias diárias para evolução contínua.',
        badge: 'Longo prazo',
      },
      {
        id: 'out_marcos',
        icon: '🏁',
        title: 'Marcos de progresso',
        description: 'Acompanhamento claro para medir avanço real.',
        badge: 'Evolução',
      },
    ],
    cta: {
      continue: 'Continuar plano personalizado',
      finish: 'Gerar plano personalizado',
    },
  },
};

type OnboardingDraft = {
  step: number;
  focusType: FocusType;
  enemSituation: EnemSituation;
  enemTriedBefore: 'sim' | 'nao' | null;
  enemPastAverage: number | '';
  enemGoalId: string;
  enemTargetCollege: string;
  enemTargetCourse: string;
  collegeName: string;
  courseName: string;
  semester: '1' | '2' | '3' | '4' | '5' | null;
  collegeFocus: CollegeFocus | null;
  otherFocus: OtherFocus | null;
  otherGoalTitle: string;
  goalDeadline: string;
  selectedSubjects: string[];
  manualSubjects: string[];
  concursoMeta: ConcursoMeta | null;
  customSubjects?: string[];
  profile: SmartScheduleProfile;
  selectedConcursoModelId: string;
};

const norm = (input?: string): string => (input || '').trim().toLowerCase();

const normalizeSubject = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

const isValidSubjectName = (value: string): boolean => {
  return value.trim().length >= MIN_SUBJECT_LEN;
};

const subjectExistsCaseInsensitive = (list: string[], candidate: string): boolean => {
  const normalizedCandidate = normalizeSubject(candidate);
  return list.some((item) => normalizeSubject(item) === normalizedCandidate);
};

const getFaculdadeCatalogSubjects = (course?: string): string[] => {
  return COURSE_CATALOG[norm(course)] || [];
};

const sanitizeLegacySubjects = (subjects: string[]): string[] => {
  return subjects
    .map((subject) => subject.trim())
    .filter(Boolean)
    .filter((subject) => !LEGACY_BLOCKED_SUBJECTS.has(subject));
};

const normalizeFocus = (input?: string): FocusType => {
  if (input === 'enem' || input === 'concurso' || input === 'faculdade' || input === 'outros') {
    return input;
  }

  return 'outros';
};

const resolveSubjectsByFocus = (selectedFocusRaw: string | undefined, formData: FormDataShape): string[] => {
  const selectedFocus = normalizeFocus(selectedFocusRaw);

  const fromSelected = (formData.selectedSubjects || []).map((subject) => subject.trim()).filter(Boolean);
  const fromManual = (formData.manualSubjects || []).map((subject) => subject.trim()).filter(Boolean);

  if (selectedFocus === 'concurso') {
    const concurso = CONCURSO_CATALOGO.find((item) => item.id === formData.concursoId);
    const legacyModel = CONCURSO_MODELS.find((item) => item.id === formData.concursoId);
    const byConcurso = (concurso?.subjects || legacyModel?.disciplinas || []).map((subject) => subject.trim()).filter(Boolean);

    // Se o usuário já ajustou manualmente, respeita a seleção dele como fonte principal.
    if (fromSelected.length > 0) {
      return Array.from(new Set([...fromSelected, ...fromManual]));
    }

    return Array.from(new Set([...byConcurso, ...fromManual]));
  }

  if (selectedFocus === 'faculdade' || selectedFocus === 'outros') {
    return Array.from(new Set(sanitizeLegacySubjects([...fromSelected, ...fromManual])));
  }

  return FOCUS_SUBJECT_MAP[selectedFocus] || FOCUS_SUBJECT_MAP.outros;
};

const getEnemGoal = (formData: FormDataShape): EnemGoalProfile | undefined => {
  return ENEM_GOALS.find((goal) => goal.id === formData.enemGoalId);
};

const enemDifficultyFromPeso = (peso?: number): DifficultyScale => {
  if (!peso || peso <= 1) return 1;
  if (peso === 2) return 2;
  if (peso === 3) return 3;
  if (peso === 4) return 4;
  return 5;
};

const resolveEnemSubjectsWithWeights = (
  formData: FormDataShape,
): Array<{ subject: EnemSubject; peso: number; difficulty: DifficultyScale }> => {
  const goal = getEnemGoal(formData);

  return ENEM_SUBJECTS.map((subject) => {
    const peso = goal?.pesos[subject] ?? 3;

    return {
      subject,
      peso,
      difficulty: enemDifficultyFromPeso(peso),
    };
  });
};

const enemPeso = (formData: FormDataShape, subject: EnemSubject): number => {
  const goal = getEnemGoal(formData);
  return goal?.pesos[subject] ?? 3;
};

const suggestedLevelFromPeso = (peso: number): LevelId => {
  if (peso >= 4) return 'improve';
  if (peso === 3) return 'ok';
  return 'good';
};

const getStepId = (focus: FocusType, stepIndex: number): StepId => {
  return FLOW_BY_FOCUS[focus][stepIndex] ?? 'contexto';
};

const buildDefaultLevelsByFocus = (): LevelsByFocus => {
  return {
    enem: Object.fromEntries(FOCUS_SUBJECT_MAP.enem.map((subject) => [subject, 'ok'])) as Record<string, LevelId>,
    concurso: Object.fromEntries(FOCUS_SUBJECT_MAP.concurso.map((subject) => [subject, 'ok'])) as Record<string, LevelId>,
    faculdade: Object.fromEntries(FOCUS_SUBJECT_MAP.faculdade.map((subject) => [subject, 'ok'])) as Record<string, LevelId>,
    outros: Object.fromEntries(FOCUS_SUBJECT_MAP.outros.map((subject) => [subject, 'ok'])) as Record<string, LevelId>,
  };
};

const safeParseLevelsByFocus = (raw: string | null): LevelsByFocus | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as LevelsByFocus;
  } catch {
    return null;
  }
};

const toDateInputString = (date = new Date()): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

type LocalStreak = {
  days: number;
  lastDay: string | null;
};

const readLocalStreak = (): LocalStreak => {
  try {
    const parsed = Number(window.localStorage.getItem(STREAK_DAYS_STORAGE_KEY) || '0');
    return {
      days: Number.isFinite(parsed) ? parsed : 0,
      lastDay: window.localStorage.getItem(STREAK_LAST_DAY_STORAGE_KEY),
    };
  } catch {
    return { days: 0, lastDay: null };
  }
};

const writeLocalStreak = (days: number, lastDay: string | null): void => {
  try {
    window.localStorage.setItem(STREAK_DAYS_STORAGE_KEY, String(days));
    if (lastDay) {
      window.localStorage.setItem(STREAK_LAST_DAY_STORAGE_KEY, lastDay);
    }
  } catch {
    // fallback local indisponível
  }
};

const pickMostRecentDay = (a?: string | null, b?: string | null): string | null => {
  if (!a) return b || null;
  if (!b) return a || null;
  return a > b ? a : b;
};

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  userName,
  initialDailyGoal,
  initialMethodId,
  onComplete,
  onStepProgressSave,
}) => {
  const storageKey = React.useMemo(
    () => `mdzOnboardingDraft_${(userName || 'default').trim().toLowerCase().replace(/\s+/g, '_')}`,
    [userName],
  );
  const hydratedRef = React.useRef(false);

  const [step, setStep] = React.useState(1);
  const [streakDays, setStreakDays] = React.useState<number>(0);
  const [goalDays] = React.useState<number>(7);
  const [selectedConcursoModelId, setSelectedConcursoModelId] = React.useState(DEFAULT_CONCURSO_MODEL_ID);
  const [concursoMeta, setConcursoMeta] = React.useState<ConcursoMeta | null>(null);
  const [focusType, setFocusType] = React.useState<FocusType>('enem');
  const [enemSituation, setEnemSituation] = React.useState<EnemSituation>('terceiro');
  const [enemTriedBefore, setEnemTriedBefore] = React.useState<'sim' | 'nao' | null>(null);
  const [enemPastAverage, setEnemPastAverage] = React.useState<number | ''>('');
  const [enemGoalId, setEnemGoalId] = React.useState('');
  const [enemTargetCollege, setEnemTargetCollege] = React.useState('');
  const [enemTargetCourse, setEnemTargetCourse] = React.useState('');
  const [collegeName, setCollegeName] = React.useState('');
  const [courseName, setCourseName] = React.useState('');
  const [collegeInput, setCollegeInput] = React.useState('');
  const [courseInput, setCourseInput] = React.useState('');
  const [semester, setSemester] = React.useState<'1' | '2' | '3' | '4' | '5' | null>(null);
  const [collegeFocus, setCollegeFocus] = React.useState<CollegeFocus | null>(null);
  const [otherFocus, setOtherFocus] = React.useState<OtherFocus | null>(null);
  const [otherGoalTitle, setOtherGoalTitle] = React.useState('');
  const [goalDeadline, setGoalDeadline] = React.useState('');
  const [manualInput, setManualInput] = React.useState('');
  const [editingSubject, setEditingSubject] = React.useState<string | null>(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [subjectError, setSubjectError] = React.useState('');
  const [subjectInfo, setSubjectInfo] = React.useState('');
  const [selectedSubjects, setSelectedSubjects] = React.useState<string[]>([]);
  const [manualSubjects, setManualSubjects] = React.useState<string[]>([]);
  const [catalogSubjects, setCatalogSubjects] = React.useState<string[]>([]);
  const [step3Subjects, setStep3Subjects] = React.useState<string[]>([]);
  const [levelsByFocus, setLevelsByFocus] = React.useState<LevelsByFocus>(() => buildDefaultLevelsByFocus());
  const saveTimerRef = React.useRef<number | null>(null);
  const [profile, setProfile] = React.useState<SmartScheduleProfile>(() => {
    const base = createDefaultSmartProfile();
    return {
      ...base,
      hoursPerDay: Math.max(1, Math.round((initialDailyGoal || 120) / 60)),
      studyStyle: initialMethodId === 'pomodoro' ? 'pomodoro_25_5' : base.studyStyle,
    };
  });

  const selectedConcursoModel = React.useMemo(
    () => CONCURSO_MODELS.find((model) => model.id === selectedConcursoModelId),
    [selectedConcursoModelId],
  );

  React.useEffect(() => {
    if (focusType === 'concurso') {
      setProfile((prev) => ({ ...prev, examName: 'CONCURSO' }));
      return;
    }

    setProfile((prev) => ({ ...prev, examName: 'ENEM' }));
  }, [focusType]);

  const progressPercent = Math.round((step / 4) * 100);
  const focusProfile = FOCUS_PROFILES[focusType];
  const todayDateStr = toDateInputString();
  const examDateInPast = Boolean(profile.examDate) && profile.examDate < todayDateStr;
  const goalDeadlineInPast = Boolean(goalDeadline) && goalDeadline < todayDateStr;
  const weeklyHours = React.useMemo(
    () => profile.availableWeekDays.length * Math.max(0, Number(profile.hoursPerDay) || 0),
    [profile.availableWeekDays.length, profile.hoursPerDay],
  );

  const weeklyFeedback = React.useMemo(() => {
    if (weeklyHours >= 15) {
      return focusProfile.step2.impactLabels.high;
    }

    if (weeklyHours >= 9) {
      return focusProfile.step2.impactLabels.mid;
    }

    if (weeklyHours >= 4) {
      return focusProfile.step2.impactLabels.low;
    }

    return focusProfile.step2.impactLabels.low;
  }, [weeklyHours, focusProfile]);

  const reachedRecommendedCap = profile.availableWeekDays.length >= MAX_SELECTED_DAYS;
  const limitBoxClass = reachedRecommendedCap ? 'hint-neutral-success' : 'hint-warning';
  const limitBoxText = reachedRecommendedCap
    ? 'Perfeito: manter 1 dia livre ajuda na recuperação e na consistência 👌'
    : 'Reserve 1 dia de descanso para manter consistência no longo prazo.';

  const progressLabels: Record<number, string> = {
    1: 'Seu plano está 25% pronto',
    2: 'Seu plano está 50% pronto',
    3: 'Seu plano está 75% pronto',
    4: 'Seu plano está 100% pronto',
  };

  const canShowGoalSummary = Boolean(profile.examDate) && Number(profile.desiredScore) > 0;

  const requiredPastAverage = focusType === 'enem' && enemTriedBefore === 'sim';
  const hasPastAverage = requiredPastAverage ? Number(enemPastAverage) >= 0 : true;
  const canContinueFromContext = React.useMemo(() => {
    if (focusType === 'faculdade' || focusType === 'outros') {
      return sanitizeLegacySubjects([...selectedSubjects, ...manualSubjects]).length > 0;
    }

    return true;
  }, [focusType, selectedSubjects, manualSubjects]);

  const isStepValid = React.useMemo(() => {
    if (step === 1) {
      const hasFocus = Boolean(focusType);

      if (!hasFocus) return false;

      if (focusType === 'enem') {
        const hasDate = Boolean(profile.examDate);
        const hasScore = Number(profile.desiredScore) > 0;
        return hasDate && !examDateInPast && hasScore && Boolean(enemTriedBefore) && hasPastAverage;
      }

      if (focusType === 'concurso') {
        const hasDate = Boolean(profile.examDate);
        const hasScore = Number(profile.desiredScore) > 0;
        return hasDate && !examDateInPast && hasScore && Boolean(selectedConcursoModelId);
      }

      if (focusType === 'faculdade') {
        return Boolean(collegeName.trim())
          && Boolean(courseName.trim())
          && Boolean(semester)
          && Boolean(collegeFocus)
          && canContinueFromContext;
      }

      if (focusType === 'outros') {
        return Boolean(otherFocus) && Boolean(otherGoalTitle.trim()) && !goalDeadlineInPast && canContinueFromContext;
      }

      return true;
    }

    if (step === 2) {
      return profile.availableWeekDays.length > 0 && profile.hoursPerDay >= 1;
    }

    return true;
  }, [
    step,
    profile.examDate,
    profile.desiredScore,
    profile.availableWeekDays.length,
    profile.hoursPerDay,
    focusType,
    enemTriedBefore,
    hasPastAverage,
    selectedConcursoModelId,
    collegeName,
    courseName,
    semester,
    collegeFocus,
    otherFocus,
    otherGoalTitle,
    examDateInPast,
    goalDeadlineInPast,
    canContinueFromContext,
  ]);

  React.useEffect(() => {
    if (hydratedRef.current) return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        hydratedRef.current = true;
        return;
      }

      const draft = JSON.parse(raw) as OnboardingDraft;
      if (draft.step >= 1 && draft.step <= 4) setStep(draft.step);
      if (draft.focusType) setFocusType(draft.focusType);
      if (draft.enemSituation) setEnemSituation(draft.enemSituation);
      setEnemTriedBefore(draft.enemTriedBefore ?? null);
      setEnemPastAverage(draft.enemPastAverage ?? '');
      setEnemGoalId(draft.enemGoalId ?? '');
      setEnemTargetCollege(draft.enemTargetCollege ?? '');
      setEnemTargetCourse(draft.enemTargetCourse ?? '');
      setCollegeName(draft.collegeName ?? '');
      setCourseName(draft.courseName ?? '');
      setSemester(draft.semester ?? null);
      setCollegeFocus(draft.collegeFocus ?? null);
      setOtherFocus(draft.otherFocus ?? null);
      setOtherGoalTitle(draft.otherGoalTitle ?? '');
      setGoalDeadline(draft.goalDeadline ?? '');
      const legacyCustom = draft.customSubjects ?? [];
      setManualSubjects(draft.manualSubjects ?? legacyCustom);
      setSelectedSubjects(draft.selectedSubjects ?? legacyCustom);
      setConcursoMeta(draft.concursoMeta ?? null);
      const savedConcursoId = draft.selectedConcursoModelId || DEFAULT_CONCURSO_MODEL_ID;
      const hasCatalogMatch = CONCURSO_CATALOGO.some((item) => item.id === savedConcursoId);
      const hasLegacyMatch = CONCURSO_MODELS.some((item) => item.id === savedConcursoId);
      setSelectedConcursoModelId((hasCatalogMatch || hasLegacyMatch) ? savedConcursoId : DEFAULT_CONCURSO_MODEL_ID);
      if (draft.profile) setProfile(draft.profile);
    } catch {
      // ignora draft inválido
    } finally {
      hydratedRef.current = true;
    }
  }, [storageKey]);

  React.useEffect(() => {
    let cancelled = false;

    const loadStreak = async () => {
      const local = readLocalStreak();
      if (!cancelled) {
        setStreakDays(local.days);
      }

      try {
        const cloudStreak = await mvpApiService.getOnboardingStreak();
        const cloudDays = Number(cloudStreak.days ?? 0);
        const cloudLast = cloudStreak.lastDay
          ? new Date(cloudStreak.lastDay).toISOString().slice(0, 10)
          : null;

        const mergedDays = Math.max(local.days || 0, Number.isFinite(cloudDays) ? cloudDays : 0);
        const mergedLast = pickMostRecentDay(local.lastDay, cloudLast);

        writeLocalStreak(mergedDays, mergedLast);
        if (!cancelled) {
          setStreakDays(mergedDays);
        }
      } catch {
        // fallback local permanece ativo
      }
    };

    void loadStreak();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    setCollegeInput(collegeName || '');
  }, [collegeName]);

  React.useEffect(() => {
    setCourseInput(courseName || '');
  }, [courseName]);

  React.useEffect(() => {
    if (!hydratedRef.current) return;

    const draft: OnboardingDraft = {
      step,
      focusType,
      enemSituation,
      enemTriedBefore,
      enemPastAverage,
      enemGoalId,
      enemTargetCollege,
      enemTargetCourse,
      collegeName,
      courseName,
      semester,
      collegeFocus,
      otherFocus,
      otherGoalTitle,
      goalDeadline,
      selectedSubjects,
      manualSubjects,
      concursoMeta,
      profile,
      selectedConcursoModelId,
    };

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(draft));
      } catch {
        // storage indisponível/cheio
      }

      onStepProgressSave?.({
        step,
        focusType,
        smartProfile: profile,
      });
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    step,
    focusType,
    enemSituation,
    enemTriedBefore,
    enemPastAverage,
    enemGoalId,
    enemTargetCollege,
    enemTargetCourse,
    collegeName,
    courseName,
    semester,
    collegeFocus,
    otherFocus,
    otherGoalTitle,
    goalDeadline,
    selectedSubjects,
    manualSubjects,
    concursoMeta,
    profile,
    selectedConcursoModelId,
    storageKey,
    onStepProgressSave,
  ]);

  React.useEffect(() => {
    const parsed = safeParseLevelsByFocus(window.localStorage.getItem(STEP3_LEVELS_STORAGE_KEY));
    if (!parsed) return;

    setLevelsByFocus((prev) => ({
      ...prev,
      ...parsed,
    }));
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STEP3_LEVELS_STORAGE_KEY, JSON.stringify(levelsByFocus));
    } catch {
      // storage indisponível/cheio
    }
  }, [levelsByFocus]);

  React.useEffect(() => {
    trackEvent('step_view', {
      flow: 'onboarding_plano_inteligente',
      step,
      focusType,
    });
  }, [step, focusType]);

  React.useEffect(() => {
    trackEvent('focus_profile_applied', {
      focus: focusType,
      tone: focusProfile.tone,
      timestamp: new Date().toISOString(),
    });
  }, [focusType, focusProfile.tone]);

  const handleContinue = () => {
    if (!isStepValid || step >= 4) return;

    trackEvent('step_complete', {
      flow: 'onboarding_plano_inteligente',
      step,
      focusType,
    });

    onStepProgressSave?.({
      step,
      focusType,
      smartProfile: profile,
    });

    setStep((previous) => Math.min(4, previous + 1));
  };

  const stepFeedback = React.useMemo(() => {
    if (step === 1) return focusProfile.greenBoxMessages.step1;
    if (step === 2) return focusProfile.greenBoxMessages.step2;
    if (step === 3) return focusProfile.greenBoxMessages.step3;
    return null;
  }, [step, focusProfile]);

  const step3Copy = React.useMemo(() => FOCUS_COPY_MAP[focusType], [focusType]);
  const stepId = React.useMemo(() => getStepId(focusType, Math.max(0, step - 1)), [focusType, step]);

  const formData = React.useMemo<FormDataShape>(() => {
    return {
      focus: focusType,
      course: courseName,
      concursoId: selectedConcursoModelId,
      concursoMeta,
      enemGoalId,
      enemTargetCollege,
      enemTargetCourse,
      selectedSubjects,
      manualSubjects,
    };
  }, [
    focusType,
    courseName,
    selectedConcursoModelId,
    concursoMeta,
    enemGoalId,
    enemTargetCollege,
    enemTargetCourse,
    selectedSubjects,
    manualSubjects,
  ]);

  const focus = normalizeFocus(formData.focus);
  const courseKey = (formData.course || '').trim().toLowerCase();
  const concursoSelecionado = React.useMemo(
    () => CONCURSO_CATALOGO.find((item) => item.id === selectedConcursoModelId),
    [selectedConcursoModelId],
  );

  React.useEffect(() => {
    if (!concursoSelecionado) return;

    setConcursoMeta((prev) => {
      if (
        prev
        && prev.id === concursoSelecionado.id
        && prev.banca === concursoSelecionado.banca
        && prev.area === concursoSelecionado.area
        && prev.nome === concursoSelecionado.label
      ) {
        return prev;
      }

      return {
        id: concursoSelecionado.id,
        nome: concursoSelecionado.label,
        banca: concursoSelecionado.banca,
        area: concursoSelecionado.area,
      };
    });
  }, [concursoSelecionado]);

  const step3SourceKey = `${focus}::${courseKey}`;
  const resolvedSubjects = React.useMemo(() => {
    return resolveSubjectsByFocus(formData.focus, formData);
  }, [formData.focus, formData.course, formData.selectedSubjects, formData.manualSubjects]);

  const enemGoalProfile = React.useMemo(() => getEnemGoal(formData), [formData]);

  const enemWeightedSubjects = React.useMemo(
    () => (focusType === 'enem' ? resolveEnemSubjectsWithWeights(formData) : []),
    [focusType, formData],
  );

  React.useEffect(() => {
    if (focusType !== 'enem') return;
    if (!enemGoalId) return;

    setLevelsByFocus((prev) => {
      const nextEnem = { ...(prev.enem || {}) };

      enemWeightedSubjects.forEach(({ subject, peso }) => {
        if (nextEnem[subject] === undefined || nextEnem[subject] === 'ok') {
          nextEnem[subject] = suggestedLevelFromPeso(peso);
        }
      });

      return {
        ...prev,
        enem: nextEnem,
      };
    });
  }, [focusType, enemGoalId, enemWeightedSubjects]);

  React.useEffect(() => {
    if (focusType !== 'faculdade') {
      setCatalogSubjects([]);
      return;
    }

    setCatalogSubjects(getFaculdadeCatalogSubjects(courseName));
  }, [focusType, courseName]);

  const suggestions = React.useMemo(() => {
    if (focusType !== 'faculdade') return [];
    return getFaculdadeCatalogSubjects(courseName);
  }, [focusType, courseName]);

  React.useEffect(() => {
    if (focusType !== 'faculdade' && focusType !== 'outros') return;

    setSelectedSubjects((prev) => {
      const cleaned = sanitizeLegacySubjects(prev);
      return cleaned.join('|') === prev.join('|') ? prev : cleaned;
    });

    setManualSubjects((prev) => {
      const cleaned = sanitizeLegacySubjects(prev);
      return cleaned.join('|') === prev.join('|') ? prev : cleaned;
    });
  }, [focusType]);

  React.useEffect(() => {
    if (subjectError) setSubjectError('');
    if (subjectInfo) setSubjectInfo('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualInput]);

  React.useEffect(() => {
    const nextSubjects = (focusType === 'faculdade' || focusType === 'outros')
      ? sanitizeLegacySubjects(resolvedSubjects)
      : resolvedSubjects;

    setStep3Subjects(nextSubjects);
  }, [step3SourceKey, resolvedSubjects, focusType]);

  React.useEffect(() => {
    setLevelsByFocus((prev) => ({
      ...prev,
      [focus]: prev[focus] || {},
    }));
  }, [focus]);

  const toggleSelectedSubject = (subject: string) => {
    setSelectedSubjects((prev) => {
      const exists = prev.includes(subject);

      if (exists) {
        return prev.filter((item) => item !== subject);
      }

      if (focusType === 'faculdade' && prev.length >= FACULDADE_MAX_SELECTED) {
        return prev;
      }

      return [...prev, subject];
    });
  };

  const addSubject = (rawSubject: string): boolean => {
    const value = rawSubject.trim();

    if (!isValidSubjectName(value)) {
      setSubjectError(`A disciplina deve ter pelo menos ${MIN_SUBJECT_LEN} caracteres.`);
      return false;
    }

    const mergedSubjects = [...manualSubjects, ...selectedSubjects];
    if (subjectExistsCaseInsensitive(mergedSubjects, value)) {
      setSubjectError('Essa disciplina já foi adicionada.');
      return false;
    }

    setManualSubjects((prev) => {
      return [...prev, value];
    });

    setSelectedSubjects((prev) => {
      if (focusType === 'faculdade' && prev.length >= FACULDADE_MAX_SELECTED) return prev;
      return [...prev, value];
    });

    setSubjectError('');
    setSubjectInfo('Disciplina adicionada com sucesso.');
    return true;
  };

  const addManualSubject = () => {
    const ok = addSubject(manualInput);
    if (ok) setManualInput('');
  };

  const startEditSubject = (subject: string) => {
    setEditingSubject(subject);
    setEditingValue(subject);
  };

  const saveEditSubject = () => {
    const oldName = editingSubject;
    const nextName = editingValue.trim();

    if (!oldName) {
      return;
    }

    if (!isValidSubjectName(nextName)) {
      setSubjectError(`A disciplina deve ter pelo menos ${MIN_SUBJECT_LEN} caracteres.`);
      return;
    }

    const listWithoutCurrent = manualSubjects.filter((item) => item !== oldName);
    if (subjectExistsCaseInsensitive(listWithoutCurrent, nextName)) {
      setSubjectError('Já existe outra disciplina com esse nome.');
      return;
    }

    setManualSubjects((prev) => prev.map((item) => (item === oldName ? nextName : item)));
    setSelectedSubjects((prev) => prev.map((item) => (item === oldName ? nextName : item)));

    setEditingSubject(null);
    setEditingValue('');
    setSubjectError('');
    setSubjectInfo('Disciplina atualizada com sucesso.');
  };

  const removeManualSubject = (subject: string) => {
    setManualSubjects((prev) => prev.filter((item) => item !== subject));
    setSelectedSubjects((prev) => prev.filter((item) => item !== subject));
  };

  const importSuggestions = () => {
    suggestions.forEach((subject) => addSubject(subject));
  };

  const setDifficulty = (subject: string, level: DifficultyLevel) => {
    const levelId = difficultyToLevelId(level);

    setLevelsByFocus((prev) => ({
      ...prev,
      [focusType]: {
        ...(prev[focusType] || {}),
        [subject]: levelId,
      },
    }));

    setProfile((prev) => ({
      ...prev,
      subjectDifficulty: {
        ...prev.subjectDifficulty,
        [subject]: level,
      },
      subjectWeight: {
        ...prev.subjectWeight,
        [subject]: difficultyWeight[level],
      },
    }));
  };

  const difficultyToLevelId = (difficulty: DifficultyLevel): LevelId => {
    if (difficulty === 'fraco') return 'improve';
    if (difficulty === 'medio') return 'ok';
    return 'good';
  };

  const levelIdToDifficulty = (levelId: LevelId): DifficultyLevel => {
    return LEVELS.find((level) => level.id === levelId)?.difficulty || 'medio';
  };

  const toggleWeekDay = (weekDay: number) => {
    setProfile((prev) => {
      const has = prev.availableWeekDays.includes(weekDay);

      if (!has && prev.availableWeekDays.length >= MAX_SELECTED_DAYS) {
        return prev;
      }

      const next = has
        ? prev.availableWeekDays.filter((item) => item !== weekDay)
        : [...prev.availableWeekDays, weekDay].sort((a, b) => a - b);

      return {
        ...prev,
        availableWeekDays: next.length > 0 ? next : prev.availableWeekDays,
      };
    });
  };

  const persistStreakToCloud = React.useCallback(async (streak: { days: number; lastDay: string | null }) => {
    try {
      await mvpApiService.saveOnboardingStreak({
        days: streak.days,
        lastDay: streak.lastDay,
      });
    } catch {
      // fallback local permanece ativo
    }
  }, []);

  const completeTodayStreakAndPersist = React.useCallback((): { days: number; lastDay: string | null } => {
    const today = new Date().toISOString().slice(0, 10);
    const local = readLocalStreak();

    if (local.lastDay === today) {
      return { days: local.days || 0, lastDay: today };
    }

    const next = Math.min((local.days || 0) + 1, goalDays);
    writeLocalStreak(next, today);
    setStreakDays(next);

    return { days: next, lastDay: today };
  }, [goalDays]);

  const finish = () => {
    const methodId = profile.studyStyle === 'pomodoro_25_5' ? 'pomodoro' : 'livre';

    // Keep only the active track subjects in the saved profile to avoid stale ENEM/Concurso mixing.
    const normalizedSubjectDifficulty: Record<string, DifficultyLevel> = {};
    const normalizedSubjectWeight: Record<string, number> = {};
    const activeSubjects = step3Subjects;

    activeSubjects.forEach((subject) => {
      const level = levelIdToDifficulty(levelBySubject[subject] || 'ok');
      const enemBoost = focusType === 'enem' && ENEM_SUBJECTS.includes(subject as EnemSubject)
        ? (enemPeso(formData, subject as EnemSubject) - 3) * 5
        : 0;
      normalizedSubjectDifficulty[subject] = level;
      normalizedSubjectWeight[subject] = Math.max(5, difficultyWeight[level] + enemBoost);
    });

    let simulationIntervalWeeks = profile.simulationIntervalWeeks;
    let adjustedHoursPerDay = profile.hoursPerDay;

    if (focusType === 'enem') {
      if (enemSituation === 'base') {
        simulationIntervalWeeks = 4;
      }

      if (enemSituation === 'terceiro') {
        simulationIntervalWeeks = 2;
      }

      if (enemSituation === 'repetente' || enemSituation === 'concluiu') {
        simulationIntervalWeeks = 1;
        adjustedHoursPerDay = Math.max(2, profile.hoursPerDay);
      }

      if (enemTriedBefore === 'sim' && typeof enemPastAverage === 'number') {
        const scoreGap = profile.desiredScore - enemPastAverage;
        if (scoreGap >= 120) {
          adjustedHoursPerDay = Math.min(8, adjustedHoursPerDay + 1);
        }
      }
    }

    if (focusType === 'faculdade') {
      if (collegeFocus === 'provas') simulationIntervalWeeks = 2;
      if (collegeFocus === 'trabalhos') simulationIntervalWeeks = 3;
      if (collegeFocus === 'rotina') simulationIntervalWeeks = 4;
    }

    if (focusType === 'outros') {
      if (otherFocus === 'leitura') {
        adjustedHoursPerDay = Math.min(adjustedHoursPerDay, 2);
        simulationIntervalWeeks = 4;
      }

      if (otherFocus === 'novo_aprendizado') {
        simulationIntervalWeeks = 2;
      }
    }

    const dailyGoal = adjustedHoursPerDay * 60;

    const streak = completeTodayStreakAndPersist();

    trackEvent('step_complete', {
      flow: 'onboarding_plano_inteligente',
      step: 4,
      focusType,
    });

    trackEvent('plan_generated', {
      flow: 'onboarding_plano_inteligente',
      focusType,
      examName: profile.examName,
      dailyGoal,
    });

    if (streak.days >= goalDays) {
      trackEvent('weekly_streak_goal_reached', {
        flow: 'onboarding_plano_inteligente',
        goalDays,
        streakDays: streak.days,
        focusType,
      });
    }

    void persistStreakToCloud(streak);

    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // storage indisponível
    }

    onComplete({
      dailyGoal,
      methodId,
      onboardingMeta: {
        focus: focusType,
        concurso: focusType === 'concurso' ? concursoMeta : null,
        enem: focusType === 'enem'
          ? {
            goalId: enemGoalId || null,
            targetCollege: enemTargetCollege || null,
            targetCourse: enemTargetCourse || null,
          }
          : null,
      },
      smartProfile: {
        ...profile,
        examDate: goalDeadline || profile.examDate,
        simulationIntervalWeeks,
        hoursPerDay: adjustedHoursPerDay,
        subjectDifficulty: normalizedSubjectDifficulty,
        subjectWeight: normalizedSubjectWeight,
      },
    });
  };

  const summaryCards = React.useMemo<SummaryCard[]>(() => focusProfile.finalCards, [focusProfile]);

  const currentLevelsByFocus = React.useMemo(() => levelsByFocus[focusType] || {}, [levelsByFocus, focusType]);

  const levelBySubject = React.useMemo(() => {
    return step3Subjects.reduce<Record<string, LevelId>>((acc, subject) => {
      acc[subject] = currentLevelsByFocus[subject] || 'ok';
      return acc;
    }, {});
  }, [step3Subjects, currentLevelsByFocus]);

  const highPrioritySubjects = React.useMemo(
    () => step3Subjects.filter((subject) => levelBySubject[subject] === 'improve'),
    [step3Subjects, levelBySubject],
  );

  const maintenanceSubjects = React.useMemo(
    () => step3Subjects.filter((subject) => levelBySubject[subject] !== 'improve'),
    [step3Subjects, levelBySubject],
  );

  const totalSubjects = step3Subjects.length || 1;
  const improvementPct = Math.round((highPrioritySubjects.length / totalSubjects) * 100);
  const reviewPct = 100 - improvementPct;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div
          className="p-5 text-white"
          style={{ backgroundImage: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}
        >
          <p className="text-xs uppercase tracking-wider opacity-90">MVP SaaS • Cronograma Inteligente</p>
          <h2 className="text-2xl font-bold mt-1 inline-flex items-center gap-2"><Hand className="w-5 h-5" /> Bem-vindo(a), {userName || 'estudante'}</h2>
          <p className="text-sm opacity-95 mt-1">{focusProfile.header.title}</p>
          <p className="text-sm opacity-90 mt-1">{focusProfile.header.subtitle}</p>
          <p className="text-xs opacity-90 mt-1">Leva menos de 1 minuto.</p>
        </div>

        <div className="px-5 pt-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex-1">
                <div
                  className={`h-2 rounded-full ${item <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                  style={item <= step ? { backgroundColor: 'var(--color-primary)' } : undefined}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Passo {step} de 4</p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{progressLabels[step]}</p>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%`, backgroundColor: 'var(--color-primary)' }}
            />
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {stepId === 'contexto' && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white inline-flex items-center gap-2"><Target className="w-4 h-4" /> 1) Vamos montar seu contexto</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Preencha apenas os dados do foco que você escolheu.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { id: 'enem', label: 'ENEM', icon: GraduationCap, desc: 'Plano com foco em aprovação e alta nota' },
                  { id: 'concurso', label: 'Concurso', icon: Landmark, desc: 'Plano baseado no edital e disciplinas' },
                  { id: 'faculdade', label: 'Faculdade', icon: BookOpen, desc: 'Organize provas, trabalhos e rotina' },
                  { id: 'outros', label: 'Outros', icon: Globe2, desc: 'Idiomas, leitura ou aprendizado pessoal' },
                ].map((item) => {
                  const Icon = item.icon;
                  const selected = focusType === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFocusType(item.id as FocusType)}
                      className={`text-left rounded-xl border px-3 py-3 transition-all ${
                        selected
                          ? 'text-white border-transparent shadow-lg'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100'
                      }`}
                      style={selected ? { backgroundImage: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' } : undefined}
                    >
                      <p className="text-sm font-semibold inline-flex items-center gap-2"><Icon className="w-4 h-4" /> {item.label}</p>
                      <p className={`text-xs mt-1 ${selected ? 'text-white/90' : 'text-gray-500 dark:text-gray-300'}`}>{item.desc}</p>
                    </button>
                  );
                })}
              </div>

              {(focusType === 'enem' || focusType === 'concurso') && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Defina seu objetivo para montarmos um plano estratégico com base no tempo até a prova e na sua meta.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Tipo de prova</label>
                      <select
                        value={profile.examName}
                        onChange={(event) => {
                          const nextExamName = event.target.value as SmartScheduleProfile['examName'];
                          setFocusType(nextExamName === 'CONCURSO' ? 'concurso' : 'enem');
                          if (nextExamName === 'CONCURSO' && !selectedConcursoModelId && DEFAULT_CONCURSO_MODEL_ID) {
                            setSelectedConcursoModelId(DEFAULT_CONCURSO_MODEL_ID);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                      >
                        <option value="ENEM">ENEM</option>
                        <option value="CONCURSO">Concurso</option>
                      </select>
                    </div>

                    {profile.examName === 'CONCURSO' && (
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Carreira / edital de referência</label>
                        <select
                          value={selectedConcursoModelId}
                          onChange={(event) => {
                            const concursoId = event.target.value;
                            const concurso = CONCURSO_CATALOGO.find((item) => item.id === concursoId);
                            const legacyModel = CONCURSO_MODELS.find((item) => item.id === concursoId);

                            setSelectedConcursoModelId(concursoId);
                            setConcursoMeta(concurso
                              ? { id: concurso.id, nome: concurso.label, banca: concurso.banca, area: concurso.area }
                              : null);
                            setSelectedSubjects(concurso ? [...concurso.subjects] : [...(legacyModel?.disciplinas || [])]);

                            trackEvent('onboarding_concurso_selected', {
                              flow: 'onboarding_plano_inteligente',
                              concursoId,
                              concursoLabel: concurso?.label || legacyModel?.nome || null,
                              banca: concurso?.banca || legacyModel?.banca || null,
                              area: concurso?.area || null,
                            });
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                        >
                          {CONCURSO_CATALOGO.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        {selectedConcursoModel && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {selectedConcursoModel.category} • {selectedConcursoModel.disciplinas.length} disciplinas mapeadas.
                          </p>
                        )}

                        {concursoSelecionado && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {concursoSelecionado.area} • {concursoSelecionado.subjects.length} disciplinas mapeadas.
                          </p>
                        )}

                        {concursoSelecionado && (
                          <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 p-2">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Disciplinas do concurso</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {resolveSubjectsByFocus('concurso', {
                                focus: 'concurso',
                                concursoId: selectedConcursoModelId,
                                selectedSubjects,
                                manualSubjects,
                              }).map((subject) => {
                                const active = selectedSubjects.includes(subject);

                                return (
                                  <button
                                    key={subject}
                                    type="button"
                                    onClick={() => toggleSelectedSubject(subject)}
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                                      active
                                        ? 'text-white border-transparent'
                                        : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                                    }`}
                                    style={active ? { backgroundColor: 'var(--color-primary)' } : undefined}
                                  >
                                    {subject}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Data da prova</label>
                      <input
                        type="date"
                        value={profile.examDate}
                        onChange={(event) => setProfile((prev) => ({ ...prev, examDate: event.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                      />
                      {examDateInPast && (
                        <p className="text-[11px] text-red-600 dark:text-red-400">Use uma data de hoje em diante.</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Nota desejada (0 a 1000)</label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={profile.desiredScore}
                        onChange={(event) => setProfile((prev) => ({ ...prev, desiredScore: Number(event.target.value || 700) }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                        placeholder="Ex: 780"
                      />
                    </div>
                  </div>
                </>
              )}

              {focusType === 'enem' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Objetivo ENEM (sugestão de perfil)</label>
                  <select
                    value={enemGoalId}
                    onChange={(event) => {
                      const goalId = event.target.value;
                      const goal = ENEM_GOALS.find((item) => item.id === goalId);

                      setEnemGoalId(goalId);

                      if (goal) {
                        setEnemTargetCollege(goal.faculdade);
                        setEnemTargetCourse(goal.curso);
                      }

                      trackEvent('onboarding_enem_goal_selected', {
                        flow: 'onboarding_plano_inteligente',
                        goalId: goalId || null,
                        faculdade: goal?.faculdade || null,
                        curso: goal?.curso || null,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  >
                    <option value="">Selecione uma meta sugerida</option>
                    {ENEM_GOALS.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.faculdade} · {goal.curso}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Faculdade desejada (opcional)</label>
                      <input
                        type="text"
                        value={enemTargetCollege}
                        onChange={(event) => setEnemTargetCollege(event.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                        placeholder="Ex: USP"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Curso desejado (opcional)</label>
                      <input
                        type="text"
                        value={enemTargetCourse}
                        onChange={(event) => setEnemTargetCourse(event.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                        placeholder="Ex: Medicina"
                      />
                    </div>
                  </div>

                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Situação escolar</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { id: 'base', label: 'Base (1º e 2º ano)' },
                      { id: 'terceiro', label: '3º ano' },
                      { id: 'repetente', label: 'Repetente' },
                      { id: 'concluiu', label: 'Já concluí' },
                    ].map((item) => {
                      const selected = enemSituation === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setEnemSituation(item.id as EnemSituation)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${selected ? 'text-white border-transparent shadow-md' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                          style={selected ? { backgroundColor: 'var(--color-primary)' } : undefined}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Você já fez o ENEM antes?</label>
                  <div className="flex gap-2">
                    {(['sim', 'nao'] as const).map((item) => {
                      const selected = enemTriedBefore === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setEnemTriedBefore(item)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${selected ? 'text-white border-transparent shadow-md' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                          style={selected ? { backgroundColor: 'var(--color-primary)' } : undefined}
                        >
                          {item === 'sim' ? 'Sim' : 'Não'}
                        </button>
                      );
                    })}
                  </div>

                  {enemTriedBefore === 'sim' && (
                    <div className="space-y-1 max-w-xs">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Média aproximada no último ENEM</label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={enemPastAverage}
                        onChange={(event) => setEnemPastAverage(event.target.value === '' ? '' : Number(event.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                        placeholder="Ex: 640"
                      />
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Se não lembrar exatamente, use uma estimativa.</p>
                    </div>
                  )}
                </div>
              )}

              {focusType === 'faculdade' && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 dark:text-gray-200 font-semibold">Faculdade · Conte sobre sua graduação</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Vamos personalizar seu plano pela sua faculdade e rotina real.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Nome da faculdade</label>
                      <input
                        type="text"
                        value={collegeInput}
                        onChange={(event) => setCollegeInput(event.target.value)}
                        onBlur={() => {
                          const nextValue = collegeInput.trim();
                          setCollegeName(nextValue);
                          setCollegeInput(nextValue);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                        placeholder="Ex: Universidade Federal do Ceará"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Seu curso</label>
                      <input
                        type="text"
                        value={courseInput}
                        onChange={(event) => setCourseInput(event.target.value)}
                        onBlur={() => {
                          const nextValue = courseInput.trim();
                          setCourseName(nextValue);
                          setCourseInput(nextValue);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                        placeholder="Ex: Engenharia de Software"
                      />
                    </div>
                  </div>

                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Período atual</label>
                  <div className="grid grid-cols-5 gap-2 max-w-md">
                    {[
                      { id: '1', label: '1º' },
                      { id: '2', label: '2º' },
                      { id: '3', label: '3º' },
                      { id: '4', label: '4º' },
                      { id: '5', label: '5º+' },
                    ].map((item) => {
                      const selected = semester === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSemester(item.id as '1' | '2' | '3' | '4' | '5')}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${selected ? 'text-white border-transparent shadow-md' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                          style={selected ? { backgroundColor: 'var(--color-primary)' } : undefined}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Foco principal agora</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[
                      { id: 'provas', label: '📚 Provas' },
                      { id: 'trabalhos', label: '📝 Trabalhos' },
                      { id: 'rotina', label: '⏰ Organização da rotina' },
                    ].map((item) => {
                      const selected = collegeFocus === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCollegeFocus(item.id as CollegeFocus)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${selected ? 'text-white border-transparent shadow-md' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                          style={selected ? { backgroundColor: 'var(--color-primary)' } : undefined}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {focusType === 'outros' && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 dark:text-gray-200 font-semibold">Outros · Defina seu objetivo pessoal</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Vamos montar um plano no seu ritmo, com foco no que você quer evoluir.</p>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Objetivo principal</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[
                      { id: 'idiomas', label: '🌍 Idiomas' },
                      { id: 'leitura', label: '📖 Leitura' },
                      { id: 'novo_aprendizado', label: '🧠 Aprender algo novo' },
                    ].map((item) => {
                      const selected = otherFocus === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setOtherFocus(item.id as OtherFocus)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${selected ? 'text-white border-transparent shadow-md' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                          style={selected ? { backgroundColor: 'var(--color-primary)' } : undefined}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Qual objetivo específico?</label>
                      <input
                        type="text"
                        value={otherGoalTitle}
                        onChange={(event) => setOtherGoalTitle(event.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                        placeholder="Ex: falar inglês com confiança"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Prazo (opcional)</label>
                      <input
                        type="date"
                        value={goalDeadline}
                        onChange={(event) => setGoalDeadline(event.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                      />
                      {goalDeadlineInPast && (
                        <p className="text-[11px] text-red-600 dark:text-red-400">Prazo não pode estar no passado.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(focusType === 'faculdade' || focusType === 'outros') && (
                <div className="space-y-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-3">
                  <p className="text-sm text-gray-700 dark:text-gray-200 font-semibold">📚 Disciplinas do seu plano</p>

                  {focusType === 'faculdade' && suggestions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={importSuggestions}
                        className="px-3 py-2 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      >
                        Importar disciplinas sugeridas do curso
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(event) => setManualInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          const ok = addSubject(manualInput);
                          if (ok) setManualInput('');
                        }
                      }}
                      placeholder={focusType === 'faculdade' ? 'Adicionar disciplina (ex: Estrutura de Dados)' : 'Adicionar conteúdo (ex: Inglês, Programação)'}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                    />
                    <button
                      type="button"
                      onClick={addManualSubject}
                      className="px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    >
                      + Adicionar
                    </button>
                  </div>

                  {subjectError ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{subjectError}</p>
                  ) : subjectInfo ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">{subjectInfo}</p>
                  ) : null}

                  {manualSubjects.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Nenhuma disciplina adicionada ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {manualSubjects.map((subject) => (
                        <div key={subject} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2">
                          {editingSubject === subject ? (
                            <input
                              value={editingValue}
                              onChange={(event) => setEditingValue(event.target.value)}
                              onBlur={saveEditSubject}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') saveEditSubject();
                              }}
                              autoFocus
                              className="flex-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                            />
                          ) : (
                            <span className="text-sm text-gray-700 dark:text-gray-200">{subject}</span>
                          )}

                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => startEditSubject(subject)} className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600">✏️</button>
                            <button type="button" onClick={() => removeManualSubject(subject)} className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600">🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {canShowGoalSummary && (
                <div className="rounded-xl border border-blue-100 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 p-3">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Com base nisso, vamos calcular:</p>
                  <ul className="mt-2 space-y-1 text-xs text-blue-900 dark:text-blue-100">
                    <li>• Quantas horas você precisa estudar por semana</li>
                    <li>• Quais matérias priorizar primeiro</li>
                    <li>• Seu cronograma diário automático</li>
                  </ul>
                </div>
              )}

              {stepFeedback && (
                <div className="rounded-xl border border-emerald-100 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20 p-3">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Plano ficando cada vez mais personalizado</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">{stepFeedback}</p>
                </div>
              )}
            </div>
          )}

          {stepId === 'ritmo' && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white inline-flex items-center gap-2"><CalendarDays className="w-4 h-4" /> 2) Seu ritmo de estudo</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {focusProfile.step2.subtitle}
              </p>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((day) => {
                  const selected = profile.availableWeekDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleWeekDay(day.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border ${selected ? 'text-white border-transparent' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                      style={selected ? { backgroundColor: 'var(--color-primary)' } : undefined}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {profile.availableWeekDays.length}/{MAX_SELECTED_DAYS} dias selecionados.
              </p>
              <div className={limitBoxClass}>{limitBoxText}</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Horas por dia</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={profile.hoursPerDay}
                    onChange={(event) => setProfile((prev) => ({ ...prev, hoursPerDay: Number(event.target.value || 2) }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                    placeholder="Ex: 2"
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Define a carga diária ideal para manter consistência.</p>
                  {profile.hoursPerDay > 0 && profile.availableWeekDays.length > 0 && (
                    <div className="rounded-lg border border-blue-100 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/20 p-2 mt-2">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        {profile.availableWeekDays.length} dias × {profile.hoursPerDay}h = {weeklyHours}h/semana
                      </p>
                      <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">{weeklyFeedback}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Período preferido</label>
                  <select
                    value={profile.preferredPeriod}
                    onChange={(event) => setProfile((prev) => ({ ...prev, preferredPeriod: event.target.value as SmartScheduleProfile['preferredPeriod'] }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                    title="Você pode mudar esse período depois no seu plano."
                  >
                    <option value="manha">🌅 Manhã (alta energia)</option>
                    <option value="tarde">🌇 Tarde (equilibrado)</option>
                    <option value="noite">🌙 Noite (foco silencioso)</option>
                  </select>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">A IA prioriza blocos no horário em que você rende melhor.</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Você pode mudar esse período depois no seu plano.</p>
                </div>
              </div>
            </div>
          )}

          {stepId === 'nivel' && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white inline-flex items-center gap-2"><Brain className="w-4 h-4" /> {step3Copy.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {step3Copy.subtitle}
              </p>

              {(focusType === 'faculdade' || focusType === 'outros') && (
                <div className="rounded-lg border border-blue-100 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/20 p-2">
                  <p className="text-xs text-blue-800 dark:text-blue-200">Disciplinas carregadas do seu contexto: {step3Subjects.length}</p>
                </div>
              )}

              {(focusType === 'faculdade' || focusType === 'outros') && !canContinueFromContext && (
                <div className="rounded-lg border border-amber-100 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-2">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Adicione disciplinas no passo anterior para montar seu plano.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="rounded-lg border border-red-100 dark:border-red-800/30 bg-red-50 dark:bg-red-900/15 p-2">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300">{step3Copy.highPriorityTitle}</p>
                  <p className="text-xs text-red-700 dark:text-red-200 mt-1">
                    {highPrioritySubjects.length > 0 ? highPrioritySubjects.join(', ') : step3Copy.highPriorityEmpty}
                  </p>
                </div>
                <div className="rounded-lg border border-blue-100 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-900/15 p-2">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{step3Copy.maintenanceTitle}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                    {maintenanceSubjects.length > 0 ? maintenanceSubjects.join(', ') : step3Copy.maintenanceEmpty}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  {step3Copy.breakdownTitle} {improvementPct}% melhoria / {reviewPct}% revisão
                </p>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: `${improvementPct}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                {focusType === 'enem' && enemWeightedSubjects.length > 0 && (
                  <div className="rounded-lg border border-indigo-100 dark:border-indigo-800/30 bg-indigo-50 dark:bg-indigo-900/15 p-3">
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Pesos sugeridos pelo objetivo ENEM</p>
                    <div className="mt-2 space-y-1">
                      {enemWeightedSubjects.map(({ subject, difficulty, peso }) => (
                        <div key={subject} className="flex items-center justify-between gap-2 text-xs text-indigo-900 dark:text-indigo-100">
                          <span className="font-semibold">{subject}</span>
                          <span>Peso objetivo: {peso} · Dificuldade sugerida: {difficulty}/5</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(focusType === 'faculdade' || focusType === 'outros') && !canContinueFromContext ? null : step3Subjects.map((subject) => {
                  const currentLevel = levelBySubject[subject] || 'ok';
                  return (
                    <div key={subject} className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-2 items-center">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{subject}</p>
                      <div className="flex gap-2">
                        {LEVELS.map((level) => {
                          const selected = currentLevel === level.id;
                          return (
                            <button
                              key={level.id}
                              type="button"
                              onClick={() => setDifficulty(subject, levelIdToDifficulty(level.id))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${selected ? 'text-white border-transparent' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                              style={selected ? { backgroundColor: 'var(--color-primary)' } : undefined}
                            >
                              {level.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl border border-emerald-100 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20 p-3">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">{step3Copy.successTitle}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">🎯 {step3Copy.successMessage}</p>
              </div>
            </div>
          )}

          {stepId === 'final' && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">4) Ative seu modo foco total</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Escolha o formato de estudo e finalize seu plano para começar com consistência e menos distrações.
              </p>

              {(focusType === 'faculdade' || focusType === 'outros') && (
                <div className="rounded-xl border border-blue-100 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 p-3">
                  {focusType === 'faculdade' ? (
                    <>
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">📅 Seu plano — {courseName || 'Curso não informado'} ({semester ? `${semester}º` : 'Período não informado'})</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">{collegeName || 'Faculdade não informada'}</p>
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">📅 Seu plano personalizado — Outros</p>
                  )}

                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mt-2">Disciplinas do cronograma:</p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-blue-900 dark:text-blue-100 space-y-1">
                    {step3Subjects.map((subject) => (
                      <li key={subject}>{subject}</li>
                    ))}
                  </ul>
                </div>
              )}

              {focusType === 'enem' && (
                <div className="rounded-xl border border-blue-100 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 p-3">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">🎯 Meta ENEM</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {enemGoalProfile
                      ? `${enemGoalProfile.faculdade} · ${enemGoalProfile.curso}`
                      : `${enemTargetCollege || 'Faculdade não informada'} · ${enemTargetCourse || 'Curso não informado'}`}
                  </p>
                </div>
              )}

              {focusType === 'concurso' && concursoMeta && (
                <div className="rounded-xl border border-blue-100 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 p-3">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">🏛️ Meta Concurso</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {concursoMeta.nome} · {concursoMeta.banca} · {concursoMeta.area}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-amber-200 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 p-3 text-amber-800 dark:text-amber-200">
                <p className="text-sm font-semibold">🔥 Sequência de execução</p>
                <p className="text-xs mt-1">
                  Dia <strong>{Math.max(streakDays, 1)}</strong> de <strong>{goalDays}</strong>
                </p>

                <div className="mt-2 h-2 rounded-full bg-amber-200 dark:bg-amber-700/40 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(Math.min(Math.max(streakDays, 1), goalDays) / goalDays) * 100}%`,
                      backgroundImage: 'linear-gradient(90deg, #f59e0b, #f97316)',
                    }}
                  />
                </div>

                <p className="text-[11px] mt-2">Complete uma sessão hoje para manter sua sequência.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  { id: 'teoria_questoes', label: 'Teoria + Questões' },
                  { id: 'questoes', label: 'Só Questões' },
                  { id: 'pomodoro_25_5', label: 'Pomodoro (25/5)' },
                ].map((style) => {
                  const selected = profile.studyStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setProfile((prev) => ({ ...prev, studyStyle: style.id as SmartScheduleProfile['studyStyle'] }))}
                      className={`px-3 py-3 rounded-lg text-sm font-semibold border ${selected ? 'text-white border-transparent' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                      style={selected ? { backgroundColor: 'var(--color-primary)' } : undefined}
                    >
                      {style.label}
                    </button>
                  );
                })}
              </div>

              <section className="plan-summary plan-summary--enter rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4">
                <header className="plan-summary__header plan-summary__item">
                  <div className="plan-summary__titleRow">
                    <h3 className="plan-summary__title">🎯 Seu plano está pronto</h3>
                    <span className="plan-summary__pill">
                      <span aria-hidden>✨</span> Personalizado
                    </span>
                  </div>
                  <p className="plan-summary__subtitle">Aqui está o plano gerado com base nas suas escolhas.</p>
                </header>

                <div className="plan-summary__grid">
                  {summaryCards.map((card, index) => (
                    <article
                      key={card.id}
                      className="plan-summary-card plan-summary__item"
                      style={{ ['--stagger' as keyof React.CSSProperties]: String(index + 1) } as React.CSSProperties}
                    >
                      <div className="plan-summary-card__top">
                        <span className="plan-summary-card__icon" aria-hidden>{card.icon}</span>
                        {card.badge ? <span className="plan-summary-card__badge">{card.badge}</span> : null}
                      </div>

                      <h4 className="plan-summary-card__title">{card.title}</h4>
                      <p className="plan-summary-card__desc">{card.description}</p>
                    </article>
                  ))}
                </div>
              </section>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Seus dados são privados e usados apenas para personalizar seu desempenho no app.
              </p>

              <button
                onClick={finish}
                className="w-full mt-2 rounded-xl px-4 py-3 text-white font-semibold"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                ⚡ Ativar meu cronograma
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep((previous) => Math.max(1, previous - 1))}
              disabled={step === 1}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40"
            >
              Voltar
            </button>

            {step < 4 && (
              <button
                onClick={handleContinue}
                disabled={!isStepValid}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {isStepValid
                  ? (step === 2 ? `Continuar · ${weeklyHours}h/semana` : focusProfile.cta.continue)
                  : 'Continuar'}
              </button>
            )}
          </div>
        </div>

        <style>{`
          .plan-summary--enter {
            animation: summaryContainerIn 220ms ease-out both;
            transform-origin: 50% 60%;
          }

          .plan-summary__item {
            opacity: 0;
            transform: translateY(10px);
            animation: summaryItemIn 240ms cubic-bezier(.22,.9,.24,1) forwards;
            animation-delay: calc(var(--stagger, 0) * 40ms);
            will-change: transform, opacity;
          }

          .plan-summary__header {
            --stagger: 0;
            margin-bottom: 10px;
          }

          .plan-summary__titleRow {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 6px;
          }

          .plan-summary__title {
            margin: 0;
            font-size: 18px;
            line-height: 1.2;
            font-weight: 700;
            color: #0f172a;
          }

          .dark .plan-summary__title {
            color: #f8fafc;
          }

          .plan-summary__subtitle {
            margin: 0;
            font-size: 13px;
            color: #475569;
          }

          .dark .plan-summary__subtitle {
            color: #cbd5e1;
          }

          .plan-summary__pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border: 1px solid #86efac;
            background: #f0fdf4;
            color: #166534;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
          }

          .plan-summary__grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .plan-summary-card {
            border: 1px solid #e2e8f0;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
            transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
            padding: 12px;
          }

          .dark .plan-summary-card {
            background: #1f2937;
            border-color: #4b5563;
          }

          .plan-summary-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
            border-color: #cbd5e1;
          }

          .plan-summary-card__top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
          }

          .plan-summary-card__icon {
            font-size: 18px;
            line-height: 1;
          }

          .plan-summary-card__badge {
            font-size: 11px;
            font-weight: 600;
            color: #4338ca;
            background: #eef2ff;
            border: 1px solid #c7d2fe;
            border-radius: 999px;
            padding: 3px 8px;
          }

          .plan-summary-card__title {
            margin: 0 0 4px 0;
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.3;
          }

          .dark .plan-summary-card__title {
            color: #f8fafc;
          }

          .plan-summary-card__desc {
            margin: 0;
            font-size: 12.5px;
            color: #475569;
            line-height: 1.45;
          }

          .dark .plan-summary-card__desc {
            color: #cbd5e1;
          }

          @keyframes summaryContainerIn {
            from {
              opacity: 0.98;
              transform: scale(0.985);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes summaryItemIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @media (max-width: 760px) {
            .plan-summary__grid {
              grid-template-columns: 1fr;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .plan-summary--enter,
            .plan-summary__item {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
            }

            .plan-summary-card {
              transition: none !important;
            }
          }

          .hint-warning {
            margin-top: 8px;
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid #FCD34D;
            background: #FFFBEB;
            color: #92400E;
            font-size: 14px;
            line-height: 1.35;
          }

          .hint-neutral-success {
            margin-top: 8px;
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid #A7F3D0;
            background: #ECFDF5;
            color: #065F46;
            font-size: 14px;
            line-height: 1.35;
          }

          .hint-warning,
          .hint-neutral-success {
            transition: all 160ms ease;
          }
        `}</style>
      </div>
    </div>
  );
};
