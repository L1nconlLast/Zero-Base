import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ROOT, 'qa-artifacts', 'track-coherence-preview-check-report.json');
const PREVIEW_BASE_URL = String(process.env.PREVIEW_BASE_URL || process.argv[2] || '').trim().replace(/\/+$/, '');
const PREVIEW_SHARE_TOKEN = String(process.env.PREVIEW_SHARE_TOKEN || '').trim();
const PREVIEW_BYPASS_TOKEN = String(process.env.PREVIEW_BYPASS_TOKEN || '').trim();
const SCHEDULE_STORAGE_KEY = 'mdz_study_schedule';

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

class CDPSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) {
        const handlers = this.listeners.get(message.method) || [];
        handlers.forEach((handler) => handler(message.params || {}));
        return;
      }

      const pending = this.pending.get(message.id);
      if (!pending) {
        return;
      }

      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message || `CDP error on ${pending.method}`));
        return;
      }

      pending.resolve(message.result);
    };
  }

  async send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    const handlers = this.listeners.get(method) || [];
    handlers.push(handler);
    this.listeners.set(method, handlers);
  }

  async close() {
    this.socket.close();
  }
}

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const toDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const addDays = (date, days) => {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
};

const ensureArtifactsDir = async () => {
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
};

const fileExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const parseDotEnv = async (targetPath) => {
  if (!(await fileExists(targetPath))) {
    return {};
  }

  const raw = await fs.readFile(targetPath, 'utf8');
  return raw.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return acc;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      return acc;
    }

    acc[trimmed.slice(0, separatorIndex).trim()] = trimmed.slice(separatorIndex + 1).trim();
    return acc;
  }, {});
};

const readJsonIfExists = async (targetPath) => {
  if (!(await fileExists(targetPath))) {
    return {};
  }

  return JSON.parse(await fs.readFile(targetPath, 'utf8'));
};

const withPreviewShareUrl = (rawUrl) => {
  if (!PREVIEW_SHARE_TOKEN) {
    return rawUrl;
  }

  const url = new URL(rawUrl);
  url.searchParams.set('_vercel_share', PREVIEW_SHARE_TOKEN);
  return url.toString();
};

const waitForHttp = async (port, endpoint = '/json/version') => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${endpoint}`);
      if (response.ok) {
        return;
      }
    } catch {
      // keep polling
    }

    await delay(150);
  }

  throw new Error(`Chrome headless nao respondeu na porta ${port}.`);
};

const findChromePath = async () => {
  for (const candidate of chromeCandidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error('Nenhum Chrome/Edge encontrado para o smoke cross-track.');
};

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-track-preview-'));
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--metrics-recording-only',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  chrome.unref();
  await waitForHttp(port);
  const pageTarget = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
    .then((response) => response.json());
  const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  const session = new CDPSession(socket);
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Network.enable');

  return {
    session,
    close: async () => {
      try {
        await session.close();
      } catch {}

      chrome.kill();
      await delay(300);

      try {
        await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch {}
    },
  };
};

const buildAuthStorageKey = (supabaseUrl) => {
  const ref = new URL(supabaseUrl).host.split('.')[0];
  return `sb-${ref}-auth-token`;
};

const decodeJwtPayload = (token) => {
  try {
    const [, payload] = String(token || '').split('.');
    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalizedPayload + '='.repeat((4 - (normalizedPayload.length % 4 || 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

const createBrowserSessionPayload = async (supabaseUrl, publishableKey, email, password) => {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao criar sessao do navegador (${response.status}): ${body.slice(0, 240)}`);
  }

  return response.json();
};

const createTempConfirmedUser = async (supabaseUrl, serviceRoleKey, email, password, displayName, preferredTrack) => {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: displayName,
        preferred_track: preferredTrack,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao criar usuario temporario (${response.status}): ${body.slice(0, 240)}`);
  }

  return response.json();
};

const deleteTempUser = async (supabaseUrl, serviceRoleKey, userId) => {
  if (!userId) {
    return;
  }

  await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  }).catch(() => undefined);
};

const registerPreviewUser = async (baseUrl, email, password, displayName) => {
  const response = await fetch(withPreviewShareUrl(`${baseUrl}/api/auth/register`), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(PREVIEW_BYPASS_TOKEN
        ? {
          'x-vercel-protection-bypass': PREVIEW_BYPASS_TOKEN,
        }
        : {}),
    },
    body: JSON.stringify({
      name: displayName,
      email,
      password,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao registrar usuario no preview (${response.status}): ${body.slice(0, 240)}`);
  }

  return response.json();
};

const evalInPage = async (session, expression) => {
  const result = await session.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  return result.result?.value;
};

const waitFor = async (session, predicateExpression, { timeoutMs = 30000, intervalMs = 150, label = 'condicao' } = {}) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await evalInPage(session, predicateExpression);
    if (value) {
      return value;
    }
    await delay(intervalMs);
  }

  throw new Error(`Timeout aguardando ${label}.`);
};

const waitForSelector = async (session, selector, options = {}) =>
  waitFor(
    session,
    `(() => Boolean(document.querySelector(${JSON.stringify(selector)})))()`,
    { ...options, label: `selector ${selector}` },
  );

const dismissIfPresent = async (session, text, { exact = false } = {}) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = ${normalize.toString()};
      const target = normalize(${JSON.stringify(text)});
      const nodes = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const match = nodes.find((candidate) => {
        const content = normalize(candidate.textContent || '');
        return ${exact ? 'content === target' : 'content.includes(target)'};
      });
      if (!match) return false;
      match.click();
      return true;
    })()`,
  );

  if (clicked) {
    await delay(250);
  }
};

const screenshot = async (session, fileName) => {
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  await fs.writeFile(path.join(ARTIFACTS_DIR, fileName), Buffer.from(data, 'base64'));
};

const setViewport = async (session, width, height, deviceScaleFactor = 1, mobile = false) => {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
};

const navigate = async (session, url, seedScript) => {
  if (seedScript) {
    await session.send('Page.addScriptToEvaluateOnNewDocument', { source: seedScript });
  }
  await session.send('Page.navigate', { url });
  await waitFor(session, 'document.readyState === "complete"', { label: 'load complete' });
  await waitFor(session, 'Boolean(document.body && document.body.innerText.trim().length > 0)', { label: 'conteudo da pagina' });
};

const switchTabInApp = async (session, tab) =>
  evalInPage(
    session,
    `(() => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('tab', ${JSON.stringify(tab)});
      window.history.pushState({}, '', nextUrl.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
      return window.location.href;
    })()`,
  );

const collectTextSnapshot = async (session, selector = 'body') =>
  evalInPage(
    session,
    `(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      return node ? String(node.textContent || '').replace(/\\s+/g, ' ').trim() : '';
    })()`,
  );

const buildSeededUserData = (now, examGoal) => ({
  weekProgress: {
    domingo: { studied: false, minutes: 0 },
    segunda: { studied: true, minutes: 35 },
    terca: { studied: true, minutes: 45 },
    quarta: { studied: false, minutes: 0 },
    quinta: { studied: false, minutes: 0 },
    sexta: { studied: false, minutes: 0 },
    sabado: { studied: false, minutes: 0 },
  },
  completedTopics: {},
  totalPoints: 840,
  streak: 3,
  bestStreak: 5,
  achievements: [],
  level: 2,
  studyHistory: [],
  dailyGoal: 60,
  sessions: [
    {
      date: toDateKey(addDays(now, -1)),
      timestamp: addDays(now, -1).toISOString(),
      minutes: 35,
      points: 30,
      subject: 'Matematica',
      duration: 2100,
      goalMet: true,
      topicName: 'Funcoes',
      accuracy: 0.85,
    },
  ],
  currentStreak: 3,
  examGoal,
});

const buildSeededWeeklySchedule = (date = new Date(), primarySubjects = ['Matematica', 'Biologia']) => {
  const today = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][Math.max(0, Math.min(4, date.getDay() - 1))] || 'monday';
  return {
    weekPlan: {
      monday: { subjectLabels: today === 'monday' ? primarySubjects : [] },
      tuesday: { subjectLabels: today === 'tuesday' ? primarySubjects : [] },
      wednesday: { subjectLabels: today === 'wednesday' ? primarySubjects : [] },
      thursday: { subjectLabels: today === 'thursday' ? primarySubjects : [] },
      friday: { subjectLabels: today === 'friday' ? primarySubjects : [] },
      saturday: { subjectLabels: [] },
      sunday: { subjectLabels: [] },
    },
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    preferences: {
      defaultSessionDurationMinutes: 25,
      sessionsPerDay: 2,
      weeklyGoalSessions: 8,
    },
    updatedAt: date.toISOString(),
  };
};

const buildTrackScenario = (id) => {
  switch (id) {
    case 'enem':
      return {
        id,
        displayName: 'QA ENEM',
        preferredTrack: 'enem',
        examGoal: 'ENEM 2026',
        onboardingMeta: {
          focus: 'enem',
          concurso: null,
          enem: {
            goalId: 'med-usp',
            targetCollege: 'USP',
            targetCourse: 'Medicina',
            triedBefore: 'nao',
            profileLevel: 'iniciante',
          },
          hibrido: null,
          faculdade: null,
          outros: null,
          contextSummary: 'Preparacao inicial ENEM',
          contextDescription: 'Plano configurado para construir base com foco em Medicina na USP.',
        },
        primarySubjects: ['Matematica', 'Biologia'],
        scheduleEntries: (now) => {
          const today = toDateKey(now);
          return [
            {
              id: 'review-enem-1',
              date: today,
              subject: 'Biologia',
              topic: 'Citologia',
              note: 'Revise membrana, organelas e transporte celular.',
              done: false,
              status: 'pendente',
              studyType: 'revisao',
              source: 'ia',
              priority: 'alta',
              aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
              createdAt: `${today}T09:00:00.000Z`,
              updatedAt: `${today}T09:00:00.000Z`,
            },
          ];
        },
        expected: {
          home: ['enem'],
          plan: ['plano principal do enem'],
          study: ['enem /', 'apoio enem'],
          review: ['revisao enem', 'preparacao enem'],
          profile: ['enem', 'primeira vez', 'medicina'],
        },
      };
    case 'concurso':
      return {
        id,
        displayName: 'QA Concurso',
        preferredTrack: 'concursos',
        examGoal: 'Concurso',
        onboardingMeta: {
          focus: 'concurso',
          concurso: {
            id: 'pf-adm-2025',
            nome: 'PF Administrativo 2025',
            banca: 'Cebraspe',
            area: 'Administrativo',
            areaId: 'administrativo',
            examDate: '2026-08-18',
            experienceMode: 'studied_before',
            experienceLevel: 'intermediario',
            planningWithoutDate: false,
          },
          enem: null,
          hibrido: null,
          faculdade: null,
          outros: null,
          contextSummary: 'Plano de concurso',
          contextDescription: 'Plano orientado por edital, banca e prazo para PF Administrativo 2025.',
        },
        primarySubjects: ['Direito Administrativo', 'Portugues'],
        scheduleEntries: (now) => {
          const today = toDateKey(now);
          return [
            {
              id: 'review-concurso-1',
              date: today,
              subject: 'Direito Administrativo',
              topic: 'Poderes Administrativos',
              note: 'Reforce poder regulamentar, disciplinar e de policia.',
              done: false,
              status: 'pendente',
              studyType: 'revisao',
              source: 'ia',
              priority: 'alta',
              aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
              createdAt: `${today}T09:00:00.000Z`,
              updatedAt: `${today}T09:00:00.000Z`,
            },
          ];
        },
        expected: {
          home: ['concurso', 'edital'],
          plan: ['plano principal do edital'],
          study: ['concurso /', 'cebraspe'],
          review: ['revisao do concurso', 'cebraspe'],
          profile: ['concurso', 'pf administrativo 2025', 'cebraspe'],
        },
      };
    case 'faculdade':
      return {
        id,
        displayName: 'QA Faculdade',
        preferredTrack: 'enem',
        examGoal: 'Faculdade',
        onboardingMeta: {
          focus: 'faculdade',
          concurso: null,
          enem: null,
          hibrido: null,
          faculdade: {
            institution: 'IFPI',
            course: 'ADS',
            semester: '3',
            focus: 'provas',
          },
          outros: null,
          contextSummary: 'Plano academico',
          contextDescription: 'Plano focado nas provas da faculdade, com organizacao por materia e proximas entregas.',
        },
        primarySubjects: ['Calculo I', 'Metodologia Cientifica'],
        scheduleEntries: (now) => {
          const today = toDateKey(now);
          return [
            {
              id: 'review-faculdade-1',
              date: today,
              subject: 'Calculo I',
              topic: 'Limites',
              note: 'Retome definicao intuitiva, limites laterais e casos basicos.',
              done: false,
              status: 'pendente',
              studyType: 'revisao',
              source: 'ia',
              priority: 'alta',
              aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
              createdAt: `${today}T09:00:00.000Z`,
              updatedAt: `${today}T09:00:00.000Z`,
            },
          ];
        },
        expected: {
          home: ['faculdade'],
          plan: ['plano das provas da faculdade'],
          study: ['faculdade /', 'apoio academico'],
          review: ['revisao da faculdade'],
          profile: ['faculdade', 'ads', '3o periodo'],
        },
      };
    case 'outros':
      return {
        id,
        displayName: 'QA Outros',
        preferredTrack: 'enem',
        examGoal: 'Trilha pessoal',
        onboardingMeta: {
          focus: 'outros',
          concurso: null,
          enem: null,
          hibrido: null,
          faculdade: null,
          outros: {
            goalTitle: 'JavaScript',
            focus: 'praticar',
            deadline: null,
          },
          contextSummary: 'Trilha pessoal',
          contextDescription: 'Plano flexivel focado em pratica e evolucao constante em JavaScript.',
        },
        primarySubjects: ['JavaScript', 'Ingles'],
        scheduleEntries: (now) => {
          const today = toDateKey(now);
          return [
            {
              id: 'review-outros-1',
              date: today,
              subject: 'JavaScript',
              topic: 'Promises',
              note: 'Revise encadeamento, estados e tratamento de erros.',
              done: false,
              status: 'pendente',
              studyType: 'revisao',
              source: 'ia',
              priority: 'alta',
              aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
              createdAt: `${today}T09:00:00.000Z`,
              updatedAt: `${today}T09:00:00.000Z`,
            },
          ];
        },
        expected: {
          home: ['trilha'],
          plan: ['plano principal da sua trilha'],
          study: ['trilha /', 'apoio da trilha'],
          review: ['revisao da trilha'],
          profile: ['outros', 'javascript', 'praticar'],
        },
      };
    case 'hibrido':
      return {
        id,
        displayName: 'QA Hibrido',
        preferredTrack: 'hibrido',
        examGoal: 'ENEM + Concurso',
        onboardingMeta: {
          focus: 'hibrido',
          concurso: {
            id: 'pf-adm-2025',
            nome: 'PF Administrativo 2025',
            banca: 'Cebraspe',
            area: 'Administrativo',
            areaId: 'administrativo',
            examDate: '2026-08-18',
            experienceMode: 'studied_before',
            experienceLevel: 'intermediario',
            planningWithoutDate: false,
          },
          enem: {
            goalId: 'dir-ufpi',
            targetCollege: 'UFPI',
            targetCourse: 'Direito',
            triedBefore: 'sim',
            profileLevel: 'intermediario',
          },
          hibrido: {
            primaryFocus: 'concurso',
            availableStudyTime: 'medio',
            concursoExamDate: '2026-08-18',
          },
          faculdade: null,
          outros: null,
          contextSummary: 'Plano hibrido',
          contextDescription: 'Plano balanceado entre ENEM e concurso, com prioridade atual no edital.',
        },
        primarySubjects: ['Direito Administrativo', 'Matematica'],
        scheduleEntries: (now) => {
          const today = toDateKey(now);
          return [
            {
              id: 'review-hibrido-1',
              date: today,
              subject: 'Direito Administrativo',
              topic: 'Poderes Administrativos',
              note: 'Reforce poder regulamentar, disciplinar e de policia.',
              done: false,
              status: 'pendente',
              studyType: 'revisao',
              source: 'ia',
              priority: 'alta',
              aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
              createdAt: `${today}T09:00:00.000Z`,
              updatedAt: `${today}T09:00:00.000Z`,
            },
            {
              id: 'review-hibrido-2',
              date: today,
              subject: 'Biologia',
              topic: 'Citologia',
              note: 'Revise membrana, organelas e transporte celular.',
              done: false,
              status: 'pendente',
              studyType: 'revisao',
              source: 'ia',
              priority: 'normal',
              aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
              createdAt: `${today}T09:10:00.000Z`,
              updatedAt: `${today}T09:10:00.000Z`,
            },
          ];
        },
        expected: {
          home: ['hibrido', 'enem'],
          plan: ['plano hibrido com concurso no centro'],
          study: ['origem: concurso', 'concurso /'],
          review: ['revisao hibrida', 'enem'],
          profile: ['hibrido', 'enem + concurso', 'foco: concurso'],
        },
      };
    default:
      throw new Error(`Track nao suportado: ${id}`);
  }
};

const buildBrowserSessionSeed = ({
  email,
  authStorageUrl,
  browserSessionPayload,
  displayName,
  now,
  allowedHosts,
  scenario,
}) => {
  const scope = email.toLowerCase();
  const authStorageKey = buildAuthStorageKey(authStorageUrl);
  const userId = browserSessionPayload?.user?.id || `local:${scope}`;
  const onboardingMeta = scenario.onboardingMeta;
  const entries = [
    [
      'zeroBaseSession',
      JSON.stringify({
        user: {
          nome: displayName,
          email,
          dataCadastro: now.toISOString(),
          foto: 'QA',
          examGoal: scenario.examGoal,
          examDate: onboardingMeta.concurso?.examDate || '',
          preferredTrack: scenario.preferredTrack,
        },
        userId,
      }),
    ],
    [authStorageKey, JSON.stringify(browserSessionPayload)],
    [`zeroBaseData_${scope}`, JSON.stringify(buildSeededUserData(now, scenario.examGoal))],
    [`profileDisplayName_${scope}`, JSON.stringify(displayName)],
    [`preferredStudyTrack_${scope}`, JSON.stringify(scenario.preferredTrack)],
    [`selectedStudyMethodId_${scope}`, JSON.stringify('pomodoro')],
    [`plannedFocusDuration_${scope}`, '25'],
    [`activeStudyMode_${scope}`, JSON.stringify('livre')],
    [`weeklyGoalMinutes_${scope}`, '300'],
    [`academyCompletedContentIds_${scope}`, JSON.stringify([])],
    [`weeklyStudySchedule_${scope}`, JSON.stringify(buildSeededWeeklySchedule(now, scenario.primarySubjects))],
    [`mdzOnboardingCompleted_${scope}`, 'true'],
    [`smartScheduleOnboardingMeta_${userId}`, JSON.stringify(onboardingMeta)],
    ['smartScheduleOnboardingMeta_default', JSON.stringify(onboardingMeta)],
    [`smartScheduleAutoGenerate_${scope}`, 'true'],
    [`smartScheduleAutoGenerate_${userId}`, 'true'],
    ['zb_internal_access', 'true'],
    ['settings-pref-theme', 'light'],
    ['theme', 'blue'],
    ['darkMode', 'false'],
    [SCHEDULE_STORAGE_KEY, JSON.stringify(scenario.scheduleEntries(now))],
  ];

  return `
    (() => {
      const seedGuardKey = '__track_preview_seeded__';
      try {
        const allowedHosts = new Set(${JSON.stringify(allowedHosts)});
        if (!allowedHosts.has(window.location.hostname)) {
          return;
        }
        if ('serviceWorker' in navigator) {
          const noopRegistration = {
            waiting: null,
            installing: null,
            update: async () => undefined,
            addEventListener: () => undefined,
          };
          navigator.serviceWorker.register = async () => noopRegistration;
          navigator.serviceWorker.getRegistrations = async () => [];
          navigator.serviceWorker.addEventListener = () => undefined;
        }
        if (window.sessionStorage.getItem(seedGuardKey) === 'true') {
          return;
        }
        window.sessionStorage.setItem(seedGuardKey, 'true');
        window.localStorage.clear();
        const entries = ${JSON.stringify(entries)};
        for (const [key, value] of entries) {
          window.localStorage.setItem(key, value);
        }
      } catch (error) {
        console.error('track-preview-seed-failed', error);
      }
    })();
  `;
};

const assertContainsAll = (label, haystack, expected) => {
  const normalizedHaystack = normalize(haystack);
  const missing = expected.filter((value) => !normalizedHaystack.includes(normalize(value)));
  if (missing.length > 0) {
    throw new Error(`${label} sem coerencia esperada. Faltando: ${missing.join(', ')}. Texto: ${String(haystack).slice(0, 420)}`);
  }
};

const runScenario = async ({
  scenario,
  publishableKey,
  serviceRoleKey,
  supabaseUrl,
  report,
}) => {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const email = `preview_track_${scenario.id}_${Date.now()}@zerobase.dev`.toLowerCase();
  const password = `TrackPreview@2026!${scenario.id}`;
  let browser = null;
  let tempUserId = null;

  try {
    let authStorageUrl = '';
    let browserSessionPayload = null;

    if (publishableKey && serviceRoleKey && supabaseUrl) {
      const createdUser = await createTempConfirmedUser(
        supabaseUrl,
        serviceRoleKey,
        email,
        password,
        scenario.displayName,
        scenario.preferredTrack,
      );
      tempUserId = createdUser.user?.id || createdUser.id || null;
      browserSessionPayload = await createBrowserSessionPayload(
        supabaseUrl,
        publishableKey,
        email,
        password,
      );
      authStorageUrl = supabaseUrl;
    } else {
      const createdUser = await registerPreviewUser(
        PREVIEW_BASE_URL,
        email,
        password,
        scenario.displayName,
      );
      const accessToken = createdUser?.session?.accessToken || '';
      const accessTokenPayload = decodeJwtPayload(accessToken) || {};
      authStorageUrl = accessTokenPayload.iss || '';
      browserSessionPayload = {
        access_token: accessToken,
        refresh_token: createdUser?.session?.refreshToken,
        expires_at: createdUser?.session?.expiresAt || null,
        expires_in: createdUser?.session?.expiresIn || null,
        token_type: createdUser?.session?.tokenType || 'bearer',
        user: {
          id: createdUser?.user?.id || accessTokenPayload.sub || `preview:${email}`,
          aud: accessTokenPayload.aud || 'authenticated',
          role: accessTokenPayload.role || 'authenticated',
          email,
          created_at: new Date().toISOString(),
          user_metadata: {
            name: scenario.displayName,
            preferred_track: scenario.preferredTrack,
          },
          app_metadata: {
            provider: 'email',
            providers: ['email'],
          },
        },
      };
    }

    browser = await launchChrome(11700 + Math.floor(Math.random() * 200));
    const allowedHosts = Array.from(new Set(['127.0.0.1', 'localhost', new URL(PREVIEW_BASE_URL).hostname]));
    const initialUrl = new URL(PREVIEW_BASE_URL);
    initialUrl.searchParams.set('tab', 'inicio');
    initialUrl.searchParams.set('qa', `track-${scenario.id}`);
    if (PREVIEW_BYPASS_TOKEN) {
      await browser.session.send('Network.setExtraHTTPHeaders', {
        headers: {
          'x-vercel-protection-bypass': PREVIEW_BYPASS_TOKEN,
        },
      });
      initialUrl.searchParams.set('x-vercel-set-bypass-cookie', 'true');
      initialUrl.searchParams.set('x-vercel-protection-bypass', PREVIEW_BYPASS_TOKEN);
    }

    await setViewport(browser.session, 1440, 1280);
    await navigate(
      browser.session,
      withPreviewShareUrl(initialUrl.toString()),
      buildBrowserSessionSeed({
        email,
        authStorageUrl,
        browserSessionPayload,
        displayName: scenario.displayName,
        now,
        allowedHosts,
        scenario,
      }),
    );

    await dismissIfPresent(browser.session, 'Agora nao');
    await dismissIfPresent(browser.session, 'Fechar', { exact: true });

    try {
      await waitForSelector(browser.session, '[data-testid="home-continuity-panel"]', { timeoutMs: 40000 });
    } catch (error) {
      const failureText = await collectTextSnapshot(browser.session, 'body').catch(() => '');
      await screenshot(browser.session, `track-${scenario.id}-home-failure.png`).catch(() => undefined);
      throw new Error(
        `Home nao carregou para ${scenario.id}. ${error instanceof Error ? error.message : String(error)} Texto: ${failureText.slice(0, 500)}`,
      );
    }
    const homeText = await collectTextSnapshot(browser.session, 'body');
    assertContainsAll(`${scenario.id} home`, homeText, scenario.expected.home);
    await screenshot(browser.session, `track-${scenario.id}-home.png`);

    await switchTabInApp(browser.session, 'cronograma');
    await waitForSelector(browser.session, '[data-testid="plan-header"]', { timeoutMs: 40000 });
    const planText = await collectTextSnapshot(browser.session, 'body');
    assertContainsAll(`${scenario.id} plano`, planText, scenario.expected.plan);

    await switchTabInApp(browser.session, 'foco');
    await waitForSelector(browser.session, '[data-testid="study-page-layout"]', { timeoutMs: 40000 });
    const studyText = await collectTextSnapshot(browser.session, 'body');
    assertContainsAll(`${scenario.id} estudo`, studyText, scenario.expected.study);

    await switchTabInApp(browser.session, 'flashcards');
    await waitForSelector(browser.session, '[data-testid="review-page-layout"]', { timeoutMs: 40000 });
    const reviewText = await collectTextSnapshot(browser.session, 'body');
    assertContainsAll(`${scenario.id} revisao`, reviewText, scenario.expected.review);
    await screenshot(browser.session, `track-${scenario.id}-review.png`);

    await switchTabInApp(browser.session, 'perfil');
    await waitForSelector(browser.session, '[data-testid="profile-page-layout"]', { timeoutMs: 40000 });
    await waitForSelector(browser.session, '[data-testid="profile-context-panel"]', { timeoutMs: 40000 });
    const profileText = await collectTextSnapshot(browser.session, 'body');
    assertContainsAll(`${scenario.id} perfil`, profileText, scenario.expected.profile);

    report.scenarios.push({
      track: scenario.id,
      status: 'passed',
      homeExcerpt: homeText.slice(0, 280),
      planExcerpt: planText.slice(0, 280),
      studyExcerpt: studyText.slice(0, 280),
      reviewExcerpt: reviewText.slice(0, 280),
      profileExcerpt: profileText.slice(0, 280),
      screenshots: [
        `qa-artifacts/track-${scenario.id}-home.png`,
        `qa-artifacts/track-${scenario.id}-review.png`,
      ],
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
    if (tempUserId && serviceRoleKey && supabaseUrl) {
      await deleteTempUser(supabaseUrl, serviceRoleKey, tempUserId);
    }
  }
};

const main = async () => {
  if (!PREVIEW_BASE_URL) {
    throw new Error('Informe PREVIEW_BASE_URL ou passe a URL do preview como primeiro argumento.');
  }

  await ensureArtifactsDir();

  const envFile = await parseDotEnv(path.join(ROOT, '.env'));
  const cypressEnv = await readJsonIfExists(path.join(ROOT, 'cypress.env.json'));
  const publishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || cypressEnv.SUPABASE_PUBLISHABLE_KEY
    || envFile.VITE_SUPABASE_PUBLISHABLE_KEY
    || envFile.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY
    || cypressEnv.SUPABASE_SERVICE_ROLE_KEY
    || envFile.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl =
    process.env.SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || cypressEnv.SUPABASE_URL
    || envFile.SUPABASE_URL
    || envFile.VITE_SUPABASE_URL;

  const report = {
    generatedAt: new Date().toISOString(),
    previewUrl: PREVIEW_BASE_URL,
    previewShareEnabled: Boolean(PREVIEW_SHARE_TOKEN),
    previewBypassEnabled: Boolean(PREVIEW_BYPASS_TOKEN),
    scenarios: [],
  };

  for (const track of ['enem', 'concurso', 'faculdade', 'outros', 'hibrido']) {
    await runScenario({
      scenario: buildTrackScenario(track),
      publishableKey,
      serviceRoleKey,
      supabaseUrl,
      report,
    });
  }

  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
};

main().catch(async (error) => {
  const failureReport = {
    generatedAt: new Date().toISOString(),
    previewUrl: PREVIEW_BASE_URL,
    error: error instanceof Error ? error.message : String(error),
  };
  await ensureArtifactsDir().catch(() => undefined);
  await fs.writeFile(REPORT_PATH, JSON.stringify(failureReport, null, 2)).catch(() => undefined);
  console.error(error);
  process.exitCode = 1;
});
