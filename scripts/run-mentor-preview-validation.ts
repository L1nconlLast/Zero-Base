import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import type { AdaptiveSnapshot } from '../src/services/adaptiveLearning.service';
import { buildMentorMemoryRuntime } from '../src/services/mentorMemory.service';
import { buildMentorDecisionInput } from '../src/features/mentor/context/buildMentorDecisionInput';
import { mentorDecisionEngine } from '../src/features/mentor/decision/mentorDecisionEngine';
import { buildMentorBriefingRequest } from '../src/features/mentor/generation/buildMentorBriefingRequest';
import { buildMentorChatPayload } from '../src/features/mentor/generation/buildMentorChatPayload';
import { composeMentorFallbackReply } from '../src/features/mentor/generation/mentorFallbackComposer';
import type { UserData } from '../src/types';
import type { MentorBriefingRequest, MentorOutput, MentorTrigger } from '../src/types/mentor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'mentor-preview-validation-report.json');
const PREVIEW_URL = process.env.MENTOR_PREVIEW_URL || 'https://zero-base-lfaclaglv-l1nconllasts-projects.vercel.app';
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

type PreferredTrack = 'enem' | 'concursos' | 'hibrido';

interface ScenarioDefinition {
  id: string;
  title: string;
  prompt: string;
  note?: string;
  userName: string;
  examGoal?: string;
  examDate?: string;
  preferredTrack?: PreferredTrack;
  weeklyGoalMinutes: number;
  daysToExam: number;
  trigger: MentorTrigger;
  userData: UserData;
  adaptiveSnapshot?: AdaptiveSnapshot;
  now?: Date;
}

interface ScenarioResult {
  id: string;
  title: string;
  prompt: string;
  note?: string;
  expected: {
    playbookId: string;
    moment: string;
    responseKind: string;
    primarySubject?: string;
    risk: string;
    nextStep: string;
    whyNow: string;
    caution: string;
  };
  briefing: {
    source: 'fallback';
    prioridade: string;
    justificativa: string;
    acao_semana: string[];
    mensagem_motivacional: string;
  };
  fallbackReply: string;
  previewChatReply: string;
}

const fileExists = async (targetPath: string) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const parseDotEnv = async (targetPath: string): Promise<Record<string, string>> => {
  if (!(await fileExists(targetPath))) {
    return {};
  }

  const raw = await fs.readFile(targetPath, 'utf8');
  return raw.split(/\r?\n/).reduce<Record<string, string>>((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return acc;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      return acc;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    acc[key] = value;
    return acc;
  }, {});
};

const readJsonIfExists = async <T>(targetPath: string, fallback: T): Promise<T> => {
  if (!(await fileExists(targetPath))) {
    return fallback;
  }

  const raw = await fs.readFile(targetPath, 'utf8');
  return JSON.parse(raw) as T;
};

const isoAt = (value: string) => new Date(value).toISOString();

const makeUserData = (
  sessions: UserData['studyHistory'],
  weekProgress: UserData['weekProgress'],
  currentStreak = 0,
): UserData => ({
  weekProgress,
  completedTopics: {},
  totalPoints: 0,
  streak: currentStreak,
  bestStreak: currentStreak,
  achievements: [],
  level: 3,
  studyHistory: sessions,
  dailyGoal: 60,
  sessions: [],
  currentStreak,
});

const emptyAdaptiveSnapshot = (): AdaptiveSnapshot => ({
  attempts: [],
  topicMetrics: [],
  reviewPlan: [],
  weeklyEvolution: [],
  summary: {
    totalAttempts: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    globalAccuracyRate: 0,
    averageResponseTimeSeconds: 0,
    weakTopics: 0,
    inconsistencyRate: 0,
    estimatedEnemScore: 0,
  },
});

const resolveMode = (request: MentorBriefingRequest) => {
  if (request.daysToExam <= 30) return 'reta_final' as const;
  if (request.trigger === 'inactivity_48h') return 'recovery' as const;
  return 'default' as const;
};

const buildBriefingFallback = (request: MentorBriefingRequest): MentorOutput => {
  const mode = resolveMode(request);
  const weak = request.weakPoints[0] || 'disciplina prioritaria';

  return {
    prioridade: request.engineDecision.prioridadeAtual,
    justificativa: `${request.engineDecision.justificativa} Foco imediato em ${weak}.`,
    acao_semana: request.engineDecision.acoesSemana.slice(0, 2),
    tom: mode,
    mensagem_motivacional:
      mode === 'recovery'
        ? 'Recuperar consistencia vem antes de acelerar. Um passo por dia.'
        : mode === 'reta_final'
          ? 'Agora e execucao estrategica. Menos volume, mais acerto.'
          : 'Voce esta no caminho certo. Consistencia diaria vence intensidade isolada.',
  };
};

const parseSseText = (raw: string) => {
  let fullReply = '';
  let lastError = '';

  raw
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .forEach((block) => {
      const lines = block.split(/\r?\n/);
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

      if (!data) {
        return;
      }

      try {
        const parsed = JSON.parse(data) as { text?: string; error?: string };
        if (eventName === 'chunk' && parsed.text) {
          fullReply += parsed.text;
        }
        if (eventName === 'error' && parsed.error) {
          lastError = parsed.error;
        }
      } catch {
        // ignore malformed blocks
      }
    });

  if (!fullReply.trim() && lastError) {
    throw new Error(lastError);
  }

  return fullReply.trim() || raw.trim();
};

const runProcess = async (command: string, args: string[], cwd: string) =>
  new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => resolve({ stdout, stderr, code }));
  });

const createAccessToken = async (supabaseUrl: string, publishableKey: string, email: string, password: string) => {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao criar sessao Supabase (${response.status}): ${body.slice(0, 200)}`);
  }

  const json = await response.json() as { access_token?: string };
  if (!json.access_token) {
    throw new Error('Sessao Supabase retornou sem access_token.');
  }

  return json.access_token;
};

const requestPreviewChat = async (payload: unknown, accessToken: string) => {
  const payloadPath = path.join(
    ARTIFACTS_DIR,
    `mentor-preview-payload-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );

  await fs.writeFile(payloadPath, JSON.stringify(payload), 'utf8');

  const safePreviewUrl = PREVIEW_URL.replace(/'/g, "''");
  const safeToken = accessToken.replace(/'/g, "''");
  const safePayloadPath = payloadPath.replace(/'/g, "''");
  const commandText = [
    `npx.cmd vercel curl /api/mentor/chat --deployment '${safePreviewUrl}' --`,
    `-X POST`,
    `-H 'Content-Type: application/json'`,
    `-H 'Accept: text/event-stream'`,
    `-H 'Authorization: Bearer ${safeToken}'`,
    `--data-binary '@${safePayloadPath}'`,
    `--silent`,
    `--show-error`,
  ].join(' ');

  try {
    const { stdout, stderr, code } = await runProcess(
      POWERSHELL,
      ['-NoProfile', '-Command', commandText],
      ROOT,
    );
    if (code !== 0) {
      throw new Error(`vercel curl falhou (${code}): ${stderr || stdout}`);
    }

    const parsed = parseSseText(stdout);
    if (!parsed) {
      throw new Error(
        `vercel curl retornou stream vazio. stdout=${JSON.stringify(stdout.slice(0, 800))} stderr=${JSON.stringify(stderr.slice(0, 800))}`,
      );
    }

    return parsed;
  } finally {
    await fs.rm(payloadPath, { force: true }).catch(() => undefined);
  }
};

const buildScenarios = (): ScenarioDefinition[] => ([
  {
    id: 'today-zero-exam-near',
    title: 'Hoje zerado + prova proxima',
    prompt: 'Hoje eu ainda nao estudei e a prova esta perto. Qual e meu melhor proximo passo agora?',
    userName: 'QA Mentor',
    examGoal: 'ENEM',
    examDate: '2026-04-11',
    preferredTrack: 'enem',
    weeklyGoalMinutes: 300,
    daysToExam: 14,
    trigger: 'chat_opened',
    now: new Date('2026-03-28T10:00:00.000Z'),
    userData: makeUserData(
      [
        { date: isoAt('2026-03-26T10:00:00.000Z'), minutes: 25, points: 0, subject: 'Matematica', duration: 25 },
        { date: isoAt('2026-03-25T10:00:00.000Z'), minutes: 40, points: 0, subject: 'Linguagens', duration: 40 },
      ],
      {
        domingo: { studied: false, minutes: 0 },
        segunda: { studied: true, minutes: 25 },
        terca: { studied: true, minutes: 40 },
        quarta: { studied: false, minutes: 0 },
        quinta: { studied: false, minutes: 0 },
        sexta: { studied: false, minutes: 0 },
        sabado: { studied: false, minutes: 0 },
      },
      2,
    ),
  },
  {
    id: 'review-backlog-weak-week',
    title: 'Revisao atrasada + semana fraca',
    prompt: 'Minha semana foi fraca e estou com revisoes acumuladas. Como retomar sem tentar recuperar tudo de uma vez?',
    note: 'Cenario validado por input estruturado + preview API. O backlog vencido ainda nao e naturalmente seedavel no browser pelo modelo atual do adaptive store.',
    userName: 'QA Mentor',
    examGoal: 'ENEM',
    preferredTrack: 'enem',
    weeklyGoalMinutes: 300,
    daysToExam: 60,
    trigger: 'goal_below_70',
    now: new Date('2026-03-28T10:00:00.000Z'),
    adaptiveSnapshot: {
      ...emptyAdaptiveSnapshot(),
      topicMetrics: [
        {
          key: 'Matematica:porcentagem',
          subject: 'Matematica',
          topic: 'Porcentagem',
          totalAttempts: 8,
          correctAttempts: 2,
          incorrectAttempts: 6,
          accuracyRate: 25,
          errorRate: 75,
          averageResponseTimeSeconds: 80,
          averageDifficultyWeight: 1,
          weightedDomainScore: 28,
          lastReviewedAt: '2026-03-22T08:00:00.000Z',
          recencyFactor: 1.4,
          priorityScore: 88,
          status: 'weak',
        },
      ],
      reviewPlan: [
        {
          id: 'review-1',
          subject: 'Matematica',
          topic: 'Porcentagem',
          reviewStage: 1,
          scheduledFor: '2026-03-26T08:00:00.000Z',
          reason: 'Erro recorrente.',
        },
        {
          id: 'review-2',
          subject: 'Matematica',
          topic: 'Regra de 3',
          reviewStage: 1,
          scheduledFor: '2026-03-28T12:00:00.000Z',
          reason: 'Erro recorrente.',
        },
      ],
    },
    userData: makeUserData(
      [
        { date: isoAt('2026-03-27T09:00:00.000Z'), minutes: 15, points: 0, subject: 'Matematica', duration: 15 },
        { date: isoAt('2026-03-26T09:00:00.000Z'), minutes: 20, points: 0, subject: 'Linguagens', duration: 20 },
      ],
      {
        domingo: { studied: false, minutes: 0 },
        segunda: { studied: true, minutes: 15 },
        terca: { studied: true, minutes: 20 },
        quarta: { studied: false, minutes: 0 },
        quinta: { studied: false, minutes: 0 },
        sexta: { studied: false, minutes: 0 },
        sabado: { studied: false, minutes: 0 },
      },
      1,
    ),
  },
  {
    id: 'steady-progress-clear-next-step',
    title: 'Bom progresso + proximo passo claro',
    prompt: 'Hoje fui bem. Qual e o proximo bloco mais inteligente agora?',
    userName: 'QA Mentor',
    examGoal: 'ENEM',
    preferredTrack: 'enem',
    weeklyGoalMinutes: 180,
    daysToExam: 90,
    trigger: 'chat_opened',
    now: new Date('2026-03-28T10:00:00.000Z'),
    userData: makeUserData(
      [
        { date: isoAt('2026-03-28T08:30:00.000Z'), minutes: 35, points: 0, subject: 'Redacao', duration: 35 },
        { date: isoAt('2026-03-27T08:30:00.000Z'), minutes: 45, points: 0, subject: 'Matematica', duration: 45 },
        { date: isoAt('2026-03-26T08:30:00.000Z'), minutes: 50, points: 0, subject: 'Linguagens', duration: 50 },
      ],
      {
        domingo: { studied: false, minutes: 0 },
        segunda: { studied: true, minutes: 40 },
        terca: { studied: true, minutes: 45 },
        quarta: { studied: true, minutes: 50 },
        quinta: { studied: true, minutes: 35 },
        sexta: { studied: false, minutes: 0 },
        sabado: { studied: false, minutes: 0 },
      },
      5,
    ),
  },
  {
    id: 'subject-imbalance',
    title: 'Foco desequilibrado em uma materia',
    prompt: 'Estou estudando demais a mesma materia. Como eu reequilibro meu foco agora?',
    userName: 'QA Mentor',
    examGoal: 'ENEM',
    preferredTrack: 'enem',
    weeklyGoalMinutes: 240,
    daysToExam: 80,
    trigger: 'chat_opened',
    now: new Date('2026-03-29T10:00:00.000Z'),
    userData: makeUserData(
      [
        { date: isoAt('2026-03-29T08:00:00.000Z'), minutes: 60, points: 0, subject: 'Matematica', duration: 60 },
        { date: isoAt('2026-03-28T08:00:00.000Z'), minutes: 50, points: 0, subject: 'Matematica', duration: 50 },
        { date: isoAt('2026-03-27T08:00:00.000Z'), minutes: 45, points: 0, subject: 'Matematica', duration: 45 },
        { date: isoAt('2026-03-26T08:00:00.000Z'), minutes: 15, points: 0, subject: 'Redacao', duration: 15 },
        { date: isoAt('2026-03-25T08:00:00.000Z'), minutes: 10, points: 0, subject: 'Linguagens', duration: 10 },
      ],
      {
        domingo: { studied: false, minutes: 0 },
        segunda: { studied: true, minutes: 45 },
        terca: { studied: true, minutes: 50 },
        quarta: { studied: true, minutes: 15 },
        quinta: { studied: true, minutes: 10 },
        sexta: { studied: true, minutes: 60 },
        sabado: { studied: false, minutes: 0 },
      },
      2,
    ),
  },
]);

const buildScenarioResult = async (scenario: ScenarioDefinition, accessToken: string): Promise<ScenarioResult> => {
  const runtime = buildMentorMemoryRuntime({
    userData: scenario.userData,
    weeklyGoalMinutes: scenario.weeklyGoalMinutes,
    daysToExam: scenario.daysToExam,
    trigger: scenario.trigger,
    previousMemory: null,
  });

  const input = buildMentorDecisionInput({
    userKey: scenario.id,
    examGoal: scenario.examGoal,
    examDate: scenario.examDate,
    preferredTrack: scenario.preferredTrack,
    userData: scenario.userData,
    weeklyGoalMinutes: scenario.weeklyGoalMinutes,
    daysToExam: scenario.daysToExam,
    trigger: scenario.trigger,
    memory: runtime.memory,
    runtime,
    adaptiveSnapshot: scenario.adaptiveSnapshot || emptyAdaptiveSnapshot(),
    now: scenario.now,
  });

  const decision = mentorDecisionEngine.decide(input);
  const briefingRequest = buildMentorBriefingRequest({
    userKey: scenario.id,
    input,
    decision,
  });
  const briefing = buildBriefingFallback(briefingRequest);
  const fallbackReply = composeMentorFallbackReply({
    text: scenario.prompt,
    input,
    decision,
    safeBriefing: briefing,
    lastRecommendation: briefing.acao_semana[0] || decision.response.nextStep,
    previousFocus: input.memory.focusOfWeek || null,
  });
  const payload = buildMentorChatPayload({
    message: scenario.prompt,
    history: [],
    userName: scenario.userName,
    input,
    decision,
    lastRecommendation: briefing.acao_semana[0] || decision.response.nextStep,
    previousFocus: input.memory.focusOfWeek || null,
  });
  const previewChatReply = await requestPreviewChat(payload, accessToken);

  return {
    id: scenario.id,
    title: scenario.title,
    prompt: scenario.prompt,
    note: scenario.note,
    expected: {
      playbookId: decision.playbookId,
      moment: decision.classification.moment,
      responseKind: decision.classification.responseKind,
      primarySubject: decision.classification.primarySubject,
      risk: `${decision.classification.risk.label} (${decision.classification.risk.level})`,
      nextStep: decision.response.nextStep,
      whyNow: decision.response.whyNow,
      caution: decision.response.caution,
    },
    briefing: {
      source: 'fallback',
      prioridade: briefing.prioridade,
      justificativa: briefing.justificativa,
      acao_semana: briefing.acao_semana,
      mensagem_motivacional: briefing.mensagem_motivacional,
    },
    fallbackReply,
    previewChatReply,
  };
};

const main = async () => {
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

  const envFile = await parseDotEnv(path.join(ROOT, '.env'));
  const cypressEnv = await readJsonIfExists<Record<string, string>>(path.join(ROOT, 'cypress.env.json'), {});

  const loginEmail = process.env.E2E_LOGIN_EMAIL || cypressEnv.E2E_LOGIN_EMAIL;
  const loginPassword = process.env.E2E_LOGIN_PASSWORD || cypressEnv.E2E_LOGIN_PASSWORD;
  const publishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || cypressEnv.SUPABASE_PUBLISHABLE_KEY
    || envFile.VITE_SUPABASE_PUBLISHABLE_KEY
    || envFile.VITE_SUPABASE_ANON_KEY;
  const supabaseUrl =
    process.env.SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || cypressEnv.SUPABASE_URL
    || envFile.SUPABASE_URL
    || envFile.VITE_SUPABASE_URL;

  if (!loginEmail || !loginPassword || !publishableKey || !supabaseUrl) {
    throw new Error('Credenciais/config E2E ausentes para validar o preview do Mentor.');
  }

  const accessToken = await createAccessToken(supabaseUrl, publishableKey, loginEmail, loginPassword);
  const scenarios = buildScenarios();
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    // eslint-disable-next-line no-console
    console.log(`Validando cenario: ${scenario.title}`);
    results.push(await buildScenarioResult(scenario, accessToken));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    previewUrl: PREVIEW_URL,
    mode: 'hybrid_preview_validation',
    results,
  };

  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
