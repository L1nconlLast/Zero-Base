import type { Request, Response } from 'express';
import { mentorAdminService } from '../services/mentorAdmin.service';

export class MentorAdminController {
  async getMentorMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const metrics = await mentorAdminService.getMetrics();
      res.status(200).json(metrics);
    } catch (error) {
      console.error('[mentor-admin] failed to get metrics:', error);
      res.status(500).json({
        error: 'Falha ao carregar metricas administrativas do Mentor IA.',
      });
    }
  }
}

export const mentorAdminController = new MentorAdminController();
