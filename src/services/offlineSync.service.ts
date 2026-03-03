import { isSupabaseConfigured, supabase } from './supabase.client';

type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE';
type SyncTable = 'study_sessions' | 'messages' | 'study_blocks' | 'challenges' | 'challenge_participants';

interface SyncQueueItem {
  id?: number;
  action: SyncAction;
  table: SyncTable;
  record_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
  synced_at: string | null;
  attempts: number;
  error_message?: string | null;
}

interface LocalCacheItem {
  key: string;
  table: string;
  record_id: string;
  payload: Record<string, unknown>;
  updated_at: string;
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  lastConflict: string | null;
}

interface ConflictHistoryItem {
  at: string;
  table: SyncTable;
  recordId: string | null;
  strategy: 'discard-local' | 'apply-local' | 'merge-automatico';
  detail: string;
}

type SyncSubscriber = (status: SyncStatus) => void;

const DB_NAME = 'zero-base-offline-sync';
const DB_VERSION = 1;
const QUEUE_STORE = 'sync_queue';
const CACHE_STORE = 'sync_cache';
const CONFLICT_HISTORY_KEY = 'offlineSyncConflictHistory';

const isBrowser = typeof window !== 'undefined';

const isNetworkError = (message: string) => {
  const text = message.toLowerCase();
  return (
    text.includes('failed to fetch')
    || text.includes('network')
    || text.includes('fetch')
    || text.includes('timeout')
    || text.includes('offline')
  );
};

const toIso = () => new Date().toISOString();

const ownerColumnByTable: Record<SyncTable, string> = {
  study_sessions: 'user_id',
  messages: 'user_id',
  study_blocks: 'user_id',
  challenges: 'created_by',
  challenge_participants: 'user_id',
};

const toNumberId = (value: IDBValidKey | undefined): number | undefined => {
  if (typeof value === 'number') return value;
  return undefined;
};

class OfflineSyncService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private subscribers = new Set<SyncSubscriber>();
  private status: SyncStatus = {
    isOnline: isBrowser ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
    lastConflict: null,
  };
  private listenersBound = false;
  private processing = false;
  private currentUserId: string | null = null;
  private conflictHistory: ConflictHistoryItem[] = [];

  constructor() {
    if (!isBrowser) return;

    try {
      const raw = window.localStorage.getItem(CONFLICT_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ConflictHistoryItem[];
      if (Array.isArray(parsed)) {
        this.conflictHistory = parsed.slice(0, 20);
      }
    } catch {
      this.conflictHistory = [];
    }
  }

  private openDb(): Promise<IDBDatabase> {
    if (!isBrowser) {
      return Promise.reject(new Error('IndexedDB indisponível fora do navegador.'));
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('by_synced_at', 'synced_at', { unique: false });
          store.createIndex('by_created_at', 'created_at', { unique: false });
          store.createIndex('by_table_record', ['table', 'record_id'], { unique: false });
        }

        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          const store = db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
          store.createIndex('by_table_record', ['table', 'record_id'], { unique: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Falha ao abrir IndexedDB.'));
    });

    return this.dbPromise;
  }

  private async withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    runner: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    const db = await this.openDb();

    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);

      runner(store)
        .then((value) => {
          tx.oncomplete = () => resolve(value);
        })
        .catch((error) => {
          try {
            tx.abort();
          } catch {
            // ignore
          }
          reject(error);
        });

      tx.onerror = () => reject(tx.error || new Error('Erro na transação IndexedDB.'));
    });
  }

  private emitStatus() {
    this.subscribers.forEach((subscriber) => subscriber({ ...this.status }));
  }

  private setStatus(partial: Partial<SyncStatus>) {
    this.status = { ...this.status, ...partial };
    this.emitStatus();
  }

  subscribe(callback: SyncSubscriber): () => void {
    this.subscribers.add(callback);
    callback({ ...this.status });

    return () => {
      this.subscribers.delete(callback);
    };
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  getConflictHistory(): ConflictHistoryItem[] {
    return [...this.conflictHistory];
  }

  clearConflictHistory(): void {
    this.conflictHistory = [];
    if (!isBrowser) return;
    try {
      window.localStorage.removeItem(CONFLICT_HISTORY_KEY);
    } catch {
      // ignore
    }
  }

  private pushConflictHistory(item: ConflictHistoryItem): void {
    this.conflictHistory = [item, ...this.conflictHistory].slice(0, 20);

    if (!isBrowser) return;
    try {
      window.localStorage.setItem(CONFLICT_HISTORY_KEY, JSON.stringify(this.conflictHistory));
    } catch {
      // ignore
    }
  }

  async enqueue(input: {
    action: SyncAction;
    table: SyncTable;
    recordId?: string | null;
    data: Record<string, unknown>;
  }): Promise<number | null> {
    try {
      const queueItem: SyncQueueItem = {
        action: input.action,
        table: input.table,
        record_id: input.recordId || null,
        data: input.data,
        created_at: toIso(),
        synced_at: null,
        attempts: 0,
        error_message: null,
      };

      const id = await this.withStore<number | null>(QUEUE_STORE, 'readwrite', async (store) => new Promise<number | null>((resolve, reject) => {
        const request = store.add(queueItem);
        request.onsuccess = () => resolve(toNumberId(request.result) || null);
        request.onerror = () => reject(request.error || new Error('Falha ao adicionar item na fila.'));
      }));

      await this.refreshPendingCount();
      return id;
    } catch {
      return null;
    }
  }

  async hasPendingOperation(table: SyncTable, recordId: string): Promise<boolean> {
    try {
      const items = await this.listPending();
      return items.some((item) => item.table === table && item.record_id === recordId);
    } catch {
      return false;
    }
  }

  async upsertLocalCache(table: string, recordId: string, payload: Record<string, unknown>): Promise<void> {
    if (!recordId) return;

    const key = `${table}:${recordId}`;

    await this.withStore<void>(CACHE_STORE, 'readwrite', async (store) => new Promise<void>((resolve, reject) => {
      const item: LocalCacheItem = {
        key,
        table,
        record_id: recordId,
        payload,
        updated_at: toIso(),
      };

      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Falha ao salvar cache local.'));
    }));
  }

  async applyRemoteSnapshot(table: SyncTable, recordId: string, payload: Record<string, unknown>): Promise<void> {
    const hasPending = await this.hasPendingOperation(table, recordId);
    if (hasPending) return;

    await this.upsertLocalCache(table, recordId, payload);
  }

  private async listPending(): Promise<SyncQueueItem[]> {
    return this.withStore<SyncQueueItem[]>(QUEUE_STORE, 'readonly', async (store) => new Promise<SyncQueueItem[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const result = (request.result as SyncQueueItem[])
          .filter((item) => !item.synced_at)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        resolve(result);
      };
      request.onerror = () => reject(request.error || new Error('Falha ao listar fila.'));
    }));
  }

  private async refreshPendingCount(): Promise<void> {
    try {
      const items = await this.listPending();
      this.setStatus({ pendingCount: items.length });
    } catch {
      this.setStatus({ pendingCount: 0 });
    }
  }

  private async markSynced(id: number | undefined): Promise<void> {
    if (!id) return;

    await this.withStore<void>(QUEUE_STORE, 'readwrite', async (store) => new Promise<void>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const row = request.result as SyncQueueItem | undefined;
        if (!row) {
          resolve();
          return;
        }

        row.synced_at = toIso();
        row.error_message = null;

        const updateRequest = store.put(row);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error || new Error('Falha ao marcar como sincronizado.'));
      };
      request.onerror = () => reject(request.error || new Error('Falha ao buscar item para sincronizar.'));
    }));
  }

  private async markFailed(id: number | undefined, message: string): Promise<void> {
    if (!id) return;

    await this.withStore<void>(QUEUE_STORE, 'readwrite', async (store) => new Promise<void>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const row = request.result as SyncQueueItem | undefined;
        if (!row) {
          resolve();
          return;
        }

        row.attempts = (row.attempts || 0) + 1;
        row.error_message = message;

        const updateRequest = store.put(row);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error || new Error('Falha ao marcar tentativa de falha.'));
      };
      request.onerror = () => reject(request.error || new Error('Falha ao atualizar item com erro.'));
    }));
  }

  private async resolveConflict(item: SyncQueueItem, remoteUpdatedAt: string | null): Promise<'discard-local' | 'apply-local'> {
    const localUpdatedAt = String(item.data.local_updated_at || item.created_at);
    const remoteMs = remoteUpdatedAt ? new Date(remoteUpdatedAt).getTime() : 0;
    const localMs = localUpdatedAt ? new Date(localUpdatedAt).getTime() : 0;

    if (remoteMs > localMs) {
      const detail = `Conflito resolvido automaticamente em ${item.table}:${item.record_id || 'novo'} (remoto mais recente).`;
      this.setStatus({
        lastConflict: detail,
      });
      this.pushConflictHistory({
        at: toIso(),
        table: item.table,
        recordId: item.record_id || null,
        strategy: 'discard-local',
        detail,
      });
      return 'discard-local';
    }

    const detail = `Conflito resolvido automaticamente em ${item.table}:${item.record_id || 'novo'} (local mais recente).`;
    this.setStatus({
      lastConflict: detail,
    });
    this.pushConflictHistory({
      at: toIso(),
      table: item.table,
      recordId: item.record_id || null,
      strategy: 'apply-local',
      detail,
    });
    return 'apply-local';
  }

  private mergeStudyBlocksPayload(
    localPayload: Record<string, unknown>,
    remotePayload: Record<string, unknown>,
  ): Record<string, unknown> {
    const merged = { ...localPayload };

    const localNoteRaw = String(localPayload.note || '').trim();
    const remoteNoteRaw = String(remotePayload.note || '').trim();

    if (localNoteRaw && remoteNoteRaw && localNoteRaw !== remoteNoteRaw) {
      const separator = '\n\n---\n';
      merged.note = `${remoteNoteRaw}${separator}${localNoteRaw}`;
      this.pushConflictHistory({
        at: toIso(),
        table: 'study_blocks',
        recordId: String(localPayload.id || remotePayload.id || ''),
        strategy: 'merge-automatico',
        detail: 'Merge automático aplicado em note de study_blocks (concatenação remoto + local).',
      });
      this.setStatus({
        lastConflict: 'Merge automático aplicado em anotações do cronograma.',
      });
    }

    return merged;
  }

  private mergeChallengeParticipantsPayload(
    localPayload: Record<string, unknown>,
    remotePayload: Record<string, unknown>,
  ): Record<string, unknown> {
    const merged = { ...localPayload };
    const localProgress = Number(localPayload.progress || 0);
    const remoteProgress = Number(remotePayload.progress || 0);
    const safeProgress = Math.max(localProgress, remoteProgress);

    if (safeProgress !== localProgress) {
      merged.progress = safeProgress;
      this.pushConflictHistory({
        at: toIso(),
        table: 'challenge_participants',
        recordId: String(localPayload.id || remotePayload.id || ''),
        strategy: 'merge-automatico',
        detail: 'Merge automático aplicado em progress de challenge_participants (máximo entre local/remoto).',
      });
      this.setStatus({
        lastConflict: 'Merge automático aplicado em progresso de desafio.',
      });
    }

    const localCompleted = Boolean(localPayload.completed);
    const remoteCompleted = Boolean(remotePayload.completed);
    merged.completed = localCompleted || remoteCompleted;

    return merged;
  }

  private assertClient() {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase não configurado para sincronização.');
    }
    return supabase;
  }

  private async processCreate(item: SyncQueueItem, userId: string): Promise<void> {
    const client = this.assertClient();

    if (item.table === 'study_sessions') {
      const payload = {
        user_id: userId,
        date: String(item.data.date),
        minutes: Number(item.data.minutes || 0),
        points: Number(item.data.points || 0),
        subject: String(item.data.subject || 'Outra'),
        duration: Number(item.data.duration || 0),
        method_id: item.data.method_id ? String(item.data.method_id) : null,
        goal_met: typeof item.data.goal_met === 'boolean' ? item.data.goal_met : null,
        timestamp: item.data.timestamp ? String(item.data.timestamp) : null,
      };

      const { data, error } = await client
        .from('study_sessions')
        .insert(payload)
        .select('id, updated_at')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const row = data as { id: string; updated_at?: string };
      await this.upsertLocalCache('study_sessions', row.id, {
        ...payload,
        id: row.id,
        updated_at: row.updated_at || toIso(),
      });

      return;
    }

    if (item.table === 'messages') {
      const payload = {
        group_id: String(item.data.group_id),
        user_id: userId,
        content: String(item.data.content || ''),
        attachment_url: item.data.attachment_url ? String(item.data.attachment_url) : null,
      };

      const { data, error } = await client
        .from('messages')
        .insert(payload)
        .select('id, created_at, updated_at')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const row = data as { id: string; created_at: string; updated_at?: string };
      await this.upsertLocalCache('messages', row.id, {
        ...payload,
        id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at || toIso(),
      });

      return;
    }

    if (item.table === 'study_blocks') {
      const payload = {
        id: String(item.data.id),
        user_id: userId,
        study_date: String(item.data.study_date),
        start_time: String(item.data.start_time),
        end_time: String(item.data.end_time),
        subject: String(item.data.subject || ''),
        topic: item.data.topic ? String(item.data.topic) : null,
        note: item.data.note ? String(item.data.note) : null,
        type: item.data.type ? String(item.data.type) : null,
        status: String(item.data.status || 'pendente'),
        reason: item.data.reason ? String(item.data.reason) : null,
        source: item.data.source ? String(item.data.source) : null,
      };

      const { data, error } = await client
        .from('study_blocks')
        .upsert(payload, { onConflict: 'id' })
        .select('id, updated_at')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const row = data as { id: string; updated_at?: string };
      await this.upsertLocalCache('study_blocks', row.id, {
        ...payload,
        updated_at: row.updated_at || toIso(),
      });

      return;
    }

    if (item.table === 'challenges') {
      const payload = {
        group_id: String(item.data.group_id),
        created_by: userId,
        name: String(item.data.name || ''),
        goal_type: String(item.data.goal_type || 'minutes'),
        goal_value: Number(item.data.goal_value || 0),
        start_date: String(item.data.start_date),
        end_date: String(item.data.end_date),
        status: String(item.data.status || 'active'),
      };

      const { data, error } = await client
        .from('challenges')
        .insert(payload)
        .select('id, updated_at')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const row = data as { id: string; updated_at?: string };

      const autoJoinUserId = item.data.auto_join_user_id ? String(item.data.auto_join_user_id) : null;
      if (autoJoinUserId) {
        const { error: joinError } = await client
          .from('challenge_participants')
          .upsert(
            {
              challenge_id: row.id,
              user_id: autoJoinUserId,
              progress: 0,
              completed: false,
            },
            { onConflict: 'challenge_id,user_id' },
          );

        if (joinError) {
          throw new Error(joinError.message);
        }
      }

      await this.upsertLocalCache('challenges', row.id, {
        ...payload,
        id: row.id,
        updated_at: row.updated_at || toIso(),
      });

      return;
    }

    if (item.table === 'challenge_participants') {
      const payload = {
        challenge_id: String(item.data.challenge_id),
        user_id: userId,
        progress: Number(item.data.progress || 0),
        completed: Boolean(item.data.completed),
      };

      const { data, error } = await client
        .from('challenge_participants')
        .upsert(payload, { onConflict: 'challenge_id,user_id' })
        .select('id, updated_at')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const row = data as { id: string; updated_at?: string };
      await this.upsertLocalCache('challenge_participants', row.id, {
        ...payload,
        id: row.id,
        updated_at: row.updated_at || toIso(),
      });

      return;
    }

    throw new Error(`Tabela não suportada para CREATE: ${item.table}`);
  }

  private async processUpdate(item: SyncQueueItem, userId: string): Promise<void> {
    if (!item.record_id) {
      throw new Error('UPDATE sem record_id na fila de sincronização.');
    }

    const client = this.assertClient();

    const tableName = item.table;
    const { data: remote, error: remoteError } = await client
      .from(tableName)
      .select('*')
      .eq('id', item.record_id)
      .single();

    if (remoteError && !String(remoteError.message).toLowerCase().includes('no rows')) {
      throw new Error(remoteError.message);
    }

    const remoteRow = remote as ({ id: string; updated_at?: string } & Record<string, unknown>) | null;
    const decision = await this.resolveConflict(item, remoteRow?.updated_at || null);

    if (decision === 'discard-local') {
      return;
    }

    let payload = { ...item.data };
    delete (payload as Record<string, unknown>).local_updated_at;
    delete (payload as Record<string, unknown>).auto_join_user_id;

    if (remoteRow && tableName === 'study_blocks') {
      payload = this.mergeStudyBlocksPayload(payload, remoteRow);
    }

    if (remoteRow && tableName === 'challenge_participants') {
      payload = this.mergeChallengeParticipantsPayload(payload, remoteRow);
    }

    const ownerColumn = ownerColumnByTable[item.table];

    const { error } = await client
      .from(tableName)
      .update(payload)
      .eq('id', item.record_id)
      .eq(ownerColumn, userId);

    if (error) {
      throw new Error(error.message);
    }

    await this.upsertLocalCache(tableName, item.record_id, payload);
  }

  private async processDelete(item: SyncQueueItem, userId: string): Promise<void> {
    if (!item.record_id) {
      throw new Error('DELETE sem record_id na fila de sincronização.');
    }

    const client = this.assertClient();

    const tableName = item.table;
    const { data: remote, error: remoteError } = await client
      .from(tableName)
      .select('id, updated_at')
      .eq('id', item.record_id)
      .single();

    if (remoteError && !String(remoteError.message).toLowerCase().includes('no rows')) {
      throw new Error(remoteError.message);
    }

    const remoteRow = remote as { id: string; updated_at: string } | null;
    const decision = await this.resolveConflict(item, remoteRow?.updated_at || null);

    if (decision === 'discard-local') {
      return;
    }

    const ownerColumn = ownerColumnByTable[item.table];

    const { error } = await client
      .from(tableName)
      .delete()
      .eq('id', item.record_id)
      .eq(ownerColumn, userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  private async processItem(item: SyncQueueItem, userId: string): Promise<void> {
    if (item.action === 'CREATE') {
      await this.processCreate(item, userId);
      return;
    }

    if (item.action === 'UPDATE') {
      await this.processUpdate(item, userId);
      return;
    }

    if (item.action === 'DELETE') {
      await this.processDelete(item, userId);
      return;
    }

    throw new Error(`Ação não suportada na fila: ${item.action}`);
  }

  async processQueue(userId?: string): Promise<void> {
    if (this.processing) {
      return;
    }

    if (!isBrowser || !navigator.onLine) {
      this.setStatus({ isOnline: false });
      return;
    }

    const effectiveUserId = userId || this.currentUserId;
    if (!effectiveUserId) {
      return;
    }

    this.processing = true;
    this.setStatus({ isSyncing: true, isOnline: true, lastError: null });

    try {
      const pending = await this.listPending();

      for (const item of pending) {
        try {
          await this.processItem(item, effectiveUserId);
          await this.markSynced(item.id);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erro desconhecido na sincronização.';
          await this.markFailed(item.id, message);

          if (isNetworkError(message)) {
            this.setStatus({ lastError: 'Sem conexão para sincronizar agora.' });
            break;
          }

          this.setStatus({ lastError: message });
        }
      }

      await this.refreshPendingCount();
      this.setStatus({ lastSyncAt: toIso() });
    } finally {
      this.processing = false;
      this.setStatus({ isSyncing: false });
    }
  }

  async syncNow(userId?: string): Promise<void> {
    await this.processQueue(userId);
  }

  async start(userId?: string): Promise<void> {
    if (userId) {
      this.currentUserId = userId;
    }

    await this.refreshPendingCount();

    if (!isBrowser || this.listenersBound) {
      await this.processQueue(userId);
      return;
    }

    const handleOnline = () => {
      this.setStatus({ isOnline: true });
      void this.processQueue(this.currentUserId || undefined);
    };

    const handleOffline = () => {
      this.setStatus({ isOnline: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    this.listenersBound = true;

    await this.processQueue(userId);
  }
}

export const offlineSyncService = new OfflineSyncService();
export type { SyncStatus, SyncTable, SyncAction, SyncQueueItem };
