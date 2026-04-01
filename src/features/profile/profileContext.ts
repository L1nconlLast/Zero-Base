import type {
  ProfileCollegeFocus,
  ProfileConcursoExperienceLevel,
  ProfileHybridAvailableStudyTime,
  ProfileHybridPrimaryFocus,
  ProfileOtherFocus,
  ProfileTrackContext,
  ProfileTrackContextData,
} from './types';

const formatShortDate = (value?: string | null): string | null => {
  if (!value) return null;

  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const capitalize = (value?: string | null): string | null => {
  const safeValue = String(value || '').trim();
  if (!safeValue) return null;
  return safeValue.charAt(0).toUpperCase() + safeValue.slice(1);
};

const compact = (items: Array<string | null | undefined>, limit = 4): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  items.forEach((item) => {
    const safeItem = String(item || '').trim();
    if (!safeItem || seen.has(safeItem)) {
      return;
    }

    seen.add(safeItem);
    result.push(safeItem);
  });

  return result.slice(0, limit);
};

const collegeFocusLabel: Record<ProfileCollegeFocus, string> = {
  rotina: 'Rotina academica',
  provas: 'Foco em provas',
  trabalhos: 'Foco em trabalhos',
};

const otherFocusLabel: Record<ProfileOtherFocus, string> = {
  aprender: 'Aprender',
  praticar: 'Praticar',
  rotina: 'Criar rotina',
  evoluir_tema: 'Evoluir tema',
};

const hybridFocusLabel: Record<ProfileHybridPrimaryFocus, string> = {
  enem: 'ENEM',
  concurso: 'Concurso',
  equilibrado: 'Equilibrado',
};

const hybridStudyTimeLabel: Record<ProfileHybridAvailableStudyTime, string> = {
  baixo: 'carga baixa',
  medio: 'carga media',
  alto: 'carga alta',
};

const experienceLabel: Record<ProfileConcursoExperienceLevel, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediario',
  avancado: 'Avancado',
};

const formatSemester = (value?: string | null): string | null => {
  if (!value) return null;
  return value === '5' ? '5o+ periodo' : `${value}o periodo`;
};

const buildEnemContext = (context: ProfileTrackContext): ProfileTrackContextData => {
  const targetLabel = [context.enem?.targetCourse, context.enem?.targetCollege]
    .filter(Boolean)
    .join(' · ');
  const examDateLabel = formatShortDate(context.examDate);

  return {
    profile: 'enem',
    trackLabel: 'ENEM',
    title: context.summaryTitle || (context.examGoal ? `Preparacao para ${context.examGoal}` : 'Preparacao para ENEM'),
    description: context.summaryDescription || 'Plano configurado para pratica, revisao e constancia ao longo da preparacao.',
    tags: compact([
      context.enem?.triedBefore === 'nao' ? 'Primeira vez' : context.enem?.triedBefore === 'sim' ? 'Ja fez ENEM' : null,
      context.enem?.profileLevel ? experienceLabel[context.enem.profileLevel] : null,
      targetLabel || null,
      examDateLabel ? `Prova ${examDateLabel}` : null,
      !targetLabel ? (context.examGoal || 'Meta ativa') : null,
    ]),
    actionLabel: 'Revisar contexto',
  };
};

const buildConcursoContext = (context: ProfileTrackContext): ProfileTrackContextData => {
  const examDateLabel = formatShortDate(context.concurso?.examDate || context.examDate);

  return {
    profile: 'concurso',
    trackLabel: 'Concurso',
    title: context.concurso?.name || context.summaryTitle || 'Plano de concurso',
    description: context.summaryDescription || 'Plano orientado por edital, banca, prazo e disciplinas prioritarias.',
    tags: compact([
      context.concurso?.area || null,
      context.concurso?.board || null,
      context.concurso?.experienceLevel ? experienceLabel[context.concurso.experienceLevel] : null,
      context.concurso?.planningWithoutDate ? 'Sem data ainda' : examDateLabel ? `Prova ${examDateLabel}` : 'Prazo em definicao',
    ]),
    actionLabel: 'Revisar contexto',
  };
};

const buildFaculdadeContext = (context: ProfileTrackContext): ProfileTrackContextData => {
  const semesterLabel = formatSemester(context.faculdade?.semester);

  return {
    profile: 'faculdade',
    trackLabel: 'Faculdade',
    title: [context.faculdade?.course, semesterLabel].filter(Boolean).join(' · ') || context.summaryTitle || 'Rotina da faculdade',
    description: context.summaryDescription || 'Plano alinhado ao semestre, materias e entregas mais proximas.',
    tags: compact([
      context.faculdade?.institution || null,
      semesterLabel,
      context.faculdade?.focus ? collegeFocusLabel[context.faculdade.focus] : null,
    ]),
    actionLabel: 'Atualizar foco',
  };
};

const buildOutrosContext = (context: ProfileTrackContext): ProfileTrackContextData => {
  const deadlineLabel = formatShortDate(context.outros?.deadline);

  return {
    profile: 'outros',
    trackLabel: 'Outros',
    title: context.outros?.goalTitle || context.summaryTitle || 'Trilha personalizada',
    description: context.summaryDescription || 'Plano flexivel para manter consistencia e evolucao no seu tema atual.',
    tags: compact([
      context.outros?.focus ? otherFocusLabel[context.outros.focus] : 'Tema livre',
      deadlineLabel ? `Prazo ${deadlineLabel}` : null,
      !context.outros?.focus ? 'Consistencia' : null,
    ]),
    actionLabel: 'Editar objetivo',
  };
};

const buildHibridoContext = (context: ProfileTrackContext): ProfileTrackContextData => {
  const focusLabel = context.hibrido?.primaryFocus ? hybridFocusLabel[context.hibrido.primaryFocus] : 'Equilibrado';
  const contestDateLabel = formatShortDate(context.hibrido?.concursoExamDate || context.concurso?.examDate || context.examDate);

  return {
    profile: 'hibrido',
    trackLabel: 'Hibrido',
    title: 'ENEM + Concurso',
    description:
      context.summaryDescription
      || context.summaryTitle
      || 'Plano balanceado entre ENEM e concurso, com uma frente principal e outra em continuidade.',
    tags: compact([
      `Foco: ${focusLabel}`,
      context.concurso?.name || 'Frente de concurso',
      context.concurso?.board || null,
      context.hibrido?.availableStudyTime ? capitalize(hybridStudyTimeLabel[context.hibrido.availableStudyTime]) : null,
      contestDateLabel ? `Prova ${contestDateLabel}` : null,
    ]),
    actionLabel: 'Atualizar foco',
  };
};

export const buildProfileContextData = (
  context?: ProfileTrackContext | null,
): ProfileTrackContextData | null => {
  if (!context) {
    return null;
  }

  if (context.profile === 'concurso') {
    return buildConcursoContext(context);
  }

  if (context.profile === 'faculdade') {
    return buildFaculdadeContext(context);
  }

  if (context.profile === 'outros') {
    return buildOutrosContext(context);
  }

  if (context.profile === 'hibrido') {
    return buildHibridoContext(context);
  }

  return buildEnemContext(context);
};

export default buildProfileContextData;
