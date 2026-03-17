import type { Request, Response } from 'express';
import { z } from 'zod';
import { rankingService, VALID_CATEGORIES } from '../services/ranking.service';
import type { RankingPeriod } from '../services/ranking.service';
import { logger } from '../services/logger.service';
import { sendError, sendInternalError, sendUnauthorized, sendValidationError } from '../utils/apiResponse';

// ── Schemas ──────────────────────────────────────────────────

const categoryEnum = z.enum(VALID_CATEGORIES as unknown as [string, ...string[]]);

const StartSessionSchema = z.object({
  category: categoryEnum,
  camera_on: z.boolean().optional().default(false),
});

const EndSessionSchema = z.object({
  started_at: z.string().datetime({ message: 'started_at deve ser ISO 8601.' }),
  ended_at:   z.string().datetime({ message: 'ended_at deve ser ISO 8601.' }),
  category:   categoryEnum,
  camera_on:  z.boolean().optional().default(false),
});

const VALID_PERIODS: RankingPeriod[] = ['daily', 'weekly', 'monthly'];

const RankingListQuerySchema = z.object({
  period:   z.enum(['daily', 'weekly', 'monthly']).optional().default('weekly'),
  category: categoryEnum.optional(),
  page:     z.coerce.number().int().min(1).optional().default(1),
  limit:    z.coerce.number().int().min(1).max(100).optional().default(50),
});

const RecalcBodySchema = z.object({
  period:   z.enum(['daily', 'weekly', 'monthly']),
  ref_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ── Helpers ───────────────────────────────────────────────────

const parseAuthUserId = (req: Request, res: Response): string | null => {
  const userId = req.auth?.userId;
  if (!userId) { sendUnauthorized(req, res); return null; }
  return userId;
};

const handleError = (req: Request, res: Response, err: unknown, msg: string): void => {
  logger.error(msg, err, { requestId: req.id, userId: req.auth?.userId, route: req.originalUrl });
  sendInternalError(req, res, msg);
};

// ── Controller ────────────────────────────────────────────────

async function startSession(req: Request, res: Response): Promise<void> {
  const userId = parseAuthUserId(req, res); if (!userId) return;

  const parsed = StartSessionSchema.safeParse(req.body);
  if (!parsed.success) { sendValidationError(req, res, parsed.error); return; }

  try {
    const result = await rankingService.startSession({
      userId,
      category:  parsed.data.category as never,
      cameraOn:  parsed.data.camera_on,
    });
    res.status(200).json({ ok: true, data: result, requestId: req.id });
  } catch (err) { handleError(req, res, err, 'ranking.startSession.error'); }
}

async function endSession(req: Request, res: Response): Promise<void> {
  const userId = parseAuthUserId(req, res); if (!userId) return;

  const parsed = EndSessionSchema.safeParse(req.body);
  if (!parsed.success) { sendValidationError(req, res, parsed.error); return; }

  const { started_at, ended_at } = parsed.data;
  if (new Date(ended_at) <= new Date(started_at)) {
    sendError(req, res, 400, 'VALIDATION_ERROR', 'ended_at deve ser posterior a started_at.');
    return;
  }

  try {
    const result = await rankingService.endSession({
      userId,
      startedAt: started_at,
      endedAt:   ended_at,
      category:  parsed.data.category as never,
      cameraOn:  parsed.data.camera_on,
    });
    res.status(200).json({ ok: true, data: result, requestId: req.id });
  } catch (err) { handleError(req, res, err, 'ranking.endSession.error'); }
}

async function getRanking(req: Request, res: Response): Promise<void> {
  const parsed = RankingListQuerySchema.safeParse(req.query);
  if (!parsed.success) { sendValidationError(req, res, parsed.error); return; }

  try {
    const results = await rankingService.getList({
      period:   parsed.data.period,
      category: parsed.data.category ?? null,
      page:     parsed.data.page,
      limit:    parsed.data.limit,
    });
    res.status(200).json({ ok: true, data: results, requestId: req.id });
  } catch (err) { handleError(req, res, err, 'ranking.getList.error'); }
}

async function getMyRanking(req: Request, res: Response): Promise<void> {
  const userId = parseAuthUserId(req, res); if (!userId) return;

  const period: RankingPeriod = VALID_PERIODS.includes(req.query.period as RankingPeriod)
    ? (req.query.period as RankingPeriod)
    : 'weekly';

  try {
    const result = await rankingService.getMe(userId, period);
    res.status(200).json({ ok: true, data: result, requestId: req.id });
  } catch (err) { handleError(req, res, err, 'ranking.getMe.error'); }
}

async function getNowStudying(req: Request, res: Response): Promise<void> {
  try {
    const count = await rankingService.getNowStudying();
    res.status(200).json({ ok: true, data: { now_studying: count }, requestId: req.id });
  } catch (err) { handleError(req, res, err, 'ranking.nowStudying.error'); }
}

async function recalculate(req: Request, res: Response): Promise<void> {
  // Protegido por WORKER_SECRET no middleware de rota
  const parsed = RecalcBodySchema.safeParse(req.body);
  if (!parsed.success) { sendValidationError(req, res, parsed.error); return; }

  try {
    const result = await rankingService.recalculate(parsed.data.period, parsed.data.ref_date);
    res.status(200).json({ ok: true, data: result, requestId: req.id });
  } catch (err) { handleError(req, res, err, 'ranking.recalculate.error'); }
}

export const rankingController = {
  startSession,
  endSession,
  getRanking,
  getMyRanking,
  getNowStudying,
  recalculate,
};
