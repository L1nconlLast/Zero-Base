import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Trash2, AlertTriangle, WifiOff, CheckCircle2, Clock3 } from 'lucide-react';
import { offlineSyncService } from '../../services/offlineSync.service';
import type { ConflictHistoryItem, SyncQueueItem } from '../../services/offlineSync.service';

interface SyncCenterProps {
  userId?: string | null;
}

const toneClass = (tone: 'success' | 'warning' | 'danger' | 'neutral') => {
  if (tone === 'success') return 'text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/30';
  if (tone === 'warning') return 'text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/30';
  if (tone === 'danger') return 'text-rose-700 bg-rose-100 dark:text-rose-200 dark:bg-rose-900/30';
  return 'text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-800';
};

const SyncCenter: React.FC<SyncCenterProps> = ({ userId }) => {
  const [status, setStatus] = useState(offlineSyncService.getStatus());
  const [pendingItems, setPendingItems] = useState<SyncQueueItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictHistoryItem[]>(offlineSyncService.getConflictHistory());
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [actionItemId, setActionItemId] = useState<number | null>(null);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const list = await offlineSyncService.getPendingQueueItems();
      setPendingItems(list);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((nextStatus) => {
      setStatus(nextStatus);
      setConflicts(offlineSyncService.getConflictHistory());
      void loadQueue();
    });

    void loadQueue();

    return () => unsubscribe();
  }, [loadQueue]);

  const statusMeta = useMemo(() => {
    if (!status.isOnline) {
      return {
        label: 'Offline',
        tone: 'warning' as const,
        icon: WifiOff,
      };
    }

    if (status.isSyncing) {
      return {
        label: 'Sincronizando fila',
        tone: 'neutral' as const,
        icon: RefreshCw,
      };
    }

    if (status.lastError) {
      return {
        label: 'Erro de sincronização',
        tone: 'danger' as const,
        icon: AlertTriangle,
      };
    }

    if (status.pendingCount > 0) {
      return {
        label: `${status.pendingCount} pendência(s)`,
        tone: 'warning' as const,
        icon: Clock3,
      };
    }

    return {
      label: 'Sincronizado',
      tone: 'success' as const,
      icon: CheckCircle2,
    };
  }, [status]);

  const handleSyncNow = async () => {
    if (!userId) {
      toast.error('Faça login para sincronizar.');
      return;
    }

    try {
      await offlineSyncService.syncNow(userId);
      await loadQueue();
      toast.success('Sincronização executada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao sincronizar fila.');
    }
  };

  const handleReprocessItem = async (id: number) => {
    if (!userId) {
      toast.error('Faça login para reprocessar item.');
      return;
    }

    setActionItemId(id);
    try {
      await offlineSyncService.reprocessQueueItem(id, userId);
      await loadQueue();
      toast.success('Item reprocessado com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao reprocessar item.');
    } finally {
      setActionItemId(null);
    }
  };

  const handleDiscardItem = async (id: number) => {
    setActionItemId(id);
    try {
      await offlineSyncService.discardQueueItem(id);
      await loadQueue();
      toast.success('Item descartado da fila.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao descartar item.');
    } finally {
      setActionItemId(null);
    }
  };

  const handleClearConflicts = () => {
    offlineSyncService.clearConflictHistory();
    setConflicts([]);
    toast.success('Histórico de conflitos limpo.');
  };

  const StatusIcon = statusMeta.icon;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Central de Sincronização</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Controle da fila offline, reprocessamento de itens e histórico de conflitos automáticos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${toneClass(statusMeta.tone)}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${status.isSyncing ? 'animate-spin' : ''}`} />
            {statusMeta.label}
          </span>
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={status.isSyncing || !userId}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 disabled:opacity-50"
          >
            Sincronizar agora
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fila Pendente</h4>
          <span className="text-xs text-slate-500 dark:text-slate-400">{pendingItems.length} item(ns)</span>
        </div>

        {loadingQueue ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Carregando fila...</p>
        ) : pendingItems.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Sem itens pendentes.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {pendingItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {item.table} • {item.action}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">tentativas: {item.attempts}</p>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  criado em {new Date(item.created_at).toLocaleString('pt-BR')}
                </p>
                {item.error_message && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-300 mt-1">erro: {item.error_message}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.id) void handleReprocessItem(item.id);
                    }}
                    disabled={actionItemId === item.id}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 disabled:opacity-50"
                  >
                    Reprocessar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.id) void handleDiscardItem(item.id);
                    }}
                    disabled={actionItemId === item.id}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-600 text-white disabled:opacity-50"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Conflitos Resolvidos</h4>
          <button
            type="button"
            onClick={handleClearConflicts}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpar
          </button>
        </div>

        {conflicts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Sem conflitos registrados.</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {conflicts.map((item, index) => (
              <div key={`${item.at}-${index}`} className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{item.table} • {item.strategy}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">{item.detail}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{new Date(item.at).toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncCenter;
