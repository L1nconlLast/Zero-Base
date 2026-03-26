import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'mentor-memory-smoke-report.json');
const PORT = 4175;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const weekDayMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

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
  return raw
    .split(/\r?\n/)
    .reduce((acc, line) => {
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

  const raw = await fs.readFile(targetPath, 'utf8');
  return JSON.parse(raw);
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
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-mentor-smoke-'));
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

const createStaticServer = async () => {
  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
      let filePath = path.join(DIST_DIR, decodeURIComponent(requestUrl.pathname));

      if (requestUrl.pathname === '/' || requestUrl.pathname === '') {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      if (!(await fileExists(filePath))) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      const ext = path.extname(filePath);
      const content = await fs.readFile(filePath);
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(content);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(String(error));
    }
  });

  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  return server;
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

const isoDaysAgo = (daysAgo, hour = 8) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

const buildWeekProgress = (sessions) => {
  const progress = {
    domingo: { studied: false, minutes: 0 },
    segunda: { studied: false, minutes: 0 },
    terca: { studied: false, minutes: 0 },
    quarta: { studied: false, minutes: 0 },
    quinta: { studied: false, minutes: 0 },
    sexta: { studied: false, minutes: 0 },
    sabado: { studied: false, minutes: 0 },
  };

  sessions.forEach((session) => {
    const date = new Date(session.date);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const key = weekDayMap[date.getDay()];
    progress[key] = {
      studied: true,
      minutes: progress[key].minutes + Math.max(0, session.minutes || 0),
    };
  });

  return progress;
};

const buildUserData = (sessions) => ({
  weekProgress: buildWeekProgress(sessions),
  completedTopics: {},
  totalPoints: sessions.reduce((sum, session) => sum + (session.points || 0), 0),
  streak: 2,
  bestStreak: 2,
  achievements: [],
  level: 2,
  studyHistory: sessions,
  dailyGoal: 60,
  sessions,
  currentStreak: 2,
});

const initialSessions = [
  {
    date: isoDaysAgo(0, 8),
    minutes: 10,
    points: 0,
    subject: 'Farmacologia',
    duration: 10,
  },
  {
    date: isoDaysAgo(1, 8),
    minutes: 20,
    points: 0,
    subject: 'Patologia',
    duration: 20,
  },
  {
    date: isoDaysAgo(2, 8),
    minutes: 60,
    points: 0,
    subject: 'Anatomia',
    duration: 60,
  },
];

const progressedSessions = [
  {
    date: isoDaysAgo(0, 8),
    minutes: 35,
    points: 0,
    subject: 'Farmacologia',
    duration: 35,
  },
  {
    date: isoDaysAgo(1, 8),
    minutes: 20,
    points: 0,
    subject: 'Patologia',
    duration: 20,
  },
  {
    date: isoDaysAgo(2, 8),
    minutes: 60,
    points: 0,
    subject: 'Anatomia',
    duration: 60,
  },
  {
    date: isoDaysAgo(3, 8),
    minutes: 15,
    points: 0,
    subject: 'Farmacologia',
    duration: 15,
  },
];

const createSeedScript = ({
  authStorageKey,
  browserSessionPayload,
  email,
  userData,
}) => {
  const scope = email.toLowerCase();
  const mentorLlmCallsKey = `mdz_mentor_llm_calls_${scope}`;
  const entries = [
    [`zeroBaseData_${scope}`, JSON.stringify(userData)],
    [`weeklyGoalMinutes_${scope}`, JSON.stringify(300)],
    [`selectedStudyMethodId_${scope}`, JSON.stringify('pomodoro')],
    [`preferredStudyTrack_${scope}`, JSON.stringify('enem')],
    [`activeStudyMode_${scope}`, JSON.stringify('pomodoro')],
    [`profileDisplayName_${scope}`, JSON.stringify('QA Mentor')],
    ['zb_phase_override', JSON.stringify('intermediate')],
    [authStorageKey, JSON.stringify(browserSessionPayload)],
    [mentorLlmCallsKey, JSON.stringify({ count: 2, startedAt: new Date().toISOString() })],
  ];

  const tableStubs = {
    study_sessions: '[]',
    user_profile: 'null',
    user_profile_preferences: 'null',
    user_study_preferences: 'null',
  };

  return `
    (() => {
      const originalFetch = window.fetch.bind(window);
      const tableStubs = ${JSON.stringify(tableStubs)};
      window.fetch = async (input, init) => {
        const url =
          typeof input === 'string'
            ? input
            : input && typeof input.url === 'string'
              ? input.url
              : '';
        for (const [tableName, body] of Object.entries(tableStubs)) {
          if (url.includes('.supabase.co/rest/v1/' + tableName)) {
            return new Response(body, {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
        return originalFetch(input, init);
      };

      try {
        window.localStorage.clear();
        const entries = ${JSON.stringify(entries)};
        for (const [key, value] of entries) {
          window.localStorage.setItem(key, value);
        }
        window.localStorage.setItem(${JSON.stringify(`mdzOnboardingCompleted_${scope}`)}, 'true');
      } catch (error) {
        console.error('mentor-memory-seed-failed', error);
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

const waitForTextGone = async (session, text, options = {}) =>
  waitFor(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      return !normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })()`,
    { ...options, label: `texto desaparecer "${text}"` },
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

const navigate = async (session, url) => {
  await session.send('Page.navigate', { url });
  await waitFor(session, 'document.readyState === "complete"', { timeoutMs: 45000, label: 'load complete' });
  await waitFor(
    session,
    'Boolean(document.body && document.body.innerText.trim().length > 0)',
    { timeoutMs: 45000, label: 'conteudo da pagina' },
  );
};

const reloadApp = async (session) => navigate(session, `http://127.0.0.1:${PORT}/`);

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

const readMentorMemory = async (session, storageKey) =>
  evalInPage(
    session,
    `(() => {
      try {
        const raw = window.localStorage.getItem(${JSON.stringify(storageKey)});
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })()`,
  );

const setLocalStorageJson = async (session, key, value) => {
  await evalInPage(
    session,
    `(() => {
      window.localStorage.setItem(${JSON.stringify(key)}, JSON.stringify(${JSON.stringify(value)}));
      return true;
    })()`,
  );
};

const openMentor = async (session) => {
  await prepareMentorNavigation(session);
  await clickByText(session, 'Mentor IA', { exact: true });
  if (!(await textExists(session, 'Mentor IA Proativo'))) {
    await prepareMentorNavigation(session);
    await clickByText(session, 'Mentor IA', { exact: true });
  }
  await waitForText(session, 'Mentor IA Proativo', { timeoutMs: 30000 });
  await waitForText(session, 'Briefing semanal do Mentor', { timeoutMs: 30000 });
};

const waitForMentorMemory = async (session, storageKey, predicateExpression, label) =>
  waitFor(
    session,
    `(() => {
      try {
        const raw = window.localStorage.getItem(${JSON.stringify(storageKey)});
        if (!raw) return false;
        const memory = JSON.parse(raw);
        return (${predicateExpression});
      } catch {
        return false;
      }
    })()`,
    { timeoutMs: 30000, label },
  );

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const main = async () => {
  await ensureArtifactsDir();

  if (!(await fileExists(path.join(DIST_DIR, 'index.html')))) {
    throw new Error('dist/index.html nao existe. Rode o build antes do smoke do Mentor IA.');
  }

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
    throw new Error('Credenciais/config E2E ausentes para o smoke do Mentor IA.');
  }

  const browserSessionPayload = await createBrowserSessionPayload(
    supabaseUrl,
    publishableKey,
    loginEmail,
    loginPassword,
  );

  const authStorageKey = buildAuthStorageKey(supabaseUrl);
  const scope = loginEmail.trim().toLowerCase();
  const mentorMemoryKey = `mdz_mentor_memory_${scope}`;
  const userDataKey = `zeroBaseData_${scope}`;
  const report = {
    generatedAt: new Date().toISOString(),
    loginEmail: scope,
    steps: [],
  };

  const recordStep = (name, status, details = {}) => {
    report.steps.push({ name, status, ...details });
  };

  const server = await createStaticServer();
  const remotePort = 9850 + Math.floor(Math.random() * 100);
  const browser = await launchChrome(remotePort);

  try {
    const seedScriptId = await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createSeedScript({
        authStorageKey,
        browserSessionPayload,
        email: scope,
        userData: buildUserData(initialSessions),
      }),
    });

    await navigate(browser.session, `http://127.0.0.1:${PORT}/`);
    await browser.session.send('Page.removeScriptToEvaluateOnNewDocument', {
      identifier: seedScriptId.identifier,
    });

    await openMentor(browser.session);
    await waitForMentorMemory(
      browser.session,
      mentorMemoryKey,
      "memory.lastAnalysisAt > 0 && memory.lastFocus === 'Farmacologia' && memory.lastBriefing && memory.lastBriefing.prioridade === 'Farmacologia'",
      'memoria inicial do mentor',
    );

    const initialMemory = await readMentorMemory(browser.session, mentorMemoryKey);
    assert(initialMemory, 'Memoria inicial do mentor nao foi salva.');
    assert(initialMemory.lastFocus === 'Farmacologia', `Foco inicial inesperado: ${initialMemory.lastFocus}`);
    assert(initialMemory.previousFocus === null, 'A memoria inicial nao deveria ter previousFocus.');
    assert(
      String(initialMemory.focusShiftReason || '').includes('Farmacologia'),
      `Razao inicial inesperada: ${initialMemory.focusShiftReason || 'vazia'}`,
    );
    assert(await textExists(browser.session, 'Prioridade:'), 'A UI do mentor nao exibiu o bloco de prioridade.');
    assert(await textExists(browser.session, initialMemory.focusShiftReason), 'A UI nao refletiu a razao inicial salva em memoria.');
    await screenshot(browser.session, 'mentor-memory-smoke-initial');
    recordStep('initial_focus', 'passed', {
      focus: initialMemory.lastFocus,
      reason: initialMemory.focusShiftReason,
      screenshot: 'qa-artifacts/mentor-memory-smoke-initial.png',
    });

    await reloadApp(browser.session);
    await openMentor(browser.session);
    await waitForMentorMemory(
      browser.session,
      mentorMemoryKey,
      `memory.lastAnalysisAt === ${initialMemory.lastAnalysisAt} && memory.lastFocus === 'Farmacologia' && memory.focusShiftReason === ${JSON.stringify(initialMemory.focusShiftReason)}`,
      'persistencia apos refresh',
    );

    const persistedMemory = await readMentorMemory(browser.session, mentorMemoryKey);
    assert(
      persistedMemory.lastAnalysisAt === initialMemory.lastAnalysisAt,
      'O mentor recalculou a analise ao recarregar sem mudanca relevante.',
    );
    recordStep('refresh_persistence', 'passed', {
      focus: persistedMemory.lastFocus,
      lastAnalysisAt: persistedMemory.lastAnalysisAt,
    });

    for (let index = 0; index < 2; index += 1) {
      await clickByText(browser.session, 'Inicio', { exact: true });
      await waitForTextGone(browser.session, 'Mentor IA Proativo', { timeoutMs: 15000 });
      await openMentor(browser.session);
      await waitForMentorMemory(
        browser.session,
        mentorMemoryKey,
        `memory.lastAnalysisAt === ${initialMemory.lastAnalysisAt} && memory.lastFocus === 'Farmacologia' && memory.focusShiftReason === ${JSON.stringify(initialMemory.focusShiftReason)}`,
        `anti spam sem mudanca #${index + 1}`,
      );
    }

    recordStep('anti_spam_without_change', 'passed', {
      focus: initialMemory.lastFocus,
      stableAnalysisAt: initialMemory.lastAnalysisAt,
    });

    await setLocalStorageJson(browser.session, userDataKey, buildUserData(progressedSessions));
    await reloadApp(browser.session);
    await openMentor(browser.session);
    await waitForMentorMemory(
      browser.session,
      mentorMemoryKey,
      `memory.lastAnalysisAt > ${initialMemory.lastAnalysisAt} && memory.lastFocus === 'Patologia' && memory.previousFocus === 'Farmacologia' && String(memory.focusShiftReason || '').includes('Boa evolucao em Farmacologia')`,
      'troca de foco apos progresso',
    );

    const shiftedMemory = await readMentorMemory(browser.session, mentorMemoryKey);
    assert(shiftedMemory.lastFocus === 'Patologia', `Foco apos progresso inesperado: ${shiftedMemory.lastFocus}`);
    assert(shiftedMemory.previousFocus === 'Farmacologia', `previousFocus inesperado: ${shiftedMemory.previousFocus}`);
    assert(
      String(shiftedMemory.focusShiftReason || '').includes('Boa evolucao em Farmacologia'),
      `Razao de mudanca inesperada: ${shiftedMemory.focusShiftReason || 'vazia'}`,
    );
    assert(
      !(shiftedMemory.lastFocus === initialMemory.lastFocus && shiftedMemory.focusShiftReason === initialMemory.focusShiftReason),
      'O mentor repetiu cegamente a recomendacao anterior depois da mudanca de contexto.',
    );
    assert(await textExists(browser.session, shiftedMemory.focusShiftReason), 'A UI nao refletiu a nova razao salva em memoria.');
    await screenshot(browser.session, 'mentor-memory-smoke-shifted');
    recordStep('focus_shift_after_context_change', 'passed', {
      focus: shiftedMemory.lastFocus,
      previousFocus: shiftedMemory.previousFocus,
      reason: shiftedMemory.focusShiftReason,
      screenshot: 'qa-artifacts/mentor-memory-smoke-shifted.png',
    });

    await reloadApp(browser.session);
    await openMentor(browser.session);
    await waitForMentorMemory(
      browser.session,
      mentorMemoryKey,
      `memory.lastAnalysisAt === ${shiftedMemory.lastAnalysisAt} && memory.lastFocus === 'Patologia' && memory.previousFocus === 'Farmacologia' && memory.focusShiftReason === ${JSON.stringify(shiftedMemory.focusShiftReason)}`,
      'persistencia da troca de foco',
    );

    await clickByText(browser.session, 'Inicio', { exact: true });
    await waitForTextGone(browser.session, 'Mentor IA Proativo', { timeoutMs: 15000 });
    await openMentor(browser.session);
    await waitForMentorMemory(
      browser.session,
      mentorMemoryKey,
      `memory.lastAnalysisAt === ${shiftedMemory.lastAnalysisAt} && memory.lastFocus === 'Patologia' && memory.previousFocus === 'Farmacologia' && memory.focusShiftReason === ${JSON.stringify(shiftedMemory.focusShiftReason)}`,
      'anti spam apos troca de foco',
    );

    recordStep('post_shift_persistence_and_cooldown', 'passed', {
      focus: shiftedMemory.lastFocus,
      lastAnalysisAt: shiftedMemory.lastAnalysisAt,
    });

    report.summary = {
      passed: report.steps.filter((step) => step.status === 'passed').length,
      failed: 0,
    };

    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const excerpt = await getBodyTextExcerpt(browser.session).catch(() => '');
    const currentMemory = await readMentorMemory(browser.session, mentorMemoryKey).catch(() => null);
    const currentUserData = await evalInPage(
      browser.session,
      `(() => {
        try {
          const raw = window.localStorage.getItem(${JSON.stringify(userDataKey)});
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })()`,
    ).catch(() => null);
    report.debug = { excerpt };
    report.currentMemory = currentMemory;
    report.currentUserData = currentUserData;
    await screenshot(browser.session, 'mentor-memory-smoke-failure').catch(() => undefined);
    report.failureScreenshot = 'qa-artifacts/mentor-memory-smoke-failure.png';
    report.error = error.message;
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    throw error;
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
};

main().catch(async (error) => {
  if (!(await fileExists(REPORT_PATH))) {
    await ensureArtifactsDir();
    const report = {
      generatedAt: new Date().toISOString(),
      error: error.message,
    };
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  }
  console.error(error);
  process.exit(1);
});
