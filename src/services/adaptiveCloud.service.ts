import { isSupabaseConfigured, supabase } from './supabase.client';
import type { AdaptiveSnapshot, QuestionAttempt } from './adaptiveLearning.service';

interface AdaptiveAttemptRow {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  correct: boolean;
  response_time_seconds: number;
  created_at: string;
}

interface AdaptiveAttemptInsert {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  correct: boolean;
  response_time_seconds: number;
  created_at: string;
}

const TABLE_NAME = 'question_attempts';

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
};

const fromRow = (row: AdaptiveAttemptRow): QuestionAttempt => ({
  id: row.id,
  subject: row.subject as QuestionAttempt['subject'],
  topic: row.topic,
  difficulty: row.difficulty,
  correct: row.correct,
  responseTimeSeconds: row.response_time_seconds,
  createdAt: row.created_at,
});

const toRow = (userId: string, attempt: QuestionAttempt): AdaptiveAttemptInsert => ({
  id: attempt.id,
  user_id: userId,
  subject: attempt.subject,
  topic: attempt.topic,
  difficulty: attempt.difficulty,
  correct: attempt.correct,
  response_time_seconds: attempt.responseTimeSeconds,
  created_at: attempt.createdAt,
});

class AdaptiveCloudService {
  async listByUser(userId: string): Promise<QuestionAttempt[]> {
    const client = assertClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar tentativas adaptativas: ${error.message}`);
    }

    return ((data || []) as AdaptiveAttemptRow[]).map(fromRow);
  }

  async create(userId: string, attempt: QuestionAttempt): Promise<void> {
    const client = assertClient();
    const payload = toRow(userId, attempt);

    const { error } = await client.from(TABLE_NAME).upsert(payload, { onConflict: 'id' });

    if (error) {
      throw new Error(`Erro ao salvar tentativa adaptativa: ${error.message}`);
    }
  }

  async createMany(userId: string, attempts: QuestionAttempt[]): Promise<void> {
    if (attempts.length === 0) {
      return;
    }

    const client = assertClient();
    const payload = attempts.map((attempt) => toRow(userId, attempt));

    const { error } = await client.from(TABLE_NAME).upsert(payload, { onConflict: 'id' });

    if (error) {
      throw new Error(`Erro ao sincronizar tentativas adaptativas: ${error.message}`);
    }
  }

  async syncDerivedData(userId: string, snapshot: AdaptiveSnapshot): Promise<void> {
    const client = assertClient();
    void snapshot;

    const { error } = await client.rpc('rebuild_adaptive_analytics', {
      p_user_id: userId,
    });

    if (error) {
      throw new Error(`Erro ao recalcular analytics adaptativo no servidor: ${error.message}`);
    }
  }
}

export const adaptiveCloudService = new AdaptiveCloudService();
