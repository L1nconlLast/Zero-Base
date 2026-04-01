import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockSupabase = {
  from: vi.fn(),
};

let isConfigured = true;

vi.mock('../services/supabase.client', () => ({
  get isSupabaseConfigured() {
    return isConfigured;
  },
  get supabase() {
    return isConfigured ? mockSupabase : null;
  },
}));

import {
  mentorIAService,
  sanitizeMentorList,
  sanitizeMentorText,
  type MentorMessage,
} from '../services/mentorIA.service';

const makeMessage = (
  role: 'assistant' | 'user',
  content: string,
  id?: string,
  createdAt?: string,
): MentorMessage => ({
  id: id ?? crypto.randomUUID(),
  role,
  content,
  createdAt: createdAt ?? new Date().toISOString(),
});

const USER_KEY = 'test-user@example.com';
const CLOUD_USER_ID = '00000000-0000-0000-0000-000000000001';

describe('MentorIAService localStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns empty array when there is no data', () => {
    expect(mentorIAService.getLocalMessages(USER_KEY)).toEqual([]);
  });

  it('saves and reloads messages', () => {
    const msgs = [makeMessage('user', 'oi'), makeMessage('assistant', 'ola')];
    mentorIAService.saveLocalMessages(USER_KEY, msgs);

    const loaded = mentorIAService.getLocalMessages(USER_KEY);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].content).toBe('oi');
    expect(loaded[1].role).toBe('assistant');
  });

  it('keeps only MAX_LOCAL_MESSAGES entries', () => {
    const msgs = Array.from({ length: 150 }, (_, index) => makeMessage('user', `msg-${index}`));
    mentorIAService.saveLocalMessages(USER_KEY, msgs);

    const loaded = mentorIAService.getLocalMessages(USER_KEY);
    expect(loaded).toHaveLength(120);
    expect(loaded[0].content).toBe('msg-30');
  });

  it('returns empty array for invalid JSON in storage', () => {
    window.localStorage.setItem(`mdz_mentor_messages_${USER_KEY}`, '{not-json');
    expect(mentorIAService.getLocalMessages(USER_KEY)).toEqual([]);
  });

  it('returns empty array when stored value is not an array', () => {
    window.localStorage.setItem(
      `mdz_mentor_messages_${USER_KEY}`,
      JSON.stringify({ foo: 'bar' }),
    );
    expect(mentorIAService.getLocalMessages(USER_KEY)).toEqual([]);
  });

  it('sanitizes structured content loaded from storage', () => {
    window.localStorage.setItem(
      `mdz_mentor_messages_${USER_KEY}`,
      JSON.stringify([
        makeMessage('assistant', '{"content":"Resposta valida","metadata":{"id":"internal"}}', 'json-msg'),
      ]),
    );

    const loaded = mentorIAService.getLocalMessages(USER_KEY);
    expect(loaded[0].content).toBe('Resposta valida');
  });
});

describe('MentorIAService createMessage', () => {
  it('returns a message with role, content and timestamps', () => {
    const msg = mentorIAService.createMessage('user', 'ola');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('ola');
    expect(msg.id).toBeTruthy();
    expect(msg.createdAt).toBeTruthy();
  });

  it('generates unique ids', () => {
    const a = mentorIAService.createMessage('user', '1');
    const b = mentorIAService.createMessage('user', '2');
    expect(a.id).not.toBe(b.id);
  });
});

describe('MentorIAService sanitization helpers', () => {
  it('extracts readable text from stringified JSON payloads', () => {
    const safeText = sanitizeMentorText('{"content":"Plano da semana","metadata":{"id":"abc"}}');
    expect(safeText).toBe('Plano da semana');
  });

  it('falls back when assistant content looks like an opaque token', () => {
    const safeText = sanitizeMentorText('a'.repeat(96), {
      fallback: 'fallback',
      fallbackWhenEmpty: true,
    });
    expect(safeText).toBe('fallback');
  });

  it('normalizes action lists from structured payloads', () => {
    const actions = sanitizeMentorList('{"acao_semana":["Revisar historia","Resolver 10 questoes"]}');
    expect(actions).toEqual(['Revisar historia', 'Resolver 10 questoes']);
  });

  it('removes internal zb-session metadata from freeform mentor text', () => {
    const safeText = sanitizeMentorText('Prioridade: Matematica|zb-session|eyJhbGciOiJIUzI1NiJ9');
    expect(safeText).toBe('Prioridade: Matematica');
  });
});

describe('MentorIAService mergeMessages', () => {
  it('deduplicates by id while keeping temporal order', () => {
    const shared = makeMessage('user', 'dup', 'same-id', '2026-01-01T00:00:00Z');
    const local = [shared, makeMessage('assistant', 'a', 'id-a', '2026-01-01T00:01:00Z')];
    const cloud = [shared, makeMessage('assistant', 'b', 'id-b', '2026-01-01T00:02:00Z')];

    const merged = mentorIAService.mergeMessages(local, cloud);
    expect(merged).toHaveLength(3);
    expect(merged.map((message) => message.id)).toEqual(['same-id', 'id-a', 'id-b']);
  });

  it('respects the 120 message limit', () => {
    const local = Array.from({ length: 70 }, (_, index) => (
      makeMessage('user', `l-${index}`, `l-${index}`, new Date(2026, 0, 1, 0, index).toISOString())
    ));
    const cloud = Array.from({ length: 70 }, (_, index) => (
      makeMessage('assistant', `c-${index}`, `c-${index}`, new Date(2026, 0, 1, 1, index).toISOString())
    ));

    const merged = mentorIAService.mergeMessages(local, cloud);
    expect(merged).toHaveLength(120);
  });

  it('returns empty array when both inputs are empty', () => {
    expect(mentorIAService.mergeMessages([], [])).toEqual([]);
  });
});

describe('MentorIAService listCloudMessages', () => {
  beforeEach(() => {
    isConfigured = true;
    vi.clearAllMocks();
  });

  it('maps cloud rows correctly', async () => {
    const rows = [
      { id: 'r1', user_id: CLOUD_USER_ID, role: 'user', content: 'oi', created_at: '2026-01-01T00:00:00Z' },
      { id: 'r2', user_id: CLOUD_USER_ID, role: 'assistant', content: 'ola', created_at: '2026-01-01T00:01:00Z' },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      }),
    });

    const msgs = await mentorIAService.listCloudMessages(CLOUD_USER_ID);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toEqual({ id: 'r1', role: 'user', content: 'oi', createdAt: '2026-01-01T00:00:00Z' });
  });

  it('throws when Supabase returns an error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
          }),
        }),
      }),
    });

    await expect(mentorIAService.listCloudMessages(CLOUD_USER_ID)).rejects.toThrow('boom');
  });

  it('returns empty array when Supabase is not configured', async () => {
    isConfigured = false;
    const msgs = await mentorIAService.listCloudMessages(CLOUD_USER_ID);
    expect(msgs).toEqual([]);
    isConfigured = true;
  });
});

describe('MentorIAService pushCloudMessage', () => {
  beforeEach(() => {
    isConfigured = true;
    vi.clearAllMocks();
  });

  it('upserts a single message', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ upsert: upsertMock });

    const msg = makeMessage('user', 'teste');
    await mentorIAService.pushCloudMessage(CLOUD_USER_ID, msg);

    expect(mockSupabase.from).toHaveBeenCalledWith('mentor_messages');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: CLOUD_USER_ID, content: 'teste' }),
      { onConflict: 'id' },
    );
  });

  it('throws when Supabase returns an error', async () => {
    mockSupabase.from.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: { message: 'fail' } }),
    });

    await expect(
      mentorIAService.pushCloudMessage(CLOUD_USER_ID, makeMessage('user', 'x')),
    ).rejects.toThrow('fail');
  });

  it('does nothing when Supabase is not configured', async () => {
    isConfigured = false;
    await mentorIAService.pushCloudMessage(CLOUD_USER_ID, makeMessage('user', 'x'));
    expect(mockSupabase.from).not.toHaveBeenCalled();
    isConfigured = true;
  });
});

describe('MentorIAService deleteCloudMessages', () => {
  beforeEach(() => {
    isConfigured = true;
    vi.clearAllMocks();
  });

  it('deletes all messages for a user', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({ eq: eqMock }),
    });

    await mentorIAService.deleteCloudMessages(CLOUD_USER_ID);

    expect(mockSupabase.from).toHaveBeenCalledWith('mentor_messages');
    expect(eqMock).toHaveBeenCalledWith('user_id', CLOUD_USER_ID);
  });

  it('throws when Supabase delete returns an error', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'nope' } }),
      }),
    });

    await expect(
      mentorIAService.deleteCloudMessages(CLOUD_USER_ID),
    ).rejects.toThrow('nope');
  });

  it('does nothing when Supabase is not configured', async () => {
    isConfigured = false;
    await mentorIAService.deleteCloudMessages(CLOUD_USER_ID);
    expect(mockSupabase.from).not.toHaveBeenCalled();
    isConfigured = true;
  });
});

describe('MentorIAService saveCloudMessages', () => {
  beforeEach(() => {
    isConfigured = true;
    vi.clearAllMocks();
  });

  it('upserts multiple messages in batch', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ upsert: upsertMock });

    const msgs = [makeMessage('user', 'a'), makeMessage('assistant', 'b')];
    await mentorIAService.saveCloudMessages(CLOUD_USER_ID, msgs);

    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ content: 'a' }),
        expect.objectContaining({ content: 'b' }),
      ]),
      { onConflict: 'id' },
    );
  });

  it('ignores empty arrays', async () => {
    await mentorIAService.saveCloudMessages(CLOUD_USER_ID, []);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});
