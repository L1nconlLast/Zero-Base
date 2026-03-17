import type { Request, Response } from 'express';
import { z } from 'zod';
import { learningGraphService } from '../services/learningGraph.service';
import { logger } from '../services/logger.service';
import { sendError, sendInternalError, sendUnauthorized, sendValidationError } from '../utils/apiResponse';

const UuidSchema = z.string().uuid();

const TopicsQuerySchema = z.object({
  disciplinaId: z.string().uuid().optional(),
  disciplina: z.string().max(120).optional(),
  search: z.string().max(120).optional(),
  level: z.enum(['iniciante', 'intermediario', 'avancado']).optional(),
  limit: z.coerce.number().int().min(1).max(5000).optional(),
});

const GraphQuerySchema = z.object({
  disciplinaId: z.string().uuid().optional(),
  disciplina: z.string().max(120).optional(),
  track: z.enum(['enem', 'concurso']).optional(),
  search: z.string().max(120).optional(),
  level: z.enum(['iniciante', 'intermediario', 'avancado']).optional(),
  limit: z.coerce.number().int().min(1).max(5000).optional(),
});

const ProgressPayloadSchema = z.object({
  topicId: z.string().uuid(),
  status: z.enum(['locked', 'available', 'studying', 'completed', 'review']),
  score: z.number().int().min(0).max(100).optional(),
  studyMinutes: z.number().int().min(0).max(600).optional(),
  attemptsDelta: z.number().int().min(0).max(50).optional(),
});

const handleControllerError = (req: Request, res: Response, error: unknown, message: string): void => {
  logger.error(message, error, { requestId: req.id, userId: req.auth?.userId, route: req.originalUrl });
  sendInternalError(req, res, message);
};

export class LearningGraphController {
  async listDisciplines(req: Request, res: Response): Promise<void> {
    try {
      const rows = await learningGraphService.listDisciplines();
      res.status(200).json({ disciplines: rows });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao listar disciplinas');
    }
  }

  async listTopics(req: Request, res: Response): Promise<void> {
    const parsed = TopicsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendValidationError(req, res, parsed.error, 'Query invalida.');
      return;
    }

    try {
      const rows = await learningGraphService.listTopics({
        disciplineId: parsed.data.disciplinaId,
        disciplineSlug: parsed.data.disciplina,
        search: parsed.data.search,
        level: parsed.data.level,
        limit: parsed.data.limit,
      });
      res.status(200).json({ topics: rows });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao listar topicos');
    }
  }

  async getGraph(req: Request, res: Response): Promise<void> {
    const parsed = GraphQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendValidationError(req, res, parsed.error, 'Query invalida.');
      return;
    }

    try {
      const graph = await learningGraphService.buildGraphPayload({
        disciplineId: parsed.data.disciplinaId,
        disciplineSlug: parsed.data.disciplina,
        track: parsed.data.track,
        search: parsed.data.search,
        level: parsed.data.level,
        limit: parsed.data.limit,
        userId: req.auth?.userId,
      });

      res.status(200).json(graph);
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao montar payload do grafo');
    }
  }

  async listPrerequisiteEdges(req: Request, res: Response): Promise<void> {
    const disciplineId = typeof req.query.disciplinaId === 'string' ? req.query.disciplinaId : undefined;

    if (disciplineId) {
      const disciplineParsed = UuidSchema.safeParse(disciplineId);
      if (!disciplineParsed.success) {
        sendError(req, res, 400, 'INVALID_DISCIPLINE_ID', 'disciplinaId invalido');
        return;
      }
    }

    try {
      const edges = await learningGraphService.listPrerequisiteEdges(disciplineId);
      res.status(200).json({ edges });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao listar arestas de prerequisito');
    }
  }

  async getTopic(req: Request, res: Response): Promise<void> {
    const parsed = UuidSchema.safeParse(req.params.topicId);
    if (!parsed.success) {
      sendError(req, res, 400, 'INVALID_TOPIC_ID', 'topicId invalido');
      return;
    }

    try {
      const topic = await learningGraphService.getTopic(parsed.data);
      if (!topic) {
        sendError(req, res, 404, 'TOPIC_NOT_FOUND', 'Topico nao encontrado');
        return;
      }
      res.status(200).json({ topic });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao buscar topico');
    }
  }

  async getPrerequisites(req: Request, res: Response): Promise<void> {
    const parsed = UuidSchema.safeParse(req.params.topicId);
    if (!parsed.success) {
      sendError(req, res, 400, 'INVALID_TOPIC_ID', 'topicId invalido');
      return;
    }

    try {
      const prerequisites = await learningGraphService.getTopicPrerequisites(parsed.data);
      res.status(200).json({ prerequisites });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao buscar prerequisitos');
    }
  }

  async getDependents(req: Request, res: Response): Promise<void> {
    const parsed = UuidSchema.safeParse(req.params.topicId);
    if (!parsed.success) {
      sendError(req, res, 400, 'INVALID_TOPIC_ID', 'topicId invalido');
      return;
    }

    try {
      const dependents = await learningGraphService.getTopicDependents(parsed.data);
      res.status(200).json({ dependents });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao buscar dependentes');
    }
  }

  async upsertProgress(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      sendUnauthorized(req, res);
      return;
    }

    const userIdParsed = UuidSchema.safeParse(userId);
    if (!userIdParsed.success) {
      sendError(req, res, 400, 'INVALID_USER', 'Usuario invalido para progresso (somente conta autenticada real)');
      return;
    }

    const parsed = ProgressPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(req, res, parsed.error);
      return;
    }

    try {
      const progress = await learningGraphService.upsertProgress({
        userId: userIdParsed.data,
        topicId: parsed.data.topicId,
        status: parsed.data.status,
        score: parsed.data.score,
        studyMinutes: parsed.data.studyMinutes,
        attemptsDelta: parsed.data.attemptsDelta,
      });

      res.status(200).json({ progress });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao salvar progresso');
    }
  }

  async getUserProgress(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      sendUnauthorized(req, res);
      return;
    }

    const userIdParsed = UuidSchema.safeParse(userId);
    if (!userIdParsed.success) {
      sendError(req, res, 400, 'INVALID_USER', 'Usuario invalido para progresso (somente conta autenticada real)');
      return;
    }

    const disciplineId = typeof req.query.disciplinaId === 'string' ? req.query.disciplinaId : undefined;

    if (disciplineId) {
      const disciplineParsed = UuidSchema.safeParse(disciplineId);
      if (!disciplineParsed.success) {
        sendError(req, res, 400, 'INVALID_DISCIPLINE_ID', 'disciplinaId invalido');
        return;
      }
    }

    try {
      const progress = await learningGraphService.getUserProgress(userIdParsed.data, disciplineId);
      res.status(200).json({ progress });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao buscar progresso');
    }
  }

  async getNextTopic(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      sendUnauthorized(req, res);
      return;
    }

    const userIdParsed = UuidSchema.safeParse(userId);
    if (!userIdParsed.success) {
      sendError(req, res, 400, 'INVALID_USER', 'Usuario invalido para recomendacao (somente conta autenticada real)');
      return;
    }

    const disciplineId = typeof req.query.disciplinaId === 'string' ? req.query.disciplinaId : undefined;

    if (disciplineId) {
      const disciplineParsed = UuidSchema.safeParse(disciplineId);
      if (!disciplineParsed.success) {
        sendError(req, res, 400, 'INVALID_DISCIPLINE_ID', 'disciplinaId invalido');
        return;
      }
    }

    try {
      const nextTopic = await learningGraphService.getNextTopic(userIdParsed.data, disciplineId);
      res.status(200).json({ nextTopic });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao calcular proximo topico');
    }
  }
}

export const learningGraphController = new LearningGraphController();
