import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { onboardingController } from '../controllers/onboarding.controller';

const router = Router();

router.get('/load', authMiddleware, (req, res) => {
  void onboardingController.load(req, res);
});

router.post('/save', authMiddleware, (req, res) => {
  void onboardingController.save(req, res);
});

export default router;
