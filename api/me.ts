import { ensureCoreUserRecords, getUserProfile } from './_lib/mvp';
import { resolveAuthUser, sendError, sendJson } from './_lib/supabase';

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

    sendJson(res, 200, {
      success: true,
      user: {
        id: auth.user.id,
        email: auth.user.email || '',
        name: auth.user.user_metadata?.name || auth.user.email?.split('@')[0] || 'Usuario',
      },
      onboardingCompleted: Boolean(profile),
      profile: profile
        ? {
          examType: profile.exam_type,
          level: profile.level,
          weeklyHours: profile.weekly_hours,
          preferredGoal: profile.preferred_goal,
          weakestDisciplines: Array.isArray(profile.weakest_disciplines) ? profile.weakest_disciplines : [],
        }
        : null,
    });
  } catch (error: any) {
    sendError(res, 500, 'INTERNAL_ERROR', error?.message || 'Erro ao carregar usuario.');
  }
}
