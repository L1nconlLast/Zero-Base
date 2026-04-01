import React from 'react';
import { BookOpen, Clock3, Flame, Layers3 } from 'lucide-react';
import { buildAchievementContext } from '../../services/achievementProgress.service';
import { buildProfileActivitySnapshot } from '../../services/profileActivity.service';
import { buildHomeReviewQueueState } from '../review';
import type { ProfileHeaderData, ProfilePageProps, ProfileStatCardData } from './types';
import { ProfileActivity } from './components/ProfileActivity';
import { ProfileContext } from './components/ProfileContext';
import { ProfileGoals } from './components/ProfileGoals';
import { ProfileHeader } from './components/ProfileHeader';
import { ProfileStats } from './components/ProfileStats';
import { ProfileStreak } from './components/ProfileStreak';
import { buildProfileActivityData } from './profileActivity';
import { buildProfileContextData } from './profileContext';
import { buildProfileGoalsData } from './profileGoals';
import { buildProfileStreakData } from './profileStreak';

const formatMinutesCompact = (minutes: number): string => {
  const safeMinutes = Math.max(0, minutes);
  if (safeMinutes >= 60) {
    const hours = safeMinutes / 60;
    const rounded = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', ',');
    return `${rounded}h`;
  }

  return `${safeMinutes} min`;
};

const formatCountLabel = (value: number, singular: string, plural: string): string =>
  `${value} ${value === 1 ? singular : plural}`;

const formatDayCount = (value: number): string =>
  formatCountLabel(value, 'dia', 'dias');

const formatExamLabel = (examGoal?: string, examDate?: string): string => {
  const safeGoal = String(examGoal || '').trim() || 'Plano ativo';
  if (!examDate) {
    return safeGoal;
  }

  const parsed = new Date(`${examDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return safeGoal;
  }

  return `${safeGoal} - prova em ${new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)}`;
};

const buildReviewDetail = (
  reviewState: ReturnType<typeof buildHomeReviewQueueState>,
): { detail: string; support: string } => {
  if (reviewState.status === 'pending_today') {
    return {
      detail: `${formatCountLabel(reviewState.dueTodayCount, 'pendencia', 'pendencias')} na fila de hoje`,
      support: reviewState.nextItem
        ? `Proxima da fila: ${reviewState.nextItem.title}`
        : 'A fila diaria segue ativa.',
    };
  }

  if (reviewState.status === 'completed_today') {
    return {
      detail: `${formatCountLabel(reviewState.completedTodayCount, 'revisao concluida', 'revisoes concluidas')} hoje`,
      support: reviewState.upcomingCount > 0 && reviewState.nextItem
        ? `Proxima janela: ${reviewState.nextItem.when}`
        : 'A fila de hoje foi resolvida.',
    };
  }

  if (reviewState.status === 'upcoming') {
    return {
      detail: reviewState.nextItem
        ? `Proxima janela em ${reviewState.nextItem.when.toLowerCase()}`
        : 'Sem item vencido agora',
      support: `${formatCountLabel(reviewState.upcomingCount, 'revisao futura', 'revisoes futuras')} ja programadas`,
    };
  }

  return {
    detail: 'Nenhuma pendencia aberta agora',
    support: 'Quando novas revisoes vencerem, elas aparecem aqui com o progresso do dia.',
  };
};

const resolveAvatarFallback = (
  displayName?: string,
  email?: string,
  profileAvatar?: string,
): string => {
  if (profileAvatar && profileAvatar.trim().length > 0) {
    return profileAvatar;
  }

  const baseLabel = String(displayName || email || 'U').trim();
  return baseLabel.charAt(0).toUpperCase() || 'U';
};

export const ProfilePage: React.FC<ProfilePageProps> = ({
  darkMode = false,
  displayName,
  email,
  profileAvatar,
  examGoal,
  examDate,
  weeklyGoalMinutes,
  syncStatusLabel,
  userData,
  sessions,
  scheduleEntries = [],
  onOpenSettings,
  profileContext = null,
  onReviewContext,
  referenceDate = new Date(),
}) => {
  const effectiveSessions = React.useMemo(() => {
    if (Array.isArray(sessions) && sessions.length > 0) {
      return sessions;
    }

    if (Array.isArray(userData.sessions) && userData.sessions.length > 0) {
      return userData.sessions;
    }

    return userData.studyHistory || [];
  }, [sessions, userData.sessions, userData.studyHistory]);

  const activity = React.useMemo(
    () => buildProfileActivitySnapshot(effectiveSessions, referenceDate),
    [effectiveSessions, referenceDate],
  );
  const streak = React.useMemo(
    () => buildProfileStreakData(effectiveSessions, scheduleEntries, referenceDate),
    [effectiveSessions, referenceDate, scheduleEntries],
  );
  const recentActivity = React.useMemo(
    () => buildProfileActivityData(effectiveSessions, scheduleEntries, referenceDate),
    [effectiveSessions, referenceDate, scheduleEntries],
  );
  const achievement = React.useMemo(
    () => buildAchievementContext(userData, { weeklyGoalMinutes, now: referenceDate }),
    [referenceDate, userData, weeklyGoalMinutes],
  );
  const goals = React.useMemo(
    () => buildProfileGoalsData(weeklyGoalMinutes, achievement.weeklyStudiedMinutes, referenceDate),
    [achievement.weeklyStudiedMinutes, referenceDate, weeklyGoalMinutes],
  );
  const reviewState = React.useMemo(
    () => buildHomeReviewQueueState(scheduleEntries, referenceDate),
    [referenceDate, scheduleEntries],
  );

  const totalReviewed = React.useMemo(
    () => scheduleEntries.filter((entry) => entry.studyType === 'revisao' && Boolean(entry.lastReviewedAt)).length,
    [scheduleEntries],
  );

  const reviewCopy = React.useMemo(
    () => buildReviewDetail(reviewState),
    [reviewState],
  );
  const trackContextData = React.useMemo(
    () => buildProfileContextData(profileContext),
    [profileContext],
  );

  const headerData = React.useMemo<ProfileHeaderData>(() => ({
    eyebrow: 'Perfil',
    title: displayName || 'Seu perfil',
    contextLine: formatExamLabel(examGoal, examDate),
    statusLine: `${formatCountLabel(activity.totalSessions, 'sessao concluida', 'sessoes concluidas')}, ${formatCountLabel(totalReviewed, 'revisao registrada', 'revisoes registradas')} e ${formatCountLabel(activity.daysWithActivity, 'dia com atividade', 'dias com atividade')} na base atual.`,
    avatarLabel: resolveAvatarFallback(displayName, email, profileAvatar),
    metrics: [
      { label: 'Nivel', value: `Nv. ${Math.max(userData.level || 1, 1)}` },
      { label: 'XP', value: `${Math.max(userData.totalPoints || 0, 0)} XP` },
      { label: 'Meta', value: `${achievement.weeklyStudiedMinutes}/${achievement.weeklyGoalMinutes} min` },
      { label: 'Sync', value: syncStatusLabel },
    ],
  }), [
    achievement.weeklyGoalMinutes,
    achievement.weeklyStudiedMinutes,
    activity.daysWithActivity,
    activity.totalSessions,
    displayName,
    email,
    examDate,
    examGoal,
    profileAvatar,
    syncStatusLabel,
    totalReviewed,
    userData.level,
    userData.totalPoints,
  ]);

  const statCards = React.useMemo<ProfileStatCardData[]>(() => [
    {
      id: 'streak',
      eyebrow: 'Ritmo atual',
      value: formatDayCount(Math.max(streak.currentStreak, 0)),
      detail: `Melhor sequencia: ${formatDayCount(Math.max(streak.bestStreak, streak.currentStreak))}`,
      support: `${streak.recentActiveCount} de 7 dias ativos na janela recente`,
      icon: Flame,
    },
    {
      id: 'time',
      eyebrow: 'Tempo acumulado',
      value: formatMinutesCompact(activity.totalMinutes),
      detail: `${activity.totalMinutes} min registrados na base atual`,
      support: `${formatCountLabel(activity.daysWithActivity, 'dia com atividade', 'dias com atividade')} no historico`,
      icon: Clock3,
    },
    {
      id: 'sessions',
      eyebrow: 'Sessoes concluidas',
      value: String(activity.totalSessions),
      detail: `${formatCountLabel(achievement.studyDaysLast7, 'dia de estudo recente', 'dias de estudo recentes')}`,
      support: `${achievement.weeklyStudiedMinutes}/${achievement.weeklyGoalMinutes} min da meta semanal`,
      icon: Layers3,
    },
    {
      id: 'reviews',
      eyebrow: 'Revisoes processadas',
      value: String(totalReviewed),
      detail: reviewCopy.detail,
      support: reviewCopy.support,
      icon: BookOpen,
    },
  ], [
    achievement.weeklyGoalMinutes,
    achievement.weeklyStudiedMinutes,
    activity.daysWithActivity,
    activity.totalMinutes,
    activity.totalSessions,
    reviewCopy.detail,
    reviewCopy.support,
    streak.bestStreak,
    streak.currentStreak,
    streak.recentActiveCount,
    totalReviewed,
  ]);

  return (
    <div data-testid="profile-page-layout" className="mx-auto max-w-[1160px] space-y-4 lg:space-y-5">
      <ProfileHeader
        darkMode={darkMode}
        data={headerData}
        email={email}
        avatarValue={profileAvatar}
        onOpenSettings={onOpenSettings}
      />

      {trackContextData ? (
        <ProfileContext
          darkMode={darkMode}
          data={trackContextData}
          onReviewContext={onReviewContext}
        />
      ) : null}

      <ProfileStats darkMode={darkMode} cards={statCards} />

      <ProfileStreak darkMode={darkMode} data={streak} />

      <ProfileGoals darkMode={darkMode} data={goals} />

      <ProfileActivity darkMode={darkMode} data={recentActivity} />
    </div>
  );
};

export default ProfilePage;
