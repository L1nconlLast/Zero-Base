import { describe, expect, it } from 'vitest';
import { MentorChatService, type MentorChatInput } from '../../server/src/services/mentorChat.service';

const createLocalService = (): MentorChatService => {
  const previousProvider = process.env.MENTOR_PROVIDER;
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;

  process.env.MENTOR_PROVIDER = 'local';
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const service = new MentorChatService();

  process.env.MENTOR_PROVIDER = previousProvider;

  if (previousGeminiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = previousGeminiKey;
  }

  if (previousOpenAiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = previousOpenAiKey;
  }

  return service;
};

const baseInput = (message: string): MentorChatInput => ({
  message,
  history: [],
  studentContext: {
    userName: 'Estudante',
    daysToExam: 120,
    strongArea: 'Matematica',
    weakArea: 'Biologia',
    weeklyPct: 68,
    streak: 4,
    trigger: 'chat_opened',
  },
});

const captureReply = async (message: string): Promise<string> => {
  const service = createLocalService();
  let reply = '';

  await service.streamChat(baseInput(message), {
    onToken: (token) => {
      reply += token;
    },
    onComplete: () => undefined,
  });

  return reply;
};

describe('MentorChatService local fallback', () => {
  it('retorna estrategia por banca no modo local', async () => {
    const reply = await captureReply('Qual estrategia para prova da FGV?');

    expect(reply).toContain('FGV');
    expect(reply).toContain('estrategia de prova');
    expect(reply).toContain('Formato:');
  });

  it('retorna estrategia para disciplina especifica do ENEM no modo local', async () => {
    const reply = await captureReply('Como estudar genetica para o ENEM?');

    expect(reply).toContain('ENEM');
    expect(reply).toContain('Biologia');
    expect(reply).toContain('genetica');
  });

  it('retorna estrategia para disciplina de concurso no modo local', async () => {
    const reply = await captureReply('Como estudar direito constitucional para concurso?');

    expect(reply).toContain('Concurso');
    expect(reply).toContain('Direito Constitucional');
    expect(reply).toContain('20 questoes');
  });
});