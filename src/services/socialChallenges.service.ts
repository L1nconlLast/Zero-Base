import { isSupabaseConfigured, supabase } from './supabase.client';
import type { ChallengeParticipant, GroupChallenge } from '../types/social';

interface ChallengeRow {
  id: string;
  group_id: string;
  name: string;
  goal_type: string;
  goal_value: number;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ChallengeParticipantRow {
  id: string;
  challenge_id: string;
  user_id: string;
  progress: number;
  completed: boolean;
  joined_at: string;
}

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado.');
  }

  return supabase;
};

const toGroupChallenge = (row: ChallengeRow): GroupChallenge => ({
  id: row.id,
  groupId: row.group_id,
  name: row.name,
  goalType: row.goal_type,
  goalValue: Number(row.goal_value),
  startDate: row.start_date,
  endDate: row.end_date,
  status: row.status,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toChallengeParticipant = (row: ChallengeParticipantRow): ChallengeParticipant => ({
  id: row.id,
  challengeId: row.challenge_id,
  userId: row.user_id,
  progress: Number(row.progress),
  completed: row.completed,
  joinedAt: row.joined_at,
});

class SocialChallengesService {
  async listChallengesByGroup(groupId: string): Promise<GroupChallenge[]> {
    const client = assertClient();

    const { data, error } = await client
      .from('challenges')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar desafios: ${error.message}`);
    }

    return ((data || []) as ChallengeRow[]).map(toGroupChallenge);
  }

  async createChallenge(input: {
    groupId: string;
    createdBy: string;
    name: string;
    goalType?: string;
    goalValue: number;
    startDate: string;
    endDate: string;
  }): Promise<GroupChallenge> {
    const client = assertClient();

    const { data, error } = await client
      .from('challenges')
      .insert({
        group_id: input.groupId,
        created_by: input.createdBy,
        name: input.name,
        goal_type: input.goalType || 'minutes',
        goal_value: input.goalValue,
        start_date: input.startDate,
        end_date: input.endDate,
        status: 'active',
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao criar desafio: ${error.message}`);
    }

    return toGroupChallenge(data as ChallengeRow);
  }

  async joinChallenge(challengeId: string, userId: string): Promise<ChallengeParticipant> {
    const client = assertClient();

    const { data, error } = await client
      .from('challenge_participants')
      .upsert(
        {
          challenge_id: challengeId,
          user_id: userId,
          progress: 0,
          completed: false,
        },
        { onConflict: 'challenge_id,user_id' },
      )
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao entrar no desafio: ${error.message}`);
    }

    return toChallengeParticipant(data as ChallengeParticipantRow);
  }

  async listParticipants(challengeId: string): Promise<ChallengeParticipant[]> {
    const client = assertClient();

    const { data, error } = await client
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('progress', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar participantes: ${error.message}`);
    }

    return ((data || []) as ChallengeParticipantRow[]).map(toChallengeParticipant);
  }

  async upsertOwnProgress(input: {
    challengeId: string;
    userId: string;
    progress: number;
    completed?: boolean;
  }): Promise<ChallengeParticipant> {
    const client = assertClient();

    const nextProgress = Math.max(0, Number.isFinite(input.progress) ? input.progress : 0);

    const { data, error } = await client
      .from('challenge_participants')
      .upsert(
        {
          challenge_id: input.challengeId,
          user_id: input.userId,
          progress: nextProgress,
          completed: input.completed ?? false,
        },
        { onConflict: 'challenge_id,user_id' },
      )
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar progresso: ${error.message}`);
    }

    return toChallengeParticipant(data as ChallengeParticipantRow);
  }
}

export const socialChallengesService = new SocialChallengesService();
