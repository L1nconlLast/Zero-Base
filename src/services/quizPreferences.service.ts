import { isSupabaseConfigured, supabase } from './supabase.client';

const TABLE_NAME = 'user_profile_preferences';
const QUIZ_SIZE_OPTIONS = [5, 10, 20, 50] as const;

type QuizSizeOption = (typeof QUIZ_SIZE_OPTIONS)[number];

interface PreferencesRow {
  preferences: Record<string, unknown> | null;
}

const isValidQuizSize = (value: unknown): value is QuizSizeOption =>
  typeof value === 'number' && QUIZ_SIZE_OPTIONS.includes(value as QuizSizeOption);

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado.');
  }

  return supabase;
};

class QuizPreferencesService {
  async getPreferredQuizSize(userId: string): Promise<QuizSizeOption | null> {
    const client = assertClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('preferences')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar preferência do quiz: ${error.message}`);
    }

    const row = data as PreferencesRow | null;
    const rawSize = row?.preferences?.preferred_quiz_size;
    return isValidQuizSize(rawSize) ? rawSize : null;
  }

  async upsertPreferredQuizSize(userId: string, size: QuizSizeOption): Promise<void> {
    const client = assertClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('preferences')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao carregar preferências para atualização: ${error.message}`);
    }

    const row = data as PreferencesRow | null;
    const mergedPreferences = {
      ...(row?.preferences || {}),
      preferred_quiz_size: size,
    };

    const { error: upsertError } = await client
      .from(TABLE_NAME)
      .upsert(
        {
          user_id: userId,
          preferences: mergedPreferences,
        },
        { onConflict: 'user_id' },
      );

    if (upsertError) {
      throw new Error(`Erro ao salvar preferência do quiz: ${upsertError.message}`);
    }
  }
}

export const quizPreferencesService = new QuizPreferencesService();
