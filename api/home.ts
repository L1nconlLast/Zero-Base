import {
  ensureCoreUserRecords,
  ensureRecommendationForUser,
  getRecommendationMeta,
  getUserProfile,
} from './_lib/mvp.js';
import { getHomeStudySummary } from './_lib/studySessions.js';
import { resolveAuthUser, sendError, sendJson } from './_lib/supabase.js';

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
    return;
  }

  const auth = await resolveAuthUser(req.headers.authorization);
  if (auth.ok === false) {
    sendError(res, auth.status, 'UNAUTHORIZED', auth.message);
    return;
  }

  try {
    await ensureCoreUserRecords(auth.user);

    const profile = await getUserProfile(auth.user.id);
    if (!profile) {
      sendError(res, 409, 'PROFILE_NOT_FOUND', 'Onboarding ainda nao concluido.');
      return;
    }

    const recommendation = await ensureRecommendationForUser(auth.user.id);
    if (!recommendation) {
      sendError(res, 404, 'RECOMMENDATION_NOT_FOUND', 'Recomendacao ainda nao disponivel.');
      return;
    }

    const goalMinutes = Math.max(0, Number(profile.weekly_hours || 0) * 60);
    const studySummary = await getHomeStudySummary(auth.user.id);
    const totalXp = Math.max(0, Number(studySummary.totalXp || 0));
    const weakestDiscipline = Array.isArray(profile.weakest_disciplines)
      ? String(profile.weakest_disciplines[0] || '')
      : '';
    const weakestMeta = getRecommendationMeta(weakestDiscipline || recommendation.subject, recommendation.topic);

    sendJson(res, 200, {
      success: true,
      user: {
        id: auth.user.id,
        name: auth.user.user_metadata?.name || auth.user.email?.split('@')[0] || 'Usuario',
        email: auth.user.email || '',
      },
      mission: {
        discipline: recommendation.disciplineName,
        topic: recommendation.topicName,
        reason: recommendation.reason,
        ctaLabel: studySummary.activeSession ? 'Continuar agora' : 'Comecar agora',
      },
      decision: {
        currentWeakPoint: weakestMeta.disciplineName,
        nextFocus: `${recommendation.disciplineName} - ${recommendation.topicName}`,
      },
      weeklyProgress: {
        studyMinutes: studySummary.studyMinutes,
        sessionsCompleted: studySummary.sessionsCompleted,
        goalMinutes,
      },
      gamification: {
        xp: totalXp,
        level: Math.max(1, Math.floor(totalXp / 50) + 1),
        streakDays: studySummary.streakDays,
      },
      lastSession: studySummary.lastSession,
      activeStudySession: studySummary.activeSession,
    });
  } catch (error: any) {
    sendError(res, 500, 'INTERNAL_ERROR', error?.message || 'Erro ao carregar home.');
  }
}
