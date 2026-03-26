import { useState, useCallback, useEffect, useRef } from 'react';
import type { ScheduleEntry } from '../types';
import {
  moveScheduleEntry,
  postponeScheduleEntry,
  persistScheduleEntriesSnapshot,
  prioritizeScheduleEntry,
  readPersistedScheduleEntries,
  sortScheduleEntries,
  studyScheduleService,
} from '../services/studySchedule.service.ts';
import { isSupabaseConfigured } from '../services/supabase.client';
import { adaptSchedule, type StudyBlock } from '../engine/adaptiveScheduleAdapter.ts';

const MAX_ENTRIES = 500;

// ── Helpers ──────────────────────────────────────────────────
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const loadEntries = (): ScheduleEntry[] => {
  return readPersistedScheduleEntries();
};

const persist = (entries: ScheduleEntry[]): void => {
  persistScheduleEntriesSnapshot(entries.slice(-MAX_ENTRIES));
};

const mergeEntryMetadata = (local: ScheduleEntry, cloud: ScheduleEntry): ScheduleEntry => ({
  ...cloud,
  manualPriority: cloud.manualPriority ?? local.manualPriority,
  lastManualEditAt: cloud.lastManualEditAt ?? local.lastManualEditAt,
  lastManualTargetDate: cloud.lastManualTargetDate ?? local.lastManualTargetDate,
  createdAt: cloud.createdAt ?? local.createdAt,
  updatedAt: cloud.updatedAt ?? local.updatedAt,
  priority:
    cloud.priority && cloud.priority !== 'normal'
      ? cloud.priority
      : local.priority ?? cloud.priority,
});

const stampEntryUpdate = (
  entry: ScheduleEntry,
  updatedAt: string,
  patch: Partial<ScheduleEntry> = {},
): ScheduleEntry => ({
  ...entry,
  ...patch,
  createdAt: entry.createdAt ?? updatedAt,
  updatedAt,
});

/** Merge local + cloud: cloud vence na base, mas preservamos metadados locais de edicao */
const mergeEntries = (local: ScheduleEntry[], cloud: ScheduleEntry[]): ScheduleEntry[] => {
  const map = new Map<string, ScheduleEntry>();
  for (const e of local) map.set(e.id, e);
  for (const e of cloud) {
    const localEntry = map.get(e.id);
    map.set(e.id, localEntry ? mergeEntryMetadata(localEntry, e) : e);
  }
  return sortScheduleEntries([...map.values()]).slice(-MAX_ENTRIES);
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
      const now = new Date().toISOString();
      const entry: ScheduleEntry = {
        id: generateId(),
        date,
        subject,
        note: note?.trim() || undefined,
        done: false,
        createdAt: now,
        updatedAt: now,
        lastManualEditAt: extras?.source === 'manual' ? now : extras?.lastManualEditAt,
        lastManualTargetDate: extras?.source === 'manual' ? date : extras?.lastManualTargetDate,
        ...extras,
      };
      setEntries((prev) => sortScheduleEntries([...prev, entry]));

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
      const now = new Date().toISOString();
      const updated = sortScheduleEntries(
        prev.map((entry) => {
          if (entry.id !== id) {
            return entry;
          }

          const nextPatch: Partial<ScheduleEntry> = {
            ...patch,
          };
          if (patch.source === 'manual') {
            nextPatch.lastManualEditAt = now;
            if (patch.date || entry.date) {
              nextPatch.lastManualTargetDate = patch.date ?? entry.date;
            }
          }

          return stampEntryUpdate(entry, now, nextPatch);
        }),
      );

      const target = updated.find((entry) => entry.id === id);
      if (target && userId && isSupabaseConfigured) {
        void studyScheduleService.upsertEntry(userId, target).catch(() => {});
      }

      return updated;
    });
  }, [userId]);

  const moveEntry = useCallback((id: string, toDate: string) => {
    setEntries((prev) => {
      const next = moveScheduleEntry(prev, id, toDate);
      if (next === prev) {
        return prev;
      }

      const target = next.find((entry) => entry.id === id);
      if (target && userId && isSupabaseConfigured) {
        void studyScheduleService.upsertEntry(userId, target).catch(() => {});
      }

      return next;
    });
  }, [userId]);

  const postponeEntry = useCallback((id: string, startDate?: Date) => {
    setEntries((prev) => {
      const next = postponeScheduleEntry(prev, id, { startDate });
      if (next === prev) {
        return prev;
      }

      const target = next.find((entry) => entry.id === id);
      if (target && userId && isSupabaseConfigured) {
        void studyScheduleService.upsertEntry(userId, target).catch(() => {});
      }

      return next;
    });
  }, [userId]);

  const prioritizeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prioritizeScheduleEntry(prev, id);
      if (next === prev) {
        return prev;
      }

      const target = next.find((entry) => entry.id === id);
      if (target && userId && isSupabaseConfigured) {
        void studyScheduleService.upsertEntry(userId, target).catch(() => {});
      }

      return next;
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
      const now = new Date().toISOString();
      const updated = prev.map((e) => {
        if (e.id !== id) return e;
        const nextDone = !e.done;
        const nextStatus: ScheduleEntry['status'] = nextDone ? 'concluido' : 'pendente';
        return stampEntryUpdate(e, now, {
          done: nextDone,
          status: nextStatus,
        });
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
      const now = new Date().toISOString();
      const updated = prev.map((e) =>
        e.id === id
          ? stampEntryUpdate(e, now, { note: note.trim() || undefined })
          : e);
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
      const now = new Date().toISOString();
      const next = sortScheduleEntries(prev.map((entry) => {
        const block = adaptedMap.get(entry.id);
        if (!block) {
          return entry;
        }
        return stampEntryUpdate(entry, now, { ...toEntryPatch(block), source: 'ia' as const });
      }));

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
    moveEntry,
    postponeEntry,
    prioritizeEntry,
    removeEntry,
    toggleDone,
    updateNote,
    applyAdaptiveSchedule,
    getEntriesForDate,
  };
}
