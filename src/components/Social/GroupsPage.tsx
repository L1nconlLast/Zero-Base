import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AtSign, Image as ImageIcon, MessageSquare, Paperclip, Plus, Target, Trophy, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { rankingService } from '../../services/ranking.service';
import { socialChallengesService } from '../../services/socialChallenges.service';
import { socialGroupsService } from '../../services/socialGroups.service';
import { offlineSyncService } from '../../services/offlineSync.service';
import { isSupabaseConfigured, supabase } from '../../services/supabase.client';
import type { ChallengeParticipant, GroupChallenge, GroupMember, GroupMessage, RankingPeriod, RankingRow, StudyGroup } from '../../types/social';

interface GroupsPageProps {
  userId?: string | null;
  userName?: string;
  userTotalPoints?: number;
  weeklyGoalMinutes?: number;
  weeklyStudiedMinutes?: number;
}

const toIsoDate = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
};

const getWeekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    periodStart: toIsoDate(start),
    periodEnd: toIsoDate(end),
  };
};

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    periodStart: toIsoDate(start),
    periodEnd: toIsoDate(end),
  };
};

const getRankingWindow = (period: RankingPeriod) => {
  if (period === 'monthly') {
    return getMonthRange();
  }

  if (period === 'global') {
    return {
      periodStart: '1970-01-01',
      periodEnd: '2099-12-31',
    };
  }

  return getWeekRange();
};

const formatDatePtBr = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('pt-BR');
};

const sortRankingRows = (rows: RankingRow[]) => [...rows].sort((a, b) => Number(b.totalPoints) - Number(a.totalPoints));

const createLocalRankingId = (input: {
  userId: string;
  groupId?: string | null;
  period: RankingPeriod;
  periodStart: string;
  periodEnd: string;
}) => {
  const scope = input.groupId || 'global';
  return `local-${input.userId}-${scope}-${input.period}-${input.periodStart}-${input.periodEnd}`;
};

const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;

const extractFirstName = (value?: string | null) => {
  if (!value) return '';
  return value.trim().split(/\s+/)[0] || '';
};

const renderMentionText = (content: string) => {
  const parts = content.split(/(@[A-Za-zÀ-ÿ0-9_]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span
          key={`${part}-${index}`}
          className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold"
        >
          {part}
        </span>
      );
    }

    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
};

const GroupsPage: React.FC<GroupsPageProps> = ({
  userId,
  userName,
  userTotalPoints = 0,
  weeklyGoalMinutes = 900,
  weeklyStudiedMinutes = 0,
}) => {
  const [activePanel, setActivePanel] = useState<'chat' | 'membros' | 'desafios' | 'ranking'>('chat');
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [creatingGroup, setCreatingGroup] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [challenges, setChallenges] = useState<GroupChallenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [challengeParticipants, setChallengeParticipants] = useState<ChallengeParticipant[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [joiningChallengeId, setJoiningChallengeId] = useState<string | null>(null);
  const [savingChallengeProgress, setSavingChallengeProgress] = useState(false);

  const [rankingRows, setRankingRows] = useState<RankingRow[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>('weekly');
  const [rankingScope, setRankingScope] = useState<'group' | 'global'>('group');
  const [syncingRanking, setSyncingRanking] = useState(false);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [attachedImageFile, setAttachedImageFile] = useState<File | null>(null);
  const [attachedImagePreviewUrl, setAttachedImagePreviewUrl] = useState<string | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const [newChallengeName, setNewChallengeName] = useState('');
  const [newChallengeGoalValue, setNewChallengeGoalValue] = useState<number>(300);
  const [newChallengeStartDate, setNewChallengeStartDate] = useState(() => getWeekRange().periodStart);
  const [newChallengeEndDate, setNewChallengeEndDate] = useState(() => getWeekRange().periodEnd);
  const [myChallengeProgressInput, setMyChallengeProgressInput] = useState<number>(0);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || null,
    [groups, selectedGroupId],
  );

  const selectedChallenge = useMemo(
    () => challenges.find((challenge) => challenge.id === selectedChallengeId) || null,
    [challenges, selectedChallengeId],
  );

  const myRankingPosition = useMemo(() => {
    if (!userId) return null;
    const index = rankingRows.findIndex((row) => row.userId === userId);
    return index >= 0 ? index + 1 : null;
  }, [rankingRows, userId]);

  const myParticipant = useMemo(() => {
    if (!userId) return null;
    return challengeParticipants.find((participant) => participant.userId === userId) || null;
  }, [challengeParticipants, userId]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    groupMembers.forEach((member) => {
      if (member.userName?.trim()) {
        map.set(member.userId, member.userName.trim());
      }
    });
    return map;
  }, [groupMembers]);

  const mentionSuggestions = useMemo(() => {
    if (!showMentionMenu || !mentionQuery.trim()) {
      return [] as GroupMember[];
    }

    const normalized = mentionQuery.trim().toLowerCase();
    return groupMembers
      .filter((member) => {
        const candidate = extractFirstName(member.userName).toLowerCase();
        return candidate.startsWith(normalized);
      })
      .slice(0, 6);
  }, [groupMembers, mentionQuery, showMentionMenu]);

  const fetchGroups = useCallback(async () => {
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
  }, [selectedGroupId, userId]);

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

  const fetchGroupMembers = async (groupId: string) => {
    setLoadingMembers(true);
    try {
      const data = await socialGroupsService.listMembers(groupId);
      setGroupMembers(data);
    } catch (error) {
      setGroupMembers([]);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar membros do grupo.');
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchChallenges = useCallback(async (groupId: string) => {
    if (!userId) return;

    setLoadingChallenges(true);
    try {
      const data = await socialChallengesService.listChallengesByGroup(groupId);
      setChallenges(data);
      if (!selectedChallengeId && data.length > 0) {
        setSelectedChallengeId(data[0].id);
      }
      if (data.length === 0) {
        setSelectedChallengeId(null);
        setChallengeParticipants([]);
      }
    } catch (error) {
      setChallenges([]);
      setSelectedChallengeId(null);
      setChallengeParticipants([]);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar desafios.');
    } finally {
      setLoadingChallenges(false);
    }
  }, [selectedChallengeId, userId]);

  const fetchChallengeParticipants = useCallback(async (challengeId: string) => {
    if (!userId) return;

    setLoadingParticipants(true);
    try {
      const data = await socialChallengesService.listParticipants(challengeId);
      setChallengeParticipants(data);
    } catch (error) {
      setChallengeParticipants([]);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar participantes do desafio.');
    } finally {
      setLoadingParticipants(false);
    }
  }, [userId]);

  const fetchRanking = useCallback(async () => {
    if (!userId) return;
    if (rankingScope === 'group' && !selectedGroupId) {
      setRankingRows([]);
      return;
    }

    setLoadingRanking(true);
    try {
      const { periodStart, periodEnd } = getRankingWindow(rankingPeriod);
      const data = await rankingService.listRanking({
        period: rankingPeriod,
        periodStart,
        periodEnd,
        groupId: rankingScope === 'group' ? selectedGroupId || undefined : undefined,
        limit: 100,
      });
      setRankingRows(data);
    } catch (error) {
      setRankingRows([]);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar ranking.');
    } finally {
      setLoadingRanking(false);
    }
  }, [rankingPeriod, rankingScope, selectedGroupId, userId]);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      setGroupMembers([]);
      setChallenges([]);
      setSelectedChallengeId(null);
      setChallengeParticipants([]);
      return;
    }

    void fetchMessages(selectedGroupId);
    void fetchGroupMembers(selectedGroupId);
    void fetchChallenges(selectedGroupId);
  }, [fetchChallenges, selectedGroupId]);

  useEffect(() => {
    if (!selectedChallengeId) {
      setChallengeParticipants([]);
      setMyChallengeProgressInput(0);
      return;
    }

    void fetchChallengeParticipants(selectedChallengeId);
  }, [fetchChallengeParticipants, selectedChallengeId]);

  useEffect(() => {
    if (!myParticipant) {
      setMyChallengeProgressInput(0);
      return;
    }

    setMyChallengeProgressInput(myParticipant.progress);
  }, [myParticipant]);

  useEffect(() => {
    void fetchRanking();
  }, [fetchRanking]);

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

          void offlineSyncService.applyRemoteSnapshot('messages', row.id, {
            id: row.id,
            group_id: row.group_id,
            user_id: row.user_id,
            content: row.content,
            attachment_url: row.attachment_url,
            created_at: row.created_at,
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId || !isSupabaseConfigured || !supabase) {
      return;
    }

    const client = supabase;

    const channel = client
      .channel(`group-challenges-${selectedGroupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenges',
          filter: `group_id=eq.${selectedGroupId}`,
        },
        (payload) => {
          const newRow = payload.new as {
            id: string;
            group_id: string;
            name: string;
            goal_type: string;
            goal_value: number;
            start_date: string;
            end_date: string;
            status: 'draft' | 'active' | 'completed' | 'cancelled';
            created_by: string;
            created_at: string;
            updated_at: string;
          };
          const oldRow = payload.old as { id: string };

          setChallenges((previous) => {
            if (payload.eventType === 'DELETE') {
              return previous.filter((item) => item.id !== oldRow.id);
            }

            const mapped: GroupChallenge = {
              id: newRow.id,
              groupId: newRow.group_id,
              name: newRow.name,
              goalType: newRow.goal_type,
              goalValue: Number(newRow.goal_value),
              startDate: newRow.start_date,
              endDate: newRow.end_date,
              status: newRow.status,
              createdBy: newRow.created_by,
              createdAt: newRow.created_at,
              updatedAt: newRow.updated_at,
            };

            const index = previous.findIndex((item) => item.id === mapped.id);
            if (index >= 0) {
              const next = [...previous];
              next[index] = mapped;
              return next;
            }

            return [mapped, ...previous];
          });

          if (payload.eventType === 'DELETE') {
            setSelectedChallengeId((current) => (current === oldRow.id ? null : current));
            return;
          }

          if (!selectedChallengeId) {
            setSelectedChallengeId(newRow.id);
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [selectedGroupId, selectedChallengeId]);

  useEffect(() => {
    if (!selectedChallengeId || !isSupabaseConfigured || !supabase) {
      return;
    }

    const client = supabase;

    const channel = client
      .channel(`challenge-participants-${selectedChallengeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_participants',
          filter: `challenge_id=eq.${selectedChallengeId}`,
        },
        (payload) => {
          const newRow = payload.new as {
            id: string;
            challenge_id: string;
            user_id: string;
            progress: number;
            completed: boolean;
            joined_at: string;
          };
          const oldRow = payload.old as { id: string };

          setChallengeParticipants((previous) => {
            if (payload.eventType === 'DELETE') {
              return previous.filter((item) => item.id !== oldRow.id);
            }

            const mapped: ChallengeParticipant = {
              id: newRow.id,
              challengeId: newRow.challenge_id,
              userId: newRow.user_id,
              progress: Number(newRow.progress),
              completed: newRow.completed,
              joinedAt: newRow.joined_at,
            };

            const index = previous.findIndex((item) => item.id === mapped.id);
            if (index >= 0) {
              const next = [...previous];
              next[index] = mapped;
              return next.sort((a, b) => Number(b.progress) - Number(a.progress));
            }

            return [...previous, mapped].sort((a, b) => Number(b.progress) - Number(a.progress));
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [selectedChallengeId]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured || !supabase) {
      return;
    }

    const { periodStart, periodEnd } = getRankingWindow(rankingPeriod);
    const expectedGroupId = rankingScope === 'group' ? selectedGroupId || null : null;

    const client = supabase;

    const channel = client
      .channel(`ranking-live-${rankingScope}-${rankingPeriod}-${selectedGroupId || 'global'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rankings_periodic',
        },
        (payload) => {
          const newRow = payload.new as {
            id: string;
            user_id: string;
            group_id: string | null;
            period: RankingPeriod;
            period_start: string;
            period_end: string;
            total_points: number;
            rank_position: number | null;
            updated_at: string;
          };
          const oldRow = payload.old as {
            id: string;
            user_id: string;
            group_id: string | null;
            period: RankingPeriod;
            period_start: string;
            period_end: string;
          };

          const matchesScope = (row: {
            group_id: string | null;
            period: RankingPeriod;
            period_start: string;
            period_end: string;
          }) =>
            row.period === rankingPeriod &&
            row.period_start === periodStart &&
            row.period_end === periodEnd &&
            (row.group_id || null) === expectedGroupId;

          setRankingRows((previous) => {
            if (payload.eventType === 'DELETE') {
              if (!matchesScope(oldRow)) {
                return previous;
              }
              return previous.filter((item) => item.id !== oldRow.id);
            }

            if (!matchesScope(newRow)) {
              return previous;
            }

            const mapped: RankingRow = {
              id: newRow.id,
              userId: newRow.user_id,
              groupId: newRow.group_id,
              period: newRow.period,
              periodStart: newRow.period_start,
              periodEnd: newRow.period_end,
              totalPoints: Number(newRow.total_points),
              rankPosition: newRow.rank_position,
              updatedAt: newRow.updated_at,
            };

            const index = previous.findIndex((item) => item.id === mapped.id);
            if (index >= 0) {
              const next = [...previous];
              next[index] = mapped;
              return sortRankingRows(next);
            }

            return sortRankingRows([...previous, mapped]);
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [userId, rankingScope, rankingPeriod, selectedGroupId]);

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

  const resolveAuthorLabel = (message: GroupMessage) => {
    if (userId && message.userId === userId) {
      return userName || 'Você';
    }

    return memberNameById.get(message.userId) || message.userId.slice(0, 8);
  };

  const clearAttachment = () => {
    setAttachedImageFile(null);
    if (attachedImagePreviewUrl) {
      URL.revokeObjectURL(attachedImagePreviewUrl);
    }
    setAttachedImagePreviewUrl(null);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  const handleMessageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    const nextCursorPosition = event.target.selectionStart ?? nextValue.length;
    setMessageInput(nextValue);
    setCursorPosition(nextCursorPosition);

    const beforeCursor = nextValue.slice(0, nextCursorPosition);
    const mentionMatch = beforeCursor.match(/(?:^|\s)@([A-Za-zÀ-ÿ0-9_]*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1] || '');
      setShowMentionMenu(true);
      return;
    }

    setShowMentionMenu(false);
    setMentionQuery('');
  };

  const handleSelectMention = (member: GroupMember) => {
    const firstName = extractFirstName(member.userName);
    if (!firstName) {
      return;
    }

    const beforeCursor = messageInput.slice(0, cursorPosition);
    const atIndex = beforeCursor.lastIndexOf('@');
    if (atIndex < 0) {
      return;
    }

    const afterCursor = messageInput.slice(cursorPosition);
    const replaced = `${beforeCursor.slice(0, atIndex)}@${firstName} ${afterCursor}`;
    setMessageInput(replaced);
    setShowMentionMenu(false);
    setMentionQuery('');

    requestAnimationFrame(() => {
      if (messageInputRef.current) {
        const nextPos = atIndex + firstName.length + 2;
        messageInputRef.current.focus();
        messageInputRef.current.setSelectionRange(nextPos, nextPos);
        setCursorPosition(nextPos);
      }
    });
  };

  const handlePickAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione apenas arquivos de imagem.');
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
      return;
    }

    if (file.size > MAX_CHAT_ATTACHMENT_SIZE_BYTES) {
      toast.error('Imagem muito grande. Limite: 5MB.');
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
      return;
    }

    if (attachedImagePreviewUrl) {
      URL.revokeObjectURL(attachedImagePreviewUrl);
    }

    setAttachedImageFile(file);
    setAttachedImagePreviewUrl(URL.createObjectURL(file));
  };

  useEffect(() => {
    return () => {
      if (attachedImagePreviewUrl) {
        URL.revokeObjectURL(attachedImagePreviewUrl);
      }
    };
  }, [attachedImagePreviewUrl]);

  const handleSendMessage = async () => {
    if (!userId || !selectedGroupId) {
      return;
    }

    const trimmed = messageInput.trim();
    const hasAttachment = Boolean(attachedImageFile);
    if (!trimmed && !hasAttachment) {
      return;
    }

    const uploadToastId = attachedImageFile ? toast.loading('Enviando imagem...') : null;
    setSendingMessage(true);
    try {
      let uploadedAttachmentUrl: string | undefined;

      if (attachedImageFile) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('Para enviar imagem, conecte-se à internet e tente novamente.');
        }

        uploadedAttachmentUrl = await socialGroupsService.uploadMessageAttachment({
          file: attachedImageFile,
          groupId: selectedGroupId,
          userId,
        });

        if (uploadToastId) {
          toast.success('Imagem enviada com sucesso.', { id: uploadToastId });
        }
      }

      const sent = await socialGroupsService.sendMessage({
        groupId: selectedGroupId,
        userId,
        content: trimmed || '[imagem]',
        attachmentUrl: uploadedAttachmentUrl,
      });

      if (String(sent.id).startsWith('local-')) {
        setMessages((previous) => [
          ...previous,
          sent,
        ]);
        toast.success('Mensagem salva localmente e será sincronizada quando voltar a conexão.');
      }

      setMessageInput('');
      clearAttachment();
      setShowMentionMenu(false);
      setMentionQuery('');
    } catch (error) {
      if (uploadToastId) {
        toast.error(error instanceof Error ? error.message : 'Erro ao enviar imagem.', { id: uploadToastId });
      }
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mensagem.');
    } finally {
      if (uploadToastId) {
        toast.dismiss(uploadToastId);
      }
      setSendingMessage(false);
    }
  };

  const handleCreateChallenge = async () => {
    if (!userId || !selectedGroupId) {
      toast.error('Selecione um grupo e faça login para criar desafio.');
      return;
    }

    const trimmedName = newChallengeName.trim();
    if (!trimmedName) {
      toast.error('Informe o nome do desafio.');
      return;
    }

    if (!newChallengeStartDate || !newChallengeEndDate) {
      toast.error('Informe a data inicial e final do desafio.');
      return;
    }

    if (newChallengeEndDate < newChallengeStartDate) {
      toast.error('A data final deve ser maior ou igual à data inicial.');
      return;
    }

    if (!Number.isFinite(newChallengeGoalValue) || newChallengeGoalValue <= 0) {
      toast.error('A meta do desafio precisa ser maior que zero.');
      return;
    }

    setCreatingChallenge(true);
    try {
      const created = await socialChallengesService.createChallenge({
        groupId: selectedGroupId,
        createdBy: userId,
        name: trimmedName,
        goalType: 'minutes',
        goalValue: Number(newChallengeGoalValue),
        startDate: newChallengeStartDate,
        endDate: newChallengeEndDate,
      });

      await socialChallengesService.joinChallenge(created.id, userId);

      setChallenges((previous) => [created, ...previous]);
      setSelectedChallengeId(created.id);
      setNewChallengeName('');
      setNewChallengeGoalValue(300);
      toast.success('Desafio criado com sucesso!');
      void fetchChallengeParticipants(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar desafio.');
    } finally {
      setCreatingChallenge(false);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (!userId) {
      toast.error('Faça login para entrar no desafio.');
      return;
    }

    setJoiningChallengeId(challengeId);
    try {
      await socialChallengesService.joinChallenge(challengeId, userId);
      setSelectedChallengeId(challengeId);
      toast.success('Você entrou no desafio!');
      void fetchChallengeParticipants(challengeId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao entrar no desafio.');
    } finally {
      setJoiningChallengeId(null);
    }
  };

  const handleSaveOwnChallengeProgress = async () => {
    if (!userId || !selectedChallengeId) {
      return;
    }

    if (!Number.isFinite(myChallengeProgressInput) || myChallengeProgressInput < 0) {
      toast.error('Informe um progresso válido.');
      return;
    }

    const currentGoal = selectedChallenge?.goalValue || 0;

    setSavingChallengeProgress(true);
    try {
      await socialChallengesService.upsertOwnProgress({
        challengeId: selectedChallengeId,
        userId,
        progress: myChallengeProgressInput,
        completed: currentGoal > 0 ? myChallengeProgressInput >= currentGoal : false,
      });
      toast.success('Progresso atualizado!');
      void fetchChallengeParticipants(selectedChallengeId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar progresso.');
    } finally {
      setSavingChallengeProgress(false);
    }
  };

  const handleCreateAutomaticWeeklyChallenge = async () => {
    if (!userId || !selectedGroupId) {
      toast.error('Selecione um grupo e faça login para criar meta semanal automática.');
      return;
    }

    setCreatingChallenge(true);
    try {
      const { periodStart, periodEnd } = getWeekRange();
      const safeGoal = Math.max(30, Number.isFinite(weeklyGoalMinutes) ? Math.round(weeklyGoalMinutes) : 900);

      const created = await socialChallengesService.createChallenge({
        groupId: selectedGroupId,
        createdBy: userId,
        name: `Meta semanal automática (${formatDatePtBr(periodStart)}-${formatDatePtBr(periodEnd)})`,
        goalType: 'minutes',
        goalValue: safeGoal,
        startDate: periodStart,
        endDate: periodEnd,
      });

      await socialChallengesService.joinChallenge(created.id, userId);

      setChallenges((previous) => [created, ...previous]);
      setSelectedChallengeId(created.id);
      toast.success('Meta semanal automática criada!');
      void fetchChallengeParticipants(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar meta semanal automática.');
    } finally {
      setCreatingChallenge(false);
    }
  };

  const syncRankingForCurrentContext = async (params: {
    period: RankingPeriod;
    useGroupScope: boolean;
    showSuccessToast?: boolean;
  }) => {
    if (!userId) {
      throw new Error('Faça login para atualizar ranking.');
    }

    if (params.useGroupScope && !selectedGroupId) {
      throw new Error('Selecione um grupo para ranking por grupo.');
    }

    const { periodStart, periodEnd } = getRankingWindow(params.period);
    const rankingGroupId = params.useGroupScope ? selectedGroupId || null : null;
    const totalPoints = Number(userTotalPoints || 0);

    await rankingService.upsertUserRanking({
      userId,
      period: params.period,
      periodStart,
      periodEnd,
      totalPoints,
      groupId: rankingGroupId,
    });

    setRankingRows((previous) => {
      const shouldHydrateCurrentView =
        rankingPeriod === params.period &&
        ((rankingScope === 'group' && params.useGroupScope && selectedGroupId) ||
          (rankingScope === 'global' && !params.useGroupScope));

      if (!shouldHydrateCurrentView) {
        return previous;
      }

      const next: RankingRow[] = [...previous];
      const rowIndex = next.findIndex(
        (row) =>
          row.userId === userId &&
          row.period === params.period &&
          row.periodStart === periodStart &&
          row.periodEnd === periodEnd &&
          (row.groupId || null) === rankingGroupId,
      );

      const updatedRow: RankingRow = {
        id:
          rowIndex >= 0
            ? next[rowIndex].id
            : createLocalRankingId({
                userId,
                groupId: rankingGroupId,
                period: params.period,
                periodStart,
                periodEnd,
              }),
        userId,
        groupId: rankingGroupId,
        period: params.period,
        periodStart,
        periodEnd,
        totalPoints,
        rankPosition: null,
        updatedAt: new Date().toISOString(),
      };

      if (rowIndex >= 0) {
        next[rowIndex] = updatedRow;
      } else {
        next.push(updatedRow);
      }

      return next.sort((a, b) => Number(b.totalPoints) - Number(a.totalPoints));
    });

    if (params.showSuccessToast) {
      toast.success('Pontuação sincronizada no ranking!');
    }

    void fetchRanking();
  };

  const handleSyncWeeklyProgressAutomatically = async () => {
    if (!userId || !selectedChallengeId || !selectedChallenge) {
      toast.error('Selecione um desafio para sincronizar o progresso da semana.');
      return;
    }

    setSavingChallengeProgress(true);
    try {
      const safeWeeklyProgress = Math.max(0, Number.isFinite(weeklyStudiedMinutes) ? Math.round(weeklyStudiedMinutes) : 0);

      await socialChallengesService.upsertOwnProgress({
        challengeId: selectedChallengeId,
        userId,
        progress: safeWeeklyProgress,
        completed: safeWeeklyProgress >= selectedChallenge.goalValue,
      });

      await syncRankingForCurrentContext({
        period: 'weekly',
        useGroupScope: true,
        showSuccessToast: false,
      });

      setMyChallengeProgressInput(safeWeeklyProgress);
      toast.success(`Progresso semanal sincronizado: ${safeWeeklyProgress} min (ranking atualizado)`);
      void fetchChallengeParticipants(selectedChallengeId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao sincronizar progresso semanal.');
    } finally {
      setSavingChallengeProgress(false);
    }
  };

  const handleSyncMyRanking = async () => {
    setSyncingRanking(true);
    try {
      await syncRankingForCurrentContext({
        period: rankingPeriod,
        useGroupScope: rankingScope === 'group',
        showSuccessToast: true,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao sincronizar ranking.');
    } finally {
      setSyncingRanking(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Grupos de Estudo</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Crie grupos, entre com colegas e acompanhe discussões em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-3 sm:gap-4">
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
                    className={`rounded-xl border p-3 bg-slate-50/70 dark:bg-slate-800/30 shadow-sm transition ${
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

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 flex flex-col min-h-[430px] sm:min-h-[560px]">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePanel('chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  activePanel === 'chat'
                    ? 'text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
                style={activePanel === 'chat' ? { backgroundColor: 'var(--color-primary)' } : undefined}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('membros')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  activePanel === 'membros'
                    ? 'text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
                style={activePanel === 'membros' ? { backgroundColor: 'var(--color-primary)' } : undefined}
              >
                Membros
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('desafios')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  activePanel === 'desafios'
                    ? 'text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
                style={activePanel === 'desafios' ? { backgroundColor: 'var(--color-primary)' } : undefined}
              >
                Desafios
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('ranking')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  activePanel === 'ranking'
                    ? 'text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
                style={activePanel === 'ranking' ? { backgroundColor: 'var(--color-primary)' } : undefined}
              >
                Ranking
              </button>
            </div>

            {activePanel === 'chat' && (
              <>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {selectedGroup ? `Chat — ${selectedGroup.name}` : 'Chat do grupo'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedGroup
                    ? `Conectado como ${userName || 'Usuário'}. Mensagens em tempo real habilitadas.`
                    : 'Selecione um grupo para visualizar e enviar mensagens.'}
                </p>
              </>
            )}

            {activePanel === 'desafios' && (
              <>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {selectedGroup ? `Desafios — ${selectedGroup.name}` : 'Desafios do grupo'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Crie metas semanais, participe e atualize seu progresso.
                </p>
              </>
            )}

            {activePanel === 'membros' && (
              <>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {selectedGroup ? `Membros — ${selectedGroup.name}` : 'Membros do grupo'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Visualize quem já está no grupo e o papel de cada pessoa.
                </p>
              </>
            )}

            {activePanel === 'ranking' && (
              <>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Ranking Periódico
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Compare sua pontuação por período e escopo.
                </p>
              </>
            )}
          </div>

          {activePanel === 'chat' && (
            <>
              <div className="flex-1 min-h-[240px] max-h-[52vh] sm:min-h-0 sm:max-h-none overflow-y-auto overscroll-contain py-3 pr-1 -mr-1 space-y-2">
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
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {resolveAuthorLabel(message)} • {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>

                      {message.attachmentUrl && (
                        <a
                          href={message.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block mt-1 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                        >
                          <img
                            src={message.attachmentUrl}
                            alt="Anexo da mensagem"
                            className="w-full max-h-64 object-cover"
                            loading="lazy"
                          />
                        </a>
                      )}

                      {!(message.attachmentUrl && message.content === '[imagem]') && (
                        <p className="text-sm text-slate-800 dark:text-slate-100 mt-1 whitespace-pre-wrap">
                          {renderMentionText(message.content)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
                {attachedImagePreviewUrl && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={attachedImagePreviewUrl}
                        alt="Preview do anexo"
                        className="h-12 w-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        {attachedImageFile?.name || 'Imagem selecionada'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearAttachment}
                      className="p-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100"
                      title="Remover anexo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="relative">
                  {showMentionMenu && mentionSuggestions.length > 0 && (
                    <div className="absolute bottom-full mb-2 left-0 w-full sm:w-[320px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm z-10 overflow-hidden">
                      <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        Mencionar membro
                      </p>
                      <div className="max-h-56 overflow-y-auto">
                        {mentionSuggestions.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleSelectMention(member)}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                          >
                            @{extractFirstName(member.userName)}
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">{member.userName || member.userId.slice(0, 8)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePickAttachment}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={!selectedGroup || !userId || sendingMessage}
                      className="w-full sm:w-auto sm:shrink-0 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                    >
                      <Paperclip className="w-4 h-4" />
                      <span className="sm:hidden">Anexo</span>
                      <span className="hidden sm:inline">Anexar</span>
                    </button>

                    <div className="flex-1 flex gap-2 min-w-0">
                      <input
                        ref={messageInputRef}
                        value={messageInput}
                        onChange={handleMessageInputChange}
                        onClick={() => setShowMentionMenu(false)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !showMentionMenu) {
                            event.preventDefault();
                            void handleSendMessage();
                          }
                        }}
                        disabled={!selectedGroup || !userId || sendingMessage}
                        placeholder={selectedGroup ? 'Escreva uma mensagem... (use @ para mencionar)' : 'Selecione um grupo primeiro'}
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 shadow-sm outline-none focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setMessageInput((current) => `${current}@`);
                          requestAnimationFrame(() => {
                            messageInputRef.current?.focus();
                          });
                        }}
                        disabled={!selectedGroup || !userId || sendingMessage}
                        className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 sm:shrink-0"
                        title="Inserir menção"
                      >
                        <AtSign className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        void handleSendMessage();
                      }}
                      disabled={!selectedGroup || !userId || sendingMessage || (!messageInput.trim() && !attachedImageFile)}
                      className="w-full sm:w-auto sm:shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {sendingMessage ? (
                        'Enviando...'
                      ) : attachedImageFile ? (
                        <>
                          <ImageIcon className="w-4 h-4" />
                          Enviar
                        </>
                      ) : (
                        'Enviar'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activePanel === 'membros' && (
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {!selectedGroup ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Selecione um grupo para ver os membros.</p>
              ) : loadingMembers ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Carregando membros...</p>
              ) : groupMembers.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum membro encontrado neste grupo.</p>
              ) : (
                <>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/40">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Total de membros: <span className="font-semibold text-slate-800 dark:text-slate-100">{groupMembers.length}</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    {groupMembers.map((member) => (
                      <div
                        key={member.id}
                        className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-3 ${
                          userId && member.userId === userId
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {member.userName || `Usuário ${member.userId.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {member.userEmail || member.userId.slice(0, 8)} • entrou em {new Date(member.joinedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                            member.role === 'admin'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {member.role === 'admin' ? 'Admin' : 'Membro'}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activePanel === 'desafios' && (
            <div className="flex-1 overflow-y-auto py-3 space-y-4">
              {!selectedGroup ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Selecione um grupo para gerenciar desafios.</p>
              ) : (
                <>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Novo desafio</h4>
                    <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                      Meta semanal configurada: <span className="font-semibold text-slate-900 dark:text-slate-100">{Math.max(0, Math.round(weeklyGoalMinutes))} min</span>
                    </div>
                    <input
                      value={newChallengeName}
                      onChange={(event) => setNewChallengeName(event.target.value)}
                      placeholder="Ex.: 300 minutos de revisão"
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="number"
                        min={1}
                        value={newChallengeGoalValue}
                        onChange={(event) => setNewChallengeGoalValue(Number(event.target.value) || 0)}
                        className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                      />
                      <input
                        type="date"
                        value={newChallengeStartDate}
                        onChange={(event) => setNewChallengeStartDate(event.target.value)}
                        className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                      />
                      <input
                        type="date"
                        value={newChallengeEndDate}
                        onChange={(event) => setNewChallengeEndDate(event.target.value)}
                        className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void handleCreateChallenge();
                      }}
                      disabled={creatingChallenge || !userId}
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {creatingChallenge ? 'Criando desafio...' : 'Criar desafio'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleCreateAutomaticWeeklyChallenge();
                      }}
                      disabled={creatingChallenge || !userId}
                      className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 disabled:opacity-50"
                    >
                      Criar meta semanal automática
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-3">
                    <div className="space-y-2">
                      {loadingChallenges ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Carregando desafios...</p>
                      ) : challenges.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum desafio cadastrado neste grupo.</p>
                      ) : (
                        challenges.map((challenge) => (
                          <div
                            key={challenge.id}
                            className={`rounded-xl border p-3 ${
                              selectedChallengeId === challenge.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedChallengeId(challenge.id)}
                              className="w-full text-left"
                            >
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{challenge.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Meta: {challenge.goalValue} min • {formatDatePtBr(challenge.startDate)} até {formatDatePtBr(challenge.endDate)}
                              </p>
                            </button>

                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {challenge.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleJoinChallenge(challenge.id);
                                }}
                                disabled={joiningChallengeId === challenge.id || !userId}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 disabled:opacity-50"
                              >
                                {joiningChallengeId === challenge.id ? 'Entrando...' : 'Participar'}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Participantes
                      </h4>

                      {!selectedChallenge ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Selecione um desafio.</p>
                      ) : loadingParticipants ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Carregando participantes...</p>
                      ) : (
                        <>
                          <div className="space-y-2 max-h-56 overflow-y-auto">
                            {challengeParticipants.length === 0 ? (
                              <p className="text-sm text-slate-500 dark:text-slate-400">Sem participantes ainda.</p>
                            ) : (
                              challengeParticipants.map((participant, index) => (
                                <div
                                  key={participant.id}
                                  className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-2 flex items-center justify-between gap-2"
                                >
                                  <p className="text-xs text-slate-700 dark:text-slate-200">
                                    #{index + 1} {participant.userId.slice(0, 8)}
                                  </p>
                                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                    {participant.progress} min
                                  </p>
                                </div>
                              ))
                            )}
                          </div>

                          {userId && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                              <label className="text-xs text-slate-500 dark:text-slate-400">Seu progresso (minutos)</label>
                              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                                Progresso detectado nesta semana: <span className="font-semibold text-slate-900 dark:text-slate-100">{Math.max(0, Math.round(weeklyStudiedMinutes))} min</span>
                              </div>
                              <input
                                type="number"
                                min={0}
                                value={myChallengeProgressInput}
                                onChange={(event) => setMyChallengeProgressInput(Number(event.target.value) || 0)}
                                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  void handleSaveOwnChallengeProgress();
                                }}
                                disabled={savingChallengeProgress || !selectedChallengeId}
                                className="w-full px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                                style={{ backgroundColor: 'var(--color-primary)' }}
                              >
                                {savingChallengeProgress ? 'Salvando...' : 'Salvar progresso'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleSyncWeeklyProgressAutomatically();
                                }}
                                disabled={savingChallengeProgress || !selectedChallengeId}
                                className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 disabled:opacity-50"
                              >
                                Usar progresso automático da semana
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activePanel === 'ranking' && (
            <div className="flex-1 overflow-y-auto py-3 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={rankingPeriod}
                  onChange={(event) => setRankingPeriod(event.target.value as RankingPeriod)}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                >
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="global">Global</option>
                </select>

                <select
                  value={rankingScope}
                  onChange={(event) => setRankingScope(event.target.value as 'group' | 'global')}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                >
                  <option value="group">Por grupo</option>
                  <option value="global">Geral</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    void handleSyncMyRanking();
                  }}
                  disabled={!userId || syncingRanking || (rankingScope === 'group' && !selectedGroupId)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {syncingRanking ? 'Sincronizando...' : 'Sincronizar minha pontuação'}
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pontuação atual usada na sincronização: <span className="font-semibold text-slate-800 dark:text-slate-100">{Number(userTotalPoints || 0)} pts</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sua posição no ranking exibido: <span className="font-semibold text-slate-800 dark:text-slate-100">{myRankingPosition ? `#${myRankingPosition}` : 'fora do ranking'}</span>
                </p>
              </div>

              <div className="space-y-2">
                {loadingRanking ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Carregando ranking...</p>
                ) : rankingRows.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum dado de ranking para o período selecionado.</p>
                ) : (
                  rankingRows.map((row, index) => (
                    <div
                      key={row.id}
                      className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-3 ${
                        userId && row.userId === userId
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">#{index + 1} • {row.userId.slice(0, 8)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {row.periodStart} → {row.periodEnd}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{Number(row.totalPoints)} pts</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupsPage;
