import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminAuthMiddleware } from '../middlewares/adminAuth.middleware';
import { notificationsController } from '../controllers/notifications.controller';

const router = Router();

router.get('/public-key', (req, res) => {
  notificationsController.getVapidPublicKey(req, res);
});

router.post('/subscribe', authMiddleware, (req, res) => {
  void notificationsController.subscribe(req, res);
});

router.post('/test', authMiddleware, (req, res) => {
  void notificationsController.sendTest(req, res);
});

router.post('/heartbeat', authMiddleware, (req, res) => {
  void notificationsController.heartbeat(req, res);
});

router.post('/jobs/inactivity-48h', authMiddleware, adminAuthMiddleware, (req, res) => {
  void notificationsController.runInactivityJob(req, res);
});

router.post('/jobs/day1-resume', authMiddleware, adminAuthMiddleware, (req, res) => {
  void notificationsController.runDay1ResumeJob(req, res);
});

export default router;
