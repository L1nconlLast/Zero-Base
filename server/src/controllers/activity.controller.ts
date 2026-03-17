import type { Request, Response } from 'express';
import { z } from 'zod';
import { activityService } from '../services/activity.service';
import { logger } from '../services/logger.service';
import { sendError, sendInternalError, sendUnauthorized, sendValidationError } from '../utils/apiResponse';

const UuidSchema = z.string().uuid();

const TrackActivitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  minutesStudied: z.coerce.number().int().min(0).max(24 * 60).optional(),
  sessionsCount: z.coerce.number().int().min(0).max(100).optional(),
  loginCount: z.coerce.number().int().min(0).max(100).optional(),
});

const handleError = (req: Request, res: Response, error: unknown, message: string): void => {
  logger.error(message, error, { requestId: req.id, userId: req.auth?.userId, route: req.originalUrl });
  sendInternalError(req, res, message);
};

const parseUserId = (req: Request, res: Response): string | null => {
  const userId = req.auth?.userId;
  if (!userId) {
    sendUnauthorized(req, res);
    return null;
  }

  const parsed = UuidSchema.safeParse(userId);
  if (!parsed.success) {
    sendError(req, res, 400, 'INVALID_USER', 'Usuario invalido para atividade.');
    return null;
  }

  return parsed.data;
};

class ActivityController {
  async track(req: Request, res: Response): Promise<void> {
    const userId = parseUserId(req, res);
    if (!userId) return;

    const parsedBody = TrackActivitySchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      sendValidationError(req, res, parsedBody.error);
      return;
    }

    try {
      const activity = await activityService.trackActivity(userId, parsedBody.data);
      res.status(200).json({ ok: true, activity });
    } catch (error) {
      handleError(req, res, error, 'Erro ao registrar atividade.');
    }
  }
}

export const activityController = new ActivityController();
