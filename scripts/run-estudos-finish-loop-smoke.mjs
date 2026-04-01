import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'estudos-finish-loop-smoke-report.json');
const PORT = 4174;
const SCHEDULE_STORAGE_KEY = 'mdz_study_schedule';
const REMOTE_BASE_URL = String(process.env.ESTUDOS_FINISH_LOOP_BASE_URL || '').trim().replace(/\/+$/, '');
const REMOTE_BYPASS_TOKEN = String(process.env.ESTUDOS_FINISH_LOOP_BYPASS_TOKEN || '').trim();
const REMOTE_COOKIE_NAME = String(process.env.ESTUDOS_FINISH_LOOP_COOKIE_NAME || '_vercel_jwt').trim();
const REMOTE_COOKIE_VALUE = String(process.env.ESTUDOS_FINISH_LOOP_COOKIE_VALUE || '').trim();
const VISUAL_PASS = String(process.env.ESTUDOS_FINISH_LOOP_VISUAL_PASS || '').trim() === '1';

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
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const toDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getTomorrowDateKey = () => {
  const tomorrow = new Date();
  tomorrow.setHours(12, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateKey(tomorrow);
};

const getWeekday = (date = new Date()) => {
  const day = date.getDay();
  if (day === 0) return 'sunday';
  if (day === 1) return 'monday';
  if (day === 2) return 'tuesday';
  if (day === 3) return 'wednesday';
  if (day === 4) return 'thursday';
  if (day === 5) return 'friday';
  return 'saturday';
};

const buildWeeklySchedule = (subjectLabels) => {
  const today = getWeekday();
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

  weekPlan[today] = { subjectLabels };
  availability[today] = true;

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

const buildSeedScript = ({ email, supabaseUrl, browserSessionPayload, allowedHosts }) => {
  const scope = email.toLowerCase();
  const authStorageKey = buildAuthStorageKey(supabaseUrl);
  const entries = [
    [
      'zeroBaseSession',
      JSON.stringify({
        user: {
          nome: 'QA Estudos Finish',
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
        dailyGoal: 90,
        sessions: [],
        currentStreak: 0,
      }),
    ],
    [`profileDisplayName_${scope}`, JSON.stringify('QA Estudos Finish')],
    [`preferredStudyTrack_${scope}`, JSON.stringify('enem')],
    [`selectedStudyMethodId_${scope}`, JSON.stringify('pomodoro')],
    [`plannedFocusDuration_${scope}`, '25'],
    [`activeStudyMode_${scope}`, JSON.stringify('livre')],
    [`studyExecutionState_${scope}`, JSON.stringify({
      currentBlock: {
        subject: 'Matematica',
        topicName: 'Porcentagem',
        objective: 'Executar o bloco principal do plano de hoje.',
        type: 'focus',
        duration: 25,
        targetQuestions: 5,
      },
      recommendedMethodId: 'pomodoro',
      source: 'ai',
      updatedAt: new Date().toISOString(),
    })],
    [`weeklyStudySchedule_${scope}`, JSON.stringify(buildWeeklySchedule(['Matematica']))],
    [`beginnerState_${scope}`, JSON.stringify('week_complete')],
    [`mdzOnboardingCompleted_${scope}`, 'true'],
    [`academyCompletedContentIds_${scope}`, JSON.stringify([])],
    ['zb_phase_override', JSON.stringify('intermediate')],
  ];

  return `
    (() => {
      const seedGuardKey = '__estudos_finish_smoke_seeded__';
      const nativeSetInterval = window.setInterval.bind(window);
      window.setInterval = (callback, delay, ...args) => {
        if (delay === 1000) {
          return nativeSetInterval(callback, 15, ...args);
        }
        return nativeSetInterval(callback, delay, ...args);
      };

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
        console.error('estudos-finish-smoke-seed-failed', error);
      }
    })();
  `;
};

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

  async close() {
    this.socket.close();
  }

  on(method, handler) {
    const handlers = this.listeners.get(method) || [];
    handlers.push(handler);
    this.listeners.set(method, handlers);
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

  return JSON.parse(await fs.readFile(targetPath, 'utf8'));
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
  while (Date.now() - startedAt < 30000) {
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

  throw new Error('Nenhum Chrome/Edge encontrado para o smoke de fechamento dos estudos.');
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

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-estudos-finish-'));
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
  { timeoutMs = 12000, intervalMs = 120, label = 'condicao' } = {},
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
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      return normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })()`,
  );

const clickableTextExists = async (session, text, { exact = false } = {}) =>
  evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(text)});
      return Array.from(document.querySelectorAll('button, a, [role="button"]')).some((candidate) => {
        const content = normalize(candidate.textContent || '');
        return ${exact ? 'content === target' : 'content.includes(target)'};
      });
    })()`,
  );

const waitForEnabledButton = async (session, text) =>
  waitFor(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(text)});
      return Array.from(document.querySelectorAll('button')).some((button) => {
        const content = normalize(button.textContent || '');
        return content.includes(target) && !button.disabled;
      });
    })()`,
    { label: `botao habilitado "${text}"` },
  );

const getBodyTextExcerpt = async (session, limit = 1200) =>
  evalInPage(
    session,
    `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}))()`,
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

const applyDateNowOffset = async (session, offsetMs) =>
  evalInPage(
    session,
    `(() => {
      const scope = window;
      if (!scope.__estudosFinishSmokeNativeDateNow) {
        scope.__estudosFinishSmokeNativeDateNow = Date.now.bind(Date);
      }
      const nativeNow = scope.__estudosFinishSmokeNativeDateNow;
      Date.now = () => nativeNow() + ${offsetMs};
      return Date.now();
    })()`,
  );

const clickByText = async (session, text, { exact = false } = {}) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(text)});
      const nodes = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const node = nodes.find((candidate) => {
        const content = normalize(candidate.textContent || '');
        return ${exact ? 'content === target' : 'content.includes(target)'};
      });
      if (!node) return false;
      node.scrollIntoView({ block: 'center', inline: 'center' });
      node.click();
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

const clickFirstAvailableText = async (session, texts, options = {}) => {
  for (const text of texts) {
    try {
      await clickByText(session, text, options);
      return text;
    } catch {
      // tenta o proximo CTA disponivel
    }
  }

  throw new Error(`Nao encontrei nenhum CTA clicavel: ${texts.join(', ')}`);
};

const fillFinishInputs = async (session) => {
  const updated = await evalInPage(
    session,
    `(() => {
      const fields = document.querySelectorAll('input[type="number"]');
      const pagesInput = fields[0];
      const lessonsInput = fields[1];
      const notesInput = document.querySelector('textarea');
      const difficultySelect = document.querySelector('select');

      if (!pagesInput || !lessonsInput || !notesInput || !difficultySelect) {
        return false;
      }

      const applyValue = (node, value) => {
        node.focus();
        node.value = value;
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
      };

      applyValue(pagesInput, '12');
      applyValue(lessonsInput, '1');
      applyValue(notesInput, 'Fechamento QA local');
      applyValue(difficultySelect, '4');
      return true;
    })()`,
  );

  if (!updated) {
    throw new Error('Nao consegui preencher os campos de fechamento da sessao.');
  }
};

const screenshot = async (session, fileName) => {
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  await fs.writeFile(path.join(ARTIFACTS_DIR, `${fileName}.png`), Buffer.from(data, 'base64'));
};

const setViewport = async (session, { width, height, deviceScaleFactor = 1, mobile = false }) => {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
};

const setPreferredTheme = async (session, theme) =>
  evalInPage(
    session,
    `(() => {
      const resolvedTheme = ${JSON.stringify(theme)};
      window.localStorage.setItem('settings-pref-theme', resolvedTheme);
      window.localStorage.setItem('darkMode', JSON.stringify(resolvedTheme === 'dark'));
      document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
      document.documentElement.setAttribute('data-theme', resolvedTheme);
      return {
        dataTheme: document.documentElement.getAttribute('data-theme'),
        darkClass: document.documentElement.classList.contains('dark'),
      };
    })()`,
  );

const collectViewportMetrics = async (session, label) =>
  evalInPage(
    session,
    `(() => {
      const root = document.documentElement;
      const bodyText = (document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
      return {
        label: ${JSON.stringify(label)},
        location: window.location.href,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: root?.scrollWidth || 0,
        scrollHeight: root?.scrollHeight || 0,
        horizontalOverflow: (root?.scrollWidth || 0) > window.innerWidth + 4,
        theme: root?.getAttribute('data-theme') || null,
        darkClass: root?.classList.contains('dark') || false,
        bodyExcerpt: bodyText.slice(0, 320),
      };
    })()`,
  );

const hideTransientUi = async (session) =>
  evalInPage(
    session,
    `(() => {
      const styleId = '__estudos_finish_smoke_visual_noise__';
      let style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = [
          '[data-react-hot-toast] { display: none !important; }',
          '[data-rht-toaster] { display: none !important; }',
          '[role="alertdialog"] { display: none !important; }'
        ].join('\\n');
        document.head.appendChild(style);
      }
      return true;
    })()`,
  );

const captureTabVisualState = async (
  session,
  {
    tab,
    fileName,
    label,
    expectedTexts,
  },
) => {
  await switchTabInApp(session, tab);
  await delay(700);
  await dismissIfPresent(session, 'Agora nao');
  await hideTransientUi(session);
  if (expectedTexts?.length) {
    await waitForAnyText(session, expectedTexts, { timeoutMs: 15000, label: `conteudo da aba ${tab}` });
  }
  await screenshot(session, fileName);
  return collectViewportMetrics(session, label);
};

const reloadPage = async (session) => {
  await session.send('Page.reload');
  await waitFor(session, 'document.readyState === "complete"', { label: 'reload complete' });
  await waitFor(session, 'Boolean(document.body && document.body.innerText.trim().length > 0)', { label: 'conteudo apos reload' });
};

const dismissIfPresent = async (session, text, options = {}) => {
  if (await clickableTextExists(session, text, options)) {
    await clickByText(session, text, options);
    await delay(160);
  }
};

const confirmFinishDialog = async (session) => {
  await waitFor(
    session,
    `(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return false;
      const content = String(dialog.textContent || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
      return content.includes('finalizar sessao');
    })()`,
    { label: 'modal de finalizar sessao' },
  );
  await clickByText(session, 'Finalizar', { exact: true });
};

const navigate = async (session, url, seedScript) => {
  await session.send('Page.addScriptToEvaluateOnNewDocument', { source: seedScript });
  await session.send('Page.navigate', { url });
  await waitFor(session, 'document.readyState === "complete"', { label: 'load complete' });
  await waitFor(session, 'Boolean(document.body && document.body.innerText.trim().length > 0)', { label: 'conteudo da pagina' });
};

const navigateWithoutSeed = async (session, url) => {
  await session.send('Page.navigate', { url });
  await waitFor(session, 'document.readyState === "complete"', { label: 'load complete' });
  await waitFor(session, 'Boolean(document.body && document.body.innerText.trim().length > 0)', { label: 'conteudo da pagina' });
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
    throw new Error(`Nao consegui aplicar cookie ${name} antes do smoke remoto.`);
  }
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

const main = async () => {
  await ensureArtifactsDir();

  if (!REMOTE_BASE_URL && !(await fileExists(path.join(DIST_DIR, 'index.html')))) {
    throw new Error('dist/index.html nao existe. Rode o build antes do smoke de fechamento dos estudos.');
  }

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

  if (!publishableKey || !supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Credenciais/config E2E ausentes para o smoke de fechamento dos estudos. Verifique SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY e SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  const email = `e2e_estudos_finish_${Date.now()}@zerobase.dev`.toLowerCase();
  const password = 'EstudosFinish@2026';
  const displayName = 'QA Estudos Finish';
  const tempUser = await createTempConfirmedUser(
    supabaseUrl,
    serviceRoleKey,
    email,
    password,
    displayName,
  );
  const tempUserId = tempUser.user?.id || tempUser.id || null;

  const browserSessionPayload = await createBrowserSessionPayload(
    supabaseUrl,
    publishableKey,
    email,
    password,
  );
  const scope = email.toLowerCase();
  const dataStorageKey = `zeroBaseData_${scope}`;
  const activeStudyModeStorageKey = `activeStudyMode_${scope}`;
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: REMOTE_BASE_URL || `http://127.0.0.1:${PORT}`,
    steps: [],
    visualInspection: VISUAL_PASS ? { pages: [] } : undefined,
    summary: {
      passed: 0,
      failed: 0,
    },
  };

  let server = null;
  let browser = null;
  const consoleErrors = [];
  const pageExceptions = [];

  try {
    if (!REMOTE_BASE_URL) {
      server = await createStaticServer();
    }
    browser = await launchChrome(9344);
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
    if (REMOTE_BYPASS_TOKEN) {
      await browser.session.send('Network.setExtraHTTPHeaders', {
        headers: {
          'x-vercel-protection-bypass': REMOTE_BYPASS_TOKEN,
        },
      });
    }
    if (REMOTE_BASE_URL && REMOTE_COOKIE_VALUE) {
      await setCookie(browser.session, report.baseUrl, REMOTE_COOKIE_NAME, REMOTE_COOKIE_VALUE);
    }
    const allowedHosts = Array.from(new Set(['127.0.0.1', 'localhost', new URL(report.baseUrl).hostname]));

    const initialUrl = new URL(report.baseUrl);
    initialUrl.searchParams.set('tab', 'foco');
    if (REMOTE_BYPASS_TOKEN && !REMOTE_COOKIE_VALUE) {
      initialUrl.searchParams.set('x-vercel-set-bypass-cookie', 'true');
      initialUrl.searchParams.set('x-vercel-protection-bypass', REMOTE_BYPASS_TOKEN);
    }

    await navigate(browser.session, initialUrl.toString(), buildSeedScript({
      email,
      supabaseUrl,
      browserSessionPayload,
      allowedHosts,
    }));
    await dismissIfPresent(browser.session, 'Agora nao');
    await dismissIfPresent(browser.session, 'Fechar', { exact: true });
    await waitForSelector(browser.session, '[data-testid="study-session-header"]', { timeoutMs: 20000 });
    await waitForSelector(browser.session, '[data-testid="study-execution-core"]', { timeoutMs: 20000 });
    await dismissIfPresent(browser.session, 'Agora nao');

    const persistedMode = await getStorageJson(browser.session, activeStudyModeStorageKey);
    if (persistedMode !== 'livre') {
      throw new Error(`Modo central esperado=livre, recebido=${JSON.stringify(persistedMode)}`);
    }

    await waitForSelector(browser.session, '[data-testid="study-free-timer-ready"]', { timeoutMs: 20000 });
    await applyDateNowOffset(browser.session, 61_000);
    await clickSelector(browser.session, '[data-testid="study-free-start-button"]');
    await waitFor(
      browser.session,
      `(() => document.querySelector('[data-testid="study-free-timer-ready"]')?.getAttribute('data-study-session-status') === 'running')()`,
      { timeoutMs: 12000, label: 'timer livre em execucao' },
    );
    await waitForEnabledButton(browser.session, 'Finalizar sessao');
    await clickSelector(browser.session, '[data-testid="study-free-finish-button"]');
    await confirmFinishDialog(browser.session);
    await waitForText(browser.session, 'Sessao concluida');
    report.steps.push({ name: 'study_session_completed', status: 'passed' });

    await fillFinishInputs(browser.session);
    await waitForSelector(browser.session, '[data-testid="study-finish-submit-button"]', { timeoutMs: 10000 });
    await waitFor(
      browser.session,
      `(() => {
        const button = document.querySelector('[data-testid="study-finish-submit-button"]');
        return Boolean(button && !button.disabled);
      })()`,
      { timeoutMs: 10000, label: 'botao de fechamento habilitado' },
    );
    await clickSelector(browser.session, '[data-testid="study-finish-submit-button"]');
    const tomorrowDateKey = getTomorrowDateKey();
    await waitFor(
      browser.session,
      `(() => {
        try {
          const raw = window.localStorage.getItem(${JSON.stringify(SCHEDULE_STORAGE_KEY)});
          const entries = raw ? JSON.parse(raw) : null;
          if (!Array.isArray(entries)) return false;
          const normalize = (value) => String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
          return entries.some((entry) =>
            normalize(entry?.studyType) === 'revisao'
            && normalize(entry?.subject) === 'matematica'
            && normalize(entry?.topic) === 'porcentagem'
            && entry?.date === ${JSON.stringify(tomorrowDateKey)}
            && entry?.done === false
          );
        } catch (error) {
          return false;
        }
      })()`,
      { timeoutMs: 15000, label: 'revisao 24h persistida apos fechamento' },
    );
    report.steps.push({ name: 'finish_payload_applied', status: 'passed' });

    const persistedUserData = await getStorageJson(browser.session, dataStorageKey);
    const scheduleEntries = await getStorageJson(browser.session, SCHEDULE_STORAGE_KEY);

    const reviewEntry = Array.isArray(scheduleEntries)
      ? scheduleEntries.find((entry) =>
        normalize(entry?.studyType) === 'revisao'
        && normalize(entry?.subject) === 'matematica'
        && normalize(entry?.topic) === 'porcentagem'
        && entry?.date === tomorrowDateKey
        && entry?.done === false,
      )
      : null;

    if (!reviewEntry) {
      throw new Error(`Nao encontrei revisao 24h na persistencia local. scheduleEntries=${JSON.stringify(scheduleEntries)}`);
    }

    if (!persistedUserData || !Array.isArray(persistedUserData.sessions) || persistedUserData.sessions.length < 1) {
      throw new Error(`zeroBaseData nao refletiu a sessao concluida. snapshot=${JSON.stringify(persistedUserData)}`);
    }

    report.steps.push({
      name: 'central_state_updated',
      status: 'passed',
      details: {
        sessions: persistedUserData.sessions.length,
        tomorrowDateKey,
        reviewEntry,
      },
    });

    if (VISUAL_PASS) {
      await setViewport(browser.session, { width: 1440, height: 1500, deviceScaleFactor: 1, mobile: false });
      await dismissIfPresent(browser.session, 'Agora nao');
      await hideTransientUi(browser.session);
      report.visualInspection?.pages.push(await collectViewportMetrics(browser.session, 'estudos-desktop-light'));
      await screenshot(browser.session, 'estudos-finish-session-light');
    }

    await switchTabInApp(browser.session, 'inicio');
    await waitForText(browser.session, 'Amanha');
    await waitForText(browser.session, 'Matematica - Porcentagem');
    await waitForText(browser.session, '24h');
    await dismissIfPresent(browser.session, 'Agora nao');
    await hideTransientUi(browser.session);
    await screenshot(browser.session, 'estudos-finish-home-review-queue');
    report.steps.push({ name: 'home_reflects_review_queue', status: 'passed' });
    if (VISUAL_PASS) {
      report.visualInspection?.pages.push(await collectViewportMetrics(browser.session, 'home-desktop-light'));
    }

    await switchTabInApp(browser.session, 'cronograma');
    await waitForText(browser.session, '24h - Porcentagem');
    await dismissIfPresent(browser.session, 'Agora nao');
    await hideTransientUi(browser.session);
    await screenshot(browser.session, 'estudos-finish-plan-review-block');
    report.steps.push({ name: 'plan_reflects_review_block', status: 'passed' });
    if (VISUAL_PASS) {
      report.visualInspection?.pages.push(await collectViewportMetrics(browser.session, 'plano-desktop-light'));
      report.visualInspection?.pages.push(await captureTabVisualState(browser.session, {
        tab: 'dashboard',
        fileName: 'estudos-finish-dashboard-light',
        label: 'dashboard-desktop-light',
        expectedTexts: ['Relatorio Semanal', 'Grafico Semanal', 'Seu painel'],
      }));
      report.visualInspection?.pages.push(await captureTabVisualState(browser.session, {
        tab: 'mentor',
        fileName: 'estudos-finish-mentor-light',
        label: 'mentor-desktop-light',
        expectedTexts: ['Mentor IA Proativo', 'Pergunte ao seu Mentor IA', 'Mentor IA'],
      }));

      await setPreferredTheme(browser.session, 'dark');
      await reloadPage(browser.session);

      report.visualInspection?.pages.push(await captureTabVisualState(browser.session, {
        tab: 'inicio',
        fileName: 'estudos-finish-home-dark',
        label: 'home-desktop-dark',
        expectedTexts: ['Amanha', 'Planejamento', 'Semana no trilho'],
      }));
      report.visualInspection?.pages.push(await captureTabVisualState(browser.session, {
        tab: 'dashboard',
        fileName: 'estudos-finish-dashboard-dark',
        label: 'dashboard-desktop-dark',
        expectedTexts: ['Relatorio Semanal', 'Grafico Semanal', 'Seu painel'],
      }));
      report.visualInspection?.pages.push(await captureTabVisualState(browser.session, {
        tab: 'mentor',
        fileName: 'estudos-finish-mentor-dark',
        label: 'mentor-desktop-dark',
        expectedTexts: ['Mentor IA Proativo', 'Pergunte ao seu Mentor IA', 'Mentor IA'],
      }));

      await setPreferredTheme(browser.session, 'light');
      await reloadPage(browser.session);
      await setViewport(browser.session, { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      report.visualInspection?.pages.push(await captureTabVisualState(browser.session, {
        tab: 'inicio',
        fileName: 'estudos-finish-home-mobile',
        label: 'home-mobile-light',
        expectedTexts: ['Amanha', 'Planejamento', 'Semana no trilho'],
      }));
      report.visualInspection?.pages.push(await captureTabVisualState(browser.session, {
        tab: 'cronograma',
        fileName: 'estudos-finish-plan-mobile',
        label: 'plano-mobile-light',
        expectedTexts: ['24h - Porcentagem', 'Planejamento', 'Semana'],
      }));

      await setViewport(browser.session, { width: 1440, height: 1500, deviceScaleFactor: 1, mobile: false });
      await switchTabInApp(browser.session, 'inicio');
      await waitForText(browser.session, 'Amanha');
    }

    await reloadPage(browser.session);
    await switchTabInApp(browser.session, 'inicio');
    await waitForText(browser.session, 'Amanha');
    await waitForText(browser.session, 'Matematica - Porcentagem');
    report.steps.push({ name: 'reload_keeps_review_queue', status: 'passed' });

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

    if (VISUAL_PASS && report.visualInspection) {
      const overflowingPages = report.visualInspection.pages.filter((page) => page.horizontalOverflow);
      report.visualInspection.summary = {
        capturedPages: report.visualInspection.pages.length,
        overflowingPages: overflowingPages.map((page) => page.label),
      };
    }
  } catch (error) {
    const excerpt = browser?.session
      ? await getBodyTextExcerpt(browser.session, 1400).catch(() => '')
      : '';
    report.steps.push({
      name: 'estudos_finish_loop',
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      excerpt,
    });
  } finally {
    report.summary = {
      passed: report.steps.filter((step) => step.status === 'passed').length,
      failed: report.steps.filter((step) => step.status === 'failed').length,
    };

    if (browser) {
      await browser.close().catch(() => undefined);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    await deleteTempUser(supabaseUrl, serviceRoleKey, tempUserId).catch(() => undefined);
  }

  console.log(JSON.stringify(report, null, 2));

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
};

await main();
