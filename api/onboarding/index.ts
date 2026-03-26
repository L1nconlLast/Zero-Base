import {
  buildStarterRecommendation,
  ensureCoreUserRecords,
  getOnboardingStreak,
  getUserProfile,
  mergeOnboardingStreak,
  replaceActiveRecommendation,
  upsertUserProfile,
} from '../_lib/mvp.js';
import { resolveAuthUser, sendError, sendJson } from '../_lib/supabase.js';

const normalizeWeakestDisciplines = (input: unknown): string[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);
};

const hasOwn = (value: unknown, key: string): boolean =>
  Boolean(value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key));

const hasProfilePayload = (body: unknown): boolean =>
  ['examType', 'level', 'weeklyHours', 'preferredGoal', 'weakestDisciplines']
    .some((key) => hasOwn(body, key));

const hasStreakPayload = (body: unknown): boolean =>
  hasOwn(body, 'streakDays') || hasOwn(body, 'streakLastDay');

const serializeProfile = (profile: any) => (profile
  ? {
    examType: profile.exam_type,
    level: profile.level,
    weeklyHours: profile.weekly_hours,
    preferredGoal: profile.preferred_goal,
    weakestDisciplines: Array.isArray(profile.weakest_disciplines) ? profile.weakest_disciplines : [],
  }
  : null);

const serializeStreak = (streak: { streakDays: number; streakLastDay: string | null }) => ({
  days: streak.streakDays,
  lastDay: streak.streakLastDay,
});

export default async function handler(req: any, res: any): Promise<void> {
  const auth = await resolveAuthUser(req.headers.authorization);
  if (auth.ok === false) {
    sendError(res, auth.status, 'UNAUTHORIZED', auth.message);
    return;
  }

  try {
    await ensureCoreUserRecords(auth.user);

    if (req.method === 'GET') {
      const [profile, streak] = await Promise.all([
        getUserProfile(auth.user.id),
        getOnboardingStreak(auth.user.id),
      ]);

      sendJson(res, 200, {
        success: true,
        profile: serializeProfile(profile),
        streak: serializeStreak(streak),
      });
      return;
    }

    if (req.method !== 'POST') {
      sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
      return;
    }

    const wantsProfileUpdate = hasProfilePayload(req.body);
    const wantsStreakUpdate = hasStreakPayload(req.body);

    if (!wantsProfileUpdate && !wantsStreakUpdate) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Payload invalido para onboarding.');
      return;
    }

    let profile = wantsProfileUpdate ? null : await getUserProfile(auth.user.id);
    let recommendation: any = null;

    if (wantsProfileUpdate) {
      const examType = String(req.body?.examType || 'enem').trim().toLowerCase();
      const level = String(req.body?.level || '').trim().toLowerCase();
      const weeklyHours = Number(req.body?.weeklyHours ?? 0);
      const preferredGoal = String(req.body?.preferredGoal || '').trim() || 'aprovacao';
      const weakestDisciplines = normalizeWeakestDisciplines(req.body?.weakestDisciplines);

      if (examType !== 'enem') {
        sendError(res, 400, 'VALIDATION_ERROR', 'examType invalido para o MVP.');
        return;
      }

      if (!['iniciante', 'intermediario', 'avancado'].includes(level)) {
        sendError(res, 400, 'VALIDATION_ERROR', 'level invalido.');
        return;
      }

      if (!Number.isFinite(weeklyHours) || weeklyHours < 0 || weeklyHours > 168) {
        sendError(res, 400, 'VALIDATION_ERROR', 'weeklyHours invalido.');
        return;
      }

      profile = await upsertUserProfile(auth.user.id, {
        examType,
        level,
        weeklyHours,
        preferredGoal,
        weakestDisciplines,
      });

      const persistedWeakestDisciplines = Array.isArray(profile.weakest_disciplines)
        ? profile.weakest_disciplines
        : weakestDisciplines;

      const generated = buildStarterRecommendation({
        ...profile,
        weakest_disciplines: persistedWeakestDisciplines,
      });

      recommendation = await replaceActiveRecommendation(auth.user.id, generated);
    }

    const streak = wantsStreakUpdate
      ? await mergeOnboardingStreak(auth.user.id, {
        streakDays: req.body?.streakDays,
        streakLastDay: req.body?.streakLastDay,
      })
      : await getOnboardingStreak(auth.user.id);

    sendJson(res, 200, {
      success: true,
      profile: serializeProfile(profile),
      streak: serializeStreak(streak),
      ...(recommendation
        ? {
          initialRecommendation: {
            id: recommendation.id,
            disciplineSlug: recommendation.disciplineSlug,
            disciplineName: recommendation.disciplineName,
            topicSlug: recommendation.topicSlug,
            topicName: recommendation.topicName,
            reason: recommendation.reason,
            score: Number(recommendation.score || 0),
          },
        }
        : {}),
    });
  } catch (error: any) {
    sendError(res, 500, 'INTERNAL_ERROR', error?.message || 'Erro ao salvar onboarding.');
  }
}
