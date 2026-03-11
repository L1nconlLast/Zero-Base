import { isSupabaseConfigured, supabase } from './supabase.client';

export interface MockExamCloudSession {
  id: string;
  date: string;
  track: 'enem' | 'concurso' | 'ambos';
  modelId?: string | null;
  modelName?: string | null;
  banca?: string | null;
  category?: string | null;
  totalQuestions: number;
  correctCount: number;
  xpEarned: number;
  avgTimePerQuestionSec: number;
  mistakesByTopic: Record<string, number>;
}

export interface DailyQuizCloudSession {
  id: string;
  date: string;
  track: 'enem' | 'concurso' | 'ambos';
  totalQuestions: number;
  correctCount: number;
  xpEarned: number;
  streak: number;
  weakTopics: string[];
}

const MOCK_TABLE = 'mock_exam_sessions';
const DAILY_TABLE = 'daily_quiz_sessions';

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY).');
  }

  return supabase;
};

class QuestionsCloudService {
  async saveMockExamSession(userId: string, payload: MockExamCloudSession): Promise<void> {
    const client = assertClient();

    const { error } = await client.from(MOCK_TABLE).upsert(
      {
        id: payload.id,
        user_id: userId,
        date: payload.date,
        track: payload.track,
        model_id: payload.modelId,
        model_name: payload.modelName,
        banca: payload.banca,
        total_questions: payload.totalQuestions,
        correct_count: payload.correctCount,
        xp_earned: payload.xpEarned,
        avg_time_per_question_sec: payload.avgTimePerQuestionSec,
        mistakes_by_topic: payload.mistakesByTopic,
      },
      { onConflict: 'id' },
    );

    if (error) {
      throw new Error(`Erro ao salvar simulado na nuvem: ${error.message}`);
    }

    // Save aggregated category analytics if a category is provided
    if (payload.category) {
      const timeSpentSec = Math.max(0, payload.avgTimePerQuestionSec * payload.totalQuestions);
      const { error: categoryError } = await client.rpc('update_category_analytics', {
        p_user_id: userId,
        p_category: payload.category,
        p_correct_count: payload.correctCount,
        p_total_questions: payload.totalQuestions,
        p_time_spent_sec: timeSpentSec,
      });

      if (categoryError) {
        console.error('Erro ao salvar analytics da categoria:', categoryError);
      }
    }
  }

  async saveDailyQuizSession(userId: string, payload: DailyQuizCloudSession): Promise<void> {
    const client = assertClient();

    const { error } = await client.from(DAILY_TABLE).upsert(
      {
        id: payload.id,
        user_id: userId,
        date: payload.date,
        track: payload.track,
        total_questions: payload.totalQuestions,
        correct_count: payload.correctCount,
        xp_earned: payload.xpEarned,
        streak: payload.streak,
        weak_topics: payload.weakTopics,
      },
      { onConflict: 'id' },
    );

    if (error) {
      throw new Error(`Erro ao salvar quiz diário na nuvem: ${error.message}`);
    }
  }
}

export const questionsCloudService = new QuestionsCloudService();
