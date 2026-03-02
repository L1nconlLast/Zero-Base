import { isSupabaseConfigured, supabase } from './supabase.client';

export type ProfileTrackPreference = 'enem' | 'concursos' | 'hibrido';

interface ProfilePreferencesRow {
  user_id: string;
  display_name: string;
  avatar: string;
  exam_goal: string;
  exam_date: string | null;
  preferred_track: ProfileTrackPreference;
  profile_change_history: Array<{ at: string; summary: string }>;
  last_saved_at: string;
  updated_at: string;
}

export interface ProfilePreferences {
  displayName: string;
  avatar: string;
  examGoal: string;
  examDate: string;
  preferredTrack: ProfileTrackPreference;
  changeHistory: Array<{ at: string; summary: string }>;
  lastSavedAt: string;
  updatedAt: string;
}

const TABLE_NAME = 'user_profile_preferences';

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado.');
  }

  return supabase;
};

const fromRow = (row: ProfilePreferencesRow): ProfilePreferences => ({
  displayName: row.display_name || '',
  avatar: row.avatar || '🧑‍⚕️',
  examGoal: row.exam_goal || '',
  examDate: row.exam_date || '',
  preferredTrack: row.preferred_track || 'enem',
  changeHistory: Array.isArray(row.profile_change_history) ? row.profile_change_history : [],
  lastSavedAt: row.last_saved_at,
  updatedAt: row.updated_at,
});

class ProfilePreferencesService {
  async getByUser(userId: string): Promise<ProfilePreferences | null> {
    const client = assertClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar perfil: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return fromRow(data as ProfilePreferencesRow);
  }

  async upsert(
    userId: string,
    payload: {
      displayName: string;
      avatar: string;
      examGoal: string;
      examDate: string;
      preferredTrack: ProfileTrackPreference;
      changeHistory: Array<{ at: string; summary: string }>;
      lastSavedAt: string;
    }
  ): Promise<void> {
    const client = assertClient();

    const { error } = await client.from(TABLE_NAME).upsert(
      {
        user_id: userId,
        display_name: payload.displayName,
        avatar: payload.avatar,
        exam_goal: payload.examGoal,
        exam_date: payload.examDate || null,
        preferred_track: payload.preferredTrack,
        profile_change_history: payload.changeHistory,
        last_saved_at: payload.lastSavedAt,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      throw new Error(`Erro ao salvar perfil: ${error.message}`);
    }
  }
}

export const profilePreferencesService = new ProfilePreferencesService();
