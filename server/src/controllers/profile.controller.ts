import type { Request, Response } from 'express';
import { z } from 'zod';
import { profileService } from '../services/profile.service';
import { logger } from '../services/logger.service';
import { sendError, sendInternalError, sendUnauthorized, sendValidationError } from '../utils/apiResponse';

const UuidSchema = z.string().uuid();

const SaveProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().max(200).optional(),
  avatarIcon: z.string().trim().min(1).max(50).optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.enum(['pt', 'en', 'es']).optional(),
  density: z.enum(['compact', 'normal', 'spacious']).optional(),
  preferredPeriod: z.enum(['morning', 'afternoon', 'night', 'late_night']).optional(),
});

const SaveNotificationsSchema = z.object({
  studyReminders: z.boolean().optional(),
  unlockedAchievements: z.boolean().optional(),
  groupActivity: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).optional().nullable(),
  timezone: z.string().trim().min(3).max(80).optional(),
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
    sendError(req, res, 400, 'INVALID_USER', 'Usuario invalido para perfil.');
    return null;
  }

  return parsed.data;
};

class ProfileController {
  async load(req: Request, res: Response): Promise<void> {
    const userId = parseUserId(req, res);
    if (!userId) return;

    try {
      const data = await profileService.loadProfile(userId);
      res.status(200).json(data);
    } catch (error) {
      handleError(req, res, error, 'Erro ao carregar perfil.');
    }
  }

  async save(req: Request, res: Response): Promise<void> {
    const userId = parseUserId(req, res);
    if (!userId) return;

    const parsedBody = SaveProfileSchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      sendValidationError(req, res, parsedBody.error);
      return;
    }

    try {
      const profile = await profileService.saveProfile(userId, parsedBody.data);
      res.status(200).json({ ok: true, profile });
    } catch (error) {
      handleError(req, res, error, 'Erro ao salvar perfil.');
    }
  }

  async saveNotifications(req: Request, res: Response): Promise<void> {
    const userId = parseUserId(req, res);
    if (!userId) return;

    const parsedBody = SaveNotificationsSchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      sendValidationError(req, res, parsedBody.error);
      return;
    }

    try {
      const notifications = await profileService.saveNotificationPrefs(userId, parsedBody.data);
      res.status(200).json({ ok: true, notifications });
    } catch (error) {
      handleError(req, res, error, 'Erro ao salvar notificacoes.');
    }
  }

  async uploadAvatar(req: Request, res: Response): Promise<void> {
    const userId = parseUserId(req, res);
    if (!userId) return;

    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      sendError(req, res, 400, 'FILE_REQUIRED', 'Arquivo de avatar obrigatorio.');
      return;
    }

    try {
      const result = await profileService.uploadAvatar(userId, file);
      res.status(200).json({ ok: true, avatarUrl: result.avatarUrl });
    } catch (error) {
      handleError(req, res, error, 'Erro ao enviar avatar.');
    }
  }
}

export const profileController = new ProfileController();
