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
  private readonly openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? '',
  });

  private readonly model = process.env.MENTOR_MODEL || 'gpt-4o-mini';

  async streamChat(input: MentorChatInput, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
    const { message, history, studentContext } = input;

    if (BLOCKED_PATTERNS.test(message)) {
      handlers.onToken(
        'Nao posso orientar atalhos ou previsoes de prova. Posso te ajudar com estrategia real baseada no seu plano atual.',
      );
      handlers.onComplete({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY missing');
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPrompt(studentContext) },
      ...history.map((item) => ({ role: item.role, content: item.content })),
      { role: 'user', content: message },
    ];

    const stream = await this.openai.chat.completions.create({
      model: this.model,
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
    return this.model;
  }
}

export const mentorChatService = new MentorChatService();
