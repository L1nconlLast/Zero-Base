import {
  ENEM_AREA_GUIDANCE,
  ENEM_COGNITIVE_AXES,
  ENEM_SUBJECT_GUIDANCE,
  ORGANIZER_GUIDANCE,
  type EnemArea,
  type EnemSubject,
  type OrganizerProfile,
} from '../data/assessmentFrameworks';

export interface StrategySummary {
  title: string;
  bullets: string[];
}

export const normalizeMentorStrategyText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const organizerAliases: Record<OrganizerProfile, string[]> = {
  cebraspe: ['cebraspe', 'cespe', 'unb-cebraspe'],
  fcc: ['fcc', 'fundacao carlos chagas'],
  fgv: ['fgv', 'fundacao getulio vargas', 'fundacao getulio vargas', 'getulio vargas'],
  vunesp: ['vunesp', 'fundacao vunesp'],
  iades: ['iades'],
  ibfc: ['ibfc'],
  quadrix: ['quadrix'],
  aocp: ['aocp', 'instituto aocp'],
  funrio: ['funrio', 'fundacao de apoio a pesquisa'],
};

const areaAliases: Record<EnemArea, string[]> = {
  Linguagens: ['linguagens', 'area de linguagens'],
  Matematica: ['matematica', 'matematica e suas tecnologias', 'math'],
  Natureza: ['natureza', 'ciencias da natureza', 'natureza e suas'],
  Humanas: ['humanas', 'ciencias humanas', 'ciencias humanas e sociais'],
};

const subjectAliases: Record<EnemSubject, string[]> = {
  Portugues: ['portugues', 'lingua portuguesa', 'interpretacao de texto', 'gramatica', 'redacao de portugues'],
  Literatura: ['literatura', 'literatura brasileira', 'literatura portuguesa'],
  Artes: ['artes', 'arte', 'artes visuais', 'musica'],
  EducacaoFisica: ['educacao fisica', 'ed fisica', 'ed. fisica'],
  LinguaEstrangeira: ['ingles', 'espanhol', 'lingua estrangeira', 'ingles/espanhol'],
  Redacao: ['redacao', 'redacao', 'dissertacao', 'texto dissertativo'],
  Matematica: ['matematica', 'mat', 'funcao', 'geometria', 'estatistica', 'probabilidade', 'algebra', 'aritmetica'],
  Fisica: ['fisica', 'mecanica', 'termodinamica', 'optica', 'eletromagnetismo', 'ondulatoria'],
  Quimica: ['quimica', 'quimica organica', 'termoquimica', 'estequiometria', 'eletroquimica'],
  Biologia: ['biologia', 'genetica', 'ecologia', 'evolucao', 'citologia', 'fisiologia', 'botanica', 'zoologia'],
  Historia: ['historia', 'historia do brasil', 'historia geral', 'historia moderna', 'historia contemporanea'],
  Geografia: ['geografia', 'geopolitica', 'climatologia', 'urbano', 'urbanizacao', 'cartografia'],
  Filosofia: ['filosofia', 'etica', 'epistemologia', 'logica filosofica', 'filosofia politica'],
  Sociologia: ['sociologia', 'sociologia classica', 'movimentos sociais', 'desigualdade social', 'cultura'],
};

const concursoDisciplineAliases: Record<string, string[]> = {
  'Direito Constitucional': ['direito constitucional', 'constituicao', 'cf 88', 'cf1988', 'direitos fundamentais'],
  'Direito Administrativo': ['direito administrativo', 'ato administrativo', 'licitacao', 'lei 8666', 'servidores publicos'],
  'Direito do Trabalho': ['direito do trabalho', 'clt', 'reclamacao trabalhista', 'contrato de trabalho'],
  'Raciocinio Logico': ['raciocinio logico', 'logica', 'logica matematica', 'proposicoes', 'silogismo'],
  Informatica: ['informatica', 'excel', 'word', 'windows', 'seguranca da informacao', 'redes', 'office'],
  'Administracao Publica': ['administracao publica', 'gestao publica', 'reforma administrativa'],
  'Legislacao SUS': ['sus', 'legislacao sus', 'lei organica saude', 'lei 8080', 'lei 8142'],
  Atualidades: ['atualidades', 'mundo atual', 'noticias', 'conjuntura'],
  'Matematica Financeira': ['matematica financeira', 'juros', 'porcentagem concurso', 'financas'],
};

export const detectOrganizer = (input: string): OrganizerProfile | null => {
  const normalized = normalizeMentorStrategyText(input);

  for (const [key, aliases] of Object.entries(organizerAliases) as Array<[OrganizerProfile, string[]]>) {
    if (aliases.some((alias) => normalized.includes(alias))) return key;
  }

  return null;
};

export const detectEnemArea = (input: string): EnemArea | null => {
  const normalized = normalizeMentorStrategyText(input);

  for (const [area, aliases] of Object.entries(areaAliases) as Array<[EnemArea, string[]]>) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      return area;
    }
  }

  return null;
};

export const detectEnemSubject = (input: string): EnemSubject | null => {
  const normalized = normalizeMentorStrategyText(input);

  for (const [subject, aliases] of Object.entries(subjectAliases) as Array<[EnemSubject, string[]]>) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      return subject;
    }
  }

  return null;
};

export const detectConcursoDiscipline = (input: string): string | null => {
  const normalized = normalizeMentorStrategyText(input);

  for (const [discipline, aliases] of Object.entries(concursoDisciplineAliases)) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      return discipline;
    }
  }

  return null;
};

export const getEnemSubjectSummary = (subject: EnemSubject): StrategySummary => {
  const profile = ENEM_SUBJECT_GUIDANCE.find((item) => item.subject === subject);

  if (!profile) {
    return {
      title: `ENEM - ${subject}`,
      bullets: ['Estude pelos topicos de alta cobranca e faca questoes comentadas.'],
    };
  }

  return {
    title: `ENEM — ${subject}: topicos de alta cobrança`,
    bullets: [
      `Temas mais cobrados: ${profile.highFrequencyTopics.slice(0, 5).join(', ')}.`,
      ...profile.studyTips,
    ],
  };
};

export const getEnemAreaSummary = (area?: EnemArea): StrategySummary => {
  if (!area) {
    return {
      title: 'Estrategia ENEM por competencias',
      bullets: [
        `Ative os 5 eixos cognitivos: ${ENEM_COGNITIVE_AXES.map((axis) => `${axis.code} (${axis.label})`).join(', ')}.`,
        'Priorize questoes contextualizadas e revisao por habilidade, nao so por conteudo.',
        'Feche cada semana com simulados interdisciplinares e analise de erro por causa-raiz.',
        'Nas 4 areas, sempre relacione o conteudo a situacoes da realidade brasileira (dados, noticias, problemas sociais).',
      ],
    };
  }

  const areaProfile = ENEM_AREA_GUIDANCE.find((item) => item.area === area);
  if (!areaProfile) {
    return getEnemAreaSummary();
  }

  return {
    title: `ENEM — area de ${areaProfile.area}`,
    bullets: [areaProfile.focus, ...areaProfile.highLeverageActions],
  };
};

export const getOrganizerSummary = (organizer: OrganizerProfile): StrategySummary => {
  const profile = ORGANIZER_GUIDANCE.find((item) => item.key === organizer);

  if (!profile) {
    return {
      title: 'Estrategia por banca',
      bullets: ['Mapeie o estilo da banca antes de aumentar volume de questoes.'],
    };
  }

  return {
    title: `${profile.label} — estrategia de prova`,
    bullets: [
      profile.signature,
      `Formato: ${profile.format}`,
      `Disciplinas mais cobradas: ${profile.hotDisciplines.slice(0, 4).join(', ')}.`,
      ...profile.strategy,
    ],
  };
};

export const getConcursoDisciplineSummary = (discipline: string): StrategySummary => ({
  title: `Concurso — ${discipline}`,
  bullets: [
    `Faca bloco de 20 questoes por dia somente de ${discipline}.`,
    'Estude a lei/norma base e depois resolva questoes comentadas por topico.',
    'Monte um caderno de erros especifico para essa disciplina.',
    'Revise 3 dias antes do concurso apenas os topicos em que voce erra com mais frequencia.',
  ],
});

export const formatStrategySummary = (summary: StrategySummary, bulletPrefix = '•'): string =>
  [summary.title, ...summary.bullets.map((item) => `${bulletPrefix} ${item}`)].join('\n');

export const buildMentorStrategyMessage = (input: string, bulletPrefix = '•'): string | null => {
  const normalized = normalizeMentorStrategyText(input);
  const organizer = detectOrganizer(input);

  if (organizer) {
    return formatStrategySummary(getOrganizerSummary(organizer), bulletPrefix);
  }

  const hasExplicitEnemContext =
    normalized.includes('enem') ||
    normalized.includes('vestibular') ||
    normalized.includes('matriz');

  const asksForStudyGuidance =
    normalized.includes('como estudar') ||
    normalized.includes('dificuldade') ||
    normalized.includes('topico');

  const hasConcursoContext =
    normalized.includes('concurso') ||
    normalized.includes('banca') ||
    normalized.includes('edital');

  const subject = detectEnemSubject(input);
  if (subject && (hasExplicitEnemContext || (asksForStudyGuidance && !hasConcursoContext))) {
    return formatStrategySummary(getEnemSubjectSummary(subject), bulletPrefix);
  }

  if (hasExplicitEnemContext) {
    return formatStrategySummary(getEnemAreaSummary(detectEnemArea(input) || undefined), bulletPrefix);
  }

  const discipline = detectConcursoDiscipline(input);
  if (discipline) {
    return formatStrategySummary(getConcursoDisciplineSummary(discipline), bulletPrefix);
  }

  return null;
};