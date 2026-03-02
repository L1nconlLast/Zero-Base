// ============================================================
// src/services/userProfile.service.ts
// Sync do perfil do usuário (XP, nível, streak, meta) com Supabase
// ============================================================

import { isSupabaseConfigured, supabase } from './supabase.client';
import type { WeekProgress } from '../types';

export interface UserProfileCloud {
  totalPoints: number;
  level: number;
  currentStreak: number;
  bestStreak: number;
  dailyGoal: number;
  weekProgress: WeekProgress;
  updatedAt: string;
}

interface ProfileRow {
  user_id: string;
  total_points: number;
  level: number;
  current_streak: number;
  best_streak: number;
  daily_goal: number;
  week_progress: WeekProgress;
  updated_at: string;
}

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado.');
  }
  return supabase;
};

class UserProfileService {
  /**
   * Busca o perfil do usuário na nuvem.
   * Retorna null se não existir.
   */
  async get(userId: string): Promise<UserProfileCloud | null> {
    const client = assertClient();

    const { data, error } = await client
      .from('user_profile')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar perfil: ${error.message}`);
    }

    if (!data) return null;

    const row = data as ProfileRow;
    return {
      totalPoints: row.total_points,
      level: row.level,
      currentStreak: row.current_streak,
      bestStreak: row.best_streak,
      dailyGoal: row.daily_goal,
      weekProgress: row.week_progress || {},
      updatedAt: row.updated_at,
    };
  }

  /**
   * Cria ou atualiza o perfil do usuário na nuvem.
   * Usa upsert com conflito no user_id.
   */
  async upsert(userId: string, profile: Partial<UserProfileCloud>): Promise<void> {
    const client = assertClient();

    const payload: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (profile.totalPoints !== undefined) payload.total_points = profile.totalPoints;
    if (profile.level !== undefined) payload.level = profile.level;
    if (profile.currentStreak !== undefined) payload.current_streak = profile.currentStreak;
    if (profile.bestStreak !== undefined) payload.best_streak = profile.bestStreak;
    if (profile.dailyGoal !== undefined) payload.daily_goal = profile.dailyGoal;
    if (profile.weekProgress !== undefined) payload.week_progress = profile.weekProgress;

    const { error } = await client
      .from('user_profile')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      throw new Error(`Erro ao salvar perfil: ${error.message}`);
    }
  }

  /**
   * Recalcula XP e nível a partir das sessions no servidor.
   */
  async recalculate(userId: string): Promise<void> {
    const client = assertClient();

    const { error } = await client.rpc('recalculate_user_profile', {
      p_user_id: userId,
    });

    if (error) {
      throw new Error(`Erro ao recalcular perfil: ${error.message}`);
    }
  }
}

export const userProfileService = new UserProfileService();
