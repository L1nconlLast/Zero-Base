import { supabase, isSupabaseConfigured } from './supabase.client';
import type { StudySession } from '../types';

interface StudySessionInsert {
  user_id: string;
  date: string;
  minutes: number;
  points: number;
  subject: string;
  duration: number;
  method_id?: string;
  goal_met?: boolean;
  timestamp?: string;
}

interface StudySessionRow {
  id: string;
  user_id: string;
  date: string;
  minutes: number;
  points: number;
  subject: string;
  duration: number;
  method_id: string | null;
  goal_met: boolean | null;
  timestamp: string | null;
  created_at: string;
}

const TABLE_NAME = 'study_sessions';

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
};

const toRow = (userId: string, session: StudySession): StudySessionInsert => ({
  user_id: userId,
  date: session.date,
  minutes: session.minutes,
  points: session.points,
  subject: session.subject,
  duration: session.duration,
  method_id: session.methodId,
  goal_met: session.goalMet,
  timestamp: session.timestamp,
});

const fromRow = (row: StudySessionRow): StudySession => ({
  date: row.date,
  minutes: row.minutes,
  points: row.points,
  subject: row.subject as StudySession['subject'],
  duration: row.duration,
  methodId: row.method_id ?? undefined,
  goalMet: row.goal_met ?? undefined,
  timestamp: row.timestamp ?? undefined,
});

class SessionService {
  async listByUser(userId: string): Promise<StudySession[]> {
    const client = assertClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar sessões: ${error.message}`);
    }

    return (data as StudySessionRow[]).map(fromRow);
  }

  async create(userId: string, session: StudySession): Promise<StudySession> {
    const client = assertClient();

    const payload = toRow(userId, session);

    const { data, error } = await client
      .from(TABLE_NAME)
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao criar sessão: ${error.message}`);
    }

    return fromRow(data as StudySessionRow);
  }

  async createMany(userId: string, sessions: StudySession[]): Promise<void> {
    if (sessions.length === 0) {
      return;
    }

    const client = assertClient();

    const payload = sessions.map((session) => toRow(userId, session));

    const { error } = await client.from(TABLE_NAME).insert(payload);

    if (error) {
      throw new Error(`Erro ao importar sessões: ${error.message}`);
    }
  }

  async deleteAllByUser(userId: string): Promise<void> {
    const client = assertClient();

    const { error } = await client.from(TABLE_NAME).delete().eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao limpar sessões: ${error.message}`);
    }
  }

  /**
   * Cria sessão via RPC server-side (anti-cheat).
   * Calcula XP e atualiza perfil atomicamente no servidor.
   */
  async createServerSide(
    userId: string,
    minutes: number,
    subject: string,
    methodId?: string,
  ): Promise<{ success: boolean; points?: number; totalPoints?: number; level?: number; error?: string }> {
    const client = assertClient();

    const { data, error } = await client.rpc('award_session_xp', {
      p_user_id: userId,
      p_minutes: minutes,
      p_subject: subject,
      p_method_id: methodId ?? null,
      p_session_date: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Erro ao registrar sessão server-side: ${error.message}`);
    }

    const result = data as { success: boolean; points?: number; total_points?: number; level?: number; error?: string };
    return {
      success: result.success,
      points: result.points,
      totalPoints: result.total_points,
      level: result.level,
      error: result.error,
    };
  }
}

export const sessionService = new SessionService();
