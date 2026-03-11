import type { Request, Response } from 'express';
import { z } from 'zod';
import { mentorChatService } from '../services/mentorChat.service';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

const StudentContextSchema = z.object({
  userName: z.string().min(1).max(100),
  daysToExam: z.number().int().min(0).max(1500),
  strongArea: z.string().min(1).max(80),
  weakArea: z.string().min(1).max(80),
  weeklyPct: z.number().min(0).max(100),
  streak: z.number().int().min(0),
  trigger: z.enum(['weekly_start', 'inactivity_48h', 'goal_below_70', 'chat_opened', 'final_30_days']),
});

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Mensagem nao pode ser vazia.').max(2000),
  history: z.array(ChatMessageSchema).max(20).default([]),
  studentContext: StudentContextSchema,
});

export class MentorChatController {
  async handleChat(req: Request, res: Response): Promise<void> {
    const parsed = ChatRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Payload invalido.',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { message, history, studentContext } = parsed.data;

    try {
      const result = await mentorChatService.chat({ message, history, studentContext });
      res.status(200).json({ reply: result.reply });
      return;
    } catch (error) {
      if (error instanceof Error) {
        const lower = error.message.toLowerCase();

        if (error.message.includes('401') || lower.includes('api key')) {
          res.status(503).json({ error: 'Servico de IA temporariamente indisponivel.' });
          return;
        }

        if (error.message.includes('429') || lower.includes('rate limit')) {
          res.status(429).json({ error: 'Muitas requisicoes em pouco tempo. Aguarde alguns segundos.' });
          return;
        }

        if (lower.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          res.status(504).json({ error: 'A IA demorou para responder. Tente novamente.' });
          return;
        }
      }

      res.status(500).json({ error: 'Ocorreu um erro interno.' });
    }
  }
}

export const mentorChatController = new MentorChatController();
