import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'timer-recovery-smoke-report.json');
const PORT = 4173;

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

const normalize = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const todayWeekKey = () => {
  const day = new Date().getDay();
  if (day === 0) return 'domingo';
  if (day === 1) return 'segunda';
  if (day === 2) return 'terca';
  if (day === 3) return 'quarta';
  if (day === 4) return 'quinta';
  if (day === 5) return 'sexta';
  return 'sabado';
};

const buildWeeklySchedule = (subjectLabels) => {
  const todayKey = todayWeekKey();
  const dayMap = {
    domingo: 'sunday',
    segunda: 'monday',
    terca: 'tuesday',
    quarta: 'wednesday',
    quinta: 'thursday',
    sexta: 'friday',
    sabado: 'saturday',
  };

  const englishToday = dayMap[todayKey];
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

  weekPlan[englishToday] = { subjectLabels };
  availability[englishToday] = true;

  return {
    weekPlan,
    availability,
    preferences: {
      defaultSessionDurationMinutes: 25,
      sessionsPerDay: 1,
    },
    updatedAt: new Date().toISOString(),
  };
};

const buildSeededUserData = () => ({
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
  dailyGoal: 90,
  sessions: [],
  currentStreak: 0,
});

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

  throw new Error('Nenhum Chrome/Edge encontrado para o smoke do timer.');
};

const launchChrome = async (port, existingUserDataDir) => {
  const chromePath = await findChromePath();
  const userDataDir =
    existingUserDataDir || await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-timer-smoke-'));

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
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('DOM.enable');

  const waitForChromeExit = async (timeoutMs = 4000) =>
    new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }

        settled = true;
        resolve();
      };

      chrome.once('exit', finish);
      chrome.once('close', finish);
      setTimeout(finish, timeoutMs);
    });

  return {
    session,
    userDataDir,
    close: async ({ preserveProfile = false, graceful = false } = {}) => {
      try {
        if (graceful) {
          try {
            await session.send('Browser.close');
          } catch {
            // fall back to direct close below
          }

          await waitForChromeExit(preserveProfile ? 6500 : 4000);
        }

        await session.close();
      } catch {
        // ignore close issues
      }

      if (!graceful || chrome.exitCode === null) {
        chrome.kill();
        await waitForChromeExit(2000);
      }

      await delay(preserveProfile ? 1200 : 300);

      if (!preserveProfile) {
        try {
          await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
        } catch {
          // ignore locked files
        }
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

const createSeedScript = ({
  email,
  supabaseUrl,
  browserSessionPayload,
  activeStudyMode,
  selectedMethodId = 'pomodoro',
  plannedFocusDuration = 25,
  studyExecutionState,
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const authStorageKey = buildAuthStorageKey(supabaseUrl);
  const seededUserData = buildSeededUserData();
  const weeklySchedule = buildWeeklySchedule(['Matematica']);
  const smokeSeedKey = '__timer_smoke_seeded__';
  const initialStudyExecutionState = studyExecutionState || {
    currentBlock: {
      subject: 'Matematica',
      topicName: 'Porcentagem',
      objective: 'Executar o bloco principal do plano de hoje.',
      type: 'focus',
      duration: 1,
      targetQuestions: 10,
    },
    recommendedMethodId: selectedMethodId,
    source: 'ai',
    updatedAt: new Date().toISOString(),
  };

  return `
    (() => {
      try {
        if (window.localStorage.getItem(${JSON.stringify(smokeSeedKey)}) === 'true') {
          return;
        }

        const removeKeys = [
          'mdz_analytics_events',
          'zb_internal_access',
          'zb_phase_override',
          ${JSON.stringify(`zeroBaseData_${normalizedEmail}`)},
          ${JSON.stringify(`profileDisplayName_${normalizedEmail}`)},
          ${JSON.stringify(`preferredStudyTrack_${normalizedEmail}`)},
          ${JSON.stringify(`selectedStudyMethodId_${normalizedEmail}`)},
          ${JSON.stringify(`plannedFocusDuration_${normalizedEmail}`)},
          ${JSON.stringify(`activeStudyMode_${normalizedEmail}`)},
          ${JSON.stringify(`weeklyStudySchedule_${normalizedEmail}`)},
          ${JSON.stringify(`studyExecutionState_${normalizedEmail}`)},
          ${JSON.stringify(`study-timer-session_${normalizedEmail}`)},
          ${JSON.stringify(`pomodoro-session_${normalizedEmail}`)},
        ];

        removeKeys.forEach((key) => window.localStorage.removeItem(key));

        window.localStorage.setItem(${JSON.stringify(`mdzOnboardingCompleted_${normalizedEmail}`)}, 'true');
        window.localStorage.setItem(${JSON.stringify(`zeroBaseData_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(seededUserData))});
        window.localStorage.setItem(${JSON.stringify(`profileDisplayName_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify('QA Timer'))});
        window.localStorage.setItem(${JSON.stringify(`preferredStudyTrack_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify('enem'))});
        window.localStorage.setItem(${JSON.stringify(`selectedStudyMethodId_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(selectedMethodId))});
        window.localStorage.setItem(${JSON.stringify(`plannedFocusDuration_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(plannedFocusDuration))});
        window.localStorage.setItem(${JSON.stringify(`activeStudyMode_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(activeStudyMode))});
        window.localStorage.setItem(${JSON.stringify(`weeklyStudySchedule_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(weeklySchedule))});
        window.localStorage.setItem(${JSON.stringify(`studyExecutionState_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(initialStudyExecutionState))});
        window.localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(browserSessionPayload))});
        window.localStorage.setItem('zb_internal_access', 'true');
        window.localStorage.setItem('zb_phase_override', ${JSON.stringify(JSON.stringify('intermediate'))});
        window.localStorage.setItem(${JSON.stringify(smokeSeedKey)}, 'true');
      } catch (error) {
        console.error('timer-smoke-seed-failed', error);
      }
    })();
  `;
};

const createScenarioSeed = ({
  email,
  supabaseUrl,
  browserSessionPayload,
  activeStudyMode,
  durationMinutes = 1,
}) =>
  createSeedScript({
    email,
    supabaseUrl,
    browserSessionPayload,
    activeStudyMode,
    selectedMethodId: 'pomodoro',
    plannedFocusDuration: durationMinutes,
    studyExecutionState: {
      currentBlock: {
        subject: 'Matematica',
        topicName: 'Porcentagem',
        objective: 'Executar o bloco principal do plano de hoje.',
        type: 'focus',
        duration: durationMinutes,
        targetQuestions: 10,
      },
      recommendedMethodId: 'pomodoro',
      source: 'ai',
      updatedAt: new Date().toISOString(),
    },
  });

const createAuthSeedScript = ({ email, supabaseUrl, browserSessionPayload }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const authStorageKey = buildAuthStorageKey(supabaseUrl);
  const weeklySchedule = buildWeeklySchedule(['Matematica']);
  const studyExecutionState = {
    currentBlock: {
      subject: 'Matematica',
      topicName: 'Porcentagem',
      objective: 'Executar o bloco principal do plano de hoje.',
      type: 'focus',
      duration: 1,
      targetQuestions: 10,
    },
    recommendedMethodId: 'pomodoro',
    source: 'ai',
    updatedAt: new Date().toISOString(),
  };

  return `
    (() => {
      try {
        window.localStorage.setItem(${JSON.stringify(`mdzOnboardingCompleted_${normalizedEmail}`)}, 'true');
        window.localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(browserSessionPayload))});
        window.localStorage.setItem(${JSON.stringify(`profileDisplayName_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify('QA Timer'))});
        window.localStorage.setItem(${JSON.stringify(`selectedStudyMethodId_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify('pomodoro'))});
        window.localStorage.setItem(${JSON.stringify(`plannedFocusDuration_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(1))});
        window.localStorage.setItem(${JSON.stringify(`activeStudyMode_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify('livre'))});
        window.localStorage.setItem(${JSON.stringify(`weeklyStudySchedule_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(weeklySchedule))});
        window.localStorage.setItem(${JSON.stringify(`studyExecutionState_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(studyExecutionState))});
        window.localStorage.setItem('zb_internal_access', 'true');
        window.localStorage.setItem('zb_phase_override', ${JSON.stringify(JSON.stringify('intermediate'))});
      } catch (error) {
        console.error('timer-auth-seed-failed', error);
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

const waitFor = async (
  session,
  predicateExpression,
  { timeoutMs = 15000, intervalMs = 150, label = 'condicao' } = {},
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

const waitForSelector = async (session, selector, options = {}) =>
  waitFor(
    session,
    `(() => Boolean(document.querySelector(${JSON.stringify(selector)})))()`,
    { ...options, label: `selector ${selector}` },
  );

const clickByText = async (
  session,
  text,
  { tagName = 'button, a, [role="button"]', exact = false, allMatches = false } = {},
) => {
  const expression = `
    (() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(text)});
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(tagName)}));
      const matches = nodes.filter((candidate) => {
        const content = normalize(candidate.textContent || '');
        return ${exact ? 'content === target' : 'content.includes(target)'};
      });
      if (!matches.length) return false;
      const match = ${allMatches ? 'matches[matches.length - 1]' : 'matches[0]'};
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

const clickSelector = async (session, selector) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const target = document.querySelector(${JSON.stringify(selector)});
      if (!target) return false;
      target.scrollIntoView({ block: 'center', inline: 'center' });
      target.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error(`Nao encontrei elemento para selector: ${selector}`);
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

const getBodyTextExcerpt = async (session, limit = 1200) =>
  evalInPage(
    session,
    `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}))()`,
  );

const closeOptionalOverlays = async (session) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let changed = false;

    const hasCloseButton = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'fechar');
      })()`,
    );

    if (hasCloseButton && await textExists(session, 'Modo interno')) {
      await clickByText(session, 'Fechar', { exact: true });
      await delay(250);
      changed = true;
    }

    const hasAgoraNao = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'agora nao');
      })()`,
    );

    if (hasAgoraNao) {
      await clickByText(session, 'Agora nao', { exact: true });
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
  await waitFor(session, 'document.readyState === "complete"', {
    timeoutMs: 45000,
    label: 'load complete',
  });
  await waitFor(
    session,
    'Boolean(document.body && document.body.innerText.trim().length > 0)',
    { timeoutMs: 45000, label: 'conteudo da pagina' },
  );
};

const reloadPage = async (session) => {
  const currentUrl = await evalInPage(session, 'window.location.href');
  await session.send('Page.navigate', { url: currentUrl });
  await waitFor(session, 'document.readyState === "complete"', {
    timeoutMs: 45000,
    label: 'reload complete',
  });
  await waitFor(
    session,
    'Boolean(document.body && document.body.innerText.trim().length > 0)',
    { timeoutMs: 45000, label: 'conteudo apos reload' },
  );
};

const getStorageValue = async (session, key) =>
  evalInPage(
    session,
    `(() => window.localStorage.getItem(${JSON.stringify(key)}))()`,
  );

const getStorageJson = async (session, key) => {
  const raw = await getStorageValue(session, key);
  if (!raw) {
    return null;
  }

  return JSON.parse(raw);
};

const setStorageJson = async (session, key, value) => {
  await evalInPage(
    session,
    `(() => {
      window.localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(value))});
      return true;
    })()`,
  );
};

const getTimerSelectors = (studyMode) =>
  studyMode === 'pomodoro'
    ? {
        rootSelector: '[data-testid="study-pomodoro-timer-ready"]',
        startSelector: '[data-testid="study-pomodoro-start-button"]',
        resetSelector: '[data-testid="study-pomodoro-reset-button"]',
        finishSelector: null,
        timeRegexSource: '\\b\\d{2}:\\d{2}\\b',
      }
    : {
        rootSelector: '[data-testid="study-free-timer-ready"]',
        startSelector: '[data-testid="study-free-start-button"]',
        resetSelector: '[data-testid="study-free-reset-button"]',
        finishSelector: '[data-testid="study-free-finish-button"]',
        timeRegexSource: '\\b\\d{2}:\\d{2}:\\d{2}\\b',
      };

const getTimerDisplay = async (session, studyMode) => {
  const { rootSelector, timeRegexSource } = getTimerSelectors(studyMode);
  return evalInPage(
    session,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      if (!root) return null;
      const match = (root.innerText || '').match(new RegExp(${JSON.stringify(timeRegexSource)}));
      return match ? match[0] : null;
    })()`,
  );
};

const waitForTimerDisplay = async (session, studyMode, predicate, options = {}) => {
  const { rootSelector, timeRegexSource } = getTimerSelectors(studyMode);
  return waitFor(
    session,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      if (!root) return false;
      const match = (root.innerText || '').match(new RegExp(${JSON.stringify(timeRegexSource)}));
      if (!match) return false;
      const value = match[0];
      return (${predicate.toString()})(value);
    })()`,
    { ...options, label: options.label || 'display do timer' },
  );
};

const confirmDialogAction = async (session, label) => {
  await waitForSelector(session, '[role="dialog"]', { timeoutMs: 10000 });
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return false;
      const target = normalize(${JSON.stringify(label)});
      const buttons = Array.from(dialog.querySelectorAll('button'));
      const match = buttons.find((button) => normalize(button.textContent || '') === target);
      if (!match) return false;
      match.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error(`Nao encontrei acao no modal: ${label}`);
  }
};

const getAnalyticsEvents = async (session) => {
  const raw = await getStorageValue(session, 'mdz_analytics_events');
  return raw ? JSON.parse(raw) : [];
};

const getLocalUserDataSnapshot = async (session, dataKey) => {
  const userData = await getStorageJson(session, dataKey);
  const sessionCount = Array.isArray(userData?.sessions) ? userData.sessions.length : 0;
  const totalPoints = typeof userData?.totalPoints === 'number' ? userData.totalPoints : 0;
  const todayProgress = userData?.weekProgress?.[todayWeekKey()] || { minutes: 0, studied: false };

  return {
    userData,
    sessionCount,
    totalPoints,
    todayProgress,
  };
};

const waitForLocalUserDataBaseline = async (session, dataKey, expectedRemoteCount) => {
  if (expectedRemoteCount > 0) {
    try {
      await waitFor(
        session,
        `(() => {
          const raw = window.localStorage.getItem(${JSON.stringify(dataKey)});
          if (!raw) return false;
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed.sessions) && parsed.sessions.length >= ${expectedRemoteCount};
        })()`,
        { timeoutMs: 12000, intervalMs: 250, label: 'baseline local sincronizado' },
      );
    } catch {
      // segue com o snapshot atual mesmo se a sincronizacao demorar mais
    }
  }

  return getLocalUserDataSnapshot(session, dataKey);
};

const clickStartButton = async (session, studyMode) => {
  const { startSelector } = getTimerSelectors(studyMode);
  await waitForSelector(session, startSelector, { timeoutMs: 10000 });
  await clickSelector(session, startSelector);
};

const clickResetButton = async (session, studyMode) => {
  const { resetSelector } = getTimerSelectors(studyMode);
  const hasResetButton = await evalInPage(
    session,
    `(() => Boolean(document.querySelector(${JSON.stringify(resetSelector)})))()`,
  );

  if (hasResetButton) {
    await clickSelector(session, resetSelector);
    return;
  }

  const hasResetAria = await evalInPage(
    session,
    `(() => Boolean(document.querySelector('[aria-label="Resetar"]')))()`,
  );

  if (hasResetAria) {
    await clickSelector(session, '[aria-label="Resetar"]');
    return;
  }

  const hasReiniciar = await textExists(session, 'Reiniciar');
  if (hasReiniciar) {
    await clickByText(session, 'Reiniciar', { exact: true, tagName: 'button' });
    return;
  }

  throw new Error(`Botao de reset do timer ${studyMode} nao apareceu.`);
};

const waitForTimerModeReady = async (session, studyMode, timeoutMs = 20000) => {
  const { rootSelector, startSelector } = getTimerSelectors(studyMode);
  await waitForSelector(session, rootSelector, { timeoutMs });
  await waitForSelector(session, startSelector, { timeoutMs });
};

const getVisibleTimerModes = async (session) =>
  evalInPage(
    session,
    `(() => {
      return {
        free: Boolean(document.querySelector('[data-testid="study-free-timer-ready"]')),
        pomodoro: Boolean(document.querySelector('[data-testid="study-pomodoro-timer-ready"]')),
      };
    })()`,
  );

const clickVisibleStudyDomain = async (session) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const isVisible = (candidate) => {
        const rect = candidate.getBoundingClientRect();
        const styles = window.getComputedStyle(candidate);
        return rect.width > 0
          && rect.height > 0
          && styles.visibility !== 'hidden'
          && styles.display !== 'none';
      };

      const pickCandidates = (selector) =>
        Array.from(document.querySelectorAll(selector))
          .filter((candidate) => normalize(candidate.textContent || '') === 'estudo')
          .filter(isVisible);

      const candidates = [
        ...pickCandidates('aside button'),
        ...pickCandidates('main button'),
        ...pickCandidates('button'),
      ];

      const target = candidates[0];
      if (!target) return false;
      target.scrollIntoView({ block: 'center', inline: 'center' });
      target.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error('Nao encontrei o dominio Estudo visivel.');
  }
};

const openStudyPage = async (session, studyMode) => {
  const { rootSelector, startSelector } = getTimerSelectors(studyMode);
  await setViewport(session, { width: 1440, height: 1200, mobile: false });
  await closeOptionalOverlays(session);

  const alreadyOnFocus = await evalInPage(
    session,
    `(() => Boolean(document.querySelector('[data-testid="study-focus-container"]')))()`,
  );

  if (!alreadyOnFocus) {
    try {
      await waitFor(
        session,
        `(() => {
          const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
          return Array.from(document.querySelectorAll('button, a, [role="button"], nav button, nav a')).some(
            (candidate) => normalize(candidate.textContent || '') === 'estudo'
          );
        })()`,
        { timeoutMs: 30000, label: 'acao Estudo clicavel' },
      );
      await clickVisibleStudyDomain(session);
    } catch (error) {
      const bodyExcerpt = await getBodyTextExcerpt(session, 800);
      const clickableLabels = await evalInPage(
        session,
        `(() => {
          const normalize = (value) => String(value).replace(/\\s+/g, ' ').trim();
          return Array.from(document.querySelectorAll('button, a, [role="button"], nav button, nav a'))
            .map((candidate) => normalize(candidate.textContent || ''))
            .filter(Boolean)
            .slice(0, 25);
        })()`,
      );
      throw new Error(
        `${error instanceof Error ? error.message : String(error)} | body="${bodyExcerpt}" | clickables=${JSON.stringify(clickableLabels)}`,
      );
    }
  }

  try {
    await waitForSelector(session, '[data-testid="study-focus-container"]', { timeoutMs: 30000 });
  } catch (error) {
    const bodyExcerpt = await getBodyTextExcerpt(session, 1000);
    const clickables = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button, a, [role="button"], nav button, nav a'))
          .map((candidate) => normalize(candidate.textContent || ''))
          .filter(Boolean)
          .slice(0, 30);
      })()`,
    );
    throw new Error(
      `${error instanceof Error ? error.message : String(error)} | studyBody="${bodyExcerpt}" | studyClickables=${JSON.stringify(clickables)}`,
    );
  }

  if (studyMode === 'livre') {
    const hasLivreButton = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some(
          (candidate) => normalize(candidate.textContent || '') === 'livre'
        );
      })()`,
    );
    if (hasLivreButton) {
      await clickByText(session, 'Livre', { exact: true, tagName: 'button' });
    }
  } else if (studyMode === 'pomodoro') {
    const hasPomodoroButton = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some(
          (candidate) => normalize(candidate.textContent || '') === 'pomodoro'
        );
      })()`,
    );
    if (hasPomodoroButton) {
      await clickByText(session, 'Pomodoro', { exact: true, tagName: 'button' });
    }
  }

  try {
    await waitForSelector(session, rootSelector, { timeoutMs: 20000 });
    await waitForSelector(session, startSelector, { timeoutMs: 20000 });
  } catch (error) {
    const bodyExcerpt = await getBodyTextExcerpt(session, 1000);
    const visibleModes = await getVisibleTimerModes(session);
    const focusContainerVisible = await evalInPage(
      session,
      `(() => Boolean(document.querySelector('[data-testid="study-focus-container"]')))()`,
    );
    throw new Error(
      `${error instanceof Error ? error.message : String(error)} | focusContainer=${focusContainerVisible} | visibleModes=${JSON.stringify(visibleModes)} | body="${bodyExcerpt}"`,
    );
  }
};

const createSupabaseHeaders = (serviceRoleKey, extra = {}) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  ...extra,
});

const querySingle = async (supabaseUrl, serviceRoleKey, pathWithQuery) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathWithQuery}`, {
    headers: createSupabaseHeaders(serviceRoleKey),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Consulta Supabase falhou (${response.status}) em ${pathWithQuery}: ${body.slice(0, 300)}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Consulta Supabase sem linhas para ${pathWithQuery}`);
  }

  return rows[0];
};

const fetchStudySessions = async (supabaseUrl, serviceRoleKey, userId) => {
  const params = new URLSearchParams({
    select: 'id,date,minutes,points,subject,duration,method_id,created_at',
    user_id: `eq.${userId}`,
    order: 'created_at.asc',
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/study_sessions?${params.toString()}`, {
    headers: createSupabaseHeaders(serviceRoleKey),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Consulta study_sessions falhou (${response.status}): ${body.slice(0, 300)}`);
  }

  return response.json();
};

const waitForStudySessionsCount = async ({
  supabaseUrl,
  serviceRoleKey,
  userId,
  expectedCount,
  timeoutMs = 20000,
  intervalMs = 500,
}) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const rows = await fetchStudySessions(supabaseUrl, serviceRoleKey, userId);
    if (rows.length === expectedCount) {
      return rows;
    }
    await delay(intervalMs);
  }

  const finalRows = await fetchStudySessions(supabaseUrl, serviceRoleKey, userId);
  throw new Error(
    `Quantidade remota de study_sessions nao atingiu ${expectedCount}. Atual: ${finalRows.length}.`,
  );
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const runStudyTimerFlow = async ({
  baseUrl,
  loginEmail,
  supabaseUrl,
  serviceRoleKey,
  userId,
  browserSessionPayload,
}) => {
  const remotePort = 9600 + Math.floor(Math.random() * 100);
  const browser = await launchChrome(remotePort);
  const storageKey = `study-timer-session_${loginEmail.toLowerCase()}`;
  const dataKey = `zeroBaseData_${loginEmail.toLowerCase()}`;
  let stage = 'setup';

  try {
    stage = 'seed';
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createScenarioSeed({
        email: loginEmail,
        supabaseUrl,
        browserSessionPayload,
        activeStudyMode: 'livre',
        durationMinutes: 1,
      }),
    });

    const baselineRows = await fetchStudySessions(supabaseUrl, serviceRoleKey, userId);
    const baselineCount = baselineRows.length;

    stage = 'open_study_page_initial';
    await navigate(browser.session, `${baseUrl}/`);
    await openStudyPage(browser.session, 'livre');
    const baselineLocalSnapshot = await waitForLocalUserDataBaseline(
      browser.session,
      dataKey,
      baselineCount,
    );

    stage = 'start_pause_cycle_one';
    await clickStartButton(browser.session, 'livre');
    await delay(2200);
    await clickStartButton(browser.session, 'livre');

    const pausedSession = await getStorageJson(browser.session, storageKey);
    assert(pausedSession?.status === 'paused', 'StudyTimer nao ficou pausado apos primeiro pause.');
    assert(pausedSession.accumulatedFocusMs >= 1500, 'StudyTimer acumulou menos tempo do que o esperado.');

    stage = 'start_pause_cycle_two';
    await clickStartButton(browser.session, 'livre');
    await delay(1300);
    await clickStartButton(browser.session, 'livre');

    const pausedAgain = await getStorageJson(browser.session, storageKey);
    const resumedDeltaMs = pausedAgain.accumulatedFocusMs - pausedSession.accumulatedFocusMs;
    assert(
      resumedDeltaMs >= 800 && resumedDeltaMs <= 4500,
      `Pause/resume do StudyTimer gerou delta inconsistente: ${resumedDeltaMs}ms.`,
    );

    stage = 'tab_switch_restore';
    await clickByText(browser.session, 'Início', { exact: true });
    await openStudyPage(browser.session, 'livre');

    const displayAfterTabSwitch = await getTimerDisplay(browser.session, 'livre');
    assert(displayAfterTabSwitch && displayAfterTabSwitch !== '00:00:00', 'Timer perdeu o progresso ao trocar de aba interna.');

    stage = 'refresh_restore';
    await clickStartButton(browser.session, 'livre');
    await delay(1200);
    await reloadPage(browser.session);
    const storedAfterReload = await getStorageJson(browser.session, storageKey);
    await openStudyPage(browser.session, 'livre');

    const restoredRunning = await getStorageJson(browser.session, storageKey);
    assert(
      restoredRunning?.status === 'running',
      `Refresh nao restaurou StudyTimer em execucao. before=${JSON.stringify(storedAfterReload)} after=${JSON.stringify(restoredRunning)}`,
    );
    assert(
      Boolean(restoredRunning?.lastRestoredAt),
      `Refresh nao registrou lastRestoredAt no StudyTimer. session=${JSON.stringify(restoredRunning)}`,
    );

    await clickStartButton(browser.session, 'livre');
    const pausedAfterRefresh = await getStorageJson(browser.session, storageKey);
    assert(
      pausedAfterRefresh.accumulatedFocusMs > pausedAgain.accumulatedFocusMs,
      'Tempo acumulado nao aumentou apos refresh + pausa.',
    );

    const nearFinishSession = {
      ...pausedAfterRefresh,
      status: 'paused',
      accumulatedFocusMs: 61000,
      accumulatedPhaseMs: 61000,
      plannedDurationMs: 3600000,
      lastResumedAt: null,
      lastPausedAt: new Date().toISOString(),
      lastRestoredAt: null,
      updatedAt: new Date(Date.now() - 5000).toISOString(),
    };

    stage = 'finalize_flow';
    await setStorageJson(browser.session, storageKey, nearFinishSession);
    await reloadPage(browser.session);
    await openStudyPage(browser.session, 'livre');
    await waitForTimerDisplay(
      browser.session,
      'livre',
      (value) => value !== '00:00:00',
      { timeoutMs: 10000, label: 'timer pronto para finalizar' },
    );

    await clickSelector(browser.session, '[data-testid="study-free-finish-button"]');
    await confirmDialogAction(browser.session, 'Finalizar');
    try {
      await waitFor(
        browser.session,
        `(() => !window.localStorage.getItem(${JSON.stringify(storageKey)}))()`,
        { timeoutMs: 10000, label: 'limpeza do StudyTimer apos conclusao' },
      );
    } catch (error) {
      const remainingSession = await getStorageJson(browser.session, storageKey);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)} | remaining=${JSON.stringify(remainingSession)}`,
      );
    }

    const finalLocalSnapshot = await getLocalUserDataSnapshot(browser.session, dataKey);
    assert(
      finalLocalSnapshot.sessionCount === baselineLocalSnapshot.sessionCount + 1,
      `StudyTimer nao registrou sessao localmente. before=${baselineLocalSnapshot.sessionCount} after=${finalLocalSnapshot.sessionCount}.`,
    );
    assert(
      finalLocalSnapshot.totalPoints >= baselineLocalSnapshot.totalPoints + 10,
      `Pontos locais nao aumentaram como esperado. before=${baselineLocalSnapshot.totalPoints} after=${finalLocalSnapshot.totalPoints}.`,
    );
    assert(finalLocalSnapshot.todayProgress.studied === true, 'Week progress nao marcou o dia como estudado.');
    assert(
      finalLocalSnapshot.todayProgress.minutes >= baselineLocalSnapshot.todayProgress.minutes + 1,
      `Week progress nao acumulou minutos suficientes. before=${baselineLocalSnapshot.todayProgress.minutes} after=${finalLocalSnapshot.todayProgress.minutes}.`,
    );

    const analyticsEvents = await getAnalyticsEvents(browser.session);
    const eventNames = analyticsEvents.map((event) => event.name);
    assert(eventNames.includes('session_restored'), 'Analytics nao registrou session_restored no StudyTimer.');
    assert(eventNames.includes('study_session_completed'), 'Analytics nao registrou study_session_completed no StudyTimer.');

    stage = 'verify_remote';
    const remoteRows = await waitForStudySessionsCount({
      supabaseUrl,
      serviceRoleKey,
      userId,
      expectedCount: baselineCount + 1,
    });

    await screenshot(browser.session, 'timer-study-flow');

    return {
      baselineCount,
      remoteCount: remoteRows.length,
      resumedDeltaMs,
      accumulatedBeforeFinishMs: nearFinishSession.accumulatedFocusMs,
      displayAfterTabSwitch,
      lastRemoteSession: remoteRows[remoteRows.length - 1],
    };
  } catch (error) {
    throw new Error(`${stage}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await browser.close();
  }
};

const runStudyTimerCancelFlow = async ({
  baseUrl,
  loginEmail,
  supabaseUrl,
  serviceRoleKey,
  userId,
  browserSessionPayload,
}) => {
  const remotePort = 9700 + Math.floor(Math.random() * 100);
  const browser = await launchChrome(remotePort);
  const storageKey = `study-timer-session_${loginEmail.toLowerCase()}`;
  const dataKey = `zeroBaseData_${loginEmail.toLowerCase()}`;

  try {
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createScenarioSeed({
        email: loginEmail,
        supabaseUrl,
        browserSessionPayload,
        activeStudyMode: 'livre',
        durationMinutes: 1,
      }),
    });

    const baselineRows = await fetchStudySessions(supabaseUrl, serviceRoleKey, userId);
    const baselineCount = baselineRows.length;

    await navigate(browser.session, `${baseUrl}/`);
    await openStudyPage(browser.session, 'livre');
    const baselineLocalSnapshot = await waitForLocalUserDataBaseline(
      browser.session,
      dataKey,
      baselineCount,
    );

    await clickStartButton(browser.session, 'livre');
    await delay(1400);
    await clickResetButton(browser.session, 'livre');
    await confirmDialogAction(browser.session, 'Resetar');

    try {
      await waitFor(
        browser.session,
        `(() => !window.localStorage.getItem(${JSON.stringify(storageKey)}))()`,
        { timeoutMs: 10000, label: 'limpeza do StudyTimer apos cancelamento' },
      );
    } catch (error) {
      const remainingSession = await getStorageJson(browser.session, storageKey);
      if (remainingSession !== null) {
        throw new Error(
          `${error instanceof Error ? error.message : String(error)} | remaining=${JSON.stringify(remainingSession)}`,
        );
      }
    }

    const finalLocalSnapshot = await getLocalUserDataSnapshot(browser.session, dataKey);
    assert(
      finalLocalSnapshot.sessionCount === baselineLocalSnapshot.sessionCount,
      `Cancelamento registrou sessao local indevidamente. before=${baselineLocalSnapshot.sessionCount} after=${finalLocalSnapshot.sessionCount}.`,
    );
    assert(
      finalLocalSnapshot.totalPoints === baselineLocalSnapshot.totalPoints,
      `Cancelamento alterou totalPoints indevidamente. before=${baselineLocalSnapshot.totalPoints} after=${finalLocalSnapshot.totalPoints}.`,
    );

    await delay(1800);
    const remoteRows = await fetchStudySessions(supabaseUrl, serviceRoleKey, userId);
    assert(remoteRows.length === baselineCount, 'Cancelamento criou study_session remota indevidamente.');

    const analyticsEvents = await getAnalyticsEvents(browser.session);
    const eventNames = analyticsEvents.map((event) => event.name);
    assert(eventNames.includes('session_cancelled'), 'Analytics nao registrou session_cancelled.');
    assert(!eventNames.includes('study_session_completed'), 'Cancelamento disparou study_session_completed indevidamente.');

    await screenshot(browser.session, 'timer-study-cancel');

    return {
      baselineCount,
      remoteCount: remoteRows.length,
      analyticsEvents: eventNames.filter((name) => name.startsWith('session_') || name === 'study_session_completed'),
    };
  } finally {
    await browser.close();
  }
};

const runStudyTimerReopenFlow = async ({
  baseUrl,
  loginEmail,
  supabaseUrl,
  browserSessionPayload,
}) => {
  const initialPort = 9800 + Math.floor(Math.random() * 50);
  const reopenedPort = 9855 + Math.floor(Math.random() * 50);
  const storageKey = `study-timer-session_${loginEmail.toLowerCase()}`;
  let stage = 'setup';

  const firstBrowser = await launchChrome(initialPort);
  let preservedProfile = null;

  try {
    stage = 'seed_initial';
    await firstBrowser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createScenarioSeed({
        email: loginEmail,
        supabaseUrl,
        browserSessionPayload,
        activeStudyMode: 'livre',
        durationMinutes: 1,
      }),
    });

    stage = 'open_initial';
    await navigate(firstBrowser.session, `${baseUrl}/`);
    await openStudyPage(firstBrowser.session, 'livre');
    await clickStartButton(firstBrowser.session, 'livre');
    await delay(1700);

    preservedProfile = firstBrowser.userDataDir;
    stage = 'close_initial';
    await firstBrowser.close({ preserveProfile: true, graceful: true });

    const reopenedBrowser = await launchChrome(reopenedPort, preservedProfile);

    try {
      stage = 'seed_reopened';
      await reopenedBrowser.session.send('Page.addScriptToEvaluateOnNewDocument', {
        source: createAuthSeedScript({
          email: loginEmail,
          supabaseUrl,
          browserSessionPayload,
        }),
      });
      stage = 'open_reopened';
      await navigate(reopenedBrowser.session, `${baseUrl}/`);
      await openStudyPage(reopenedBrowser.session, 'livre');
      try {
        stage = 'wait_restored_timer';
        await waitForTimerDisplay(
          reopenedBrowser.session,
          'livre',
          (value) => value !== '00:00:00',
          { timeoutMs: 15000, label: 'timer restaurado apos reabertura' },
        );
      } catch (error) {
        const restoredSessionSnapshot = await getStorageJson(reopenedBrowser.session, storageKey);
        const bodyExcerpt = await getBodyTextExcerpt(reopenedBrowser.session, 800);
        throw new Error(
          `${error instanceof Error ? error.message : String(error)} | session=${JSON.stringify(restoredSessionSnapshot)} | body="${bodyExcerpt}"`,
        );
      }

      stage = 'pause_after_reopen';
      await clickStartButton(reopenedBrowser.session, 'livre');

      const restoredSession = await getStorageJson(reopenedBrowser.session, storageKey);
      const display = await getTimerDisplay(reopenedBrowser.session, 'livre');
      assert(restoredSession?.status === 'paused', 'Reabertura curta nao restaurou sessao para pausa manual.');
      assert(restoredSession.accumulatedFocusMs >= 1000, 'Tempo acumulado nao sobreviveu a reabertura curta.');
      assert(Boolean(restoredSession.lastRestoredAt), 'Reabertura curta nao registrou lastRestoredAt.');
      assert(display && display !== '00:00:00', 'Display do timer zerou apos reabrir o navegador.');

      await screenshot(reopenedBrowser.session, 'timer-study-reopen');

      return {
        accumulatedFocusMs: restoredSession.accumulatedFocusMs,
        lastRestoredAt: restoredSession.lastRestoredAt,
        display,
      };
    } catch (error) {
      throw new Error(`${stage}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await reopenedBrowser.close();
    }
  } catch (error) {
    throw new Error(`${stage}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (preservedProfile) {
      try {
        await fs.rm(preservedProfile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch {
        // ignore locked files
      }
    } else {
      await firstBrowser.close().catch(() => {});
    }
  }
};

const runPomodoroFlow = async ({
  baseUrl,
  loginEmail,
  supabaseUrl,
  serviceRoleKey,
  userId,
  browserSessionPayload,
}) => {
  const remotePort = 9900 + Math.floor(Math.random() * 90);
  const browser = await launchChrome(remotePort);
  const storageKey = `pomodoro-session_${loginEmail.toLowerCase()}`;
  const dataKey = `zeroBaseData_${loginEmail.toLowerCase()}`;
  const activeModeKey = `activeStudyMode_${loginEmail.toLowerCase()}`;
  let stage = 'setup';

  try {
    stage = 'seed';
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createScenarioSeed({
        email: loginEmail,
        supabaseUrl,
        browserSessionPayload,
        activeStudyMode: 'pomodoro',
        durationMinutes: 1,
      }),
    });

    const baselineRows = await fetchStudySessions(supabaseUrl, serviceRoleKey, userId);
    const baselineCount = baselineRows.length;

    stage = 'open_study_page';
    await navigate(browser.session, `${baseUrl}/`);
    await openStudyPage(browser.session, 'pomodoro');
    const baselineLocalSnapshot = await waitForLocalUserDataBaseline(
      browser.session,
      dataKey,
      baselineCount,
    );

    stage = 'start_and_refresh_focus';
    try {
      await clickStartButton(browser.session, 'pomodoro');
    } catch (error) {
      const visibleModes = await getVisibleTimerModes(browser.session);
      const activeMode = await getStorageJson(browser.session, activeModeKey);
      const bodyExcerpt = await getBodyTextExcerpt(browser.session, 900);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)} | modes=${JSON.stringify(visibleModes)} | activeMode=${JSON.stringify(activeMode)} | body="${bodyExcerpt}"`,
      );
    }
    await delay(1400);
    await reloadPage(browser.session);
    await openStudyPage(browser.session, 'pomodoro');

    const restoredFocus = await getStorageJson(browser.session, storageKey);
    assert(restoredFocus?.phase === 'focus', 'Pomodoro nao restaurou a fase de foco apos refresh.');
    assert(restoredFocus?.status === 'running', 'Pomodoro nao restaurou a execucao apos refresh.');
    assert(Boolean(restoredFocus?.lastRestoredAt), 'Pomodoro nao registrou lastRestoredAt apos refresh.');

    const nearEndFocus = {
      ...restoredFocus,
      status: 'running',
      phase: 'focus',
      accumulatedPhaseMs: Math.max(0, restoredFocus.plannedDurationMs - 1200),
      accumulatedFocusMs: Math.max(restoredFocus.accumulatedFocusMs, restoredFocus.plannedDurationMs - 1200),
      lastResumedAt: new Date().toISOString(),
      lastRestoredAt: null,
      updatedAt: new Date(Date.now() - 4000).toISOString(),
    };

    stage = 'force_focus_completion';
    await setStorageJson(browser.session, storageKey, nearEndFocus);
    await reloadPage(browser.session);
    await openStudyPage(browser.session, 'pomodoro');

    const shortBreakSession = await waitFor(
      browser.session,
      `(() => {
        const raw = window.localStorage.getItem(${JSON.stringify(storageKey)});
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.phase === 'shortBreak' && parsed.completedFocusCycles === 1 ? parsed : null;
      })()`,
      { timeoutMs: 12000, intervalMs: 250, label: 'troca automatica foco -> pausa curta' },
    );

    stage = 'verify_focus_persisted';
    const userDataAfterFocus = await waitFor(
      browser.session,
      `(() => {
        const raw = window.localStorage.getItem(${JSON.stringify(dataKey)});
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.sessions) && parsed.sessions.length === ${baselineLocalSnapshot.sessionCount + 1} ? parsed : null;
      })()`,
      { timeoutMs: 12000, intervalMs: 250, label: 'persistencia local do Pomodoro apos foco' },
    );

    const remoteRowsAfterFocus = await waitForStudySessionsCount({
      supabaseUrl,
      serviceRoleKey,
      userId,
      expectedCount: baselineCount + 1,
    });

    stage = 'refresh_short_break';
    await reloadPage(browser.session);
    await openStudyPage(browser.session, 'pomodoro');

    const restoredBreak = await getStorageJson(browser.session, storageKey);
    assert(restoredBreak?.phase === 'shortBreak', 'Refresh no meio da pausa nao manteve shortBreak.');
    assert(Boolean(restoredBreak?.lastRestoredAt), 'Pausa do Pomodoro nao manteve lastRestoredAt.');

    const nearEndBreak = {
      ...restoredBreak,
      status: 'running',
      phase: 'shortBreak',
      accumulatedPhaseMs: Math.max(0, restoredBreak.plannedDurationMs - 900),
      lastResumedAt: new Date().toISOString(),
      updatedAt: new Date(Date.now() - 4000).toISOString(),
    };

    stage = 'force_break_completion';
    await setStorageJson(browser.session, storageKey, nearEndBreak);
    await reloadPage(browser.session);
    await openStudyPage(browser.session, 'pomodoro');

    const restoredFocusAgain = await waitFor(
      browser.session,
      `(() => {
        const raw = window.localStorage.getItem(${JSON.stringify(storageKey)});
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.phase === 'focus' && parsed.completedFocusCycles === 1 ? parsed : null;
      })()`,
      { timeoutMs: 12000, intervalMs: 250, label: 'troca automatica pausa -> foco' },
    );

    const remoteRowsAfterBreak = await fetchStudySessions(supabaseUrl, serviceRoleKey, userId);
    assert(
      remoteRowsAfterBreak.length === baselineCount + 1,
      'Conclusao da pausa no Pomodoro criou study_session remota extra.',
    );

    await screenshot(browser.session, 'timer-pomodoro-flow');

    return {
      baselineCount,
      remoteCountAfterFocus: remoteRowsAfterFocus.length,
      remoteCountAfterBreak: remoteRowsAfterBreak.length,
      shortBreakPhase: shortBreakSession.phase,
      restoredFocusPhase: restoredFocusAgain.phase,
      completedFocusCycles: restoredFocusAgain.completedFocusCycles,
    };
  } catch (error) {
    throw new Error(`${stage}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await browser.close();
  }
};

const runScenario = async (report, name, fn) => {
  try {
    const details = await fn();
    report.steps.push({
      name,
      status: 'passed',
      details,
    });
  } catch (error) {
    report.steps.push({
      name,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const main = async () => {
  await ensureArtifactsDir();

  if (!(await fileExists(path.join(DIST_DIR, 'index.html')))) {
    throw new Error('dist/index.html nao existe. Rode o build antes do smoke do timer.');
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
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY
    || cypressEnv.SUPABASE_SERVICE_ROLE_KEY
    || envFile.SUPABASE_SERVICE_ROLE_KEY;

  if (!loginEmail || !loginPassword || !publishableKey || !supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Credenciais/config E2E ausentes para o smoke do timer. Verifique E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY e SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  const baseUrl = (process.env.TIMER_QA_BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/+$/, '');
  const browserSessionPayload = await createBrowserSessionPayload(
    supabaseUrl,
    publishableKey,
    loginEmail,
    loginPassword,
  );

  const userParams = new URLSearchParams({
    select: 'id,email',
    email: `eq.${loginEmail.toLowerCase()}`,
  });
  const userRow = await querySingle(supabaseUrl, serviceRoleKey, `users?${userParams.toString()}`);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    userId: userRow.id,
    steps: [],
    summary: {
      passed: 0,
      failed: 0,
    },
  };

  const server = baseUrl.startsWith('http://127.0.0.1:') || baseUrl.startsWith('http://localhost:')
    ? await createStaticServer()
    : null;

  try {
    await runScenario(report, 'study_timer_flow', () =>
      runStudyTimerFlow({
        baseUrl,
        loginEmail,
        supabaseUrl,
        serviceRoleKey,
        userId: userRow.id,
        browserSessionPayload,
      }));

    await runScenario(report, 'study_timer_cancel', () =>
      runStudyTimerCancelFlow({
        baseUrl,
        loginEmail,
        supabaseUrl,
        serviceRoleKey,
        userId: userRow.id,
        browserSessionPayload,
      }));

    await runScenario(report, 'study_timer_reopen', () =>
      runStudyTimerReopenFlow({
        baseUrl,
        loginEmail,
        supabaseUrl,
        browserSessionPayload,
      }));

    await runScenario(report, 'pomodoro_flow', () =>
      runPomodoroFlow({
        baseUrl,
        loginEmail,
        supabaseUrl,
        serviceRoleKey,
        userId: userRow.id,
        browserSessionPayload,
      }));

    report.summary = {
      passed: report.steps.filter((step) => step.status === 'passed').length,
      failed: report.steps.filter((step) => step.status === 'failed').length,
    };

    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
};

main().catch(async (error) => {
  const report = {
    generatedAt: new Date().toISOString(),
    fatal: true,
    error: error instanceof Error ? error.message : String(error),
  };

  try {
    await ensureArtifactsDir();
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  } catch {
    // ignore secondary logging failures
  }

  console.error(error);
  process.exitCode = 1;
});
