import { isSupabaseConfigured, supabase } from './supabase.client';
import type {
  StudyContextMode,
  StudyContextPayload,
  UserStudyContextRecord,
} from '../features/studyContext';

interface StudyContextRow {
  id: string;
  user_id: string;
  mode: StudyContextMode;
  is_active: boolean;
  context_summary: string | null;
  context_description: string | null;
  context_payload: StudyContextPayload | null;
  created_at: string;
  updated_at: string;
}

const TABLE_NAME = 'user_study_contexts';

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao configurado.');
  }

  return supabase;
};

const fromRow = (row: StudyContextRow): UserStudyContextRecord => ({
  id: row.id,
  userId: row.user_id,
  mode: row.mode,
  isActive: Boolean(row.is_active),
  contextSummary: row.context_summary || null,
  contextDescription: row.context_description || null,
  contextPayload: row.context_payload || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

class StudyContextService {
  async getActiveByUser(userId: string): Promise<UserStudyContextRecord | null> {
    const client = assertClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar contexto ativo: ${error.message}`);
    }

    if (!data) return null;

    return fromRow(data as StudyContextRow);
  }

  async listByUser(userId: string): Promise<UserStudyContextRecord[]> {
    const client = assertClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar contextos: ${error.message}`);
    }

    return (data || []).map((row) => fromRow(row as StudyContextRow));
  }

  async upsertActive(
    userId: string,
    payload: {
      mode: StudyContextMode;
      contextSummary?: string | null;
      contextDescription?: string | null;
      contextPayload: StudyContextPayload;
    },
  ): Promise<void> {
    const client = assertClient();

    const deactivateResult = await client
      .from(TABLE_NAME)
      .update({ is_active: false })
      .eq('user_id', userId)
      .neq('mode', payload.mode);

    if (deactivateResult.error) {
      throw new Error(`Erro ao desativar contextos antigos: ${deactivateResult.error.message}`);
    }

    const { error } = await client.from(TABLE_NAME).upsert(
      {
        user_id: userId,
        mode: payload.mode,
        is_active: true,
        context_summary: payload.contextSummary || null,
        context_description: payload.contextDescription || null,
        context_payload: payload.contextPayload,
      },
      { onConflict: 'user_id,mode' },
    );

    if (error) {
      throw new Error(`Erro ao salvar contexto de estudo: ${error.message}`);
    }
  }
}

export const studyContextService = new StudyContextService();
