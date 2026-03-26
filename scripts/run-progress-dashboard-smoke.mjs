import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'progress-dashboard-smoke-report.json');

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

const normalize = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

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
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-progress-smoke-'));
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
  await waitForHttp(port, '/json/version');

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
  const dayOffsets = [0, 1, 2, 4, 6, 8, 10];
  const sessions = [
    { offset: dayOffsets[0], minutes: 95, points: 950, subject: 'Anatomia', methodId: 'deep-work' },
    { offset: dayOffsets[1], minutes: 55, points: 550, subject: 'Patologia', methodId: '52-17' },
    { offset: dayOffsets[2], minutes: 40, points: 400, subject: 'Fisiologia', methodId: 'pomodoro' },
    { offset: dayOffsets[3], minutes: 70, points: 700, subject: 'Anatomia', methodId: 'deep-work' },
    { offset: dayOffsets[4], minutes: 35, points: 350, subject: 'Histologia', methodId: 'pomodoro' },
    { offset: dayOffsets[5], minutes: 60, points: 600, subject: 'Patologia', methodId: '52-17' },
    { offset: dayOffsets[6], minutes: 45, points: 450, subject: 'Farmacologia', methodId: 'pomodoro' },
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
      quinta: 0,
      sexta: 70,
      sabado: 35,
      domingo: 0,
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

const createSeedScript = ({ email, supabaseUrl, browserSessionPayload, userData, displayName }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const authStorageKey = buildAuthStorageKey(supabaseUrl);
  const userDataKey = `zeroBaseData_${normalizedEmail}`;
  const weeklyGoalKey = `weeklyGoalMinutes_${normalizedEmail}`;
  const activeStudyModeKey = `activeStudyMode_${normalizedEmail}`;
  const phaseOverrideKey = 'zb_phase_override';

  return `
    (() => {
      try {
        window.localStorage.setItem(${JSON.stringify(`mdzOnboardingCompleted_${normalizedEmail}`)}, 'true');
        window.localStorage.setItem(${JSON.stringify(`profileDisplayName_${normalizedEmail}`)}, ${JSON.stringify(displayName)});
        window.localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(browserSessionPayload))});
        window.localStorage.setItem(${JSON.stringify(userDataKey)}, ${JSON.stringify(JSON.stringify(userData))});
        window.localStorage.setItem(${JSON.stringify(weeklyGoalKey)}, '900');
        window.localStorage.setItem(${JSON.stringify(activeStudyModeKey)}, 'pomodoro');
        window.localStorage.setItem('lastPointsCheck', ${JSON.stringify(String(userData.totalPoints || 0))});
        window.localStorage.removeItem('zb_internal_access');
        window.localStorage.setItem(${JSON.stringify(phaseOverrideKey)}, ${JSON.stringify(JSON.stringify('intermediate'))});
      } catch (error) {
        console.error('progress-dashboard-smoke-seed-failed', error);
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

const screenshot = async (session, fileName) => {
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  await fs.writeFile(path.join(ARTIFACTS_DIR, `${fileName}.png`), Buffer.from(data, 'base64'));
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

const getBodyTextExcerpt = async (session, limit = 1500) =>
  evalInPage(
    session,
    `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}))()`,
  );

const closeOptionalOverlays = async (session) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let changed = false;

    const hasFechar = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'fechar');
      })()`,
    );

    if (hasFechar && await waitFor(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return normalize(document.body?.innerText || '').includes('modo interno');
      })()`,
      { timeoutMs: 800, intervalMs: 120, label: 'modal opcional' },
    ).catch(() => false)) {
      await clickByText(session, 'Fechar', { exact: true });
      await delay(250);
      changed = true;
    }

    const hasAgoraNao = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '').includes('agora nao'));
      })()`,
    );

    if (hasAgoraNao) {
      await clickByText(session, 'Agora nao', { exact: true }).catch(() => undefined);
      await delay(250);
      changed = true;
    }

    const hasContinuar = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'continuar');
      })()`,
    );

    if (hasContinuar && await waitForAnyText(session, ['Level Up!', 'Level up!'], { timeoutMs: 800, intervalMs: 120 }).catch(() => false)) {
      await clickByText(session, 'Continuar', { exact: true }).catch(() => undefined);
      await delay(250);
      changed = true;
    }

    if (!changed) {
      break;
    }
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

const openDashboard = async (session) => {
  await closeOptionalOverlays(session);
  await waitForText(session, 'Progresso', { timeoutMs: 30000 });
  await clickByText(session, 'Progresso', { exact: true });
};

const seedUserData = async (session, email, userData, displayName = 'QA Progresso') => {
  const userDataKey = `zeroBaseData_${email.trim().toLowerCase()}`;
  const profileDisplayNameKey = `profileDisplayName_${email.trim().toLowerCase()}`;
  await evalInPage(
    session,
    `(() => {
      window.localStorage.setItem(${JSON.stringify(userDataKey)}, ${JSON.stringify(JSON.stringify(userData))});
      window.localStorage.setItem(${JSON.stringify(profileDisplayNameKey)}, ${JSON.stringify(displayName)});
      window.localStorage.setItem('lastPointsCheck', ${JSON.stringify(String(userData.totalPoints || 0))});
      return true;
    })()`,
  );
};

const waitForDataDashboard = async (session) => {
  await closeOptionalOverlays(session);
  await waitForText(session, 'Painel de progresso', { timeoutMs: 20000 });
  await waitForText(session, 'Hoje', { timeoutMs: 20000 });
  await waitForText(session, 'Semana', { timeoutMs: 20000 });
  await waitForAnyText(session, ['Evolucao', 'Evolução'], { timeoutMs: 20000 });
  await waitForText(session, 'Streak', { timeoutMs: 20000 });
  await waitForText(session, 'Pulso da semana', { timeoutMs: 20000 });
  await waitForText(session, 'Distribuicao da semana', { timeoutMs: 20000 });
  await waitForAnyText(session, ['Proxima melhor acao', 'Próxima melhor ação'], { timeoutMs: 20000 });
};

const waitForEmptyDashboard = async (session) => {
  await waitForText(session, 'Seu progresso comeca aqui.', { timeoutMs: 20000 });
  await waitForText(session, 'O que aparece depois', { timeoutMs: 20000 });
  await waitForText(session, 'Comecar sessao agora', { timeoutMs: 20000 });
};

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
    throw new Error('Credenciais/config E2E ausentes para o smoke de Progresso.');
  }

  const baseUrl = (process.env.PROGRESS_QA_BASE_URL || 'https://zero-base-three.vercel.app').replace(/\/+$/, '');
  const browserSessionPayload = await createBrowserSessionPayload(
    supabaseUrl,
    publishableKey,
    loginEmail,
    loginPassword,
  );
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    steps: [],
  };

  const recordStep = (name, status, details = {}) => {
    report.steps.push({ name, status, ...details });
  };

  let browser = null;
  let tempEmptyUserId = null;

  try {
    const remotePort = 9950 + Math.floor(Math.random() * 80);
    browser = await launchChrome(remotePort);
    await setViewport(browser.session, { width: 1440, height: 1080, mobile: false });

    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createSeedScript({
        email: loginEmail,
        supabaseUrl,
        browserSessionPayload,
        userData: buildSeededUserData(),
        displayName: 'QA Progresso',
      }),
    });

    await navigate(browser.session, `${baseUrl}/`);
    await openDashboard(browser.session);
    await waitForDataDashboard(browser.session);
    recordStep('progress_hero', 'passed');

    await screenshot(browser.session, 'progress-dashboard-smoke-desktop');
    recordStep('desktop_capture', 'passed', {
      screenshot: 'qa-artifacts/progress-dashboard-smoke-desktop.png',
    });

    await setViewport(browser.session, { width: 390, height: 844, mobile: true });
    await waitForText(browser.session, 'Painel de progresso');
    await screenshot(browser.session, 'progress-dashboard-smoke-mobile');
    await clearViewport(browser.session);
    recordStep('responsive_mobile', 'passed', {
      screenshot: 'qa-artifacts/progress-dashboard-smoke-mobile.png',
    });

    await browser.close();
    browser = null;

    const tempEmail = `e2e_progress_empty_${Date.now()}@zerobase.dev`;
    const tempPassword = 'ProgressSmoke@2026';
    const tempDisplayName = 'QA Progresso Vazio';
    const tempUser = await createTempConfirmedUser(
      supabaseUrl,
      serviceRoleKey,
      tempEmail,
      tempPassword,
      tempDisplayName,
    );
    tempEmptyUserId = tempUser.user?.id || tempUser.id || null;

    const emptySessionPayload = await createBrowserSessionPayload(
      supabaseUrl,
      publishableKey,
      tempEmail,
      tempPassword,
    );

    const emptyPort = 10050 + Math.floor(Math.random() * 80);
    browser = await launchChrome(emptyPort);
    await setViewport(browser.session, { width: 1440, height: 1080, mobile: false });
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createSeedScript({
        email: tempEmail,
        supabaseUrl,
        browserSessionPayload: emptySessionPayload,
        userData: buildEmptyUserData(),
        displayName: tempDisplayName,
      }),
    });

    await navigate(browser.session, `${baseUrl}/`);
    await openDashboard(browser.session);
    await waitForEmptyDashboard(browser.session);
    recordStep('empty_state', 'passed');

    await screenshot(browser.session, 'progress-dashboard-empty-state');
    recordStep('empty_capture', 'passed', {
      screenshot: 'qa-artifacts/progress-dashboard-empty-state.png',
    });

    await clickByText(browser.session, 'Comecar sessao agora', { exact: true });
    await waitForAnyText(
      browser.session,
      ['Como usar o Pomodoro?', 'Primeiro movimento', 'Vamos dar direcao para o seu comeco'],
      { timeoutMs: 20000 },
    );

    const ctaLanding = await evalInPage(
      browser.session,
      `(() => {
        const hasTimer = Boolean(document.querySelector('[data-testid="study-pomodoro-timer-ready"]'));
        const text = (document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
        if (hasTimer || text.includes('Como usar o Pomodoro?')) {
          return 'timer';
        }
        if (text.includes('Primeiro movimento') || text.includes('Vamos dar direcao para o seu comeco')) {
          return 'guided_start';
        }
        return 'unknown';
      })()`,
    );

    if (ctaLanding === 'unknown') {
      throw new Error('CTA do empty state nao levou nem ao timer nem ao fluxo guiado de inicio.');
    }

    recordStep('empty_state_cta', 'passed', { landing: ctaLanding });

    report.summary = {
      passed: report.steps.filter((step) => step.status === 'passed').length,
      failed: 0,
    };

    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    report.debug = {
      excerpt: browser ? await getBodyTextExcerpt(browser.session).catch(() => '') : '',
    };
    if (browser) {
      await screenshot(browser.session, 'progress-dashboard-smoke-failure').catch(() => undefined);
    }
    report.failureScreenshot = 'qa-artifacts/progress-dashboard-smoke-failure.png';
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
    if (tempEmptyUserId) {
      await deleteTempUser(supabaseUrl, serviceRoleKey, tempEmptyUserId).catch(() => undefined);
    }
  }
};

main().catch(async (error) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: error.message,
  };
  await ensureArtifactsDir();
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  console.error(error);
  process.exit(1);
});
