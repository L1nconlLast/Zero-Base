import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { activityController } from '../controllers/activity.controller';

const router = Router();

router.post('/track', authMiddleware, (req, res) => {
  void activityController.track(req, res);
});

export default router;
