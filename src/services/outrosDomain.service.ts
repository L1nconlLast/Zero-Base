import { isSupabaseConfigured, supabase } from './supabase.client';
import { studyContextService } from './studyContext.service';
import type {
  ExperienceLevel,
  OutrosGoalType,
  PersonalGoalEventType,
  StudyContextPayload,
  UserStudyContextRecord,
} from '../features/studyContext';

type LearningTopicStatus = 'ativo' | 'pausado' | 'concluido';
type LearningGoalStatus = 'ativo' | 'concluido' | 'arquivado';
type LearningPathStatus = 'ativa' | 'pausada' | 'concluida';
type LearningPathStepStatus = 'nao_iniciado' | 'em_andamento' | 'concluido';
type PersonalGoalEventStatus = 'pendente' | 'concluido' | 'cancelado';

interface LearningTopicRow {
  id: string;
  name: string;
  level: ExperienceLevel;
  status: LearningTopicStatus;
}

interface LearningGoalRow {
  id: string;
  topic_id: string;
  goal_type: OutrosGoalType;
  status: LearningGoalStatus;
}

interface LearningPathRow {
  id: string;
  topic_id: string;
  status: LearningPathStatus;
}

interface LearningPathStepRow {
  id: string;
  path_id: string;
  title: string;
  description: string | null;
  step_order: number;
  status: LearningPathStepStatus;
}

interface CreateLearningTopicInput {
  name: string;
  category?: string | null;
  level?: ExperienceLevel;
}

interface UpdateLearningTopicInput extends CreateLearningTopicInput {
  status: LearningTopicStatus;
}

interface CreateLearningGoalInput {
  topicId: string;
  goalType: OutrosGoalType;
  description?: string | null;
}

interface UpdateLearningGoalInput extends CreateLearningGoalInput {
  status: LearningGoalStatus;
}

interface CreateLearningPathInput {
  topicId: string;
  title: string;
  steps: string[];
}

interface UpdateLearningPathInput {
  topicId: string;
  title: string;
  status: LearningPathStatus;
}

interface UpdateLearningPathStepInput {
  title: string;
  description?: string | null;
  status: LearningPathStepStatus;
}

interface CreatePersonalGoalEventInput {
  topicId?: string | null;
  title: string;
  type: PersonalGoalEventType;
  startAt: string;
  endAt?: string | null;
}

interface UpdatePersonalGoalEventInput extends CreatePersonalGoalEventInput {
  status: PersonalGoalEventStatus;
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

class OutrosDomainService {
  private async updateActiveContext(
    userId: string,
    updater: (record: UserStudyContextRecord) => {
      contextSummary?: string | null;
      contextDescription?: string | null;
      contextPayload: StudyContextPayload;
    },
  ): Promise<void> {
    const activeContext = await studyContextService.getActiveByUser(userId);
    if (!activeContext || activeContext.mode !== 'outros') {
      return;
    }

    const next = updater(activeContext);
    await studyContextService.upsertActive(userId, {
      mode: 'outros',
      contextSummary: next.contextSummary ?? activeContext.contextSummary ?? null,
      contextDescription: next.contextDescription ?? activeContext.contextDescription ?? null,
      contextPayload: next.contextPayload,
    });
  }

  private async syncContextFromDomain(userId: string): Promise<void> {
    const client = assertClient();

    const [{ data: topicRows, error: topicError }, { data: goalRows, error: goalError }] = await Promise.all([
      client
        .from('learning_topics')
        .select('id, name, level, status')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      client
        .from('learning_goals')
        .select('id, topic_id, goal_type, status')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
    ]);

    if (topicError) {
      throw new Error(`Erro ao sincronizar tema ativo do modo livre: ${topicError.message}`);
    }

    if (goalError) {
      throw new Error(`Erro ao sincronizar objetivo ativo do modo livre: ${goalError.message}`);
    }

    const topics = (topicRows || []) as LearningTopicRow[];
    const goals = (goalRows || []) as LearningGoalRow[];
    const activeTopic =
      topics.find((topic) => topic.status === 'ativo')
      || topics.find((topic) => topic.status !== 'concluido')
      || topics[0]
      || null;
    const activeGoal =
      goals.find((goal) => goal.status === 'ativo' && goal.topic_id === activeTopic?.id)
      || goals.find((goal) => goal.status === 'ativo')
      || goals.find((goal) => goal.status !== 'arquivado')
      || goals[0]
      || null;

    await this.updateActiveContext(userId, (record) => ({
      contextPayload: {
        ...record.contextPayload,
        outros: {
          ...record.contextPayload.outros,
          topicName: activeTopic?.name || null,
          level: activeTopic?.level || null,
          goalType: activeGoal?.goal_type || null,
        },
      },
    }));
  }

  private async getPathSteps(
    client: ReturnType<typeof assertClient>,
    userId: string,
    pathId: string,
  ): Promise<LearningPathStepRow[]> {
    const { data, error } = await client
      .from('learning_path_steps')
      .select('id, path_id, title, description, step_order, status')
      .eq('user_id', userId)
      .eq('path_id', pathId)
      .order('step_order', { ascending: true });

    if (error) {
      throw new Error(`Erro ao carregar passos da trilha: ${error.message}`);
    }

    return (data || []) as LearningPathStepRow[];
  }

  private async resequencePathSteps(
    client: ReturnType<typeof assertClient>,
    userId: string,
    pathId: string,
  ): Promise<void> {
    const steps = await this.getPathSteps(client, userId, pathId);

    await Promise.all(
      steps.map(async (step, index) => {
        const nextOrder = index + 1;
        if (step.step_order === nextOrder) {
          return;
        }

        const { error } = await client
          .from('learning_path_steps')
          .update({ step_order: nextOrder })
          .eq('user_id', userId)
          .eq('id', step.id);

        if (error) {
          throw new Error(`Erro ao reordenar passos da trilha: ${error.message}`);
        }
      }),
    );
  }

  private async normalizePathProgress(
    client: ReturnType<typeof assertClient>,
    userId: string,
    pathId: string,
    options: { forceActive?: boolean } = {},
  ): Promise<void> {
    const { data: pathData, error: pathError } = await client
      .from('learning_paths')
      .select('id, status')
      .eq('user_id', userId)
      .eq('id', pathId)
      .maybeSingle();

    if (pathError) {
      throw new Error(`Erro ao carregar trilha atual: ${pathError.message}`);
    }

    if (!pathData) {
      return;
    }

    const path = pathData as Pick<LearningPathRow, 'id' | 'status'>;
    const steps = await this.getPathSteps(client, userId, pathId);
    const totalSteps = steps.length;
    const completedSteps = steps.filter((step) => step.status === 'concluido').length;
    const firstPendingStep = steps.find((step) => step.status !== 'concluido') || null;

    await Promise.all(
      steps.map(async (step) => {
        if (step.status === 'concluido') {
          return;
        }

        const nextStatus: LearningPathStepStatus =
          firstPendingStep?.id === step.id ? 'em_andamento' : 'nao_iniciado';

        if (step.status === nextStatus) {
          return;
        }

        const { error } = await client
          .from('learning_path_steps')
          .update({ status: nextStatus })
          .eq('user_id', userId)
          .eq('id', step.id);

        if (error) {
          throw new Error(`Erro ao atualizar status dos passos: ${error.message}`);
        }
      }),
    );

    const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    const nextStatus: LearningPathStatus =
      totalSteps > 0 && completedSteps === totalSteps
        ? 'concluida'
        : path.status === 'pausada' && !options.forceActive
          ? 'pausada'
          : 'ativa';

    const { error: updateError } = await client
      .from('learning_paths')
      .update({
        progress_percent: progressPercent,
        status: nextStatus,
      })
      .eq('user_id', userId)
      .eq('id', pathId);

    if (updateError) {
      throw new Error(`Erro ao recalcular progresso da trilha: ${updateError.message}`);
    }
  }

  async createTopic(userId: string, input: CreateLearningTopicInput): Promise<string> {
    const client = assertClient();

    const { data, error } = await client
      .from('learning_topics')
      .insert({
        user_id: userId,
        name: input.name.trim(),
        category: input.category?.trim() || null,
        level: input.level || 'iniciante',
        status: 'ativo',
      })
      .select('id, name, level, status')
      .single();

    if (error) {
      throw new Error(`Erro ao criar tema: ${error.message}`);
    }

    await this.syncContextFromDomain(userId);
    return (data as LearningTopicRow).id;
  }

  async updateTopic(userId: string, topicId: string, input: UpdateLearningTopicInput): Promise<void> {
    const client = assertClient();

    const { error } = await client
      .from('learning_topics')
      .update({
        name: input.name.trim(),
        category: input.category?.trim() || null,
        level: input.level || 'iniciante',
        status: input.status,
      })
      .eq('user_id', userId)
      .eq('id', topicId);

    if (error) {
      throw new Error(`Erro ao atualizar tema: ${error.message}`);
    }

    await this.syncContextFromDomain(userId);
  }

  async deleteTopic(userId: string, topicId: string): Promise<void> {
    const client = assertClient();

    const { error } = await client
      .from('learning_topics')
      .delete()
      .eq('user_id', userId)
      .eq('id', topicId);

    if (error) {
      throw new Error(`Erro ao remover tema: ${error.message}`);
    }

    await this.syncContextFromDomain(userId);
  }

  async createGoal(userId: string, input: CreateLearningGoalInput): Promise<void> {
    const client = assertClient();

    const { error } = await client.from('learning_goals').insert({
      user_id: userId,
      topic_id: input.topicId,
      goal_type: input.goalType,
      description: input.description?.trim() || null,
      status: 'ativo',
    });

    if (error) {
      throw new Error(`Erro ao criar objetivo: ${error.message}`);
    }

    await this.syncContextFromDomain(userId);
  }

  async updateGoal(userId: string, goalId: string, input: UpdateLearningGoalInput): Promise<void> {
    const client = assertClient();

    const { error } = await client
      .from('learning_goals')
      .update({
        topic_id: input.topicId,
        goal_type: input.goalType,
        description: input.description?.trim() || null,
        status: input.status,
      })
      .eq('user_id', userId)
      .eq('id', goalId);

    if (error) {
      throw new Error(`Erro ao atualizar objetivo: ${error.message}`);
    }

    await this.syncContextFromDomain(userId);
  }

  async deleteGoal(userId: string, goalId: string): Promise<void> {
    const client = assertClient();

    const { error } = await client
      .from('learning_goals')
      .delete()
      .eq('user_id', userId)
      .eq('id', goalId);

    if (error) {
      throw new Error(`Erro ao remover objetivo: ${error.message}`);
    }

    await this.syncContextFromDomain(userId);
  }

  async createPath(userId: string, input: CreateLearningPathInput): Promise<void> {
    const client = assertClient();

    const { data, error } = await client
      .from('learning_paths')
      .insert({
        user_id: userId,
        topic_id: input.topicId,
        title: input.title.trim(),
        progress_percent: 0,
        status: 'ativa',
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Erro ao criar trilha: ${error.message}`);
    }

    const path = data as Pick<LearningPathRow, 'id'>;
    const cleanedSteps = input.steps.map((step) => step.trim()).filter(Boolean);

    if (cleanedSteps.length === 0) {
      return;
    }

    const { error: stepsError } = await client.from('learning_path_steps').insert(
      cleanedSteps.map((stepTitle, index) => ({
        user_id: userId,
        path_id: path.id,
        title: stepTitle,
        step_order: index + 1,
        status: index === 0 ? 'em_andamento' : 'nao_iniciado',
      })),
    );

    if (stepsError) {
      throw new Error(`Erro ao criar passos da trilha: ${stepsError.message}`);
    }
  }

  async updatePath(userId: string, pathId: string, input: UpdateLearningPathInput): Promise<void> {
    const client = assertClient();

    const { error } = await client
      .from('learning_paths')
      .update({
        topic_id: input.topicId,
        title: input.title.trim(),
        status: input.status,
      })
      .eq('user_id', userId)
      .eq('id', pathId);

    if (error) {
      throw new Error(`Erro ao atualizar trilha: ${error.message}`);
    }

    await this.normalizePathProgress(client, userId, pathId);
  }

  async deletePath(userId: string, pathId: string): Promise<void> {
    const client = assertClient();

    const { error } = await client
      .from('learning_paths')
      .delete()
      .eq('user_id', userId)
      .eq('id', pathId);

    if (error) {
      throw new Error(`Erro ao remover trilha: ${error.message}`);
    }
  }

  async updatePathStep(userId: string, stepId: string, input: UpdateLearningPathStepInput): Promise<void> {
    const client = assertClient();

    const { data: currentStepData, error: currentStepError } = await client
      .from('learning_path_steps')
      .select('id, path_id, title, description, step_order, status')
      .eq('user_id', userId)
      .eq('id', stepId)
      .single();

    if (currentStepError) {
      throw new Error(`Erro ao carregar passo atual: ${currentStepError.message}`);
    }

    const currentStep = currentStepData as LearningPathStepRow;

    const { error } = await client
      .from('learning_path_steps')
      .update({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status: input.status,
      })
      .eq('user_id', userId)
      .eq('id', stepId);

    if (error) {
      throw new Error(`Erro ao atualizar passo: ${error.message}`);
    }

    await this.normalizePathProgress(client, userId, currentStep.path_id, {
      forceActive: input.status === 'concluido',
    });
  }

  async deletePathStep(userId: string, stepId: string): Promise<void> {
    const client = assertClient();

    const { data: currentStepData, error: currentStepError } = await client
      .from('learning_path_steps')
      .select('id, path_id, title, description, step_order, status')
      .eq('user_id', userId)
      .eq('id', stepId)
      .single();

    if (currentStepError) {
      throw new Error(`Erro ao carregar passo atual: ${currentStepError.message}`);
    }

    const currentStep = currentStepData as LearningPathStepRow;

    const { error } = await client
      .from('learning_path_steps')
      .delete()
      .eq('user_id', userId)
      .eq('id', stepId);

    if (error) {
      throw new Error(`Erro ao remover passo: ${error.message}`);
    }

    await this.resequencePathSteps(client, userId, currentStep.path_id);
    await this.normalizePathProgress(client, userId, currentStep.path_id);
  }

  async completeStep(userId: string, stepId: string): Promise<void> {
    const client = assertClient();

    const { data: currentStepData, error: currentStepError } = await client
      .from('learning_path_steps')
      .select('id, path_id, title, description, step_order, status')
      .eq('user_id', userId)
      .eq('id', stepId)
      .single();

    if (currentStepError) {
      throw new Error(`Erro ao carregar passo atual: ${currentStepError.message}`);
    }

    const currentStep = currentStepData as LearningPathStepRow;

    const { error: updateError } = await client
      .from('learning_path_steps')
      .update({ status: 'concluido' })
      .eq('user_id', userId)
      .eq('id', currentStep.id);

    if (updateError) {
      throw new Error(`Erro ao concluir passo: ${updateError.message}`);
    }

    await this.normalizePathProgress(client, userId, currentStep.path_id, { forceActive: true });
  }

  async createGoalEvent(userId: string, input: CreatePersonalGoalEventInput): Promise<void> {
    const client = assertClient();

    const { error } = await client.from('personal_goal_events').insert({
      user_id: userId,
      topic_id: input.topicId || null,
      title: input.title.trim(),
      event_type: input.type,
      start_at: new Date(input.startAt).toISOString(),
      end_at: input.endAt ? new Date(input.endAt).toISOString() : null,
      status: 'pendente',
    });

    if (error) {
      throw new Error(`Erro ao criar evento do modo livre: ${error.message}`);
    }
  }

  async updateGoalEvent(userId: string, eventId: string, input: UpdatePersonalGoalEventInput): Promise<void> {
    const client = assertClient();

    const { error } = await client
      .from('personal_goal_events')
      .update({
        topic_id: input.topicId || null,
        title: input.title.trim(),
        event_type: input.type,
        start_at: new Date(input.startAt).toISOString(),
        end_at: input.endAt ? new Date(input.endAt).toISOString() : null,
        status: input.status,
      })
      .eq('user_id', userId)
      .eq('id', eventId);

    if (error) {
      throw new Error(`Erro ao atualizar evento do modo livre: ${error.message}`);
    }
  }

  async deleteGoalEvent(userId: string, eventId: string): Promise<void> {
    const client = assertClient();

    const { error } = await client
      .from('personal_goal_events')
      .delete()
      .eq('user_id', userId)
      .eq('id', eventId);

    if (error) {
      throw new Error(`Erro ao remover evento do modo livre: ${error.message}`);
    }
  }

  async seedDemoData(userId: string): Promise<void> {
    const client = assertClient();
    const activeContext = await studyContextService.getActiveByUser(userId);
    const payload = activeContext?.contextPayload.outros || null;

    const { data: topicRows, error: topicError } = await client
      .from('learning_topics')
      .select('id, name, level, status')
      .eq('user_id', userId)
      .limit(1);

    if (topicError) {
      throw new Error(`Erro ao verificar tema demo: ${topicError.message}`);
    }

    let topicId = ((topicRows || []) as LearningTopicRow[])[0]?.id || null;

    if (!topicId) {
      topicId = await this.createTopic(userId, {
        name: payload?.topicName || 'JavaScript moderno',
        category: 'Tecnologia',
        level: payload?.level || 'iniciante',
      });
    }

    const { count: goalsCount, error: goalsError } = await client
      .from('learning_goals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (goalsError) {
      throw new Error(`Erro ao verificar objetivo demo: ${goalsError.message}`);
    }

    if ((goalsCount || 0) === 0 && topicId) {
      await this.createGoal(userId, {
        topicId,
        goalType: payload?.goalType || 'praticar',
        description: 'Manter ritmo semanal com pratica e pequenos blocos de evolucao.',
      });
    }

    const { count: pathsCount, error: pathsError } = await client
      .from('learning_paths')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (pathsError) {
      throw new Error(`Erro ao verificar trilha demo: ${pathsError.message}`);
    }

    if ((pathsCount || 0) === 0 && topicId) {
      await this.createPath(userId, {
        topicId,
        title: 'Base pratica de JavaScript',
        steps: [
          'Fechar fundamentos de variaveis e tipos',
          'Praticar funcoes e arrays com exercicios curtos',
          'Montar mini projeto de lista de tarefas',
        ],
      });
    }

    const { count: eventsCount, error: eventsError } = await client
      .from('personal_goal_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (eventsError) {
      throw new Error(`Erro ao verificar eventos demo: ${eventsError.message}`);
    }

    if ((eventsCount || 0) === 0) {
      await this.createGoalEvent(userId, {
        topicId,
        title: 'Meta semanal de pratica',
        type: 'meta',
        startAt: addDays(2),
      });
      await this.createGoalEvent(userId, {
        topicId,
        title: 'Revisao curta dos conceitos-chave',
        type: 'revisao',
        startAt: addDays(5),
      });
    }
  }
}

export const outrosDomainService = new OutrosDomainService();
