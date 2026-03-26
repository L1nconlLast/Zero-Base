import { isSupabaseConfigured, supabase } from './supabase.client';
import { offlineSyncService } from './offlineSync.service';
import type {
  DerivedGroupRankingRow,
  GroupActivity,
  GroupActivityType,
  GroupAttachmentType,
  GroupMember,
  GroupMessage,
  GroupMessageAttachment,
  GroupMessageMention,
  StudyGroup,
} from '../types/social';

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
  reply_to_message_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

interface GroupMessageMentionRow {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  created_at: string;
}

interface GroupMessageAttachmentRow {
  id: string;
  message_id: string;
  type: GroupAttachmentType;
  url: string;
  file_name: string;
  mime_type: string;
  size_in_bytes: number;
  created_at: string;
}

interface GroupActivityRow {
  id: string;
  group_id: string;
  user_id: string;
  type: GroupActivityType;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface UploadedGroupMessageAttachmentDraft {
  type: GroupAttachmentType;
  url: string;
  fileName: string;
  mimeType: string;
  sizeInBytes: number;
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

const isMissingColumnError = (message?: string) =>
  Boolean(message && (message.includes('column') || message.includes('schema cache')));

const isMissingTableError = (message?: string) =>
  Boolean(message && (message.includes('relation') || message.includes('does not exist')));

const inferAttachmentType = (mimeType?: string | null): GroupAttachmentType =>
  mimeType?.startsWith('image/') ? 'image' : 'file';

const inferAttachmentMimeType = (file: File): string => {
  if (file.type) {
    return file.type;
  }

  const extension = (file.name.split('.').pop() || '').toLowerCase();
  const mimeByExtension: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
    heic: 'image/heic',
    heif: 'image/heif',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };

  return mimeByExtension[extension] || 'application/octet-stream';
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

const toGroupMember = (row: GroupMemberRow, profile?: UserProfileRow): GroupMember => ({
  id: row.id,
  groupId: row.group_id,
  userId: row.user_id,
  userName: profile?.name || null,
  userEmail: profile?.email || null,
  role: row.role,
  joinedAt: row.joined_at,
});

const toGroupMessageMention = (row: GroupMessageMentionRow): GroupMessageMention => ({
  id: row.id,
  messageId: row.message_id,
  mentionedUserId: row.mentioned_user_id,
  createdAt: row.created_at,
});

const toGroupMessageAttachment = (row: GroupMessageAttachmentRow): GroupMessageAttachment => ({
  id: row.id,
  messageId: row.message_id,
  type: row.type,
  url: row.url,
  fileName: row.file_name,
  mimeType: row.mime_type,
  sizeInBytes: row.size_in_bytes,
  createdAt: row.created_at,
});

const toGroupActivity = (row: GroupActivityRow): GroupActivity => ({
  id: row.id,
  groupId: row.group_id,
  userId: row.user_id,
  type: row.type,
  metadata: row.metadata,
  createdAt: row.created_at,
});

const scoreActivity = (activity: Pick<GroupActivity, 'type' | 'metadata'>) => {
  const metadata = activity.metadata || {};

  switch (activity.type) {
    case 'review_completed':
      return Number(metadata.cards || 10);
    case 'study_started':
      return 5;
    case 'session_finished':
      return Math.max(10, Number(metadata.minutes || 20) / 2);
    case 'quiz_completed':
      return Math.max(8, Number(metadata.correctAnswers || metadata.questions || 8));
    case 'challenge_progress':
      return Math.max(5, Number(metadata.progress || 5));
    case 'message_posted':
    default:
      return 1;
  }
};

class SocialGroupsService {
  private readonly attachmentBucket = 'group-message-attachments';

  private async hydrateMessages(client: ReturnType<typeof assertClient>, rows: GroupMessageRow[]): Promise<GroupMessage[]> {
    if (rows.length === 0) {
      return [];
    }

    const messageIds = rows.map((row) => row.id);
    const mentionsByMessageId = new Map<string, GroupMessageMention[]>();
    const attachmentsByMessageId = new Map<string, GroupMessageAttachment[]>();

    try {
      const { data: mentionRows, error } = await client
        .from('group_message_mentions')
        .select('*')
        .in('message_id', messageIds);

      if (!error) {
        ((mentionRows || []) as GroupMessageMentionRow[]).forEach((row) => {
          const mention = toGroupMessageMention(row);
          mentionsByMessageId.set(mention.messageId, [...(mentionsByMessageId.get(mention.messageId) || []), mention]);
        });
      }
    } catch {
      // Graceful fallback while the schema migration is not applied.
    }

    try {
      const { data: attachmentRows, error } = await client
        .from('group_message_attachments')
        .select('*')
        .in('message_id', messageIds)
        .order('created_at', { ascending: true });

      if (!error) {
        ((attachmentRows || []) as GroupMessageAttachmentRow[]).forEach((row) => {
          const attachment = toGroupMessageAttachment(row);
          attachmentsByMessageId.set(attachment.messageId, [...(attachmentsByMessageId.get(attachment.messageId) || []), attachment]);
        });
      }
    } catch {
      // Graceful fallback while the schema migration is not applied.
    }

    return rows.map((row) => {
      const attachments = attachmentsByMessageId.get(row.id) || [];
      return {
        id: row.id,
        groupId: row.group_id,
        userId: row.user_id,
        content: row.content,
        replyToMessageId: row.reply_to_message_id,
        mentions: mentionsByMessageId.get(row.id) || [],
        attachments,
        attachmentUrl: attachments[0]?.url || row.attachment_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      };
    });
  }

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
    const { data: groupData } = await client
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    const expectedRole: 'admin' | 'member' = groupData?.created_by === userId ? 'admin' : 'member';

    const { data, error } = await client
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role: expectedRole,
      })
      .select('*')
      .single();

    if (error) {
      const pgCode = (error as { code?: string }).code;

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

        if ((existing as GroupMemberRow).role !== expectedRole && expectedRole === 'admin') {
          const { data: promoted, error: promoteError } = await client
            .from('group_members')
            .update({ role: expectedRole })
            .eq('id', (existing as GroupMemberRow).id)
            .select('*')
            .single();

          if (!promoteError && promoted) {
            return toGroupMember(promoted as GroupMemberRow);
          }
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
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      const fallback = await client
        .from('messages')
        .select('id, group_id, user_id, content, attachment_url, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (fallback.error) {
        throw new Error(`Erro ao listar mensagens: ${fallback.error.message}`);
      }

      const legacyRows = ((fallback.data || []) as Array<{
        id: string;
        group_id: string;
        user_id: string;
        content: string;
        attachment_url: string | null;
        created_at: string;
      }>).map((row) => ({
        ...row,
        reply_to_message_id: null,
        updated_at: null,
        deleted_at: null,
      }));

      return this.hydrateMessages(client, legacyRows);
    }

    return this.hydrateMessages(client, (data || []) as GroupMessageRow[]);
  }

  async sendMessage(payload: {
    groupId: string;
    userId: string;
    content: string;
    attachmentUrl?: string;
    attachments?: UploadedGroupMessageAttachmentDraft[];
    mentionedUserIds?: string[];
    replyToMessageId?: string | null;
  }): Promise<GroupMessage> {
    const localNow = new Date().toISOString();
    const fallbackAttachmentUrl = payload.attachments?.[0]?.url || payload.attachmentUrl || null;
    const queuePayload = {
      group_id: payload.groupId,
      user_id: payload.userId,
      content: payload.content,
      attachment_url: fallbackAttachmentUrl,
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
        replyToMessageId: payload.replyToMessageId || null,
        mentions: (payload.mentionedUserIds || []).map((mentionedUserId, index) => ({
          id: `local-mention-${index}`,
          messageId: `local-${Date.now()}`,
          mentionedUserId,
          createdAt: localNow,
        })),
        attachments: (payload.attachments || []).map((attachment, index) => ({
          id: `local-attachment-${index}`,
          messageId: `local-${Date.now()}`,
          createdAt: localNow,
          ...attachment,
        })),
        attachmentUrl: fallbackAttachmentUrl,
        createdAt: localNow,
        updatedAt: localNow,
        deletedAt: null,
      };
    }

    const client = assertClient();

    let insertedMessage: GroupMessageRow | null = null;
    const insertPayload = {
      group_id: payload.groupId,
      user_id: payload.userId,
      content: payload.content,
      attachment_url: fallbackAttachmentUrl,
      reply_to_message_id: payload.replyToMessageId || null,
    };

    const insertResponse = await client
      .from('messages')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertResponse.error && isMissingColumnError(insertResponse.error.message)) {
      const fallbackInsert = await client
        .from('messages')
        .insert({
          group_id: payload.groupId,
          user_id: payload.userId,
          content: payload.content,
          attachment_url: fallbackAttachmentUrl,
        })
        .select('id, group_id, user_id, content, attachment_url, created_at')
        .single();

      if (fallbackInsert.error) {
        throw new Error(`Erro ao enviar mensagem: ${fallbackInsert.error.message}`);
      }

      insertedMessage = {
        ...(fallbackInsert.data as {
          id: string;
          group_id: string;
          user_id: string;
          content: string;
          attachment_url: string | null;
          created_at: string;
        }),
        reply_to_message_id: null,
        updated_at: null,
        deleted_at: null,
      };
    } else if (insertResponse.error) {
      const message = `Erro ao enviar mensagem: ${insertResponse.error.message}`;

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
          replyToMessageId: payload.replyToMessageId || null,
          mentions: [],
          attachments: (payload.attachments || []).map((attachment, index) => ({
            id: `local-attachment-${index}`,
            messageId: `local-${Date.now()}`,
            createdAt: localNow,
            ...attachment,
          })),
          attachmentUrl: fallbackAttachmentUrl,
          createdAt: localNow,
          updatedAt: localNow,
          deletedAt: null,
        };
      }

      throw new Error(message);
    } else {
      insertedMessage = insertResponse.data as GroupMessageRow;
    }

    if (!insertedMessage) {
      throw new Error('Erro ao enviar mensagem: inserção não retornou dados.');
    }

    const uniqueMentionedUserIds = Array.from(new Set(payload.mentionedUserIds || []));

    if (uniqueMentionedUserIds.length > 0) {
      try {
        await client.from('group_message_mentions').insert(
          uniqueMentionedUserIds.map((mentionedUserId) => ({
            message_id: insertedMessage!.id,
            mentioned_user_id: mentionedUserId,
          })),
        );
      } catch {
        // Best effort while the schema migrates.
      }
    }

    if ((payload.attachments || []).length > 0) {
      try {
        await client.from('group_message_attachments').insert(
          (payload.attachments || []).map((attachment) => ({
            message_id: insertedMessage!.id,
            type: attachment.type,
            url: attachment.url,
            file_name: attachment.fileName,
            mime_type: attachment.mimeType,
            size_in_bytes: attachment.sizeInBytes,
          })),
        );
      } catch {
        // Best effort while the schema migrates.
      }
    }

    try {
      await this.logActivity({
        groupId: payload.groupId,
        userId: payload.userId,
        type: 'message_posted',
        metadata: { hasAttachments: (payload.attachments || []).length > 0 },
      });
    } catch {
      // Chat should not fail because the activity feed is still being introduced.
    }

    const hydrated = await this.hydrateMessages(client, [insertedMessage]);
    return hydrated[0];
  }

  async uploadMessageAttachmentAsset(input: {
    file: File;
    groupId: string;
    userId: string;
  }): Promise<UploadedGroupMessageAttachmentDraft> {
    const client = assertClient();

    const extension = (input.file.name.split('.').pop() || 'bin').toLowerCase();
    const sanitizedExtension = extension.replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `${input.groupId}/${input.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${sanitizedExtension}`;
    const mimeType = inferAttachmentMimeType(input.file);

    const { error: uploadError } = await client.storage
      .from(this.attachmentBucket)
      .upload(path, input.file, {
        cacheControl: '3600',
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erro ao enviar anexo: ${uploadError.message}`);
    }

    const { data } = client.storage.from(this.attachmentBucket).getPublicUrl(path);
    if (!data?.publicUrl) {
      throw new Error('Erro ao obter URL pública do anexo.');
    }

    return {
      type: inferAttachmentType(mimeType),
      url: data.publicUrl,
      fileName: input.file.name,
      mimeType,
      sizeInBytes: input.file.size,
    };
  }

  async uploadMessageAttachment(input: {
    file: File;
    groupId: string;
    userId: string;
  }): Promise<string> {
    const asset = await this.uploadMessageAttachmentAsset(input);
    return asset.url;
  }

  async listActivityFeed(groupId: string, limit = 50): Promise<GroupActivity[]> {
    const client = assertClient();

    try {
      const { data, error } = await client
        .from('group_activities')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (isMissingTableError(error.message)) {
          return [];
        }
        throw error;
      }

      return ((data || []) as GroupActivityRow[]).map(toGroupActivity);
    } catch (error) {
      if (error instanceof Error && isMissingTableError(error.message)) {
        return [];
      }
      throw new Error(error instanceof Error ? `Erro ao listar atividade do grupo: ${error.message}` : 'Erro ao listar atividade do grupo.');
    }
  }

  async logActivity(payload: {
    groupId: string;
    userId: string;
    type: GroupActivityType;
    metadata?: Record<string, unknown> | null;
  }): Promise<GroupActivity | null> {
    const client = assertClient();

    try {
      const { data, error } = await client
        .from('group_activities')
        .insert({
          group_id: payload.groupId,
          user_id: payload.userId,
          type: payload.type,
          metadata: payload.metadata || null,
        })
        .select('*')
        .single();

      if (error) {
        if (isMissingTableError(error.message)) {
          return null;
        }
        throw error;
      }

      return toGroupActivity(data as GroupActivityRow);
    } catch (error) {
      if (error instanceof Error && isMissingTableError(error.message)) {
        return null;
      }
      throw new Error(error instanceof Error ? `Erro ao registrar atividade do grupo: ${error.message}` : 'Erro ao registrar atividade do grupo.');
    }
  }

  async getDerivedRanking(params: {
    groupId: string;
    limit?: number;
    since?: string;
  }): Promise<DerivedGroupRankingRow[]> {
    const client = assertClient();

    try {
      let query = client
        .from('group_activities')
        .select('*')
        .eq('group_id', params.groupId)
        .order('created_at', { ascending: false });

      if (params.since) {
        query = query.gte('created_at', params.since);
      }

      const { data, error } = await query;

      if (error) {
        if (isMissingTableError(error.message)) {
          return [];
        }
        throw error;
      }

      const aggregate = new Map<string, Omit<DerivedGroupRankingRow, 'rankPosition'>>();

      ((data || []) as GroupActivityRow[]).forEach((row) => {
        const activity = toGroupActivity(row);
        const score = scoreActivity(activity);
        const current = aggregate.get(activity.userId) || {
          userId: activity.userId,
          groupId: activity.groupId,
          totalScore: 0,
          activityCount: 0,
          lastActivityAt: null,
        };

        current.totalScore += score;
        current.activityCount += 1;
        current.lastActivityAt = current.lastActivityAt && current.lastActivityAt > activity.createdAt
          ? current.lastActivityAt
          : activity.createdAt;

        aggregate.set(activity.userId, current);
      });

      return Array.from(aggregate.values())
        .sort((left, right) => {
          if (right.totalScore !== left.totalScore) return right.totalScore - left.totalScore;
          return (right.lastActivityAt || '').localeCompare(left.lastActivityAt || '');
        })
        .slice(0, params.limit || 20)
        .map((row, index) => ({
          ...row,
          rankPosition: index + 1,
        }));
    } catch (error) {
      if (error instanceof Error && isMissingTableError(error.message)) {
        return [];
      }
      throw new Error(error instanceof Error ? `Erro ao calcular ranking derivado: ${error.message}` : 'Erro ao calcular ranking derivado.');
    }
  }
}

export const socialGroupsService = new SocialGroupsService();
