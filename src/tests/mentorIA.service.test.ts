import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ── Mock do Supabase ─────────────────────────────────────────
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

import { mentorIAService, type MentorMessage } from '../services/mentorIA.service';

// Helpers ─────────────────────────────────────────────────────
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

// ── Local Storage ────────────────────────────────────────────
describe('MentorIAService — localStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('retorna array vazio quando não há dados', () => {
    expect(mentorIAService.getLocalMessages(USER_KEY)).toEqual([]);
  });

  it('salva e recupera mensagens', () => {
    const msgs = [makeMessage('user', 'oi'), makeMessage('assistant', 'olá')];
    mentorIAService.saveLocalMessages(USER_KEY, msgs);

    const loaded = mentorIAService.getLocalMessages(USER_KEY);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].content).toBe('oi');
    expect(loaded[1].role).toBe('assistant');
  });

  it('trunca em MAX_LOCAL_MESSAGES (120)', () => {
    const msgs = Array.from({ length: 150 }, (_, i) =>
      makeMessage('user', `msg-${i}`),
    );
    mentorIAService.saveLocalMessages(USER_KEY, msgs);

    const loaded = mentorIAService.getLocalMessages(USER_KEY);
    expect(loaded).toHaveLength(120);
    expect(loaded[0].content).toBe('msg-30'); // descartou as 30 primeiras
  });

  it('retorna vazio para JSON inválido no storage', () => {
    window.localStorage.setItem(`mdz_mentor_messages_${USER_KEY}`, '{not-json');
    expect(mentorIAService.getLocalMessages(USER_KEY)).toEqual([]);
  });

  it('retorna vazio se o valor armazenado não for array', () => {
    window.localStorage.setItem(
      `mdz_mentor_messages_${USER_KEY}`,
      JSON.stringify({ foo: 'bar' }),
    );
    expect(mentorIAService.getLocalMessages(USER_KEY)).toEqual([]);
  });
});

// ── createMessage ────────────────────────────────────────────
describe('MentorIAService — createMessage', () => {
  it('retorna mensagem com role, content e timestamps', () => {
    const msg = mentorIAService.createMessage('user', 'olá');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('olá');
    expect(msg.id).toBeTruthy();
    expect(msg.createdAt).toBeTruthy();
  });

  it('gera ids únicos', () => {
    const a = mentorIAService.createMessage('user', '1');
    const b = mentorIAService.createMessage('user', '2');
    expect(a.id).not.toBe(b.id);
  });
});

// ── mergeMessages ────────────────────────────────────────────
describe('MentorIAService — mergeMessages', () => {
  it('deduplicar por id mantendo ordenação temporal', () => {
    const shared = makeMessage('user', 'dup', 'same-id', '2026-01-01T00:00:00Z');
    const local = [shared, makeMessage('assistant', 'a', 'id-a', '2026-01-01T00:01:00Z')];
    const cloud = [shared, makeMessage('assistant', 'b', 'id-b', '2026-01-01T00:02:00Z')];

    const merged = mentorIAService.mergeMessages(local, cloud);
    expect(merged).toHaveLength(3);
    expect(merged.map((m) => m.id)).toEqual(['same-id', 'id-a', 'id-b']);
  });

  it('respeita limite de 120 mensagens', () => {
    const local = Array.from({ length: 70 }, (_, i) =>
      makeMessage('user', `l-${i}`, `l-${i}`, new Date(2026, 0, 1, 0, i).toISOString()),
    );
    const cloud = Array.from({ length: 70 }, (_, i) =>
      makeMessage('assistant', `c-${i}`, `c-${i}`, new Date(2026, 0, 1, 1, i).toISOString()),
    );

    const merged = mentorIAService.mergeMessages(local, cloud);
    expect(merged).toHaveLength(120);
  });

  it('retorna vazio quando ambos são vazios', () => {
    expect(mentorIAService.mergeMessages([], [])).toEqual([]);
  });
});

// ── Cloud: listCloudMessages ─────────────────────────────────
describe('MentorIAService — listCloudMessages', () => {
  beforeEach(() => {
    isConfigured = true;
    vi.clearAllMocks();
  });

  it('retorna mensagens da cloud mapeadas corretamente', async () => {
    const rows = [
      { id: 'r1', user_id: CLOUD_USER_ID, role: 'user', content: 'oi', created_at: '2026-01-01T00:00:00Z' },
      { id: 'r2', user_id: CLOUD_USER_ID, role: 'assistant', content: 'olá', created_at: '2026-01-01T00:01:00Z' },
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

  it('lança erro quando Supabase retorna error', async () => {
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

  it('retorna vazio quando Supabase não está configurado', async () => {
    isConfigured = false;
    const msgs = await mentorIAService.listCloudMessages(CLOUD_USER_ID);
    expect(msgs).toEqual([]);
    isConfigured = true;
  });
});

// ── Cloud: pushCloudMessage ──────────────────────────────────
describe('MentorIAService — pushCloudMessage', () => {
  beforeEach(() => {
    isConfigured = true;
    vi.clearAllMocks();
  });

  it('faz upsert de uma única mensagem', async () => {
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

  it('lança erro quando Supabase retorna error', async () => {
    mockSupabase.from.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: { message: 'fail' } }),
    });

    await expect(
      mentorIAService.pushCloudMessage(CLOUD_USER_ID, makeMessage('user', 'x')),
    ).rejects.toThrow('fail');
  });

  it('não faz nada quando Supabase não está configurado', async () => {
    isConfigured = false;
    await mentorIAService.pushCloudMessage(CLOUD_USER_ID, makeMessage('user', 'x'));
    expect(mockSupabase.from).not.toHaveBeenCalled();
    isConfigured = true;
  });
});

// ── Cloud: deleteCloudMessages ───────────────────────────────
describe('MentorIAService — deleteCloudMessages', () => {
  beforeEach(() => {
    isConfigured = true;
    vi.clearAllMocks();
  });

  it('deleta todas as mensagens do usuário', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({ eq: eqMock }),
    });

    await mentorIAService.deleteCloudMessages(CLOUD_USER_ID);

    expect(mockSupabase.from).toHaveBeenCalledWith('mentor_messages');
    expect(eqMock).toHaveBeenCalledWith('user_id', CLOUD_USER_ID);
  });

  it('lança erro quando Supabase retorna error', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'nope' } }),
      }),
    });

    await expect(
      mentorIAService.deleteCloudMessages(CLOUD_USER_ID),
    ).rejects.toThrow('nope');
  });

  it('não faz nada quando Supabase não está configurado', async () => {
    isConfigured = false;
    await mentorIAService.deleteCloudMessages(CLOUD_USER_ID);
    expect(mockSupabase.from).not.toHaveBeenCalled();
    isConfigured = true;
  });
});

// ── Cloud: saveCloudMessages (batch) ─────────────────────────
describe('MentorIAService — saveCloudMessages', () => {
  beforeEach(() => {
    isConfigured = true;
    vi.clearAllMocks();
  });

  it('faz upsert em batch de múltiplas mensagens', async () => {
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

  it('ignora array vazio', async () => {
    await mentorIAService.saveCloudMessages(CLOUD_USER_ID, []);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});
