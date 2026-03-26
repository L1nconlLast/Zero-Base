import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowUpRight, AtSign, Clock3, Crown, Flame, Image as ImageIcon, Medal, MessageSquare, Paperclip, Play, Plus, Sparkles, Target, Trophy, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { rankingService } from '../../services/ranking.service';
import { socialChallengesService } from '../../services/socialChallenges.service';
import { socialGroupsService } from '../../services/socialGroups.service';
import { offlineSyncService } from '../../services/offlineSync.service';
import { isSupabaseConfigured, supabase } from '../../services/supabase.client';
import type {
  ChallengeParticipant,
  DerivedGroupRankingRow,
  GroupActivity,
  GroupChallenge,
  GroupMember,
  GroupMessage,
  GroupMessageAttachment,
  RankingPeriod,
  RankingRow,
  StudyGroup,
} from '../../types/social';

interface GroupsPageProps {
  userId?: string | null;
  userName?: string;
  userTotalPoints?: number;
  weeklyGoalMinutes?: number;
  weeklyStudiedMinutes?: number;
  onStartSession?: () => void;
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
const CHAT_ATTACHMENT_ACCEPT = 'image/*,.pdf,.doc,.docx,.txt,.ppt,.pptx';
const CHAT_ATTACHMENT_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif', 'heic', 'heif']);
const CHAT_ATTACHMENT_ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx']);
const MESSAGE_ATTACHMENT_PLACEHOLDERS = new Set(['[imagem]', '[anexo]']);

const extractFirstName = (value?: string | null) => {
  if (!value) return '';
  return value.trim().split(/\s+/)[0] || '';
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isSupportedChatAttachment = (file: File) => {
  if (file.type.startsWith('image/')) {
    return true;
  }

  const extension = (file.name.split('.').pop() || '').toLowerCase();
  return CHAT_ATTACHMENT_ALLOWED_EXTENSIONS.has(extension) || CHAT_ATTACHMENT_IMAGE_EXTENSIONS.has(extension);
};

const isImageAttachment = (mimeType?: string | null, url?: string | null) => {
  if (mimeType?.startsWith('image/')) {
    return true;
  }

  return Boolean(url && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url));
};

const formatFileSize = (sizeInBytes?: number | null) => {
  if (!sizeInBytes || sizeInBytes <= 0) {
    return null;
  }

  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getAttachmentNameFromUrl = (url: string) => {
  const lastSegment = url.split('/').pop() || 'anexo';
  const sanitized = lastSegment.split('?')[0] || lastSegment;

  try {
    return decodeURIComponent(sanitized);
  } catch {
    return sanitized;
  }
};

const getMessageAttachments = (message: GroupMessage): GroupMessageAttachment[] => {
  if (message.attachments?.length) {
    return message.attachments;
  }

  if (!message.attachmentUrl) {
    return [];
  }

  const fallbackIsImage = isImageAttachment(undefined, message.attachmentUrl);

  return [{
    id: `legacy-${message.id}`,
    messageId: message.id,
    type: fallbackIsImage ? 'image' : 'file',
    url: message.attachmentUrl,
    fileName: getAttachmentNameFromUrl(message.attachmentUrl),
    mimeType: fallbackIsImage ? 'image/*' : 'application/octet-stream',
    sizeInBytes: 0,
    createdAt: message.createdAt,
  }];
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

const formatRelativeTime = (value?: string | null) => {
  if (!value) {
    return 'agora';
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return 'agora';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return 'agora';
  }

  if (diffMinutes < 60) {
    return `há ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `há ${diffHours} h`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `há ${diffDays} d`;
  }

  return new Date(value).toLocaleDateString('pt-BR');
};

const getInitials = (value?: string | null) => {
  const parts = (value || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
};

const isRecentTimestamp = (value?: string | null, windowMinutes = 90) => {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= windowMinutes * 60 * 1000;
};

type ActivityPresentation = {
  actorName: string;
  action: string;
  label: string;
  icon: LucideIcon;
  badgeClassName: string;
  iconClassName: string;
};

type UserVisualTone = {
  avatarClassName: string;
  surfaceClassName: string;
  borderClassName: string;
  badgeClassName: string;
  progressClassName: string;
};

const USER_VISUAL_TONES: UserVisualTone[] = [
  {
    avatarClassName: 'bg-sky-500 text-white',
    surfaceClassName: 'bg-sky-50 dark:bg-sky-950/30',
    borderClassName: 'border-sky-200 dark:border-sky-800/70',
    badgeClassName: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    progressClassName: 'bg-[linear-gradient(90deg,#0ea5e9,#38bdf8)]',
  },
  {
    avatarClassName: 'bg-emerald-500 text-white',
    surfaceClassName: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderClassName: 'border-emerald-200 dark:border-emerald-800/70',
    badgeClassName: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    progressClassName: 'bg-[linear-gradient(90deg,#10b981,#34d399)]',
  },
  {
    avatarClassName: 'bg-fuchsia-500 text-white',
    surfaceClassName: 'bg-fuchsia-50 dark:bg-fuchsia-950/30',
    borderClassName: 'border-fuchsia-200 dark:border-fuchsia-800/70',
    badgeClassName: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
    progressClassName: 'bg-[linear-gradient(90deg,#d946ef,#f472b6)]',
  },
  {
    avatarClassName: 'bg-amber-500 text-white',
    surfaceClassName: 'bg-amber-50 dark:bg-amber-950/30',
    borderClassName: 'border-amber-200 dark:border-amber-800/70',
    badgeClassName: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    progressClassName: 'bg-[linear-gradient(90deg,#f59e0b,#f97316)]',
  },
  {
    avatarClassName: 'bg-rose-500 text-white',
    surfaceClassName: 'bg-rose-50 dark:bg-rose-950/30',
    borderClassName: 'border-rose-200 dark:border-rose-800/70',
    badgeClassName: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    progressClassName: 'bg-[linear-gradient(90deg,#f43f5e,#fb7185)]',
  },
  {
    avatarClassName: 'bg-violet-500 text-white',
    surfaceClassName: 'bg-violet-50 dark:bg-violet-950/30',
    borderClassName: 'border-violet-200 dark:border-violet-800/70',
    badgeClassName: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    progressClassName: 'bg-[linear-gradient(90deg,#8b5cf6,#a78bfa)]',
  },
];

const getSeedHash = (value?: string | null) => {
  const seed = (value || '').trim();
  return Array.from(seed).reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);
};

const getUserVisualTone = (value?: string | null): UserVisualTone =>
  USER_VISUAL_TONES[getSeedHash(value) % USER_VISUAL_TONES.length];

const GroupsPage: React.FC<GroupsPageProps> = ({
  userId,
  userName,
  userTotalPoints = 0,
  weeklyGoalMinutes = 900,
  weeklyStudiedMinutes = 0,
  onStartSession,
}) => {
  const [activePanel, setActivePanel] = useState<'overview' | 'chat' | 'membros' | 'desafios' | 'ranking'>('overview');
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [activityFeed, setActivityFeed] = useState<GroupActivity[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingActivityFeed, setLoadingActivityFeed] = useState(false);

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
  const [derivedRankingRows, setDerivedRankingRows] = useState<DerivedGroupRankingRow[]>([]);
  const [loadingDerivedRanking, setLoadingDerivedRanking] = useState(false);
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

  const selectedAttachmentIsImage = useMemo(
    () => Boolean(attachedImageFile && isImageAttachment(attachedImageFile.type, attachedImageFile.name)),
    [attachedImageFile],
  );

  const myRankingPosition = useMemo(() => {
    if (!userId) return null;
    const index = rankingScope === 'group'
      ? derivedRankingRows.findIndex((row) => row.userId === userId)
      : rankingRows.findIndex((row) => row.userId === userId);
    return index >= 0 ? index + 1 : null;
  }, [derivedRankingRows, rankingRows, rankingScope, userId]);

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

  const memberRoleByUserId = useMemo(() => {
    const map = new Map<string, GroupMember['role']>();
    groupMembers.forEach((member) => {
      map.set(member.userId, member.role);
    });
    return map;
  }, [groupMembers]);

  const recentMessages = useMemo(
    () => [...messages].slice(-3).reverse(),
    [messages],
  );

  const activityPreview = useMemo(
    () => activityFeed.slice(0, 6),
    [activityFeed],
  );

  const rankingPreview = useMemo(
    () => derivedRankingRows.slice(0, 5),
    [derivedRankingRows],
  );

  const rankingLeaderScore = useMemo(
    () => Math.max(0, Number(rankingPreview[0]?.totalScore || 0)),
    [rankingPreview],
  );

  const rankingTotalScore = useMemo(
    () => rankingPreview.reduce((total, row) => total + Math.max(0, Number(row.totalScore || 0)), 0),
    [rankingPreview],
  );

  const rankingTotalActivities = useMemo(
    () => rankingPreview.reduce((total, row) => total + Math.max(0, Number(row.activityCount || 0)), 0),
    [rankingPreview],
  );

  const recentlyActiveMemberIds = useMemo(
    () => [...new Set(activityFeed.filter((activity) => isRecentTimestamp(activity.createdAt)).map((activity) => activity.userId))],
    [activityFeed],
  );

  const recentlyActiveMembers = useMemo(
    () => recentlyActiveMemberIds
      .map((memberId) => memberNameById.get(memberId) || groupMembers.find((member) => member.userId === memberId)?.userName || 'Membro')
      .slice(0, 4),
    [groupMembers, memberNameById, recentlyActiveMemberIds],
  );

  const weeklyProgressPercentage = useMemo(() => {
    const safeGoal = Math.max(1, Number.isFinite(weeklyGoalMinutes) ? Math.round(weeklyGoalMinutes) : 900);
    const safeProgress = Math.max(0, Number.isFinite(weeklyStudiedMinutes) ? Math.round(weeklyStudiedMinutes) : 0);
    return Math.min(100, Math.round((safeProgress / safeGoal) * 100));
  }, [weeklyGoalMinutes, weeklyStudiedMinutes]);

  const livePulseCopy = useMemo(() => {
    if (recentlyActiveMembers.length > 1) {
      return `${recentlyActiveMembers.length} pessoas movimentaram o grupo recentemente.`;
    }

    if (recentlyActiveMembers.length === 1) {
      return `${recentlyActiveMembers[0]} puxou atividade recente no grupo.`;
    }

    if (activityFeed.length > 0) {
      return 'O grupo tem atividade recente e esta pronto para a proxima sessao.';
    }

    return 'Puxe a primeira sessao e ligue o ritmo do grupo.';
  }, [activityFeed.length, recentlyActiveMembers]);

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

  const fetchActivityFeed = useCallback(async (groupId: string) => {
    setLoadingActivityFeed(true);
    try {
      const data = await socialGroupsService.listActivityFeed(groupId, 20);
      setActivityFeed(data);
    } catch (error) {
      setActivityFeed([]);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar atividade do grupo.');
    } finally {
      setLoadingActivityFeed(false);
    }
  }, []);

  const fetchDerivedRanking = useCallback(async (groupId: string, period: RankingPeriod) => {
    setLoadingDerivedRanking(true);
    try {
      const { periodStart } = getRankingWindow(period);
      const data = await socialGroupsService.getDerivedRanking({
        groupId,
        since: period === 'global' ? undefined : `${periodStart}T00:00:00.000Z`,
        limit: 100,
      });
      setDerivedRankingRows(data);
    } catch (error) {
      setDerivedRankingRows([]);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar ranking do grupo.');
    } finally {
      setLoadingDerivedRanking(false);
    }
  }, []);

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
    if (rankingScope === 'group') {
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
        groupId: undefined,
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
      setActivityFeed([]);
      setChallenges([]);
      setDerivedRankingRows([]);
      setSelectedChallengeId(null);
      setChallengeParticipants([]);
      return;
    }

    void fetchMessages(selectedGroupId);
    void fetchGroupMembers(selectedGroupId);
    void fetchActivityFeed(selectedGroupId);
    void fetchChallenges(selectedGroupId);
  }, [fetchActivityFeed, fetchChallenges, selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) {
      setDerivedRankingRows([]);
      return;
    }

    void fetchDerivedRanking(selectedGroupId, rankingPeriod);
  }, [fetchDerivedRanking, rankingPeriod, selectedGroupId]);

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
                replyToMessageId: null,
                mentions: [],
                attachments: row.attachment_url
                  ? [{
                    id: `legacy-${row.id}`,
                    messageId: row.id,
                    type: isImageAttachment(undefined, row.attachment_url) ? 'image' : 'file',
                    url: row.attachment_url,
                    fileName: getAttachmentNameFromUrl(row.attachment_url),
                    mimeType: isImageAttachment(undefined, row.attachment_url) ? 'image/*' : 'application/octet-stream',
                    sizeInBytes: 0,
                    createdAt: row.created_at,
                  }]
                  : [],
                attachmentUrl: row.attachment_url,
                createdAt: row.created_at,
                updatedAt: null,
                deletedAt: null,
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
      .channel(`group-activities-${selectedGroupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_activities',
          filter: `group_id=eq.${selectedGroupId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            group_id: string;
            user_id: string;
            type: GroupActivity['type'];
            metadata: Record<string, unknown> | null;
            created_at: string;
          };

          setActivityFeed((previous) => {
            if (previous.some((item) => item.id === row.id)) {
              return previous;
            }

            return [{
              id: row.id,
              groupId: row.group_id,
              userId: row.user_id,
              type: row.type,
              metadata: row.metadata,
              createdAt: row.created_at,
            }, ...previous].slice(0, 20);
          });

          void fetchDerivedRanking(selectedGroupId, rankingPeriod);
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchDerivedRanking, rankingPeriod, selectedGroupId]);

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
    if (!userId || rankingScope !== 'global' || !isSupabaseConfigured || !supabase) {
      return;
    }

    const { periodStart, periodEnd } = getRankingWindow(rankingPeriod);
    const expectedGroupId = null;

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

  const resolveMemberDisplayName = useCallback((targetUserId: string) => {
    if (userId && targetUserId === userId) {
      return userName || 'VocÃª';
    }

    return memberNameById.get(targetUserId) || targetUserId.slice(0, 8);
  }, [memberNameById, userId, userName]);

  const describeActivity = useCallback((activity: GroupActivity) => {
    const actorName = userId && activity.userId === userId
      ? (userName || 'Você')
      : (memberNameById.get(activity.userId) || activity.userId.slice(0, 8));
    const metadata = activity.metadata || {};

    switch (activity.type) {
      case 'review_completed': {
        const cards = Math.max(1, Number(metadata.cards || metadata.count || 0));
        return `${actorName} revisou ${cards} cards`;
      }
      case 'study_started':
        return `${actorName} entrou em sessão`;
      case 'session_finished': {
        const minutes = Math.max(0, Number(metadata.minutes || 0));
        return minutes > 0
          ? `${actorName} concluiu uma sessão de ${minutes} min`
          : `${actorName} concluiu uma sessão`;
      }
      case 'quiz_completed': {
        const questions = Math.max(0, Number(metadata.questions || metadata.correctAnswers || 0));
        return questions > 0
          ? `${actorName} finalizou um quiz com ${questions} questões`
          : `${actorName} finalizou um quiz`;
      }
      case 'challenge_progress': {
        const challengeName = typeof metadata.challengeName === 'string' ? metadata.challengeName : 'o desafio';
        const progress = Math.max(0, Number(metadata.progress || 0));
        const goalValue = Math.max(0, Number(metadata.goalValue || 0));
        return goalValue > 0
          ? `${actorName} atualizou ${challengeName} para ${progress}/${goalValue} min`
          : `${actorName} atualizou ${challengeName}`;
      }
      case 'message_posted':
        return Boolean(metadata.hasAttachments)
          ? `${actorName} enviou uma mensagem com anexo`
          : `${actorName} enviou uma mensagem no chat`;
      default:
        return `${actorName} registrou atividade no grupo`;
    }
  }, [memberNameById, userId, userName]);

  const getActivityPresentation = useCallback((activity: GroupActivity): ActivityPresentation => {
    const actorName = userId && activity.userId === userId
      ? (userName || 'VocÃª')
      : (memberNameById.get(activity.userId) || activity.userId.slice(0, 8));
    const metadata = activity.metadata || {};

    switch (activity.type) {
      case 'review_completed': {
        const cards = Math.max(1, Number(metadata.cards || metadata.count || 0));
        return {
          actorName,
          action: `revisou ${cards} cards`,
          label: 'Revisao',
          icon: Activity,
          badgeClassName: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
          iconClassName: 'bg-sky-500 text-white',
        };
      }
      case 'study_started':
        return {
          actorName,
          action: 'entrou em sessao',
          label: 'Sessao',
          icon: Play,
          badgeClassName: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
          iconClassName: 'bg-emerald-500 text-white',
        };
      case 'session_finished': {
        const minutes = Math.max(0, Number(metadata.minutes || 0));
        return {
          actorName,
          action: minutes > 0 ? `concluiu uma sessao de ${minutes} min` : 'concluiu uma sessao',
          label: 'Foco',
          icon: Clock3,
          badgeClassName: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
          iconClassName: 'bg-emerald-500 text-white',
        };
      }
      case 'quiz_completed': {
        const questions = Math.max(0, Number(metadata.questions || metadata.correctAnswers || 0));
        return {
          actorName,
          action: questions > 0 ? `finalizou um quiz com ${questions} questoes` : 'finalizou um quiz',
          label: 'Quiz',
          icon: Sparkles,
          badgeClassName: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
          iconClassName: 'bg-fuchsia-500 text-white',
        };
      }
      case 'challenge_progress': {
        const challengeName = typeof metadata.challengeName === 'string' ? metadata.challengeName : 'o desafio';
        const progress = Math.max(0, Number(metadata.progress || 0));
        const goalValue = Math.max(0, Number(metadata.goalValue || 0));
        return {
          actorName,
          action: goalValue > 0
            ? `avancou em ${challengeName} para ${progress}/${goalValue} min`
            : `avancou em ${challengeName}`,
          label: 'Desafio',
          icon: Target,
          badgeClassName: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
          iconClassName: 'bg-amber-500 text-white',
        };
      }
      case 'message_posted':
        return {
          actorName,
          action: Boolean(metadata.hasAttachments) ? 'enviou material com anexo' : 'mandou uma mensagem no chat',
          label: 'Chat',
          icon: MessageSquare,
          badgeClassName: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          iconClassName: 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900',
        };
      default:
        return {
          actorName,
          action: 'registrou atividade no grupo',
          label: 'Atividade',
          icon: Flame,
          badgeClassName: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
          iconClassName: 'bg-rose-500 text-white',
        };
    }
  }, [memberNameById, userId, userName]);

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

    if (!isSupportedChatAttachment(file)) {
      toast.error('Envie imagem, PDF, DOC, DOCX, TXT, PPT ou PPTX.');
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
      return;
    }

    if (file.size > MAX_CHAT_ATTACHMENT_SIZE_BYTES) {
      toast.error('Anexo muito grande. Limite: 5MB.');
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
      return;
    }

    if (attachedImagePreviewUrl) {
      URL.revokeObjectURL(attachedImagePreviewUrl);
    }

    setAttachedImageFile(file);
    setAttachedImagePreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
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

    const mentionedUserIds = Array.from(new Set(
      groupMembers
        .filter((member) => {
          const firstName = extractFirstName(member.userName);
          if (!firstName) return false;
          const mentionPattern = new RegExp(`(^|\\s)@${escapeRegExp(firstName)}(?=\\s|$)`, 'i');
          return mentionPattern.test(trimmed);
        })
        .map((member) => member.userId),
    ));

    const uploadToastId = attachedImageFile ? toast.loading('Enviando anexo...') : null;
    setSendingMessage(true);
    try {
      let uploadedAttachment: Awaited<ReturnType<typeof socialGroupsService.uploadMessageAttachmentAsset>> | undefined;

      if (attachedImageFile) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('Para enviar anexo, conecte-se a internet e tente novamente.');
        }

        uploadedAttachment = await socialGroupsService.uploadMessageAttachmentAsset({
          file: attachedImageFile,
          groupId: selectedGroupId,
          userId,
        });

        if (uploadToastId) {
          toast.success('Anexo enviado com sucesso.', { id: uploadToastId });
        }
      }

      const sent = await socialGroupsService.sendMessage({
        groupId: selectedGroupId,
        userId,
        content: trimmed || '[anexo]',
        attachmentUrl: uploadedAttachment?.url,
        attachments: uploadedAttachment ? [uploadedAttachment] : undefined,
        mentionedUserIds,
      });

      setMessages((previous) => (
        previous.some((item) => item.id === sent.id)
          ? previous
          : [...previous, sent]
      ));

      if (!String(sent.id).startsWith('local-')) {
        void fetchActivityFeed(selectedGroupId);
        void fetchDerivedRanking(selectedGroupId, rankingPeriod);
      }

      if (String(sent.id).startsWith('local-')) {
        toast.success('Mensagem salva localmente e será sincronizada quando voltar a conexão.');
      }

      setMessageInput('');
      clearAttachment();
      setShowMentionMenu(false);
      setMentionQuery('');
    } catch (error) {
      if (uploadToastId) {
        toast.error(error instanceof Error ? error.message : 'Erro ao enviar anexo.', { id: uploadToastId });
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
    if (!userId || !selectedChallengeId || !selectedGroupId || !selectedChallenge) {
      return;
    }

    if (!Number.isFinite(myChallengeProgressInput) || myChallengeProgressInput < 0) {
      toast.error('Informe um progresso válido.');
      return;
    }

    const currentGoal = selectedChallenge.goalValue || 0;

    setSavingChallengeProgress(true);
    try {
      await socialChallengesService.upsertOwnProgress({
        challengeId: selectedChallengeId,
        userId,
        progress: myChallengeProgressInput,
        completed: currentGoal > 0 ? myChallengeProgressInput >= currentGoal : false,
      });

      try {
        await socialGroupsService.logActivity({
          groupId: selectedGroupId,
          userId,
          type: 'challenge_progress',
          metadata: {
            challengeName: selectedChallenge.name,
            progress: myChallengeProgressInput,
            goalValue: selectedChallenge.goalValue,
            source: 'manual',
          },
        });
      } catch {
        // O desafio continua funcionando mesmo se o feed ainda não estiver disponível.
      }

      void fetchActivityFeed(selectedGroupId);
      void fetchDerivedRanking(selectedGroupId, rankingPeriod);
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

    if (params.useGroupScope && selectedGroupId) {
      await fetchDerivedRanking(selectedGroupId, params.period);

      if (params.showSuccessToast) {
        toast.success('Ranking do grupo recalculado a partir da atividade recente.');
      }

      return;
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
    if (!userId || !selectedChallengeId || !selectedChallenge || !selectedGroupId) {
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

      try {
        await socialGroupsService.logActivity({
          groupId: selectedGroupId,
          userId,
          type: 'challenge_progress',
          metadata: {
            challengeName: selectedChallenge.name,
            progress: safeWeeklyProgress,
            goalValue: selectedChallenge.goalValue,
            source: 'weekly_sync',
          },
        });
      } catch {
        // Mantém o fluxo principal mesmo sem o feed de atividade.
      }

      await syncRankingForCurrentContext({
        period: rankingPeriod,
        useGroupScope: true,
        showSuccessToast: false,
      });

      void fetchActivityFeed(selectedGroupId);
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
    <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
      <div className="rounded-[30px] border border-slate-200/80 dark:border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.88))] p-5 sm:p-6 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5" />
              Accountability em grupo
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              Grupos de Estudo com foco em ritmo, nao em barulho.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              O centro da tela agora e execucao: sessao, atividade ao vivo, ranking derivado e chat como apoio para destravar colaboracao.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-full lg:min-w-[420px]">
            <div className="rounded-[22px] bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Grupos</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{groups.length}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">hubs ativos para accountability</p>
            </div>
            <div className="rounded-[22px] bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Ao vivo</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{activityFeed.length}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">sinais recentes no grupo atual</p>
            </div>
            <div className="rounded-[22px] bg-slate-950 text-white px-4 py-3 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.75)]">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Sua semana</p>
              <p className="mt-2 text-2xl font-semibold">{Math.max(0, Math.round(weeklyStudiedMinutes))} min</p>
              <p className="mt-1 text-xs text-slate-300">meta configurada: {Math.max(0, Math.round(weeklyGoalMinutes))} min</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[290px_minmax(0,1fr)] gap-4 sm:gap-5">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200/80 dark:border-slate-800 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,250,252,0.88))] dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.96),rgba(15,23,42,0.88))] p-4 sm:p-5 space-y-3 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.55)]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo grupo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Crie um hub enxuto para estudar com pressao boa, sinais claros de atividade e conversa em segundo plano.
            </p>
            <input
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Nome do grupo"
              className="w-full px-3 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm"
            />
            <input
              value={newGroupDescription}
              onChange={(event) => setNewGroupDescription(event.target.value)}
              placeholder="Descrição (opcional)"
              className="w-full px-3 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm"
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
              className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 shadow-[0_20px_36px_-24px_rgba(37,99,235,0.7)]"
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

          <div className="rounded-[28px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-4 sm:p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.55)]">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
              <Users className="w-4 h-4" /> Grupos disponíveis
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Escolha o grupo ativo e deixe a area central conduzir a sessao.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {groups.length} grupos
              </span>
            </div>

            {loadingGroups ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Carregando grupos...</p>
            ) : groups.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum grupo disponível ainda.</p>
            ) : (
              <div className="space-y-2.5">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={`rounded-[22px] p-3.5 transition ${
                      selectedGroupId === group.id
                        ? 'bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(224,231,255,0.82))] dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.95),rgba(30,64,175,0.22))] ring-1 ring-blue-400/60 shadow-[0_24px_50px_-34px_rgba(37,99,235,0.65)]'
                        : 'bg-slate-50/90 dark:bg-slate-800/45 ring-1 ring-slate-200 dark:ring-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{group.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {group.description || 'Sem descrição.'}
                          </p>
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-semibold shrink-0">
                          {getInitials(group.name)}
                        </div>
                      </div>
                    </button>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        {group.isPrivate ? 'Privado' : 'Público'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleJoinGroup(group.id)}
                        disabled={joiningGroupId === group.id || !userId}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 disabled:opacity-50"
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

        <div className="rounded-[30px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-3 sm:p-4 md:p-5 flex flex-col min-h-[430px] sm:min-h-[560px] shadow-[0_28px_80px_-42px_rgba(15,23,42,0.58)]">
          <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-slate-100/90 dark:bg-slate-800/85 p-1">
              <button
                type="button"
                onClick={() => setActivePanel('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${
                  activePanel === 'overview'
                    ? 'text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
                style={activePanel === 'overview' ? { backgroundColor: 'var(--color-primary)' } : undefined}
              >
                <Activity className="w-3.5 h-3.5" />
                Ao vivo
              </button>
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

            {activePanel === 'overview' && (
              <>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  {selectedGroup ? `Grupo em atividade - ${selectedGroup.name}` : 'Visão ao vivo do grupo'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Atividade primeiro, execução no centro e chat como apoio para colaboração.
                </p>
              </>
            )}

            {activePanel === 'chat' && (
              <>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {selectedGroup ? `Chat - ${selectedGroup.name}` : 'Chat do grupo'}
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
                  {selectedGroup ? `Desafios - ${selectedGroup.name}` : 'Desafios do grupo'}
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
                  {selectedGroup ? `Membros - ${selectedGroup.name}` : 'Membros do grupo'}
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

          {activePanel === 'overview' && (
            <div className="flex-1 overflow-y-auto py-4 sm:py-5 space-y-5">
              {!selectedGroup ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/35 p-6 sm:p-8 text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="mt-4 text-lg font-semibold text-slate-950 dark:text-slate-50">Escolha um grupo para ativar o hub</h4>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Quando um grupo estiver selecionado, a tela passa a priorizar sessao, sinais ao vivo e ranking derivado.
                  </p>
                </div>
              ) : (
                <>
                  <section className="rounded-[32px] border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,0.9))] p-5 sm:p-6 shadow-[0_32px_90px_-48px_rgba(15,23,42,0.55)]">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_340px] xl:items-start">
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-300">
                            <Flame className="w-3.5 h-3.5" />
                            Grupo ativo
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            {recentlyActiveMembers.length > 0 ? `${recentlyActiveMembers.length} em movimento` : 'Pronto para iniciar'}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-2xl sm:text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                            {selectedGroup.name}
                          </h4>
                          <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-600 dark:text-slate-300">
                            {selectedGroup.description || 'Hub do grupo para estudar com ritmo, accountability e sinais vivos de execucao.'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                          <span className="rounded-full bg-white/85 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {groupMembers.length} membros
                          </span>
                          <span className="rounded-full bg-white/85 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {messages.length} mensagens
                          </span>
                          <span className="rounded-full bg-white/85 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {activityFeed.length} sinais ao vivo
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="rounded-[22px] bg-white/80 dark:bg-slate-900/75 border border-slate-200/70 dark:border-slate-800 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Pulso</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{livePulseCopy}</p>
                          </div>
                          <div className="rounded-[22px] bg-white/80 dark:bg-slate-900/75 border border-slate-200/70 dark:border-slate-800 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Ranking</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {myRankingPosition ? `Voce esta em #${myRankingPosition}` : 'Sua posicao entra quando houver atividade'}
                            </p>
                          </div>
                          <div className="rounded-[22px] bg-white/80 dark:bg-slate-900/75 border border-slate-200/70 dark:border-slate-800 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Ultimo sinal</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {activityPreview[0] ? formatRelativeTime(activityPreview[0].createdAt) : 'Sem atividade ainda'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[28px] bg-slate-950 text-white p-5 sm:p-6 shadow-[0_28px_60px_-34px_rgba(15,23,42,0.8)]">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                          <Play className="w-3.5 h-3.5" />
                          Sessao agora
                        </span>
                        <h4 className="mt-4 text-2xl font-semibold tracking-tight">Entrar em sessao agora</h4>
                        <p className="mt-2 text-sm text-slate-300">
                          O grupo ganha ritmo quando alguem puxa a sessao. O timer continua sendo a acao central.
                        </p>

                        <div className="mt-5 rounded-[22px] bg-white/8 border border-white/10 px-4 py-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs uppercase tracking-[0.18em] text-slate-300">Semana</span>
                            <span className="text-sm font-semibold text-white">
                              {Math.max(0, Math.round(weeklyStudiedMinutes))}/{Math.max(0, Math.round(weeklyGoalMinutes))} min
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#22c55e)]"
                              style={{ width: `${weeklyProgressPercentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-300">{weeklyProgressPercentage}% da meta semanal ja convertida em estudo.</p>
                        </div>

                        <div className="mt-5 flex flex-col gap-2.5">
                          <button
                            type="button"
                            onClick={onStartSession}
                            disabled={!onStartSession}
                            className="w-full px-4 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-[0_22px_40px_-26px_rgba(59,130,246,0.8)]"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                          >
                            <Play className="w-4 h-4" />
                            Entrar em sessao agora
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setActivePanel('chat')}
                            className="w-full px-4 py-3 rounded-2xl text-sm font-semibold text-white bg-white/10 border border-white/10 inline-flex items-center justify-center gap-2"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Abrir chat
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_300px] gap-4">
                    <section className="rounded-[28px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-4 sm:p-5 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.48)]">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center justify-center">
                          <Clock3 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-950 dark:text-slate-50">Sessao agora</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Estado atual do grupo e seu ritmo semanal.</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-[24px] bg-slate-950 text-white px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Status</p>
                        <p className="mt-2 text-lg font-semibold">
                          {activityPreview[0] ? 'Grupo aquecido para a proxima sessao' : 'Pronto para acender o ritmo'}
                        </p>
                        <p className="mt-2 text-sm text-slate-300">{livePulseCopy}</p>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="rounded-[24px] bg-[linear-gradient(135deg,#fff7ed,#ffedd5)] dark:bg-[linear-gradient(135deg,rgba(124,45,18,0.48),rgba(154,52,18,0.32))] border border-amber-200/80 dark:border-amber-800/60 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Tempo acumulado</span>
                            <span className="rounded-full bg-white/80 dark:bg-slate-950/40 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-200">
                              {weeklyProgressPercentage}% da meta
                            </span>
                          </div>
                          <div className="mt-3 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                                {Math.max(0, Math.round(weeklyStudiedMinutes))} min
                              </p>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                contra {Math.max(0, Math.round(weeklyGoalMinutes))} min de alvo semanal
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-amber-700 dark:text-amber-200">
                              +{Math.max(0, Math.round(weeklyGoalMinutes - weeklyStudiedMinutes))} min para fechar
                            </span>
                          </div>
                          <div className="mt-4 h-3.5 rounded-full bg-white/80 dark:bg-slate-950/40 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,#f97316,#fb923c,#facc15)] shadow-[0_10px_20px_-12px_rgba(249,115,22,0.85)]"
                              style={{ width: `${weeklyProgressPercentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-[22px] bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border border-slate-200/80 dark:border-slate-700">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Posicao</p>
                            <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-50">
                              {myRankingPosition ? `#${myRankingPosition}` : '--'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">no ranking derivado do grupo</p>
                          </div>
                          <div className="rounded-[22px] bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border border-slate-200/80 dark:border-slate-700">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Movimentos</p>
                            <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-50">{rankingTotalActivities}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">sinais acumulados na disputa</p>
                          </div>
                        </div>

                        <div className="rounded-[22px] bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border border-slate-200/80 dark:border-slate-700">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Quem puxou movimento</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {recentlyActiveMembers.length > 0 ? recentlyActiveMembers.map((member) => {
                              const tone = getUserVisualTone(member);

                              return (
                                <span
                                  key={member}
                                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${tone.surfaceClassName} ${tone.borderClassName} text-slate-700 dark:text-slate-100`}
                                >
                                  <span className={`h-6 w-6 rounded-full ${tone.avatarClassName} flex items-center justify-center text-[10px]`}>
                                    {getInitials(member)}
                                  </span>
                                  {member}
                                </span>
                              );
                            }) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400">Ainda ninguem gerou sinal recente. Puxe a sessao.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-4 sm:p-5 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.5)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
                            <Flame className="w-3.5 h-3.5" />
                            Ao vivo
                          </div>
                          <h4 className="mt-3 text-lg font-semibold text-slate-950 dark:text-slate-50">Atividade ao vivo</h4>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Menos bloco morto, mais sinais recentes do que esta acontecendo no grupo.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActivePanel('chat')}
                          className="px-3 py-2 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        >
                          Abrir chat
                        </button>
                      </div>

                      {loadingActivityFeed ? (
                        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Carregando atividade...</p>
                      ) : activityPreview.length === 0 ? (
                        <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/35 p-5 text-sm text-slate-500 dark:text-slate-400">
                          Ainda nao ha sinais no feed. Mensagens com anexo, sessoes e progresso de desafio passam a preencher esse bloco automaticamente.
                        </div>
                      ) : (
                        <div className="mt-5 space-y-4">
                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="rounded-[20px] bg-slate-50 dark:bg-slate-800/45 border border-slate-200/80 dark:border-slate-700 px-3 py-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Impacto</p>
                              <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">{Math.round(rankingTotalScore)}</p>
                              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">pts acumulados</p>
                            </div>
                            <div className="rounded-[20px] bg-slate-50 dark:bg-slate-800/45 border border-slate-200/80 dark:border-slate-700 px-3 py-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Lider</p>
                              <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">{Math.round(rankingLeaderScore)}</p>
                              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">pts no topo</p>
                            </div>
                            <div className="rounded-[20px] bg-slate-50 dark:bg-slate-800/45 border border-slate-200/80 dark:border-slate-700 px-3 py-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Seu posto</p>
                              <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">{myRankingPosition ? `#${myRankingPosition}` : '--'}</p>
                              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">na corrida</p>
                            </div>
                          </div>
                          {activityPreview.map((activity) => {
                            const presentation = getActivityPresentation(activity);
                            const Icon = presentation.icon;
                            const tone = getUserVisualTone(activity.userId);
                            const roleLabel = userId && activity.userId === userId
                              ? 'Voce'
                              : memberRoleByUserId.get(activity.userId) === 'admin'
                                ? 'Admin'
                                : 'Membro';
                            const momentumWidth = isRecentTimestamp(activity.createdAt, 15)
                              ? 94
                              : isRecentTimestamp(activity.createdAt, 60)
                                ? 76
                                : 58;

                            return (
                              <div
                                key={activity.id}
                                className={`rounded-[26px] border px-4 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] ${tone.surfaceClassName} ${tone.borderClassName}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="relative shrink-0">
                                    <div className={`h-12 w-12 rounded-2xl ${tone.avatarClassName} flex items-center justify-center text-sm font-semibold shadow-[0_14px_26px_-18px_rgba(15,23,42,0.55)]`}>
                                      {getInitials(presentation.actorName)}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 h-7 w-7 rounded-full ${presentation.iconClassName} flex items-center justify-center shadow-lg`}>
                                      <Icon className="w-3.5 h-3.5" />
                                    </div>
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{presentation.actorName}</p>
                                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${presentation.badgeClassName}`}>
                                        {presentation.label}
                                      </span>
                                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.badgeClassName}`}>
                                        {roleLabel}
                                      </span>
                                      <span className="rounded-full bg-white/80 dark:bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                        {formatRelativeTime(activity.createdAt)}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-[15px] font-medium text-slate-800 dark:text-slate-100">{presentation.action}</p>
                                    <div className="mt-3 h-2.5 rounded-full bg-white/70 dark:bg-slate-900/55 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${tone.progressClassName}`}
                                        style={{ width: `${momentumWidth}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    <section className="rounded-[28px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-4 sm:p-5 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.48)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
                            <Medal className="w-3.5 h-3.5" />
                            Ranking
                          </div>
                          <h4 className="mt-3 text-lg font-semibold text-slate-950 dark:text-slate-50">Ranking por atividade</h4>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Competicao leve, derivada do que o grupo realmente fez.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActivePanel('ranking')}
                          className="px-3 py-2 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        >
                          Ver ranking
                        </button>
                      </div>

                      {loadingDerivedRanking ? (
                        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Calculando ranking...</p>
                      ) : rankingPreview.length === 0 ? (
                        <div className="mt-5 rounded-[24px] bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 p-5 text-sm text-slate-500 dark:text-slate-400">
                          Ainda nao ha atividade suficiente para ordenar o grupo.
                        </div>
                      ) : (
                        <div className="mt-5 space-y-3">
                          <div className="rounded-[26px] border border-slate-800 bg-[linear-gradient(135deg,#111827,#0f172a)] text-white p-4 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.7)]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-400/20 text-amber-100 border border-amber-300/30">
                                <Crown className="w-3.5 h-3.5" />
                                Ouro
                              </span>
                              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Lider agora</span>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                              <div className="h-12 w-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-sm font-semibold shadow-[0_16px_28px_-18px_rgba(245,158,11,0.8)]">
                                {getInitials(memberNameById.get(rankingPreview[0].userId) || rankingPreview[0].userId.slice(0, 8))}
                              </div>
                              <div className="min-w-0">
                                <p className="text-base font-semibold truncate">
                                  #{rankingPreview[0].rankPosition} {memberNameById.get(rankingPreview[0].userId) || rankingPreview[0].userId.slice(0, 8)}
                                </p>
                                <p className="text-xs text-slate-300">
                                  {rankingPreview[0].activityCount} atividades • {formatRelativeTime(rankingPreview[0].lastActivityAt)}
                                </p>
                              </div>
                            </div>
                            <p className="mt-4 text-3xl font-semibold tracking-tight">{Math.round(rankingPreview[0].totalScore)} pts</p>
                            <div className="mt-4 h-3 rounded-full bg-white/15 overflow-hidden">
                              <div className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#facc15)]" style={{ width: '100%' }} />
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            {rankingPreview.slice(1).map((row) => {
                              const memberLabel = memberNameById.get(row.userId) || row.userId.slice(0, 8);
                              const tone = getUserVisualTone(row.userId);
                              const hasMedal = row.rankPosition <= 3;
                              const medalLabel = row.rankPosition === 2 ? 'Prata' : row.rankPosition === 3 ? 'Bronze' : 'Ritmo forte';
                              const progressPercentage = rankingLeaderScore > 0
                                ? Math.max(14, Math.round((Number(row.totalScore) / rankingLeaderScore) * 100))
                                : 0;

                              return (
                                <div
                                  key={row.userId}
                                  className={`rounded-[24px] px-3.5 py-3.5 border shadow-[0_18px_40px_-34px_rgba(15,23,42,0.4)] ${
                                    userId && row.userId === userId
                                      ? 'border-blue-400/70 bg-blue-50 dark:bg-blue-900/20'
                                      : `${tone.borderClassName} ${tone.surfaceClassName}`
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex items-center gap-3">
                                      <div className={`h-11 w-11 rounded-2xl ${tone.avatarClassName} flex items-center justify-center text-xs font-semibold shrink-0`}>
                                      {getInitials(memberLabel)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                        #{row.rankPosition} {memberLabel}
                                      </p>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {row.activityCount} atividades • {formatRelativeTime(row.lastActivityAt)}
                                      </p>
                                    </div>
                                  </div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 shrink-0">{Math.round(row.totalScore)} pts</p>
                                  </div>
                                  <div className="mt-3 h-3 rounded-full bg-white/70 dark:bg-slate-900/50 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${hasMedal ? (row.rankPosition === 2 ? 'bg-[linear-gradient(90deg,#cbd5e1,#94a3b8)]' : 'bg-[linear-gradient(90deg,#f97316,#fb923c)]') : tone.progressClassName}`}
                                      style={{ width: `${progressPercentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </section>
                  </div>

                  <section className="rounded-[28px] border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/25 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Chat em apoio
                        </div>
                        <h4 className="mt-3 text-lg font-semibold text-slate-950 dark:text-slate-50">Colaboracao sem virar o centro da tela</h4>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Menções, anexos e mensagens continuam acessiveis, mas sem disputar protagonismo com a execucao.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActivePanel('chat')}
                        className="px-3 py-2 rounded-full text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      >
                        Abrir chat
                      </button>
                    </div>

                    {recentMessages.length === 0 ? (
                      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Nenhuma mensagem recente neste grupo.</p>
                    ) : (
                      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                        {recentMessages.map((message) => {
                          const attachments = getMessageAttachments(message);
                          const authorLabel = resolveAuthorLabel(message);

                          return (
                            <div
                              key={message.id}
                              className="rounded-[24px] bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700 px-4 py-4"
                            >
                              <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-semibold shrink-0">
                                  {getInitials(authorLabel)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{authorLabel}</p>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatRelativeTime(message.createdAt)}</span>
                                  </div>
                                  <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200 line-clamp-3">{message.content}</p>
                                  {attachments.length > 0 && (
                                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                      <Paperclip className="w-3.5 h-3.5" />
                                      {attachments.length} anexo{attachments.length > 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}

          {activePanel === 'overview' && false && (
            <div className="flex-1 overflow-y-auto py-3 space-y-4">
              {!selectedGroup ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Selecione um grupo para acompanhar a atividade.</p>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Grupo ativo</p>
                    <h4 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedGroup?.name}</h4>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {selectedGroup?.description || 'Use este espaço para acompanhar atividade, cobrar execução e coordenar o estudo em grupo.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="rounded-full bg-white/80 dark:bg-slate-800 px-2.5 py-1 border border-slate-200 dark:border-slate-700">
                        {groupMembers.length} membros
                      </span>
                      <span className="rounded-full bg-white/80 dark:bg-slate-800 px-2.5 py-1 border border-slate-200 dark:border-slate-700">
                        {messages.length} mensagens
                      </span>
                      <span className="rounded-full bg-white/80 dark:bg-slate-800 px-2.5 py-1 border border-slate-200 dark:border-slate-700">
                        {activityFeed.length} atividades recentes
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] gap-4">
                    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Atividade ao vivo</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            O grupo gira em torno da execução. O chat entra como suporte.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActivePanel('chat')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        >
                          Abrir chat
                        </button>
                      </div>

                      {loadingActivityFeed ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Carregando atividade...</p>
                      ) : activityFeed.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400">
                          Ainda não há atividade derivada para este grupo. Mensagens e progresso de desafio começam a preencher este feed automaticamente.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activityFeed.slice(0, 6).map((activity) => (
                            <div
                              key={activity.id}
                              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2"
                            >
                              <p className="text-sm text-slate-800 dark:text-slate-100">{describeActivity(activity)}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                {formatRelativeTime(activity.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <div className="space-y-4">
                      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/40">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Entrar em sessão agora</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          O grupo faz accountability. A execução acontece no timer.
                        </p>
                        <button
                          type="button"
                          onClick={onStartSession}
                          disabled={!onStartSession}
                          className="mt-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                          <Play className="w-4 h-4" />
                          Entrar em sessão agora
                        </button>
                      </section>

                      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ranking por atividade</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              O grupo se ordena pelo que foi feito, não só pela conversa.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActivePanel('ranking')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          >
                            Ver ranking
                          </button>
                        </div>

                        {loadingDerivedRanking ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">Calculando ranking...</p>
                        ) : derivedRankingRows.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">Sem atividade suficiente para gerar ranking ainda.</p>
                        ) : (
                          <div className="space-y-2">
                            {derivedRankingRows.slice(0, 5).map((row) => (
                              <div
                                key={row.userId}
                                className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-3 ${
                                  userId && row.userId === userId
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    #{row.rankPosition} {memberNameById.get(row.userId) || row.userId.slice(0, 8)}
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {row.activityCount} atividades • {formatRelativeTime(row.lastActivityAt)}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{Math.round(row.totalScore)} pts</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>

                      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Chat secundário</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Menções e anexos entram para destravar colaboração sem roubar o foco do grupo.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActivePanel('chat')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          >
                            Abrir chat
                          </button>
                        </div>

                        {recentMessages.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma mensagem recente neste grupo.</p>
                        ) : (
                          <div className="space-y-2">
                            {recentMessages.map((message) => (
                              <div key={message.id} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {resolveAuthorLabel(message)} • {formatRelativeTime(message.createdAt)}
                                </p>
                                <p className="text-sm text-slate-800 dark:text-slate-100 mt-1 line-clamp-2">
                                  {message.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

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
                  messages.map((message) => {
                    const attachments = getMessageAttachments(message);
                    const isAttachmentOnlyMessage = attachments.length > 0
                      && MESSAGE_ATTACHMENT_PLACEHOLDERS.has(message.content.trim().toLowerCase());

                    return (
                    <div
                      key={message.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2"
                    >
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {resolveAuthorLabel(message)} • {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>

                      {attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {attachments.map((attachment) => (
                            isImageAttachment(attachment.mimeType, attachment.url) ? (
                              <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                              >
                                <img
                                  src={attachment.url}
                                  alt={attachment.fileName || 'Imagem anexada'}
                                  className="w-full max-h-64 object-cover"
                                  loading="lazy"
                                />
                              </a>
                            ) : (
                              <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-3 py-2"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                                    <Paperclip className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                                      {attachment.fileName || 'Arquivo anexado'}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                      {[attachment.mimeType, formatFileSize(attachment.sizeInBytes)].filter(Boolean).join(' • ') || 'Arquivo'}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-300 shrink-0">
                                  Abrir
                                </span>
                              </a>
                            )
                          ))}
                        </div>
                      )}

                      {!isAttachmentOnlyMessage && (
                        <p className="text-sm text-slate-800 dark:text-slate-100 mt-1 whitespace-pre-wrap">
                          {renderMentionText(message.content)}
                        </p>
                      )}
                    </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
                {attachedImageFile && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {selectedAttachmentIsImage && attachedImagePreviewUrl ? (
                        <img
                          src={attachedImagePreviewUrl}
                          alt="Preview do anexo"
                          className="h-12 w-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                          <Paperclip className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                          {attachedImageFile.name || 'Anexo selecionado'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {[selectedAttachmentIsImage ? 'Imagem' : 'Arquivo', formatFileSize(attachedImageFile.size)].filter(Boolean).join(' • ')}
                        </p>
                      </div>
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
                      accept={CHAT_ATTACHMENT_ACCEPT}
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
                          {selectedAttachmentIsImage ? <ImageIcon className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
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

                {rankingScope === 'global' && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleSyncMyRanking();
                    }}
                    disabled={!userId || syncingRanking}
                    className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {syncingRanking ? 'Sincronizando...' : 'Sincronizar minha pontuação'}
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                {rankingScope === 'group' ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ranking derivado automaticamente da atividade registrada no grupo selecionado.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pontuação atual usada na sincronização: <span className="font-semibold text-slate-800 dark:text-slate-100">{Number(userTotalPoints || 0)} pts</span>
                  </p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sua posição no ranking exibido: <span className="font-semibold text-slate-800 dark:text-slate-100">{myRankingPosition ? `#${myRankingPosition}` : 'fora do ranking'}</span>
                </p>
              </div>

              <div className="space-y-2">
                {rankingScope === 'group' ? (
                  loadingDerivedRanking ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Calculando ranking do grupo...</p>
                  ) : !selectedGroupId ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Selecione um grupo para ver o ranking derivado.</p>
                  ) : derivedRankingRows.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma atividade suficiente para gerar ranking neste período.</p>
                  ) : (
                    derivedRankingRows.map((row) => (
                      <div
                        key={row.userId}
                        className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-3 ${
                          userId && row.userId === userId
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            #{row.rankPosition} • {memberNameById.get(row.userId) || row.userId.slice(0, 8)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {row.activityCount} atividades • última atividade {formatRelativeTime(row.lastActivityAt)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{Math.round(row.totalScore)} pts</p>
                      </div>
                    ))
                  )
                ) : loadingRanking ? (
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
