import OpenAI from 'openai';

export interface StudentContext {
  userName: string;
  daysToExam: number;
  strongArea: string;
  weakArea: string;
  weeklyPct: number;
  streak: number;
  trigger: 'weekly_start' | 'inactivity_48h' | 'goal_below_70' | 'chat_opened' | 'final_30_days';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MentorChatInput {
  message: string;
  history: ChatMessage[];
  studentContext: StudentContext;
}

export interface MentorChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface StreamHandlers {
  onToken: (token: string) => void;
  onComplete: (usage: MentorChatUsage) => void;
}

type MentorProvider = 'gemini' | 'openai' | 'local';

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: GeminiUsageMetadata;
}

const BLOCKED_PATTERNS = /(qual assunto vai cair|atalho|chute|gabarito|milagre)/i;

const buildSystemPrompt = (ctx: StudentContext): string => `
Voce e o "Mentor IA" da plataforma Zero Base 2.0 - um tutor de alto rendimento
especializado em preparacao para vestibulares (ENEM e concursos publicos).

## Sua Identidade
- Direto, empatico e orientado a resultados concretos.
- Nunca especula: toda orientacao deve ser baseada exclusivamente nos dados reais do aluno abaixo.
- Maximo de 4 paragrafos por resposta. Prefira listas curtas.
- Nunca finja que o aluno esta bem se os dados mostram o contrario.
- Proibido: prever gabaritos, oferecer atalhos, aceitar procrastinacao.

## Dados Reais do Aluno (${ctx.userName})
- Dias restantes para a prova: ${ctx.daysToExam}
- Area mais forte: ${ctx.strongArea}
- Area mais fraca (prioridade maxima): ${ctx.weakArea}
- Progresso na meta semanal: ${ctx.weeklyPct}%
- Sequencia de estudos (streak): ${ctx.streak} dias
- Momento atual do aluno: ${ctx.trigger}

## Regras de Resposta por Momento
- final_30_days: foco em revisao e gestao de ansiedade.
- inactivity_48h: reconectar com gentileza, com meta micro.
- goal_below_70: diagnostico rapido + plano de recuperacao semanal.
- weekly_start: briefing motivacional + 3 prioridades da semana.
- chat_opened: responda de forma direta, sem introducao generica.

Responda sempre em portugues do Brasil.
`.trim();

class MentorChatService {
  private readonly configuredProvider = (process.env.MENTOR_PROVIDER || 'local').toLowerCase();

  private readonly geminiApiKey = process.env.GEMINI_API_KEY?.trim() || '';

  private readonly geminiModel = process.env.MENTOR_GEMINI_MODEL || 'gemini-2.0-flash';

  private readonly openaiApiKey = process.env.OPENAI_API_KEY?.trim() || '';

  private readonly openaiModel = process.env.MENTOR_OPENAI_MODEL || process.env.MENTOR_MODEL || 'gpt-4o-mini';

  private readonly openai = this.openaiApiKey
    ? new OpenAI({ apiKey: this.openaiApiKey })
    : null;

  async streamChat(input: MentorChatInput, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
    const { message } = input;

    if (BLOCKED_PATTERNS.test(message)) {
      handlers.onToken(
        'Nao posso orientar atalhos ou previsoes de prova. Posso te ajudar com estrategia real baseada no seu plano atual.',
      );
      handlers.onComplete({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
      return;
    }

    const provider = this.resolveProvider();

    if (provider === 'local') {
      handlers.onToken(this.buildLocalReply(input));
      handlers.onComplete({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
      return;
    }

    if (provider === 'gemini') {
      await this.streamWithGemini(input, handlers, signal);
      return;
    }

    await this.streamWithOpenAI(input, handlers, signal);
  }

  private resolveProvider(): MentorProvider {
    if (this.configuredProvider === 'local') {
      return 'local';
    }

    if (this.configuredProvider === 'openai') {
      if (this.openaiApiKey) return 'openai';
      if (this.geminiApiKey) return 'gemini';
      return 'local';
    }

    if (this.configuredProvider === 'gemini') {
      if (this.geminiApiKey) return 'gemini';
      return 'local';
    }

    if (this.geminiApiKey) return 'gemini';
    if (this.openaiApiKey) return 'openai';

    return 'local';
  }

  private buildLocalReply(input: MentorChatInput): string {
    const { message, studentContext } = input;
    const lower = message.toLowerCase();

    if (lower.includes('plano') || lower.includes('semana')) {
      return [
        'Plano rapido para os proximos 7 dias:',
        `- 3 blocos de 25min em ${studentContext.weakArea}`,
        `- 2 blocos de 20min em ${studentContext.strongArea}`,
        '- 1 revisao geral no sabado (45min)',
      ].join('\n');
    }

    if (lower.includes('hoje') || lower.includes('revisar')) {
      return `Prioridade de hoje: ${studentContext.weakArea}. Faça 2 blocos curtos e finalize com 10min de revisao ativa.`;
    }

    if (lower.includes('consist') || lower.includes('streak')) {
      return `Seu streak atual e ${studentContext.streak} dias. Meta minima: 15min por dia para manter ritmo sem desgaste.`;
    }

    return `Com ${studentContext.daysToExam} dias para a prova, foco imediato em ${studentContext.weakArea}. Posso montar um plano de 14 dias agora.`;
  }

  private async streamWithGemini(input: MentorChatInput, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY missing');
    }

    const contents = input.history.map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }],
    }));

    contents.push({
      role: 'user',
      parts: [{ text: input.message }],
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.geminiModel)}:generateContent?key=${encodeURIComponent(this.geminiApiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(input.studentContext) }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      }),
      signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GEMINI_API_ERROR ${response.status}: ${detail}`);
    }

    const data = (await response.json()) as GeminiGenerateResponse;
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';

    if (!text.trim()) {
      throw new Error('GEMINI_EMPTY_RESPONSE');
    }

    handlers.onToken(text);
    handlers.onComplete({
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    });
  }

  private async streamWithOpenAI(input: MentorChatInput, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
    if (!this.openai) {
      throw new Error('OPENAI_API_KEY missing');
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPrompt(input.studentContext) },
      ...input.history.map((item) => ({ role: item.role, content: item.content })),
      { role: 'user', content: input.message },
    ];

    const stream = await this.openai.chat.completions.create({
      model: this.openaiModel,
      messages,
      max_tokens: 512,
      temperature: 0.7,
      stream: true,
      stream_options: { include_usage: true },
    });

    let usage: MentorChatUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    if (signal) {
      signal.addEventListener('abort', () => {
        try {
          (stream as unknown as { controller?: { abort: () => void } }).controller?.abort();
        } catch {
          // ignore abort issues
        }
      });
    }

    for await (const chunk of stream) {
      if (signal?.aborted) {
        break;
      }

      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        handlers.onToken(delta);
      }

      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens || 0,
          completionTokens: chunk.usage.completion_tokens || 0,
          totalTokens: chunk.usage.total_tokens || 0,
        };
      }
    }

    handlers.onComplete(usage);
  }

  getModel(): string {
    const provider = this.resolveProvider();
    if (provider === 'gemini') return this.geminiModel;
    if (provider === 'openai') return this.openaiModel;
    return 'local-rules-v1';
  }

  getProvider(): MentorProvider {
    return this.resolveProvider();
  }
}

export const mentorChatService = new MentorChatService();
