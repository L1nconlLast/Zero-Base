import { Router } from 'express';
import { mentorChatController } from '../controllers/mentorChat.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { mentorRateLimitMiddleware } from '../middlewares/rateLimit.middleware';

const router = Router();

router.post('/chat', authMiddleware, mentorRateLimitMiddleware, (req, res) => {
  void mentorChatController.handleChat(req, res);
});

export default router;
