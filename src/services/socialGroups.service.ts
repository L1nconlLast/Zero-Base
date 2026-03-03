import { isSupabaseConfigured, supabase } from './supabase.client';
import { offlineSyncService } from './offlineSync.service';
import type { GroupMember, GroupMessage, StudyGroup } from '../types/social';

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface GroupMemberRow {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

interface GroupMessageRow {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  attachment_url: string | null;
  created_at: string;
}

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado.');
  }

  return supabase;
};

const toStudyGroup = (row: GroupRow): StudyGroup => ({
  id: row.id,
  name: row.name,
  description: row.description,
  avatarUrl: row.avatar_url,
  isPrivate: row.is_private,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toGroupMember = (row: GroupMemberRow): GroupMember => ({
  id: row.id,
  groupId: row.group_id,
  userId: row.user_id,
  role: row.role,
  joinedAt: row.joined_at,
});

const toGroupMessage = (row: GroupMessageRow): GroupMessage => ({
  id: row.id,
  groupId: row.group_id,
  userId: row.user_id,
  content: row.content,
  attachmentUrl: row.attachment_url,
  createdAt: row.created_at,
});

class SocialGroupsService {
  async listGroups(): Promise<StudyGroup[]> {
    const client = assertClient();

    const { data, error } = await client
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar grupos: ${error.message}`);
    }

    return ((data || []) as GroupRow[]).map(toStudyGroup);
  }

  async createGroup(input: {
    name: string;
    description?: string;
    avatarUrl?: string;
    isPrivate?: boolean;
    createdBy: string;
  }): Promise<StudyGroup> {
    const client = assertClient();

    const { data, error } = await client
      .from('groups')
      .insert({
        name: input.name,
        description: input.description || null,
        avatar_url: input.avatarUrl || null,
        is_private: input.isPrivate ?? false,
        created_by: input.createdBy,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao criar grupo: ${error.message}`);
    }

    return toStudyGroup(data as GroupRow);
  }

  async joinGroup(groupId: string, userId: string): Promise<GroupMember> {
    const client = assertClient();

    const { data, error } = await client
      .from('group_members')
      .upsert(
        {
          group_id: groupId,
          user_id: userId,
          role: 'member',
        },
        { onConflict: 'group_id,user_id' },
      )
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao entrar no grupo: ${error.message}`);
    }

    return toGroupMember(data as GroupMemberRow);
  }

  async listMessages(groupId: string): Promise<GroupMessage[]> {
    const client = assertClient();

    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar mensagens: ${error.message}`);
    }

    return ((data || []) as GroupMessageRow[]).map(toGroupMessage);
  }

  async sendMessage(payload: {
    groupId: string;
    userId: string;
    content: string;
    attachmentUrl?: string;
  }): Promise<GroupMessage> {
    const localNow = new Date().toISOString();
    const queuePayload = {
      group_id: payload.groupId,
      user_id: payload.userId,
      content: payload.content,
      attachment_url: payload.attachmentUrl || null,
      local_updated_at: localNow,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await offlineSyncService.enqueue({
        action: 'CREATE',
        table: 'messages',
        data: queuePayload,
      });

      return {
        id: `local-${Date.now()}`,
        groupId: payload.groupId,
        userId: payload.userId,
        content: payload.content,
        attachmentUrl: payload.attachmentUrl || null,
        createdAt: localNow,
      };
    }

    const client = assertClient();

    const { data, error } = await client
      .from('messages')
      .insert({
        group_id: payload.groupId,
        user_id: payload.userId,
        content: payload.content,
        attachment_url: payload.attachmentUrl || null,
      })
      .select('*')
      .single();

    if (error) {
      const message = `Erro ao enviar mensagem: ${error.message}`;

      if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
        await offlineSyncService.enqueue({
          action: 'CREATE',
          table: 'messages',
          data: queuePayload,
        });

        return {
          id: `local-${Date.now()}`,
          groupId: payload.groupId,
          userId: payload.userId,
          content: payload.content,
          attachmentUrl: payload.attachmentUrl || null,
          createdAt: localNow,
        };
      }

      throw new Error(message);
    }

    return toGroupMessage(data as GroupMessageRow);
  }
}

export const socialGroupsService = new SocialGroupsService();
