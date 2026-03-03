import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { socialGroupsService } from '../../services/socialGroups.service';
import { isSupabaseConfigured, supabase } from '../../services/supabase.client';
import type { GroupMessage, StudyGroup } from '../../types/social';

interface GroupsPageProps {
  userId?: string | null;
  userName?: string;
}

const GroupsPage: React.FC<GroupsPageProps> = ({ userId, userName }) => {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [messageInput, setMessageInput] = useState('');

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || null,
    [groups, selectedGroupId],
  );

  const fetchGroups = async () => {
    if (!userId) return;
    setLoadingGroups(true);
    try {
      const data = await socialGroupsService.listGroups();
      setGroups(data);
      if (!selectedGroupId && data.length > 0) {
        setSelectedGroupId(data[0].id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar grupos.');
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchMessages = async (groupId: string) => {
    setLoadingMessages(true);
    try {
      const data = await socialGroupsService.listMessages(groupId);
      setMessages(data);
    } catch (error) {
      setMessages([]);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar mensagens.');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void fetchGroups();
  }, [userId]);

  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      return;
    }

    void fetchMessages(selectedGroupId);
  }, [selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId || !isSupabaseConfigured || !supabase) {
      return;
    }

    const client = supabase;

    const channel = client
      .channel(`group-messages-${selectedGroupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${selectedGroupId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            group_id: string;
            user_id: string;
            content: string;
            attachment_url: string | null;
            created_at: string;
          };

          setMessages((previous) => {
            if (previous.some((item) => item.id === row.id)) {
              return previous;
            }

            return [
              ...previous,
              {
                id: row.id,
                groupId: row.group_id,
                userId: row.user_id,
                content: row.content,
                attachmentUrl: row.attachment_url,
                createdAt: row.created_at,
              },
            ];
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [selectedGroupId]);

  const handleCreateGroup = async () => {
    if (!userId) {
      toast.error('Faça login para criar um grupo.');
      return;
    }

    const trimmedName = newGroupName.trim();
    if (!trimmedName) {
      toast.error('Informe o nome do grupo.');
      return;
    }

    setCreatingGroup(true);
    try {
      const created = await socialGroupsService.createGroup({
        name: trimmedName,
        description: newGroupDescription.trim() || undefined,
        isPrivate: newGroupPrivate,
        createdBy: userId,
      });

      await socialGroupsService.joinGroup(created.id, userId);

      setGroups((previous) => [created, ...previous]);
      setSelectedGroupId(created.id);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupPrivate(false);
      toast.success('Grupo criado com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar grupo.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!userId) {
      toast.error('Faça login para entrar no grupo.');
      return;
    }

    setJoiningGroupId(groupId);
    try {
      await socialGroupsService.joinGroup(groupId, userId);
      setSelectedGroupId(groupId);
      toast.success('Você entrou no grupo!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao entrar no grupo.');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!userId || !selectedGroupId) {
      return;
    }

    const trimmed = messageInput.trim();
    if (!trimmed) {
      return;
    }

    setSendingMessage(true);
    try {
      await socialGroupsService.sendMessage({
        groupId: selectedGroupId,
        userId,
        content: trimmed,
      });
      setMessageInput('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mensagem.');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Grupos de Estudo</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Crie grupos, entre com colegas e acompanhe discussões em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo grupo
            </h3>
            <input
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Nome do grupo"
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
            <input
              value={newGroupDescription}
              onChange={(event) => setNewGroupDescription(event.target.value)}
              placeholder="Descrição (opcional)"
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={newGroupPrivate}
                onChange={(event) => setNewGroupPrivate(event.target.checked)}
              />
              Grupo privado
            </label>
            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={creatingGroup || !userId}
              className="w-full px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {creatingGroup ? 'Criando...' : 'Criar grupo'}
            </button>
            {!userId && (
              <p className="text-xs text-amber-600 dark:text-amber-300">
                Faça login para criar e participar de grupos.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2 mb-3">
              <Users className="w-4 h-4" /> Grupos disponíveis
            </h3>

            {loadingGroups ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Carregando grupos...</p>
            ) : groups.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum grupo disponível ainda.</p>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={`rounded-xl border p-3 transition ${
                      selectedGroupId === group.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className="w-full text-left"
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{group.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {group.description || 'Sem descrição.'}
                      </p>
                    </button>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {group.isPrivate ? 'Privado' : 'Público'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleJoinGroup(group.id)}
                        disabled={joiningGroupId === group.id || !userId}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 disabled:opacity-50"
                      >
                        {joiningGroupId === group.id ? 'Entrando...' : 'Entrar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col min-h-[560px]">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {selectedGroup ? `Chat — ${selectedGroup.name}` : 'Chat do grupo'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {selectedGroup
                ? `Conectado como ${userName || 'Usuário'}. Mensagens em tempo real habilitadas.`
                : 'Selecione um grupo para visualizar e enviar mensagens.'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {!selectedGroup ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum grupo selecionado.</p>
            ) : loadingMessages ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Carregando mensagens...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Ainda não há mensagens nesse grupo.</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400">{message.userId.slice(0, 8)} • {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-sm text-slate-800 dark:text-slate-100 mt-1 whitespace-pre-wrap">{message.content}</p>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <input
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSendMessage();
                }
              }}
              disabled={!selectedGroup || !userId || sendingMessage}
              placeholder={selectedGroup ? 'Escreva uma mensagem...' : 'Selecione um grupo primeiro'}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                void handleSendMessage();
              }}
              disabled={!selectedGroup || !userId || sendingMessage || !messageInput.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {sendingMessage ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupsPage;
