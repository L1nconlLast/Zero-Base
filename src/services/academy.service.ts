import { supabase, isSupabaseConfigured } from './supabase.client';

export interface AcademyProgressItem {
  content_id: string;
  completed_at: string;
}

export interface CompleteAcademyContentResult {
  success: boolean;
  alreadyCompleted: boolean;
  xpReward: number;
  newTotalXp: number;
  message: string;
}

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
};

class AcademyService {
  async getUserAcademyProgress(userId: string): Promise<AcademyProgressItem[]> {
    const client = assertClient();

    const { data, error } = await client
      .from('user_content_progress')
      .select('content_id, completed_at')
      .eq('user_id', userId)
      .eq('completed', true);

    if (error) {
      throw new Error(`Erro ao buscar progresso da academia: ${error.message}`);
    }

    return (data || []) as AcademyProgressItem[];
  }

  async completeContent(userId: string, contentId: string): Promise<CompleteAcademyContentResult> {
    const client = assertClient();

    const { data, error } = await client.rpc('complete_academy_content', {
      p_user_id: userId,
      p_content_id: contentId,
    });

    if (error) {
      throw new Error(`Erro ao concluir conteúdo: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : null;

    if (!row) {
      throw new Error('Resposta inválida da função complete_academy_content.');
    }

    return {
      success: Boolean(row.success),
      alreadyCompleted: Boolean(row.already_completed),
      xpReward: Number(row.xp_reward || 0),
      newTotalXp: Number(row.new_total_xp || 0),
      message: String(row.message || 'Operação concluída.'),
    };
  }
}

export const academyService = new AcademyService();
