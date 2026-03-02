import { isSupabaseConfigured, supabase } from './supabase.client';
import type { ScheduleEntry } from '../types';

interface StudyBlockRow {
  id: string;
  user_id: string;
  study_date: string;
  start_time: string;
  end_time: string;
  subject: string;
  topic: string | null;
  note: string | null;
  type: string | null;
  status: 'pendente' | 'concluido' | 'adiado';
  reason: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = 'study_blocks';

const normalizeTime = (value?: string): string => {
  if (!value) return '08:00';
  return value.length >= 5 ? value.slice(0, 5) : value;
};

const defaultEndTime = (startTime?: string): string => {
  const start = normalizeTime(startTime);
  const [hourRaw] = start.split(':');
  const hour = Number(hourRaw || 8);
  return `${String(Math.min(23, hour + 1)).padStart(2, '0')}:00`;
};

const toRow = (userId: string, entry: ScheduleEntry) => {
  const status = entry.status || (entry.done ? 'concluido' : 'pendente');
  const startTime = normalizeTime(entry.startTime);
  const endTime = normalizeTime(entry.endTime || defaultEndTime(startTime));

  return {
    id: entry.id,
    user_id: userId,
    study_date: entry.date,
    start_time: startTime,
    end_time: endTime,
    subject: entry.subject,
    topic: entry.topic ?? null,
    note: entry.note ?? null,
    type: entry.studyType ?? null,
    status,
    reason: entry.aiReason ?? null,
    source: entry.source ?? null,
  };
};

const fromRow = (row: StudyBlockRow): ScheduleEntry => ({
  id: row.id,
  date: row.study_date,
  startTime: normalizeTime(row.start_time),
  endTime: normalizeTime(row.end_time),
  subject: row.subject,
  topic: row.topic ?? undefined,
  note: row.note ?? undefined,
  studyType: (row.type as ScheduleEntry['studyType']) ?? undefined,
  status: row.status,
  done: row.status === 'concluido',
  aiReason: row.reason ?? undefined,
  source: (row.source as ScheduleEntry['source']) ?? undefined,
  priority: row.reason ? 'alta' : 'normal',
});

class StudyScheduleService {
  async listEntries(userId: string): Promise<ScheduleEntry[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('study_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Erro ao carregar cronograma: ${error.message}`);
    }

    return ((data || []) as StudyBlockRow[]).map(fromRow);
  }

  async upsertEntry(userId: string, entry: ScheduleEntry): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase
      .from(TABLE)
      .upsert(toRow(userId, entry), { onConflict: 'id' });

    if (error) {
      throw new Error(`Erro ao salvar bloco do cronograma: ${error.message}`);
    }
  }

  async upsertEntries(userId: string, entries: ScheduleEntry[]): Promise<void> {
    if (!isSupabaseConfigured || !supabase || entries.length === 0) return;

    const payload = entries.map((entry) => toRow(userId, entry));

    const { error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      throw new Error(`Erro ao salvar blocos em lote: ${error.message}`);
    }
  }

  async deleteEntry(userId: string, entryId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao remover bloco do cronograma: ${error.message}`);
    }
  }

  async deleteAllEntries(userId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao limpar cronograma: ${error.message}`);
    }
  }
}

export const studyScheduleService = new StudyScheduleService();
