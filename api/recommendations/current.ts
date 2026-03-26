import { ensureCoreUserRecords, ensureRecommendationForUser } from '../_lib/mvp.js';
import { resolveAuthUser, sendError, sendJson } from '../_lib/supabase.js';

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
    const recommendation = await ensureRecommendationForUser(auth.user.id);

    if (!recommendation) {
      sendError(res, 404, 'RECOMMENDATION_NOT_FOUND', 'Recomendacao ainda nao disponivel.');
      return;
    }

    sendJson(res, 200, {
      success: true,
      recommendation: {
        id: recommendation.id,
        disciplineSlug: recommendation.disciplineSlug,
        disciplineName: recommendation.disciplineName,
        topicSlug: recommendation.topicSlug,
        topicName: recommendation.topicName,
        reason: recommendation.reason,
        score: Number(recommendation.score || 0),
        generatedAt: recommendation.generated_at || recommendation.created_at,
        decisionType: recommendation.decision_type || null,
        decisionContext: recommendation.decision_context || null,
        sourceSessionId: recommendation.source_session_id || null,
      },
    });
  } catch (error: any) {
    sendError(res, 500, 'INTERNAL_ERROR', error?.message || 'Erro ao carregar recomendacao.');
  }
}
