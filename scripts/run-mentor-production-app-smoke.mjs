import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'mentor-production-app-smoke.json');
const APP_URL = process.env.MENTOR_APP_URL || 'https://zero-base-three.vercel.app';
const DEBUG_PORT = 9333;

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

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    acc[key] = value;
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

const findChromePath = async () => {
  for (const candidate of chromeCandidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error('Nenhum Chrome/Edge encontrado para o smoke headless.');
};

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-mentor-prod-smoke-'));
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--window-size=1440,2200',
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
        // ignore close issues
      }

      chrome.kill();
      await delay(300);

      try {
        await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch {
        // ignore temporary locked files
      }
    },
  };
};

const createBrowserSessionPayload = async (supabaseUrl, publishableKey, email, password) => {
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
    throw new Error(`Nao foi possivel criar sessao do navegador (${response.status}): ${body.slice(0, 300)}`);
  }

  return response.json();
};

const buildAuthStorageKey = (supabaseUrl) => {
  const ref = new URL(supabaseUrl).host.split('.')[0];
  return `sb-${ref}-auth-token`;
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

const textExists = async (session, text) =>
  evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      return normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })()`,
  );

const clickByText = async (session, text, { exact = false, tagName = null } = {}) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(text)});
      const selector = ${JSON.stringify(tagName || 'button, a, [role="button"]')};
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
    })()`,
  );

  if (!clicked) {
    throw new Error(`Nao encontrei elemento clicavel com texto: ${text}`);
  }
};

const safeClickByText = async (session, text, options = {}) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(text)});
      const selector = ${JSON.stringify(options.tagName || 'button, a, [role="button"]')};
      const nodes = Array.from(document.querySelectorAll(selector)).filter((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return true;
      });
      const match = nodes.find((candidate) => {
        const content = normalize(candidate.textContent || '');
        return ${options.exact ? 'content === target' : 'content.includes(target)'};
      });
      if (!match) return false;
      match.scrollIntoView({ block: 'center', inline: 'center' });
      match.click();
      return true;
    })()`,
  );

  return Boolean(clicked);
};

const screenshot = async (session, fileName) => {
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  await fs.writeFile(path.join(ARTIFACTS_DIR, `${fileName}.png`), Buffer.from(data, 'base64'));
};

const getBodyTextExcerpt = async (session, limit = 1200) =>
  evalInPage(
    session,
    `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}))()`,
  );

const getClickableTextSnapshot = async (session, limit = 20) =>
  evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
      return Array.from(document.querySelectorAll('button, a, [role="button"]'))
        .map((node) => normalize(node.textContent))
        .filter(Boolean)
        .slice(0, ${limit});
    })()`,
  );

const navigate = async (session, url) => {
  await session.send('Page.navigate', { url });
  await waitFor(session, 'document.readyState === "complete"', { timeoutMs: 45000, label: 'load complete' });
  await waitFor(
    session,
    'Boolean(document.body && document.body.innerText.trim().length > 0)',
    { timeoutMs: 45000, label: 'conteudo da pagina' },
  );
};

const dismissOptionalOverlays = async (session) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let changed = false;

    if (await textExists(session, 'Agora nao')) {
      await clickByText(session, 'Agora nao', { exact: true });
      await delay(250);
      changed = true;
    }

    if (await textExists(session, 'Modo interno') && await textExists(session, 'Fechar')) {
      await clickByText(session, 'Fechar', { exact: true });
      await delay(250);
      changed = true;
    }

    if (!changed) {
      break;
    }
  }
};

const prepareMentorNavigation = async (session) => {
  await waitForText(session, 'Mentor IA', { timeoutMs: 30000 });
  await delay(400);
  await dismissOptionalOverlays(session);
  if (await textExists(session, 'Modo interno') && await textExists(session, 'Fechar')) {
    await clickByText(session, 'Fechar', { exact: true });
    await delay(300);
  }
  if (await textExists(session, 'Agora nao')) {
    await clickByText(session, 'Agora nao', { exact: true });
    await delay(300);
  }
};

const openMentor = async (session) => {
  await prepareMentorNavigation(session);
  if (await textExists(session, 'Mentor IA Proativo')) {
    await waitForText(session, 'Briefing semanal do Mentor', { timeoutMs: 30000 });
    return;
  }

  if (await safeClickByText(session, 'Abrir mentor', { exact: true })) {
    await waitForText(session, 'Mentor IA Proativo', { timeoutMs: 30000 });
    await waitForText(session, 'Briefing semanal do Mentor', { timeoutMs: 30000 });
    return;
  }

  if (await safeClickByText(session, 'Mais no app', { exact: true })) {
    await delay(400);
    if (await safeClickByText(session, 'Mentor IA', { exact: true })) {
      await waitForText(session, 'Mentor IA Proativo', { timeoutMs: 30000 });
      await waitForText(session, 'Briefing semanal do Mentor', { timeoutMs: 30000 });
      return;
    }
  }

  if (await safeClickByText(session, 'Mentor IA', { exact: true })) {
    await waitForText(session, 'Mentor IA Proativo', { timeoutMs: 30000 });
    await waitForText(session, 'Briefing semanal do Mentor', { timeoutMs: 30000 });
    return;
  }

  throw new Error('Nao foi possivel navegar ate o Mentor IA pelo shell publicado.');
};

const buildScenarioUserData = () => ({
  weekProgress: {
    domingo: { studied: false, minutes: 0 },
    segunda: { studied: true, minutes: 25 },
    terca: { studied: true, minutes: 40 },
    quarta: { studied: false, minutes: 0 },
    quinta: { studied: false, minutes: 0 },
    sexta: { studied: false, minutes: 0 },
    sabado: { studied: false, minutes: 0 },
  },
  completedTopics: {},
  totalPoints: 0,
  streak: 2,
  bestStreak: 2,
  achievements: [],
  level: 3,
  studyHistory: [
    {
      date: '2026-03-27T10:00:00.000Z',
      minutes: 25,
      points: 0,
      subject: 'Matematica',
      duration: 25,
    },
    {
      date: '2026-03-26T10:00:00.000Z',
      minutes: 40,
      points: 0,
      subject: 'Linguagens',
      duration: 40,
    },
  ],
  dailyGoal: 60,
  sessions: [],
  currentStreak: 2,
});

const seedStorage = async (session, { authStorageKey, browserSessionPayload, email }) => {
  const scope = email.toLowerCase();
  const userData = buildScenarioUserData();
  const mentorLlmCallsKey = `mdz_mentor_llm_calls_${scope}`;
  const entries = [
    [`zeroBaseData_${scope}`, JSON.stringify(userData)],
    [`weeklyGoalMinutes_${scope}`, JSON.stringify(300)],
    [`selectedStudyMethodId_${scope}`, JSON.stringify('pomodoro')],
    [`preferredStudyTrack_${scope}`, JSON.stringify('enem')],
    [`activeStudyMode_${scope}`, JSON.stringify('pomodoro')],
    [`profileDisplayName_${scope}`, JSON.stringify('QA Mentor')],
    [`profileExamGoal_${scope}`, JSON.stringify('ENEM')],
    [`profileExamDate_${scope}`, JSON.stringify('2026-04-11')],
    ['zb_phase_override', JSON.stringify('intermediate')],
    [authStorageKey, JSON.stringify(browserSessionPayload)],
    [mentorLlmCallsKey, JSON.stringify({ count: 2, startedAt: new Date().toISOString() })],
  ];

  await evalInPage(
    session,
    `(() => {
      window.localStorage.clear();
      const entries = ${JSON.stringify(entries)};
      for (const [key, value] of entries) {
        window.localStorage.setItem(key, value);
      }
      window.localStorage.setItem(${JSON.stringify(`mdzOnboardingCompleted_${scope}`)}, 'true');
      return true;
    })()`,
  );
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
  const supabaseUrl =
    process.env.SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || cypressEnv.SUPABASE_URL
    || envFile.SUPABASE_URL
    || envFile.VITE_SUPABASE_URL;

  if (!loginEmail || !loginPassword || !publishableKey || !supabaseUrl) {
    throw new Error('Credenciais/config E2E ausentes para o smoke do Mentor em producao.');
  }

  const browserSessionPayload = await createBrowserSessionPayload(
    supabaseUrl,
    publishableKey,
    loginEmail,
    loginPassword,
  );
  const authStorageKey = buildAuthStorageKey(supabaseUrl);
  let browser = null;

  try {
    browser = await launchChrome(DEBUG_PORT);
    await navigate(browser.session, APP_URL);
    await seedStorage(browser.session, {
      authStorageKey,
      browserSessionPayload,
      email: loginEmail,
    });
    await navigate(browser.session, APP_URL);
    await openMentor(browser.session);
    await waitForText(browser.session, 'Prioridade:', { timeoutMs: 30000 });
    await waitForText(browser.session, 'Matematica', { timeoutMs: 30000 });
    await screenshot(browser.session, 'mentor-production-app-smoke');

    const excerpt = await getBodyTextExcerpt(browser.session, 1000);
    const report = {
      ok: true,
      appUrl: APP_URL,
      generatedAt: new Date().toISOString(),
      screenshot: 'qa-artifacts/mentor-production-app-smoke.png',
      excerpt,
    };

    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    const report = {
      ok: false,
      appUrl: APP_URL,
      generatedAt: new Date().toISOString(),
      error: message,
      screenshot: null,
      excerpt: null,
      clickableTexts: null,
    };

    if (browser?.session) {
      try {
        await screenshot(browser.session, 'mentor-production-app-smoke-failure');
        report.screenshot = 'qa-artifacts/mentor-production-app-smoke-failure.png';
      } catch {
        // ignore screenshot failures
      }

      try {
        report.excerpt = await getBodyTextExcerpt(browser.session, 1600);
      } catch {
        // ignore excerpt failures
      }

      try {
        report.clickableTexts = await getClickableTextSnapshot(browser.session, 30);
      } catch {
        // ignore clickable snapshot failures
      }
    }

    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
