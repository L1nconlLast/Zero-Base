import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { resolveAuthUser, sendError } from '../_lib/supabase.js';

const BLOCKED_PATTERNS = /(qual assunto vai cair|atalho|chute|gabarito|milagre)/i;

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

const StudentContextSchema = z.object({
  userName: z.string().min(1).max(100),
  objective: z.enum(['enem', 'concurso', 'hibrido']),
  examName: z.string().min(1).max(120),
  examDate: z.string().min(1).max(40).optional(),
  daysToExam: z.number().int().min(0).max(1500),
  strongArea: z.string().min(1).max(80),
  weakArea: z.string().min(1).max(80),
  currentWeeklyFocus: z.string().min(1).max(80).optional(),
  weeklyPct: z.number().min(0).max(100),
  todayMinutes: z.number().min(0).max(1440),
  pendingReviews: z.number().int().min(0).max(500),
  overdueReviews: z.number().int().min(0).max(500),
  streak: z.number().int().min(0),
  previousFocus: z.string().min(1).max(80).optional(),
  lastRecommendation: z.string().min(1).max(240).optional(),
  sessionsLast7Days: z.number().int().min(0).max(30).optional(),
  completedMockExams: z.number().int().min(0).max(200).optional(),
  nextRecommendedSession: z.object({
    subject: z.string().min(1).max(80),
    durationMin: z.number().int().min(1).max(240),
    format: z.enum(['focus', 'review', 'questions', 'mixed']),
    reason: z.string().min(1).max(240),
  }).optional(),
  trigger: z.enum(['weekly_start', 'inactivity_48h', 'goal_below_70', 'chat_opened', 'final_30_days']),
});

const DecisionContextSchema = z.object({
  moment: z.string().min(1).max(80),
  responseKind: z.string().min(1).max(80),
  primarySubject: z.string().min(1).max(80).optional(),
  summary: z.string().min(1).max(500),
  response: z.object({
    type: z.string().min(1).max(80),
    nextStep: z.string().min(1).max(180),
    whyNow: z.string().min(1).max(320),
    caution: z.string().min(1).max(220),
    tone: z.enum(['direct', 'supportive']),
    title: z.string().min(1).max(120),
    chips: z.array(z.string().min(1).max(80)).max(6),
  }),
  risk: z.object({
    level: z.enum(['low', 'medium', 'high', 'critical']),
    label: z.string().min(1).max(120),
    summary: z.string().min(1).max(240),
  }),
  actions: z.array(z.object({
    label: z.string().min(1).max(180),
    description: z.string().min(1).max(280),
    subject: z.string().min(1).max(80).optional(),
    durationMin: z.number().int().min(1).max(240).optional(),
    urgency: z.enum(['now', 'today', 'this_week']),
  })).max(6),
  safetyNotes: z.array(z.string().min(1).max(200)).max(6),
});

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(ChatMessageSchema).max(20).default([]),
  studentContext: StudentContextSchema,
  decisionContext: DecisionContextSchema,
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const buildActionLines = (decision: ChatRequest['decisionContext'], limit = 3): string[] =>
  decision.actions
    .slice(0, limit)
    .map((action) => `- ${action.label}: ${action.description}`);

const formatResponseBlocks = (response: ChatRequest['decisionContext']['response']): string => [
  `Proximo passo: ${response.nextStep}.`,
  `Por que agora: ${response.whyNow}`,
  `Cuidado agora: ${response.caution}`,
].join('\n');

const buildLocalReply = ({ message, studentContext, decisionContext }: ChatRequest): string => {
  const normalized = normalizeText(message);

  if (BLOCKED_PATTERNS.test(message)) {
    return 'Nao posso orientar atalhos ou previsoes de prova. Posso te orientar com estrategia real baseada no seu momento atual.';
  }

  if (normalized.includes('plano') || normalized.includes('semana')) {
    return [
      formatResponseBlocks(decisionContext.response),
      'Plano objetivo agora:',
      ...buildActionLines(decisionContext),
    ].join('\n');
  }

  if (normalized.includes('hoje') || normalized.includes('revis') || normalized.includes('agora')) {
    return formatResponseBlocks(decisionContext.response);
  }

  if (normalized.includes('consist') || normalized.includes('streak')) {
    return [
      `Seu streak atual e ${studentContext.streak} dias e o risco do momento esta em ${decisionContext.risk.label.toLowerCase()}.`,
      `Por que agora: ${decisionContext.response.whyNow}`,
      `Meta minima agora: ${decisionContext.response.nextStep}.`,
    ].join('\n');
  }

  if (normalized.includes('foco') || normalized.includes('equilibr')) {
    return [
      formatResponseBlocks(decisionContext.response),
      `Ajuste de foco: ${decisionContext.summary}`,
    ].join('\n');
  }

  if (studentContext.nextRecommendedSession) {
    return [
      formatResponseBlocks(decisionContext.response),
      `Motivo: ${studentContext.nextRecommendedSession.reason}`,
    ].join('\n');
  }

  return [
    formatResponseBlocks(decisionContext.response),
    '',
    'Acoes de apoio:',
    ...buildActionLines(decisionContext, 2),
  ].join('\n');
};

const writeEvent = (res: any, event: string, data: unknown) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any): Promise<void> {
  const requestId = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', requestId);

  if (req.method !== 'POST') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
    return;
  }

  const auth = await resolveAuthUser(req.headers.authorization);
  if (auth.ok === false) {
    sendError(res, auth.status, 'UNAUTHORIZED', auth.message);
    return;
  }

  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Payload invalido.', parsed.error.flatten().fieldErrors);
    return;
  }

  const reply = buildLocalReply(parsed.data);

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  writeEvent(res, 'chunk', { text: reply });
  writeEvent(res, 'done', {
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    provider: 'local',
    userId: auth.user.id,
  });
  res.end();
}
