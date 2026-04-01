import type {
  FaculdadeContextPayload,
  LegacyStudyTrack,
  OutrosContextPayload,
  StudyContextDraftInput,
  StudyContextMode,
  StudyContextOnboardingSnapshot,
  StudyModeNavigation,
  StudyContextPayload,
  UserStudyContextRecord,
} from './types';

const MODE_NAVIGATION: Record<StudyContextMode, StudyModeNavigation> = {
  enem: {
    mode: 'enem',
    items: [
      { id: 'inicio', label: 'Home' },
      { id: 'plano', label: 'Plano' },
      { id: 'estudo', label: 'Estudo' },
      { id: 'revisao', label: 'Revisao' },
      { id: 'perfil', label: 'Perfil' },
    ],
  },
  concurso: {
    mode: 'concurso',
    items: [
      { id: 'inicio', label: 'Home' },
      { id: 'plano', label: 'Plano' },
      { id: 'estudo', label: 'Estudo' },
      { id: 'revisao', label: 'Revisao' },
      { id: 'perfil', label: 'Perfil' },
    ],
  },
  faculdade: {
    mode: 'faculdade',
    items: [
      { id: 'inicio', label: 'Home' },
      { id: 'disciplinas', label: 'Disciplinas' },
      { id: 'planejamento', label: 'Planejamento' },
      { id: 'calendario', label: 'Calendario' },
      { id: 'perfil', label: 'Perfil' },
    ],
  },
  outros: {
    mode: 'outros',
    items: [
      { id: 'inicio', label: 'Visao geral' },
      { id: 'departamento', label: 'Meu foco' },
      { id: 'arvore', label: 'Plano' },
      { id: 'cronograma', label: 'Execucao' },
      { id: 'dashboard', label: 'Ritmo' },
      { id: 'perfil', label: 'Perfil' },
    ],
  },
  hibrido: {
    mode: 'hibrido',
    items: [
      { id: 'inicio', label: 'Home' },
      { id: 'plano', label: 'Plano' },
      { id: 'estudo', label: 'Estudo' },
      { id: 'revisao', label: 'Revisao' },
      { id: 'perfil', label: 'Perfil' },
    ],
  },
};

const mapOutrosFocusToGoalType = (
  focus?: StudyContextOnboardingSnapshot['outros'] extends infer T
    ? T extends { focus?: infer F }
      ? F
      : never
    : never,
): OutrosContextPayload['goalType'] => {
  if (focus === 'praticar') return 'praticar';
  if (focus === 'rotina') return 'rotina';
  if (focus === 'evoluir_tema') return 'aprofundar';
  return 'aprender_do_zero';
};

const buildFaculdadePayload = (
  snapshot: StudyContextOnboardingSnapshot,
): FaculdadeContextPayload | null => {
  if (!snapshot.faculdade) return null;

  return {
    institutionName: snapshot.faculdade.institution || null,
    institutionType: snapshot.faculdade.institutionType || null,
    courseName: snapshot.faculdade.course || null,
    academicPeriodLabel: snapshot.faculdade.semester || null,
    academicPeriodNumber: snapshot.faculdade.semesterNumber ?? null,
    focus: snapshot.faculdade.focus || null,
    studyDays: snapshot.faculdade.studyDays || null,
    dailyMinutes: snapshot.faculdade.dailyMinutes ?? null,
    preferredTurn: snapshot.faculdade.preferredTurn || null,
  };
};

const buildOutrosPayload = (
  snapshot: StudyContextOnboardingSnapshot,
): OutrosContextPayload | null => {
  if (!snapshot.outros) return null;

  return {
    topicName: snapshot.outros.goalTitle || null,
    goalType: mapOutrosFocusToGoalType(snapshot.outros.focus),
    level: snapshot.outros.level || null,
    dailyMinutes: snapshot.outros.dailyMinutes ?? null,
    pace: snapshot.outros.pace || null,
  };
};

export const resolveLegacyTrackFromStudyContextMode = (
  mode: StudyContextMode,
): LegacyStudyTrack | null => {
  if (mode === 'concurso') return 'concursos';
  if (mode === 'enem') return 'enem';
  if (mode === 'hibrido') return 'hibrido';
  return null;
};

export const getStudyModeNavigation = (
  mode: StudyContextMode,
): StudyModeNavigation => MODE_NAVIGATION[mode];

export const buildStudyContextPayloadFromOnboarding = (
  snapshot: StudyContextOnboardingSnapshot,
): StudyContextPayload => ({
  enem: snapshot.enem
    ? {
        goalId: snapshot.enem.goalId || null,
        targetCollege: snapshot.enem.targetCollege || null,
        targetCourse: snapshot.enem.targetCourse || null,
        triedBefore: snapshot.enem.triedBefore || null,
        level: snapshot.enem.profileLevel || null,
      }
    : null,
  concurso: snapshot.concurso
    ? {
        area: snapshot.concurso.area || null,
        examName: snapshot.concurso.nome || null,
        board: snapshot.concurso.banca || null,
        examDate: snapshot.concurso.examDate || null,
        experience: snapshot.concurso.experienceLevel || null,
        planningWithoutDate: snapshot.concurso.planningWithoutDate ?? null,
      }
    : null,
  faculdade: buildFaculdadePayload(snapshot),
  outros: buildOutrosPayload(snapshot),
  hibrido: snapshot.hibrido
    ? {
        enem: snapshot.enem
          ? {
              goalId: snapshot.enem.goalId || null,
              targetCollege: snapshot.enem.targetCollege || null,
              targetCourse: snapshot.enem.targetCourse || null,
              triedBefore: snapshot.enem.triedBefore || null,
              level: snapshot.enem.profileLevel || null,
            }
          : null,
        concurso: snapshot.concurso
          ? {
              area: snapshot.concurso.area || null,
              examName: snapshot.concurso.nome || null,
              board: snapshot.concurso.banca || null,
              examDate: snapshot.concurso.examDate || snapshot.hibrido.concursoExamDate || null,
              experience: snapshot.concurso.experienceLevel || null,
              planningWithoutDate: snapshot.concurso.planningWithoutDate ?? null,
            }
          : null,
        primaryFocus: snapshot.hibrido.primaryFocus || null,
        availableStudyTime: snapshot.hibrido.availableStudyTime || null,
      }
    : null,
});

export const buildStudyContextInputFromOnboarding = (
  snapshot: StudyContextOnboardingSnapshot,
) => ({
  mode: snapshot.focus,
  contextSummary: snapshot.contextSummary || null,
  contextDescription: snapshot.contextDescription || null,
  contextPayload: buildStudyContextPayloadFromOnboarding(snapshot),
});

export const buildStudyContextRecordDraft = ({
  userId,
  mode,
  contextSummary,
  contextDescription,
  payload,
}: StudyContextDraftInput): UserStudyContextRecord => {
  const nowIso = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    userId,
    mode,
    isActive: true,
    contextSummary: contextSummary || null,
    contextDescription: contextDescription || null,
    contextPayload: payload,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
};

export const buildStudyContextDraftFromOnboarding = (
  userId: string,
  snapshot: StudyContextOnboardingSnapshot,
): UserStudyContextRecord =>
  buildStudyContextRecordDraft({
    userId,
    mode: snapshot.focus,
    contextSummary: snapshot.contextSummary || null,
    contextDescription: snapshot.contextDescription || null,
    payload: buildStudyContextPayloadFromOnboarding(snapshot),
  });

export const buildOnboardingSnapshotFromStudyContextRecord = (
  record: UserStudyContextRecord,
): StudyContextOnboardingSnapshot => ({
  focus: record.mode,
  contextSummary: record.contextSummary || null,
  contextDescription: record.contextDescription || null,
  enem: record.contextPayload.enem
    ? {
        goalId: record.contextPayload.enem.goalId || null,
        targetCollege: record.contextPayload.enem.targetCollege || null,
        targetCourse: record.contextPayload.enem.targetCourse || null,
        triedBefore: record.contextPayload.enem.triedBefore || null,
        profileLevel: record.contextPayload.enem.level || null,
      }
    : null,
  concurso: record.contextPayload.concurso
    ? {
        area: record.contextPayload.concurso.area || null,
        nome: record.contextPayload.concurso.examName || null,
        banca: record.contextPayload.concurso.board || null,
        examDate: record.contextPayload.concurso.examDate || null,
        experienceLevel: record.contextPayload.concurso.experience || null,
        planningWithoutDate: record.contextPayload.concurso.planningWithoutDate ?? null,
      }
    : null,
  faculdade: record.contextPayload.faculdade
    ? {
        institution: record.contextPayload.faculdade.institutionName || null,
        institutionType: record.contextPayload.faculdade.institutionType || null,
        course: record.contextPayload.faculdade.courseName || null,
        semester: record.contextPayload.faculdade.academicPeriodLabel || null,
        semesterNumber: record.contextPayload.faculdade.academicPeriodNumber ?? null,
        focus: record.contextPayload.faculdade.focus || null,
        studyDays: record.contextPayload.faculdade.studyDays || null,
        dailyMinutes: record.contextPayload.faculdade.dailyMinutes ?? null,
        preferredTurn: record.contextPayload.faculdade.preferredTurn || null,
      }
    : null,
  outros: record.contextPayload.outros
    ? {
        goalTitle: record.contextPayload.outros.topicName || null,
        focus:
          record.contextPayload.outros.goalType === 'aprender_do_zero'
            ? 'aprender'
            : record.contextPayload.outros.goalType === 'aprofundar'
              ? 'evoluir_tema'
              : record.contextPayload.outros.goalType || null,
        level: record.contextPayload.outros.level || null,
        dailyMinutes: record.contextPayload.outros.dailyMinutes ?? null,
        pace: record.contextPayload.outros.pace || null,
      }
    : null,
  hibrido: record.contextPayload.hibrido
    ? {
        primaryFocus: record.contextPayload.hibrido.primaryFocus || null,
        availableStudyTime: record.contextPayload.hibrido.availableStudyTime || null,
        concursoExamDate: record.contextPayload.hibrido.concurso?.examDate || null,
      }
    : null,
});
