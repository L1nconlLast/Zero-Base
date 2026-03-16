import type { Request, Response } from 'express';
import { z } from 'zod';
import { pushNotificationService } from '../services/pushNotification.service';

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(16),
    auth: z.string().min(8),
  }),
});

const TestPushSchema = z.object({
  title: z.string().min(1).max(80).default('Lembrete Zero Base'),
  body: z.string().min(1).max(200).default('Hora de revisar seu plano de hoje.'),
});

const HeartbeatSchema = z.object({
  action: z.string().min(1).max(80).optional(),
  appVersion: z.string().min(1).max(40).optional(),
  platform: z.string().min(1).max(40).optional(),
});

export class NotificationsController {
  getVapidPublicKey(_req: Request, res: Response): void {
    const key = pushNotificationService.getPublicKey();
    if (!key) {
      res.status(503).json({ error: 'Push notifications nao configuradas no servidor.' });
      return;
    }

    res.status(200).json({ publicKey: key });
  }

  async subscribe(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = SubscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Payload invalido', details: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      await pushNotificationService.upsertSubscription({
        userId,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent: req.get('user-agent') || undefined,
      });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao salvar assinatura' });
    }
  }

  async sendTest(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = TestPushSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Payload invalido', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const sent = await pushNotificationService.sendToUser(userId, {
      title: parsed.data.title,
      body: parsed.data.body,
      tag: 'manual-test',
      url: '/',
    });

    res.status(200).json({ ok: true, sent });
  }

  async heartbeat(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = HeartbeatSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Payload invalido', details: parsed.error.flatten().fieldErrors });
      return;
    }

    await pushNotificationService.markUserActivity({
      userId,
      action: parsed.data.action,
      appVersion: parsed.data.appVersion,
      platform: parsed.data.platform,
    });

    res.status(204).send();
  }

  async runInactivityJob(_req: Request, res: Response): Promise<void> {
    const result = await pushNotificationService.runInactivityReminderJob(48);
    res.status(200).json({ ok: true, ...result });
  }
}

export const notificationsController = new NotificationsController();
