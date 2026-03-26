import { ensureCoreUserRecords, getOnboardingStreak } from '../_lib/mvp.js';
import { resolveAuthUser, sendError, sendJson } from '../_lib/supabase.js';

// Legacy compatibility wrapper. Prefer /api/onboarding.
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
    const streak = await getOnboardingStreak(auth.user.id);

    res.setHeader('X-ZeroBase-Legacy', 'deprecated; use /api/onboarding');
    sendJson(res, 200, {
      streakDays: streak.streakDays,
      streakLastDay: streak.streakLastDay,
    });
  } catch (error: any) {
    sendError(res, 500, 'INTERNAL_ERROR', error?.message || 'Erro ao carregar onboarding.');
  }
}
