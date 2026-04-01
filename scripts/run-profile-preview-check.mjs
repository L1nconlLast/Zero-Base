import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'profile-preview-check-report.json');
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
    } catch {}

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

  throw new Error('Nenhum Chrome/Edge encontrado para o smoke de Perfil.');
};

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-profile-preview-'));
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
    throw new Error(`Falha ao criar usuario QA temporario (${response.status}): ${body.slice(0, 240)}`);
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

const buildWeekProgress = () => ({
  domingo: { studied: false, minutes: 0 },
  segunda: { studied: true, minutes: 45 },
  terca: { studied: true, minutes: 35 },
  quarta: { studied: false, minutes: 0 },
  quinta: { studied: false, minutes: 0 },
  sexta: { studied: false, minutes: 0 },
  sabado: { studied: false, minutes: 0 },
});

const buildSeededWeeklySchedule = (date = new Date()) => ({
  weekPlan: {
    monday: { subjectLabels: ['Matematica', 'Biologia'] },
    tuesday: { subjectLabels: ['Historia'] },
    wednesday: { subjectLabels: ['Linguagens'] },
    thursday: { subjectLabels: ['Redacao'] },
    friday: { subjectLabels: ['Biologia'] },
    saturday: { subjectLabels: [] },
    sunday: { subjectLabels: [] },
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
});

const buildActiveScenario = (now) => {
  const todayKey = toDateKey(now);
  const yesterday = addDays(now, -1);
  const twoDaysAgo = addDays(now, -2);
  const nextWindow = addDays(now, 2);

  return {
    displayName: 'Perfil Preview QA',
    examGoal: 'ENEM 2026',
    examDate: '2026-11-09',
    profileAvatar: 'QA',
    weeklyGoalMinutes: 300,
    userData: {
      weekProgress: buildWeekProgress(),
      completedTopics: {},
      totalPoints: 840,
      streak: 3,
      bestStreak: 6,
      achievements: [],
      level: 4,
      studyHistory: [],
      dailyGoal: 60,
      sessions: [
        {
          date: twoDaysAgo.toISOString(),
          timestamp: twoDaysAgo.toISOString(),
          minutes: 45,
          points: 30,
          subject: 'Matematica',
          duration: 2700,
          goalMet: true,
          topicName: 'Porcentagem',
        },
        {
          date: yesterday.toISOString(),
          timestamp: yesterday.toISOString(),
          minutes: 35,
          points: 20,
          subject: 'Biologia',
          duration: 2100,
          goalMet: true,
          topicName: 'Citologia',
        },
      ],
      currentStreak: 3,
    },
    scheduleEntries: [
      {
        id: 'profile-review-completed',
        date: todayKey,
        subject: 'Historia',
        topic: 'Imperio',
        note: 'Reforce Segundo Reinado, parlamentarismo e questao escravista.',
        done: true,
        status: 'concluido',
        studyType: 'revisao',
        source: 'manual',
        priority: 'alta',
        createdAt: `${todayKey}T09:00:00.000Z`,
        updatedAt: `${todayKey}T14:00:00.000Z`,
        lastReviewedAt: `${todayKey}T14:00:00.000Z`,
        lastReviewFeedback: 'medio',
        nextReviewAt: toDateKey(nextWindow),
        reviewIntervalDays: 2,
        reviewCount: 1,
      },
      {
        id: 'profile-review-upcoming',
        date: toDateKey(nextWindow),
        subject: 'Redacao',
        topic: 'Tese',
        note: 'Retome a formulacao da tese com repertorio enxuto.',
        done: false,
        status: 'pendente',
        studyType: 'revisao',
        source: 'ia',
        priority: 'normal',
        createdAt: `${todayKey}T15:30:00.000Z`,
        updatedAt: `${todayKey}T15:30:00.000Z`,
        nextReviewAt: toDateKey(nextWindow),
      },
    ],
  };
};

const buildCompletedGoalScenario = (now) => ({
  ...buildActiveScenario(now),
  weeklyGoalMinutes: 60,
});

const buildEmptyScenario = (now) => ({
  displayName: 'Perfil Preview QA',
  examGoal: 'ENEM 2026',
  examDate: '2026-11-09',
  profileAvatar: 'QA',
  weeklyGoalMinutes: -1,
  userData: {
    weekProgress: {
      domingo: { studied: false, minutes: 0 },
      segunda: { studied: false, minutes: 0 },
      terca: { studied: false, minutes: 0 },
      quarta: { studied: false, minutes: 0 },
      quinta: { studied: false, minutes: 0 },
      sexta: { studied: false, minutes: 0 },
      sabado: { studied: false, minutes: 0 },
    },
    completedTopics: {},
    totalPoints: 0,
    streak: 0,
    bestStreak: 0,
    achievements: [],
    level: 1,
    studyHistory: [],
    dailyGoal: 60,
    sessions: [],
    currentStreak: 0,
  },
  scheduleEntries: [],
});

const buildInitialSeedEntries = ({
  email,
  authStorageUrl,
  browserSessionPayload,
  now,
  scenario,
}) => {
  const scope = email.toLowerCase();
  const authStorageKey = buildAuthStorageKey(authStorageUrl);
  return [
    [
      'zeroBaseSession',
      JSON.stringify({
        user: {
          nome: scenario.displayName,
          email,
          dataCadastro: now.toISOString(),
          foto: scenario.profileAvatar,
          examGoal: scenario.examGoal,
          examDate: scenario.examDate,
          preferredTrack: 'enem',
        },
        userId: `local:${scope}`,
      }),
    ],
    [authStorageKey, JSON.stringify(browserSessionPayload)],
    [`zeroBaseData_${scope}`, JSON.stringify(scenario.userData)],
    [`profileDisplayName_${scope}`, JSON.stringify(scenario.displayName)],
    [`preferredStudyTrack_${scope}`, JSON.stringify('enem')],
    [`selectedStudyMethodId_${scope}`, JSON.stringify('pomodoro')],
    [`plannedFocusDuration_${scope}`, '25'],
    [`activeStudyMode_${scope}`, JSON.stringify('livre')],
    [`weeklyGoalMinutes_${scope}`, String(scenario.weeklyGoalMinutes)],
    [`academyCompletedContentIds_${scope}`, JSON.stringify([])],
    [`weeklyStudySchedule_${scope}`, JSON.stringify(buildSeededWeeklySchedule(now))],
    [`mdzOnboardingCompleted_${scope}`, 'true'],
    ['zb_internal_access', 'true'],
    ['zb_phase_override', JSON.stringify('intermediate')],
    ['settings-pref-theme', 'light'],
    ['theme', 'blue'],
    ['darkMode', 'false'],
    [SCHEDULE_STORAGE_KEY, JSON.stringify(scenario.scheduleEntries)],
  ];
};

const buildBrowserSessionSeed = ({
  email,
  authStorageUrl,
  browserSessionPayload,
  now,
  allowedHosts,
  scenario,
}) => {
  const entries = buildInitialSeedEntries({
    email,
    authStorageUrl,
    browserSessionPayload,
    now,
    scenario,
  });

  return `
    (() => {
      const seedGuardKey = '__profile_preview_check_seeded__';
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
        console.error('profile-preview-check-seed-failed', error);
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

const waitFor = async (
  session,
  predicateExpression,
  { timeoutMs = 30000, intervalMs = 150, label = 'condicao' } = {},
) => {
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

const clickProfileSettingsButton = async (session) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const button = document.querySelector('[data-testid="profile-header"] button');
      if (!button) return false;
      button.scrollIntoView({ block: 'center', inline: 'center' });
      button.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error('Nao encontrei o CTA de ajustes dentro do header do Perfil.');
  }
};

const hasProfileSettingsButton = async (session) =>
  evalInPage(
    session,
    `(() => Boolean(document.querySelector('[data-testid="profile-header"] button')))()`,
  );

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
      return {
        url: window.location.href,
        title: document.title,
        bodyExcerpt: bodyText.slice(0, 500),
        hasProfileLayout: Boolean(document.querySelector('[data-testid="profile-page-layout"]')),
        hasSettingsTab: window.location.search.includes('tab=configuracoes'),
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

const collectProfileSnapshot = async (session) =>
  evalInPage(
    session,
    `(() => {
      const text = (selector) => {
        const node = document.querySelector(selector);
        return node ? String(node.textContent || '').replace(/\\s+/g, ' ').trim() : '';
      };
      const activityItems = Array.from(document.querySelectorAll('[data-testid="profile-activity-item"]')).map((node) =>
        String(node.textContent || '').replace(/\\s+/g, ' ').trim(),
      );
      return {
        heading: text('[data-testid="profile-header"] h1'),
        metrics: text('[data-testid="profile-header-metrics"]'),
        stats: {
          streak: text('[data-testid="profile-stat-streak"]'),
          time: text('[data-testid="profile-stat-time"]'),
          sessions: text('[data-testid="profile-stat-sessions"]'),
          reviews: text('[data-testid="profile-stat-reviews"]'),
        },
        streakCurrent: text('[data-testid="profile-streak-current"]'),
        streakBest: text('[data-testid="profile-streak-best"]'),
        streakToday: text('[data-testid="profile-streak-today-status"]'),
        streakSummary: text('[data-testid="profile-streak-recent-summary"]'),
        goalStatus: text('[data-testid="profile-goal-status"]'),
        goalProgress: text('[data-testid="profile-goal-progress"]'),
        goalRemaining: text('[data-testid="profile-goal-remaining"]'),
        activityItems,
        activityEmpty: text('[data-testid="profile-activity-empty"]'),
      };
    })()`,
  );

const applyProfileScenario = async (
  session,
  {
    email,
    scenario,
    now,
  },
) => {
  const scope = email.toLowerCase();
  const updates = [
    [
      'zeroBaseSession',
      JSON.stringify({
        user: {
          nome: scenario.displayName,
          email,
          dataCadastro: now.toISOString(),
          foto: scenario.profileAvatar,
          examGoal: scenario.examGoal,
          examDate: scenario.examDate,
          preferredTrack: 'enem',
        },
        userId: `local:${scope}`,
      }),
    ],
    [`zeroBaseData_${scope}`, JSON.stringify(scenario.userData)],
    [`profileDisplayName_${scope}`, JSON.stringify(scenario.displayName)],
    [`weeklyGoalMinutes_${scope}`, String(scenario.weeklyGoalMinutes)],
    [SCHEDULE_STORAGE_KEY, JSON.stringify(scenario.scheduleEntries)],
  ];

  await evalInPage(
    session,
    `(() => {
      const updates = ${JSON.stringify(updates)};
      for (const [key, value] of updates) {
        window.localStorage.setItem(key, value);
      }
      return true;
    })()`,
  );
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
    title: 'Profile Preview Check',
    previewUrl: PREVIEW_BASE_URL,
    generatedAt: new Date().toISOString(),
    steps: [],
    checks: {},
    screenshots: [],
    visualInspection: {
      pages: [],
      summary: null,
    },
    failureSnapshot: null,
    error: null,
    summary: null,
  };

  const now = new Date();
  const activeScenario = buildActiveScenario(now);
  const completedScenario = buildCompletedGoalScenario(now);
  const emptyScenario = buildEmptyScenario(now);

  let browser = null;
  let tempUserId = null;
  let authStorageUrl = '';
  const consoleErrors = [];
  const pageExceptions = [];

  try {
    const email = `preview_profile_${Date.now()}@mail.test`;
    const password = 'Preview123!';
    let browserSessionPayload = null;

    if (publishableKey && serviceRoleKey && supabaseUrl) {
      try {
        const createdUser = await createTempConfirmedUser(
          supabaseUrl,
          serviceRoleKey,
          email,
          password,
          activeScenario.displayName,
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
      } catch (error) {
        if (tempUserId && supabaseUrl && serviceRoleKey) {
          await deleteTempUser(supabaseUrl, serviceRoleKey, tempUserId).catch(() => undefined);
          tempUserId = null;
        }

        const createdUser = await registerPreviewUser(
          PREVIEW_BASE_URL,
          email,
          password,
          activeScenario.displayName,
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
              name: activeScenario.displayName,
              preferred_track: 'enem',
            },
            app_metadata: {
              provider: 'email',
              providers: ['email'],
            },
          },
        };
        report.checks.authMode = 'preview_register_fallback';
        report.steps.push({
          name: 'auth_direct_fallback',
          status: 'passed',
          details: {
            reason: error instanceof Error ? error.message : String(error),
          },
        });
      }
    } else {
      const createdUser = await registerPreviewUser(
        PREVIEW_BASE_URL,
        email,
        password,
        activeScenario.displayName,
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
            name: activeScenario.displayName,
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

    browser = await launchChrome(11800 + Math.floor(Math.random() * 150));
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
    initialUrl.searchParams.set('tab', 'perfil');
    initialUrl.searchParams.set('qa', 'profile-preview');

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
        now,
        allowedHosts,
        scenario: activeScenario,
      }),
    );

    await dismissIfPresent(browser.session, 'Agora nao');
    await dismissIfPresent(browser.session, 'Fechar', { exact: true });
    await waitForSelector(browser.session, '[data-testid="profile-page-layout"]', { timeoutMs: 40000 });
    await waitForSelector(browser.session, '[data-testid="profile-goals-panel"]', { timeoutMs: 40000 });

    const activeSnapshot = await collectProfileSnapshot(browser.session);
    report.checks.profileActive = activeSnapshot;

    if (!activeSnapshot.heading.includes(activeScenario.displayName)) {
      throw new Error(`Header do perfil nao carregou o nome esperado. snapshot=${JSON.stringify(activeSnapshot)}`);
    }
    if (!activeSnapshot.metrics.includes('XP') || !activeSnapshot.metrics.includes('80/300 min') || !activeSnapshot.metrics.includes('Sincronizado')) {
      throw new Error(`Metricas do header nao bateram no preview. snapshot=${JSON.stringify(activeSnapshot)}`);
    }
    if (activeSnapshot.streakCurrent !== '3 dias' || !activeSnapshot.streakToday.includes('Hoje ja contou')) {
      throw new Error(`Bloco de streak nao refletiu atividade recente. snapshot=${JSON.stringify(activeSnapshot)}`);
    }
    if (!activeSnapshot.goalStatus.includes('No ritmo') || activeSnapshot.goalProgress !== '80 min de 300 min') {
      throw new Error(`Meta semanal parcial nao ficou coerente. snapshot=${JSON.stringify(activeSnapshot)}`);
    }
    if (!Array.isArray(activeSnapshot.activityItems) || activeSnapshot.activityItems.length < 3) {
      throw new Error(`Atividade recente nao trouxe itens suficientes. snapshot=${JSON.stringify(activeSnapshot)}`);
    }
    if (!String(activeSnapshot.activityItems[0] || '').includes('Revisao concluida')) {
      throw new Error(`Ordenacao da atividade recente nao colocou a revisao de hoje primeiro. snapshot=${JSON.stringify(activeSnapshot)}`);
    }
    report.steps.push({ name: 'profile_active_state_loaded', status: 'passed', details: activeSnapshot });

    if (!(await hasProfileSettingsButton(browser.session))) {
      throw new Error('O CTA de ajustes nao apareceu no header do Perfil.');
    }
    report.steps.push({ name: 'profile_settings_cta_visible', status: 'passed' });

    await screenshot(browser.session, 'preview-profile-active-desktop.png');
    report.screenshots.push('qa-artifacts/preview-profile-active-desktop.png');
    report.visualInspection.pages.push(await collectViewportMetrics(browser.session, 'profile-active-desktop'));

    await setViewport(browser.session, 390, 844, 2, true);
    await waitForSelector(browser.session, '[data-testid="profile-page-layout"]', { timeoutMs: 15000 });
    await screenshot(browser.session, 'preview-profile-active-mobile.png');
    report.screenshots.push('qa-artifacts/preview-profile-active-mobile.png');
    report.visualInspection.pages.push(await collectViewportMetrics(browser.session, 'profile-active-mobile'));

    await setViewport(browser.session, 1440, 1280);
    await waitForSelector(browser.session, '[data-testid="profile-page-layout"]', { timeoutMs: 15000 });

    await reloadPage(browser.session);
    await waitForSelector(browser.session, '[data-testid="profile-page-layout"]', { timeoutMs: 30000 });
    const snapshotAfterReload = await collectProfileSnapshot(browser.session);
    if (snapshotAfterReload.heading !== activeSnapshot.heading || snapshotAfterReload.goalStatus !== activeSnapshot.goalStatus) {
      throw new Error(`Perfil nao manteve o estado esperado apos reload. snapshot=${JSON.stringify(snapshotAfterReload)}`);
    }
    report.checks.profileReload = snapshotAfterReload;
    report.steps.push({ name: 'profile_reload_keeps_state', status: 'passed', details: snapshotAfterReload });

    await applyProfileScenario(browser.session, { email, scenario: completedScenario, now });
    await reloadPage(browser.session);
    await waitForSelector(browser.session, '[data-testid="profile-page-layout"]', { timeoutMs: 30000 });
    const completedSnapshot = await collectProfileSnapshot(browser.session);
    if (!completedSnapshot.goalStatus.includes('Concluida') || !completedSnapshot.goalRemaining.includes('Meta concluida')) {
      throw new Error(`Estado concluido da meta nao apareceu corretamente. snapshot=${JSON.stringify(completedSnapshot)}`);
    }
    report.checks.profileGoalCompleted = completedSnapshot;
    report.steps.push({ name: 'profile_goal_completed_state', status: 'passed', details: completedSnapshot });
    await screenshot(browser.session, 'preview-profile-goal-completed.png');
    report.screenshots.push('qa-artifacts/preview-profile-goal-completed.png');
    report.visualInspection.pages.push(await collectViewportMetrics(browser.session, 'profile-goal-completed'));

    await applyProfileScenario(browser.session, { email, scenario: emptyScenario, now });
    await reloadPage(browser.session);
    await waitForSelector(browser.session, '[data-testid="profile-page-layout"]', { timeoutMs: 30000 });
    const emptySnapshot = await collectProfileSnapshot(browser.session);
    if (!emptySnapshot.goalStatus.includes('Sem meta')) {
      throw new Error(`Estado vazio da meta nao apareceu. snapshot=${JSON.stringify(emptySnapshot)}`);
    }
    if (!emptySnapshot.activityEmpty.includes('Conclua uma sessao ou revisao')) {
      throw new Error(`Estado vazio da atividade nao apareceu. snapshot=${JSON.stringify(emptySnapshot)}`);
    }
    if (emptySnapshot.streakCurrent !== '0 dias') {
      throw new Error(`Streak vazio nao ficou zerado. snapshot=${JSON.stringify(emptySnapshot)}`);
    }
    report.checks.profileEmpty = emptySnapshot;
    report.steps.push({ name: 'profile_empty_state_loaded', status: 'passed', details: emptySnapshot });
    await screenshot(browser.session, 'preview-profile-empty-state.png');
    report.screenshots.push('qa-artifacts/preview-profile-empty-state.png');
    report.visualInspection.pages.push(await collectViewportMetrics(browser.session, 'profile-empty-state'));

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
      if (await screenshot(browser.session, 'preview-profile-failure.png').then(() => true).catch(() => false)) {
        report.screenshots.push('qa-artifacts/preview-profile-failure.png');
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
