import { useState, useCallback, useEffect, useRef } from 'react';
import type { ScheduleEntry } from '../types';
import { studyScheduleService } from '../services/studySchedule.service.ts';
import { isSupabaseConfigured } from '../services/supabase.client';
import { adaptSchedule, type StudyBlock } from '../engine/adaptiveScheduleAdapter.ts';

const STORAGE_KEY = 'mdz_study_schedule';
const MAX_ENTRIES = 500;

// ── Helpers ──────────────────────────────────────────────────
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const loadEntries = (): ScheduleEntry[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persist = (entries: ScheduleEntry[]): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // ignore
  }
};

/** Merge local + cloud: cloud vence em caso de conflito por id */
const mergeEntries = (local: ScheduleEntry[], cloud: ScheduleEntry[]): ScheduleEntry[] => {
  const map = new Map<string, ScheduleEntry>();
  for (const e of local) map.set(e.id, e);
  for (const e of cloud) map.set(e.id, e); // cloud overrides
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_ENTRIES);
};

const toStudyBlock = (entry: ScheduleEntry): StudyBlock => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entryDate = new Date(`${entry.date}T00:00:00`);
  const isOverduePending = !entry.done && entryDate < today;

  const isMarkedAbsent = entry.status === 'adiado' && (entry.aiReason || '').toLowerCase().includes('falta');

  const status: StudyBlock['status'] = entry.done
    ? 'concluido'
    : (isOverduePending || isMarkedAbsent)
      ? 'faltou'
      : 'pendente';

  const difficulty: StudyBlock['difficulty'] =
    entry.priority === 'alta' ? 'fraco' : 'medio';

  return {
    id: entry.id,
    date: entry.date,
    subject: entry.subject,
    topic: entry.topic,
    status,
    difficulty,
  };
};

const toEntryPatch = (block: StudyBlock): Partial<ScheduleEntry> => {
  const pendingStatus: ScheduleEntry['status'] = block.status === 'concluido' ? 'concluido' : 'pendente';
  return {
    topic: block.topic,
    status: pendingStatus,
    done: block.status === 'concluido',
    priority: block.difficulty === 'fraco' ? 'alta' : 'normal',
  };
};

// ── Hook ─────────────────────────────────────────────────────
export function useStudySchedule(userId?: string | null) {
  const [entries, setEntries] = useState<ScheduleEntry[]>(loadEntries);
  const syncedRef = useRef(false);

  // Sync to localStorage on change
  useEffect(() => {
    persist(entries);
  }, [entries]);

  // ── Cloud sync: carregar ao montar ──
  useEffect(() => {
    if (!userId || !isSupabaseConfigured || syncedRef.current) return;

    let cancelled = false;

    const loadCloud = async () => {
      try {
        const cloudEntries = await studyScheduleService.listEntries(userId);
        if (cancelled) return;

        setEntries((local) => {
          const merged = mergeEntries(local, cloudEntries);
          persist(merged);

          // Push local-only entries to cloud (best effort)
          const cloudIds = new Set(cloudEntries.map((entry: ScheduleEntry) => entry.id));
          const localOnly = local.filter((e) => !cloudIds.has(e.id));
          if (localOnly.length > 0) {
            void studyScheduleService.upsertEntries(userId, localOnly).catch(() => {});
          }

          return merged;
        });

        syncedRef.current = true;
      } catch {
        // Fallback: usa dados locais
      }
    };

    void loadCloud();
    return () => { cancelled = true; };
  }, [userId]);

  /** Adiciona uma entrada no cronograma */
  const addEntry = useCallback(
    (date: string, subject: string, note?: string, extras?: Partial<ScheduleEntry>) => {
      const entry: ScheduleEntry = {
        id: generateId(),
        date,
        subject,
        note: note?.trim() || undefined,
        done: false,
        ...extras,
      };
      setEntries((prev) => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));

      // Push to cloud (fire-and-forget)
      if (userId && isSupabaseConfigured) {
        void studyScheduleService.upsertEntry(userId, entry).catch(() => {});
      }

      return entry;
    },
    [userId],
  );

  /** Atualiza parcialmente uma entrada */
  const updateEntry = useCallback((id: string, patch: Partial<ScheduleEntry>) => {
    setEntries((prev) => {
      const updated = prev
        .map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
        .sort((a, b) => a.date.localeCompare(b.date));

      const target = updated.find((entry) => entry.id === id);
      if (target && userId && isSupabaseConfigured) {
        void studyScheduleService.upsertEntry(userId, target).catch(() => {});
      }

      return updated;
    });
  }, [userId]);

  /** Remove uma entrada */
  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));

    if (userId && isSupabaseConfigured) {
      void studyScheduleService.deleteEntry(userId, id).catch(() => {});
    }
  }, [userId]);

  /** Marca/desmarca como concluída */
  const toggleDone = useCallback((id: string) => {
    setEntries((prev) => {
      const updated = prev.map((e) => {
        if (e.id !== id) return e;
        const nextDone = !e.done;
        const nextStatus: ScheduleEntry['status'] = nextDone ? 'concluido' : 'pendente';
        return {
          ...e,
          done: nextDone,
          status: nextStatus,
        };
      });
      const entry = updated.find((e) => e.id === id);

      if (entry && userId && isSupabaseConfigured) {
        void studyScheduleService.upsertEntry(userId, entry).catch(() => {});
      }

      return updated;
    });
  }, [userId]);

  /** Atualiza nota de uma entrada */
  const updateNote = useCallback((id: string, note: string) => {
    setEntries((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, note: note.trim() || undefined } : e));
      const entry = updated.find((e) => e.id === id);

      if (entry && userId && isSupabaseConfigured) {
        void studyScheduleService.upsertEntry(userId, entry).catch(() => {});
      }

      return updated;
    });
  }, [userId]);

  /** Entradas de um dia específico */
  const getEntriesForDate = useCallback(
    (date: string) => entries.filter((e) => e.date === date),
    [entries],
  );

  const applyAdaptiveSchedule = useCallback((hoursPerDay: number) => {
    setEntries((prev) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const limitDate = new Date(today);
      limitDate.setDate(limitDate.getDate() + 7);

      const isWithinAdaptiveWindow = (entry: ScheduleEntry) => {
        if (entry.done) return false;
        const date = new Date(`${entry.date}T00:00:00`);
        return date >= today && date <= limitDate;
      };

      const targetEntries = prev.filter(isWithinAdaptiveWindow);
      const blocks = targetEntries.map(toStudyBlock);
      const adaptedBlocks = adaptSchedule({
        blocks,
        hoursPerDay,
      });

      const adaptedMap = new Map(adaptedBlocks.map((block) => [block.id, block]));
      const next = prev.map((entry) => {
        const block = adaptedMap.get(entry.id);
        if (!block) {
          return entry;
        }
        return { ...entry, ...toEntryPatch(block), source: 'ia' as const };
      });

      if (userId && isSupabaseConfigured) {
        void studyScheduleService.upsertEntries(userId, next).catch(() => {});
      }

      return next;
    });
  }, [userId]);

  /** Datas que possuem ao menos uma entrada */
  const scheduledDates = new Set(entries.map((e) => e.date));

  return {
    entries,
    scheduledDates,
    addEntry,
    updateEntry,
    removeEntry,
    toggleDone,
    updateNote,
    applyAdaptiveSchedule,
    getEntriesForDate,
  };
}
