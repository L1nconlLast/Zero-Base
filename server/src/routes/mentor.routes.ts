import { Router } from 'express';
import { mentorChatController } from '../controllers/mentorChat.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { mentorRateLimitMiddleware } from '../middlewares/rateLimit.middleware';
import { requestIdMiddleware } from '../middlewares/requestId.middleware';
import { circuitBreakerMiddleware } from '../middlewares/circuitBreaker.middleware';

const router = Router();

router.post('/chat', requestIdMiddleware, authMiddleware, mentorRateLimitMiddleware, circuitBreakerMiddleware, (req, res) => {
  void mentorChatController.handleChat(req, res);
});

export default router;
