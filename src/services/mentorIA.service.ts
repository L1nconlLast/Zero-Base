import { isSupabaseConfigured, supabase } from './supabase.client';
import { stripInternalSubjectMetadata } from '../utils/sanitizeSubject';

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
const MAX_MESSAGE_LENGTH = 1800;
const DEFAULT_ASSISTANT_FALLBACK = 'Resposta do Mentor indisponivel no momento. Tente novamente.';
const INLINE_OPAQUE_TOKEN_RE = /\b[A-Za-z0-9+/=_-]{40,}\b/g;
const STRUCTURED_TEXT_KEYS = [
  'content',
  'text',
  'message',
  'response',
  'output',
  'answer',
  'analysis',
  'reply',
  'prioridade',
  'justificativa',
  'mensagem_motivacional',
] as const;
const STRUCTURED_LIST_KEYS = [
  'acao_semana',
  'actions',
  'recommendations',
  'suggestions',
  'steps',
] as const;

const getStorageKey = (userKey: string): string => `${STORAGE_PREFIX}${userKey}`;

interface SanitizeMentorTextOptions {
  fallback?: string;
  fallbackWhenEmpty?: boolean;
  maxLength?: number;
  allowOpaqueToken?: boolean;
}

interface SanitizeMentorListOptions extends SanitizeMentorTextOptions {
  maxItems?: number;
}

const stripMarkdownFence = (value: string): string => {
  const match = value.trim().match(/^```(?:json|txt|text|md)?\s*([\s\S]*?)```$/i);
  return match ? match[1].trim() : value;
};

const normalizeMentorWhitespace = (value: string): string => (
  stripMarkdownFence(value)
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
);

const truncateMentorText = (value: string, maxLength: number): string => {
  if (maxLength <= 0 || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
};

const looksLikeOpaqueToken = (value: string): boolean => {
  const condensed = value.replace(/\s+/g, '');
  return (
    condensed.length >= 72
    && !/[\s\n]/.test(value)
    && /^[A-Za-z0-9+/=_-]+$/.test(condensed)
  );
};

const shouldIgnoreStructuredKey = (key: string): boolean => (
  /(^|_)(id|key|token|hash|uuid|created_at|updated_at|role)$/i.test(key)
);

const parseStructuredMentorPayload = (value: string): unknown => {
  let current: unknown = stripMarkdownFence(value).trim();

  for (let depth = 0; depth < 2 && typeof current === 'string'; depth += 1) {
    const candidate = current.trim();

    if (!candidate || !/^[\[{"]/.test(candidate)) {
      break;
    }

    try {
      current = JSON.parse(candidate);
    } catch {
      break;
    }
  }

  return current;
};

const collectStructuredMentorText = (value: unknown, depth = 0): string[] => {
  if (depth > 4 || value == null) {
    return [];
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStructuredMentorText(item, depth + 1));
  }

  if (typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  const prioritizedValues = [
    ...STRUCTURED_LIST_KEYS,
    ...STRUCTURED_TEXT_KEYS,
  ].flatMap((key) => collectStructuredMentorText(record[key], depth + 1));

  if (prioritizedValues.length > 0) {
    return prioritizedValues;
  }

  return Object.entries(record)
    .filter(([key]) => !shouldIgnoreStructuredKey(key))
    .flatMap(([, entryValue]) => collectStructuredMentorText(entryValue, depth + 1));
};

const collectMentorTextCandidates = (value: unknown): string[] => {
  if (typeof value === 'string') {
    const parsed = parseStructuredMentorPayload(value);
    if (parsed !== value) {
      const parsedCandidates = collectStructuredMentorText(parsed);
      if (parsedCandidates.length > 0) {
        return parsedCandidates;
      }
    }

    return [value];
  }

  return collectStructuredMentorText(value);
};

const sanitizeMentorCandidate = (
  value: string,
  {
    fallback = '',
    maxLength = MAX_MESSAGE_LENGTH,
    allowOpaqueToken = false,
  }: SanitizeMentorTextOptions,
): string => {
  const normalized = stripInternalSubjectMetadata(normalizeMentorWhitespace(value))
    .replace(INLINE_OPAQUE_TOKEN_RE, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) {
    return '';
  }

  if (!allowOpaqueToken && looksLikeOpaqueToken(normalized)) {
    return fallback;
  }

  return truncateMentorText(normalized, maxLength);
};

export const sanitizeMentorText = (
  value: unknown,
  options: SanitizeMentorTextOptions = {},
): string => {
  const { fallback = '', fallbackWhenEmpty = false } = options;
  const sanitizedCandidates = collectMentorTextCandidates(value)
    .map((candidate) => sanitizeMentorCandidate(candidate, options))
    .filter(Boolean);

  const uniqueCandidates = sanitizedCandidates.filter((candidate, index, allCandidates) => (
    allCandidates.indexOf(candidate) === index
  ));

  if (uniqueCandidates.length === 0) {
    return fallbackWhenEmpty ? fallback : '';
  }

  const sanitized = uniqueCandidates.join('\n\n');
  return sanitized || (fallbackWhenEmpty ? fallback : '');
};

export const sanitizeMentorList = (
  value: unknown,
  options: SanitizeMentorListOptions = {},
): string[] => {
  const { maxItems = 4, fallback = '' } = options;

  const baseItems = Array.isArray(value)
    ? value
    : collectMentorTextCandidates(value).flatMap((candidate) => (
      candidate
        .split(/\n|\s\|\s/g)
        .map((item) => item.replace(/^[\s\-\u2022\d.)]+/, '').trim())
    ));

  const sanitized = baseItems
    .map((item) => sanitizeMentorText(item, { ...options, fallback: '', fallbackWhenEmpty: false }))
    .map((item) => item.replace(/^[\s\-\u2022]+/, '').trim())
    .filter(Boolean)
    .filter((item, index, allItems) => allItems.indexOf(item) === index)
    .slice(0, maxItems);

  return sanitized.length > 0 ? sanitized : (fallback ? [fallback] : []);
};

const normalizeMessage = (message: MentorMessage): MentorMessage => ({
  id: message.id || generateMessageId(),
  role: message.role === 'user' ? 'user' : 'assistant',
  content: sanitizeMentorText(message.content, {
    fallback: message.role === 'assistant' ? DEFAULT_ASSISTANT_FALLBACK : '',
    fallbackWhenEmpty: false,
    maxLength: MAX_MESSAGE_LENGTH,
    allowOpaqueToken: message.role === 'user',
  }),
  createdAt: message.createdAt || new Date().toISOString(),
});

const toRow = (userId: string, message: MentorMessage): MentorMessageRow => {
  const normalized = normalizeMessage(message);

  return {
    id: normalized.id,
    user_id: userId,
    role: normalized.role,
    content: normalized.content,
    created_at: normalized.createdAt,
  };
};

const fromRow = (row: MentorMessageRow): MentorMessage => ({
  id: row.id,
  role: row.role,
  content: sanitizeMentorText(row.content, {
    fallback: row.role === 'assistant' ? DEFAULT_ASSISTANT_FALLBACK : '',
    fallbackWhenEmpty: false,
    allowOpaqueToken: row.role === 'user',
    maxLength: MAX_MESSAGE_LENGTH,
  }),
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

      return parsed.map(normalizeMessage).slice(-MAX_LOCAL_MESSAGES);
    } catch {
      return [];
    }
  }

  saveLocalMessages(userKey: string, messages: MentorMessage[]): void {
    try {
      const normalized = messages.map(normalizeMessage).slice(-MAX_LOCAL_MESSAGES);
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
    return normalizeMessage({
      id: generateMessageId(),
      role,
      content,
      createdAt: new Date().toISOString(),
    });
  }

  mergeMessages(localMessages: MentorMessage[], cloudMessages: MentorMessage[]): MentorMessage[] {
    const map = new Map<string, MentorMessage>();

    [...localMessages, ...cloudMessages].forEach((message) => {
      const normalized = normalizeMessage(message);
      map.set(normalized.id, normalized);
    });

    return Array.from(map.values())
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-MAX_LOCAL_MESSAGES);
  }
}

export const mentorIAService = new MentorIAService();
