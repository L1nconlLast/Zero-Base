import type { Request, Response } from 'express';
import { z } from 'zod';
import { onboardingService } from '../services/onboarding.service';
import { logger } from '../services/logger.service';
import { sendError, sendInternalError, sendUnauthorized, sendValidationError } from '../utils/apiResponse';

const UuidSchema = z.string().uuid();

const SavePayloadSchema = z.object({
  streakDays: z.coerce.number().int().min(0).max(365).optional(),
  streakLastDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

const handleError = (req: Request, res: Response, error: unknown, message: string): void => {
  logger.error(message, error, { requestId: req.id, userId: req.auth?.userId, route: req.originalUrl });
  sendInternalError(req, res, message);
};

export class OnboardingController {
  async load(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      sendUnauthorized(req, res);
      return;
    }

    const parsedUserId = UuidSchema.safeParse(userId);
    if (!parsedUserId.success) {
      sendError(req, res, 400, 'INVALID_USER', 'Usuario invalido para onboarding.');
      return;
    }

    try {
      const streak = await onboardingService.getStreak(parsedUserId.data);
      res.status(200).json({
        streakDays: streak.streakDays,
        streakLastDay: streak.streakLastDay,
      });
    } catch (error) {
      handleError(req, res, error, 'Erro ao carregar onboarding');
    }
  }

  async save(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      sendUnauthorized(req, res);
      return;
    }

    const parsedUserId = UuidSchema.safeParse(userId);
    if (!parsedUserId.success) {
      sendError(req, res, 400, 'INVALID_USER', 'Usuario invalido para onboarding.');
      return;
    }

    const parsedBody = SavePayloadSchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      sendValidationError(req, res, parsedBody.error);
      return;
    }

    try {
      const streak = await onboardingService.mergeAndSaveStreak({
        userId: parsedUserId.data,
        incomingDays: parsedBody.data.streakDays ?? 0,
        incomingLastDay: parsedBody.data.streakLastDay ?? null,
      });

      res.status(200).json({
        ok: true,
        streakDays: streak.streakDays,
        streakLastDay: streak.streakLastDay,
      });
    } catch (error) {
      handleError(req, res, error, 'Erro ao salvar onboarding');
    }
  }
}

export const onboardingController = new OnboardingController();
