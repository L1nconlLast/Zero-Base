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

interface UserProfileRow {
  id: string;
  name: string | null;
  email: string | null;
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

const isAuthLockTimeout = (message?: string): boolean => {
  if (!message) return false;
  return message.includes('Navigator LockManager lock')
    || message.includes('auth-token')
    || message.includes('timed out waiting');
};

const delay = (ms: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, ms);
});

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

const toGroupMember = (row: GroupMemberRow, profile?: UserProfileRow): GroupMember => ({
  id: row.id,
  groupId: row.group_id,
  userId: row.user_id,
  userName: profile?.name || null,
  userEmail: profile?.email || null,
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
  private readonly attachmentBucket = 'group-message-attachments';

  async listGroups(): Promise<StudyGroup[]> {
    const client = assertClient();

    let data: GroupRow[] | null = null;
    let errorMessage: string | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { data: rows, error } = await client
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) {
        data = (rows || []) as GroupRow[];
        errorMessage = null;
        break;
      }

      errorMessage = error.message;

      if (!isAuthLockTimeout(error.message) || attempt === 1) {
        break;
      }

      await delay(400);
    }

    if (errorMessage) {
      throw new Error(`Erro ao listar grupos: ${errorMessage}`);
    }

    return (data || []).map(toStudyGroup);
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
      .insert(
        {
          group_id: groupId,
          user_id: userId,
          role: 'member',
        },
      )
      .select('*')
      .single();

    if (error) {
      const pgCode = (error as { code?: string }).code;

      // Usuário já no grupo: retorna o vínculo atual sem tentar atualizar role.
      if (pgCode === '23505') {
        const { data: existing, error: existingError } = await client
          .from('group_members')
          .select('*')
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .single();

        if (existingError || !existing) {
          throw new Error(`Erro ao entrar no grupo: ${existingError?.message || error.message}`);
        }

        return toGroupMember(existing as GroupMemberRow);
      }

      throw new Error(`Erro ao entrar no grupo: ${error.message}`);
    }

    return toGroupMember(data as GroupMemberRow);
  }

  async listMembers(groupId: string): Promise<GroupMember[]> {
    const client = assertClient();

    const { data, error } = await client
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar membros do grupo: ${error.message}`);
    }

    const rows = (data || []) as GroupMemberRow[];
    if (rows.length === 0) {
      return [];
    }

    const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
    const profileById = new Map<string, UserProfileRow>();

    try {
      const { data: usersData } = await client
        .from('users')
        .select('id, name, email')
        .in('id', userIds);

      ((usersData || []) as UserProfileRow[]).forEach((user) => {
        profileById.set(user.id, user);
      });
    } catch {
      // fallback silencioso: continua sem nome/e-mail se a tabela/permissão não estiver disponível
    }

    return rows.map((row) => toGroupMember(row, profileById.get(row.user_id)));
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

  async uploadMessageAttachment(input: {
    file: File;
    groupId: string;
    userId: string;
  }): Promise<string> {
    const client = assertClient();

    const extension = (input.file.name.split('.').pop() || 'jpg').toLowerCase();
    const sanitizedExtension = extension.replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${input.groupId}/${input.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${sanitizedExtension}`;

    const { error: uploadError } = await client.storage
      .from(this.attachmentBucket)
      .upload(path, input.file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erro ao enviar anexo: ${uploadError.message}`);
    }

    const { data } = client.storage.from(this.attachmentBucket).getPublicUrl(path);
    if (!data?.publicUrl) {
      throw new Error('Erro ao obter URL pública do anexo.');
    }

    return data.publicUrl;
  }
}

export const socialGroupsService = new SocialGroupsService();
