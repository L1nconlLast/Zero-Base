import type { Request, Response } from 'express';
import { mentorAdminService } from '../services/mentorAdmin.service';
import { logger } from '../services/logger.service';
import { sendInternalError } from '../utils/apiResponse';

export class MentorAdminController {
  async getMentorMetrics(req: Request, res: Response): Promise<void> {
    try {
      const period = (req.query.period as string) || '30d';
      const metrics = await mentorAdminService.getMetrics(period);
      res.status(200).json(metrics);
    } catch (error) {
      logger.error('Falha ao carregar metricas administrativas do Mentor IA.', error, { requestId: req.id, route: req.originalUrl });
      sendInternalError(req, res, 'Falha ao carregar metricas administrativas do Mentor IA.');
    }
  }

  async exportMentorMetrics(req: Request, res: Response): Promise<void> {
    try {
      const period = (req.query.period as string) || '30d';
      const csv = await mentorAdminService.getExportCsv(period);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="mentor_usage_${period}.csv"`);
      res.status(200).send(csv);
    } catch (error) {
      logger.error('Falha ao gerar ficheiro CSV.', error, { requestId: req.id, route: req.originalUrl });
      sendInternalError(req, res, 'Falha ao gerar ficheiro CSV.');
    }
  }
}

export const mentorAdminController = new MentorAdminController();
