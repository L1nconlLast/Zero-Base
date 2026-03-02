import { isSupabaseConfigured, supabase } from './supabase.client';

export type MentorMessageRole = 'assistant' | 'user';

export interface MentorMessage {
  id: string;
  role: MentorMessageRole;
  content: string;
  createdAt: string;
}

interface MentorMessageRow {
  id: string;
  user_id: string;
  role: MentorMessageRole;
  content: string;
  created_at: string;
}

const TABLE_NAME = 'mentor_messages';
const STORAGE_PREFIX = 'mdz_mentor_messages_';
const MAX_LOCAL_MESSAGES = 120;

const getStorageKey = (userKey: string): string => `${STORAGE_PREFIX}${userKey}`;

const toRow = (userId: string, message: MentorMessage): MentorMessageRow => ({
  id: message.id,
  user_id: userId,
  role: message.role,
  content: message.content,
  created_at: message.createdAt,
});

const fromRow = (row: MentorMessageRow): MentorMessage => ({
  id: row.id,
  role: row.role,
  content: row.content,
  createdAt: row.created_at,
});

const generateMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

class MentorIAService {
  getLocalMessages(userKey: string): MentorMessage[] {
    try {
      const raw = window.localStorage.getItem(getStorageKey(userKey));
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as MentorMessage[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed;
    } catch {
      return [];
    }
  }

  saveLocalMessages(userKey: string, messages: MentorMessage[]): void {
    try {
      const normalized = messages.slice(-MAX_LOCAL_MESSAGES);
      window.localStorage.setItem(getStorageKey(userKey), JSON.stringify(normalized));
    } catch {
      // ignore localStorage write failures
    }
  }

  async listCloudMessages(userId: string): Promise<MentorMessage[]> {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(MAX_LOCAL_MESSAGES);

    if (error) {
      throw new Error(`Erro ao carregar histórico do Mentor IA: ${error.message}`);
    }

    return ((data || []) as MentorMessageRow[]).map(fromRow);
  }

  async saveCloudMessages(userId: string, messages: MentorMessage[]): Promise<void> {
    if (!isSupabaseConfigured || !supabase || messages.length === 0) {
      return;
    }

    const payload = messages.map((message) => toRow(userId, message));

    const { error } = await supabase.from(TABLE_NAME).upsert(payload, { onConflict: 'id' });

    if (error) {
      throw new Error(`Erro ao salvar histórico do Mentor IA: ${error.message}`);
    }
  }

  /**
   * Persiste uma única mensagem na nuvem (fire-and-forget friendly).
   * Usa upsert para ser idempotente caso a mesma mensagem seja enviada mais de uma vez.
   */
  async pushCloudMessage(userId: string, message: MentorMessage): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(toRow(userId, message), { onConflict: 'id' });

    if (error) {
      throw new Error(`Erro ao persistir mensagem do Mentor IA: ${error.message}`);
    }
  }

  /**
   * Remove todas as mensagens de um usuário na nuvem.
   * Útil para "limpar conversa" / reset de histórico.
   */
  async deleteCloudMessages(userId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao limpar histórico do Mentor IA: ${error.message}`);
    }
  }

  createMessage(role: MentorMessageRole, content: string): MentorMessage {
    return {
      id: generateMessageId(),
      role,
      content,
      createdAt: new Date().toISOString(),
    };
  }

  mergeMessages(localMessages: MentorMessage[], cloudMessages: MentorMessage[]): MentorMessage[] {
    const map = new Map<string, MentorMessage>();

    [...localMessages, ...cloudMessages].forEach((message) => {
      map.set(message.id, message);
    });

    return Array.from(map.values())
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-MAX_LOCAL_MESSAGES);
  }
}

export const mentorIAService = new MentorIAService();
