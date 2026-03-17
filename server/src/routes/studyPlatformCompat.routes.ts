import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { studyPlatformCompatController } from '../controllers/studyPlatformCompat.controller';
import { aiRateLimitMiddleware, plannerGenerateRateLimitMiddleware } from '../middlewares/rateLimit.middleware';

const router = Router();

router.get('/subjects', (req, res) => {
  void studyPlatformCompatController.listSubjects(req, res);
});

router.get('/skills/tree', (req, res) => {
  void studyPlatformCompatController.getSkillsTree(req, res);
});

router.get('/users/me/skills', authMiddleware, (req, res) => {
  void studyPlatformCompatController.getUserSkills(req, res);
});

router.patch('/users/me/skills/:skillId', authMiddleware, (req, res) => {
  void studyPlatformCompatController.patchUserSkill(req, res);
});

router.post('/sessions/start', authMiddleware, (req, res) => {
  void studyPlatformCompatController.startSession(req, res);
});

router.post('/sessions/:id/finish', authMiddleware, (req, res) => {
  void studyPlatformCompatController.finishSession(req, res);
});

router.get('/planner/week', authMiddleware, (req, res) => {
  void studyPlatformCompatController.getPlannerWeek(req, res);
});

router.post('/planner/generate', authMiddleware, plannerGenerateRateLimitMiddleware, (req, res) => {
  void studyPlatformCompatController.generatePlanner(req, res);
});

router.post('/ai/tutor/explain', authMiddleware, aiRateLimitMiddleware, (req, res) => {
  void studyPlatformCompatController.tutorExplain(req, res);
});

router.patch('/planner/:id/status', authMiddleware, (req, res) => {
  void studyPlatformCompatController.patchPlannerStatus(req, res);
});

router.get('/questions', (req, res) => {
  void studyPlatformCompatController.getQuestions(req, res);
});

router.post('/answers', authMiddleware, (req, res) => {
  void studyPlatformCompatController.submitAnswer(req, res);
});

router.get('/stats/today', authMiddleware, (req, res) => {
  void studyPlatformCompatController.getStatsToday(req, res);
});

router.get('/stats/week', authMiddleware, (req, res) => {
  void studyPlatformCompatController.getStatsWeek(req, res);
});

router.get('/stats/accuracy-by-subject', authMiddleware, (req, res) => {
  void studyPlatformCompatController.getAccuracyBySubject(req, res);
});

router.get('/stats/skills-weakness', authMiddleware, (req, res) => {
  void studyPlatformCompatController.getSkillsWeakness(req, res);
});

export default router;
