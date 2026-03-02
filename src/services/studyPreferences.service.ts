import { isSupabaseConfigured, supabase } from './supabase.client';

export type StudyTrackPreference = 'enem' | 'concursos' | 'hibrido';

interface UserStudyPreferenceRow {
  user_id: string;
  goal_type: StudyTrackPreference;
  hybrid_enem_weight: number;
  weekly_goal_minutes: number;
  primary_track: 'enem' | 'concursos';
  secondary_track: 'enem' | 'concursos' | null;
}

interface UserStudyPreferencePayload {
  user_id: string;
  goal_type: StudyTrackPreference;
  hybrid_enem_weight: number;
  weekly_goal_minutes: number;
  primary_track: 'enem' | 'concursos';
  secondary_track: 'enem' | 'concursos' | null;
}

const TABLE_NAME = 'user_study_preferences';

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
};

export interface UserStudyPreference {
  goalType: StudyTrackPreference;
  hybridEnemWeight: number;
  weeklyGoalMinutes: number;
  primaryTrack: 'enem' | 'concursos';
  secondaryTrack: 'enem' | 'concursos' | null;
}

const fromRow = (row: UserStudyPreferenceRow): UserStudyPreference => ({
  goalType: row.goal_type,
  hybridEnemWeight: row.hybrid_enem_weight,
  weeklyGoalMinutes: row.weekly_goal_minutes,
  primaryTrack: row.primary_track,
  secondaryTrack: row.secondary_track,
});

const toRow = (userId: string, preference: UserStudyPreference): UserStudyPreferencePayload => ({
  user_id: userId,
  goal_type: preference.goalType,
  hybrid_enem_weight: preference.hybridEnemWeight,
  weekly_goal_minutes: preference.weeklyGoalMinutes,
  primary_track: preference.primaryTrack,
  secondary_track: preference.secondaryTrack,
});

class StudyPreferencesService {
  async getByUser(userId: string): Promise<UserStudyPreference | null> {
    const client = assertClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar preferências de estudo: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return fromRow(data as UserStudyPreferenceRow);
  }

  async upsert(userId: string, preference: UserStudyPreference): Promise<void> {
    const client = assertClient();

    const payload = toRow(userId, preference);

    const { error } = await client.from(TABLE_NAME).upsert(payload, { onConflict: 'user_id' });

    if (error) {
      throw new Error(`Erro ao salvar preferências de estudo: ${error.message}`);
    }
  }
}

export const studyPreferencesService = new StudyPreferencesService();
