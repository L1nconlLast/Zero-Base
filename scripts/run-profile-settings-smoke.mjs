import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'profile-settings-smoke-report.json');
const INITIAL_SCREENSHOT_PATH = path.join(ARTIFACTS_DIR, 'profile-settings-smoke-initial.png');
const FINAL_SCREENSHOT_PATH = path.join(ARTIFACTS_DIR, 'profile-settings-smoke-final.png');
const PORT = 4176;
const CHROME_PORT = 9336;

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

const WEEK_DAYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const normalize = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

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

const readJsonIfExists = async (targetPath) => {
  if (!(await fileExists(targetPath))) {
    return {};
  }

  const raw = await fs.readFile(targetPath, 'utf8');
  return JSON.parse(raw);
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

      acc[trimmed.slice(0, separatorIndex).trim()] = trimmed.slice(separatorIndex + 1).trim();
      return acc;
    }, {});
};

const fileExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const ensureDistReady = async () => {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!(await fileExists(indexPath))) {
    throw new Error('dist/index.html nao encontrado. Rode o build antes do smoke.');
  }
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

const findChromePath = async () => {
  for (const candidate of chromeCandidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error('Nenhum Chrome/Edge encontrado para o smoke headless.');
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

const openPageTarget = async (port) => {
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
  await session.send('DOM.enable');
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });

  return {
    session,
    targetId: pageTarget.id || null,
  };
};

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-profile-settings-smoke-'));
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
  const page = await openPageTarget(port);

  const browser = {
    session: page.session,
    targetId: page.targetId,
    port,
    close: async () => {
      try {
        await browser.session.close();
      } catch {
        // ignore close issues
      }

      await closePageTarget(browser.port, browser.targetId);

      chrome.kill();
      await delay(300);

      try {
        await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch {
        // ignore temporary locked files
      }
    },
  };

  return browser;
};

const closePageTarget = async (port, targetId) => {
  if (!targetId) {
    return;
  }

  try {
    await fetch(`http://127.0.0.1:${port}/json/close/${targetId}`, {
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // ignore close issues
  }
};

const buildWeekProgress = (sessions) => {
  const progress = Object.fromEntries(WEEK_DAYS.map((day) => [day, { studied: false, minutes: 0 }]));

  sessions.forEach((session) => {
    const day = WEEK_DAYS[new Date(session.date).getDay()];
    progress[day] = {
      studied: true,
      minutes: (progress[day]?.minutes || 0) + session.minutes,
    };
  });

  return progress;
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildUserData = () => {
  const now = new Date();
  const sessions = [
    { offset: 0, minutes: 90, subject: 'Matematica' },
    { offset: 1, minutes: 60, subject: 'Historia' },
    { offset: 2, minutes: 45, subject: 'Biologia' },
    { offset: 4, minutes: 30, subject: 'Quimica' },
    { offset: 4, minutes: 40, subject: 'Fisica' },
  ].map((entry, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - entry.offset);
    date.setHours(8 + index, 15, 0, 0);
    const dateKey = toDateKey(date);

    return {
      date: dateKey,
      minutes: entry.minutes,
      duration: entry.minutes,
      points: entry.minutes * 10,
      subject: entry.subject,
      timestamp: date.toISOString(),
      goalMet: entry.minutes >= 60,
    };
  });

  return {
    weekProgress: buildWeekProgress(sessions),
    completedTopics: {},
    totalPoints: sessions.reduce((sum, session) => sum + session.points, 0),
    streak: 3,
    bestStreak: 5,
    achievements: [],
    level: 4,
    studyHistory: sessions,
    dailyGoal: 90,
    sessions,
    currentStreak: 3,
  };
};

const createSeedScript = ({ email, name, userData, avatarDataUrl, supabaseUrl, browserSessionPayload }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const smokeSeedKey = `__profile_settings_smoke_seeded__${normalizedEmail}`;
  const entries = [
    [`zeroBaseData_${normalizedEmail}`, JSON.stringify(userData)],
    [`profileDisplayName_${normalizedEmail}`, JSON.stringify(name)],
    [`profileAvatar_${normalizedEmail}`, JSON.stringify(avatarDataUrl)],
    [`profileExamGoal_${normalizedEmail}`, JSON.stringify('ENEM')],
    [`profileExamDate_${normalizedEmail}`, JSON.stringify('2026-11-15')],
    [`preferredStudyTrack_${normalizedEmail}`, JSON.stringify('enem')],
    [`selectedStudyMethodId_${normalizedEmail}`, JSON.stringify('pomodoro')],
    [`plannedFocusDuration_${normalizedEmail}`, JSON.stringify(25)],
    [`activeStudyMode_${normalizedEmail}`, JSON.stringify('pomodoro')],
    [`weeklyGoalMinutes_${normalizedEmail}`, JSON.stringify(900)],
    [`mdzOnboardingCompleted_${email}`, 'true'],
    ['zb_phase_override', JSON.stringify('intermediate')],
    ['settings-pref-theme', 'light'],
    ['settings-pref-lang', 'pt'],
    ['settings-pref-density', 'normal'],
    ['settings-pref-time', 'afternoon'],
    ['darkMode', JSON.stringify(false)],
  ];

  if (supabaseUrl && browserSessionPayload) {
    entries.push([buildAuthStorageKey(supabaseUrl), JSON.stringify(browserSessionPayload)]);
  } else {
    entries.push(['zeroBaseSession', JSON.stringify({
      user: {
        nome: name,
        email,
        dataCadastro: new Date().toISOString(),
        foto: avatarDataUrl,
        examGoal: 'ENEM',
        examDate: '2026-11-15',
        preferredTrack: 'enem',
      },
      userId: `local:${normalizedEmail}`,
    })]);
  }

  return `
    (() => {
      try {
        if (window.localStorage.getItem(${JSON.stringify(smokeSeedKey)}) === 'true') {
          return;
        }

        window.localStorage.clear();
        const entries = ${JSON.stringify(entries)};
        for (const [key, value] of entries) {
          window.localStorage.setItem(key, value);
        }
        window.localStorage.setItem(${JSON.stringify(smokeSeedKey)}, 'true');
      } catch (error) {
        console.error('profile-settings-smoke-seed-failed', error);
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

const waitForStable = async (
  session,
  predicateExpression,
  { timeoutMs = 15000, intervalMs = 150, stableMs = 900, label = 'condicao estavel' } = {},
) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    let value = false;

    try {
      value = await evalInPage(session, predicateExpression);
    } catch {
      value = false;
    }

    if (!value) {
      await delay(intervalMs);
      continue;
    }

    const stableStartedAt = Date.now();
    let keptStable = true;

    while (Date.now() - stableStartedAt < stableMs) {
      await delay(intervalMs);

      try {
        value = await evalInPage(session, predicateExpression);
      } catch {
        value = false;
      }

      if (!value) {
        keptStable = false;
        break;
      }
    }

    if (keptStable) {
      return true;
    }
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

const clickAtPoint = async (session, x, y) => {
  await session.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
    button: 'left',
  });
  await session.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    clickCount: 1,
  });
  await session.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    clickCount: 1,
  });
};

const clickByText = async (session, text, { exact = false } = {}) => {
  const target = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(text)});
      const nodes = Array.from(document.querySelectorAll('button, a, [role="button"]')).filter((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });
      const match = nodes.find((candidate) => {
        const content = normalize(candidate.textContent || '');
        return ${exact ? 'content === target' : 'content.includes(target)'};
      });
      if (!match) return null;
      match.scrollIntoView({ block: 'center', inline: 'center' });
      const reactPropsKey = Object.keys(match).find((key) => key.startsWith('__reactProps$'));
      const reactOnClick = reactPropsKey ? match[reactPropsKey]?.onClick : null;
      if (typeof reactOnClick === 'function') {
        reactOnClick({
          currentTarget: match,
          target: match,
          type: 'click',
          preventDefault() {},
          stopPropagation() {},
        });
      }
      const rect = match.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    })()`,
  );

  if (!target) {
    throw new Error(`Nao encontrei elemento clicavel com texto: ${text}`);
  }

  await clickAtPoint(session, target.x, target.y);
};

const clickByAnyText = async (session, texts, options = {}) => {
  let lastError = null;

  for (const text of texts) {
    try {
      await clickByText(session, text, options);
      return text;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Nao encontrei elemento clicavel com os textos: ${texts.join(', ')}`);
};

const screenshot = async (session, targetPath) => {
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });

  await fs.writeFile(targetPath, Buffer.from(data, 'base64'));
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

const navigate = async (session, url) => {
  await session.send('Page.navigate', { url });
  await waitFor(session, 'document.readyState === "complete"', { label: 'load complete' });
  await waitFor(session, 'Boolean(document.body && document.body.innerText.trim().length > 0)', { label: 'conteudo da pagina' });
};

const reloadPage = async (session) => {
  await session.send('Page.reload', { ignoreCache: true });
  await waitFor(session, 'document.readyState === "complete"', { label: 'reload complete' });
  await waitFor(session, 'Boolean(document.body && document.body.innerText.trim().length > 0)', { label: 'conteudo recarregado' });
};

const createUploadFixture = async () => {
  const uploadFilePath = path.join(os.tmpdir(), `zero-base-profile-settings-${Date.now()}.png`);
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0j8AAAAASUVORK5CYII=';
  await fs.writeFile(uploadFilePath, Buffer.from(pngBase64, 'base64'));
  return uploadFilePath;
};

const assertBodyIncludes = async (session, text, label) => {
  await waitForText(session, text, { label });
};

const assertAvatarDataUrlPresent = async (session, label) => {
  await waitFor(
    session,
    `(() => Array.from(document.querySelectorAll('img')).some((img) => String(img.src || '').startsWith('data:image/')))()`,
    { label, timeoutMs: 15000 },
  );
};

const assertHeatmapHasRealCells = async (session) => {
  await waitFor(
    session,
    `(() => {
      const cells = Array.from(document.querySelectorAll('div[title]'));
      return cells.some((node) => String(node.getAttribute('title') || '').includes('min'));
    })()`,
    { label: 'heatmap com atividade real' },
  );
};

const dismissOptionalOverlays = async (session) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let changed = false;

    const hasNotificationDismiss = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'agora nao');
      })()`,
    );

    if (hasNotificationDismiss) {
      await clickByText(session, 'Agora não', { exact: true });
      await delay(250);
      changed = true;
    }

    const hasInternalClose = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        const body = normalize(document.body?.innerText || '');
        return body.includes('modo interno')
          && Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'fechar');
      })()`,
    );

    if (hasInternalClose) {
      await clickByText(session, 'Fechar', { exact: true });
      await delay(250);
      changed = true;
    }

    if (!changed) {
      break;
    }
  }
};

const waitForAuthenticatedShell = async (session) =>
  waitFor(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const body = normalize(document.body?.innerText || '');
      if (body.includes('nao tem conta? cadastre-se') || body.includes('acesse seu plano no zero base')) {
        return false;
      }

      return Array.from(document.querySelectorAll('button, a, [role="button"]')).some((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return normalize(candidate.textContent || '') === 'configuracoes';
      });
    })()`,
    { timeoutMs: 30000, label: 'shell autenticado' },
  );

const forceAppTab = async (session, tabId) =>
  evalInPage(
    session,
    `(() => {
      const appTabIds = new Set([
        'inicio',
        'arvore',
        'departamento',
        'mentor',
        'mentor-admin',
        'cronograma',
        'metodos',
        'foco',
        'dashboard',
        'questoes',
        'simulado',
        'flashcards',
        'vespera',
        'grupos',
        'ranking-global',
        'conquistas',
        'configuracoes',
        'dados',
      ]);

      const probe = document.querySelector('aside button') || document.querySelector('button');
      if (!probe) return false;

      const fiberKey = Object.keys(probe).find((key) => key.startsWith('__reactFiber$'));
      let fiber = fiberKey ? probe[fiberKey] : null;
      while (fiber) {
        let hook = fiber.memoizedState;
        while (hook) {
          if (
            hook.queue?.dispatch
            && typeof hook.memoizedState === 'string'
            && appTabIds.has(hook.memoizedState)
          ) {
            hook.queue.dispatch(${JSON.stringify(tabId)});
            return true;
          }
          hook = hook.next;
        }
        fiber = fiber.return;
      }

      return false;
    })()`,
  );

const clickSettingsTab = async (session) => {
  const target = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const candidates = Array.from(document.querySelectorAll('aside button'))
        .filter((candidate) => {
          const style = window.getComputedStyle(candidate);
          const rect = candidate.getBoundingClientRect();
          if (!rect.width || !rect.height) return false;
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
          return normalize(candidate.textContent || '') === 'configuracoes';
        })
        .sort((left, right) => left.getBoundingClientRect().left - right.getBoundingClientRect().left);

      const match = candidates[0];
      if (!match) return null;

      match.scrollIntoView({ block: 'center', inline: 'center' });
      const reactPropsKey = Object.keys(match).find((key) => key.startsWith('__reactProps$'));
      const reactOnClick = reactPropsKey ? match[reactPropsKey]?.onClick : null;
      if (typeof reactOnClick === 'function') {
        reactOnClick({
          currentTarget: match,
          target: match,
          type: 'click',
          preventDefault() {},
          stopPropagation() {},
        });
      }
      const rect = match.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    })()`,
  );

  if (!target) {
    throw new Error('Nao encontrei o botao de configuracoes na navegacao.');
  }

  await clickAtPoint(session, target.x, target.y);
};

const readSettingsTransitionDebug = async (session) =>
  evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const body = normalize(document.body?.innerText || '');
      const buttons = Array.from(document.querySelectorAll('aside button, button'))
        .filter((candidate) => {
          const style = window.getComputedStyle(candidate);
          const rect = candidate.getBoundingClientRect();
          if (!rect.width || !rect.height) return false;
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
          return true;
        })
        .map((candidate) => ({
          text: normalize(candidate.textContent || ''),
          background: window.getComputedStyle(candidate).backgroundColor,
          color: window.getComputedStyle(candidate).color,
          ariaPressed: candidate.getAttribute('aria-pressed'),
          ariaCurrent: candidate.getAttribute('aria-current'),
          reactKeys: Object.keys(candidate).filter((key) => key.startsWith('__react')).slice(0, 4),
          hasReactOnClick: Boolean(
            Object.keys(candidate)
              .find((key) => key.startsWith('__reactProps$'))
              && typeof candidate[Object.keys(candidate).find((key) => key.startsWith('__reactProps$'))]?.onClick === 'function'
          ),
          reactOnClickPreview: (() => {
            const reactPropsKey = Object.keys(candidate).find((key) => key.startsWith('__reactProps$'));
            const reactOnClick = reactPropsKey ? candidate[reactPropsKey]?.onClick : null;
            return typeof reactOnClick === 'function' ? String(reactOnClick).slice(0, 120) : null;
          })(),
        }))
        .filter((entry) => entry.text.includes('configuracoes') || entry.text.includes('dados') || entry.text.includes('perfil'))
        .slice(0, 8);

      return {
        hasSettingsTitle: body.includes('configuracoes de perfil'),
        hasSettingsLoading: body.includes('carregando configuracoes'),
        hasNotificationPrompt: body.includes('ativar lembretes de estudo'),
        hasLockedModal: body.includes('voce vai desbloquear isso automaticamente apos sua primeira semana'),
        visibleButtons: buttons,
        bodyExcerpt: body.slice(0, 1200),
      };
    })()`,
  );

const setSettingsDeepLink = async (session, settingsTab = 'perfil') =>
  evalInPage(
    session,
    `(() => {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'configuracoes');
      url.searchParams.set('settingsTab', ${JSON.stringify(settingsTab)});
      window.history.replaceState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
      return window.location.href;
    })()`,
  );

const buildSettingsUrl = (settingsTab = 'perfil') => {
  const url = new URL(`http://127.0.0.1:${PORT}/`);
  url.searchParams.set('tab', 'configuracoes');
  url.searchParams.set('settingsTab', settingsTab);
  return url.toString();
};

const reenterPageInSameBrowser = async (browser, url) => {
  await navigate(browser.session, url);
};

const openSettingsPage = async (
  session,
  settingsTab = 'perfil',
  expectedTitle = 'Configurações de perfil',
) => {
  await setSettingsDeepLink(session, settingsTab);
  await waitForAuthenticatedShell(session);
  await dismissOptionalOverlays(session);
  try {
    await assertBodyIncludes(session, expectedTitle, 'abertura da tela');
  } catch (error) {
    const debug = await readSettingsTransitionDebug(session).catch(() => null);
    throw new Error(`${error.message}. settingsTab=${settingsTab}. Debug: ${JSON.stringify(debug)}`);
  }
};

const readDomSnapshot = async (session) => evalInPage(
  session,
  `(() => ({
    title: document.querySelector('h1')?.textContent?.trim() || '',
    theme: document.documentElement.getAttribute('data-theme'),
    lang: document.documentElement.getAttribute('lang'),
    profileAvatar: Array.from(document.querySelectorAll('img')).find((img) => String(img.src || '').startsWith('data:image/') || String(img.src || '').includes('blob:'))?.src || null,
    settingsLang: window.localStorage.getItem('settings-pref-lang'),
    settingsTheme: window.localStorage.getItem('settings-pref-theme'),
  }))()`,
);

const waitForPersistedPreferences = async (
  session,
  {
    theme,
    lang,
    title,
    tabLabel,
    stableMs = 900,
  },
) =>
  waitForStable(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const body = normalize(document.body?.innerText || '');
      return document.documentElement.getAttribute('data-theme') === ${JSON.stringify(theme)}
        && document.documentElement.getAttribute('lang') === ${JSON.stringify(lang)}
        && window.localStorage.getItem('settings-pref-theme') === ${JSON.stringify(theme)}
        && window.localStorage.getItem('settings-pref-lang') === ${JSON.stringify(lang)}
        && body.includes(normalize(${JSON.stringify(title)}))
        && body.includes(normalize(${JSON.stringify(tabLabel)}));
    })()`,
    {
      timeoutMs: 20000,
      stableMs,
      label: `persistencia estavel de tema=${theme} idioma=${lang}`,
    },
  );

const main = async () => {
  await ensureDistReady();
  await ensureArtifactsDir();

  const envFile = await parseDotEnv(path.join(ROOT, '.env'));
  const envLocal = await parseDotEnv(path.join(ROOT, '.env.local'));
  const cypressEnv = await readJsonIfExists(path.join(ROOT, 'cypress.env.json'));

  const uploadFilePath = await createUploadFixture();
  const userData = buildUserData();
  const initialAvatarDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAucB9W2N1d8AAAAASUVORK5CYII=';
  const name = 'Smoke Perfil';
  const loginEmail = String(process.env.E2E_LOGIN_EMAIL || cypressEnv.E2E_LOGIN_EMAIL || '').trim().toLowerCase();
  const loginPassword = String(process.env.E2E_LOGIN_PASSWORD || cypressEnv.E2E_LOGIN_PASSWORD || '').trim();
  const supabaseUrl = String(
    process.env.SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || cypressEnv.SUPABASE_URL
    || envLocal.SUPABASE_URL
    || envLocal.VITE_SUPABASE_URL
    || envFile.SUPABASE_URL
    || envFile.VITE_SUPABASE_URL
    || '',
  ).trim();
  const publishableKey = String(
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || cypressEnv.SUPABASE_PUBLISHABLE_KEY
    || envLocal.VITE_SUPABASE_PUBLISHABLE_KEY
    || envLocal.VITE_SUPABASE_ANON_KEY
    || envFile.VITE_SUPABASE_PUBLISHABLE_KEY
    || envFile.VITE_SUPABASE_ANON_KEY
    || '',
  ).trim();
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY
    || cypressEnv.SUPABASE_SERVICE_ROLE_KEY
    || envLocal.SUPABASE_SERVICE_ROLE_KEY
    || envFile.SUPABASE_SERVICE_ROLE_KEY
    || '',
  ).trim();
  const hasSupabaseAuthConfig = Boolean(supabaseUrl && publishableKey);
  const canCreateTempUser = Boolean(hasSupabaseAuthConfig && serviceRoleKey);
  const canUseExistingE2ELogin = Boolean(hasSupabaseAuthConfig && loginEmail && loginPassword);

  let email = 'qa-profile@local.test';
  let password = 'ProfileSmoke@2026';

  let tempUserId = null;
  let browserSessionPayload = null;

  if (canUseExistingE2ELogin) {
    email = loginEmail;
    password = loginPassword;
    browserSessionPayload = await createBrowserSessionPayload(
      supabaseUrl,
      publishableKey,
      email,
      password,
    );
  } else if (canCreateTempUser) {
    email = `e2e_profile_settings_${Date.now()}@zerobase.dev`;
    const tempUser = await createTempConfirmedUser(
      supabaseUrl,
      serviceRoleKey,
      email,
      password,
      name,
    );
    tempUserId = tempUser.user?.id || tempUser.id || null;
    browserSessionPayload = await createBrowserSessionPayload(
      supabaseUrl,
      publishableKey,
      email,
      password,
    );
  } else if (hasSupabaseAuthConfig) {
    throw new Error(
      'Configuracao insuficiente para autenticar o smoke de perfil. Informe SUPABASE_SERVICE_ROLE_KEY ou E2E_LOGIN_EMAIL/E2E_LOGIN_PASSWORD.',
    );
  }

  const seedScript = createSeedScript({
    email,
    name,
    userData,
    avatarDataUrl: initialAvatarDataUrl,
    supabaseUrl: browserSessionPayload ? supabaseUrl : null,
    browserSessionPayload,
  });

  const server = await createStaticServer();
  const browser = await launchChrome(CHROME_PORT);
  const report = {
    generatedAt: new Date().toISOString(),
    checks: [],
    screenshots: {
      initial: INITIAL_SCREENSHOT_PATH,
      final: FINAL_SCREENSHOT_PATH,
    },
    expected: {
      totalMinutes: userData.sessions.reduce((sum, session) => sum + session.minutes, 0),
      totalSessions: userData.sessions.length,
      activeDays: new Set(userData.sessions.map((session) => session.date)).size,
    },
  };
  const markProgress = async (name) => {
    report.currentAction = name;
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  };

  await markProgress('boot');

  try {
    await markProgress('inject_seed_script');
    const seedScriptId = await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: seedScript,
    });

    await markProgress('open_root');
    await navigate(browser.session, `http://127.0.0.1:${PORT}`);
    await browser.session.send('Page.removeScriptToEvaluateOnNewDocument', {
      identifier: seedScriptId.identifier,
    }).catch(() => undefined);
    await waitForAuthenticatedShell(browser.session);
    await markProgress('shell_ready');
    report.initialBodyText = await evalInPage(
      browser.session,
      'String(document.body?.innerText || "").slice(0, 4000)',
    );
    await openSettingsPage(browser.session, 'perfil', 'Configurações de perfil');
    await screenshot(browser.session, INITIAL_SCREENSHOT_PATH);
    report.checks.push({ name: 'open_settings', status: 'passed' });

    await markProgress('stats_tab');
    await openSettingsPage(browser.session, 'estatisticas', 'Configurações de perfil');
    await assertBodyIncludes(browser.session, `${report.expected.totalMinutes} min`, 'minutos reais');
    await assertHeatmapHasRealCells(browser.session);
    report.checks.push({
      name: 'real_activity',
      status: 'passed',
      totalMinutes: report.expected.totalMinutes,
      totalSessions: report.expected.totalSessions,
      activeDays: report.expected.activeDays,
    });

    await markProgress('profile_tab');
    await openSettingsPage(browser.session, 'perfil', 'Configurações de perfil');
    await markProgress('avatar_input');
    await setFileInputFiles(browser.session, 'input[type="file"]', [uploadFilePath]);
    await assertAvatarDataUrlPresent(browser.session, 'avatar data url apos upload local');
    await markProgress('save_profile_after_avatar');
    await clickByText(browser.session, 'Salvar perfil');
    await waitFor(
      browser.session,
      `(() => {
        const value = window.localStorage.getItem(${JSON.stringify(`profileAvatar_${email.toLowerCase()}`)});
        return typeof value === 'string' && value.includes('data:image/');
      })()`,
      { label: 'persistencia local do avatar' },
    );
    await markProgress('reload_after_avatar');
    await reenterPageInSameBrowser(browser, buildSettingsUrl('perfil'));
    await assertBodyIncludes(browser.session, 'Configurações de perfil', 'settings apos refresh');
    await assertAvatarDataUrlPresent(browser.session, 'avatar apos refresh');
    report.checks.push({ name: 'avatar_upload_and_refresh', status: 'passed' });

    await markProgress('preferences_tab');
    await openSettingsPage(browser.session, 'preferencias', 'Configurações de perfil');
    await markProgress('switch_english');
    await clickByText(browser.session, 'English');
    await assertBodyIncludes(browser.session, 'Profile settings', 'idioma ingles');
    await markProgress('switch_dark');
    await clickByText(browser.session, 'Dark');
    await waitFor(
      browser.session,
      `document.documentElement.getAttribute('data-theme') === 'dark' && window.localStorage.getItem('settings-pref-theme') === 'dark'`,
      { label: 'tema escuro persistido' },
    );
    await waitFor(
      browser.session,
      `document.documentElement.getAttribute('data-theme') === 'dark' && document.documentElement.getAttribute('lang') === 'en' && window.localStorage.getItem('settings-pref-lang') === 'en'`,
      { label: 'tema e idioma persistidos localmente' },
    );
    await markProgress('reenter_after_preferences');
    await reenterPageInSameBrowser(browser, buildSettingsUrl('preferencias'));
    await waitForPersistedPreferences(browser.session, {
      theme: 'dark',
      lang: 'en',
      title: 'Profile settings',
      tabLabel: 'Preferences',
    });
    report.checks.push({
      name: 'theme_and_english_persistence',
      status: 'passed',
      storageValidated: true,
      reentryValidated: true,
    });

    await markProgress('switch_spanish');
    await clickByAnyText(browser.session, ['Spanish', 'Español', 'Espanol']);
    await waitForPersistedPreferences(browser.session, {
      theme: 'dark',
      lang: 'es',
      title: 'Configuracion de perfil',
      tabLabel: 'Preferencias',
    });
    await screenshot(browser.session, FINAL_SCREENSHOT_PATH);
    report.checks.push({
      name: 'spanish_switch',
      status: 'passed',
      storageValidated: true,
    });

    report.snapshot = await readDomSnapshot(browser.session);
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ok: true, reportPath: REPORT_PATH, report }, null, 2));
  } catch (error) {
    report.ok = false;
    report.error = String(error instanceof Error ? error.message : error);
    try {
      report.failureBodyText = await evalInPage(
        browser.session,
        'String(document.body?.innerText || "").slice(0, 4000)',
      );
    } catch {
      // ignore secondary diagnostics errors
    }
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    throw error;
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(uploadFilePath, { force: true });
    if (tempUserId) {
      await deleteTempUser(supabaseUrl, serviceRoleKey, tempUserId).catch(() => undefined);
    }
  }
};

main().catch(async (error) => {
  const failureReport = {
    generatedAt: new Date().toISOString(),
    ok: false,
    error: String(error instanceof Error ? error.message : error),
  };

  await ensureArtifactsDir();
  if (!(await fileExists(REPORT_PATH))) {
    await fs.writeFile(REPORT_PATH, JSON.stringify(failureReport, null, 2));
  }
  console.error(error);
  process.exitCode = 1;
});
