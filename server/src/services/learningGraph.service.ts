import { createClient } from '@supabase/supabase-js';

interface TopicProgressInput {
  userId: string;
  topicId: string;
  status: 'locked' | 'available' | 'studying' | 'completed' | 'review';
  score?: number;
  studyMinutes?: number;
  attemptsDelta?: number;
}

interface ListTopicsFilters {
  disciplineId?: string;
  disciplineSlug?: string;
  disciplineIds?: string[];
  search?: string;
  level?: string;
  limit?: number;
}

interface BuildGraphPayloadFilters {
  disciplineId?: string;
  disciplineSlug?: string;
  track?: 'enem' | 'concurso';
  search?: string;
  level?: 'iniciante' | 'intermediario' | 'avancado';
  limit?: number;
  userId?: string;
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

const slugifyDiscipline = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

class LearningGraphService {
  isConfigured(): boolean {
    return Boolean(supabase);
  }

  private async resolveDisciplineIdBySlug(disciplineSlug?: string): Promise<string | undefined> {
    if (!disciplineSlug) return undefined;

    const normalizedSlug = slugifyDiscipline(disciplineSlug);
    const disciplines = await this.listDisciplines();
    const match = disciplines.find((discipline) => slugifyDiscipline(discipline.nome) === normalizedSlug);
    return match?.id;
  }

  async listDisciplines() {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('disciplinas')
      .select('id, nome, icone, cor_hex, modalidade_id, ordem, ativo, modalidades(nome)')
      .eq('ativo', true)
      .order('ordem', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true });

    if (error) throw new Error(`listDisciplines failed: ${error.message}`);

    return (data || []).map((discipline) => ({
      ...discipline,
      slug: slugifyDiscipline(discipline.nome),
    }));
  }

  async listTopics(filters?: ListTopicsFilters) {
    if (!supabase) return [];

    const limit = Math.min(5000, Math.max(1, filters?.limit ?? 800));
    const resolvedDisciplineId = filters?.disciplineId || await this.resolveDisciplineIdBySlug(filters?.disciplineSlug);

    let query = supabase
      .from('topicos')
      .select('id, nome, descricao, disciplina_id, area, subarea, tipo_no, nivel_dificuldade, ordem, ativo, topico_dna(dificuldade, frequencia_enem, frequencia_concursos, tempo_medio_aprendizado_min, relevancia_global), disciplinas(id, nome, modalidade_id, modalidades(nome))')
      .eq('ativo', true)
      .order('ordem', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true });

    if (resolvedDisciplineId) {
      query = query.eq('disciplina_id', resolvedDisciplineId);
    }

    if (filters?.disciplineIds?.length) {
      query = query.in('disciplina_id', filters.disciplineIds);
    }

    if (filters?.level) {
      query = query.eq('nivel_dificuldade', filters.level);
    }

    if (filters?.search?.trim()) {
      query = query.ilike('nome', `%${filters.search.trim()}%`);
    }

    const { data, error } = await query.limit(limit);
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

  async listRelatedEdges(disciplineId?: string) {
    if (!supabase) return [];

    let query = supabase
      .from('topico_relacoes')
      .select('source_topico_id, target_topico_id, tipo_relacao, peso, topicos!topico_relacoes_source_topico_id_fkey(disciplina_id)')
      .eq('tipo_relacao', 'related');

    if (disciplineId) {
      query = query.eq('topicos.disciplina_id', disciplineId);
    }

    const { data, error } = await query.limit(2000);

    if (error) {
      if (error.message.toLowerCase().includes('topico_relacoes')) {
        return [];
      }
      throw new Error(`listRelatedEdges failed: ${error.message}`);
    }

    return (data || []).map((row) => ({
      source_topico_id: row.source_topico_id,
      target_topico_id: row.target_topico_id,
      tipo_relacao: row.tipo_relacao,
      peso: row.peso,
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

  async buildGraphPayload(filters?: BuildGraphPayloadFilters) {
    if (!supabase) {
      return { nodes: [], edges: [], stats: { totalNodes: 0, totalEdges: 0, totalTopics: 0 } };
    }

    const allDisciplines = await this.listDisciplines();

    const disciplineIdsByTrack = filters?.track
      ? allDisciplines
        .filter((discipline) => {
          const relation = Array.isArray(discipline.modalidades) ? discipline.modalidades[0] : discipline.modalidades;
          const modalityName = (relation?.nome || '').toLowerCase();
          return filters.track === 'enem' ? modalityName.includes('enem') : modalityName.includes('concurso');
        })
        .map((discipline) => discipline.id)
      : [];

    const disciplineIds = filters?.disciplineId
      ? [filters.disciplineId]
      : disciplineIdsByTrack;

    const resolvedDisciplineId = filters?.disciplineId || await this.resolveDisciplineIdBySlug(filters?.disciplineSlug);

    const effectiveDisciplineIds = resolvedDisciplineId
      ? [resolvedDisciplineId]
      : disciplineIds;

    const topics = await this.listTopics({
      disciplineId: resolvedDisciplineId,
      disciplineIds: effectiveDisciplineIds.length > 0 ? effectiveDisciplineIds : undefined,
      search: filters?.search,
      level: filters?.level,
      limit: filters?.limit,
    });

    const topicIdSet = new Set(topics.map((topic) => topic.id));
    const selectedDisciplineIds = [...new Set(topics.map((topic) => topic.disciplina_id))];
    const disciplineById = new Map(allDisciplines.map((discipline) => [discipline.id, discipline]));

    const [prerequisiteEdges, relatedEdges, progress] = await Promise.all([
      this.listPrerequisiteEdges(resolvedDisciplineId),
      this.listRelatedEdges(resolvedDisciplineId),
      filters?.userId ? this.getUserProgress(filters.userId, resolvedDisciplineId) : Promise.resolve([]),
    ]);

    const progressByTopic = new Map(progress.map((row) => [row.topico_id, row]));
    const areaNodeIds = new Set<string>();

    const nodes: Array<Record<string, unknown>> = [];

    selectedDisciplineIds.forEach((disciplineId) => {
      const discipline = disciplineById.get(disciplineId);
      if (!discipline) return;

      const modalityRelation = Array.isArray(discipline.modalidades)
        ? discipline.modalidades[0]
        : (discipline.modalidades as { nome?: string } | null | undefined);

      nodes.push({
        id: `discipline:${discipline.id}`,
        type: 'discipline',
        data: {
          label: discipline.nome,
          disciplinaId: discipline.id,
          modalidade: modalityRelation?.nome,
        },
      });
    });

    topics.forEach((topic) => {
      const areaName = topic.area || 'Geral';
      const areaNodeId = `area:${topic.disciplina_id}:${areaName.toLowerCase().replace(/\s+/g, '-')}`;

      if (!areaNodeIds.has(areaNodeId)) {
        areaNodeIds.add(areaNodeId);
        nodes.push({
          id: areaNodeId,
          type: 'area',
          data: {
            label: areaName,
            disciplinaId: topic.disciplina_id,
          },
        });
      }

      const dna = Array.isArray(topic.topico_dna) ? topic.topico_dna[0] : topic.topico_dna;
      const userProgress = progressByTopic.get(topic.id);

      nodes.push({
        id: `topic:${topic.id}`,
        type: topic.tipo_no || 'topic',
        data: {
          label: topic.nome,
          topicoId: topic.id,
          disciplinaId: topic.disciplina_id,
          area: areaName,
          subarea: topic.subarea || null,
          dificuldade: dna?.dificuldade ?? null,
          frequencia_enem: dna?.frequencia_enem ?? null,
          frequencia_concurso: dna?.frequencia_concursos ?? null,
          tempo_estimado: dna?.tempo_medio_aprendizado_min ?? null,
          status: userProgress?.status || 'locked',
        },
      });
    });

    const hierarchyEdges = topics.flatMap((topic) => {
      const areaName = topic.area || 'Geral';
      const areaNodeId = `area:${topic.disciplina_id}:${areaName.toLowerCase().replace(/\s+/g, '-')}`;

      return [
        {
          id: `h:discipline:${topic.disciplina_id}->${areaNodeId}`,
          source: `discipline:${topic.disciplina_id}`,
          target: areaNodeId,
          type: 'hierarchy',
        },
        {
          id: `h:${areaNodeId}->topic:${topic.id}`,
          source: areaNodeId,
          target: `topic:${topic.id}`,
          type: 'hierarchy',
        },
      ];
    });

    const prerequisiteGraphEdges = prerequisiteEdges
      .filter((edge) => topicIdSet.has(edge.topico_id) && topicIdSet.has(edge.prerequisito_id))
      .map((edge) => ({
        id: `p:topic:${edge.prerequisito_id}->topic:${edge.topico_id}`,
        source: `topic:${edge.prerequisito_id}`,
        target: `topic:${edge.topico_id}`,
        type: 'prerequisite',
        data: {
          mastery_required: edge.mastery_required,
        },
      }));

    const relatedGraphEdges = relatedEdges
      .filter((edge) => topicIdSet.has(edge.source_topico_id) && topicIdSet.has(edge.target_topico_id))
      .map((edge) => ({
        id: `r:topic:${edge.source_topico_id}->topic:${edge.target_topico_id}`,
        source: `topic:${edge.source_topico_id}`,
        target: `topic:${edge.target_topico_id}`,
        type: 'related',
        data: {
          peso: edge.peso,
        },
      }));

    const edgeMap = new Map<string, Record<string, unknown>>();
    [...hierarchyEdges, ...prerequisiteGraphEdges, ...relatedGraphEdges].forEach((edge) => {
      edgeMap.set(edge.id as string, edge);
    });

    return {
      nodes,
      edges: [...edgeMap.values()],
      stats: {
        totalNodes: nodes.length,
        totalEdges: edgeMap.size,
        totalTopics: topics.length,
      },
    };
  }
}

export const learningGraphService = new LearningGraphService();
