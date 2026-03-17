import type { Request, Response } from 'express';
import { z } from 'zod';
import { studyPlatformCompatService } from '../services/studyPlatformCompat.service';
import { aiServiceClient } from '../services/aiClient.service';
import { queueJobsService } from '../services/queueJobs.service';
import { cacheService } from '../services/cache.service';
import { logger } from '../services/logger.service';
import { sendError, sendInternalError, sendUnauthorized, sendValidationError } from '../utils/apiResponse';

const UuidSchema = z.string().uuid();

const SkillsTreeQuerySchema = z.object({
  subjectId: z.string().uuid().optional(),
});

const StartSessionSchema = z.object({
  subjectId: z.string().uuid(),
  skillId: z.string().uuid().optional(),
  startTime: z.string().datetime(),
});

const FinishSessionSchema = z.object({
  endTime: z.string().datetime(),
  questionsDone: z.number().int().min(0).max(500).optional(),
  correctAnswers: z.number().int().min(0).max(500).optional(),
});

const PlannerWeekQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const PlannerGenerateSchema = z.object({
  availableHoursPerDay: z.array(z.number().min(0).max(12)).length(7),
  goals: z.array(z.string().min(1).max(120)).max(20),
  weakSkills: z.array(z.string().min(1).max(120)).max(50).optional(),
  examDate: z.string().min(4).max(40).optional(),
});

const TutorExplainSchema = z.object({
  topic: z.string().min(2).max(160),
  context: z.string().min(2).max(80),
  userLevel: z.string().min(2).max(50),
});

const PlannerStatusSchema = z.object({
  status: z.enum(['PENDENTE', 'CONCLUIDO', 'FALTOU']),
});

const QuestionsQuerySchema = z.object({
  subjectId: z.string().uuid().optional(),
  skillId: z.string().uuid().optional(),
  difficulty: z.enum(['facil', 'medio', 'dificil']).optional(),
});

const AnswerSchema = z.object({
  questionId: z.string().uuid(),
  isCorrect: z.boolean(),
  timeSpentSec: z.number().int().min(1).max(3600).optional(),
});

const PatchSkillSchema = z.object({
  progress: z.number().min(0).max(100).optional(),
  masteryLevel: z.enum(['baixo', 'medio', 'alto']).optional(),
  lastStudied: z.string().datetime().optional(),
});

const SKILLS_TREE_CACHE_TTL_SECONDS = 120;
const STATS_WEEK_CACHE_TTL_SECONDS = 90;

const handleControllerError = (req: Request, res: Response, error: unknown, message: string): void => {
  logger.error(message, error, { requestId: req.id, userId: req.auth?.userId, route: req.originalUrl });
  sendInternalError(req, res, message);
};

const parseAuthUserId = (req: Request, res: Response): string | null => {
  const userId = req.auth?.userId;
  if (!userId) {
    sendUnauthorized(req, res);
    return null;
  }

  const parsed = UuidSchema.safeParse(userId);
  if (!parsed.success) {
    sendError(req, res, 400, 'INVALID_USER', 'Usuario invalido para operacao autenticada.');
    return null;
  }

  return parsed.data;
};

export class StudyPlatformCompatController {
  async listSubjects(_req: Request, res: Response): Promise<void> {
    try {
      const subjects = await studyPlatformCompatService.listSubjects();
      res.status(200).json({ subjects });
    } catch (error) {
      handleControllerError(res.req, res, error, 'Erro ao listar subjects');
    }
  }

  async getSkillsTree(req: Request, res: Response): Promise<void> {
    const parsed = SkillsTreeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendValidationError(req, res, parsed.error, 'Query invalida.');
      return;
    }

    try {
      const userId = req.auth?.userId;
      const safeUserId = UuidSchema.safeParse(userId).success ? userId : undefined;
      const cacheKey = `spec:skills-tree:${parsed.data.subjectId || 'all'}:${safeUserId || 'public'}`;
      const cached = await cacheService.getJson<Record<string, unknown>>(cacheKey);
      if (cached) {
        res.status(200).json(cached);
        return;
      }

      const tree = await studyPlatformCompatService.getSkillsTree(parsed.data.subjectId, safeUserId);
      await cacheService.setJson(cacheKey, tree, SKILLS_TREE_CACHE_TTL_SECONDS);
      res.status(200).json(tree);
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao carregar skill tree');
    }
  }

  async getUserSkills(req: Request, res: Response): Promise<void> {
    const userId = parseAuthUserId(req, res);
    if (!userId) return;

    try {
      const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId : undefined;
      if (subjectId && !UuidSchema.safeParse(subjectId).success) {
        sendError(req, res, 400, 'INVALID_SUBJECT_ID', 'subjectId invalido');
        return;
      }

      const skills = await studyPlatformCompatService.getUserSkills(userId, subjectId);
      res.status(200).json({ skills });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao listar skills do usuario');
    }
  }

  async patchUserSkill(req: Request, res: Response): Promise<void> {
    const userId = parseAuthUserId(req, res);
    if (!userId) return;

    const skillIdParsed = UuidSchema.safeParse(req.params.skillId);
    if (!skillIdParsed.success) {
      sendError(req, res, 400, 'INVALID_SKILL_ID', 'skillId invalido');
      return;
    }

    const payloadParsed = PatchSkillSchema.safeParse(req.body);
    if (!payloadParsed.success) {
      sendValidationError(req, res, payloadParsed.error);
      return;
    }

    try {
      const skill = await studyPlatformCompatService.patchUserSkill(userId, skillIdParsed.data, payloadParsed.data);
      await cacheService.deletePattern('spec:skills-tree:');
      res.status(200).json({ skill });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao atualizar skill do usuario');
    }
  }

  async startSession(req: Request, res: Response): Promise<void> {
    const userId = parseAuthUserId(req, res);
    if (!userId) return;

    const parsed = StartSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(req, res, parsed.error);
      return;
    }

    try {
      const result = await studyPlatformCompatService.startSession(userId, parsed.data);
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao iniciar sessao');
    }
  }

  async finishSession(req: Request, res: Response): Promise<void> {
    const userId = parseAuthUserId(req, res);
    if (!userId) return;

    const sessionIdParsed = UuidSchema.safeParse(req.params.id);
    if (!sessionIdParsed.success) {
      sendError(req, res, 400, 'INVALID_SESSION_ID', 'sessionId invalido');
      return;
    }

    const payloadParsed = FinishSessionSchema.safeParse(req.body);
    if (!payloadParsed.success) {
      sendValidationError(req, res, payloadParsed.error);
      return;
    }

    try {
      const summary = await studyPlatformCompatService.finishSession(userId, sessionIdParsed.data, payloadParsed.data);

      await queueJobsService.enqueueAfterSessionFinish({
        userId,
        sessionId: sessionIdParsed.data,
        duration: summary.duration,
        xpGained: summary.xpGained,
        streak: summary.streak,
      });

      await cacheService.deletePattern(`spec:stats-week:${userId}`);
      await cacheService.deletePattern('spec:skills-tree:');

      res.status(200).json(summary);
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao finalizar sessao');
    }
  }

  async getPlannerWeek(req: Request, res: Response): Promise<void> {
    const userId = parseAuthUserId(req, res);
    if (!userId) return;

    const parsed = PlannerWeekQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendValidationError(req, res, parsed.error, 'Query invalida.');
      return;
    }

    try {
      const items = await studyPlatformCompatService.getPlannerWeek(userId, parsed.data.start);
      res.status(200).json({ items });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao carregar planner semanal');
    }
  }

  async generatePlanner(req: Request, res: Response): Promise<void> {
    const parsed = PlannerGenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(req, res, parsed.error);
      return;
    }

    try {
      const result = aiServiceClient.isEnabled()
        ? await aiServiceClient.generatePlanner(parsed.data, { requestId: req.id })
        : await studyPlatformCompatService.generatePlanner(parsed.data);

      res.status(200).json(result);
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao gerar planner');
    }
  }

  async tutorExplain(req: Request, res: Response): Promise<void> {
    const parsed = TutorExplainSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(req, res, parsed.error);
      return;
    }

    try {
      const response = await aiServiceClient.explainTutor(parsed.data, { requestId: req.id });
      res.status(200).json(response);
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao explicar topico');
    }
  }

  async patchPlannerStatus(req: Request, res: Response): Promise<void> {
    const userId = parseAuthUserId(req, res);
    if (!userId) return;

    const idParsed = UuidSchema.safeParse(req.params.id);
    if (!idParsed.success) {
      sendError(req, res, 400, 'INVALID_PLANNER_ID', 'plannerId invalido');
      return;
    }

    const payloadParsed = PlannerStatusSchema.safeParse(req.body);
    if (!payloadParsed.success) {
      sendValidationError(req, res, payloadParsed.error);
      return;
    }

    try {
      const item = await studyPlatformCompatService.updatePlannerStatus(userId, idParsed.data, payloadParsed.data.status);

      await queueJobsService.enqueueAfterPlannerStatus({
        userId,
        plannerId: idParsed.data,
        status: payloadParsed.data.status,
      });

      await cacheService.deletePattern(`spec:stats-week:${userId}`);

      res.status(200).json({ item });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao atualizar status do planner');
    }
  }

  async getQuestions(req: Request, res: Response): Promise<void> {
    const parsed = QuestionsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendValidationError(req, res, parsed.error, 'Query invalida.');
      return;
    }

    try {
      const questions = await studyPlatformCompatService.getQuestions(parsed.data);
      res.status(200).json({ questions });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao listar questoes');
    }
  }

  async submitAnswer(req: Request, res: Response): Promise<void> {
    const userId = parseAuthUserId(req, res);
    if (!userId) return;

    const parsed = AnswerSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(req, res, parsed.error);
      return;
    }

    try {
      const impact = await studyPlatformCompatService.submitAnswer(userId, parsed.data);

      await queueJobsService.enqueueAfterAnswer({
        userId,
        questionId: parsed.data.questionId,
        skillId: impact.skillId,
        accuracy: impact.accuracy,
      });

      await cacheService.deletePattern(`spec:stats-week:${userId}`);
      await cacheService.deletePattern('spec:skills-tree:');

      res.status(201).json({ impact });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao registrar resposta');
    }
  }

  async getStatsToday(req: Request, res: Response): Promise<void> {
    const userId = parseAuthUserId(req, res);
    if (!userId) return;

    try {
      const stats = await studyPlatformCompatService.getTodayStats(userId);
      res.status(200).json(stats);
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao carregar stats do dia');
    }
  }

  async getStatsWeek(req: Request, res: Response): Promise<void> {
    const userId = parseAuthUserId(req, res);
    if (!userId) return;

    try {
      const cacheKey = `spec:stats-week:${userId}`;
      const cached = await cacheService.getJson<Record<string, unknown>>(cacheKey);
      if (cached) {
        res.status(200).json(cached);
        return;
      }

      const stats = await studyPlatformCompatService.getWeekStats(userId);
      await cacheService.setJson(cacheKey, stats, STATS_WEEK_CACHE_TTL_SECONDS);
      res.status(200).json(stats);
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao carregar stats da semana');
    }
  }

  async getAccuracyBySubject(req: Request, res: Response): Promise<void> {
    const userId = parseAuthUserId(req, res);
    if (!userId) return;

    try {
      const stats = await studyPlatformCompatService.getAccuracyBySubject(userId);
      res.status(200).json({ subjects: stats });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao carregar acuracia por disciplina');
    }
  }

  async getSkillsWeakness(req: Request, res: Response): Promise<void> {
    const userId = parseAuthUserId(req, res);
    if (!userId) return;

    try {
      const weaknesses = await studyPlatformCompatService.getSkillsWeakness(userId);
      res.status(200).json({ weaknesses });
    } catch (error) {
      handleControllerError(req, res, error, 'Erro ao carregar fraquezas por skill');
    }
  }
}

export const studyPlatformCompatController = new StudyPlatformCompatController();
