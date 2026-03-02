import type { MentorBriefingRequest, MentorBriefingResult, MentorMode, MentorOutput, MentorTrigger } from '../types/mentor';
import { mentorLLMService } from './mentorLLM.service';
import { mentorResponseValidatorService } from './mentorResponseValidator.service';

const STORAGE_PREFIX = 'mdz_mentor_llm_calls_';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CALLS_PER_WEEK = 2;

const getStorageKey = (userKey: string) => `${STORAGE_PREFIX}${userKey}`;

const getWeeklyCallCount = (userKey: string): number => {
  try {
    const raw = localStorage.getItem(getStorageKey(userKey));
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { count: number; startedAt: string };
    if (!parsed?.startedAt) return 0;

    const startedAt = new Date(parsed.startedAt).getTime();
    if (Date.now() - startedAt > WEEK_MS) return 0;
    return parsed.count || 0;
  } catch {
    return 0;
  }
};

const bumpWeeklyCallCount = (userKey: string): void => {
  try {
    const raw = localStorage.getItem(getStorageKey(userKey));
    const parsed = raw ? (JSON.parse(raw) as { count: number; startedAt: string }) : null;

    if (!parsed || Date.now() - new Date(parsed.startedAt).getTime() > WEEK_MS) {
      localStorage.setItem(getStorageKey(userKey), JSON.stringify({ count: 1, startedAt: new Date().toISOString() }));
      return;
    }

    localStorage.setItem(
      getStorageKey(userKey),
      JSON.stringify({ count: (parsed.count || 0) + 1, startedAt: parsed.startedAt }),
    );
  } catch {
    // ignore
  }
};

const resolveMode = (request: MentorBriefingRequest): MentorMode => {
  if (request.daysToExam <= 30) return 'reta_final';
  if (request.trigger === 'inactivity_48h') return 'recovery';
  return 'default';
};

const isAllowedTrigger = (trigger: MentorTrigger): boolean => {
  return ['weekly_start', 'inactivity_48h', 'goal_below_70', 'chat_opened', 'final_30_days'].includes(trigger);
};

const buildFallback = (request: MentorBriefingRequest): MentorOutput => {
  const mode = resolveMode(request);
  const weak = request.weakPoints[0] || 'disciplina prioritária';

  return {
    prioridade: request.engineDecision.prioridadeAtual,
    justificativa: `${request.engineDecision.justificativa} Foco imediato em ${weak}.`,
    acao_semana: request.engineDecision.acoesSemana.slice(0, 2),
    tom: mode,
    mensagem_motivacional:
      mode === 'recovery'
        ? 'Recuperar consistência vem antes de acelerar. Um passo por dia.'
        : mode === 'reta_final'
          ? 'Agora é execução estratégica. Menos volume, mais acerto.'
          : 'Você está no caminho certo. Consistência diária vence intensidade isolada.',
  };
};

class MentorBriefingService {
  async getBriefing(request: MentorBriefingRequest): Promise<MentorBriefingResult> {
    if (!isAllowedTrigger(request.trigger)) {
      return { output: buildFallback(request), source: 'fallback' };
    }

    const weeklyCalls = getWeeklyCallCount(request.userKey);
    const allowLlm = mentorLLMService.isEnabled() && weeklyCalls < MAX_CALLS_PER_WEEK;

    if (!allowLlm) {
      return { output: buildFallback(request), source: 'fallback' };
    }

    const llmOutput = await mentorLLMService.generateBriefing(request);
    if (!llmOutput) {
      return { output: buildFallback(request), source: 'fallback' };
    }

    const validation = mentorResponseValidatorService.validate(llmOutput, request.engineDecision);
    if (!validation.valid) {
      return { output: buildFallback(request), source: 'fallback' };
    }

    bumpWeeklyCallCount(request.userKey);
    return { output: llmOutput, source: 'llm' };
  }
}

export const mentorBriefingService = new MentorBriefingService();
