import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'real-shell-local-smoke-report.json');
const BASE_URL = (process.env.REAL_SHELL_QA_BASE_URL || 'http://127.0.0.1:3200').replace(/\/+$/, '');

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

  onMessage(raw) {
    const message = JSON.parse(raw);
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
  }

  async close() {
    this.socket.close();
  }
}

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

  const raw = await fs.readFile(targetPath, 'utf8');
  return JSON.parse(raw);
};

const findChromePath = async () => {
  for (const candidate of chromeCandidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error('Nenhum Chrome/Edge encontrado para o smoke headless.');
};

const waitForHttp = async (port, endpoint = '/json/version') => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
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

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-real-shell-'));
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

  const pageTarget = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
    method: 'PUT',
  }).then((response) => response.json());

  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error('Chrome headless abriu sem target de pagina acessivel.');
  }

  const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  const session = new CDPSession(socket);
  socket.onmessage = (event) => session.onMessage(event.data);

  await session.send('Page.enable');
  await session.send('Runtime.enable');

  return {
    session,
    close: async () => {
      try {
        await session.close();
      } catch {
        // ignore
      }

      chrome.kill();
      await delay(300);

      try {
        await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch {
        // ignore locked files
      }
    },
  };
};

const buildAuthStorageKey = (supabaseUrl) => {
  const ref = new URL(supabaseUrl).host.split('.')[0];
  return `sb-${ref}-auth-token`;
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
    throw new Error(`Nao foi possivel criar sessao do navegador (${response.status}): ${body.slice(0, 300)}`);
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
    throw new Error(`Nao foi possivel criar usuario QA temporario (${response.status}): ${body.slice(0, 300)}`);
  }

  return response.json();
};

const deleteTempUser = async (supabaseUrl, serviceRoleKey, userId) => {
  if (!userId) {
    return;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Nao foi possivel remover usuario QA temporario (${response.status}): ${body.slice(0, 300)}`);
  }
};

const buildWeekProgress = (minutesByWeekday = {}) => ({
  domingo: { studied: Boolean(minutesByWeekday.domingo), minutes: minutesByWeekday.domingo || 0 },
  segunda: { studied: Boolean(minutesByWeekday.segunda), minutes: minutesByWeekday.segunda || 0 },
  terca: { studied: Boolean(minutesByWeekday.terca), minutes: minutesByWeekday.terca || 0 },
  quarta: { studied: Boolean(minutesByWeekday.quarta), minutes: minutesByWeekday.quarta || 0 },
  quinta: { studied: Boolean(minutesByWeekday.quinta), minutes: minutesByWeekday.quinta || 0 },
  sexta: { studied: Boolean(minutesByWeekday.sexta), minutes: minutesByWeekday.sexta || 0 },
  sabado: { studied: Boolean(minutesByWeekday.sabado), minutes: minutesByWeekday.sabado || 0 },
});

const toLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildSeededUserData = () => {
  const today = new Date();
  const dayOffsets = [0, 1, 2, 4];
  const sessions = [
    { offset: dayOffsets[0], minutes: 95, points: 950, subject: 'Matematica', methodId: 'deep-work' },
    { offset: dayOffsets[1], minutes: 55, points: 550, subject: 'Linguagens', methodId: '52-17' },
    { offset: dayOffsets[2], minutes: 40, points: 400, subject: 'Humanas', methodId: 'pomodoro' },
    { offset: dayOffsets[3], minutes: 70, points: 700, subject: 'Matematica', methodId: 'deep-work' },
  ].map((entry, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - entry.offset);
    date.setHours(9 + index, 15, 0, 0);
    const dayKey = toLocalDateKey(date);
    return {
      date: dayKey,
      minutes: entry.minutes,
      duration: entry.minutes,
      points: entry.points,
      subject: entry.subject,
      methodId: entry.methodId,
      timestamp: date.toISOString(),
      goalMet: entry.minutes >= 60,
    };
  });

  return {
    weekProgress: buildWeekProgress({
      segunda: 95,
      terca: 55,
      quarta: 40,
      sexta: 70,
    }),
    completedTopics: {},
    totalPoints: sessions.reduce((sum, session) => sum + session.points, 0),
    streak: 4,
    bestStreak: 6,
    achievements: [],
    level: 4,
    studyHistory: sessions,
    dailyGoal: 90,
    sessions,
    currentStreak: 4,
  };
};

const buildEmptyUserData = () => ({
  weekProgress: buildWeekProgress(),
  completedTopics: {},
  totalPoints: 0,
  streak: 0,
  bestStreak: 0,
  achievements: [],
  level: 1,
  studyHistory: [],
  dailyGoal: 90,
  sessions: [],
  currentStreak: 0,
});

const createSeedScript = ({
  email,
  supabaseUrl,
  browserSessionPayload,
  userData,
  displayName,
  markOnboardingComplete = true,
  phaseOverride = 'intermediate',
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const authStorageKey = buildAuthStorageKey(supabaseUrl);
  const userDataKey = `zeroBaseData_${normalizedEmail}`;
  const weeklyGoalKey = `weeklyGoalMinutes_${normalizedEmail}`;
  const activeStudyModeKey = `activeStudyMode_${normalizedEmail}`;
  const profileDisplayNameKey = `profileDisplayName_${normalizedEmail}`;

  return `
    (() => {
      try {
        window.localStorage.clear();
        ${markOnboardingComplete ? `window.localStorage.setItem(${JSON.stringify(`mdzOnboardingCompleted_${normalizedEmail}`)}, 'true');` : ''}
        window.localStorage.setItem(${JSON.stringify(profileDisplayNameKey)}, ${JSON.stringify(displayName)});
        window.localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(browserSessionPayload))});
        ${userData ? `window.localStorage.setItem(${JSON.stringify(userDataKey)}, ${JSON.stringify(JSON.stringify(userData))});` : ''}
        window.localStorage.setItem(${JSON.stringify(weeklyGoalKey)}, '900');
        window.localStorage.setItem(${JSON.stringify(activeStudyModeKey)}, 'pomodoro');
        ${phaseOverride ? `window.localStorage.setItem('zb_phase_override', ${JSON.stringify(JSON.stringify(phaseOverride))});` : ''}
      } catch (error) {
        console.error('real-shell-local-smoke-seed-failed', error);
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

const waitFor = async (session, predicateExpression, { timeoutMs = 15000, intervalMs = 150, label = 'condicao' } = {}) => {
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
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      return normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })()`,
    { ...options, label: `texto "${text}"` },
  );

const waitForAnyText = async (session, texts, options = {}) =>
  waitFor(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const body = normalize(document.body?.innerText || '');
      return ${JSON.stringify(texts)}.some((value) => body.includes(normalize(value)));
    })()`,
    { ...options, label: `um dos textos: ${texts.join(', ')}` },
  );

const clickByText = async (session, text, { tagName = null, exact = false } = {}) => {
  const expression = `
    (() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(text)});
      const selector = ${JSON.stringify(tagName ? tagName : 'button, a, [role="button"]')};
      const nodes = Array.from(document.querySelectorAll(selector)).filter((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return true;
      });
      const match = nodes.find((candidate) => {
        const content = normalize(candidate.textContent || '');
        return ${exact ? 'content === target' : 'content.includes(target)'};
      });
      if (!match) return false;
      match.scrollIntoView({ block: 'center', inline: 'center' });
      match.click();
      return true;
    })()
  `;

  const clicked = await evalInPage(session, expression);
  if (!clicked) {
    throw new Error(`Nao encontrei elemento clicavel com texto: ${text}`);
  }
};

const setInputValue = async (session, selector, value) => {
  const expression = `
    (() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
        return false;
      }
      const prototype = input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      if (!descriptor?.set) {
        return false;
      }
      input.focus();
      descriptor.set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `;

  const updated = await evalInPage(session, expression);
  if (!updated) {
    throw new Error(`Nao encontrei input para o seletor: ${selector}`);
  }
};

const screenshot = async (session, fileName) => {
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  await fs.writeFile(path.join(ARTIFACTS_DIR, fileName), Buffer.from(data, 'base64'));
};

const setViewport = async (session, { width, height, mobile = false }) => {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
};

const clearViewport = async (session) => {
  await session.send('Emulation.clearDeviceMetricsOverride');
};

const closeOptionalOverlays = async (session) => {
  const hasText = async (text) =>
    evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
      })()`,
    );

  if (await hasText('Agora nao')) {
    await clickByText(session, 'Agora nao', { exact: true }).catch(() => undefined);
    await delay(250);
  }

  if (await hasText('Fechar') && await hasText('Modo interno')) {
    await clickByText(session, 'Fechar', { exact: true }).catch(() => undefined);
    await delay(250);
  }
};

const navigate = async (session, url) => {
  await session.send('Page.navigate', { url });
  await waitFor(session, 'document.readyState === "complete"', { timeoutMs: 45000, label: 'load complete' });
  await waitFor(
    session,
    'Boolean(document.body && document.body.innerText.trim().length > 0)',
    { timeoutMs: 45000, label: 'conteudo da pagina' },
  );
};

const getLayoutMetrics = async (session) =>
  evalInPage(
    session,
    `(() => {
      const aside = document.querySelector('aside');
      const main = document.querySelector('main');
      return {
        asideWidth: aside ? Math.round(aside.getBoundingClientRect().width) : 0,
        mainWidth: main ? Math.round(main.getBoundingClientRect().width) : 0,
        viewportWidth: window.innerWidth,
      };
    })()`,
  );

const main = async () => {
  await ensureArtifactsDir();

  const envFile = await parseDotEnv(path.join(ROOT, '.env'));
  const cypressEnv = await readJsonIfExists(path.join(ROOT, 'cypress.env.json'));

  const loginEmail = process.env.E2E_LOGIN_EMAIL || cypressEnv.E2E_LOGIN_EMAIL;
  const loginPassword = process.env.E2E_LOGIN_PASSWORD || cypressEnv.E2E_LOGIN_PASSWORD;
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

  if (!loginEmail || !loginPassword || !publishableKey || !supabaseUrl || !serviceRoleKey) {
    throw new Error('Credenciais/config E2E ausentes para o smoke local do shell real.');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    steps: [],
  };

  const recordStep = (name, status, details = {}) => {
    report.steps.push({ name, status, ...details });
  };

  const cleanupUserIds = [];
  let browser = null;

  try {
    browser = await launchChrome(10250 + Math.floor(Math.random() * 100));
    await setViewport(browser.session, { width: 1440, height: 1080, mobile: false });

    await navigate(browser.session, `${BASE_URL}/`);
    await waitForText(browser.session, 'Entrar', { timeoutMs: 20000 });
    await waitForText(browser.session, 'E-mail', { timeoutMs: 20000 });
    await screenshot(browser.session, 'real-shell-local-login.png');
    recordStep('unauth_login_screen', 'passed', {
      screenshot: 'qa-artifacts/real-shell-local-login.png',
    });

    await setInputValue(browser.session, '#login-email', loginEmail);
    await setInputValue(browser.session, '#login-password', loginPassword);
    await clickByText(browser.session, 'Entrar', { exact: true });
    await waitForText(browser.session, 'Sair', { timeoutMs: 30000 });
    await closeOptionalOverlays(browser.session);
    await screenshot(browser.session, 'real-shell-local-login-success.png');
    recordStep('ui_login', 'passed', {
      screenshot: 'qa-artifacts/real-shell-local-login-success.png',
    });

    await clickByText(browser.session, 'Sair', { exact: true });
    await waitForText(browser.session, 'Entrar', { timeoutMs: 30000 });
    recordStep('ui_logout', 'passed');

    await browser.close();
    browser = null;

    const onboardingEmail = `e2e_shell_onboarding_${Date.now()}@zerobase.dev`;
    const onboardingPassword = 'ShellSmoke@2026';
    const onboardingDisplayName = 'QA Shell Onboarding';
    const onboardingUser = await createTempConfirmedUser(
      supabaseUrl,
      serviceRoleKey,
      onboardingEmail,
      onboardingPassword,
      onboardingDisplayName,
    );
    cleanupUserIds.push(onboardingUser.user?.id || onboardingUser.id || null);
    const onboardingSessionPayload = await createBrowserSessionPayload(
      supabaseUrl,
      publishableKey,
      onboardingEmail,
      onboardingPassword,
    );

    browser = await launchChrome(10350 + Math.floor(Math.random() * 100));
    await setViewport(browser.session, { width: 1440, height: 1080, mobile: false });
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createSeedScript({
        email: onboardingEmail,
        supabaseUrl,
        browserSessionPayload: onboardingSessionPayload,
        userData: buildEmptyUserData(),
        displayName: onboardingDisplayName,
        markOnboardingComplete: false,
        phaseOverride: null,
      }),
    });
    await navigate(browser.session, `${BASE_URL}/`);
    await waitForText(browser.session, 'Modo iniciante', { timeoutMs: 30000 });
    await waitForText(browser.session, 'Vamos montar seu comeco', { timeoutMs: 30000 });
    await screenshot(browser.session, 'real-shell-local-onboarding-gate.png');
    recordStep('onboarding_gate', 'passed', {
      screenshot: 'qa-artifacts/real-shell-local-onboarding-gate.png',
    });

    await browser.close();
    browser = null;

    const shellEmail = `e2e_shell_full_${Date.now()}@zerobase.dev`;
    const shellPassword = 'ShellSmoke@2026';
    const shellDisplayName = 'QA Shell Completo';
    const shellUser = await createTempConfirmedUser(
      supabaseUrl,
      serviceRoleKey,
      shellEmail,
      shellPassword,
      shellDisplayName,
    );
    cleanupUserIds.push(shellUser.user?.id || shellUser.id || null);
    const shellSessionPayload = await createBrowserSessionPayload(
      supabaseUrl,
      publishableKey,
      shellEmail,
      shellPassword,
    );

    browser = await launchChrome(10450 + Math.floor(Math.random() * 100));
    await setViewport(browser.session, { width: 1440, height: 1080, mobile: false });
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createSeedScript({
        email: shellEmail,
        supabaseUrl,
        browserSessionPayload: shellSessionPayload,
        userData: buildSeededUserData(),
        displayName: shellDisplayName,
        markOnboardingComplete: true,
        phaseOverride: 'intermediate',
      }),
    });
    await navigate(browser.session, `${BASE_URL}/`);
    await waitForText(browser.session, 'Sair', { timeoutMs: 30000 });
    await waitForText(browser.session, 'Progresso', { timeoutMs: 30000 });
    await waitForText(browser.session, 'Sincronizar agora', { timeoutMs: 30000 });
    await closeOptionalOverlays(browser.session);

    const layoutMetrics = await getLayoutMetrics(browser.session);
    if ((layoutMetrics?.asideWidth || 0) < 180 || (layoutMetrics?.mainWidth || 0) < 900) {
      throw new Error(`Shell autenticado montou com largura inesperada: ${JSON.stringify(layoutMetrics)}`);
    }

    await screenshot(browser.session, 'real-shell-local-shell-desktop.png');
    recordStep('authenticated_shell_desktop', 'passed', {
      screenshot: 'qa-artifacts/real-shell-local-shell-desktop.png',
      layoutMetrics,
    });

    await clickByText(browser.session, 'Progresso', { exact: true });
    await waitForAnyText(browser.session, ['Painel de progresso', 'Seu progresso comeca aqui'], { timeoutMs: 30000 });
    await screenshot(browser.session, 'real-shell-local-progress-desktop.png');
    recordStep('progress_navigation', 'passed', {
      screenshot: 'qa-artifacts/real-shell-local-progress-desktop.png',
    });

    await setViewport(browser.session, { width: 390, height: 844, mobile: true });
    await waitForAnyText(browser.session, ['Painel de progresso', 'Seu progresso comeca aqui'], { timeoutMs: 30000 });
    await screenshot(browser.session, 'real-shell-local-progress-mobile.png');
    await clearViewport(browser.session);
    recordStep('responsive_mobile', 'passed', {
      screenshot: 'qa-artifacts/real-shell-local-progress-mobile.png',
    });

    await clickByText(browser.session, 'Sair', { exact: true });
    await waitForText(browser.session, 'Entrar', { timeoutMs: 30000 });
    recordStep('authenticated_shell_logout', 'passed');

    await browser.close();
    browser = null;

    const emptyEmail = `e2e_shell_empty_${Date.now()}@zerobase.dev`;
    const emptyPassword = 'ShellSmoke@2026';
    const emptyDisplayName = 'QA Shell Vazio';
    const emptyUser = await createTempConfirmedUser(
      supabaseUrl,
      serviceRoleKey,
      emptyEmail,
      emptyPassword,
      emptyDisplayName,
    );
    cleanupUserIds.push(emptyUser.user?.id || emptyUser.id || null);
    const emptySessionPayload = await createBrowserSessionPayload(
      supabaseUrl,
      publishableKey,
      emptyEmail,
      emptyPassword,
    );

    browser = await launchChrome(10550 + Math.floor(Math.random() * 100));
    await setViewport(browser.session, { width: 1440, height: 1080, mobile: false });
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createSeedScript({
        email: emptyEmail,
        supabaseUrl,
        browserSessionPayload: emptySessionPayload,
        userData: buildEmptyUserData(),
        displayName: emptyDisplayName,
        markOnboardingComplete: true,
        phaseOverride: 'intermediate',
      }),
    });
    await navigate(browser.session, `${BASE_URL}/`);
    await waitForText(browser.session, 'Sair', { timeoutMs: 30000 });
    await closeOptionalOverlays(browser.session);
    await clickByText(browser.session, 'Progresso', { exact: true });
    await waitForText(browser.session, 'Seu progresso comeca aqui.', { timeoutMs: 30000 });
    await screenshot(browser.session, 'real-shell-local-empty-progress.png');
    recordStep('empty_progress_state', 'passed', {
      screenshot: 'qa-artifacts/real-shell-local-empty-progress.png',
    });

    await clickByText(browser.session, 'Comecar sessao agora', { exact: true });
    await waitForAnyText(
      browser.session,
      [
        'Como usar o Pomodoro?',
        'Primeiro movimento',
        'Vamos dar direcao para o seu comeco',
        'Editar dia',
        'Nenhuma disciplina selecionada ainda.',
      ],
      { timeoutMs: 30000 },
    );
    await screenshot(browser.session, 'real-shell-local-empty-progress-cta.png');
    recordStep('empty_progress_cta', 'passed', {
      screenshot: 'qa-artifacts/real-shell-local-empty-progress-cta.png',
    });

    report.summary = {
      passed: report.steps.filter((step) => step.status === 'passed').length,
      failed: 0,
    };

    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    if (browser) {
      await screenshot(browser.session, 'real-shell-local-failure.png').catch(() => undefined);
    }

    report.error = error instanceof Error ? error.message : String(error);
    report.failureScreenshot = 'qa-artifacts/real-shell-local-failure.png';
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }

    for (const userId of cleanupUserIds) {
      await deleteTempUser(supabaseUrl, serviceRoleKey, userId).catch(() => undefined);
    }
  }
};

main().catch(async (error) => {
  await ensureArtifactsDir();
  console.error(error);
  process.exit(1);
});
