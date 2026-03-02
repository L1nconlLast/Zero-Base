// ============================================================
// src/services/feedback.service.ts
// CRUD para feedback do usuário na tabela user_feedback
// ============================================================

import { isSupabaseConfigured, supabase } from './supabase.client';

export interface FeedbackPayload {
  type: 'bug' | 'feature' | 'elogio' | 'outro';
  message: string;
  page?: string;
  rating?: number; // 1-5
}

interface FeedbackRow {
  id: string;
  user_id: string;
  type: string;
  message: string;
  page: string | null;
  rating: number | null;
  created_at: string;
}

class FeedbackService {
  async submit(userId: string, payload: FeedbackPayload): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase não configurado.');
    }

    const { error } = await supabase
      .from('user_feedback')
      .insert({
        user_id: userId,
        type: payload.type,
        message: payload.message,
        page: payload.page ?? null,
        rating: payload.rating ?? null,
      });

    if (error) {
      throw new Error(`Erro ao enviar feedback: ${error.message}`);
    }
  }

  async listByUser(userId: string): Promise<FeedbackRow[]> {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('user_feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Erro ao buscar feedback: ${error.message}`);
    }

    return (data || []) as FeedbackRow[];
  }
}

export const feedbackService = new FeedbackService();
