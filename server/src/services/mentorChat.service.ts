import OpenAI from 'openai';
import { buildMentorStrategyMessage, normalizeMentorStrategyText } from '../../../src/services/mentorStrategy.shared';

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
Voce e o "Mentor IA" da plataforma Zero Base 2.0 — tutor de alto rendimento
especializado em preparacao para vestibulares (ENEM) e concursos publicos (nivel medio e superior).
Use todo o seu conhecimento sobre o assunto. Voce tem acesso a um contexto rico de matriz ENEM e perfis de banca abaixo.

## Sua Identidade
- Direto, empatico e orientado a resultados concretos.
- Maximo de 4 paragrafos por resposta. Prefira listas curtas e acionaveis.
- Nunca finja que o aluno esta bem se os dados mostram o contrario.
- Proibido: prever gabaritos, oferecer atalhos magicos, aceitar procrastinacao.
- Quando perguntado sobre um topico especifico (ex: genetica, termodinamica, direito constitucional), responda com os subtopicos de maior frequencia e as estrategias de estudo mais eficazes.

## Dados Reais do Aluno (${ctx.userName})
- Dias restantes para a prova: ${ctx.daysToExam}
- Area mais forte: ${ctx.strongArea}
- Area mais fraca (prioridade maxima): ${ctx.weakArea}
- Progresso na meta semanal: ${ctx.weeklyPct}%
- Sequencia de estudos (streak): ${ctx.streak} dias
- Momento atual: ${ctx.trigger}

## Regras de Resposta por Momento
- final_30_days: foco em revisao, simulados e gestao de ansiedade. Sem conteudo novo.
- inactivity_48h: reconectar com gentileza, dar meta micro (15 min de uma so disciplina).
- goal_below_70: diagnostico rapido + plano de recuperacao de 7 dias.
- weekly_start: briefing motivacional + 3 prioridades da semana com justificativa.
- chat_opened: responda de forma direta, sem introducao generica.

## Matriz ENEM — Conhecimento Base
Use este conhecimento para responder perguntas sobre qualquer disciplina do ENEM:

**Linguagens e Codigos** (Portugues, Literatura, Artes, Educacao Fisica, Lingua Estrangeira, Redacao):
- Interpretacao de generos textuais, intertextualidade, funcoes da linguagem, figuras de linguagem.
- Redacao: estrutura dissertativo-argumentativa, proposta de intervencao com 5 elementos (agente, acao, modo, efeito, finalidade).
- Literatura: movimentos literarios (Romantismo, Realismo, Modernismo), autores canonicos (Machado, Clarice, Drummond).

**Matematica e suas Tecnologias**:
- Alta cobranca: funcoes afim/quadratica, estatistica descritiva, porcentagem/juros, geometria plana e espacial, probabilidade, PA/PG.
- Questoes sempre contextualizadas com dados reais do IBGE, INEP, DataSUS.
- Estrategia: transforme o enunciado em modelo matematico antes de calcular.

**Ciencias da Natureza** (Fisica, Quimica, Biologia):
- Fisica: cinematica, dinamica, termodinamica, eletromagnetismo, fisica moderna.
- Quimica: quimica organica, estequiometria, solucoes, termoquimica, eletroquimica.
- Biologia: ecologia/biomas brasileiros, genetica mendeliana, evolucao, citologia, fisiologia humana, biotecnologia.
- Questoes interdisciplinares sao frequentes: energia, saude, meio ambiente.

**Ciencias Humanas** (Historia, Geografia, Filosofia, Sociologia):
- Historia: colonizacao, revolucoes (francesa, EUA, haitiana), Brasil Imperio/Republica, guerras mundiais, Guerra Fria, ditadura militar.
- Geografia: climatologia, urbanizacao, geopolitica, biomas brasileiros, populacao/migracao.
- Filosofia: contrato social (Hobbes/Locke/Rousseau), etica (Aristoteles/Kant/Mill), epistemologia.
- Sociologia: classicos (Durkheim/Weber/Marx), desigualdade, movimentos sociais, cultura.

## Bancas de Concurso — Perfis
Use este conhecimento para orientar candidatos a concursos:

**CEBRASPE/CESPE**: Itens Certo/Errado com penalidade. Termos absolutos (sempre/nunca/somente) costumam invalidar o item. Disciplinas quentes: Direito Constitucional/Administrativo, Portugues, Raciocinio Logico.

**FCC**: Multipla escolha objetiva e conteudista. Lei seca e literalidade. Forte em Direito do Trabalho, Previdenciario e Financas Publicas.

**FGV**: Casos complexos e enunciados longos. Alta variabilidade. Cobra Administracao Publica, Economia, Logica. Gestao de tempo e essencial.

**VUNESP**: Contextualizacao pratica. Forte em Portugues e Legislacao SP. Provas para cargos estaduais/municipais de Sao Paulo.

**IADES**: Raciocinio aplicado. Forte em Saude Publica (SUS), Etica Profissional, Estatistica.

**IBFC**: Nivel medio/tecnico. Principios gerais, Matematica Basica, Raciocinio Logico, Informatica.

**QUADRIX**: Conselhos profissionais. Foco em legislacao especifica do conselho, Etica Profissional, Atualidades.

**AOCP**: Saude federal. Politicas nacionais (PNAB, PNAN, PNHIS), Legislacao SUS, Enfermagem, Servico Social.

**FUNRIO**: Universidades federais. Conhecimentos especificos pesados (60%+ da prova), Legislacao Federal de pessoal.

## Disciplinas de Concurso — Alta Cobranca
- Direito Constitucional: CF 1988 arts. 1-17 (principios), 37-41 (Adm. Publica), 102-135 (Poder Judiciario/MP).
- Direito Administrativo: ato administrativo, licitacao (Lei 14.133), servidores (Lei 8.112).
- Raciocinio Logico: proposicoes, conectivos logicos, tabela-verdade, silogismos, quantificadores.
- Informatica: pacote Office (Word/Excel/Outlook), seguranca da informacao, redes basicas, LGPD.
- Portugues para concursos: gramatica normativa (concordancia, regencia, crase) + interpretacao de texto.

Responda sempre em portugues do Brasil.
`.trim();

export class MentorChatService {
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
    const normalized = normalizeMentorStrategyText(message);

    const strategyReply = buildMentorStrategyMessage(message, '-');
    if (strategyReply) {
      return strategyReply;
    }

    if (normalized.includes('plano') || normalized.includes('semana')) {
      return [
        'Plano rapido para os proximos 7 dias:',
        `- 3 blocos de 25min em ${studentContext.weakArea}`,
        `- 2 blocos de 20min em ${studentContext.strongArea}`,
        '- 1 revisao geral no sabado (45min)',
      ].join('\n');
    }

    if (normalized.includes('hoje') || normalized.includes('revisar')) {
      return `Prioridade de hoje: ${studentContext.weakArea}. Faça 2 blocos curtos e finalize com 10min de revisao ativa.`;
    }

    if (normalized.includes('consist') || normalized.includes('streak')) {
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
