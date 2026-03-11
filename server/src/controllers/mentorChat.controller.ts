import type { Request, Response } from 'express';
import { z } from 'zod';
import { mentorChatService } from '../services/mentorChat.service';
import { mentorCacheService } from '../services/mentorCache.service';
import { mentorUsageService } from '../services/mentorUsage.service';

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
    const userId = req.auth?.userId;
    const requestId = req.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: usuario nao autenticado.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const abortController = new AbortController();
    let closed = false;
    let streamText = '';

    const writeEvent = (event: string, data: unknown) => {
      if (closed || res.writableEnded) return;
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    req.on('close', () => {
      closed = true;
      abortController.abort();
    });

    const cacheKey = mentorCacheService.buildKey({
      userId,
      message,
      strongArea: studentContext.strongArea,
      weakArea: studentContext.weakArea,
      weeklyPct: studentContext.weeklyPct,
    });

    const cached = mentorCacheService.get(cacheKey);
    if (cached) {
      writeEvent('chunk', { text: cached, cached: true });
      writeEvent('done', {
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        cached: true,
      });
      res.end();
      return;
    }

    try {
      await mentorChatService.streamChat(
        { message, history, studentContext },
        {
          onToken: (token) => {
            streamText += token;
            writeEvent('chunk', { text: token });
          },
          onComplete: (usage) => {
            if (closed || res.writableEnded) {
              return;
            }
            writeEvent('done', { usage });
            res.end();

            if (streamText.trim()) {
              mentorCacheService.set(cacheKey, streamText);
            }

            mentorUsageService.trackUsageFireAndForget({
              userId,
              requestId,
              model: mentorChatService.getModel(),
              provider: 'openai',
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
              createdAt: new Date().toISOString(),
            });
          },
        },
        abortController.signal,
      );

      if (!closed && !res.writableEnded) {
        if (streamText.trim()) {
          mentorCacheService.set(cacheKey, streamText);
        }
        writeEvent('done', {
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        });
        res.end();
      }
      return;
    } catch (error) {
      if (closed || res.writableEnded) {
        return;
      }

      if (error instanceof Error) {
        const lower = error.message.toLowerCase();

        if (error.message.includes('401') || lower.includes('api key')) {
          writeEvent('error', { error: 'Servico de IA temporariamente indisponivel.' });
          res.end();
          return;
        }

        if (error.message.includes('429') || lower.includes('rate limit')) {
          writeEvent('error', { error: 'Muitas requisicoes em pouco tempo. Aguarde alguns segundos.' });
          res.end();
          return;
        }

        if (lower.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          writeEvent('error', { error: 'A IA demorou para responder. Tente novamente.' });
          res.end();
          return;
        }
      }

      writeEvent('error', { error: 'Ocorreu um erro interno.' });
      res.end();
    }
  }
}

export const mentorChatController = new MentorChatController();
