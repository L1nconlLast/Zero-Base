import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'review-preview-check-report.json');
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

  throw new Error('Nenhum Chrome/Edge encontrado para o smoke de Revisao.');
};

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-review-preview-'));
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
  const pageTarget = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
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

const createTempConfirmedUser = async (supabaseUrl, serviceRoleKey, email, password, displayName) => {
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
        preferred_track: 'enem',
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

const buildSeededUserData = (now) => ({
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
});

const getWeekdayKey = (date = new Date()) => (
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()]
);

const buildSeededWeeklySchedule = (date = new Date()) => {
  const todayKey = getWeekdayKey(date);
  const tomorrowKey = getWeekdayKey(addDays(date, 1));
  return {
    weekPlan: {
      monday: { subjectLabels: todayKey === 'monday' ? ['Matematica', 'Biologia'] : tomorrowKey === 'monday' ? ['Linguagens'] : [] },
      tuesday: { subjectLabels: todayKey === 'tuesday' ? ['Matematica', 'Biologia'] : tomorrowKey === 'tuesday' ? ['Linguagens'] : [] },
      wednesday: { subjectLabels: todayKey === 'wednesday' ? ['Matematica', 'Biologia'] : tomorrowKey === 'wednesday' ? ['Linguagens'] : [] },
      thursday: { subjectLabels: todayKey === 'thursday' ? ['Matematica', 'Biologia'] : tomorrowKey === 'thursday' ? ['Linguagens'] : [] },
      friday: { subjectLabels: todayKey === 'friday' ? ['Matematica', 'Biologia'] : tomorrowKey === 'friday' ? ['Linguagens'] : [] },
      saturday: { subjectLabels: todayKey === 'saturday' ? ['Matematica', 'Biologia'] : tomorrowKey === 'saturday' ? ['Linguagens'] : [] },
      sunday: { subjectLabels: todayKey === 'sunday' ? ['Matematica', 'Biologia'] : tomorrowKey === 'sunday' ? ['Linguagens'] : [] },
    },
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
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

const buildSeedScheduleEntries = (now) => {
  const todayKey = toDateKey(now);
  const inThreeDays = toDateKey(addDays(now, 3));

  return [
    {
      id: 'review-facil',
      date: todayKey,
      subject: 'Matematica',
      topic: 'Funcoes',
      note: 'Revise dominio, imagem e leitura grafica.',
      done: false,
      status: 'pendente',
      studyType: 'revisao',
      source: 'ia',
      priority: 'alta',
      aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
      createdAt: `${todayKey}T09:00:00.000Z`,
      updatedAt: `${todayKey}T09:00:00.000Z`,
    },
    {
      id: 'review-medio',
      date: todayKey,
      subject: 'Biologia',
      topic: 'Citologia',
      note: 'Revise membrana, organelas e transporte celular.',
      done: false,
      status: 'pendente',
      studyType: 'revisao',
      source: 'ia',
      priority: 'alta',
      aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
      createdAt: `${todayKey}T09:10:00.000Z`,
      updatedAt: `${todayKey}T09:10:00.000Z`,
    },
    {
      id: 'review-dificil',
      date: todayKey,
      subject: 'Historia',
      topic: 'Imperio',
      note: 'Recupere o Segundo Reinado e os marcos politicos centrais.',
      done: false,
      status: 'pendente',
      studyType: 'revisao',
      source: 'manual',
      priority: 'alta',
      aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
      createdAt: `${todayKey}T09:20:00.000Z`,
      updatedAt: `${todayKey}T09:20:00.000Z`,
    },
    {
      id: 'review-errei',
      date: todayKey,
      subject: 'Linguagens',
      topic: 'Interpretacao',
      note: 'Retome inferencia, tese e marcadores de intencao do texto.',
      done: false,
      status: 'pendente',
      studyType: 'revisao',
      source: 'motor',
      priority: 'alta',
      aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
      createdAt: `${todayKey}T09:30:00.000Z`,
      updatedAt: `${todayKey}T09:30:00.000Z`,
    },
    {
      id: 'review-upcoming',
      date: inThreeDays,
      subject: 'Redacao',
      topic: 'Tese',
      note: 'Relembre estrutura de introducao e tese objetiva.',
      done: false,
      status: 'pendente',
      studyType: 'revisao',
      source: 'ia',
      priority: 'normal',
      aiReason: 'Revisao automatica +72h apos feedback facil.',
      createdAt: `${todayKey}T10:00:00.000Z`,
      updatedAt: `${todayKey}T10:00:00.000Z`,
    },
  ];
};

const buildBrowserSessionSeed = ({
  email,
  authStorageUrl,
  browserSessionPayload,
  displayName,
  now,
  allowedHosts,
}) => {
  const scope = email.toLowerCase();
  const authStorageKey = buildAuthStorageKey(authStorageUrl);
  const entries = [
    [
      'zeroBaseSession',
      JSON.stringify({
        user: {
          nome: displayName,
          email,
          dataCadastro: now.toISOString(),
          foto: 'QA',
          examGoal: 'ENEM',
          examDate: '',
          preferredTrack: 'enem',
        },
        userId: `local:${scope}`,
      }),
    ],
    [authStorageKey, JSON.stringify(browserSessionPayload)],
    [`zeroBaseData_${scope}`, JSON.stringify(buildSeededUserData(now))],
    [`profileDisplayName_${scope}`, JSON.stringify(displayName)],
    [`preferredStudyTrack_${scope}`, JSON.stringify('enem')],
    [`selectedStudyMethodId_${scope}`, JSON.stringify('pomodoro')],
    [`plannedFocusDuration_${scope}`, '25'],
    [`activeStudyMode_${scope}`, JSON.stringify('livre')],
    [`weeklyGoalMinutes_${scope}`, '300'],
    [`academyCompletedContentIds_${scope}`, JSON.stringify([])],
    [`weeklyStudySchedule_${scope}`, JSON.stringify(buildSeededWeeklySchedule(now))],
    [`mdzOnboardingCompleted_${scope}`, 'true'],
    ['zb_internal_access', 'true'],
    ['zb_phase_override', JSON.stringify('intermediate')],
    ['settings-pref-theme', 'light'],
    ['theme', 'blue'],
    ['darkMode', 'false'],
    [SCHEDULE_STORAGE_KEY, JSON.stringify(buildSeedScheduleEntries(now))],
  ];

  return `
    (() => {
      const seedGuardKey = '__review_preview_check_seeded__';
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
        console.error('review-preview-check-seed-failed', error);
      }
    })();
  `;
};

const stringifyRemoteValue = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null || value === undefined) {
    return '';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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

const waitForText = async (session, text, options = {}) =>
  waitFor(
    session,
    `(() => {
      const normalize = ${normalize.toString()};
      return normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })()`,
    { ...options, label: `texto "${text}"` },
  );

const waitForSelector = async (session, selector, options = {}) =>
  waitFor(
    session,
    `(() => Boolean(document.querySelector(${JSON.stringify(selector)})))()`,
    { ...options, label: `selector ${selector}` },
  );

const textExists = async (session, text) =>
  evalInPage(
    session,
    `(() => {
      const normalize = ${normalize.toString()};
      return normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })()`,
  );

const dismissIfPresent = async (session, text, options = {}) => {
  if (await textExists(session, text)) {
    await clickByText(session, text, options).catch(() => undefined);
    await delay(250);
  }
};

const clickByText = async (session, text, { exact = false } = {}) => {
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
      match.scrollIntoView({ block: 'center', inline: 'center' });
      match.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error(`Nao encontrei elemento clicavel com texto: ${text}`);
  }
};

const clickSelector = async (session, selector) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return false;
      node.scrollIntoView({ block: 'center', inline: 'center' });
      node.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error(`Nao encontrei selector clicavel: ${selector}`);
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

const collectViewportMetrics = async (session, label) =>
  evalInPage(
    session,
    `(() => {
      const root = document.documentElement;
      return {
        label: ${JSON.stringify(label)},
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: root?.scrollWidth || 0,
        scrollHeight: root?.scrollHeight || 0,
        horizontalOverflow: (root?.scrollWidth || 0) > window.innerWidth + 4,
        bodyExcerpt: String(document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 260),
      };
    })()`,
  );

const collectFailureSnapshot = async (session) =>
  evalInPage(
    session,
    `(() => {
      const bodyText = String(document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
      const onboardingHeading = Array.from(document.querySelectorAll('h1, h2, h3'))
        .map((node) => String(node.textContent || '').replace(/\\s+/g, ' ').trim())
        .find((text) => ${normalize.toString()}(text).includes('bem-vindo') || ${normalize.toString()}(text).includes('onboarding') || ${normalize.toString()}(text).includes('primeira sessao')) || null;
      return {
        url: window.location.href,
        title: document.title,
        bodyExcerpt: bodyText.slice(0, 500),
        hasLoginForm: Boolean(document.querySelector('form input[type="email"], form input[name="email"]')),
        hasPasswordInput: Boolean(document.querySelector('form input[type="password"]')),
        hasReviewLayout: Boolean(document.querySelector('[data-testid="review-page-layout"]')),
        hasHomePanel: Boolean(document.querySelector('[data-testid="home-continuity-panel"]')),
        hasPlanHeader: Boolean(document.querySelector('[data-testid="plan-header"]')),
        onboardingHeading,
      };
    })()`,
  );

const navigate = async (session, url, seedScript) => {
  if (seedScript) {
    await session.send('Page.addScriptToEvaluateOnNewDocument', { source: seedScript });
  }
  await session.send('Page.navigate', { url });
  await waitFor(session, 'document.readyState === "complete"', { label: 'load complete' });
  await waitFor(session, 'Boolean(document.body && document.body.innerText.trim().length > 0)', { label: 'conteudo da pagina' });
};

const reloadPage = async (session) => {
  await session.send('Page.reload');
  await waitFor(session, 'document.readyState === "complete"', { label: 'reload complete' });
  await waitFor(session, 'Boolean(document.body && document.body.innerText.trim().length > 0)', { label: 'conteudo apos reload' });
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

const getStorageJson = async (session, key) =>
  evalInPage(
    session,
    `(() => {
      try {
        const raw = window.localStorage.getItem(${JSON.stringify(key)});
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return { __parseError: String(error) };
      }
    })()`,
  );

const collectReviewSnapshot = async (session) =>
  evalInPage(
    session,
    `(() => {
      const text = (selector) => {
        const node = document.querySelector(selector);
        return node ? String(node.textContent || '').replace(/\\s+/g, ' ').trim() : '';
      };
      return {
        headerStatus: text('[data-testid="review-header-status"]'),
        headerMetrics: text('[data-testid="review-header-metrics"]'),
        headerContext: text('[data-testid="review-header-context"]'),
        title: text('[data-testid="review-core-title"]'),
        meta: text('[data-testid="review-core-meta"]'),
        sequence: text('[data-testid="review-core-sequence"]'),
        nextStep: text('[data-testid="review-core-next-step"]'),
        action: text('[data-testid="review-core-action"]'),
        helper: text('[data-testid="review-feedback"]'),
        answer: text('[data-testid="review-core-answer"]'),
        queueItems: Array.from(document.querySelectorAll('[data-testid^="review-summary-item-"]')).map((node) =>
          String(node.textContent || '').replace(/\\s+/g, ' ').trim()),
      };
    })()`,
  );

const collectHomeSnapshot = async (session) =>
  evalInPage(
    session,
    `(() => {
      const text = (selector) => {
        const node = document.querySelector(selector);
        return node ? String(node.textContent || '').replace(/\\s+/g, ' ').trim() : '';
      };
      return {
        continuity: text('[data-testid="home-continuity-panel"]'),
        support: text('[data-testid="home-support-strip"]'),
      };
    })()`,
  );

const collectPlanSnapshot = async (session) =>
  evalInPage(
    session,
    `(() => {
      const text = (selector) => {
        const node = document.querySelector(selector);
        return node ? String(node.textContent || '').replace(/\\s+/g, ' ').trim() : '';
      };
      return {
        header: text('[data-testid="plan-header"]'),
        nextReview: text('[data-testid="plan-next-step-next-review"]'),
        summaryCycle: text('[data-testid="plan-summary-cycle"]'),
      };
    })()`,
  );

const commitCurrentReview = async (session, feedback) => {
  await clickSelector(session, '[data-testid="review-core-action"]');
  await waitFor(
    session,
    `(() => {
      const meta = document.querySelector('[data-testid="review-core-meta"]');
      return Boolean(meta && String(meta.textContent || '').includes('Resposta aberta'));
    })()`,
    { timeoutMs: 15000, label: 'resposta aberta' },
  );

  await clickSelector(session, `[data-testid="review-feedback-option-${feedback}"]`);
  await waitFor(
    session,
    `(() => {
      const option = document.querySelector(${JSON.stringify(`[data-testid="review-feedback-option-${feedback}"]`)});
      return option?.getAttribute('data-selected') === 'true';
    })()`,
    { timeoutMs: 10000, label: `feedback ${feedback} selecionado` },
  );
  await waitFor(
    session,
    `(() => {
      const cta = document.querySelector('[data-testid="review-core-action"]');
      if (!cta) return false;
      const text = String(cta.textContent || '');
      return text.includes('Proximo item') || text.includes('Fechar fila');
    })()`,
    { timeoutMs: 15000, label: 'cta de avancar revisao' },
  );
  await clickSelector(session, '[data-testid="review-core-action"]');
};

const expectedReviewDates = (now) => ({
  facil: toDateKey(addDays(now, 4)),
  medio: toDateKey(addDays(now, 2)),
  dificil: toDateKey(addDays(now, 1)),
  errei: toDateKey(addDays(now, 1)),
});

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

  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const email = `preview_review_${Date.now()}@zerobase.dev`.toLowerCase();
  const password = 'PreviewReview@2026';
  const displayName = 'QA Preview Review';
  const report = {
    generatedAt: new Date().toISOString(),
    previewUrl: PREVIEW_BASE_URL,
    previewShareEnabled: Boolean(PREVIEW_SHARE_TOKEN),
    previewBypassEnabled: Boolean(PREVIEW_BYPASS_TOKEN),
    steps: [],
    checks: {},
    screenshots: [],
    visualInspection: { pages: [] },
  };

  let browser = null;
  let tempUserId = null;
  const consoleErrors = [];
  const pageExceptions = [];

  try {
    let authStorageUrl = '';
    let browserSessionPayload = null;

    if (publishableKey && serviceRoleKey && supabaseUrl) {
      const createdUser = await createTempConfirmedUser(
        supabaseUrl,
        serviceRoleKey,
        email,
        password,
        displayName,
      );
      tempUserId = createdUser.user?.id || createdUser.id || null;
      browserSessionPayload = await createBrowserSessionPayload(
        supabaseUrl,
        publishableKey,
        email,
        password,
      );
      authStorageUrl = supabaseUrl;
      report.checks.authMode = 'supabase_direct';
    } else {
      const createdUser = await registerPreviewUser(
        PREVIEW_BASE_URL,
        email,
        password,
        displayName,
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
            name: displayName,
            preferred_track: 'enem',
          },
          app_metadata: {
            provider: 'email',
            providers: ['email'],
          },
        },
      };
      report.checks.authMode = 'preview_register_fallback';
    }

    browser = await launchChrome(11600 + Math.floor(Math.random() * 150));
    browser.session.on('Runtime.consoleAPICalled', (params) => {
      if (params.type !== 'error') {
        return;
      }

      consoleErrors.push({
        type: params.type,
        text: (params.args || []).map((arg) => stringifyRemoteValue(arg.value)).filter(Boolean).join(' '),
      });
    });
    browser.session.on('Runtime.exceptionThrown', (params) => {
      const stackFrames = params.exceptionDetails?.stackTrace?.callFrames || [];
      pageExceptions.push({
        text: params.exceptionDetails?.text || 'Runtime exception',
        description: params.exceptionDetails?.exception?.description || null,
        url: params.exceptionDetails?.url || null,
        lineNumber: params.exceptionDetails?.lineNumber ?? null,
        columnNumber: params.exceptionDetails?.columnNumber ?? null,
        stack: stackFrames.map((frame) => ({
          functionName: frame.functionName || '(anonymous)',
          url: frame.url || null,
          lineNumber: frame.lineNumber ?? null,
          columnNumber: frame.columnNumber ?? null,
        })),
      });
    });

    const allowedHosts = Array.from(new Set(['127.0.0.1', 'localhost', new URL(PREVIEW_BASE_URL).hostname]));
    const initialUrl = new URL(PREVIEW_BASE_URL);
    initialUrl.searchParams.set('tab', 'flashcards');
    initialUrl.searchParams.set('qa', 'review-preview');
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
        displayName,
        now,
        allowedHosts,
      }),
    );

    await dismissIfPresent(browser.session, 'Agora nao');
    await dismissIfPresent(browser.session, 'Fechar', { exact: true });
    await waitForSelector(browser.session, '[data-testid="review-page-layout"]', { timeoutMs: 40000 });
    await waitForSelector(browser.session, '[data-testid="review-core-action"]', { timeoutMs: 40000 });

    const initialSnapshot = await collectReviewSnapshot(browser.session);
    report.checks.reviewInitial = initialSnapshot;
    report.steps.push({ name: 'review_queue_loaded', status: 'passed', details: initialSnapshot });

    await screenshot(browser.session, 'preview-review-active-desktop.png');
    report.screenshots.push('qa-artifacts/preview-review-active-desktop.png');
    report.visualInspection.pages.push(await collectViewportMetrics(browser.session, 'review-active-desktop'));

    await setViewport(browser.session, 390, 844, 2, true);
    await waitForSelector(browser.session, '[data-testid="review-page-layout"]', { timeoutMs: 15000 });
    await screenshot(browser.session, 'preview-review-active-mobile.png');
    report.screenshots.push('qa-artifacts/preview-review-active-mobile.png');
    report.visualInspection.pages.push(await collectViewportMetrics(browser.session, 'review-active-mobile'));

    await setViewport(browser.session, 1440, 1280);
    await waitForSelector(browser.session, '[data-testid="review-page-layout"]', { timeoutMs: 15000 });

    await commitCurrentReview(browser.session, 'facil');
    await waitFor(
      browser.session,
      `(() => {
        const title = document.querySelector('[data-testid="review-core-title"]');
        return Boolean(title && String(title.textContent || '').includes('Citologia'));
      })()`,
      { timeoutMs: 20000, label: 'segundo item apos commit facil' },
    );

    const scheduleAfterFirst = await getStorageJson(browser.session, SCHEDULE_STORAGE_KEY);
    const facilEntry = Array.isArray(scheduleAfterFirst) ? scheduleAfterFirst.find((entry) => entry?.id === 'review-facil') : null;
    if (!facilEntry || facilEntry.nextReviewAt !== expectedReviewDates(now).facil) {
      throw new Error(`Feedback facil nao persistiu como +4 dias. entry=${JSON.stringify(facilEntry)}`);
    }
    report.steps.push({ name: 'feedback_facil_persisted', status: 'passed', details: facilEntry });

    await switchTabInApp(browser.session, 'inicio');
    await waitForSelector(browser.session, '[data-testid="home-continuity-panel"]', { timeoutMs: 30000 });
    await waitForText(browser.session, '3 itens na fila de hoje', { timeoutMs: 30000 });
    const homePartialSnapshot = await collectHomeSnapshot(browser.session);
    report.checks.homeAfterFirstCommit = homePartialSnapshot;
    report.steps.push({ name: 'home_reflects_partial_review_queue', status: 'passed', details: homePartialSnapshot });

    await switchTabInApp(browser.session, 'cronograma');
    await waitForSelector(browser.session, '[data-testid="plan-header"]', { timeoutMs: 30000 });
    await waitForText(browser.session, '3 revisoes prontas hoje', { timeoutMs: 30000 });
    const planPartialSnapshot = await collectPlanSnapshot(browser.session);
    report.checks.planAfterFirstCommit = planPartialSnapshot;
    report.steps.push({ name: 'plan_reflects_partial_review_queue', status: 'passed', details: planPartialSnapshot });

    await switchTabInApp(browser.session, 'flashcards');
    await waitForSelector(browser.session, '[data-testid="review-page-layout"]', { timeoutMs: 30000 });

    await commitCurrentReview(browser.session, 'medio');
    await waitForText(browser.session, 'Historia', { timeoutMs: 20000 });
    const scheduleAfterSecond = await getStorageJson(browser.session, SCHEDULE_STORAGE_KEY);
    const medioEntry = Array.isArray(scheduleAfterSecond) ? scheduleAfterSecond.find((entry) => entry?.id === 'review-medio') : null;
    if (!medioEntry || medioEntry.nextReviewAt !== expectedReviewDates(now).medio) {
      throw new Error(`Feedback medio nao persistiu como +2 dias. entry=${JSON.stringify(medioEntry)}`);
    }
    report.steps.push({ name: 'feedback_medio_persisted', status: 'passed', details: medioEntry });

    await commitCurrentReview(browser.session, 'dificil');
    await waitForText(browser.session, 'Interpretacao', { timeoutMs: 20000 });
    const scheduleAfterThird = await getStorageJson(browser.session, SCHEDULE_STORAGE_KEY);
    const dificilEntry = Array.isArray(scheduleAfterThird) ? scheduleAfterThird.find((entry) => entry?.id === 'review-dificil') : null;
    if (!dificilEntry || dificilEntry.nextReviewAt !== expectedReviewDates(now).dificil) {
      throw new Error(`Feedback dificil nao persistiu como +1 dia. entry=${JSON.stringify(dificilEntry)}`);
    }
    report.steps.push({ name: 'feedback_dificil_persisted', status: 'passed', details: dificilEntry });

    await commitCurrentReview(browser.session, 'errei');
    await waitForText(browser.session, 'Fila concluida', { timeoutMs: 20000 });
    const scheduleAfterFourth = await getStorageJson(browser.session, SCHEDULE_STORAGE_KEY);
    const erreiEntry = Array.isArray(scheduleAfterFourth) ? scheduleAfterFourth.find((entry) => entry?.id === 'review-errei') : null;
    if (!erreiEntry || erreiEntry.nextReviewAt !== expectedReviewDates(now).errei) {
      throw new Error(`Feedback errei nao persistiu com a regra MVP atual. entry=${JSON.stringify(erreiEntry)}`);
    }
    report.steps.push({ name: 'feedback_errei_persisted', status: 'passed', details: erreiEntry });

    const reviewCompletedSnapshot = await collectReviewSnapshot(browser.session);
    report.checks.reviewCompleted = reviewCompletedSnapshot;
    await screenshot(browser.session, 'preview-review-completed-desktop.png');
    report.screenshots.push('qa-artifacts/preview-review-completed-desktop.png');
    report.visualInspection.pages.push(await collectViewportMetrics(browser.session, 'review-completed-desktop'));

    await switchTabInApp(browser.session, 'inicio');
    await waitForSelector(browser.session, '[data-testid="home-continuity-panel"]', { timeoutMs: 30000 });
    await waitForText(browser.session, 'Revisoes do dia em dia', { timeoutMs: 30000 });
    await waitForText(browser.session, '4 revisoes concluidas hoje', { timeoutMs: 30000 });
    const homeCompletedSnapshot = await collectHomeSnapshot(browser.session);
    report.checks.homeAfterReviewComplete = homeCompletedSnapshot;
    await screenshot(browser.session, 'preview-review-home-after-complete.png');
    report.screenshots.push('qa-artifacts/preview-review-home-after-complete.png');
    report.visualInspection.pages.push(await collectViewportMetrics(browser.session, 'home-after-review-complete'));
    report.steps.push({ name: 'home_reflects_completed_today', status: 'passed', details: homeCompletedSnapshot });

    await reloadPage(browser.session);
    await waitForSelector(browser.session, '[data-testid="home-continuity-panel"]', { timeoutMs: 30000 });
    await waitForText(browser.session, 'Revisoes do dia em dia', { timeoutMs: 30000 });
    report.steps.push({ name: 'home_reload_keeps_review_state', status: 'passed' });

    await switchTabInApp(browser.session, 'cronograma');
    await waitForSelector(browser.session, '[data-testid="plan-header"]', { timeoutMs: 30000 });
    await waitForText(browser.session, 'Revisoes do dia em dia', { timeoutMs: 30000 });
    const planCompletedSnapshot = await collectPlanSnapshot(browser.session);
    report.checks.planAfterReviewComplete = planCompletedSnapshot;
    await screenshot(browser.session, 'preview-review-plan-after-complete.png');
    report.screenshots.push('qa-artifacts/preview-review-plan-after-complete.png');
    report.visualInspection.pages.push(await collectViewportMetrics(browser.session, 'plan-after-review-complete'));
    report.steps.push({ name: 'plan_reflects_completed_today', status: 'passed', details: planCompletedSnapshot });

    await reloadPage(browser.session);
    await waitForSelector(browser.session, '[data-testid="plan-header"]', { timeoutMs: 30000 });
    await waitForText(browser.session, 'Revisoes do dia em dia', { timeoutMs: 30000 });
    report.steps.push({ name: 'plan_reload_keeps_review_state', status: 'passed' });

    const finalSchedule = await getStorageJson(browser.session, SCHEDULE_STORAGE_KEY);
    report.checks.persistedSchedule = finalSchedule;

    if (consoleErrors.length > 0 || pageExceptions.length > 0) {
      report.steps.push({
        name: 'published_console_clean',
        status: 'failed',
        details: {
          consoleErrors,
          pageExceptions,
        },
      });
    } else {
      report.steps.push({ name: 'published_console_clean', status: 'passed' });
    }

    const overflowingPages = report.visualInspection.pages.filter((page) => page.horizontalOverflow);
    report.visualInspection.summary = {
      capturedPages: report.visualInspection.pages.length,
      overflowingPages: overflowingPages.map((page) => page.label),
    };
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    if (browser) {
      report.failureSnapshot = await collectFailureSnapshot(browser.session).catch(() => null);
      if (await screenshot(browser.session, 'preview-review-failure.png').then(() => true).catch(() => false)) {
        report.screenshots.push('qa-artifacts/preview-review-failure.png');
      }
    }
  } finally {
    report.summary = {
      passed: report.steps.filter((step) => step.status === 'passed').length,
      failed: report.steps.filter((step) => step.status === 'failed').length,
    };

    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

    if (browser) {
      await browser.close().catch(() => undefined);
    }

    if (tempUserId && supabaseUrl && serviceRoleKey) {
      await deleteTempUser(supabaseUrl, serviceRoleKey, tempUserId).catch(() => undefined);
    }
  }

  console.log(JSON.stringify(report, null, 2));

  if (report.error || report.summary.failed > 0) {
    process.exitCode = 1;
  }
};

await main();
