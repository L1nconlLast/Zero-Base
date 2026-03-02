import { isSupabaseConfigured, supabase } from './supabase.client';

interface AchievementRow {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

const TABLE = 'user_achievements';

class AchievementsService {
  /** Lista IDs de conquistas desbloqueadas do usuário */
  async listUnlocked(userId: string): Promise<string[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    const { data, error } = await supabase
      .from(TABLE)
      .select('achievement_id')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao carregar conquistas: ${error.message}`);
    }

    return ((data || []) as Pick<AchievementRow, 'achievement_id'>[]).map(
      (r) => r.achievement_id,
    );
  }

  /** Registra uma conquista desbloqueada (idempotente) */
  async unlock(userId: string, achievementId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { user_id: userId, achievement_id: achievementId },
        { onConflict: 'user_id,achievement_id' },
      );

    if (error) {
      throw new Error(`Erro ao registrar conquista: ${error.message}`);
    }
  }

  /** Registra múltiplas conquistas de uma vez */
  async unlockBatch(userId: string, achievementIds: string[]): Promise<void> {
    if (!isSupabaseConfigured || !supabase || achievementIds.length === 0) return;

    const payload = achievementIds.map((aid) => ({
      user_id: userId,
      achievement_id: aid,
    }));

    const { error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'user_id,achievement_id' });

    if (error) {
      throw new Error(`Erro ao registrar conquistas em batch: ${error.message}`);
    }
  }

  /** Remove uma conquista (admin/debug) */
  async remove(userId: string, achievementId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('achievement_id', achievementId);

    if (error) {
      throw new Error(`Erro ao remover conquista: ${error.message}`);
    }
  }
}

export const achievementsService = new AchievementsService();
