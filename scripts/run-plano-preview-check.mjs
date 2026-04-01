import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'plano-preview-check-report.json');
const PREVIEW_BASE_URL = String(process.env.PREVIEW_BASE_URL || process.argv[2] || '').trim().replace(/\/+$/, '');
const PREVIEW_SHARE_TOKEN = String(process.env.PREVIEW_SHARE_TOKEN || '').trim();

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

  throw new Error('Nenhum Chrome/Edge encontrado para o smoke de Plano.');
};

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-plano-preview-'));
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
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) {
      return;
    }

    const pending = session.pending.get(message.id);
    if (!pending) {
      return;
    }

    session.pending.delete(message.id);
    if (message.error) {
      pending.reject(new Error(message.error.message || `CDP error on ${pending.method}`));
      return;
    }

    pending.resolve(message.result);
  };

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

const buildWeeklySchedule = () => ({
  weekPlan: {
    monday: { subjectLabels: ['Matematica', 'Linguagens'] },
    tuesday: { subjectLabels: ['Matematica', 'Redacao'] },
    wednesday: { subjectLabels: ['Linguagens', 'Ciencias Humanas'] },
    thursday: { subjectLabels: ['Matematica', 'Ciencias da Natureza'] },
    friday: { subjectLabels: ['Redacao', 'Linguagens'] },
    saturday: { subjectLabels: ['Matematica'] },
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
    weeklyGoalSessions: 12,
  },
  updatedAt: new Date().toISOString(),
});

const buildBrowserSessionSeed = ({ email, authStorageUrl, browserSessionPayload, displayName }) => {
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
          segunda: { studied: true, minutes: 25 },
          terca: { studied: true, minutes: 25 },
          quarta: { studied: false, minutes: 0 },
          quinta: { studied: false, minutes: 0 },
          sexta: { studied: false, minutes: 0 },
          sabado: { studied: false, minutes: 0 },
        },
        completedTopics: {},
        totalPoints: 500,
        streak: 1,
        bestStreak: 1,
        achievements: [],
        level: 1,
        studyHistory: [],
        dailyGoal: 60,
        sessions: [],
        currentStreak: 1,
      }),
    ],
    [`profileDisplayName_${scope}`, JSON.stringify(displayName)],
    [`preferredStudyTrack_${scope}`, JSON.stringify('enem')],
    [`selectedStudyMethodId_${scope}`, JSON.stringify('pomodoro')],
    [`plannedFocusDuration_${scope}`, '25'],
    [`activeStudyMode_${scope}`, JSON.stringify('livre')],
    [`weeklyGoalMinutes_${scope}`, '300'],
    [`academyCompletedContentIds_${scope}`, JSON.stringify([])],
    [`weeklyStudySchedule_${scope}`, JSON.stringify(buildWeeklySchedule())],
    [`mdzOnboardingCompleted_${scope}`, 'true'],
    ['zb_internal_access', 'true'],
    ['zb_phase_override', JSON.stringify('intermediate')],
  ];

  return `
    (() => {
      const seedGuardKey = '__plano_preview_check_seeded__';
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
        console.error('plano-preview-check-seed-failed', error);
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
    `(() => normalize = ${normalize.toString()}, normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)})))()`,
    { ...options, label: `texto "${text}"` },
  );

const textExists = async (session, text) =>
  evalInPage(
    session,
    `(() => normalize = ${normalize.toString()}, normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)})))()`,
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

const clickByAriaLabel = async (session, text) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = ${normalize.toString()};
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
    { timeoutMs: 5000, ...options, label: `layout da sidebar ${targetWidth}px` },
  );

const collectSidebarState = async (session) =>
  evalInPage(
    session,
    `(() => {
      const sidebar = document.querySelector('main aside > div');
      const mainSection = document.querySelector('main section');
      const grid = document.querySelector('main > div');
      let storedMode = null;
      try {
        storedMode = JSON.parse(window.localStorage.getItem('zb_sidebar_mode') || 'null');
      } catch {
        storedMode = null;
      }
      return {
        mode: storedMode,
        sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : 0,
        mainWidth: mainSection ? Math.round(mainSection.getBoundingClientRect().width) : 0,
        viewportWidth: window.innerWidth,
        gridTemplateColumns: grid ? window.getComputedStyle(grid).gridTemplateColumns : '',
      };
    })()`,
  );

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
          weeklyHours: 8,
          preferredGoal: 'organizar um plano semanal claro e seguir com constancia',
          weakestDisciplines: ['matematica', 'linguagens'],
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

const collectPlanPageChecks = async (session) =>
  evalInPage(
    session,
    `(() => {
      const rect = (element) => {
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return {
          width: Math.round(box.width),
          height: Math.round(box.height),
          top: Math.round(box.top),
          left: Math.round(box.left),
        };
      };
      const text = (selector) => {
        const node = document.querySelector(selector);
        return node ? String(node.textContent || '').replace(/\\s+/g, ' ').trim() : '';
      };
      const header = document.querySelector('[data-testid="plan-header"]');
      const summaryCards = Array.from(document.querySelectorAll('[data-testid="plan-summary-strip"] [data-testid^="plan-summary-"]'));
      const distribution = document.querySelector('[data-testid="plan-distribution-list"]');
      const distributionItems = Array.from(document.querySelectorAll('[data-testid^="plan-distribution-item-"]'));
      const nextStepsPanel = document.querySelector('[data-testid="plan-next-steps-panel"]');
      const nextStepsCards = Array.from(document.querySelectorAll('[data-testid^="plan-next-step-"]'));
      const support = document.querySelector('[data-testid="plan-support-block"]');
      const nextStepsColumn = document.querySelector('[data-testid="plan-next-steps-column"]');
      const metricContainer = document.querySelector('[data-testid="plan-header-metrics"]');
      return {
        headerTitle: text('[data-testid="plan-header"] h1'),
        headerContext: text('[data-testid="plan-header"] p:nth-of-type(2)'),
        headerStatus: text('[data-testid="plan-header"] p:nth-of-type(3)'),
        metricCount: metricContainer ? metricContainer.children.length : 0,
        adjustCtaVisible: Array.from(document.querySelectorAll('button')).some((button) => String(button.textContent || '').includes('Ajustar plano')),
        calendarCtaVisible: Array.from(document.querySelectorAll('button')).some((button) => String(button.textContent || '').includes('Ver cronograma')),
        summaryCardsCount: summaryCards.length,
        distributionItemsCount: distributionItems.length,
        firstDistributionLabel: text('[data-testid^="plan-distribution-item-"] h3'),
        nextStepsCount: nextStepsCards.length,
        supportTitle: text('[data-testid="plan-support-block"] h2'),
        headerRect: rect(header),
        distributionRect: rect(distribution),
        nextStepsRect: rect(nextStepsPanel),
        nextStepsColumnRect: rect(nextStepsColumn),
        supportRect: rect(support),
        summaryRect: rect(document.querySelector('[data-testid="plan-summary-strip"]')),
      };
    })()`,
  );

const getBodyExcerpt = async (session, limit = 1400) =>
  evalInPage(
    session,
    `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}))()`,
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

  const email = `preview_plano_${Date.now()}@zerobase.dev`.toLowerCase();
  const password = 'PreviewPlano@2026';
  const displayName = 'QA Preview Plano';
  const report = {
    generatedAt: new Date().toISOString(),
    previewUrl: PREVIEW_BASE_URL,
    previewShareEnabled: Boolean(PREVIEW_SHARE_TOKEN),
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

    browser = await launchChrome(11350 + Math.floor(Math.random() * 200));
    await setDesktopViewport(browser.session, 1600, 1200);
    await navigate(
      browser.session,
      withPreviewShareUrl(PREVIEW_BASE_URL),
      buildBrowserSessionSeed({
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
    };

    const planUrl = new URL(PREVIEW_BASE_URL);
    planUrl.searchParams.set('tab', 'cronograma');
    await navigate(browser.session, planUrl.toString());
    await dismissIfPresent(browser.session, 'Agora nao');
    await dismissIfPresent(browser.session, 'Fechar', { exact: true });
    await waitFor(
      browser.session,
      `(() => Boolean(document.querySelector('[data-testid="plan-header"]')))()`,
      { timeoutMs: 40000, label: 'cabecalho do plano' },
    );
    await waitFor(
      browser.session,
      `(() => Boolean(document.querySelector('[data-testid="plan-distribution-list"]')))()`,
      { timeoutMs: 40000, label: 'bloco de distribuicao do plano' },
    );
    await waitFor(
      browser.session,
      `(() => Boolean(document.querySelector('[data-testid="plan-next-steps-panel"]')))()`,
      { timeoutMs: 40000, label: 'bloco de proximos passos' },
    );

    const expandedSidebarState = await collectSidebarState(browser.session);
    const expandedPlanChecks = await collectPlanPageChecks(browser.session);
    await screenshot(browser.session, 'preview-plano-expanded.png');
    report.screenshots.push('qa-artifacts/preview-plano-expanded.png');

    await clickByAriaLabel(browser.session, 'Recolher menu lateral');
    await waitForSidebarMode(browser.session, 'compact', { timeoutMs: 15000 });
    await waitForSidebarLayout(browser.session, 96);
    const compactSidebarState = await collectSidebarState(browser.session);
    await screenshot(browser.session, 'preview-plano-compact.png');
    report.screenshots.push('qa-artifacts/preview-plano-compact.png');

    await reloadPage(browser.session);
    await waitForSidebarMode(browser.session, 'compact', { timeoutMs: 15000 });
    const compactAfterReload = await collectSidebarState(browser.session);

    await clickByAriaLabel(browser.session, 'Expandir menu lateral');
    await waitForSidebarMode(browser.session, 'expanded', { timeoutMs: 15000 });
    await waitForSidebarLayout(browser.session, 256);

    await setDesktopViewport(browser.session, 1366, 1100);
    await waitFor(browser.session, 'window.innerWidth >= 1366', { timeoutMs: 15000, label: 'viewport 1366' });
    const planChecks1366 = await collectPlanPageChecks(browser.session);
    const smallerDesktopSidebarState = await collectSidebarState(browser.session);
    await screenshot(browser.session, 'preview-plano-1366.png');
    report.screenshots.push('qa-artifacts/preview-plano-1366.png');

    report.checks.sidebar = {
      expanded: expandedSidebarState,
      compact: compactSidebarState,
      compactAfterReload,
      smallerDesktop: smallerDesktopSidebarState,
    };

    report.checks.plano = {
      headerTitleVisible: normalize(expandedPlanChecks.headerTitle).includes('plano principal de estudos'),
      headerContextVisible: expandedPlanChecks.headerContext.length > 0,
      headerStatusVisible: expandedPlanChecks.headerStatus.length > 0,
      headerMetricsCount: expandedPlanChecks.metricCount,
      adjustCtaVisible: expandedPlanChecks.adjustCtaVisible,
      calendarCtaVisible: expandedPlanChecks.calendarCtaVisible,
      summaryCardsCount: expandedPlanChecks.summaryCardsCount,
      distributionItemsCount: expandedPlanChecks.distributionItemsCount,
      firstDistributionLabel: expandedPlanChecks.firstDistributionLabel,
      nextStepsCount: expandedPlanChecks.nextStepsCount,
      supportTitle: expandedPlanChecks.supportTitle,
      distributionDominates: Boolean(
        expandedPlanChecks.distributionRect
        && expandedPlanChecks.nextStepsColumnRect
        && expandedPlanChecks.distributionRect.width > expandedPlanChecks.nextStepsColumnRect.width
      ),
      supportFeelsSecondary: Boolean(
        expandedPlanChecks.supportRect
        && expandedPlanChecks.distributionRect
        && expandedPlanChecks.supportRect.top > expandedPlanChecks.distributionRect.top
      ),
      desktop1366MaintainsBreathingRoom: smallerDesktopSidebarState.mainWidth >= 900,
      expandedSnapshot: expandedPlanChecks,
      desktop1366Snapshot: planChecks1366,
    };
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    if (browser) {
      report.failureExcerpt = await getBodyExcerpt(browser.session).catch(() => '');
      await screenshot(browser.session, 'preview-plano-failure.png').catch(() => undefined);
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
