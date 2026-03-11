import { Router } from 'express';
import { mentorChatController } from '../controllers/mentorChat.controller';

const router = Router();

router.post('/chat', (req, res) => {
  void mentorChatController.handleChat(req, res);
});

export default router;
