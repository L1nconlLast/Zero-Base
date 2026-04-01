import { isSupabaseConfigured, supabase } from './supabase.client';
import { studyContextService } from './studyContext.service';
import type {
  AcademicCalendarEventType,
  FaculdadeContextPayload,
  InstitutionType,
} from '../features/studyContext';

interface AcademicInstitutionRow {
  id: string;
  name: string;
  institution_type: InstitutionType;
}

interface AcademicCourseRow {
  id: string;
  name: string;
}

interface AcademicPeriodRow {
  id: string;
  label: string;
  number: number | null;
}

interface AcademicSubjectRow {
  id: string;
  name: string;
}

interface CreateAcademicSubjectInput {
  name: string;
  professorName?: string | null;
  workloadHours?: number | null;
}

interface UpdateAcademicSubjectInput {
  name: string;
  professorName?: string | null;
  workloadHours?: number | null;
  status: 'ativa' | 'concluida' | 'trancada';
}

interface CreateAcademicExamInput {
  subjectId: string;
  title: string;
  date: string;
  weight?: number | null;
}

interface UpdateAcademicExamInput {
  subjectId: string;
  title: string;
  date: string;
  weight?: number | null;
  status: 'pendente' | 'concluida';
  notes?: string | null;
}

interface CreateAcademicAssignmentInput {
  subjectId: string;
  title: string;
  dueDate: string;
  priority?: 'baixa' | 'media' | 'alta' | 'critica';
  description?: string | null;
}

interface UpdateAcademicAssignmentInput {
  subjectId: string;
  title: string;
  dueDate: string;
  priority?: 'baixa' | 'media' | 'alta' | 'critica';
  description?: string | null;
  status: 'nao_iniciado' | 'em_andamento' | 'entregue';
}

interface CreateAcademicCalendarEventInput {
  title: string;
  type: AcademicCalendarEventType;
  startAt: string;
  endAt?: string | null;
  subjectId?: string | null;
  details?: string | null;
}

interface UpdateAcademicCalendarEventInput {
  title: string;
  type: AcademicCalendarEventType;
  startAt: string;
  endAt?: string | null;
  subjectId?: string | null;
  details?: string | null;
  status: 'pendente' | 'concluido' | 'cancelado';
}

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao configurado.');
  }

  return supabase;
};

const addDays = (days: number): string => {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString();
};

class FaculdadeDomainService {
  private async deleteCalendarEventsByForeignKey(
    client: ReturnType<typeof assertClient>,
    userId: string,
    column: 'subject_id' | 'exam_id' | 'assignment_id',
    id: string,
  ): Promise<void> {
    const { error } = await client
      .from('academic_calendar_events')
      .delete()
      .eq('user_id', userId)
      .eq(column, id);

    if (error) {
      throw new Error(`Erro ao limpar eventos relacionados: ${error.message}`);
    }
  }

  private async ensureAcademicBase(userId: string): Promise<{
    institutionId: string | null;
    courseId: string | null;
    academicPeriodId: string | null;
  }> {
    const client = assertClient();
    const activeContext = await studyContextService.getActiveByUser(userId);
    const payload = activeContext?.contextPayload.faculdade || null;

    const institution = await this.ensureInstitution(client, userId, payload);
    const course = await this.ensureCourse(client, userId, institution?.id || null, payload);
    const period = await this.ensurePeriod(client, userId, payload);

    return {
      institutionId: institution?.id || null,
      courseId: course?.id || null,
      academicPeriodId: period?.id || null,
    };
  }

  private async ensureInstitution(
    client: ReturnType<typeof assertClient>,
    userId: string,
    payload: FaculdadeContextPayload | null,
  ): Promise<AcademicInstitutionRow | null> {
    const { data: existingRows, error: existingError } = await client
      .from('academic_institutions')
      .select('id, name, institution_type')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .limit(1);

    if (existingError) {
      throw new Error(`Erro ao ler instituicao academica: ${existingError.message}`);
    }

    const existing = ((existingRows || []) as AcademicInstitutionRow[])[0] || null;
    if (existing) {
      return existing;
    }

    if (!payload?.institutionName) {
      return null;
    }

    const { data, error } = await client
      .from('academic_institutions')
      .insert({
        user_id: userId,
        name: payload.institutionName,
        institution_type: payload.institutionType || 'outra',
        is_primary: true,
      })
      .select('id, name, institution_type')
      .single();

    if (error) {
      throw new Error(`Erro ao criar instituicao academica: ${error.message}`);
    }

    return data as AcademicInstitutionRow;
  }

  private async ensureCourse(
    client: ReturnType<typeof assertClient>,
    userId: string,
    institutionId: string | null,
    payload: FaculdadeContextPayload | null,
  ): Promise<AcademicCourseRow | null> {
    const { data: existingRows, error: existingError } = await client
      .from('academic_courses')
      .select('id, name')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .limit(1);

    if (existingError) {
      throw new Error(`Erro ao ler curso academico: ${existingError.message}`);
    }

    const existing = ((existingRows || []) as AcademicCourseRow[])[0] || null;
    if (existing) {
      return existing;
    }

    if (!payload?.courseName) {
      return null;
    }

    const { data, error } = await client
      .from('academic_courses')
      .insert({
        user_id: userId,
        institution_id: institutionId,
        name: payload.courseName,
        is_primary: true,
      })
      .select('id, name')
      .single();

    if (error) {
      throw new Error(`Erro ao criar curso academico: ${error.message}`);
    }

    return data as AcademicCourseRow;
  }

  private async ensurePeriod(
    client: ReturnType<typeof assertClient>,
    userId: string,
    payload: FaculdadeContextPayload | null,
  ): Promise<AcademicPeriodRow | null> {
    const { data: existingRows, error: existingError } = await client
      .from('academic_periods')
      .select('id, label, number')
      .eq('user_id', userId)
      .order('is_current', { ascending: false })
      .limit(1);

    if (existingError) {
      throw new Error(`Erro ao ler periodo academico: ${existingError.message}`);
    }

    const existing = ((existingRows || []) as AcademicPeriodRow[])[0] || null;
    if (existing) {
      return existing;
    }

    if (!payload?.academicPeriodLabel) {
      return null;
    }

    const { data, error } = await client
      .from('academic_periods')
      .insert({
        user_id: userId,
        label: payload.academicPeriodLabel,
        number: payload.academicPeriodNumber ?? null,
        is_current: true,
      })
      .select('id, label, number')
      .single();

    if (error) {
      throw new Error(`Erro ao criar periodo academico: ${error.message}`);
    }

    return data as AcademicPeriodRow;
  }

  async createSubject(userId: string, input: CreateAcademicSubjectInput): Promise<void> {
    const client = assertClient();
    const base = await this.ensureAcademicBase(userId);

    const { error } = await client.from('academic_subjects').insert({
      user_id: userId,
      institution_id: base.institutionId,
      course_id: base.courseId,
      academic_period_id: base.academicPeriodId,
      name: input.name.trim(),
      professor_name: input.professorName?.trim() || null,
      workload_hours: input.workloadHours ?? null,
      status: 'ativa',
    });

    if (error) {
      throw new Error(`Erro ao criar disciplina: ${error.message}`);
    }
  }

  async updateSubject(userId: string, subjectId: string, input: UpdateAcademicSubjectInput): Promise<void> {
    const client = assertClient();

    const { error } = await client
      .from('academic_subjects')
      .update({
        name: input.name.trim(),
        professor_name: input.professorName?.trim() || null,
        workload_hours: input.workloadHours ?? null,
        status: input.status,
      })
      .eq('user_id', userId)
      .eq('id', subjectId);

    if (error) {
      throw new Error(`Erro ao atualizar disciplina: ${error.message}`);
    }
  }

  async deleteSubject(userId: string, subjectId: string): Promise<void> {
    const client = assertClient();

    await this.deleteCalendarEventsByForeignKey(client, userId, 'subject_id', subjectId);

    const { error } = await client
      .from('academic_subjects')
      .delete()
      .eq('user_id', userId)
      .eq('id', subjectId);

    if (error) {
      throw new Error(`Erro ao remover disciplina: ${error.message}`);
    }
  }

  async createExam(userId: string, input: CreateAcademicExamInput): Promise<void> {
    const client = assertClient();

    const { error } = await client.from('academic_exams').insert({
      user_id: userId,
      subject_id: input.subjectId,
      title: input.title.trim(),
      exam_date: new Date(input.date).toISOString(),
      weight: input.weight ?? null,
      status: 'pendente',
    });

    if (error) {
      throw new Error(`Erro ao criar prova: ${error.message}`);
    }
  }

  async updateExam(userId: string, examId: string, input: UpdateAcademicExamInput): Promise<void> {
    const client = assertClient();

    const { error } = await client
      .from('academic_exams')
      .update({
        subject_id: input.subjectId,
        title: input.title.trim(),
        exam_date: new Date(input.date).toISOString(),
        weight: input.weight ?? null,
        notes: input.notes?.trim() || null,
        status: input.status,
      })
      .eq('user_id', userId)
      .eq('id', examId);

    if (error) {
      throw new Error(`Erro ao atualizar prova: ${error.message}`);
    }
  }

  async deleteExam(userId: string, examId: string): Promise<void> {
    const client = assertClient();

    await this.deleteCalendarEventsByForeignKey(client, userId, 'exam_id', examId);

    const { error } = await client
      .from('academic_exams')
      .delete()
      .eq('user_id', userId)
      .eq('id', examId);

    if (error) {
      throw new Error(`Erro ao remover prova: ${error.message}`);
    }
  }

  async createAssignment(userId: string, input: CreateAcademicAssignmentInput): Promise<void> {
    const client = assertClient();

    const { error } = await client.from('academic_assignments').insert({
      user_id: userId,
      subject_id: input.subjectId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      due_date: new Date(input.dueDate).toISOString(),
      priority: input.priority || 'media',
      status: 'nao_iniciado',
    });

    if (error) {
      throw new Error(`Erro ao criar trabalho: ${error.message}`);
    }
  }

  async updateAssignment(userId: string, assignmentId: string, input: UpdateAcademicAssignmentInput): Promise<void> {
    const client = assertClient();

    const { error } = await client
      .from('academic_assignments')
      .update({
        subject_id: input.subjectId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        due_date: new Date(input.dueDate).toISOString(),
        priority: input.priority || 'media',
        status: input.status,
      })
      .eq('user_id', userId)
      .eq('id', assignmentId);

    if (error) {
      throw new Error(`Erro ao atualizar trabalho: ${error.message}`);
    }
  }

  async deleteAssignment(userId: string, assignmentId: string): Promise<void> {
    const client = assertClient();

    await this.deleteCalendarEventsByForeignKey(client, userId, 'assignment_id', assignmentId);

    const { error } = await client
      .from('academic_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('id', assignmentId);

    if (error) {
      throw new Error(`Erro ao remover trabalho: ${error.message}`);
    }
  }

  async createCalendarEvent(userId: string, input: CreateAcademicCalendarEventInput): Promise<void> {
    const client = assertClient();

    const { error } = await client.from('academic_calendar_events').insert({
      user_id: userId,
      subject_id: input.subjectId || null,
      title: input.title.trim(),
      event_type: input.type,
      start_at: new Date(input.startAt).toISOString(),
      end_at: input.endAt ? new Date(input.endAt).toISOString() : null,
      details: input.details?.trim() || null,
      status: 'pendente',
    });

    if (error) {
      throw new Error(`Erro ao criar evento academico: ${error.message}`);
    }
  }

  async updateCalendarEvent(userId: string, eventId: string, input: UpdateAcademicCalendarEventInput): Promise<void> {
    const client = assertClient();

    const { error } = await client
      .from('academic_calendar_events')
      .update({
        subject_id: input.subjectId || null,
        title: input.title.trim(),
        event_type: input.type,
        start_at: new Date(input.startAt).toISOString(),
        end_at: input.endAt ? new Date(input.endAt).toISOString() : null,
        details: input.details?.trim() || null,
        status: input.status,
      })
      .eq('user_id', userId)
      .eq('id', eventId);

    if (error) {
      throw new Error(`Erro ao atualizar evento academico: ${error.message}`);
    }
  }

  async deleteCalendarEvent(userId: string, eventId: string): Promise<void> {
    const client = assertClient();

    const { error } = await client
      .from('academic_calendar_events')
      .delete()
      .eq('user_id', userId)
      .eq('id', eventId);

    if (error) {
      throw new Error(`Erro ao remover evento academico: ${error.message}`);
    }
  }

  async seedDemoData(userId: string): Promise<void> {
    const client = assertClient();
    const base = await this.ensureAcademicBase(userId);

    const { data: existingSubjects, error: subjectsError } = await client
      .from('academic_subjects')
      .select('id, name')
      .eq('user_id', userId)
      .limit(3);

    if (subjectsError) {
      throw new Error(`Erro ao verificar seed academica: ${subjectsError.message}`);
    }

    let subjects = (existingSubjects || []) as AcademicSubjectRow[];

    if (subjects.length === 0) {
      const { data: createdSubjects, error: insertSubjectsError } = await client
        .from('academic_subjects')
        .insert([
          {
            user_id: userId,
            institution_id: base.institutionId,
            course_id: base.courseId,
            academic_period_id: base.academicPeriodId,
            name: 'Calculo I',
            professor_name: 'Prof. Helena Rocha',
            workload_hours: 60,
          },
          {
            user_id: userId,
            institution_id: base.institutionId,
            course_id: base.courseId,
            academic_period_id: base.academicPeriodId,
            name: 'Algoritmos',
            professor_name: 'Prof. Bruno Lima',
            workload_hours: 80,
          },
          {
            user_id: userId,
            institution_id: base.institutionId,
            course_id: base.courseId,
            academic_period_id: base.academicPeriodId,
            name: 'Banco de Dados',
            professor_name: 'Prof. Camila Torres',
            workload_hours: 60,
          },
        ])
        .select('id, name');

      if (insertSubjectsError) {
        throw new Error(`Erro ao popular disciplinas demo: ${insertSubjectsError.message}`);
      }

      subjects = (createdSubjects || []) as AcademicSubjectRow[];
    }

    const [firstSubject, secondSubject, thirdSubject] = subjects;

    const { count: examsCount, error: examsCountError } = await client
      .from('academic_exams')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (examsCountError) {
      throw new Error(`Erro ao verificar provas demo: ${examsCountError.message}`);
    }

    if ((examsCount || 0) === 0 && firstSubject) {
      await this.createExam(userId, {
        subjectId: firstSubject.id,
        title: 'P1 de Calculo',
        date: addDays(7),
        weight: 4,
      });
    }

    const { count: assignmentsCount, error: assignmentsCountError } = await client
      .from('academic_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (assignmentsCountError) {
      throw new Error(`Erro ao verificar trabalhos demo: ${assignmentsCountError.message}`);
    }

    if ((assignmentsCount || 0) === 0 && secondSubject) {
      await this.createAssignment(userId, {
        subjectId: secondSubject.id,
        title: 'Relatorio de Algoritmos',
        dueDate: addDays(4),
        priority: 'alta',
        description: 'Entregar pseudocodigo e analise do problema proposto.',
      });
    }

    const { count: eventsCount, error: eventsCountError } = await client
      .from('academic_calendar_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (eventsCountError) {
      throw new Error(`Erro ao verificar eventos demo: ${eventsCountError.message}`);
    }

    if ((eventsCount || 0) === 0) {
      const eventInputs: CreateAcademicCalendarEventInput[] = [
        {
          title: 'Revisao guiada de limites',
          type: 'estudo',
          startAt: addDays(2),
          subjectId: firstSubject?.id || null,
        },
        {
          title: 'Entrega parcial do relatorio',
          type: 'entrega',
          startAt: addDays(4),
          subjectId: secondSubject?.id || null,
        },
        {
          title: 'Plantao de duvidas de modelagem',
          type: 'aula_importante',
          startAt: addDays(6),
          subjectId: thirdSubject?.id || null,
        },
      ];

      for (const input of eventInputs) {
        await this.createCalendarEvent(userId, input);
      }
    }
  }
}

export const faculdadeDomainService = new FaculdadeDomainService();
