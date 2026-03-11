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

export interface MentorChatOutput {
  reply: string;
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

  async chat(input: MentorChatInput): Promise<MentorChatOutput> {
    const { message, history, studentContext } = input;

    if (BLOCKED_PATTERNS.test(message)) {
      return {
        reply:
          'Nao posso orientar atalhos ou previsoes de prova. Posso te ajudar com estrategia real baseada no seu plano atual.',
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY missing');
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPrompt(studentContext) },
      ...history.map((item) => ({ role: item.role, content: item.content })),
      { role: 'user', content: message },
    ];

    const completion = await this.openai.chat.completions.create({
      model: process.env.MENTOR_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: 512,
      temperature: 0.7,
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      'Nao consegui gerar uma resposta agora. Tente novamente em instantes.';

    return { reply };
  }
}

export const mentorChatService = new MentorChatService();
