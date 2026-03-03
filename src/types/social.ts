export type GroupRole = 'admin' | 'member';
export type ChallengeStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type RankingPeriod = 'global' | 'weekly' | 'monthly';

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

export interface GroupMessage {
  id: string;
  groupId: string;
  userId: string;
  content: string;
  attachmentUrl?: string | null;
  createdAt: string;
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
