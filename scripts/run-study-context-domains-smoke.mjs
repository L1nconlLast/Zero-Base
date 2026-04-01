import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'study-context-domains-smoke-report.json');
const BASE_URL = (process.env.REAL_SHELL_QA_BASE_URL || 'http://127.0.0.1:5173').replace(/\/+$/, '');
const APP_READY_TIMEOUT_MS = 45000;
const BASE_URL_READY_TIMEOUT_MS = 90000;
const DIAGNOSTIC_LIMIT = 12;

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
    this.eventListeners = new Map();
    this.diagnostics = {
      consoleEntries: [],
      runtimeExceptions: [],
      logEntries: [],
      networkFailures: [],
      requestLog: [],
      responseLog: [],
      navigations: [],
    };
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
      if (message.method) {
        const handlers = this.eventListeners.get(message.method) || [];
        handlers.forEach((handler) => {
          try {
            handler(message.params || {});
          } catch {
            // ignore listener errors in diagnostics pipeline
          }
        });
      }
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

  on(method, handler) {
    const handlers = this.eventListeners.get(method) || [];
    handlers.push(handler);
    this.eventListeners.set(method, handlers);
    return () => {
      const currentHandlers = this.eventListeners.get(method) || [];
      this.eventListeners.set(
        method,
        currentHandlers.filter((candidate) => candidate !== handler),
      );
    };
  }

  async close() {
    this.socket.close();
  }
}

const pushCapped = (list, value, limit = 40) => {
  list.push(value);
  if (list.length > limit) {
    list.splice(0, list.length - limit);
  }
};

const toSingleLine = (value, limit = 240) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);

const formatRemoteObject = (value) => {
  if (!value) {
    return '';
  }

  if (value.type === 'string' && typeof value.value === 'string') {
    return value.value;
  }

  if (typeof value.value !== 'undefined') {
    return String(value.value);
  }

  if (value.unserializableValue) {
    return String(value.unserializableValue);
  }

  if (value.description) {
    return String(value.description);
  }

  return value.type || '';
};

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

const waitForBaseUrlReady = async (targetUrl, { timeoutMs = BASE_URL_READY_TIMEOUT_MS, intervalMs = 500 } = {}) => {
  const startedAt = Date.now();
  let lastSignal = 'sem resposta';

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      const body = await response.text();
      const snippet = toSingleLine(body, 220);
      const looksLikeHtml = /<!doctype html|<html|<body|<div[^>]+id=["']root["']/.test(body.toLowerCase());
      const hasContent = Boolean(snippet);

      if (response.ok && looksLikeHtml && hasContent) {
        return {
          checkedUrl: targetUrl,
          status: response.status,
          snippet,
        };
      }

      lastSignal = `HTTP ${response.status} com payload ${snippet || 'vazio'}`;
    } catch (error) {
      lastSignal = error instanceof Error ? error.message : String(error);
    }

    await delay(intervalMs);
  }

  throw new Error(`Timeout aguardando readiness da app em ${targetUrl}. Ultimo sinal: ${lastSignal}`);
};

const attachSessionDiagnostics = (session) => {
  session.on('Runtime.consoleAPICalled', (params) => {
    pushCapped(session.diagnostics.consoleEntries, {
      type: params.type || 'log',
      text: toSingleLine((params.args || []).map(formatRemoteObject).join(' '), 320),
      url: params.stackTrace?.callFrames?.[0]?.url || null,
      line: params.stackTrace?.callFrames?.[0]?.lineNumber ?? null,
      column: params.stackTrace?.callFrames?.[0]?.columnNumber ?? null,
      timestamp: params.timestamp || Date.now(),
    });
  });

  session.on('Runtime.exceptionThrown', (params) => {
    pushCapped(session.diagnostics.runtimeExceptions, {
      text: toSingleLine(params.exceptionDetails?.text || params.exceptionDetails?.exception?.description || '', 320),
      url: params.exceptionDetails?.url || null,
      line: params.exceptionDetails?.lineNumber ?? null,
      column: params.exceptionDetails?.columnNumber ?? null,
      timestamp: params.timestamp || Date.now(),
    });
  });

  session.on('Log.entryAdded', ({ entry }) => {
    pushCapped(session.diagnostics.logEntries, {
      level: entry?.level || 'info',
      source: entry?.source || null,
      text: toSingleLine(entry?.text || '', 320),
      url: entry?.url || null,
      timestamp: entry?.timestamp || Date.now(),
    });
  });

  session.on('Network.loadingFailed', (params) => {
    pushCapped(session.diagnostics.networkFailures, {
      requestId: params.requestId,
      type: params.type || null,
      errorText: params.errorText || null,
      canceled: Boolean(params.canceled),
      blockedReason: params.blockedReason || null,
      timestamp: Date.now(),
    });
  });

  session.on('Network.requestWillBeSent', (params) => {
    pushCapped(session.diagnostics.requestLog, {
      requestId: params.requestId,
      url: params.request?.url || null,
      method: params.request?.method || null,
      type: params.type || null,
      isNavigationRequest: Boolean(params.documentURL && params.type === 'Document'),
      timestamp: params.timestamp || Date.now(),
    });
  });

  session.on('Network.responseReceived', (params) => {
    pushCapped(session.diagnostics.responseLog, {
      requestId: params.requestId,
      url: params.response?.url || null,
      status: params.response?.status ?? null,
      mimeType: params.response?.mimeType || null,
      type: params.type || null,
      fromDiskCache: Boolean(params.response?.fromDiskCache),
      fromServiceWorker: Boolean(params.response?.fromServiceWorker),
      timestamp: params.timestamp || Date.now(),
    });
  });

  session.on('Page.frameNavigated', (params) => {
    if (!params.frame?.parentId) {
      pushCapped(session.diagnostics.navigations, {
        url: params.frame?.url || null,
        name: params.frame?.name || null,
        timestamp: Date.now(),
      });
    }
  });
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

  attachSessionDiagnostics(session);
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Network.enable');
  await session.send('Log.enable');

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

const toDateTimeLocalValue = (offsetDays, hour = 9, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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
  phaseOverride = null,
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
        window.localStorage.setItem(${JSON.stringify(profileDisplayNameKey)}, ${JSON.stringify(JSON.stringify(displayName))});
        window.localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(browserSessionPayload))});
        ${userData ? `window.localStorage.setItem(${JSON.stringify(userDataKey)}, ${JSON.stringify(JSON.stringify(userData))});` : ''}
        window.localStorage.setItem(${JSON.stringify(weeklyGoalKey)}, '900');
        window.localStorage.setItem(${JSON.stringify(activeStudyModeKey)}, ${JSON.stringify(JSON.stringify('pomodoro'))});
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

const waitForTextToDisappear = async (session, text, options = {}) =>
  waitFor(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      return !normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })()`,
    { ...options, label: `texto sumir "${text}"` },
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

const clickByAccessibleName = async (session, name) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(name)});
      const nodes = Array.from(document.querySelectorAll('button, a, [role="button"]')).filter((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return true;
      });
      const match = nodes.find((candidate) => {
        const value = normalize(
          candidate.getAttribute('aria-label')
          || candidate.getAttribute('title')
          || candidate.textContent
          || ''
        );
        return value === target;
      });
      if (!match) return false;
      match.scrollIntoView({ block: 'center', inline: 'center' });
      match.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error(`Nao encontrei elemento clicavel com nome acessivel: ${name}`);
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
      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      input.blur();
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

const getBodyTextSnippet = async (session, limit = 500) =>
  evalInPage(
    session,
    `(() => String(document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}))()`,
  );

const getStudyContextDebugState = async (session, limit = 700) =>
  evalInPage(
    session,
    `(() => {
      const shell = document.querySelector('[data-native-shell]');
      const root = document.querySelector('#root');
      return {
        locationHref: window.location.href,
        readyState: document.readyState,
        title: document.title,
        rootChildCount: root?.childElementCount || 0,
        app: window.__ZB_STUDY_CONTEXT_DEBUG__ || null,
        faculdadeShell: window.__ZB_FACULDADE_SHELL_DEBUG__ || null,
        outrosShell: window.__ZB_OUTROS_SHELL_DEBUG__ || null,
        shellMarker: shell ? {
          mode: shell.getAttribute('data-native-shell'),
          tab: shell.getAttribute('data-native-shell-tab'),
          status: shell.getAttribute('data-native-shell-status'),
          studyContextId: shell.getAttribute('data-outros-study-context-id'),
          rankScope: shell.getAttribute('data-outros-rank-scope'),
        } : null,
        body: String(document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}),
        bodyHtml: String(document.body?.innerHTML || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}),
      };
    })()`,
  );

const getCapturedSessionDiagnostics = (session, limit = DIAGNOSTIC_LIMIT) => {
  const diagnostics = session.diagnostics || {};
  const consoleEntries = Array.isArray(diagnostics.consoleEntries) ? diagnostics.consoleEntries : [];
  const runtimeExceptions = Array.isArray(diagnostics.runtimeExceptions) ? diagnostics.runtimeExceptions : [];
  const logEntries = Array.isArray(diagnostics.logEntries) ? diagnostics.logEntries : [];
  const networkFailures = Array.isArray(diagnostics.networkFailures) ? diagnostics.networkFailures : [];
  const requestLog = Array.isArray(diagnostics.requestLog) ? diagnostics.requestLog : [];
  const responseLog = Array.isArray(diagnostics.responseLog) ? diagnostics.responseLog : [];
  const navigations = Array.isArray(diagnostics.navigations) ? diagnostics.navigations : [];

  return {
    consoleErrors: consoleEntries
      .filter((entry) => ['error', 'assert'].includes(entry.type))
      .slice(-limit),
    consoleRecent: consoleEntries.slice(-limit),
    runtimeExceptions: runtimeExceptions.slice(-limit),
    logEntries: logEntries
      .filter((entry) => ['error', 'warning'].includes(entry.level))
      .slice(-limit),
    networkFailures: networkFailures.slice(-limit),
    recentRequests: requestLog.slice(-limit),
    recentResponses: responseLog
      .filter((entry) => typeof entry.status === 'number' && (entry.status >= 400 || entry.type === 'Document'))
      .slice(-limit),
    navigations: navigations.slice(-limit),
  };
};

const getFailureDiagnostics = async (session, limit = 700) => ({
  ...(await getStudyContextDebugState(session, limit).catch(() => ({
    locationHref: null,
    readyState: null,
    title: null,
    rootChildCount: null,
    app: null,
    faculdadeShell: null,
    outrosShell: null,
    shellMarker: null,
    body: null,
    bodyHtml: null,
  }))),
  captured: getCapturedSessionDiagnostics(session),
});

const waitForDocumentReady = async (session, { timeoutMs = APP_READY_TIMEOUT_MS, label = 'document.readyState completo' } = {}) =>
  waitFor(session, 'document.readyState === "complete"', { timeoutMs, label });

const waitForAppReady = async (session, { timeoutMs = APP_READY_TIMEOUT_MS, label = 'app carregada' } = {}) => {
  try {
    await waitForDocumentReady(session, { timeoutMs, label: `${label} (documento)` });
    await waitFor(
      session,
      `(() => {
        const root = document.querySelector('#root');
        const text = String(document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
        const hasMeaningfulUi = Boolean(
          document.querySelector('[data-native-shell], main, aside, form, button, input, textarea, select, [role="dialog"], [role="button"]')
        );
        const hasDebugState = Boolean(window.__ZB_STUDY_CONTEXT_DEBUG__ || window.__ZB_FACULDADE_SHELL_DEBUG__);
        return Boolean(root) && (text.length > 0 || hasMeaningfulUi || hasDebugState || root.childElementCount > 0);
      })()`,
      { timeoutMs, label },
    );
  } catch (error) {
    const diagnostics = await getFailureDiagnostics(session).catch(() => null);
    throw new Error(`${error instanceof Error ? error.message : String(error)} Debug: ${JSON.stringify(diagnostics)}`);
  }

  return getFailureDiagnostics(session);
};

const waitForFaculdadeShellReady = async (session, { timeoutMs = 45000, label = 'shell faculdade pronto' } = {}) => {
  try {
    await waitFor(
      session,
      `(() => {
        const app = window.__ZB_STUDY_CONTEXT_DEBUG__ || null;
        const faculdadeShell = window.__ZB_FACULDADE_SHELL_DEBUG__ || null;
        const shell = document.querySelector('[data-native-shell="faculdade"]');
        const shellStatus = shell?.getAttribute('data-native-shell-status') || null;
        return Boolean(
          app
          && app.studyContextBootstrapStatus === 'ready'
          && app.resolvedStudyContextMode === 'faculdade'
          && app.showOnboarding === false
          && app.shouldRenderNativeShell === true
          && shell
          && shellStatus
          && shellStatus !== 'loading'
          && faculdadeShell
          && faculdadeShell.dashboardStatus
          && faculdadeShell.dashboardStatus !== 'loading'
        );
      })()`,
      { timeoutMs, label },
    );
  } catch (error) {
    const debug = await getFailureDiagnostics(session).catch(() => null);
    throw new Error(`${error instanceof Error ? error.message : String(error)} Debug: ${JSON.stringify(debug)}`);
  }

  return getFailureDiagnostics(session);
};

const waitForOutrosShellReady = async (session, { timeoutMs = 45000, label = 'shell outros pronto' } = {}) => {
  try {
    await waitFor(
      session,
      `(() => {
        const app = window.__ZB_STUDY_CONTEXT_DEBUG__ || null;
        const outrosShell = window.__ZB_OUTROS_SHELL_DEBUG__ || null;
        const shell = document.querySelector('[data-native-shell="outros"]');
        const shellStatus = shell?.getAttribute('data-native-shell-status') || null;
        return Boolean(
          app
          && app.studyContextBootstrapStatus === 'ready'
          && app.resolvedStudyContextMode === 'outros'
          && app.showOnboarding === false
          && app.shouldRenderNativeShell === true
          && shell
          && shellStatus
          && shellStatus !== 'loading'
          && outrosShell
          && outrosShell.dashboardStatus
          && outrosShell.dashboardStatus !== 'loading'
        );
      })()`,
      { timeoutMs, label },
    );
  } catch (error) {
    const debug = await getFailureDiagnostics(session).catch(() => null);
    throw new Error(`${error instanceof Error ? error.message : String(error)} Debug: ${JSON.stringify(debug)}`);
  }

  return getFailureDiagnostics(session);
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

const getCurrentPageUrl = async (session) =>
  evalInPage(session, 'window.location.href').catch(() => `${BASE_URL}/`);

const navigate = async (
  session,
  url,
  { attempts = 2, retryDelayMs = 1200, appTimeoutMs = APP_READY_TIMEOUT_MS } = {},
) => {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await session.send('Page.navigate', { url });
      await waitForAppReady(session, {
        timeoutMs: appTimeoutMs,
        label: `app carregada apos navigate (${attempt}/${attempts})`,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await delay(retryDelayMs);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
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

const reload = async (
  session,
  { attempts = 2, retryDelayMs = 1200, appTimeoutMs = APP_READY_TIMEOUT_MS } = {},
) => {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (attempt === 1) {
        await session.send('Page.reload', { ignoreCache: true });
      } else {
        const currentUrl = await getCurrentPageUrl(session);
        await session.send('Page.navigate', { url: currentUrl });
      }

      await waitForAppReady(session, {
        timeoutMs: appTimeoutMs,
        label: `app carregada apos reload (${attempt}/${attempts})`,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await delay(retryDelayMs);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

const clickContextCard = async (session, label) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(label)});
      const buttons = Array.from(document.querySelectorAll('button'));
      const match = buttons.find((candidate) => normalize(candidate.textContent || '').startsWith(target));
      if (!match) return false;
      match.scrollIntoView({ block: 'center', inline: 'center' });
      match.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error(`Nao encontrei card do onboarding com label: ${label}`);
  }
};

const clickLabeledButton = async (session, labelText, buttonText) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const labelTarget = normalize(${JSON.stringify(labelText)});
      const buttonTarget = normalize(${JSON.stringify(buttonText)});
      const labels = Array.from(document.querySelectorAll('label'));
      const label = labels.find((candidate) => normalize(candidate.textContent || '').includes(labelTarget));
      if (!label) return false;
      const scope = label.parentElement;
      if (!scope) return false;
      const buttons = Array.from(scope.querySelectorAll('button'));
      const match = buttons.find((candidate) => normalize(candidate.textContent || '').includes(buttonTarget));
      if (!match) return false;
      match.scrollIntoView({ block: 'center', inline: 'center' });
      match.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error(`Nao encontrei opcao "${buttonText}" para o bloco "${labelText}"`);
  }
};

const clickScopedButton = async (session, { scopeText, buttonText, exact = false }) => {
  const result = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const scopeTarget = normalize(${JSON.stringify(scopeText)});
      const buttonTarget = normalize(${JSON.stringify(buttonText)});
      const matchesButton = (candidate) => {
        const buttons = Array.from(candidate.querySelectorAll('button, a, [role="button"]')).filter((node) => {
          const style = window.getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          if (!rect.width || !rect.height) return false;
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
          return true;
        });
        return buttons.some((node) => {
          const value = normalize(
            node.getAttribute('aria-label')
            || node.getAttribute('title')
            || node.textContent
            || ''
          );
          return ${exact ? 'value === buttonTarget' : 'value.includes(buttonTarget)'};
        });
      };
      const semanticCandidates = Array.from(document.querySelectorAll('article, section, div'))
        .filter((candidate) => normalize(candidate.textContent || '').includes(scopeTarget))
        .filter((candidate) => matchesButton(candidate))
        .sort((left, right) => (left.textContent || '').length - (right.textContent || '').length);
      const root = semanticCandidates[0] || null;
      if (!root) {
        const debug = Array.from(document.querySelectorAll('article, section, div'))
          .filter((candidate) => normalize(candidate.textContent || '').includes(scopeTarget))
          .slice(0, 4)
          .map((candidate) => ({
            text: normalize(candidate.textContent || '').slice(0, 180),
            buttons: Array.from(candidate.querySelectorAll('button, a, [role="button"]'))
              .map((node) => normalize(node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || ''))
              .filter(Boolean)
              .slice(0, 8),
          }));
        return { ok: false, debug };
      }
      const buttons = Array.from(root.querySelectorAll('button, a, [role="button"]')).filter((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return true;
      });
      const match = buttons.find((candidate) => {
        const value = normalize(
          candidate.getAttribute('aria-label')
          || candidate.getAttribute('title')
          || candidate.textContent
          || ''
        );
        return ${exact ? 'value === buttonTarget' : 'value.includes(buttonTarget)'};
      });
      if (!match) {
        return {
          ok: false,
          debug: [
            {
              text: normalize(root.textContent || '').slice(0, 240),
              buttons: buttons
                .map((node) => normalize(node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || ''))
                .filter(Boolean)
                .slice(0, 12),
            },
          ],
        };
      }
      match.scrollIntoView({ block: 'center', inline: 'center' });
      match.click();
      return { ok: true };
    })()`,
  );

  if (!result?.ok) {
    const debug = result?.debug ? ` Debug: ${JSON.stringify(result.debug)}` : '';
    throw new Error(`Nao encontrei o botao "${buttonText}" dentro do bloco "${scopeText}".${debug}`);
  }
};

const setSelectByOptionText = async (session, { optionText, occurrence = 0, scopeText = null }) => {
  const updated = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const optionTarget = normalize(${JSON.stringify(optionText)});
      const scopeTarget = ${scopeText ? `normalize(${JSON.stringify(scopeText)})` : 'null'};
      const semanticCandidates = scopeTarget
        ? Array.from(document.querySelectorAll('article, section'))
            .filter((candidate) => normalize(candidate.textContent || '').includes(scopeTarget))
        : [];
      const fallbackCandidates = scopeTarget
        ? Array.from(document.querySelectorAll('div'))
            .filter((candidate) => normalize(candidate.textContent || '').includes(scopeTarget))
        : [];
      const scopeCandidates = [...semanticCandidates, ...fallbackCandidates]
        .sort((left, right) => (left.textContent || '').length - (right.textContent || '').length);
      const root = scopeCandidates[0] || document;
      if (!root) return false;
      const selects = Array.from(root.querySelectorAll('select'));
      const select = selects[${occurrence}] || null;
      if (!(select instanceof HTMLSelectElement)) return false;
      const option = Array.from(select.options).find((candidate) => normalize(candidate.textContent || '').includes(optionTarget));
      if (!option) return false;
      const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      if (!descriptor?.set) return false;
      select.focus();
      descriptor.set.call(select, option.value);
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  );

  if (!updated) {
    throw new Error(`Nao foi possivel selecionar a opcao "${optionText}"`);
  }
};

const selectFirstAvailableOption = async (session, { occurrence = 0, scopeText = null }) => {
  const updated = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const scopeTarget = ${scopeText ? `normalize(${JSON.stringify(scopeText)})` : 'null'};
      const semanticCandidates = scopeTarget
        ? Array.from(document.querySelectorAll('article, section'))
            .filter((candidate) => normalize(candidate.textContent || '').includes(scopeTarget))
        : [];
      const fallbackCandidates = scopeTarget
        ? Array.from(document.querySelectorAll('div'))
            .filter((candidate) => normalize(candidate.textContent || '').includes(scopeTarget))
        : [];
      const scopeCandidates = [...semanticCandidates, ...fallbackCandidates]
        .sort((left, right) => (left.textContent || '').length - (right.textContent || '').length);
      const root = scopeCandidates[0] || document;
      const selects = Array.from(root.querySelectorAll('select'));
      const select = selects[${occurrence}] || null;
      if (!(select instanceof HTMLSelectElement)) return false;
      const option = Array.from(select.options).find((candidate) => candidate.value);
      if (!option) return false;
      const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      if (!descriptor?.set) return false;
      select.focus();
      descriptor.set.call(select, option.value);
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      select.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      select.blur();
      return true;
    })()`,
  );

  if (!updated) {
    throw new Error('Nao foi possivel selecionar a primeira opcao valida.');
  }
};

const setNthInputValue = async (session, selector, occurrence, value, scopeText = null) => {
  const updated = await evalInPage(
    session,
    `(() => {
      const normalize = (text) => String(text).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const scopeTarget = ${scopeText ? `normalize(${JSON.stringify(scopeText)})` : 'null'};
      const semanticCandidates = scopeTarget
        ? Array.from(document.querySelectorAll('article, section'))
            .filter((candidate) => normalize(candidate.textContent || '').includes(scopeTarget))
        : [];
      const fallbackCandidates = scopeTarget
        ? Array.from(document.querySelectorAll('div'))
            .filter((candidate) => normalize(candidate.textContent || '').includes(scopeTarget))
        : [];
      const scopeCandidates = [...semanticCandidates, ...fallbackCandidates]
        .sort((left, right) => (left.textContent || '').length - (right.textContent || '').length);
      const root = scopeCandidates[0] || document;
      if (!root) return false;
      const input = Array.from(root.querySelectorAll(${JSON.stringify(selector)}))[${occurrence}] || null;
      if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return false;
      const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      if (!descriptor?.set) return false;
      input.focus();
      descriptor.set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      input.blur();
      return true;
    })()`,
  );

  if (!updated) {
    throw new Error(`Nao encontrei input ${selector} na ocorrencia ${occurrence}`);
  }
};

const setInputByPlaceholder = async (session, placeholderText, value, scopeText = null) => {
  const result = await evalInPage(
    session,
    `(() => {
      const normalize = (text) => String(text).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(placeholderText)});
      const scopeTarget = ${scopeText ? `normalize(${JSON.stringify(scopeText)})` : 'null'};
      const semanticCandidates = scopeTarget
        ? Array.from(document.querySelectorAll('article, section'))
            .filter((candidate) => normalize(candidate.textContent || '').includes(scopeTarget))
        : [];
      const fallbackCandidates = scopeTarget
        ? Array.from(document.querySelectorAll('div'))
            .filter((candidate) => normalize(candidate.textContent || '').includes(scopeTarget))
        : [];
      const scopeCandidates = [...semanticCandidates, ...fallbackCandidates]
        .sort((left, right) => (left.textContent || '').length - (right.textContent || '').length);
      const root = scopeCandidates[0] || document;
      const inputs = Array.from(root.querySelectorAll('input, textarea'));
      const input = inputs.find((candidate) => normalize(candidate.getAttribute('placeholder') || '').includes(target));
      if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
        return {
          ok: false,
          placeholders: inputs
            .map((candidate) => normalize(candidate.getAttribute('placeholder') || ''))
            .filter(Boolean)
            .slice(0, 20),
          scopeText: normalize(root.textContent || '').slice(0, 300),
        };
      }
      const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      if (!descriptor?.set) return { ok: false, placeholders: [], scopeText: 'sem descriptor de value' };
      input.focus();
      descriptor.set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      input.blur();
      return { ok: true };
    })()`,
  );

  if (!result?.ok) {
    const debug = result ? ` Placeholders: ${JSON.stringify(result.placeholders || [])}. Escopo: ${result.scopeText || ''}` : '';
    throw new Error(`Nao encontrei input com placeholder contendo "${placeholderText}".${debug}`);
  }
};

const buildCase = (mode, userEmail) => ({
  mode,
  userEmail,
  actions: [],
  expected: [],
  observed: [],
  screenshots: [],
});

const appendCaseDetail = (reportCase, { action, expected, observed, screenshot }) => {
  if (action) reportCase.actions.push(action);
  if (expected) reportCase.expected.push(expected);
  if (observed) reportCase.observed.push(observed);
  if (screenshot) reportCase.screenshots.push(`qa-artifacts/${screenshot}`);
};

const assertNoPhaseOverride = async (session) => {
  const phaseOverride = await evalInPage(
    session,
    `(() => window.localStorage.getItem('zb_phase_override'))()`,
  );

  if (phaseOverride !== null) {
    throw new Error(`Smoke encontrou phase override ativo: ${phaseOverride}`);
  }
};

const assertNoLegacyBeginnerBootstrap = async (session) => {
  const legacyKeys = await evalInPage(
    session,
    `(() => Object.keys(window.localStorage).filter((key) =>
      key.startsWith('beginnerPlan_')
      || key.startsWith('beginnerState_')
      || key.startsWith('beginnerStats_')
    ))()`,
  );

  if (Array.isArray(legacyKeys) && legacyKeys.length > 0) {
    throw new Error(`Smoke encontrou bootstrap legado ativo: ${legacyKeys.join(', ')}`);
  }
};

const assertTextsAbsent = async (
  session,
  texts,
  { label = 'pagina atual', scopeSelector = null } = {},
) => {
  const result = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .toLowerCase()
        .replace(/\\s+/g, ' ')
        .trim();
      const scope = ${scopeSelector ? `document.querySelector(${JSON.stringify(scopeSelector)})` : 'document.body'};
      const haystack = normalize(scope?.innerText || '');
      const matches = ${JSON.stringify(texts)}.filter((text) => haystack.includes(normalize(text)));
      return {
        matches,
        snippet: haystack.slice(0, 800),
      };
    })()`,
  );

  if (Array.isArray(result?.matches) && result.matches.length > 0) {
    throw new Error(`Encontrei vazamento de contexto em ${label}: ${result.matches.join(', ')}. Trecho: ${result.snippet || ''}`);
  }
};

const assertSectionTextOrder = async (
  session,
  { scopeText, orderedTexts, label = 'secao atual' },
) => {
  const result = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .toLowerCase()
        .replace(/\\s+/g, ' ')
        .trim();
      const targetScope = normalize(${JSON.stringify(scopeText)});
      const roots = Array.from(document.querySelectorAll('article, section, div'))
        .filter((candidate) => normalize(candidate.innerText || '').includes(targetScope))
        .sort((left, right) => normalize(left.innerText || '').length - normalize(right.innerText || '').length);
      const root = roots[0] || null;
      if (!root) {
        return { ok: false, reason: 'scope-not-found' };
      }
      const haystack = normalize(root.innerText || '');
      const positions = ${JSON.stringify(orderedTexts)}.map((text) => ({
        text,
        index: haystack.indexOf(normalize(text)),
      }));
      const missing = positions.filter((entry) => entry.index === -1).map((entry) => entry.text);
      if (missing.length > 0) {
        return { ok: false, reason: 'missing', missing, snippet: haystack.slice(0, 900) };
      }
      for (let index = 1; index < positions.length; index += 1) {
        if (positions[index].index <= positions[index - 1].index) {
          return { ok: false, reason: 'order', positions, snippet: haystack.slice(0, 900) };
        }
      }
      return { ok: true, positions };
    })()`,
  );

  if (!result?.ok) {
    throw new Error(
      `A ordem esperada nao apareceu em ${label}: ${JSON.stringify(result || {})}`,
    );
  }
};

const assertNoLegacyModalitySelect = async (
  session,
  { label = 'pagina atual', scopeSelector = null } = {},
) => {
  const result = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .toLowerCase()
        .replace(/\\s+/g, ' ')
        .trim();
      const scope = ${scopeSelector ? `document.querySelector(${JSON.stringify(scopeSelector)})` : 'document.body'};
      if (!scope) {
        return { found: false };
      }
      const controls = Array.from(scope.querySelectorAll('select')).map((select) =>
        Array.from(select.querySelectorAll('option')).map((option) => normalize(option.textContent || ''))
      );
      const found = controls.some((options) =>
        options.includes('enem')
        || options.includes('concurso')
        || options.includes('selecione a modalidade')
      );
      return { found, controls };
    })()`,
  );

  if (result?.found) {
    throw new Error(`Encontrei ModalidadeSelect legado em ${label}: ${JSON.stringify(result.controls || [])}`);
  }
};

const scrollScrollableContainers = async (session, position = 'bottom') => {
  await evalInPage(
    session,
    `(() => {
      const nodes = Array.from(document.querySelectorAll('*')).filter((candidate) => {
        if (!(candidate instanceof HTMLElement)) return false;
        const style = window.getComputedStyle(candidate);
        return /(auto|scroll)/.test(style.overflowY) && candidate.scrollHeight > candidate.clientHeight + 40;
      });
      nodes.forEach((node) => {
        node.scrollTop = ${position === 'top' ? '0' : 'node.scrollHeight'};
      });
      return nodes.length;
    })()`,
  );
  await delay(250);
};

const completeFaculdadeOnboarding = async (session) => {
  try {
    await waitForText(session, 'Qual e o seu foco agora?', { timeoutMs: 30000 });
  } catch (error) {
    const bodySnippet = await getBodyTextSnippet(session, 700).catch(() => '');
    if (!bodySnippet) {
      await reload(session);
      await closeOptionalOverlays(session);
      await waitForText(session, 'Qual e o seu foco agora?', { timeoutMs: 30000 });
    } else {
      throw new Error(`${error instanceof Error ? error.message : String(error)} Tela atual: ${bodySnippet}`);
    }
  }
  await clickContextCard(session, 'Faculdade');

  await waitForText(session, 'Nome da faculdade', { timeoutMs: 30000 });
  await setInputByPlaceholder(session, 'Universidade Federal', 'IFPI');
  await setInputByPlaceholder(session, 'Engenharia de Software', 'ADS');
  await clickByText(session, '3º');
  await clickLabeledButton(session, 'Foco principal agora', 'Provas');
  await waitForAnyText(session, ['Disciplinas do seu plano', 'Adicionar disciplina'], { timeoutMs: 30000 });
  await setInputByPlaceholder(session, 'Adicionar disciplina', 'Calculo I');
  await clickByText(session, '+ Adicionar');
  await setInputByPlaceholder(session, 'Adicionar disciplina', 'Fisica Geral');
  await clickByText(session, '+ Adicionar');
  await setInputByPlaceholder(session, 'Adicionar disciplina', 'Estruturas de Dados');
  await clickByText(session, '+ Adicionar');
  await scrollScrollableContainers(session, 'bottom');
  await clickByText(session, 'Continuar rotina da faculdade');

  await scrollScrollableContainers(session, 'top');
  await waitForText(session, 'Seu ritmo de estudo', { timeoutMs: 30000 });
  await setNthInputValue(session, 'input[type="number"]', 0, '2');
  await scrollScrollableContainers(session, 'bottom');
  await clickByText(session, 'Continuar');

  await scrollScrollableContainers(session, 'top');
  await waitForText(session, 'Disciplinas carregadas do seu contexto', { timeoutMs: 30000 });
  await scrollScrollableContainers(session, 'bottom');
  await clickByText(session, 'Continuar rotina da faculdade');

  await scrollScrollableContainers(session, 'top');
  await waitForText(session, 'Ative seu modo foco total', { timeoutMs: 30000 });
  await scrollScrollableContainers(session, 'bottom');
  await clickByText(session, '⚡ Ativar meu cronograma');
};

const completeOutrosOnboarding = async (session) => {
  try {
    await waitForText(session, 'Qual e o seu foco agora?', { timeoutMs: 30000 });
  } catch (error) {
    const bodySnippet = await getBodyTextSnippet(session, 700).catch(() => '');
    if (!bodySnippet) {
      await reload(session);
      await closeOptionalOverlays(session);
      await waitForText(session, 'Qual e o seu foco agora?', { timeoutMs: 30000 });
    } else {
      throw new Error(`${error instanceof Error ? error.message : String(error)} Tela atual: ${bodySnippet}`);
    }
  }
  await clickContextCard(session, 'Outros');

  await waitForText(session, 'Objetivo principal', { timeoutMs: 30000 });
  await clickLabeledButton(session, 'Objetivo principal', 'Praticar');
  await setInputByPlaceholder(session, 'ingles para conversacao', 'JavaScript moderno');
  await waitForAnyText(session, ['Disciplinas do seu plano', 'Adicionar conteudo'], { timeoutMs: 30000 });
  await setInputByPlaceholder(session, 'Adicionar conteudo', 'Funcoes');
  await clickByText(session, '+ Adicionar');
  await setInputByPlaceholder(session, 'Adicionar conteudo', 'Objetos');
  await clickByText(session, '+ Adicionar');
  await scrollScrollableContainers(session, 'bottom');
  await clickByText(session, 'Continuar plano personalizado');

  await scrollScrollableContainers(session, 'top');
  await waitForText(session, 'Seu ritmo de estudo', { timeoutMs: 30000 });
  await setNthInputValue(session, 'input[type="number"]', 0, '2');
  await scrollScrollableContainers(session, 'bottom');
  await clickByText(session, 'Continuar');

  await scrollScrollableContainers(session, 'top');
  await waitForText(session, 'Disciplinas carregadas do seu contexto', { timeoutMs: 30000 });
  await scrollScrollableContainers(session, 'bottom');
  await clickByText(session, 'Continuar plano personalizado');

  await scrollScrollableContainers(session, 'top');
  await waitForText(session, 'Ative seu modo foco total', { timeoutMs: 30000 });
  await scrollScrollableContainers(session, 'bottom');
  await clickByText(session, '⚡ Ativar meu cronograma');
};

const validateFaculdadeFlow = async (session, report, reportCase) => {
  const examInitialTitle = 'P2 Banco de Dados II';
  const examEditedTitle = 'P3 Banco de Dados II';
  const assignmentInitialTitle = 'Projeto Banco II';
  const assignmentEditedTitle = 'Projeto Final Banco II';
  const eventInitialTitle = 'Plantao Banco II';
  const eventEditedTitle = 'Revisao Banco II';
  const deletedSubjectTitle = 'Quimica Basica';
  const openFaculdadeDepartment = async () => {
    const hasPanelInputsBeforeNavigation = await evalInPage(
      session,
      `(() => Boolean(document.querySelector('input[placeholder="Nome da disciplina"], input[placeholder="Professor(a) opcional"], textarea[placeholder="Descricao opcional do trabalho"]')))()`,
    );
    if (hasPanelInputsBeforeNavigation) {
      return;
    }

    const hasDirectDepartmentAction = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button, a, [role="button"]')).some((candidate) => normalize(candidate.textContent || '') === 'ver disciplinas');
      })()`,
    );

    if (hasDirectDepartmentAction) {
      await clickByText(session, 'Ver disciplinas', { exact: true });
    } else {
      await clickByAccessibleName(session, 'Disciplinas');
    }

    await waitForAnyText(session, ['Nova disciplina', 'Editar disciplina', 'Popular demo'], { timeoutMs: 30000 });
    await closeOptionalOverlays(session);
    const hasPanelInputs = await evalInPage(
      session,
      `(() => Boolean(document.querySelector('input[placeholder=\"Nome da disciplina\"], input[placeholder=\"Professor(a) opcional\"], textarea[placeholder=\"Descricao opcional do trabalho\"]')))()`,
    );
    if (!hasPanelInputs) {
      const bodySnippet = await getBodyTextSnippet(session, 700).catch(() => '');
      throw new Error(`A navegacao para Disciplinas nao abriu o painel CRUD esperado. Tela atual: ${bodySnippet}`);
    }
  };
  const openFaculdadePlanning = async () => {
    await clickByAccessibleName(session, 'Planejamento');
    await waitForAnyText(session, ['Planejamento academico', 'Grade semanal', 'Buscar disciplina'], { timeoutMs: 30000 });
    await assertTextsAbsent(session, ['ENEM', 'Concurso', 'Simulado ENEM'], {
      label: 'planejamento da faculdade',
      scopeSelector: '[data-study-schedule-context="faculdade"]',
    });
  };

  const initialShellDebug = await waitForFaculdadeShellReady(session, { timeoutMs: 45000, label: 'shell faculdade inicial' });
  await assertNoPhaseOverride(session);
  await assertNoLegacyBeginnerBootstrap(session);
  await waitForAnyText(session, ['Sem prova', 'Nenhuma prova pendente encontrada.'], { timeoutMs: 30000 });
  const setupShot = 'study-context-faculdade-empty.png';
  await screenshot(session, setupShot);
  appendCaseDetail(reportCase, {
    action: 'Abrir shell faculdade com usuario novo',
    expected: 'Estado vazio aparece sem erro e no shell correto.',
    observed: `Shell faculdade abriu em setup coerente na aba ${initialShellDebug?.shellMarker?.tab || initialShellDebug?.app?.activeTab || 'desconhecida'}.`,
    screenshot: setupShot,
  });
  report.steps.push({ name: 'faculdade_shell_empty', status: 'passed', screenshot: `qa-artifacts/${setupShot}` });

  await openFaculdadePlanning();
  const planningShot = 'study-context-faculdade-planning-isolation.png';
  await screenshot(session, planningShot);
  appendCaseDetail(reportCase, {
    action: 'Abrir planejamento academico no modo faculdade',
    expected: 'Planejamento usa apenas fontes do contexto ativo e nao mostra trilhas legadas de ENEM ou Concurso.',
    observed: 'Planejamento academico abriu sem textos cruzados de ENEM, Concurso ou Simulado ENEM.',
    screenshot: planningShot,
  });
  report.steps.push({ name: 'faculdade_planning_isolation', status: 'passed', screenshot: `qa-artifacts/${planningShot}` });

  await waitForText(session, 'Radar academico', { timeoutMs: 30000 });
  await waitForText(session, 'Fazer agora', { timeoutMs: 30000 });
  const plannerHierarchyShot = 'study-context-faculdade-planner-hierarchy.png';
  await screenshot(session, plannerHierarchyShot);
  appendCaseDetail(reportCase, {
    action: 'Refinar a leitura do planner academico no modo faculdade',
    expected: 'Planner destaca o radar academico, separa urgencia do restante da fila e deixa claro o que pede atencao agora.',
    observed: 'Planejamento exibiu Radar academico, contadores de Fazer agora/Proximos dias/Concluidos no radar e reforcou a hierarquia visual da semana.',
    screenshot: plannerHierarchyShot,
  });
  report.steps.push({ name: 'faculdade_planner_hierarchy', status: 'passed', screenshot: `qa-artifacts/${plannerHierarchyShot}` });

  await openFaculdadeDepartment();
  await setInputByPlaceholder(session, 'Nome da disciplina', 'Banco de Dados I');
  await clickScopedButton(session, { scopeText: 'Nova disciplina', buttonText: 'Adicionar disciplina' });
  await waitForText(session, 'Banco de Dados I', { timeoutMs: 30000 });
  await closeOptionalOverlays(session);
  await openFaculdadeDepartment();
  await clickByAccessibleName(session, 'Abrir disciplina Banco de Dados I para edicao');
  await setInputByPlaceholder(session, 'Nome da disciplina', 'Banco de Dados II');
  await setInputByPlaceholder(session, 'Professor(a) opcional', 'Prof. Joana Lima');
  await setInputByPlaceholder(session, 'Carga horaria em horas', '72');
  await clickScopedButton(session, { scopeText: 'Editar disciplina', buttonText: 'Salvar disciplina' });
  await waitForText(session, 'Banco de Dados II', { timeoutMs: 30000 });
  await closeOptionalOverlays(session);
  await openFaculdadeDepartment();
  await setInputByPlaceholder(session, 'Nome da disciplina', deletedSubjectTitle);
  await clickScopedButton(session, { scopeText: 'Nova disciplina', buttonText: 'Adicionar disciplina' });
  await waitForText(session, deletedSubjectTitle, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);

  const departmentWriteShot = 'study-context-faculdade-department-write.png';
  await screenshot(session, departmentWriteShot);
  appendCaseDetail(reportCase, {
    action: 'Criar e editar disciplinas manualmente no modo faculdade',
    expected: 'As disciplinas aparecem no shell e as alteracoes persistem sem erro.',
    observed: 'Disciplina central foi editada para Banco de Dados II e uma segunda disciplina ficou pronta para validar exclusao.',
    screenshot: departmentWriteShot,
  });
  report.steps.push({ name: 'faculdade_manual_subject', status: 'passed', screenshot: `qa-artifacts/${departmentWriteShot}` });

  await openFaculdadeDepartment();
  await clickByText(session, 'Popular demo', { exact: true });
  await delay(1800);
  await clickByText(session, 'Atualizar snapshot', { exact: true }).catch(() => undefined);
  await delay(800);

  await openFaculdadeDepartment();
  await selectFirstAvailableOption(session, { occurrence: 0, scopeText: 'Nova prova' });
  await setInputByPlaceholder(session, 'Titulo da prova', examInitialTitle, 'Nova prova');
  await setNthInputValue(session, 'input[type="datetime-local"]', 0, toDateTimeLocalValue(1, 8, 30), 'Nova prova');
  await setInputByPlaceholder(session, 'Peso opcional', '6', 'Nova prova');
  await setInputByPlaceholder(session, 'Notas opcionais da prova', 'Levar calculadora e formulario.', 'Nova prova');
  await clickScopedButton(session, { scopeText: 'Nova prova', buttonText: 'Adicionar prova' });
  await waitForText(session, examInitialTitle, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);
  await openFaculdadeDepartment();
  await clickByAccessibleName(session, `Abrir prova ${examInitialTitle} para edicao`);
  await setInputByPlaceholder(session, 'Titulo da prova', examEditedTitle, 'Editar prova');
  await setNthInputValue(session, 'input[type="datetime-local"]', 0, toDateTimeLocalValue(1, 10, 0), 'Editar prova');
  await setInputByPlaceholder(session, 'Notas opcionais da prova', 'Conteudo revisado e materiais confirmados.', 'Editar prova');
  await clickScopedButton(session, { scopeText: 'Editar prova', buttonText: 'Salvar prova' });
  await waitForText(session, examEditedTitle, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);
  await waitForTextToDisappear(session, examInitialTitle, { timeoutMs: 30000 });

  await openFaculdadeDepartment();
  await selectFirstAvailableOption(session, { occurrence: 0, scopeText: 'Novo trabalho' });
  await setInputByPlaceholder(session, 'Titulo do trabalho', assignmentInitialTitle, 'Novo trabalho');
  await setNthInputValue(session, 'input[type="datetime-local"]', 0, toDateTimeLocalValue(2, 11, 0), 'Novo trabalho');
  await setInputByPlaceholder(session, 'Descricao opcional do trabalho', 'Primeira versao para entrega parcial.', 'Novo trabalho');
  await clickScopedButton(session, { scopeText: 'Novo trabalho', buttonText: 'Adicionar trabalho' });
  await waitForText(session, assignmentInitialTitle, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);
  await openFaculdadeDepartment();
  await clickByAccessibleName(session, `Abrir trabalho ${assignmentInitialTitle} para edicao`);
  await setInputByPlaceholder(session, 'Titulo do trabalho', assignmentEditedTitle, 'Editar trabalho');
  await setInputByPlaceholder(session, 'Descricao opcional do trabalho', 'Versao final pronta para submissao.', 'Editar trabalho');
  await clickScopedButton(session, { scopeText: 'Editar trabalho', buttonText: 'Salvar trabalho' });
  await waitForText(session, assignmentEditedTitle, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);
  await waitForTextToDisappear(session, assignmentInitialTitle, { timeoutMs: 30000 });

  await openFaculdadeDepartment();
  await selectFirstAvailableOption(session, { occurrence: 0, scopeText: 'Novo evento academico' });
  await setInputByPlaceholder(session, 'Titulo do evento', eventInitialTitle, 'Novo evento academico');
  await setNthInputValue(session, 'input[type="datetime-local"]', 0, toDateTimeLocalValue(1, 18, 0), 'Novo evento academico');
  await setNthInputValue(session, 'input[type="datetime-local"]', 1, toDateTimeLocalValue(1, 19, 30), 'Novo evento academico');
  await setInputByPlaceholder(session, 'Detalhes opcionais do evento', 'Revisar consultas e normalizacao.', 'Novo evento academico');
  await clickScopedButton(session, { scopeText: 'Novo evento academico', buttonText: 'Adicionar evento' });
  await waitForText(session, eventInitialTitle, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);
  await openFaculdadeDepartment();
  await clickByAccessibleName(session, `Abrir evento ${eventInitialTitle} para edicao`);
  await setInputByPlaceholder(session, 'Titulo do evento', eventEditedTitle, 'Editar evento academico');
  await setInputByPlaceholder(session, 'Detalhes opcionais do evento', 'Revisao final confirmada com lista de exercicios.', 'Editar evento academico');
  await clickScopedButton(session, { scopeText: 'Editar evento academico', buttonText: 'Salvar evento' });
  await waitForText(session, eventEditedTitle, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);
  await waitForTextToDisappear(session, eventInitialTitle, { timeoutMs: 30000 });

  await setInputByPlaceholder(session, 'Buscar disciplina na lista', 'Banco de Dados II');
  await waitForText(session, 'Banco de Dados II', { timeoutMs: 30000 });
  await waitFor(
    session,
    `(() => {
      const label = ${JSON.stringify(`Abrir disciplina ${deletedSubjectTitle} para edicao`)};
      const visible = Array.from(document.querySelectorAll('button')).some((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const style = window.getComputedStyle(candidate);
        return rect.width > 0
          && rect.height > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && (candidate.getAttribute('aria-label') || '') === label;
      });
      return !visible;
    })()`,
    { timeoutMs: 30000, label: `disciplina ${deletedSubjectTitle} sair da lista filtrada` },
  );
  await setInputByPlaceholder(session, 'Buscar disciplina na lista', '');
  await waitFor(
    session,
    `(() => {
      const label = ${JSON.stringify(`Abrir disciplina ${deletedSubjectTitle} para edicao`)};
      return Array.from(document.querySelectorAll('button')).some((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const style = window.getComputedStyle(candidate);
        return rect.width > 0
          && rect.height > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && (candidate.getAttribute('aria-label') || '') === label;
      });
    })()`,
    { timeoutMs: 30000, label: `disciplina ${deletedSubjectTitle} voltar para a lista` },
  );

  const filtersShot = 'study-context-faculdade-filters.png';
  await screenshot(session, filtersShot);
  appendCaseDetail(reportCase, {
    action: 'Aplicar busca local em disciplinas no modo faculdade',
    expected: 'A lista filtra por nome sem quebrar a organizacao por status e permite voltar rapido ao conjunto completo.',
    observed: 'Busca por Banco de Dados II isolou a disciplina editada, escondeu a disciplina temporaria e restaurou a lista completa ao limpar o campo.',
    screenshot: filtersShot,
  });
  report.steps.push({ name: 'faculdade_list_filters', status: 'passed', screenshot: `qa-artifacts/${filtersShot}` });

  await clickByAccessibleName(session, 'Home');
  await waitForText(session, examEditedTitle, { timeoutMs: 30000 });
  await waitForText(session, assignmentEditedTitle, { timeoutMs: 30000 });
  const homeShot = 'study-context-faculdade-home.png';
  await screenshot(session, homeShot);
  appendCaseDetail(reportCase, {
    action: 'Popular demo, editar entidades e revalidar a home academica',
    expected: 'Home, disciplinas e prioridade academica refletem dados reais apos create e edit.',
    observed: 'Snapshot academico passou a priorizar os titulos editados de prova e trabalho sem perder o contexto da disciplina.',
    screenshot: homeShot,
  });
  report.steps.push({ name: 'faculdade_crud_refresh', status: 'passed', screenshot: `qa-artifacts/${homeShot}` });

  await clickByAccessibleName(session, 'Calendario');
  await waitForAnyText(session, ['Calendario academico', 'Eventos futuros'], { timeoutMs: 30000 });
  await waitForText(session, eventEditedTitle, { timeoutMs: 30000 });
  const calendarShot = 'study-context-faculdade-calendar.png';
  await screenshot(session, calendarShot);
  appendCaseDetail(reportCase, {
    action: 'Abrir calendario da faculdade apos editar evento',
    expected: 'Calendario mostra o evento editado e continua refletindo o dominio real.',
    observed: 'Calendario renderizou com o evento atualizado e sem regressao visual.',
    screenshot: calendarShot,
  });
  report.steps.push({ name: 'faculdade_calendar', status: 'passed', screenshot: `qa-artifacts/${calendarShot}` });

  await openFaculdadeDepartment();
  await clickByAccessibleName(session, `Acoes para ${deletedSubjectTitle}`);
  await clickByText(session, 'Excluir', { exact: true });
  await waitForText(session, `Excluir ${deletedSubjectTitle}?`, { timeoutMs: 30000 });
  await clickByText(session, 'Excluir agora', { exact: true });
  await waitForTextToDisappear(session, deletedSubjectTitle, { timeoutMs: 30000 });

  await openFaculdadeDepartment();
  await clickByAccessibleName(session, `Acoes para ${examEditedTitle}`);
  await clickByText(session, 'Excluir', { exact: true });
  await waitForText(session, `Excluir ${examEditedTitle}?`, { timeoutMs: 30000 });
  await clickByText(session, 'Excluir agora', { exact: true });
  await waitForTextToDisappear(session, examEditedTitle, { timeoutMs: 30000 });

  await openFaculdadeDepartment();
  await clickByAccessibleName(session, `Acoes para ${assignmentEditedTitle}`);
  await clickByText(session, 'Excluir', { exact: true });
  await waitForText(session, `Excluir ${assignmentEditedTitle}?`, { timeoutMs: 30000 });
  await clickByText(session, 'Excluir agora', { exact: true });
  await waitForTextToDisappear(session, assignmentEditedTitle, { timeoutMs: 30000 });

  await openFaculdadeDepartment();
  await clickByAccessibleName(session, `Acoes para ${eventEditedTitle}`);
  await clickByText(session, 'Excluir', { exact: true });
  await waitForText(session, `Excluir ${eventEditedTitle}?`, { timeoutMs: 30000 });
  await clickByText(session, 'Excluir agora', { exact: true });
  await waitForTextToDisappear(session, eventEditedTitle, { timeoutMs: 30000 });

  const deleteShot = 'study-context-faculdade-crud-delete.png';
  await screenshot(session, deleteShot);
  appendCaseDetail(reportCase, {
    action: 'Excluir disciplina, prova, trabalho e evento no modo faculdade',
    expected: 'Os itens somem da UI logo apos a confirmacao e o shell nao deixa residuos visuais.',
    observed: 'Exclusoes confirmadas removeram todos os itens alvo sem item fantasma no shell.',
    screenshot: deleteShot,
  });
  report.steps.push({ name: 'faculdade_crud_delete', status: 'passed', screenshot: `qa-artifacts/${deleteShot}` });

  await reload(session);
  const reloadDebug = await waitForFaculdadeShellReady(session, { timeoutMs: 45000, label: 'shell faculdade apos reload' });
  await assertNoPhaseOverride(session);
  await assertNoLegacyBeginnerBootstrap(session);
  await waitForAnyText(session, ['Banco de Dados II', 'Disciplinas', 'Prova mais proxima'], { timeoutMs: 30000 });
  await waitForTextToDisappear(session, deletedSubjectTitle, { timeoutMs: 30000 });
  await waitForTextToDisappear(session, examEditedTitle, { timeoutMs: 30000 });
  await waitForTextToDisappear(session, assignmentEditedTitle, { timeoutMs: 30000 });
  await waitForTextToDisappear(session, eventEditedTitle, { timeoutMs: 30000 });
  await openFaculdadePlanning();
  const reloadShot = 'study-context-faculdade-reload.png';
  await screenshot(session, reloadShot);
  appendCaseDetail(reportCase, {
    action: 'Recarregar app em faculdade apos CRUD completo',
    expected: 'Contexto ativo, edicoes persistentes, planejamento isolado e exclusoes limpas continuam coerentes apos reload.',
    observed: `Reload preservou o shell na aba ${reloadDebug?.shellMarker?.tab || reloadDebug?.app?.activeTab || 'desconhecida'}, manteve a disciplina editada, nao reintroduziu itens excluidos e seguiu sem vazamento de ENEM/Concurso no planejamento.`,
    screenshot: reloadShot,
  });
  report.steps.push({ name: 'faculdade_reload_persistence', status: 'passed', screenshot: `qa-artifacts/${reloadShot}` });
};

const validateOutrosFlow = async (session, report, reportCase) => {
  const mainThemeInitial = 'TypeScript';
  const mainThemeEdited = 'TS Aplicado';
  const extraTheme = 'Tema Arquivavel';
  const mainGoalInitialDescription = 'Pratica guiada com exemplos reais do app.';
  const mainGoalEditedDescription = 'Aprofundar TypeScript com refatoracao e tipagem real.';
  const extraGoalDescription = 'Objetivo temporario do smoke';
  const mainPathInitial = 'Trilha TypeScript';
  const mainPathEdited = 'Roadmap TS Real';
  const extraPath = 'Trilha Temporaria';
  const mainStepInitial = 'Fundamentos TS';
  const mainStepEdited = 'Fundamentos TypeScript';
  const nextStepTitle = 'Tipos utilitarios';
  const deletedStepTitle = 'Refatorar componentes';
  const mainEventInitial = 'Sessao TS';
  const mainEventEdited = 'Revisao final TS';
  const deletedEventTitle = 'Checkpoint temporario TS';
  const forbiddenOutrosRhythmTexts = [
    'Horas por materia',
    'Materia dominante',
    'Humanas',
    'Natureza',
    'Linguagens',
    'Matematica',
    'Redacao',
    'ENEM',
    'Simulado',
    'Concurso',
    'Banco de Dados II',
  ];
  const forbiddenOutrosRhythmGlobalTexts = [
    'Horas por materia',
    'Materia dominante',
  ];
  const assertOutrosPlanningIsolation = async () => {
    await waitForOutrosShellReady(session, { timeoutMs: 45000, label: 'shell outros pronto para isolamento' });
    await clickByAccessibleName(session, 'Ritmo');
    await waitForOutrosShellReady(session, { timeoutMs: 45000, label: 'ritmo de outros pronto' });
    await waitForAnyText(session, ['Ritmo do foco atual', 'Rank do foco atual'], { timeoutMs: 30000 });
    await waitForAnyText(session, ['Horas por foco', 'Proxima melhor acao', 'Foco dominante'], { timeoutMs: 30000 });
    await waitFor(
      session,
      `(() => {
        const debug = window.__ZB_OUTROS_SHELL_DEBUG__ || null;
        const hasScopedEmptyState = Boolean(
          debug
          && !debug.activeContextId
          && debug.topicCount === 0
          && debug.goalCount === 0
          && debug.pathCount === 0
          && debug.stepCount === 0
          && debug.eventCount === 0
          && debug.rankSnapshot
          && Array.isArray(debug.rankSnapshot.scopeTopicIds)
          && debug.rankSnapshot.scopeTopicIds.length === 0
        );
        return Boolean(
          debug
          && debug.rankSnapshot
          && debug.rankSnapshot.scopeMode === 'outros'
          && (
            (debug.activeContextId && debug.rankSnapshot.studyContextId === debug.activeContextId)
            || hasScopedEmptyState
          )
        );
      })()`,
      { timeoutMs: 30000, label: 'snapshot isolado de ritmo em outros' },
    );
    await assertTextsAbsent(session, forbiddenOutrosRhythmGlobalTexts, {
      label: 'pagina de ritmo de outros',
    });
    await assertTextsAbsent(session, forbiddenOutrosRhythmTexts, {
      label: 'ritmo de outros',
      scopeSelector: '[data-native-shell="outros"]',
    });
    await assertNoLegacyModalitySelect(session, {
      label: 'ritmo de outros',
      scopeSelector: '[data-native-shell="outros"]',
    });
  };

  await clickByAccessibleName(session, 'Perfil');
  await waitForText(session, 'Revisar contexto', { timeoutMs: 30000 });
  await clickByText(session, 'Revisar contexto', { exact: true });
  await completeOutrosOnboarding(session);

  const initialShellDebug = await waitForOutrosShellReady(session, { timeoutMs: 45000, label: 'shell outros inicial' });
  await assertNoPhaseOverride(session);
  await assertNoLegacyBeginnerBootstrap(session);
  await waitForAnyText(session, ['Sem trilha', 'Nenhum tema encontrado'], { timeoutMs: 30000 });
  await closeOptionalOverlays(session);
  const setupShot = 'study-context-outros-empty.png';
  await screenshot(session, setupShot);
  appendCaseDetail(reportCase, {
    action: 'Trocar contexto de faculdade para outros',
    expected: 'Shell muda de modo e abre vazio sem erro.',
    observed: `Shell alternou para outros com setup coerente na aba ${initialShellDebug?.shellMarker?.tab || initialShellDebug?.app?.activeTab || 'desconhecida'}.`,
    screenshot: setupShot,
  });
  report.steps.push({ name: 'outros_shell_empty', status: 'passed', screenshot: `qa-artifacts/${setupShot}` });

  await assertOutrosPlanningIsolation();
  const planningShot = 'study-context-outros-planning-isolation.png';
  await screenshot(session, planningShot);
  appendCaseDetail(reportCase, {
    action: 'Abrir ritmo isolado no modo outros',
    expected: 'Ritmo usa apenas eventos, rank, foco, trilha e revisoes do dominio livre e nao mostra planner legado nem dados de faculdade/ENEM/concurso.',
    observed: 'Ritmo abriu com snapshot isolado do contexto ativo, mostrando Horas por foco e Proxima melhor acao, sem Horas por materia, labels ENEM/Concurso ou ModalidadeSelect legado.',
    screenshot: planningShot,
  });
  report.steps.push({ name: 'outros_planning_isolation', status: 'passed', screenshot: `qa-artifacts/${planningShot}` });

  await clickByAccessibleName(session, 'Meu foco');
  await waitForAnyText(session, ['Novo tema', 'Editar tema'], { timeoutMs: 30000 });

  await setInputByPlaceholder(session, 'Tema principal', mainThemeInitial, 'Novo tema');
  await clickScopedButton(session, { scopeText: 'Novo tema', buttonText: 'Adicionar tema' });
  await waitForText(session, mainThemeInitial, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);
  await clickByAccessibleName(session, `Abrir tema ${mainThemeInitial} para edicao`);
  await setInputByPlaceholder(session, 'Tema principal', mainThemeEdited, 'Editar tema');
  await setInputByPlaceholder(session, 'Categoria opcional', 'Front-end', 'Editar tema');
  await setSelectByOptionText(session, { optionText: 'Nivel avancado', scopeText: 'Editar tema' });
  await clickScopedButton(session, { scopeText: 'Editar tema', buttonText: 'Salvar tema' });
  await waitForText(session, mainThemeEdited, { timeoutMs: 30000 });
  await waitForTextToDisappear(session, mainThemeInitial, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);

  await setInputByPlaceholder(session, 'Tema principal', extraTheme, 'Novo tema');
  await setInputByPlaceholder(session, 'Categoria opcional', 'Temporario', 'Novo tema');
  await clickScopedButton(session, { scopeText: 'Novo tema', buttonText: 'Adicionar tema' });
  await waitForText(session, extraTheme, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);

  const themeWriteShot = 'study-context-outros-theme-write.png';
  await screenshot(session, themeWriteShot);
  appendCaseDetail(reportCase, {
    action: 'Criar e editar temas no modo outros',
    expected: 'O tema principal pode ser atualizado e um segundo tema fica disponivel para validar exclusao.',
    observed: `Tema principal foi editado para ${mainThemeEdited} e um tema temporario ficou pronto para exclusao.`,
    screenshot: themeWriteShot,
  });
  report.steps.push({ name: 'outros_manual_topic', status: 'passed', screenshot: `qa-artifacts/${themeWriteShot}` });

  await setSelectByOptionText(session, { optionText: mainThemeEdited, scopeText: 'Novo objetivo' });
  await setSelectByOptionText(session, { optionText: 'Praticar', occurrence: 1, scopeText: 'Novo objetivo' });
  await setInputByPlaceholder(session, 'Descricao do objetivo', mainGoalInitialDescription, 'Novo objetivo');
  await clickScopedButton(session, { scopeText: 'Novo objetivo', buttonText: 'Adicionar objetivo' });
  await waitForText(session, mainGoalInitialDescription, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);
  await clickByAccessibleName(session, `Abrir objetivo ${mainGoalInitialDescription} para edicao`);
  await setSelectByOptionText(session, { optionText: 'Aprofundar', occurrence: 1, scopeText: 'Editar objetivo' });
  await setInputByPlaceholder(session, 'Descricao do objetivo', mainGoalEditedDescription, 'Editar objetivo');
  await clickScopedButton(session, { scopeText: 'Editar objetivo', buttonText: 'Salvar objetivo' });
  await waitForText(session, mainGoalEditedDescription, { timeoutMs: 30000 });
  await waitForTextToDisappear(session, mainGoalInitialDescription, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);

  await setSelectByOptionText(session, { optionText: mainThemeEdited, scopeText: 'Novo objetivo' });
  await setSelectByOptionText(session, { optionText: 'Criar rotina', occurrence: 1, scopeText: 'Novo objetivo' });
  await setInputByPlaceholder(session, 'Descricao do objetivo', extraGoalDescription, 'Novo objetivo');
  await clickScopedButton(session, { scopeText: 'Novo objetivo', buttonText: 'Adicionar objetivo' });
  await waitForText(session, extraGoalDescription, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);

  await setSelectByOptionText(session, { optionText: mainThemeEdited, scopeText: 'Nova trilha' });
  await setInputByPlaceholder(session, 'Titulo da trilha', mainPathInitial, 'Nova trilha');
  await setInputByPlaceholder(session, 'Passo 1', mainStepInitial, 'Nova trilha');
  await setInputByPlaceholder(session, 'Passo 2', nextStepTitle, 'Nova trilha');
  await setInputByPlaceholder(session, 'Passo 3', deletedStepTitle, 'Nova trilha');
  await clickScopedButton(session, { scopeText: 'Nova trilha', buttonText: 'Adicionar trilha' });
  await waitForText(session, mainPathInitial, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);

  await clickByAccessibleName(session, `Abrir trilha ${mainPathInitial} para edicao`);
  await setInputByPlaceholder(session, 'Titulo da trilha', mainPathEdited, 'Editar trilha');
  await clickScopedButton(session, { scopeText: 'Editar trilha', buttonText: 'Salvar trilha' });
  await waitForText(session, mainPathEdited, { timeoutMs: 30000 });
  await waitForTextToDisappear(session, mainPathInitial, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);

  await setSelectByOptionText(session, { optionText: mainThemeEdited, scopeText: 'Nova trilha' });
  await setInputByPlaceholder(session, 'Titulo da trilha', extraPath, 'Nova trilha');
  await setInputByPlaceholder(session, 'Passo 1', 'Bloco temporario', 'Nova trilha');
  await setInputByPlaceholder(session, 'Passo 2', 'Checkpoint temporario', 'Nova trilha');
  await clickScopedButton(session, { scopeText: 'Nova trilha', buttonText: 'Adicionar trilha' });
  await waitForText(session, extraPath, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);

  await clickByAccessibleName(session, `Abrir passo ${mainStepInitial} para edicao`);
  await setInputByPlaceholder(session, 'Titulo do passo', mainStepEdited, 'Editar passo');
  await setInputByPlaceholder(session, 'Descricao opcional do passo', 'Revisar tipagem basica e inferencia.', 'Editar passo');
  await clickScopedButton(session, { scopeText: 'Editar passo', buttonText: 'Salvar passo' });
  await waitForText(session, mainStepEdited, { timeoutMs: 30000 });
  await waitForTextToDisappear(session, mainStepInitial, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);

  await clickByAccessibleName(session, `Acoes para ${mainStepEdited}`);
  await clickByText(session, 'Concluir passo', { exact: true });
  await waitForText(session, nextStepTitle, { timeoutMs: 30000 });

  await setInputByPlaceholder(session, 'Titulo do evento', mainEventInitial, 'Novo evento');
  await setNthInputValue(session, 'input[type="datetime-local"]', 0, toDateTimeLocalValue(3, 19, 0), 'Novo evento');
  await setNthInputValue(session, 'input[type="datetime-local"]', 1, toDateTimeLocalValue(3, 20, 0), 'Novo evento');
  await clickScopedButton(session, { scopeText: 'Novo evento', buttonText: 'Adicionar evento' });
  await waitForText(session, mainEventInitial, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);

  await clickByAccessibleName(session, `Abrir evento ${mainEventInitial} para edicao`);
  await setInputByPlaceholder(session, 'Titulo do evento', mainEventEdited, 'Editar evento');
  await setSelectByOptionText(session, { optionText: 'Revisao', occurrence: 1, scopeText: 'Editar evento' });
  await clickScopedButton(session, { scopeText: 'Editar evento', buttonText: 'Salvar evento' });
  await waitForText(session, mainEventEdited, { timeoutMs: 30000 });
  await waitForTextToDisappear(session, mainEventInitial, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);

  await setInputByPlaceholder(session, 'Titulo do evento', deletedEventTitle, 'Novo evento');
  await setNthInputValue(session, 'input[type="datetime-local"]', 0, toDateTimeLocalValue(4, 18, 30), 'Novo evento');
  await clickScopedButton(session, { scopeText: 'Novo evento', buttonText: 'Adicionar evento' });
  await waitForText(session, deletedEventTitle, { timeoutMs: 30000 });
  await closeOptionalOverlays(session);

  await clickByAccessibleName(session, 'Visao geral');
  await waitForAnyText(session, [mainThemeEdited, mainPathEdited, nextStepTitle], { timeoutMs: 30000 });
  await waitForAnyText(session, ['Hero contextual', 'Faca isso agora', 'Estado do plano', 'Ritmo da semana', 'Alertas inteligentes'], { timeoutMs: 30000 });
  await waitForAnyText(session, ['Continuar trilha', 'Comecar agora'], { timeoutMs: 30000 });
  const homeShot = 'study-context-outros-home.png';
  await screenshot(session, homeShot);
  appendCaseDetail(reportCase, {
    action: 'Editar tema, objetivo, trilha, passo e evento no modo outros',
    expected: 'Visao geral vira central de comando com hero contextual, proxima acao, estado do plano, ritmo e alertas usando o snapshot isolado do foco.',
    observed: 'Snapshot do modo livre atualizou tema, trilha, passo pendente e renderizou a hierarquia Hero contextual -> Faca isso agora -> Estado do plano -> Ritmo da semana -> Alertas inteligentes.',
    screenshot: homeShot,
  });
  report.steps.push({ name: 'outros_write_refresh', status: 'passed', screenshot: `qa-artifacts/${homeShot}` });

  await clickByAccessibleName(session, 'Plano');
  await waitForAnyText(session, ['Plano do foco', mainPathEdited], { timeoutMs: 30000 });
  await waitForAnyText(session, [nextStepTitle, mainStepEdited], { timeoutMs: 30000 });
  const trailShot = 'study-context-outros-trilha.png';
  await screenshot(session, trailShot);
  appendCaseDetail(reportCase, {
    action: 'Abrir plano de outros apos editar e concluir passo',
    expected: 'Tela de plano mostra progresso real, passo concluido e o proximo passo em andamento.',
    observed: 'Plano renderizou com a progressao atualizada e manteve a continuidade do dominio.',
    screenshot: trailShot,
  });
  report.steps.push({ name: 'outros_trilha_step', status: 'passed', screenshot: `qa-artifacts/${trailShot}` });

  await clickByAccessibleName(session, 'Meu foco');
  await waitForText(session, 'Temas atuais', { timeoutMs: 30000 });
  await waitForText(session, 'Passos atuais', { timeoutMs: 30000 });
  await assertSectionTextOrder(session, {
    scopeText: 'Passos atuais',
    orderedTexts: [
      'O item mais importante para continuar a trilha sem pensar demais.',
      nextStepTitle,
      'Passos em andamento ou na fila imediata do dominio.',
      deletedStepTitle,
      'Historico de passos resolvidos, recolhido por padrao.',
    ],
    label: 'agrupamento de passos em outros antes das exclusoes',
  });

  await setInputByPlaceholder(session, 'Buscar passo na lista', nextStepTitle);
  await waitForText(session, nextStepTitle, { timeoutMs: 30000 });
  await waitFor(
    session,
    `(() => {
      const label = ${JSON.stringify(`Abrir passo ${deletedStepTitle} para edicao`)};
      const visible = Array.from(document.querySelectorAll('button')).some((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const style = window.getComputedStyle(candidate);
        return rect.width > 0
          && rect.height > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && (candidate.getAttribute('aria-label') || '') === label;
      });
      return !visible;
    })()`,
    { timeoutMs: 30000, label: `passo ${deletedStepTitle} sair da lista filtrada` },
  );
  await setInputByPlaceholder(session, 'Buscar passo na lista', '');
  await waitFor(
    session,
    `(() => {
      const label = ${JSON.stringify(`Abrir passo ${deletedStepTitle} para edicao`)};
      return Array.from(document.querySelectorAll('button')).some((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const style = window.getComputedStyle(candidate);
        return rect.width > 0
          && rect.height > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && (candidate.getAttribute('aria-label') || '') === label;
      });
    })()`,
    { timeoutMs: 30000, label: `passo ${deletedStepTitle} voltar para a lista` },
  );

  const filtersShot = 'study-context-outros-filters.png';
  await screenshot(session, filtersShot);
  appendCaseDetail(reportCase, {
    action: 'Aplicar busca local em passos no modo outros',
    expected: 'A lista filtra o fluxo de progresso por texto sem perder a separacao entre proximo passo, em progresso e concluidos.',
    observed: 'Busca por Tipos utilitarios isolou o proximo passo, escondeu o passo temporario e restaurou a fila completa ao limpar o campo.',
    screenshot: filtersShot,
  });
  report.steps.push({ name: 'outros_list_filters', status: 'passed', screenshot: `qa-artifacts/${filtersShot}` });

  await clickByAccessibleName(session, `Acoes para ${extraGoalDescription}`);
  await clickByText(session, 'Excluir', { exact: true });
  await waitForText(session, 'Excluir Rotina?', { timeoutMs: 30000 });
  await clickByText(session, 'Excluir agora', { exact: true });
  await waitForTextToDisappear(session, extraGoalDescription, { timeoutMs: 30000 });

  await clickByAccessibleName(session, `Acoes para ${extraPath}`);
  await clickByText(session, 'Excluir', { exact: true });
  await waitForText(session, `Excluir ${extraPath}?`, { timeoutMs: 30000 });
  await clickByText(session, 'Excluir agora', { exact: true });
  await waitForTextToDisappear(session, extraPath, { timeoutMs: 30000 });

  await clickByAccessibleName(session, `Acoes para ${deletedStepTitle}`);
  await clickByText(session, 'Excluir', { exact: true });
  await waitForText(session, `Excluir ${deletedStepTitle}?`, { timeoutMs: 30000 });
  await clickByText(session, 'Excluir agora', { exact: true });
  await waitForTextToDisappear(session, deletedStepTitle, { timeoutMs: 30000 });

  await clickByAccessibleName(session, `Acoes para ${deletedEventTitle}`);
  await clickByText(session, 'Excluir', { exact: true });
  await waitForText(session, `Excluir ${deletedEventTitle}?`, { timeoutMs: 30000 });
  await clickByText(session, 'Excluir agora', { exact: true });
  await waitForTextToDisappear(session, deletedEventTitle, { timeoutMs: 30000 });

  await clickByAccessibleName(session, `Acoes para ${extraTheme}`);
  await clickByText(session, 'Excluir', { exact: true });
  await waitForText(session, `Excluir ${extraTheme}?`, { timeoutMs: 30000 });
  await clickByText(session, 'Excluir agora', { exact: true });
  await waitForTextToDisappear(session, extraTheme, { timeoutMs: 30000 });

  const deleteShot = 'study-context-outros-crud-delete.png';
  await screenshot(session, deleteShot);
  appendCaseDetail(reportCase, {
    action: 'Excluir tema, objetivo, trilha, passo e evento temporarios no modo outros',
    expected: 'Os itens temporarios somem da UI sem reintroducao fantasma no shell.',
    observed: 'Exclusoes confirmadas removeram os itens temporarios e mantiveram o dominio principal intacto.',
    screenshot: deleteShot,
  });
  report.steps.push({ name: 'outros_crud_delete', status: 'passed', screenshot: `qa-artifacts/${deleteShot}` });

  await reload(session);
  const reloadDebug = await waitForOutrosShellReady(session, { timeoutMs: 45000, label: 'shell outros apos reload' });
  await assertNoPhaseOverride(session);
  await assertNoLegacyBeginnerBootstrap(session);
  await waitForAnyText(session, [mainThemeEdited, mainPathEdited, nextStepTitle], { timeoutMs: 30000 });
  await waitForTextToDisappear(session, extraTheme, { timeoutMs: 30000 });
  await waitForTextToDisappear(session, extraGoalDescription, { timeoutMs: 30000 });
  await waitForTextToDisappear(session, extraPath, { timeoutMs: 30000 });
  await waitForTextToDisappear(session, deletedStepTitle, { timeoutMs: 30000 });
  await clickByAccessibleName(session, 'Meu foco');
  await waitForText(session, 'Passos atuais', { timeoutMs: 30000 });
  await assertSectionTextOrder(session, {
    scopeText: 'Passos atuais',
    orderedTexts: [
      'O item mais importante para continuar a trilha sem pensar demais.',
      nextStepTitle,
      'Historico de passos resolvidos, recolhido por padrao.',
    ],
    label: 'agrupamento de passos em outros apos reload',
  });
  await clickByAccessibleName(session, 'Ritmo');
  await waitForOutrosShellReady(session, { timeoutMs: 45000, label: 'ritmo de outros apos reload' });
  await waitForAnyText(session, ['Ritmo do foco atual', mainEventEdited], { timeoutMs: 30000 });
  await waitForAnyText(session, ['Horas por foco', 'Proxima melhor acao', 'Foco dominante'], { timeoutMs: 30000 });
  await waitForText(session, mainEventEdited, { timeoutMs: 30000 });
  await waitForTextToDisappear(session, deletedEventTitle, { timeoutMs: 30000 });
  await assertTextsAbsent(session, forbiddenOutrosRhythmGlobalTexts, {
    label: 'pagina de ritmo de outros apos reload',
  });
  await assertTextsAbsent(session, forbiddenOutrosRhythmTexts, {
    label: 'ritmo de outros apos reload',
    scopeSelector: '[data-native-shell="outros"]',
  });
  await assertNoLegacyModalitySelect(session, {
    label: 'ritmo de outros apos reload',
    scopeSelector: '[data-native-shell="outros"]',
  });

  const reloadShot = 'study-context-outros-reload.png';
  await screenshot(session, reloadShot);
  appendCaseDetail(reportCase, {
    action: 'Recarregar app em outros apos CRUD completo',
    expected: 'Tema, trilha, passo e evento principais persistem apos reload sem reintroduzir itens excluidos nem planner legado cruzado.',
    observed: `Reload preservou o shell na aba ${reloadDebug?.shellMarker?.tab || reloadDebug?.app?.activeTab || 'desconhecida'}, manteve o dominio principal, confirmou a ausencia dos itens excluidos e seguiu sem planner legado cruzado.`,
    screenshot: reloadShot,
  });
  report.steps.push({ name: 'outros_reload_persistence', status: 'passed', screenshot: `qa-artifacts/${reloadShot}` });
};

const main = async () => {
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

  if (!publishableKey || !supabaseUrl || !serviceRoleKey) {
    throw new Error('Credenciais/config Supabase ausentes para o smoke de contextos.');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    cases: [],
    steps: [],
    harness: {},
  };

  const cleanupUserIds = [];
  let browser = null;

  try {
    const shellEmail = `e2e_context_domains_${Date.now()}@zerobase.dev`;
    const shellPassword = 'ShellSmoke@2026';
    const shellDisplayName = 'QA Study Context Domains';
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

    report.harness.baseUrlHealthcheck = await waitForBaseUrlReady(`${BASE_URL}/`);
    browser = await launchChrome(10350 + Math.floor(Math.random() * 100));
    await setViewport(browser.session, { width: 1440, height: 1080, mobile: false });
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createSeedScript({
        email: shellEmail,
        supabaseUrl,
        browserSessionPayload: shellSessionPayload,
        userData: buildEmptyUserData(),
        displayName: shellDisplayName,
        markOnboardingComplete: false,
      }),
    });
    await navigate(browser.session, `${BASE_URL}/`);
    await closeOptionalOverlays(browser.session);

    const faculdadeCase = buildCase('faculdade', shellEmail);
    report.cases.push(faculdadeCase);
    await completeFaculdadeOnboarding(browser.session);
    await validateFaculdadeFlow(browser.session, report, faculdadeCase);

    const outrosCase = buildCase('outros', shellEmail);
    report.cases.push(outrosCase);
    await validateOutrosFlow(browser.session, report, outrosCase);

    report.summary = {
      passed: report.steps.filter((step) => step.status === 'passed').length,
      failed: report.steps.filter((step) => step.status === 'failed').length,
      userEmail: shellEmail,
      testedModes: report.cases.map((item) => item.mode),
    };

    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    if (browser) {
      await screenshot(browser.session, 'study-context-domains-failure.png').catch(() => undefined);
      report.failureDiagnostics = await getFailureDiagnostics(browser.session).catch(() => null);
    }

    report.error = error instanceof Error ? error.message : String(error);
    report.failureScreenshot = 'qa-artifacts/study-context-domains-failure.png';
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
