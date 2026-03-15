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

const isAuthError = (err: Error): boolean =>
  /status[:\s]*401|invalid.{0,20}api.key|incorrect.{0,20}api.key|api[_\s]?key/i.test(err.message);

const isQuotaExhaustedError = (err: Error): boolean =>
  /insufficient.{0,20}quota|billing.{0,20}hard.{0,10}limit|you exceeded your|resource_exhausted/i.test(err.message);

const isRateLimitError = (err: Error): boolean =>
  /status[:\s]*429|rate.{0,10}limit.{0,30}exceeded|too many requests/i.test(err.message);

const isTimeoutError = (err: Error): boolean =>
  /timeout|etimedout|econnreset|socket hang up/i.test(err.message);

const isUpstreamError = (err: Error): boolean =>
  /status[:\s]*5[0-9]{2}|service.{0,10}unavailable|overloaded/i.test(err.message);

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
              provider: mentorChatService.getProvider(),
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

      const errorId = `mchat_${Date.now().toString(36)}`;

      if (error instanceof Error) {
        if (isAuthError(error)) {
          console.error(`[MentorChat][${errorId}] auth/config error:`, error.message);
          writeEvent('error', { error: 'Servico de IA temporariamente indisponivel.', errorId });
          res.end();
          return;
        }

        if (isQuotaExhaustedError(error)) {
          console.error(`[MentorChat][${errorId}] quota exhausted:`, error.message);
          writeEvent('error', { error: 'Sua cota da IA foi atingida. Verifique plano e faturamento para continuar.', errorId });
          res.end();
          return;
        }

        if (isRateLimitError(error)) {
          console.warn(`[MentorChat][${errorId}] rate limit:`, error.message);
          writeEvent('error', { error: 'Muitas requisicoes em pouco tempo. Aguarde alguns segundos.', errorId });
          res.end();
          return;
        }

        if (isTimeoutError(error)) {
          console.warn(`[MentorChat][${errorId}] timeout:`, error.message);
          writeEvent('error', { error: 'A IA demorou para responder. Tente novamente.', errorId });
          res.end();
          return;
        }

        if (isUpstreamError(error)) {
          console.warn(`[MentorChat][${errorId}] upstream unstable:`, error.message);
          writeEvent('error', { error: 'O servico de IA esta instavel. Tente em instantes.', errorId });
          res.end();
          return;
        }

        console.error(`[MentorChat][${errorId}] unclassified error:`, error);
      }

      writeEvent('error', { error: 'Ocorreu um erro interno.', errorId });
      res.end();
    }
  }
}

export const mentorChatController = new MentorChatController();
