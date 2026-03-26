import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'groups-operational-report.json');
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

const buildSeededUserData = () => {
  const weekProgress = {
    domingo: { studied: false, minutes: 0 },
    segunda: { studied: false, minutes: 0 },
    terca: { studied: false, minutes: 0 },
    quarta: { studied: false, minutes: 0 },
    quinta: { studied: false, minutes: 0 },
    sexta: { studied: false, minutes: 0 },
    sabado: { studied: false, minutes: 0 },
  };

  weekProgress[todayWeekKey()] = { studied: true, minutes: 42 };

  return {
    weekProgress,
    completedTopics: {},
    totalPoints: 420,
    streak: 1,
    bestStreak: 1,
    achievements: [],
    level: 2,
    studyHistory: [],
    dailyGoal: 90,
    sessions: [],
    currentStreak: 1,
  };
};

class CDPSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.id) {
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
        return;
      }

      const listeners = this.events.get(message.method) || [];
      listeners.forEach((listener) => listener(message.params || {}));
    };
  }

  on(method, listener) {
    const listeners = this.events.get(method) || [];
    listeners.push(listener);
    this.events.set(method, listeners);
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

  throw new Error('Nenhum Chrome/Edge encontrado para a validacao headless.');
};

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-groups-qa-'));
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
    {
      stdio: 'ignore',
    },
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
        // temporary Chrome artifacts can remain locked for a short time on Windows
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
    throw new Error(`Nao foi possivel criar sessao do navegador (${response.status}): ${body.slice(0, 400)}`);
  }

  return response.json();
};

const createSeedScript = (email, supabaseUrl, browserSessionPayload) => {
  const normalizedEmail = email.trim().toLowerCase();
  const seededUserData = buildSeededUserData();
  const authStorageKey = buildAuthStorageKey(supabaseUrl);
  const weeklySchedule = buildWeeklySchedule(['Matematica']);

  return `
    (() => {
      try {
        const scopedEmail = ${JSON.stringify(normalizedEmail)};
        window.localStorage.setItem(${JSON.stringify(`mdzOnboardingCompleted_${normalizedEmail}`)}, 'true');
        window.localStorage.setItem(${JSON.stringify(`zeroBaseData_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(seededUserData))});
        window.localStorage.setItem(${JSON.stringify(`profileDisplayName_${normalizedEmail}`)}, 'QA Groups');
        window.localStorage.setItem(${JSON.stringify(`weeklyStudySchedule_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(weeklySchedule))});
        window.localStorage.setItem(${JSON.stringify(`selectedStudyMethodId_${normalizedEmail}`)}, 'pomodoro');
        window.localStorage.setItem(${JSON.stringify(`plannedFocusDuration_${normalizedEmail}`)}, '25');
        window.localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(browserSessionPayload))});
        window.localStorage.setItem('zb_internal_access', 'true');
        window.localStorage.setItem('zb_phase_override', ${JSON.stringify(JSON.stringify('intermediate'))});
      } catch (error) {
        console.error('groups-seed-failed', error);
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
      return ${JSON.stringify(texts)}.some((candidate) => body.includes(normalize(candidate)));
    })()`,
    { ...options, label: `um dos textos: ${texts.join(', ')}` },
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
    { ...options, label: `seletor ${selector}` },
  );

const clickByText = async (session, text, { tagName = 'button, a, [role="button"]', exact = false, allMatches = false } = {}) => {
  const expression = `
    (() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(text)});
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(tagName)}));
      const matches = nodes.filter((candidate) => {
        const content = normalize(candidate.textContent || '');
        return ${exact ? 'content === target' : 'content.includes(target)'};
      });

      if (matches.length === 0) {
        return false;
      }

      if (${allMatches ? 'true' : 'false'}) {
        matches.forEach((node) => {
          node.scrollIntoView({ block: 'center', inline: 'center' });
          node.click();
        });
        return matches.length;
      }

      const node = matches[0];
      node.scrollIntoView({ block: 'center', inline: 'center' });
      node.click();
      return 1;
    })();
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
      if (!input) return false;
      input.focus();
      const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      descriptor.set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })();
  `;

  const changed = await evalInPage(session, expression);
  if (!changed) {
    throw new Error(`Nao encontrei input para o seletor: ${selector}`);
  }
};

const setFileInputFiles = async (session, selector, files) => {
  const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
  const { nodeId } = await session.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector,
  });

  if (!nodeId) {
    throw new Error(`Nao encontrei input de arquivo com o seletor: ${selector}`);
  }

  await session.send('DOM.setFileInputFiles', {
    nodeId,
    files,
  });

  const dispatched = await evalInPage(
    session,
    `(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!input) return false;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  );

  if (!dispatched) {
    throw new Error(`Nao consegui disparar change no input: ${selector}`);
  }
};

const screenshot = async (session, fileName) => {
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  await fs.writeFile(path.join(ARTIFACTS_DIR, `${fileName}.png`), Buffer.from(data, 'base64'));
};

const setViewport = async (session, {
  width,
  height,
  mobile = false,
}) => {
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

const dismissIfPresent = async (session, text, options = {}) => {
  if (await textExists(session, text)) {
    await clickByText(session, text, options);
    await delay(200);
  }
};

const closeOptionalOverlays = async (session) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let changed = false;
    const hasExactCloseButton = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'fechar');
      })()`,
    );
    const hasAgoraNaoButton = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'agora nao');
      })()`,
    );

    if (hasExactCloseButton && await textExists(session, 'Modo interno')) {
      await clickByText(session, 'Fechar', { exact: true });
      await delay(250);
      changed = true;
    }

    if (hasAgoraNaoButton) {
      await clickByText(session, 'Agora nao', { exact: true });
      await delay(250);
      changed = true;
    }

    if (!changed) {
      break;
    }
  }
};

const openGroupsPage = async (session) => {
  let lastError = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await delay(350);
    await closeOptionalOverlays(session);

    try {
      await clickByText(session, 'Grupos', { exact: true });
      await waitForText(session, 'Grupos de Estudo', { timeoutMs: 20000 });
      return;
    } catch (error) {
      lastError = error;
      await delay(500);
    }
  }

  throw lastError || new Error('Nao foi possivel abrir a pagina de grupos.');
};

const ensureGroupSelected = async (session, groupName) => {
  await openGroupsPage(session);
  await waitForText(session, groupName, { timeoutMs: 20000 });

  if (await textExists(session, `Grupo em atividade - ${groupName}`)) {
    return;
  }

  await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(groupName)});
      const buttons = Array.from(document.querySelectorAll('button'));
      const match = buttons.find((button) => normalize(button.textContent || '').includes(target));
      if (!match) return false;
      match.scrollIntoView({ block: 'center', inline: 'center' });
      match.click();
      return true;
    })()`,
  );
  await delay(500);
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

const reloadPage = async (session) => {
  await session.send('Page.reload', { ignoreCache: true });
  await waitFor(session, 'document.readyState === "complete"', { label: 'reload complete' });
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
    throw new Error(`Consulta Supabase falhou (${response.status}) em ${pathWithQuery}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Consulta Supabase sem linhas para ${pathWithQuery}`);
  }

  return rows[0];
};

const waitForSupabaseRow = async ({
  supabaseUrl,
  serviceRoleKey,
  pathWithQuery,
  timeoutMs = 20000,
  intervalMs = 500,
}) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${pathWithQuery}`, {
      headers: createSupabaseHeaders(serviceRoleKey),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Consulta Supabase falhou (${response.status}) em ${pathWithQuery}: ${body.slice(0, 300)}`);
    }

    const rows = await response.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0];
    }

    await delay(intervalMs);
  }

  throw new Error(`Consulta Supabase sem linhas para ${pathWithQuery}`);
};

const insertRows = async (supabaseUrl, serviceRoleKey, table, rows) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: createSupabaseHeaders(serviceRoleKey, {
      Prefer: 'return=representation',
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Insert em ${table} falhou (${response.status}): ${body}`);
  }

  return response.json();
};

const assertUrlAccessible = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`URL do anexo nao respondeu 200: ${url} (${response.status})`);
  }
};

const createUploadFixtures = async () => {
  const uploadsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-groups-files-'));
  const timestamp = Date.now();
  const files = [
    {
      type: 'image',
      fileName: `qa-image-${timestamp}.png`,
      expectedMimeType: 'image/png',
      message: '',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yF9kAAAAASUVORK5CYII=',
        'base64',
      ),
    },
    {
      type: 'file',
      fileName: `qa-pdf-${timestamp}.pdf`,
      expectedMimeType: 'application/pdf',
      message: 'PDF de validacao',
      buffer: Buffer.from('%PDF-1.1\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf8'),
    },
    {
      type: 'file',
      fileName: `qa-docx-${timestamp}.docx`,
      expectedMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      message: 'DOCX de validacao',
      buffer: Buffer.from('Fake docx payload for upload validation', 'utf8'),
    },
    {
      type: 'file',
      fileName: `qa-text-${timestamp}.txt`,
      expectedMimeType: 'text/plain',
      message: 'TXT de validacao',
      buffer: Buffer.from('Arquivo de texto para validacao operacional.', 'utf8'),
    },
  ];

  for (const file of files) {
    file.filePath = path.join(uploadsDir, file.fileName);
    await fs.writeFile(file.filePath, file.buffer);
  }

  return {
    files,
    close: async () => {
      await fs.rm(uploadsDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    },
  };
};

const ensureLoggedIn = async (session, email, password) => {
  await waitForAnyText(session, ['Entrar', 'Grupos', 'Estudo'], { timeoutMs: 30000 });

  const onLoginScreen = await evalInPage(
    session,
    '(() => Boolean(document.querySelector(\'input[type="email"]\') && document.querySelector(\'input[type="password"]\')))()',
  );

  if (!onLoginScreen) {
    return;
  }

  await setInputValue(session, 'input[type="email"]', email);
  await setInputValue(session, 'input[type="password"]', password);
  const formStateBeforeSubmit = await evalInPage(
    session,
    `(() => ({
      email: document.querySelector('input[type="email"]')?.value || '',
      passwordLength: (document.querySelector('input[type="password"]')?.value || '').length,
      buttonLabel: Array.from(document.querySelectorAll('button')).map((button) => String(button.textContent || '').trim()).find((label) => label === 'Entrar' || label === 'Entrando...') || null,
    }))()`,
  );

  if (formStateBeforeSubmit?.email !== email || !formStateBeforeSubmit?.passwordLength) {
    throw new Error(`Campos de login nao foram preenchidos corretamente. Estado: ${JSON.stringify(formStateBeforeSubmit)}`);
  }

  const submitted = await evalInPage(
    session,
    `(() => {
      const form = document.querySelector('form[aria-label*="login"], form[aria-label*="Login"]');
      if (!form) return false;
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
        return true;
      }
      return form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`,
  );

  if (!submitted) {
    throw new Error('Nao consegui submeter o formulario de login.');
  }

  const loginTransition = await waitFor(
    session,
    `(() => {
      const alert = document.querySelector('[role="alert"]');
      const alertText = String(alert?.textContent || '').trim();
      const hasEmail = Boolean(document.querySelector('input[type="email"]'));
      const hasPassword = Boolean(document.querySelector('input[type="password"]'));

      if (alertText) {
        return { kind: 'alert', text: alertText };
      }

      if (!hasEmail && !hasPassword) {
        return { kind: 'ready' };
      }

      return false;
    })()`,
    { timeoutMs: 30000, label: 'transicao pos-login' },
  );

  if (loginTransition?.kind === 'alert') {
    throw new Error(`Falha no login pela UI: ${loginTransition.text}`);
  }

  await waitForAnyText(session, ['Grupos', 'Estudo', 'Inicio'], { timeoutMs: 30000 });

  await closeOptionalOverlays(session);

  const hasNavigation = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const body = normalize(document.body?.innerText || '');
      return body.includes('grupos') || body.includes('estudo') || body.includes('inicio');
    })()`,
  );

  if (!hasNavigation) {
    const excerpt = await getBodyTextExcerpt(session);
    throw new Error(`Login concluiu sem navegacao principal visivel. Excerpt: ${excerpt}`);
  }
};

const runOperationalValidation = async ({
  baseUrl,
  session,
  supabaseUrl,
  serviceRoleKey,
  loginEmail,
  loginPassword,
  fixtureFiles,
  smokeOnly = false,
}) => {
  const groupName = `Grupo QA ${Date.now()}`;
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    groupName,
    steps: [],
  };

  const recordStep = (name, status, details = {}) => {
    report.steps.push({
      name,
      status,
      ...details,
    });
  };

  const failWithContext = async (stepName, error) => {
    const safeName = stepName.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
    try {
      await screenshot(session, `groups-${safeName}`);
    } catch {
      // ignore screenshot failures in diagnostics
    }

    const excerpt = await getBodyTextExcerpt(session).catch(() => '');
    recordStep(stepName, 'failed', {
      message: error instanceof Error ? error.message : String(error),
      excerpt,
      screenshot: `qa-artifacts/groups-${safeName}.png`,
    });

    throw error;
  };

  await navigate(session, `${baseUrl}/`);
  await ensureLoggedIn(session, loginEmail, loginPassword);
  recordStep('login', 'passed');

  try {
    await openGroupsPage(session);
    await setInputValue(session, 'input[placeholder="Nome do grupo"]', groupName);
    await setInputValue(session, 'input[placeholder*="Descri"]', 'Grupo de validacao operacional.');
    await clickByText(session, 'Criar grupo', { exact: true });
    await waitForText(session, groupName, { timeoutMs: 20000 });
    await waitForText(session, 'Ao vivo', { timeoutMs: 10000 });
    recordStep('create_group', 'passed');
  } catch (error) {
    await failWithContext('create_group', error);
  }

  try {
    await clickByText(session, 'Entrar em sessao agora');
    await waitFor(
      session,
      '(() => Boolean(document.querySelector(\'[data-testid="study-focus-container"]\') || document.querySelector(\'[data-testid="study-focus-timer-ready"]\')))()',
      { timeoutMs: 20000, label: 'timer de foco aberto' },
    );
    recordStep('cta_session', 'passed');
  } catch (error) {
    await failWithContext('cta_session', error);
  }

  if (smokeOnly) {
    try {
      await openGroupsPage(session);
      await ensureGroupSelected(session, groupName);
      await waitForText(session, 'Grupo ativo', { timeoutMs: 15000 });
      await waitForText(session, 'Atividade ao vivo', { timeoutMs: 15000 });
      await waitForText(session, 'Ranking por atividade', { timeoutMs: 15000 });
      await waitForAnyText(session, ['Chat em apoio', 'Colaboracao sem virar o centro da tela'], { timeoutMs: 15000 });
      recordStep('overview_visual', 'passed');
    } catch (error) {
      await failWithContext('overview_visual', error);
    }

    try {
      await clickByText(session, 'Chat', { exact: true });
      await waitForSelector(session, 'input[placeholder*="Escreva uma mensagem"]', { timeoutMs: 15000 });
      await waitForText(session, 'Enviar', { timeoutMs: 10000 });
      recordStep('tab_chat', 'passed');
    } catch (error) {
      await failWithContext('tab_chat', error);
    }

    try {
      await clickByText(session, 'Membros', { exact: true });
      await waitForAnyText(session, ['Membros -', 'Nenhum membro encontrado', 'admin'], { timeoutMs: 15000 });
      recordStep('tab_members', 'passed');
    } catch (error) {
      await failWithContext('tab_members', error);
    }

    try {
      await clickByText(session, 'Desafios', { exact: true });
      await waitForAnyText(session, ['Criar meta semanal automatica', 'Meta semanal configurada', 'Desafios -'], { timeoutMs: 20000 });
      recordStep('tab_challenges', 'passed');
    } catch (error) {
      await failWithContext('tab_challenges', error);
    }

    try {
      await clickByText(session, 'Ranking', { exact: true });
      await waitForAnyText(session, ['Sua posicao no ranking exibido', 'Ranking Periodico', 'Compare sua pontuacao por periodo e escopo'], { timeoutMs: 15000 });
      recordStep('tab_ranking', 'passed');
    } catch (error) {
      await failWithContext('tab_ranking', error);
    }

    try {
      await clickByText(session, 'Ao vivo', { exact: true });
      await setViewport(session, { width: 390, height: 844, mobile: true });
      await waitForText(session, 'Entrar em sessao agora', { timeoutMs: 15000 });
      await waitForText(session, 'Grupo ativo', { timeoutMs: 15000 });
      await screenshot(session, 'groups-smoke-mobile');
      await clearViewport(session);
      recordStep('responsive_mobile', 'passed', {
        screenshot: 'qa-artifacts/groups-smoke-mobile.png',
      });
    } catch (error) {
      try {
        await clearViewport(session);
      } catch {
        // ignore viewport cleanup failures
      }
      await failWithContext('responsive_mobile', error);
    }

    report.summary = {
      passed: report.steps.filter((step) => step.status === 'passed').length,
      failed: report.steps.filter((step) => step.status === 'failed').length,
      mode: 'smoke',
    };

    return report;
  }

  try {
    await ensureGroupSelected(session, groupName);
    await clickByText(session, 'Chat', { exact: true });
    await waitForSelector(session, 'input[placeholder*="Escreva uma mensagem"]', { timeoutMs: 15000 });

    for (const file of fixtureFiles) {
      await setFileInputFiles(session, 'input[type="file"]', [file.filePath]);
      await waitForText(session, file.fileName, { timeoutMs: 10000 });

      if (file.message) {
        await setInputValue(session, 'input[placeholder*="Escreva uma mensagem"]', file.message);
      }

      await clickByText(session, 'Enviar', { exact: true });
      await waitFor(
        session,
        `(() => {
          const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
          return !Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'enviando...');
        })()`,
        { timeoutMs: 20000, label: `envio concluido para ${file.fileName}` },
      );
      await waitForSelector(session, 'input[placeholder*="Escreva uma mensagem"]', { timeoutMs: 10000 });

      if (file.type === 'image') {
        await waitFor(
          session,
          `(() => Array.from(document.querySelectorAll('img')).some((img) => img.alt === ${JSON.stringify(file.fileName)}))()`,
          { timeoutMs: 20000, label: `preview da imagem ${file.fileName}` },
        );
      }

      const params = new URLSearchParams({
        select: 'file_name,mime_type,url',
        file_name: `eq.${file.fileName}`,
      });

      const row = await waitForSupabaseRow({
        supabaseUrl,
        serviceRoleKey,
        pathWithQuery: `group_message_attachments?${params.toString()}`,
      });

      if (file.type !== 'image') {
        await waitForText(session, file.fileName, { timeoutMs: 20000 });
      }

      if (row.file_name !== file.fileName) {
        throw new Error(`Anexo persistido com nome inesperado: ${row.file_name}`);
      }

      if (row.mime_type !== file.expectedMimeType) {
        throw new Error(`MIME inesperado para ${file.fileName}: ${row.mime_type}`);
      }

      await assertUrlAccessible(row.url);

      recordStep(`upload_${file.fileName}`, 'passed', {
        mimeType: row.mime_type,
        url: row.url,
      });
    }
  } catch (error) {
    await failWithContext('uploads', error);
  }

  let groupRow;
  let userRow;

  try {
    const groupParams = new URLSearchParams({
      select: 'id,name',
      name: `eq.${groupName}`,
    });
    const userParams = new URLSearchParams({
      select: 'id,email',
      email: `eq.${loginEmail.toLowerCase()}`,
    });

    groupRow = await querySingle(supabaseUrl, serviceRoleKey, `groups?${groupParams.toString()}`);
    userRow = await querySingle(supabaseUrl, serviceRoleKey, `users?${userParams.toString()}`);

    await ensureGroupSelected(session, groupName);
    await clickByText(session, 'Ao vivo', { exact: true });
    await insertRows(supabaseUrl, serviceRoleKey, 'group_activities', [{
      group_id: groupRow.id,
      user_id: userRow.id,
      type: 'study_started',
      metadata: { source: 'groups_operational_check' },
    }]);
    await waitForText(session, 'entrou em sessao', { timeoutMs: 20000 });
    recordStep('realtime_feed', 'passed');
  } catch (error) {
    await failWithContext('realtime_feed', error);
  }

  try {
    await ensureGroupSelected(session, groupName);
    await clickByText(session, 'Desafios', { exact: true });
    await waitForText(session, 'Criar meta semanal automatica', { timeoutMs: 20000 });
    await clickByText(session, 'Criar meta semanal automatica');

    await waitFor(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return !Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'criando desafio...');
      })()`,
      { timeoutMs: 20000, label: 'criacao do desafio concluida' },
    );

    const challengeParams = new URLSearchParams({
      select: 'id,name,status',
      group_id: `eq.${groupRow.id}`,
      order: 'created_at.desc',
    });

    const challengeRow = await waitForSupabaseRow({
      supabaseUrl,
      serviceRoleKey,
      pathWithQuery: `challenges?${challengeParams.toString()}`,
    });

    if (!normalize(challengeRow.name || '').includes('meta semanal automatica')) {
      throw new Error(`Desafio criado com nome inesperado: ${challengeRow.name}`);
    }

    await waitForText(session, 'Usar progresso automatico da semana', { timeoutMs: 20000 });
    await clickByText(session, 'Usar progresso automatico da semana');
    await waitForAnyText(session, ['Progresso semanal sincronizado', 'Progresso atualizado'], { timeoutMs: 20000 });

    const activityParams = new URLSearchParams({
      select: 'id,type,metadata',
      group_id: `eq.${groupRow.id}`,
      user_id: `eq.${userRow.id}`,
      type: 'eq.challenge_progress',
      order: 'created_at.desc',
    });

    const challengeActivity = await querySingle(
      supabaseUrl,
      serviceRoleKey,
      `group_activities?${activityParams.toString()}`,
    );

    if (challengeActivity.type !== 'challenge_progress') {
      throw new Error(`Atividade inesperada apos sync do desafio: ${challengeActivity.type}`);
    }

    recordStep('challenge_progress', 'passed', {
      metadata: challengeActivity.metadata,
    });
  } catch (error) {
    await failWithContext('challenge_progress', error);
  }

  try {
    await ensureGroupSelected(session, groupName);
    await clickByText(session, 'Ao vivo', { exact: true });
    await waitForText(session, 'atualizou', { timeoutMs: 20000 });
    await clickByText(session, 'Ranking', { exact: true });
    await waitForText(session, 'Sua posicao no ranking exibido', { timeoutMs: 20000 });
    await waitFor(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        const body = normalize(document.body?.innerText || '');
        return body.includes('sua posicao no ranking exibido: #1');
      })()`,
      { timeoutMs: 20000, label: 'ranking derivado atualizado' },
    );
    recordStep('ranking', 'passed');
  } catch (error) {
    await failWithContext('ranking', error);
  }

  report.summary = {
    passed: report.steps.filter((step) => step.status === 'passed').length,
    failed: report.steps.filter((step) => step.status === 'failed').length,
  };

  return report;
};

const main = async () => {
  await ensureArtifactsDir();

  if (!(await fileExists(path.join(DIST_DIR, 'index.html')))) {
    throw new Error('dist/index.html nao existe. Rode o build antes da validacao operacional.');
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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || cypressEnv.SUPABASE_SERVICE_ROLE_KEY;
  const smokeOnly = process.env.GROUPS_QA_SMOKE_ONLY === '1';

  if (!loginEmail || !loginPassword) {
    throw new Error('Credenciais E2E ausentes. Configure E2E_LOGIN_EMAIL e E2E_LOGIN_PASSWORD.');
  }

  if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
    throw new Error('Config do Supabase ausente. Verifique SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY e SUPABASE_SERVICE_ROLE_KEY.');
  }

  const baseUrl = (process.env.GROUPS_QA_BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/+$/, '');
  const browserSessionPayload = await createBrowserSessionPayload(
    supabaseUrl,
    publishableKey,
    loginEmail,
    loginPassword,
  );

  const remotePort = 9300 + Math.floor(Math.random() * 400);
  const server = baseUrl.startsWith('http://127.0.0.1:') || baseUrl.startsWith('http://localhost:')
    ? await createStaticServer()
    : null;
  const browser = await launchChrome(remotePort);
  const fixtures = smokeOnly
    ? { files: [], close: async () => {} }
    : await createUploadFixtures();

  try {
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createSeedScript(loginEmail, supabaseUrl, browserSessionPayload),
    });

    const report = await runOperationalValidation({
      baseUrl,
      session: browser.session,
      supabaseUrl,
      serviceRoleKey,
      loginEmail,
      loginPassword,
      fixtureFiles: fixtures.files,
      smokeOnly,
    });

    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await fixtures.close();
    await browser.close();
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
