import { ensureCoreUserRecords, mergeOnboardingStreak } from '../_lib/mvp.js';
import { resolveAuthUser, sendError, sendJson } from '../_lib/supabase.js';

// Legacy compatibility wrapper. Prefer /api/onboarding.
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
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
    const streak = await mergeOnboardingStreak(auth.user.id, {
      streakDays: req.body?.streakDays,
      streakLastDay: req.body?.streakLastDay,
    });

    res.setHeader('X-ZeroBase-Legacy', 'deprecated; use /api/onboarding');
    sendJson(res, 200, {
      ok: true,
      streakDays: streak.streakDays,
      streakLastDay: streak.streakLastDay,
    });
  } catch (error: any) {
    sendError(res, 500, 'INTERNAL_ERROR', error?.message || 'Erro ao salvar onboarding.');
  }
}
