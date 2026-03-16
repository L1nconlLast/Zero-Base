import { createClient } from '@supabase/supabase-js';

interface TopicProgressInput {
  userId: string;
  topicId: string;
  status: 'locked' | 'available' | 'studying' | 'completed' | 'review';
  score?: number;
  studyMinutes?: number;
  attemptsDelta?: number;
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

class LearningGraphService {
  isConfigured(): boolean {
    return Boolean(supabase);
  }

  async listDisciplines() {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('disciplinas')
      .select('id, nome, modalidade_id, ordem, ativo, modalidades(nome)')
      .eq('ativo', true)
      .order('ordem', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true });

    if (error) throw new Error(`listDisciplines failed: ${error.message}`);
    return data || [];
  }

  async listTopics(filters?: { disciplineId?: string; search?: string; level?: string }) {
    if (!supabase) return [];

    let query = supabase
      .from('topicos')
      .select('id, nome, descricao, disciplina_id, nivel_dificuldade, ordem, ativo, topico_dna(dificuldade, frequencia_enem, frequencia_concursos, tempo_medio_aprendizado_min, relevancia_global)')
      .eq('ativo', true)
      .order('ordem', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true });

    if (filters?.disciplineId) {
      query = query.eq('disciplina_id', filters.disciplineId);
    }

    if (filters?.level) {
      query = query.eq('nivel_dificuldade', filters.level);
    }

    if (filters?.search?.trim()) {
      query = query.ilike('nome', `%${filters.search.trim()}%`);
    }

    const { data, error } = await query.limit(500);
    if (error) throw new Error(`listTopics failed: ${error.message}`);
    return data || [];
  }

  async getTopic(topicId: string) {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('topicos')
      .select('id, nome, descricao, disciplina_id, nivel_dificuldade, ordem, ativo, disciplinas(id, nome, modalidade_id), topico_dna(*)')
      .eq('id', topicId)
      .maybeSingle();

    if (error) throw new Error(`getTopic failed: ${error.message}`);
    return data;
  }

  async getTopicPrerequisites(topicId: string) {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('topico_prerequisitos')
      .select('mastery_required, prerequisito_id, topicos!topico_prerequisitos_prerequisito_id_fkey(id, nome, disciplina_id, nivel_dificuldade)')
      .eq('topico_id', topicId)
      .order('mastery_required', { ascending: false });

    if (error) throw new Error(`getTopicPrerequisites failed: ${error.message}`);
    return data || [];
  }

  async getTopicDependents(topicId: string) {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('topico_prerequisitos')
      .select('topico_id, mastery_required, topicos!topico_prerequisitos_topico_id_fkey(id, nome, disciplina_id, nivel_dificuldade)')
      .eq('prerequisito_id', topicId)
      .order('mastery_required', { ascending: false });

    if (error) throw new Error(`getTopicDependents failed: ${error.message}`);
    return data || [];
  }

  async listPrerequisiteEdges(disciplineId?: string) {
    if (!supabase) return [];

    let query = supabase
      .from('topico_prerequisitos')
      .select('topico_id, prerequisito_id, mastery_required, topicos!inner(disciplina_id)');

    if (disciplineId) {
      query = query.eq('topicos.disciplina_id', disciplineId);
    }

    const { data, error } = await query.limit(2000);
    if (error) throw new Error(`listPrerequisiteEdges failed: ${error.message}`);

    return (data || []).map((row) => ({
      topico_id: row.topico_id,
      prerequisito_id: row.prerequisito_id,
      mastery_required: row.mastery_required,
    }));
  }

  async upsertProgress(input: TopicProgressInput) {
    if (!supabase) return null;

    const { data: currentRows, error: fetchError } = await supabase
      .from('user_learning_progress')
      .select('tentativas, tempo_estudo_min')
      .eq('usuario_id', input.userId)
      .eq('topico_id', input.topicId)
      .limit(1);

    if (fetchError) throw new Error(`upsertProgress fetch failed: ${fetchError.message}`);

    const current = currentRows?.[0];
    const attempts = (current?.tentativas || 0) + (input.attemptsDelta || 0);
    const studyMinutes = (current?.tempo_estudo_min || 0) + (input.studyMinutes || 0);

    const { data, error } = await supabase
      .from('user_learning_progress')
      .upsert(
        {
          usuario_id: input.userId,
          topico_id: input.topicId,
          status: input.status,
          pontuacao: Math.max(0, Math.min(100, input.score ?? 0)),
          tempo_estudo_min: Math.max(0, studyMinutes),
          tentativas: Math.max(0, attempts),
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'usuario_id,topico_id' },
      )
      .select('usuario_id, topico_id, status, pontuacao, tempo_estudo_min, tentativas, atualizado_em')
      .single();

    if (error) throw new Error(`upsertProgress failed: ${error.message}`);
    return data;
  }

  async getUserProgress(userId: string, disciplineId?: string) {
    if (!supabase) return [];

    let query = supabase
      .from('user_learning_progress')
      .select('usuario_id, topico_id, status, pontuacao, tempo_estudo_min, tentativas, atualizado_em, topicos(id, nome, disciplina_id)')
      .eq('usuario_id', userId)
      .order('atualizado_em', { ascending: false });

    if (disciplineId) {
      query = query.eq('topicos.disciplina_id', disciplineId);
    }

    const { data, error } = await query.limit(500);
    if (error) throw new Error(`getUserProgress failed: ${error.message}`);
    return data || [];
  }

  async getNextTopic(userId: string, disciplineId?: string) {
    if (!supabase) return null;

    const { data, error } = await supabase.rpc('sp_next_topic_for_user', {
      p_usuario_id: userId,
      p_disciplina_id: disciplineId || null,
    });

    if (error) throw new Error(`getNextTopic failed: ${error.message}`);
    return (data && data[0]) || null;
  }
}

export const learningGraphService = new LearningGraphService();
