import type { Request, Response } from 'express';
import { z } from 'zod';
import { learningGraphService } from '../services/learningGraph.service';

const UuidSchema = z.string().uuid();

const TopicsQuerySchema = z.object({
  disciplinaId: z.string().uuid().optional(),
  search: z.string().max(120).optional(),
  level: z.enum(['iniciante', 'intermediario', 'avancado']).optional(),
});

const ProgressPayloadSchema = z.object({
  topicId: z.string().uuid(),
  status: z.enum(['locked', 'available', 'studying', 'completed', 'review']),
  score: z.number().int().min(0).max(100).optional(),
  studyMinutes: z.number().int().min(0).max(600).optional(),
  attemptsDelta: z.number().int().min(0).max(50).optional(),
});

export class LearningGraphController {
  async listDisciplines(_req: Request, res: Response): Promise<void> {
    try {
      const rows = await learningGraphService.listDisciplines();
      res.status(200).json({ disciplines: rows });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao listar disciplinas' });
    }
  }

  async listTopics(req: Request, res: Response): Promise<void> {
    const parsed = TopicsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Query invalida', details: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      const rows = await learningGraphService.listTopics({
        disciplineId: parsed.data.disciplinaId,
        search: parsed.data.search,
        level: parsed.data.level,
      });
      res.status(200).json({ topics: rows });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao listar topicos' });
    }
  }

  async listPrerequisiteEdges(req: Request, res: Response): Promise<void> {
    const disciplineId = typeof req.query.disciplinaId === 'string' ? req.query.disciplinaId : undefined;

    if (disciplineId) {
      const disciplineParsed = UuidSchema.safeParse(disciplineId);
      if (!disciplineParsed.success) {
        res.status(400).json({ error: 'disciplinaId invalido' });
        return;
      }
    }

    try {
      const edges = await learningGraphService.listPrerequisiteEdges(disciplineId);
      res.status(200).json({ edges });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao listar arestas de prerequisito' });
    }
  }

  async getTopic(req: Request, res: Response): Promise<void> {
    const parsed = UuidSchema.safeParse(req.params.topicId);
    if (!parsed.success) {
      res.status(400).json({ error: 'topicId invalido' });
      return;
    }

    try {
      const topic = await learningGraphService.getTopic(parsed.data);
      if (!topic) {
        res.status(404).json({ error: 'Topico nao encontrado' });
        return;
      }
      res.status(200).json({ topic });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao buscar topico' });
    }
  }

  async getPrerequisites(req: Request, res: Response): Promise<void> {
    const parsed = UuidSchema.safeParse(req.params.topicId);
    if (!parsed.success) {
      res.status(400).json({ error: 'topicId invalido' });
      return;
    }

    try {
      const prerequisites = await learningGraphService.getTopicPrerequisites(parsed.data);
      res.status(200).json({ prerequisites });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao buscar prerequisitos' });
    }
  }

  async getDependents(req: Request, res: Response): Promise<void> {
    const parsed = UuidSchema.safeParse(req.params.topicId);
    if (!parsed.success) {
      res.status(400).json({ error: 'topicId invalido' });
      return;
    }

    try {
      const dependents = await learningGraphService.getTopicDependents(parsed.data);
      res.status(200).json({ dependents });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao buscar dependentes' });
    }
  }

  async upsertProgress(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userIdParsed = UuidSchema.safeParse(userId);
    if (!userIdParsed.success) {
      res.status(400).json({ error: 'Usuario invalido para progresso (somente conta autenticada real)' });
      return;
    }

    const parsed = ProgressPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Payload invalido', details: parsed.error.flatten().fieldErrors });
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
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao salvar progresso' });
    }
  }

  async getUserProgress(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userIdParsed = UuidSchema.safeParse(userId);
    if (!userIdParsed.success) {
      res.status(400).json({ error: 'Usuario invalido para progresso (somente conta autenticada real)' });
      return;
    }

    const disciplineId = typeof req.query.disciplinaId === 'string' ? req.query.disciplinaId : undefined;

    if (disciplineId) {
      const disciplineParsed = UuidSchema.safeParse(disciplineId);
      if (!disciplineParsed.success) {
        res.status(400).json({ error: 'disciplinaId invalido' });
        return;
      }
    }

    try {
      const progress = await learningGraphService.getUserProgress(userIdParsed.data, disciplineId);
      res.status(200).json({ progress });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao buscar progresso' });
    }
  }

  async getNextTopic(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userIdParsed = UuidSchema.safeParse(userId);
    if (!userIdParsed.success) {
      res.status(400).json({ error: 'Usuario invalido para recomendacao (somente conta autenticada real)' });
      return;
    }

    const disciplineId = typeof req.query.disciplinaId === 'string' ? req.query.disciplinaId : undefined;

    if (disciplineId) {
      const disciplineParsed = UuidSchema.safeParse(disciplineId);
      if (!disciplineParsed.success) {
        res.status(400).json({ error: 'disciplinaId invalido' });
        return;
      }
    }

    try {
      const nextTopic = await learningGraphService.getNextTopic(userIdParsed.data, disciplineId);
      res.status(200).json({ nextTopic });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao calcular proximo topico' });
    }
  }
}

export const learningGraphController = new LearningGraphController();
