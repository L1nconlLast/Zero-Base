export type StudyContextMode = 'enem' | 'concurso' | 'faculdade' | 'outros' | 'hibrido';
export type LegacyStudyTrack = 'enem' | 'concursos' | 'hibrido';

export type FaculdadeFocus = 'rotina' | 'provas' | 'trabalhos';
export type OutrosGoalType = 'aprender_do_zero' | 'praticar' | 'rotina' | 'aprofundar';
export type OutrosPace = 'leve' | 'moderado' | 'intenso';
export type ExperienceLevel = 'iniciante' | 'intermediario' | 'avancado';
export type HibridoPrimaryFocus = 'enem' | 'concurso' | 'equilibrado';
export type HibridoAvailableStudyTime = 'baixo' | 'medio' | 'alto';

export type InstitutionType = 'publica' | 'privada' | 'instituto' | 'outra';
export type AcademicSubjectStatus = 'ativa' | 'concluida' | 'trancada';
export type AcademicExamStatus = 'pendente' | 'concluida';
export type AcademicAssignmentStatus = 'nao_iniciado' | 'em_andamento' | 'entregue';
export type AcademicCalendarEventType = 'prova' | 'entrega' | 'aula_importante' | 'estudo' | 'meta';
export type AcademicCalendarEventStatus = 'pendente' | 'concluido' | 'cancelado';

export type LearningTopicStatus = 'ativo' | 'pausado' | 'concluido';
export type LearningGoalStatus = 'ativo' | 'concluido' | 'arquivado';
export type LearningPathStatus = 'ativa' | 'pausada' | 'concluida';
export type LearningPathStepStatus = 'nao_iniciado' | 'em_andamento' | 'concluido';
export type PersonalGoalEventType = 'meta' | 'estudo' | 'revisao';
export type PersonalGoalEventStatus = 'pendente' | 'concluido' | 'cancelado';

export type SharedSessionContextType =
  | 'estudo'
  | 'revisao'
  | 'trabalho'
  | 'prova'
  | 'aprender'
  | 'praticar'
  | 'avancar'
  | 'livre';

export type SharedReviewContextType =
  | 'aula'
  | 'topico'
  | 'prova'
  | 'resumo'
  | 'conceito'
  | 'pratica';

export interface StudyModeNavigationItem {
  id: string;
  label: string;
}

export interface StudyModeNavigation {
  mode: StudyContextMode;
  items: StudyModeNavigationItem[];
}

export interface FaculdadeContextPayload {
  institutionName?: string | null;
  institutionType?: InstitutionType | null;
  courseName?: string | null;
  academicPeriodLabel?: string | null;
  academicPeriodNumber?: number | null;
  focus?: FaculdadeFocus | null;
  studyDays?: string[] | null;
  dailyMinutes?: number | null;
  preferredTurn?: 'manha' | 'tarde' | 'noite' | null;
}

export interface OutrosContextPayload {
  topicName?: string | null;
  goalType?: OutrosGoalType | null;
  level?: ExperienceLevel | null;
  dailyMinutes?: number | null;
  pace?: OutrosPace | null;
}

export interface EnemContextPayload {
  goalId?: string | null;
  targetCollege?: string | null;
  targetCourse?: string | null;
  triedBefore?: 'sim' | 'nao' | null;
  level?: ExperienceLevel | null;
}

export interface ConcursoContextPayload {
  area?: string | null;
  examName?: string | null;
  board?: string | null;
  examDate?: string | null;
  targetScore?: number | null;
  experience?: ExperienceLevel | null;
  planningWithoutDate?: boolean | null;
}

export interface HibridoContextPayload {
  enem?: EnemContextPayload | null;
  concurso?: ConcursoContextPayload | null;
  primaryFocus?: HibridoPrimaryFocus | null;
  availableStudyTime?: HibridoAvailableStudyTime | null;
}

export interface StudyContextPayload {
  enem?: EnemContextPayload | null;
  concurso?: ConcursoContextPayload | null;
  faculdade?: FaculdadeContextPayload | null;
  outros?: OutrosContextPayload | null;
  hibrido?: HibridoContextPayload | null;
}

export interface UserStudyContextRecord {
  id: string;
  userId: string;
  mode: StudyContextMode;
  isActive: boolean;
  contextSummary?: string | null;
  contextDescription?: string | null;
  contextPayload: StudyContextPayload;
  createdAt: string;
  updatedAt: string;
}

export interface StudyContextDraftInput {
  userId: string;
  mode: StudyContextMode;
  contextSummary?: string | null;
  contextDescription?: string | null;
  payload: StudyContextPayload;
}

export interface StudyContextOnboardingSnapshot {
  focus: StudyContextMode;
  contextSummary?: string | null;
  contextDescription?: string | null;
  enem?: {
    goalId?: string | null;
    targetCollege?: string | null;
    targetCourse?: string | null;
    triedBefore?: 'sim' | 'nao' | null;
    profileLevel?: ExperienceLevel | null;
  } | null;
  concurso?: {
    area?: string | null;
    nome?: string | null;
    banca?: string | null;
    examDate?: string | null;
    experienceLevel?: ExperienceLevel | null;
    planningWithoutDate?: boolean | null;
  } | null;
  faculdade?: {
    institution?: string | null;
    institutionType?: InstitutionType | null;
    course?: string | null;
    semester?: string | null;
    semesterNumber?: number | null;
    focus?: FaculdadeFocus | null;
    studyDays?: string[] | null;
    dailyMinutes?: number | null;
    preferredTurn?: 'manha' | 'tarde' | 'noite' | null;
  } | null;
  outros?: {
    goalTitle?: string | null;
    focus?: 'aprender' | 'praticar' | 'rotina' | 'evoluir_tema' | null;
    level?: ExperienceLevel | null;
    dailyMinutes?: number | null;
    pace?: OutrosPace | null;
  } | null;
  hibrido?: {
    primaryFocus?: HibridoPrimaryFocus | null;
    availableStudyTime?: HibridoAvailableStudyTime | null;
    concursoExamDate?: string | null;
  } | null;
}

export interface AcademicInstitutionRecord {
  id: string;
  userId: string;
  name: string;
  type: InstitutionType;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicCourseRecord {
  id: string;
  userId: string;
  institutionId?: string | null;
  name: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicPeriodRecord {
  id: string;
  userId: string;
  label: string;
  number?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicSubjectRecord {
  id: string;
  userId: string;
  institutionId?: string | null;
  courseId?: string | null;
  academicPeriodId?: string | null;
  name: string;
  workloadHours?: number | null;
  professorName?: string | null;
  color?: string | null;
  status: AcademicSubjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicExamRecord {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  date: string;
  weight?: number | null;
  notes?: string | null;
  status: AcademicExamStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicAssignmentRecord {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  description?: string | null;
  dueDate: string;
  priority?: 'baixa' | 'media' | 'alta' | 'critica' | null;
  status: AcademicAssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicClassNoteRecord {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicCalendarEventRecord {
  id: string;
  userId: string;
  subjectId?: string | null;
  examId?: string | null;
  assignmentId?: string | null;
  type: AcademicCalendarEventType;
  title: string;
  startAt: string;
  endAt?: string | null;
  status: AcademicCalendarEventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LearningTopicRecord {
  id: string;
  userId: string;
  name: string;
  category?: string | null;
  level: ExperienceLevel;
  status: LearningTopicStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LearningGoalRecord {
  id: string;
  userId: string;
  topicId: string;
  goalType: OutrosGoalType;
  description?: string | null;
  status: LearningGoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPathRecord {
  id: string;
  userId: string;
  topicId: string;
  title: string;
  progressPercent: number;
  status: LearningPathStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPathStepRecord {
  id: string;
  userId: string;
  pathId: string;
  title: string;
  description?: string | null;
  stepOrder: number;
  status: LearningPathStepStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalGoalEventRecord {
  id: string;
  userId: string;
  topicId?: string | null;
  title: string;
  type: PersonalGoalEventType;
  startAt: string;
  endAt?: string | null;
  status: PersonalGoalEventStatus;
  createdAt: string;
  updatedAt: string;
}
