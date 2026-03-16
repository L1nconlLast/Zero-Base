import type { MentorTrigger } from '../types/mentor';
import { supabase } from './supabase.client';

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

interface StreamHandlers {
  onChunk?: (chunk: string) => void;
  onDone?: (usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }) => void;
}

class MentorChatApiService {
  private readonly endpoint = '/api/mentor/chat';

  async sendStream(payload: MentorChatPayload, handlers: StreamHandlers, timeoutMs = 25000): Promise<string> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const requestId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : null;

    try {
      const session = await supabase?.auth.getSession();
      const accessToken = session?.data?.session?.access_token;
      const allowGuestInDev = Boolean(import.meta.env.DEV);
      const useGuestMode = allowGuestInDev;

      if (!accessToken && !useGuestMode) {
        throw new Error('Mentor chat API 401: sessao ausente. Faca login para usar o chat online.');
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(requestId ? { 'x-request-id': requestId } : {}),
          ...(!useGuestMode && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        let detail = '';
        try {
          const text = await response.text();
          if (text) {
            detail = text.slice(0, 300);
          }
        } catch {
          // ignore response parse errors
        }

        throw new Error(`Mentor chat API ${response.status}${detail ? `: ${detail}` : ''}`);
      }

      if (!response.body) {
        throw new Error('Mentor chat API stream unavailable');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      let fullReply = '';

      const processEventBlock = (block: string) => {
        const lines = block.split('\n');
        let eventName = 'message';
        let data = '';

        lines.forEach((line) => {
          if (line.startsWith('event:')) {
            eventName = line.slice('event:'.length).trim();
          }
          if (line.startsWith('data:')) {
            data += line.slice('data:'.length).trim();
          }
        });

        if (!data) return;
        const parsed = JSON.parse(data) as { text?: string; error?: string; usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } };

        if (eventName === 'chunk' && parsed.text) {
          fullReply += parsed.text;
          handlers.onChunk?.(parsed.text);
          return;
        }

        if (eventName === 'done') {
          handlers.onDone?.(parsed.usage);
          return;
        }

        if (eventName === 'error') {
          throw new Error(parsed.error || 'Erro no stream do Mentor IA');
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        pending += decoder.decode(value, { stream: true });
        let separatorIndex = pending.indexOf('\n\n');

        while (separatorIndex !== -1) {
          const block = pending.slice(0, separatorIndex).trim();
          pending = pending.slice(separatorIndex + 2);

          if (block) {
            processEventBlock(block);
          }

          separatorIndex = pending.indexOf('\n\n');
        }
      }

      return fullReply || 'Nao consegui responder agora.';
    } finally {
      window.clearTimeout(timer);
    }
  }
}

export const mentorChatApiService = new MentorChatApiService();
