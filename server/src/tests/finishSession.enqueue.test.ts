import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { studyPlatformCompatController } from '../controllers/studyPlatformCompat.controller';
import { studyPlatformCompatService } from '../services/studyPlatformCompat.service';
import { queueJobsService } from '../services/queueJobs.service';

const createMockResponse = (): Response => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  return res;
};

describe('finishSession enqueue', () => {
  it('enfileira jobs apos finalizar sessao', async () => {
    const req = {
      auth: { userId: '11111111-1111-4111-8111-111111111111' },
      params: { id: '22222222-2222-4222-8222-222222222222' },
      body: {
        endTime: '2026-03-16T18:00:00.000Z',
        questionsDone: 10,
        correctAnswers: 8,
      },
    } as unknown as Request;

    const res = createMockResponse();

    vi.spyOn(studyPlatformCompatService, 'finishSession').mockResolvedValue({
      duration: 50,
      xpGained: 90,
      newLevel: 'INICIANTE',
      streak: 3,
    });

    const enqueueSpy = vi.spyOn(queueJobsService, 'enqueueAfterSessionFinish').mockResolvedValue();

    await studyPlatformCompatController.finishSession(req, res);

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledWith({
      userId: '11111111-1111-4111-8111-111111111111',
      sessionId: '22222222-2222-4222-8222-222222222222',
      duration: 50,
      xpGained: 90,
      streak: 3,
    });
  });
});
