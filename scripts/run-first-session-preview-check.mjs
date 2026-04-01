import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'first-session-preview-check-report.json');
const PREVIEW_BASE_URL = String(process.env.PREVIEW_BASE_URL || process.argv[2] || '').trim().replace(/\/+$/, '');
const PREVIEW_COOKIE_NAME = String(process.env.PREVIEW_COOKIE_NAME || '_vercel_jwt').trim();
const PREVIEW_COOKIE_VALUE = String(process.env.PREVIEW_COOKIE_VALUE || '').trim();
const PREVIEW_BYPASS_TOKEN = String(process.env.PREVIEW_BYPASS_TOKEN || '').trim();

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

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) {
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

  throw new Error('Nenhum Chrome/Edge encontrado para o smoke de preview.');
};

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-preview-check-'));
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

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
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
  const response = await fetch(withPreviewProtectionUrl(`${baseUrl}/api/auth/register`), {
    method: 'POST',
    headers: withPreviewProtectionHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }),
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

const requestJson = async (url, init = {}) => {
  const response = await fetch(withPreviewProtectionUrl(url), {
    ...init,
    headers: withPreviewProtectionHeaders(init.headers || {}),
  });
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { response, payload };
};

const withPreviewProtectionUrl = (rawUrl) => {
  if (!PREVIEW_BYPASS_TOKEN || PREVIEW_COOKIE_VALUE) {
    return rawUrl;
  }

  const url = new URL(rawUrl);
  url.searchParams.set('x-vercel-protection-bypass', PREVIEW_BYPASS_TOKEN);
  url.searchParams.set('x-vercel-set-bypass-cookie', 'true');
  return url.toString();
};

const withPreviewProtectionHeaders = (headers = {}) => (
  {
    ...headers,
    ...(PREVIEW_COOKIE_VALUE
      ? {
          Cookie: `${PREVIEW_COOKIE_NAME}=${PREVIEW_COOKIE_VALUE}`,
        }
      : {}),
    ...(PREVIEW_BYPASS_TOKEN
      ? {
          'x-vercel-protection-bypass': PREVIEW_BYPASS_TOKEN,
        }
      : {}),
  }
);

const setupOfficialStudyContext = async ({ baseUrl, accessToken }) => {
  const headers = withPreviewProtectionHeaders({
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  const onboarding = await requestJson(`${baseUrl}/api/onboarding`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      examType: 'enem',
      level: 'iniciante',
      weeklyHours: 6,
      preferredGoal: 'ganhar constancia e subir a primeira sessao real',
      weakestDisciplines: ['matematica'],
    }),
  });

  if (!onboarding.response.ok) {
    throw new Error(`Falha ao preparar onboarding oficial (${onboarding.response.status}).`);
  }

  const home = await requestJson(`${baseUrl}/api/home`, {
    method: 'GET',
    headers,
  });

  if (!home.response.ok) {
    throw new Error(`Falha ao carregar home oficial (${home.response.status}).`);
  }

  return {
    onboarding: onboarding.payload,
    home: home.payload,
  };
};

const buildBrowserSessionPayload = ({ registerPayload, displayName }) => {
  const session = registerPayload?.session || {};
  const user = registerPayload?.user || {};
  const accessToken = session.accessToken || '';
  const decoded = decodeJwtPayload(accessToken) || {};

  return {
    access_token: accessToken,
    refresh_token: session.refreshToken,
    expires_at: session.expiresAt || null,
    expires_in: session.expiresIn || null,
    token_type: session.tokenType || 'bearer',
    user: {
      id: user.id || decoded.sub || `preview:${user.email || ''}`,
      aud: decoded.aud || 'authenticated',
      role: decoded.role || 'authenticated',
      email: user.email || decoded.email || '',
      created_at: new Date().toISOString(),
      user_metadata: {
        name: user.name || displayName,
        preferred_track: 'enem',
      },
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
    },
  };
};

const setCookie = async (session, url, name, value) => {
  const result = await session.send('Network.setCookie', {
    url,
    name,
    value,
    secure: url.startsWith('https://'),
    httpOnly: name === '_vercel_jwt',
    sameSite: 'Lax',
  });

  if (!result?.success) {
    throw new Error(`Nao consegui aplicar cookie ${name} antes do smoke do preview.`);
  }
};

const buildWeeklySchedule = () => {
  const todayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
  const weekPlan = {
    monday: { subjectLabels: [] },
    tuesday: { subjectLabels: [] },
    wednesday: { subjectLabels: [] },
    thursday: { subjectLabels: [] },
    friday: { subjectLabels: [] },
    saturday: { subjectLabels: [] },
    sunday: { subjectLabels: [] },
  };

  const availability = {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  };

  weekPlan[todayKey] = { subjectLabels: ['Matematica'] };
  availability[todayKey] = true;

  return {
    weekPlan,
    availability,
    preferences: {
      defaultSessionDurationMinutes: 25,
      sessionsPerDay: 1,
      weeklyGoalSessions: 3,
    },
    updatedAt: new Date().toISOString(),
  };
};

const buildSeedScript = ({ email, authStorageUrl, browserSessionPayload, displayName }) => {
  const scope = email.toLowerCase();
  const authStorageKey = buildAuthStorageKey(authStorageUrl);
  const entries = [
    [
      'zeroBaseSession',
      JSON.stringify({
        user: {
          nome: displayName,
          email,
          dataCadastro: new Date().toISOString(),
          foto: 'QA',
          examGoal: 'ENEM',
          examDate: '',
          preferredTrack: 'enem',
        },
        userId: `local:${scope}`,
      }),
    ],
    [authStorageKey, JSON.stringify(browserSessionPayload)],
    [
      `zeroBaseData_${scope}`,
      JSON.stringify({
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
      }),
    ],
    [`profileDisplayName_${scope}`, JSON.stringify(displayName)],
    [`preferredStudyTrack_${scope}`, JSON.stringify('enem')],
    [`selectedStudyMethodId_${scope}`, JSON.stringify('pomodoro')],
    [`plannedFocusDuration_${scope}`, '25'],
    [`activeStudyMode_${scope}`, JSON.stringify('livre')],
    [`weeklyGoalMinutes_${scope}`, '180'],
    [`academyCompletedContentIds_${scope}`, JSON.stringify([])],
    [`weeklyStudySchedule_${scope}`, JSON.stringify(buildWeeklySchedule())],
    [`mdzOnboardingCompleted_${scope}`, 'true'],
  ];

  return `
    (() => {
      const seedGuardKey = '__first_session_preview_check_seeded__';
      try {
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
        console.error('first-session-preview-check-seed-failed', error);
      }
    })();
  `;
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
      const normalize = (value) => String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      return normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })()`,
    { ...options, label: `texto "${text}"` },
  );

const textExists = async (session, text) =>
  evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      return normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })()`,
  );

const waitForOptionalText = async (session, text, { timeoutMs = 12000, intervalMs = 250 } = {}) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await textExists(session, text)) {
      return true;
    }

    await delay(intervalMs);
  }

  return false;
};

const getBodyExcerpt = async (session, limit = 1200) =>
  evalInPage(
    session,
    `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}))()`,
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
      const normalize = (value) => String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
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

const clickByAriaLabel = async (session, text) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(text)});
      const nodes = Array.from(document.querySelectorAll('[aria-label]'));
      const match = nodes.find((candidate) => normalize(candidate.getAttribute('aria-label') || '') === target);
      if (!match) return false;
      match.scrollIntoView({ block: 'center', inline: 'center' });
      match.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error(`Nao encontrei elemento com aria-label: ${text}`);
  }
};

const setDesktopViewport = async (session, width, height) => {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: width,
    screenHeight: height,
  });
};

const reloadPage = async (session) => {
  await session.send('Page.reload');
  await waitFor(session, 'document.readyState === "complete"', { label: 'reload complete' });
  await waitFor(session, 'Boolean(document.body && document.body.innerText.trim().length > 0)', { label: 'conteudo apos reload' });
};

const waitForSidebarMode = async (session, mode, options = {}) =>
  waitFor(
    session,
    `(() => {
      try {
        return JSON.parse(window.localStorage.getItem('zb_sidebar_mode') || 'null') === ${JSON.stringify(mode)};
      } catch {
        return false;
      }
    })()`,
    { ...options, label: `sidebar ${mode}` },
  );

const waitForSidebarLayout = async (session, targetWidth, options = {}) =>
  waitFor(
    session,
    `(() => {
      const sidebar = document.querySelector('main aside > div');
      const grid = document.querySelector('main > div');
      if (!sidebar || !grid) {
        return false;
      }

      const width = Math.round(sidebar.getBoundingClientRect().width);
      const columns = window.getComputedStyle(grid).gridTemplateColumns || '';
      return Math.abs(width - ${targetWidth}) <= 8 || columns.startsWith(${JSON.stringify(`${targetWidth}px`)});
    })()`,
    { timeoutMs: 4000, ...options, label: `layout da sidebar ${targetWidth}px` },
  );

const collectSidebarState = async (session) =>
  evalInPage(
    session,
    `(() => {
      const sidebar = document.querySelector('main aside > div');
      const mainSection = document.querySelector('main section');
      const grid = document.querySelector('main > div');
      const toggle = document.querySelector('[aria-label*="menu lateral"]');
      const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;
      const compactHiddenNodes = Array.from(document.querySelectorAll('main aside [class*="max-w-0"], main aside [class*="opacity-0"]'));
      let storedMode = null;
      try {
        storedMode = JSON.parse(window.localStorage.getItem('zb_sidebar_mode') || 'null');
      } catch {
        storedMode = null;
      }

      return {
        mode: storedMode,
        toggleLabel: toggle ? String(toggle.getAttribute('aria-label') || '') : '',
        sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : 0,
        mainWidth: mainSection ? Math.round(mainSection.getBoundingClientRect().width) : 0,
        viewportWidth: window.innerWidth,
        gridTemplateColumns: grid ? window.getComputedStyle(grid).gridTemplateColumns : '',
        transform: sidebarStyle ? sidebarStyle.transform : '',
        hiddenNodeCount: compactHiddenNodes.length,
      };
    })()`,
  );

const clickFirstQuestionOption = async (session) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const options = Array.from(document.querySelectorAll('[data-testid="session-question-option"]'));
      const target = options.find((button) => !button.disabled) || null;
      if (!target) return null;
      target.scrollIntoView({ block: 'center', inline: 'center' });
      const label = String(target.textContent || '').replace(/\\s+/g, ' ').trim();
      target.click();
      return label;
    })()`,
  );

  if (!clicked) {
    throw new Error('Nenhuma alternativa clicavel encontrada na sessao oficial.');
  }

  return clicked;
};

const screenshot = async (session, fileName) => {
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });

  await fs.writeFile(path.join(ARTIFACTS_DIR, fileName), Buffer.from(data, 'base64'));
};

const navigate = async (session, url, seedScript) => {
  if (seedScript) {
    await session.send('Page.addScriptToEvaluateOnNewDocument', { source: seedScript });
  }
  await session.send('Page.navigate', { url });
  await waitFor(session, 'document.readyState === "complete"', { label: 'load complete' });
  await waitFor(session, 'Boolean(document.body && document.body.innerText.trim().length > 0)', { label: 'conteudo da pagina' });
};

const collectQuestionState = async (session) =>
  evalInPage(
    session,
    `(() => {
      const text = (document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
      const feedback = document.querySelector('[data-testid="session-answer-feedback"]');
      return {
        body: text,
        hasFeedbackBanner: Boolean(document.querySelector('[data-testid="session-answer-feedback"]')),
        feedbackText: feedback ? String(feedback.textContent || '').replace(/\\s+/g, ' ').trim() : '',
      };
    })()`,
  );

const collectHomeChecks = async (session) =>
  evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const body = normalize(document.body?.innerText || '');
      const buttons = Array.from(document.querySelectorAll('button')).map((button) => normalize(button.textContent || ''));
      return {
        titlePresent: body.includes(normalize('Comece sua primeira sessao')),
        continuationTitlePresent: body.includes(normalize('Hoje voce continua daqui')),
        ctaPresent: buttons.some((label) => label.includes(normalize('Comecar primeira sessao'))),
        continueCtaPresent: buttons.some((label) => label.includes(normalize('Continuar sessao'))),
        hasPlanningButton: buttons.some((label) => label.includes(normalize('Abrir planejamento'))),
        hasMentorButton: buttons.some((label) => label.includes(normalize('Abrir mentor'))),
        hasCommitBanner: body.includes(normalize('Sua proxima sessao esta pronta')),
      };
    })()`,
  );

const setupOfficialStudyContextInBrowser = async (session, accessToken) =>
  evalInPage(
    session,
    `(async () => {
      const headers = {
        Authorization: 'Bearer ${accessToken}',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      const readPayload = async (response) => {
        try {
          return await response.json();
        } catch {
          return null;
        }
      };

      const onboardingResponse = await fetch('/api/onboarding', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          examType: 'enem',
          level: 'iniciante',
          weeklyHours: 6,
          preferredGoal: 'ganhar constancia e subir a primeira sessao real',
          weakestDisciplines: ['matematica'],
        }),
      });
      const onboardingPayload = await readPayload(onboardingResponse);

      const homeResponse = await fetch('/api/home', {
        method: 'GET',
        headers,
      });
      const homePayload = await readPayload(homeResponse);

      return {
        onboarding: {
          ok: onboardingResponse.ok,
          status: onboardingResponse.status,
          payload: onboardingPayload,
        },
        home: {
          ok: homeResponse.ok,
          status: homeResponse.status,
          payload: homePayload,
        },
      };
    })()`,
  );

const waitForStudyNowCardReady = async (session) =>
  waitFor(
    session,
    `(() => {
      const card = document.querySelector('[data-testid="study-now-card"]');
      return card?.getAttribute('data-card-status') === 'ready';
    })()`,
    { timeoutMs: 40000, label: 'card principal pronto para sessao oficial' },
  );

const getStudyNowCardStatus = async (session) =>
  evalInPage(
    session,
    `(() => {
      const card = document.querySelector('[data-testid="study-now-card"]');
      return {
        status: card?.getAttribute('data-card-status') || null,
        discipline: card?.getAttribute('data-study-discipline') || null,
        topic: card?.getAttribute('data-study-topic') || null,
      };
    })()`,
  );

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

  const email = `preview_first_session_${Date.now()}@zerobase.dev`.toLowerCase();
  const password = 'PreviewFirstSession@2026';
  const displayName = 'QA Preview First Session';
  const report = {
    generatedAt: new Date().toISOString(),
    previewUrl: PREVIEW_BASE_URL,
    checks: {},
    screenshots: [],
  };

  let browser = null;
  let tempUserId = null;

  try {
    let accessToken = '';
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
      accessToken = browserSessionPayload.access_token || '';
      authStorageUrl = supabaseUrl;
      report.checks.authMode = 'supabase_direct';
    } else {
      const createdUser = await registerPreviewUser(
        PREVIEW_BASE_URL,
        email,
        password,
        displayName,
      );
      accessToken = createdUser?.session?.accessToken || '';
      const accessTokenPayload = decodeJwtPayload(accessToken) || {};
      authStorageUrl = accessTokenPayload.iss || '';
      browserSessionPayload = buildBrowserSessionPayload({
        registerPayload: createdUser,
        displayName,
      });
      report.checks.authMode = 'preview_register_fallback';
    }

    browser = await launchChrome(10950 + Math.floor(Math.random() * 200));
    await setDesktopViewport(browser.session, 1600, 1200);
    if (PREVIEW_BYPASS_TOKEN) {
      await browser.session.send('Network.setExtraHTTPHeaders', {
        headers: {
          'x-vercel-protection-bypass': PREVIEW_BYPASS_TOKEN,
        },
      });
    }
    if (PREVIEW_COOKIE_VALUE) {
      await setCookie(browser.session, PREVIEW_BASE_URL, PREVIEW_COOKIE_NAME, PREVIEW_COOKIE_VALUE);
    }
    const initialUrl = new URL(PREVIEW_BASE_URL);
    if (PREVIEW_BYPASS_TOKEN && !PREVIEW_COOKIE_VALUE) {
      initialUrl.searchParams.set('x-vercel-set-bypass-cookie', 'true');
      initialUrl.searchParams.set('x-vercel-protection-bypass', PREVIEW_BYPASS_TOKEN);
    }
    await navigate(
      browser.session,
      initialUrl.toString(),
      buildSeedScript({
        email,
        authStorageUrl,
        browserSessionPayload,
        displayName,
      }),
    );

    await dismissIfPresent(browser.session, 'Agora nao');
    await dismissIfPresent(browser.session, 'Fechar', { exact: true });

    const setup = await setupOfficialStudyContextInBrowser(browser.session, accessToken);
    report.checks.backendContext = {
      onboardingReady: Boolean(setup?.onboarding?.ok),
      onboardingStatus: setup?.onboarding?.status || null,
      homeReady: Boolean(setup?.home?.ok),
      homeStatus: setup?.home?.status || null,
      homeLoaded: Boolean(setup.home?.payload?.success),
      missionDiscipline: setup.home?.payload?.mission?.discipline || null,
      missionTopic: setup.home?.payload?.mission?.topic || null,
    };

    await navigate(browser.session, PREVIEW_BASE_URL);
    await dismissIfPresent(browser.session, 'Agora nao');
    await dismissIfPresent(browser.session, 'Fechar', { exact: true });

    await waitFor(browser.session, 'window.innerWidth >= 1500', { timeoutMs: 15000, label: 'viewport desktop largo' });
    await waitForOptionalText(browser.session, 'Fluxo principal', { timeoutMs: 15000 });
    const expandedSidebarState = await collectSidebarState(browser.session);
    await screenshot(browser.session, 'preview-sidebar-expanded.png');
    report.screenshots.push('qa-artifacts/preview-sidebar-expanded.png');

    await clickByAriaLabel(browser.session, 'Recolher menu lateral');
    await waitForSidebarMode(browser.session, 'compact', { timeoutMs: 15000 });
    await waitForSidebarLayout(browser.session, 96);
    const compactSidebarState = await collectSidebarState(browser.session);
    await screenshot(browser.session, 'preview-sidebar-compact.png');
    report.screenshots.push('qa-artifacts/preview-sidebar-compact.png');

    await reloadPage(browser.session);
    await dismissIfPresent(browser.session, 'Agora nao');
    await dismissIfPresent(browser.session, 'Fechar', { exact: true });
    await waitForSidebarMode(browser.session, 'compact', { timeoutMs: 15000 });
    const compactSidebarReloadedState = await collectSidebarState(browser.session);

    await clickByAriaLabel(browser.session, 'Expandir menu lateral');
    await waitForSidebarMode(browser.session, 'expanded', { timeoutMs: 15000 });
    await waitForSidebarLayout(browser.session, 256);
    const expandedSidebarRestoredState = await collectSidebarState(browser.session);

    await setDesktopViewport(browser.session, 1366, 1100);
    await waitFor(browser.session, 'window.innerWidth >= 1366', { timeoutMs: 15000, label: 'viewport desktop menor' });
    const smallerDesktopSidebarState = await collectSidebarState(browser.session);
    await screenshot(browser.session, 'preview-sidebar-expanded-1366.png');
    report.screenshots.push('qa-artifacts/preview-sidebar-expanded-1366.png');

    await setDesktopViewport(browser.session, 1600, 1200);
    await waitFor(browser.session, 'window.innerWidth >= 1500', { timeoutMs: 15000, label: 'viewport desktop restaurado' });
    await clickByAriaLabel(browser.session, 'Abrir menu do perfil');
    await waitForText(browser.session, 'Ajustes', { timeoutMs: 10000 });
    await waitForText(browser.session, 'Dados', { timeoutMs: 10000 });
    await screenshot(browser.session, 'preview-topbar-profile-menu.png');
    report.screenshots.push('qa-artifacts/preview-topbar-profile-menu.png');
    report.checks.topbar = {
      profileMenuOpened: true,
    };
    await clickByAriaLabel(browser.session, 'Abrir menu do perfil');

    report.checks.sidebar = {
      expanded: expandedSidebarState,
      compact: compactSidebarState,
      compactPersistedAfterReload: compactSidebarReloadedState,
      expandedRestored: expandedSidebarRestoredState,
      smallerDesktop: smallerDesktopSidebarState,
      compactPersistsAfterReload: compactSidebarReloadedState.mode === 'compact',
      compactFeelsCompact: compactSidebarState.sidebarWidth <= 120 && compactSidebarState.mainWidth > 0,
      expandedFeelsExpanded: expandedSidebarState.sidebarWidth >= 240,
      smallerDesktopKeepsBreathingRoom: smallerDesktopSidebarState.mainWidth >= 900,
    };

    await waitForText(browser.session, 'Comece sua primeira sessao', { timeoutMs: 40000 });
    await waitForText(browser.session, 'Comecar primeira sessao', { timeoutMs: 40000 });
    const homeChecks = await collectHomeChecks(browser.session);
    const studyNowCardStatus = await getStudyNowCardStatus(browser.session);
    report.checks.home = homeChecks;
    report.checks.studyNowCard = studyNowCardStatus;
    report.checks.studyNowCardReady = await waitForStudyNowCardReady(browser.session).then(() => true).catch(() => false);
    await screenshot(browser.session, 'preview-first-session-home.png');
    report.screenshots.push('qa-artifacts/preview-first-session-home.png');

    await clickByText(browser.session, 'Comecar primeira sessao');
    await waitForText(browser.session, 'Sessao oficial', { timeoutMs: 40000 });
    await waitForText(browser.session, 'Questao 1 de 3', { timeoutMs: 40000 });
    await waitForText(browser.session, 'facil', { timeoutMs: 40000 });
    await screenshot(browser.session, 'preview-first-session-question-1.png');
    report.screenshots.push('qa-artifacts/preview-first-session-question-1.png');

    const firstAnswer = await clickFirstQuestionOption(browser.session);
    await waitFor(
      browser.session,
      `(() => Boolean(document.querySelector('[data-testid="session-answer-feedback"]')))()`,
      { timeoutMs: 30000, label: 'feedback imediato apos primeira resposta' },
    );
    await waitForText(browser.session, 'Questao 2 de 3', { timeoutMs: 40000 });
    const firstFeedbackState = await collectQuestionState(browser.session);

    await clickFirstQuestionOption(browser.session);
    await waitForText(browser.session, 'Questao 3 de 3', { timeoutMs: 40000 });

    await clickFirstQuestionOption(browser.session);
    await waitForText(browser.session, 'Sessao pronta para finalizar', { timeoutMs: 40000 });
    await waitForText(browser.session, 'As 3 questoes foram respondidas.', { timeoutMs: 40000 });
    report.checks.questions = {
      firstAnswer,
      firstFeedbackVisible: firstFeedbackState.hasFeedbackBanner,
      firstFeedbackText: firstFeedbackState.feedbackText || 'feedback nao identificado',
      questionCountIsThree: true,
      difficultyAppearsEasy: true,
    };

    await clickByText(browser.session, 'Ver resultado');
    await waitForText(browser.session, 'Voce comecou.', { timeoutMs: 40000 });
    await waitForText(browser.session, 'Progresso inicial: 1/7 dias', { timeoutMs: 40000 });
    const hasTomorrowCtaBeforeStep = await textExists(browser.session, 'Continuar amanha');
    await screenshot(browser.session, 'preview-first-session-result-step-1.png');
    report.screenshots.push('qa-artifacts/preview-first-session-result-step-1.png');

    report.checks.resultStep1 = {
      sawStartedMessage: true,
      sawInitialProgress: true,
      tomorrowCtaHiddenUntilContinue: !hasTomorrowCtaBeforeStep,
    };

    await clickByText(browser.session, 'Continuar', { exact: true });
    await waitForText(browser.session, 'Amanha', { timeoutMs: 40000 });
    await waitForText(browser.session, '3 questoes rapidas', { timeoutMs: 40000 });
    await waitForText(browser.session, 'revisao do que voce viu hoje', { timeoutMs: 40000 });
    await waitForText(browser.session, 'Continuar amanha', { timeoutMs: 40000 });
    await screenshot(browser.session, 'preview-first-session-result-step-2.png');
    report.screenshots.push('qa-artifacts/preview-first-session-result-step-2.png');

    report.checks.resultStep2 = {
      sawTomorrowBlock: true,
      sawCommitCopy: true,
      tomorrowCtaVisibleAfterContinue: true,
    };

    await clickByText(browser.session, 'Continuar amanha', { exact: true });
    const commitBannerVisible = await waitForOptionalText(browser.session, 'Sua proxima sessao esta pronta');
    const commitCopyVisible = await waitForOptionalText(
      browser.session,
      '3 questoes rapidas + revisao curta em menos de 5 min.',
    );
    const returnedHomeChecks = await collectHomeChecks(browser.session);
    await screenshot(browser.session, 'preview-first-session-home-after-return.png');
    report.screenshots.push('qa-artifacts/preview-first-session-home-after-return.png');

    report.checks.homeAfterReturn = {
      commitBannerVisible,
      commitCopyVisible,
      continuationTitleVisible: returnedHomeChecks.continuationTitlePresent,
      continueCtaVisible: returnedHomeChecks.continueCtaPresent,
      inferredHomeBannerVisible: returnedHomeChecks.hasCommitBanner,
    };

    const resumeUrl = new URL('/resume-session', PREVIEW_BASE_URL).toString();
    await navigate(browser.session, resumeUrl);
    await waitForText(browser.session, 'Hoje voce continua daqui', { timeoutMs: 40000 });
    await waitForText(browser.session, 'Sua proxima sessao ja esta pronta. Sem menu e sem escolha nova.', { timeoutMs: 40000 });
    await waitForText(browser.session, 'Faltam so ~2 min', { timeoutMs: 40000 });
    await screenshot(browser.session, 'preview-first-session-resume-page.png');
    report.screenshots.push('qa-artifacts/preview-first-session-resume-page.png');

    report.checks.resumeScreen = {
      routeOpened: true,
      resumeCtaVisible: true,
      estimatedTimeVisible: true,
    };

    await clickByText(browser.session, 'Continuar sessao', { exact: true });
    await waitForText(browser.session, 'Sessao oficial', { timeoutMs: 40000 });
    await waitForText(browser.session, 'Questao 1 de 3', { timeoutMs: 40000 });

    report.checks.resumeContinue = {
      sessionOpenedFromResume: true,
    };
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    if (browser) {
      report.failureExcerpt = await getBodyExcerpt(browser.session, 1400).catch(() => '');
      await screenshot(browser.session, 'preview-first-session-failure.png').catch(() => undefined);
    }
  } finally {
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

    if (browser) {
      await browser.close().catch(() => undefined);
    }

    if (tempUserId && supabaseUrl && serviceRoleKey) {
      await deleteTempUser(supabaseUrl, serviceRoleKey, tempUserId).catch(() => undefined);
    }
  }

  console.log(JSON.stringify(report, null, 2));

  if (report.error) {
    process.exitCode = 1;
  }
};

await main();
