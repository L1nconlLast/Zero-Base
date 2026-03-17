import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { learningGraphController } from '../controllers/learningGraph.controller';

const router = Router();

router.get('/disciplines', (req, res) => {
  void learningGraphController.listDisciplines(req, res);
});

router.get('/topics', (req, res) => {
  void learningGraphController.listTopics(req, res);
});

router.get('/graph', (req, res) => {
  void learningGraphController.getGraph(req, res);
});

router.get('/skill-tree', (req, res) => {
  void learningGraphController.getGraph(req, res);
});

router.get('/prerequisite-edges', (req, res) => {
  void learningGraphController.listPrerequisiteEdges(req, res);
});

router.get('/topics/:topicId', (req, res) => {
  void learningGraphController.getTopic(req, res);
});

router.get('/topics/:topicId/prerequisites', (req, res) => {
  void learningGraphController.getPrerequisites(req, res);
});

router.get('/topics/:topicId/dependents', (req, res) => {
  void learningGraphController.getDependents(req, res);
});

router.get('/progress', authMiddleware, (req, res) => {
  void learningGraphController.getUserProgress(req, res);
});

router.post('/progress', authMiddleware, (req, res) => {
  void learningGraphController.upsertProgress(req, res);
});

router.get('/next-topic', authMiddleware, (req, res) => {
  void learningGraphController.getNextTopic(req, res);
});

export default router;
