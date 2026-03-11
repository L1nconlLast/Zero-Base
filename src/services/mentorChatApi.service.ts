import type { MentorTrigger } from '../types/mentor';

export interface MentorChatPayload {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  studentContext: {
    userName: string;
    daysToExam: number;
    strongArea: string;
    weakArea: string;
    weeklyPct: number;
    streak: number;
    trigger: MentorTrigger;
  };
}

interface MentorChatResponse {
  reply: string;
}

class MentorChatApiService {
  private readonly endpoint = '/api/mentor/chat';

  async send(payload: MentorChatPayload, timeoutMs = 12000): Promise<string> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Mentor chat API ${response.status}`);
      }

      const data = (await response.json()) as MentorChatResponse;
      return data.reply || 'Nao consegui responder agora.';
    } finally {
      window.clearTimeout(timer);
    }
  }
}

export const mentorChatApiService = new MentorChatApiService();
