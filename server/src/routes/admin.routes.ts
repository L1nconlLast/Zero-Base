import { Router } from 'express';
import { mentorAdminController } from '../controllers/mentorAdmin.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminAuthMiddleware } from '../middlewares/adminAuth.middleware';

const router = Router();

router.get('/mentor-metrics', authMiddleware, adminAuthMiddleware, (req, res) => {
  void mentorAdminController.getMentorMetrics(req, res);
});

router.get('/mentor-metrics/export', authMiddleware, adminAuthMiddleware, (req, res) => {
  void mentorAdminController.exportMentorMetrics(req, res);
});

export default router;
