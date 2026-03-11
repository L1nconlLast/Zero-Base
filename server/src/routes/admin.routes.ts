import { Router } from 'express';
import { mentorAdminController } from '../controllers/mentorAdmin.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminAuthMiddleware } from '../middlewares/adminAuth.middleware';

const router = Router();

router.get('/mentor-metrics', authMiddleware, adminAuthMiddleware, (req, res) => {
  void mentorAdminController.getMentorMetrics(req, res);
});

export default router;
