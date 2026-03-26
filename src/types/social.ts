export type GroupRole = 'admin' | 'member';
export type ChallengeStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type RankingPeriod = 'global' | 'weekly' | 'monthly';
export type GroupActivityType =
  | 'review_completed'
  | 'study_started'
  | 'session_finished'
  | 'quiz_completed'
  | 'challenge_progress'
  | 'message_posted';
export type GroupAttachmentType = 'image' | 'file';

export interface StudyGroup {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  role: GroupRole;
  joinedAt: string;
}

export interface GroupMessageMention {
  id: string;
  messageId: string;
  mentionedUserId: string;
  createdAt: string;
}

export interface GroupMessageAttachment {
  id: string;
  messageId: string;
  type: GroupAttachmentType;
  url: string;
  fileName: string;
  mimeType: string;
  sizeInBytes: number;
  createdAt: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  userId: string;
  content: string;
  replyToMessageId?: string | null;
  mentions?: GroupMessageMention[];
  attachments?: GroupMessageAttachment[];
  attachmentUrl?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface GroupActivity {
  id: string;
  groupId: string;
  userId: string;
  type: GroupActivityType;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface DerivedGroupRankingRow {
  userId: string;
  groupId: string;
  totalScore: number;
  activityCount: number;
  lastActivityAt: string | null;
  rankPosition: number;
}

export interface GroupChallenge {
  id: string;
  groupId: string;
  name: string;
  goalType: string;
  goalValue: number;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  progress: number;
  completed: boolean;
  joinedAt: string;
}

export interface RankingRow {
  id: string;
  userId: string;
  groupId?: string | null;
  period: RankingPeriod;
  periodStart: string;
  periodEnd: string;
  totalPoints: number;
  rankPosition?: number | null;
  updatedAt: string;
}
