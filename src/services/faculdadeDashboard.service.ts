import { isSupabaseConfigured, supabase } from './supabase.client';

export interface AcademicSubjectSummary {
  id: string;
  name: string;
  workloadHours: number | null;
  professorName: string | null;
  status: 'ativa' | 'concluida' | 'trancada';
}

export interface AcademicExamSummary {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  date: string;
  status: 'pendente' | 'concluida';
  weight: number | null;
  notes: string | null;
}

export interface AcademicAssignmentSummary {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  dueDate: string;
  priority: 'baixa' | 'media' | 'alta' | 'critica' | null;
  status: 'nao_iniciado' | 'em_andamento' | 'entregue';
  description: string | null;
}

export interface AcademicCalendarEventSummary {
  id: string;
  subjectId: string | null;
  title: string;
  type: 'prova' | 'entrega' | 'aula_importante' | 'estudo' | 'meta';
  startAt: string;
  endAt: string | null;
  status: 'pendente' | 'concluido' | 'cancelado';
  subjectName: string | null;
  details: string | null;
}

export interface FaculdadeDashboardData {
  profile: {
    institutionName: string | null;
    courseName: string | null;
    currentPeriodLabel: string | null;
    focus: string | null;
  };
  subjects: AcademicSubjectSummary[];
  exams: AcademicExamSummary[];
  assignments: AcademicAssignmentSummary[];
  events: AcademicCalendarEventSummary[];
  nextExam: AcademicExamSummary | null;
  nextAssignment: AcademicAssignmentSummary | null;
  upcomingEvents: AcademicCalendarEventSummary[];
  summary: {
    activeSubjects: number;
    pendingExams: number;
    pendingAssignments: number;
    upcomingEvents: number;
  };
}

interface StudyContextRow {
  context_payload: {
    faculdade?: {
      institutionName?: string | null;
      courseName?: string | null;
      academicPeriodLabel?: string | null;
      focus?: string | null;
    } | null;
  } | null;
}

interface AcademicSubjectRow {
  id: string;
  name: string;
  workload_hours: number | null;
  professor_name: string | null;
  status: AcademicSubjectSummary['status'];
}

interface AcademicExamRow {
  id: string;
  subject_id: string;
  title: string;
  exam_date: string;
  status: AcademicExamSummary['status'];
  weight: number | null;
  notes: string | null;
}

interface AcademicAssignmentRow {
  id: string;
  subject_id: string;
  title: string;
  due_date: string;
  priority: AcademicAssignmentSummary['priority'];
  status: AcademicAssignmentSummary['status'];
  description: string | null;
}

interface AcademicCalendarEventRow {
  id: string;
  title: string;
  event_type: AcademicCalendarEventSummary['type'];
  start_at: string;
  end_at: string | null;
  status: AcademicCalendarEventSummary['status'];
  subject_id: string | null;
  details: string | null;
}

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao configurado.');
  }

  return supabase;
};

class FaculdadeDashboardService {
  async getFaculdadeDashboardData(userId: string): Promise<FaculdadeDashboardData> {
    const client = assertClient();
    const nowIso = new Date().toISOString();

    const [{ data: contextRow, error: contextError }, { data: subjectRows, error: subjectError }] = await Promise.all([
      client
        .from('user_study_contexts')
        .select('context_payload')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('mode', 'faculdade')
        .maybeSingle(),
      client
        .from('academic_subjects')
        .select('id, name, workload_hours, professor_name, status')
        .eq('user_id', userId)
        .order('name', { ascending: true }),
    ]);

    if (contextError) {
      throw new Error(`Erro ao carregar contexto de faculdade: ${contextError.message}`);
    }

    if (subjectError) {
      throw new Error(`Erro ao carregar disciplinas: ${subjectError.message}`);
    }

    const subjects = ((subjectRows || []) as AcademicSubjectRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      workloadHours: row.workload_hours ?? null,
      professorName: row.professor_name ?? null,
      status: row.status,
    }));

    const subjectNameById = new Map(subjects.map((subject) => [subject.id, subject.name] as const));

    const [{ data: examRows, error: examError }, { data: assignmentRows, error: assignmentError }, { data: eventRows, error: eventError }] = await Promise.all([
      client
        .from('academic_exams')
        .select('id, subject_id, title, exam_date, status, weight, notes')
        .eq('user_id', userId)
        .order('exam_date', { ascending: true }),
      client
        .from('academic_assignments')
        .select('id, subject_id, title, due_date, priority, status, description')
        .eq('user_id', userId)
        .order('due_date', { ascending: true }),
      client
        .from('academic_calendar_events')
        .select('id, title, event_type, start_at, end_at, status, subject_id, details')
        .eq('user_id', userId)
        .order('start_at', { ascending: true })
    ]);

    if (examError) {
      throw new Error(`Erro ao carregar provas: ${examError.message}`);
    }

    if (assignmentError) {
      throw new Error(`Erro ao carregar trabalhos: ${assignmentError.message}`);
    }

    if (eventError) {
      throw new Error(`Erro ao carregar calendario academico: ${eventError.message}`);
    }

    const exams = ((examRows || []) as AcademicExamRow[]).map((row) => ({
      id: row.id,
      subjectId: row.subject_id,
      subjectName: subjectNameById.get(row.subject_id) || 'Disciplina',
      title: row.title,
      date: row.exam_date,
      status: row.status,
      weight: row.weight ?? null,
      notes: row.notes ?? null,
    }));

    const assignments = ((assignmentRows || []) as AcademicAssignmentRow[]).map((row) => ({
      id: row.id,
      subjectId: row.subject_id,
      subjectName: subjectNameById.get(row.subject_id) || 'Disciplina',
      title: row.title,
      dueDate: row.due_date,
      priority: row.priority ?? null,
      status: row.status,
      description: row.description ?? null,
    }));

    const events = ((eventRows || []) as AcademicCalendarEventRow[]).map((row) => ({
      id: row.id,
      subjectId: row.subject_id ?? null,
      title: row.title,
      type: row.event_type,
      startAt: row.start_at,
      endAt: row.end_at ?? null,
      status: row.status,
      subjectName: row.subject_id ? subjectNameById.get(row.subject_id) || 'Disciplina' : null,
      details: row.details ?? null,
    }));
    const upcomingEvents = events
      .filter((event) => event.status !== 'cancelado' && event.startAt >= nowIso)
      .slice(0, 6);

    const nextExam = exams.find((exam) => exam.status === 'pendente' && exam.date >= nowIso) || null;
    const nextAssignment =
      assignments.find((assignment) => assignment.status !== 'entregue' && assignment.dueDate >= nowIso) || null;
    const payload = (contextRow as StudyContextRow | null)?.context_payload?.faculdade;

    return {
      profile: {
        institutionName: payload?.institutionName || null,
        courseName: payload?.courseName || null,
        currentPeriodLabel: payload?.academicPeriodLabel || null,
        focus: payload?.focus || null,
      },
      subjects,
      exams,
      assignments,
      events,
      nextExam,
      nextAssignment,
      upcomingEvents,
      summary: {
        activeSubjects: subjects.filter((subject) => subject.status === 'ativa').length,
        pendingExams: exams.filter((exam) => exam.status === 'pendente').length,
        pendingAssignments: assignments.filter((assignment) => assignment.status !== 'entregue').length,
        upcomingEvents: upcomingEvents.length,
      },
    };
  }
}

export const faculdadeDashboardService = new FaculdadeDashboardService();
