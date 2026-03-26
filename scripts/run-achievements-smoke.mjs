import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'achievements-smoke-report.json');

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

const buildEmptyWeekProgress = () => ({
  domingo: { studied: false, minutes: 0 },
  segunda: { studied: false, minutes: 0 },
  terca: { studied: false, minutes: 0 },
  quarta: { studied: false, minutes: 0 },
  quinta: { studied: false, minutes: 0 },
  sexta: { studied: false, minutes: 0 },
  sabado: { studied: false, minutes: 0 },
});

const buildSeededUserData = ({
  achievements = [],
  sessions = [],
  dailyGoal = 90,
  totalPoints = 0,
  streak = 0,
  bestStreak = 0,
  currentStreak = 0,
}) => ({
  weekProgress: buildEmptyWeekProgress(),
  completedTopics: {},
  totalPoints,
  streak,
  bestStreak,
  achievements,
  level: 1,
  studyHistory: sessions,
  dailyGoal,
  sessions,
  currentStreak,
});

const buildSession = (date, minutes, subject = 'Matematica') => ({
  date,
  minutes,
  points: minutes * 10,
  subject,
  duration: minutes,
  timestamp: date,
});

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
    if (!message.id) return;

    const pending = this.pending.get(message.id);
    if (!pending) return;

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
  if (!(await fileExists(targetPath))) return {};

  const raw = await fs.readFile(targetPath, 'utf8');
  return raw.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return acc;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return acc;

    acc[trimmed.slice(0, separatorIndex).trim()] = trimmed.slice(separatorIndex + 1).trim();
    return acc;
  }, {});
};

const readJsonIfExists = async (targetPath) => {
  if (!(await fileExists(targetPath))) return {};
  return JSON.parse(await fs.readFile(targetPath, 'utf8'));
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
      if (response.ok) return;
    } catch {
      // keep polling
    }
    await delay(150);
  }

  throw new Error(`Chrome headless nao respondeu na porta ${port}.`);
};

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-achievements-smoke-'));
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
    throw new Error(`Falha ao autenticar usuario E2E no Supabase (${response.status}): ${body.slice(0, 300)}`);
  }

  return response.json();
};

const createSeedScript = ({
  email,
  supabaseUrl,
  browserSessionPayload,
  userData,
  activeStudyMode = 'livre',
  selectedMethodId = 'pomodoro',
  plannedFocusDuration = 1,
  weeklyGoalMinutes = 900,
  mockExamHistory = [],
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const authStorageKey = buildAuthStorageKey(supabaseUrl);
  const weeklySchedule = buildWeeklySchedule(['Matematica']);
  const smokeSeedKey = `__achievements_smoke_seeded__${normalizedEmail}`;
  const initialStudyExecutionState = {
    currentBlock: {
      subject: 'Matematica',
      topicName: 'Porcentagem',
      objective: 'Executar o bloco principal do plano de hoje.',
      type: 'focus',
      duration: plannedFocusDuration,
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

        const keysToRemove = [
          'mdz_analytics_events',
          'zb_internal_access',
          'zb_phase_override',
          ${JSON.stringify(`zeroBaseData_${normalizedEmail}`)},
          ${JSON.stringify(`profileDisplayName_${normalizedEmail}`)},
          ${JSON.stringify(`preferredStudyTrack_${normalizedEmail}`)},
          ${JSON.stringify(`selectedStudyMethodId_${normalizedEmail}`)},
          ${JSON.stringify(`plannedFocusDuration_${normalizedEmail}`)},
          ${JSON.stringify(`activeStudyMode_${normalizedEmail}`)},
          ${JSON.stringify(`weeklyGoalMinutes_${normalizedEmail}`)},
          ${JSON.stringify(`weeklyStudySchedule_${normalizedEmail}`)},
          ${JSON.stringify(`studyExecutionState_${normalizedEmail}`)},
          ${JSON.stringify(`study-timer-session_${normalizedEmail}`)},
          ${JSON.stringify(`pomodoro-session_${normalizedEmail}`)},
          ${JSON.stringify(`achievement_unlock_meta_${normalizedEmail}`)},
          'mock_exam_history',
          'mock_exam_reviewed_question_ids'
        ];

        keysToRemove.forEach((key) => window.localStorage.removeItem(key));
        window.localStorage.setItem(${JSON.stringify(`mdzOnboardingCompleted_${normalizedEmail}`)}, 'true');
        window.localStorage.setItem(${JSON.stringify(`zeroBaseData_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(userData))});
        window.localStorage.setItem(${JSON.stringify(`profileDisplayName_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify('QA Conquistas'))});
        window.localStorage.setItem(${JSON.stringify(`preferredStudyTrack_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify('enem'))});
        window.localStorage.setItem(${JSON.stringify(`selectedStudyMethodId_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(selectedMethodId))});
        window.localStorage.setItem(${JSON.stringify(`plannedFocusDuration_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(plannedFocusDuration))});
        window.localStorage.setItem(${JSON.stringify(`activeStudyMode_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(activeStudyMode))});
        window.localStorage.setItem(${JSON.stringify(`weeklyGoalMinutes_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(weeklyGoalMinutes))});
        window.localStorage.setItem(${JSON.stringify(`weeklyStudySchedule_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(weeklySchedule))});
        window.localStorage.setItem(${JSON.stringify(`studyExecutionState_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(initialStudyExecutionState))});
        window.localStorage.setItem('mock_exam_history', ${JSON.stringify(JSON.stringify(mockExamHistory))});
        window.localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(browserSessionPayload))});
        window.localStorage.setItem('zb_internal_access', 'true');
        window.localStorage.setItem('zb_phase_override', ${JSON.stringify(JSON.stringify('intermediate'))});
        window.localStorage.setItem(${JSON.stringify(smokeSeedKey)}, 'true');
      } catch (error) {
        console.error('achievements-smoke-seed-failed', error);
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
    const satisfied = await evalInPage(session, predicateExpression);
    if (satisfied) return satisfied;
    await delay(intervalMs);
  }

  throw new Error(`Timeout aguardando ${label}.`);
};

const waitForText = async (session, text, options = {}) =>
  waitFor(
    session,
    `(() => {
      const body = (document.body?.innerText || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
      return body.includes(${JSON.stringify(normalize(text))});
    })()`,
    { ...options, label: `texto "${text}"` },
  );

const waitForSelector = async (session, selector, options = {}) =>
  waitFor(
    session,
    `(() => Boolean(document.querySelector(${JSON.stringify(selector)})))()`,
    { ...options, label: `selector ${selector}` },
  );

const clickByText = async (session, text, { tagName = null, exact = false } = {}) => {
  const clicked = await evalInPage(
    session,
    `(() => {
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
    })()`,
  );

  if (!clicked) {
    throw new Error(`Nao encontrei elemento clicavel com texto "${text}".`);
  }
};

const getVisibleClickLabels = async (session, selector = 'button, a, [role="button"]') =>
  evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, ' ').trim();
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)})).filter((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return true;
      });

      return nodes
        .map((candidate) => normalize(candidate.textContent || ''))
        .filter(Boolean)
        .slice(0, 40);
    })()`,
  );

const clickBestVisibleButtonByPrefix = async (session, prefix) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(prefix)});
      const candidates = Array.from(document.querySelectorAll('button, [role="button"]'))
        .map((candidate) => ({ candidate, rect: candidate.getBoundingClientRect(), style: window.getComputedStyle(candidate) }))
        .filter(({ candidate, rect, style }) => {
          if (!rect.width || !rect.height) return false;
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
          if (candidate.hasAttribute('disabled') || candidate.getAttribute('aria-disabled') === 'true') return false;
          return normalize(candidate.textContent || '').startsWith(target);
        })
        .sort((left, right) => {
          if (right.rect.top !== left.rect.top) {
            return right.rect.top - left.rect.top;
          }
          return right.rect.width - left.rect.width;
        });

      const match = candidates[0]?.candidate;
      if (!match) return false;
      match.scrollIntoView({ block: 'center', inline: 'center' });
      match.click();
      return true;
    })()`,
  );

  if (!clicked) {
    const labels = await getVisibleClickLabels(session);
    const bodyText = await evalInPage(
      session,
      `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 800))()`,
    );
    throw new Error(
      `Nao encontrei botao visivel com prefixo "${prefix}". Visiveis: ${labels.join(' | ') || 'nenhum'}. Trecho: ${bodyText}`,
    );
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
    throw new Error(`Nao encontrei o selector ${selector}.`);
  }
};

const screenshot = async (session, fileName) => {
  const { data } = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  const targetPath = path.join(ARTIFACTS_DIR, `${fileName}.png`);
  await fs.writeFile(targetPath, Buffer.from(data, 'base64'));
  return targetPath;
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

const closeOptionalOverlays = async (session) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let changed = false;

    const hasCloseButton = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'fechar');
      })()`,
    );

    if (hasCloseButton) {
      try {
        await clickByText(session, 'Fechar', { exact: true });
        await delay(250);
        changed = true;
      } catch {
        // ignore
      }
    }

    const hasAgoraNao = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button, [role="button"]')).some((button) => normalize(button.textContent || '') === 'agora nao');
      })()`,
    );

    if (hasAgoraNao) {
      try {
        await clickByText(session, 'Agora nao', { exact: true });
        await delay(250);
        changed = true;
      } catch {
        // ignore
      }
    }

    if (!changed) break;
  }
};

const navigate = async (session, url) => {
  await session.send('Page.navigate', { url });
  await waitFor(session, '(() => document.readyState === "complete")()', { timeoutMs: 30000, label: 'page ready' });
  await delay(400);
};

const reloadPage = async (session) => {
  await session.send('Page.reload', { ignoreCache: true });
  await waitFor(session, '(() => document.readyState === "complete")()', { timeoutMs: 30000, label: 'reload complete' });
  await delay(400);
};

const getStorageJson = async (session, key) => {
  const raw = await evalInPage(session, `(() => window.localStorage.getItem(${JSON.stringify(key)}))()`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
    ? { rootSelector: '[data-testid="study-pomodoro-timer-ready"]', startSelector: '[data-testid="study-pomodoro-start-button"]' }
    : { rootSelector: '[data-testid="study-free-timer-ready"]', startSelector: '[data-testid="study-free-start-button"]' };

const waitForTimerDisplay = async (session, studyMode, predicate, options = {}) => {
  const { rootSelector } = getTimerSelectors(studyMode);
  const regex = studyMode === 'pomodoro' ? '\\b\\d{2}:\\d{2}\\b' : '\\b\\d{2}:\\d{2}:\\d{2}\\b';

  return waitFor(
    session,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      if (!root) return false;
      const match = (root.innerText || '').match(new RegExp(${JSON.stringify(regex)}));
      if (!match) return false;
      return (${predicate.toString()})(match[0]);
    })()`,
    options,
  );
};

const clickVisibleStudyDomain = async (session) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const isVisible = (candidate) => {
        const rect = candidate.getBoundingClientRect();
        const styles = window.getComputedStyle(candidate);
        return rect.width > 0 && rect.height > 0 && styles.visibility !== 'hidden' && styles.display !== 'none';
      };
      const candidates = Array.from(document.querySelectorAll('aside button, main button, button'))
        .filter((candidate) => normalize(candidate.textContent || '') === 'estudo')
        .filter(isVisible);
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

const clickVisibleDomain = async (session, label) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const isVisible = (candidate) => {
        const rect = candidate.getBoundingClientRect();
        const styles = window.getComputedStyle(candidate);
        return rect.width > 0 && rect.height > 0 && styles.visibility !== 'hidden' && styles.display !== 'none';
      };
      const target = normalize(${JSON.stringify(label)});
      const candidates = Array.from(document.querySelectorAll('aside button, nav button, main button, button, a, [role="button"]'))
        .filter((candidate) => normalize(candidate.textContent || '') === target)
        .filter(isVisible);
      const match = candidates[0];
      if (!match) return false;
      match.scrollIntoView({ block: 'center', inline: 'center' });
      match.click();
      return true;
    })()`,
  );

  if (!clicked) {
    const labels = await getVisibleClickLabels(session);
    throw new Error(`Nao encontrei o dominio visivel "${label}". Visiveis: ${labels.join(' | ') || 'nenhum'}`);
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
  }

  await waitForSelector(session, '[data-testid="study-focus-container"]', { timeoutMs: 30000 });

  if (studyMode === 'livre') {
    const hasLivreButton = await evalInPage(
      session,
      `(() => Array.from(document.querySelectorAll('button')).some((candidate) => {
        const text = String(candidate.textContent || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return text === 'livre';
      }))()`,
    );

    if (hasLivreButton) {
      await clickByText(session, 'Livre', { exact: true, tagName: 'button' });
    }
  }

  await waitForSelector(session, rootSelector, { timeoutMs: 20000 });
  await waitForSelector(session, startSelector, { timeoutMs: 20000 });
};

const clickStartButton = async (session, studyMode) => {
  const { startSelector } = getTimerSelectors(studyMode);
  await clickSelector(session, startSelector);
  await delay(200);
};

const confirmDialogAction = async (session, label) => {
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
    throw new Error(`Nao encontrei a acao "${label}" dentro do dialogo.`);
  }
};

const openMockExamPage = async (session) => {
  await closeOptionalOverlays(session);
  await waitForText(session, 'Simulados', { timeoutMs: 30000 });
  await clickByText(session, 'Simulados', { exact: true });
  await waitForText(session, 'Simulado recomendado', { timeoutMs: 20000 });
};

const readPrimaryCta = async (session) =>
  evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const buttons = Array.from(document.querySelectorAll('button')).filter((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        return rect.width && rect.height && style.display !== 'none' && style.visibility !== 'hidden';
      });
      const match = buttons.find((button) => normalize(button.textContent || '').startsWith('iniciar') || normalize(button.textContent || '').startsWith('comecar'));
      return match ? (match.textContent || '').replace(/\\s+/g, ' ').trim() : null;
    })()`,
  );

const startRecommendedExam = async (session) => {
  await openMockExamPage(session);
  await closeOptionalOverlays(session);
  await clickByText(session, 'ENEM', { exact: true });
  await waitForText(session, 'ENEM Rapido', { timeoutMs: 20000 });
  await clickByText(session, 'ENEM Rapido');

  const alreadyRunning = await evalInPage(
    session,
    `(() => {
      const text = (document.body?.innerText || '').replace(/\\s+/g, ' ');
      return text.includes('respondidas') && text.includes('Anterior') && /Q\\d+\\/\\d+/.test(text);
    })()`,
  );

  if (!alreadyRunning) {
    const finalCta = await readPrimaryCta(session);
    if (!finalCta) {
      throw new Error('CTA final para iniciar o simulado nao apareceu.');
    }
    await clickByText(session, finalCta, { exact: true });
  }

  await waitForText(session, 'respondidas', { timeoutMs: 20000 });
  await waitForText(session, 'Anterior', { timeoutMs: 20000 });
  await waitFor(
    session,
    `(() => {
      const text = (document.body?.innerText || '').replace(/\\s+/g, ' ');
      return /Q\\d+\\/\\d+/.test(text);
    })()`,
    { timeoutMs: 20000, label: 'cabecalho do simulado em execucao' },
  );
};

const clickFirstOption = async (session) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const buttons = Array.from(document.querySelectorAll('button')).filter((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const text = normalize(candidate.textContent || '');
        return text.startsWith('a.') || text.startsWith('a ');
      });
      const button = buttons[0];
      if (!button) return false;
      button.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error('Nao encontrei a opcao A da questao atual.');
  }
};

const readRunningExamState = async (session) =>
  evalInPage(
    session,
    `(() => {
      const text = String(document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
      const questionMatch = text.match(/Q\\s*(\\d+)\\s*\\/\\s*(\\d+)/i);
      const answeredMatch = text.match(/(\\d+)\\s+respondid[ao]s?/i);
      const hasVisibleDeliver = Array.from(document.querySelectorAll('button, [role="button"]')).some((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        const label = String(candidate.textContent || '')
          .normalize('NFD')
          .replace(/[\\u0300-\\u036f]/g, '')
          .toLowerCase()
          .replace(/\\s+/g, ' ')
          .trim();
        return label.startsWith('entregar');
      });
      return {
        answered: answeredMatch ? Number(answeredMatch[1]) : 0,
        current: questionMatch ? Number(questionMatch[1]) : 0,
        hasEntregar: hasVisibleDeliver,
        total: questionMatch ? Number(questionMatch[2]) : 0,
      };
    })()`,
  );

const deliverExamWithStrategy = async (session) => {
  const recentStates = [];
  await waitFor(
    session,
    `(() => {
      const text = String(document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
      return /Q\\s*\\d+\\s*\\/\\s*\\d+/i.test(text);
    })()`,
    { timeoutMs: 12000, intervalMs: 120, label: 'estado inicial do simulado legivel' },
  );

  for (let attempts = 0; attempts < 140; attempts += 1) {
    const state = await readRunningExamState(session);
    recentStates.push({ attempt: attempts + 1, ...state });
    if (recentStates.length > 10) {
      recentStates.shift();
    }
    if (!state?.total) {
      await delay(150);
      continue;
    }

    await clickFirstOption(session);
    await waitFor(
      session,
      `(() => {
        const text = String(document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
        const answeredMatch = text.match(/(\\d+) respondidas/);
        const answered = answeredMatch ? Number(answeredMatch[1]) : 0;
        return answered >= ${Math.min(state.total, state.answered + 1)};
      })()`,
      { timeoutMs: 3000, intervalMs: 80, label: 'resposta registrada no simulado' },
    );
    await delay(80);

    if (state.hasEntregar) {
      await waitFor(
        session,
        `(() => {
          const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
          return Array.from(document.querySelectorAll('button, [role="button"]')).some((candidate) => {
            const style = window.getComputedStyle(candidate);
            const rect = candidate.getBoundingClientRect();
            if (!rect.width || !rect.height) return false;
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            return normalize(candidate.textContent || '').startsWith('entregar');
          });
        })()`,
        { timeoutMs: 5000, intervalMs: 120, label: 'CTA Entregar visivel' },
      );

      const waitForResults = () =>
        waitForSelector(session, '[data-testid="mock-exam-results-ready"]', { timeoutMs: 10000 });

      await clickBestVisibleButtonByPrefix(session, 'Entregar');

      try {
        await waitForResults();
      } catch {
        const primaryCta = await readPrimaryCta(session);
        if (primaryCta && normalize(primaryCta).startsWith('entregar')) {
          await clickByText(session, primaryCta, { exact: true });
        } else {
          await clickBestVisibleButtonByPrefix(session, 'Entregar');
        }

        try {
          await waitForResults();
        } catch (error) {
          const labels = await getVisibleClickLabels(session);
          const bodyText = await evalInPage(
            session,
            `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 800))()`,
          );
          throw new Error(
            `Resultado do simulado nao abriu apos entrega. Visiveis: ${labels.join(' | ') || 'nenhum'}. Trecho: ${bodyText}. Motivo: ${error.message}`,
          );
        }
      }
      return state.total;
    }

    await clickBestVisibleButtonByPrefix(session, 'Proxima');
    await waitFor(
      session,
      `(() => {
        const text = String(document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
        const questionMatch = text.match(/Q\\s*(\\d+)\\s*\\/\\s*(\\d+)/i);
        const current = questionMatch ? Number(questionMatch[1]) : 0;
        const hasVisibleDeliver = Array.from(document.querySelectorAll('button, [role="button"]')).some((candidate) => {
          const style = window.getComputedStyle(candidate);
          const rect = candidate.getBoundingClientRect();
          if (!rect.width || !rect.height) return false;
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
          const label = String(candidate.textContent || '')
            .normalize('NFD')
            .replace(/[\\u0300-\\u036f]/g, '')
            .toLowerCase()
            .replace(/\\s+/g, ' ')
            .trim();
          return label.startsWith('entregar');
        });
        return current > ${state.current} || hasVisibleDeliver;
      })()`,
      { timeoutMs: 3000, intervalMs: 100, label: 'navegacao para a proxima questao' },
    );
    await delay(80);
  }

  const labels = await getVisibleClickLabels(session);
  const bodyText = await evalInPage(
    session,
    `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 1000))()`,
  );
  throw new Error(
    `Nao consegui entregar o simulado dentro do limite esperado. Estados recentes: ${JSON.stringify(recentStates)}. Visiveis: ${labels.join(' | ') || 'nenhum'}. Trecho: ${bodyText}`,
  );
};

const createSupabaseHeaders = (serviceRoleKey, extra = {}) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  ...extra,
});

const fetchRemoteAchievements = async (supabaseUrl, serviceRoleKey, userId) => {
  const params = new URLSearchParams({
    select: 'achievement_id',
    user_id: `eq.${userId}`,
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/user_achievements?${params.toString()}`, {
    headers: createSupabaseHeaders(serviceRoleKey),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Consulta user_achievements falhou (${response.status}): ${body.slice(0, 300)}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows.map((row) => row.achievement_id) : [];
};

const deleteRemoteAchievement = async (supabaseUrl, serviceRoleKey, userId, achievementId) => {
  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    achievement_id: `eq.${achievementId}`,
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/user_achievements?${params.toString()}`, {
    method: 'DELETE',
    headers: createSupabaseHeaders(serviceRoleKey, { Prefer: 'return=minimal' }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Delete de user_achievements falhou (${response.status}): ${body.slice(0, 300)}`);
  }
};

const deleteRemoteStudySessions = async (supabaseUrl, serviceRoleKey, userId) => {
  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/study_sessions?${params.toString()}`, {
    method: 'DELETE',
    headers: createSupabaseHeaders(serviceRoleKey, { Prefer: 'return=minimal' }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Delete de study_sessions falhou (${response.status}): ${body.slice(0, 300)}`);
  }
};

const upsertRemoteStudyPreferences = async (
  supabaseUrl,
  serviceRoleKey,
  userId,
  { goalType = 'enem', hybridEnemWeight = 70, weeklyGoalMinutes = 900, primaryTrack = 'enem', secondaryTrack = null } = {},
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/user_study_preferences?on_conflict=user_id`, {
    method: 'POST',
    headers: createSupabaseHeaders(serviceRoleKey, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify([
      {
        user_id: userId,
        goal_type: goalType,
        hybrid_enem_weight: hybridEnemWeight,
        weekly_goal_minutes: weeklyGoalMinutes,
        primary_track: primaryTrack,
        secondary_track: secondaryTrack,
      },
    ]),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Upsert de user_study_preferences falhou (${response.status}): ${body.slice(0, 300)}`);
  }
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const getUnique = (values) => [...new Set(values.filter(Boolean))];

const getAchievementMetaKey = (email) => `achievement_unlock_meta_${email.toLowerCase()}`;
const getUserDataKey = (email) => `zeroBaseData_${email.toLowerCase()}`;
const getStudyTimerKey = (email) => `study-timer-session_${email.toLowerCase()}`;

const waitForLocalAchievement = async (session, dataKey, achievementId) =>
  waitFor(
    session,
    `(() => {
      try {
        const raw = window.localStorage.getItem(${JSON.stringify(dataKey)});
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.achievements) && parsed.achievements.includes(${JSON.stringify(achievementId)});
      } catch {
        return false;
      }
    })()`,
    { timeoutMs: 12000, intervalMs: 200, label: `achievement ${achievementId} no userData local` },
  );

const waitForUnlockMeta = async (session, metaKey, achievementId) =>
  waitFor(
    session,
    `(() => {
      try {
        const raw = window.localStorage.getItem(${JSON.stringify(metaKey)});
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return Boolean(parsed?.[${JSON.stringify(achievementId)}]?.unlockedAt);
      } catch {
        return false;
      }
    })()`,
    { timeoutMs: 12000, intervalMs: 200, label: `unlock meta ${achievementId}` },
  );

const getUnlockedAchievementCount = async (session, dataKey) =>
  evalInPage(
    session,
    `(() => {
      try {
        const raw = window.localStorage.getItem(${JSON.stringify(dataKey)});
        if (!raw) return 0;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.achievements) ? parsed.achievements.length : 0;
      } catch {
        return 0;
      }
    })()`,
  );

const waitForUnlockFeedback = async (session) =>
  waitFor(
    session,
    `(() => {
      const text = (document.body?.innerText || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
      return text.includes('conquista desbloqueada');
    })()`,
    { timeoutMs: 10000, intervalMs: 150, label: 'toast/overlay de conquista' },
  );

const waitForUnlockFeedbackToDisappear = async (session) =>
  waitFor(
    session,
    `(() => {
      const text = (document.body?.innerText || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
      return !text.includes('conquista desbloqueada');
    })()`,
    { timeoutMs: 12000, intervalMs: 150, label: 'auto-dismiss da conquista' },
  );

const openAchievementsPage = async (session) => {
  await setViewport(session, { width: 1440, height: 1200, mobile: false });
  await closeOptionalOverlays(session);

  const alreadyOpen = await evalInPage(
    session,
    `(() => Boolean(document.querySelector('[data-testid="achievements-page-ready"]')))()`,
  );
  if (alreadyOpen) {
    return;
  }

  const achievementsTabVisible = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      return Array.from(document.querySelectorAll('button, a, [role="button"]')).some((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return normalize(candidate.textContent || '') === 'conquistas';
      });
    })()`,
  );

  if (!achievementsTabVisible) {
    await waitFor(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button, a, [role="button"], nav button, nav a')).some(
          (candidate) => normalize(candidate.textContent || '') === 'progresso'
        );
      })()`,
      { timeoutMs: 30000, label: 'acao Progresso clicavel' },
    );

    await clickVisibleDomain(session, 'Progresso');
    await delay(350);
  }

  await waitFor(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      return Array.from(document.querySelectorAll('button, a, [role="button"]')).some((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return normalize(candidate.textContent || '') === 'conquistas';
      });
    })()`,
    { timeoutMs: 15000, label: 'aba Conquistas visivel' },
  );

  try {
    await clickByText(session, 'Conquistas', { exact: true });
  } catch (error) {
    const labels = await getVisibleClickLabels(session);
    throw new Error(`Falha ao abrir Conquistas apos entrar em Progresso. Visiveis: ${labels.join(' | ') || 'nenhum'}. Motivo: ${error.message}`);
  }

  await waitForSelector(session, '[data-testid="achievements-page-ready"]', { timeoutMs: 20000 });
};

const verifyAchievementUi = async (session, achievementId, title) => {
  await waitForSelector(session, `[data-testid="achievement-card-${achievementId}"]`, { timeoutMs: 10000 });
  const snapshot = await evalInPage(
    session,
    `(() => {
      const card = document.querySelector(${JSON.stringify(`[data-testid="achievement-card-${achievementId}"]`)});
      const latest = document.querySelector('[data-testid="achievements-latest-unlocked"]');
      return {
        status: card?.getAttribute('data-achievement-status') || null,
        latestText: latest?.innerText || '',
        hasNewBadge: Boolean(document.querySelector(${JSON.stringify(`[data-testid="achievement-new-${achievementId}"], [data-testid="achievements-new-badge"]`)})),
      };
    })()`,
  );

  assert(snapshot?.status === 'unlocked', `Card ${achievementId} nao ficou desbloqueado.`);
  assert(normalize(snapshot?.latestText || '').includes(normalize(title)), `Ultima conquista nao mostrou "${title}".`);
  return snapshot;
};

const makeShortSessions = (count) => {
  const base = Date.now() - 60 * 60 * 1000;
  return Array.from({ length: count }, (_, index) =>
    buildSession(new Date(base + index * 1000).toISOString(), 1),
  );
};

const runSessionUnlockScenario = async ({
  baseUrl,
  loginEmail,
  supabaseUrl,
  serviceRoleKey,
  userId,
  browserSessionPayload,
}) => {
  const targetAchievement = 'sessions_10';
  const targetTitle = 'Ritmo de base';
  const dataKey = getUserDataKey(loginEmail);
  const timerKey = getStudyTimerKey(loginEmail);
  const metaKey = getAchievementMetaKey(loginEmail);

  await deleteRemoteAchievement(supabaseUrl, serviceRoleKey, userId, targetAchievement);
  await deleteRemoteStudySessions(supabaseUrl, serviceRoleKey, userId);
  const remoteAchievements = await fetchRemoteAchievements(supabaseUrl, serviceRoleKey, userId);
  const seededUserData = buildSeededUserData({
    achievements: getUnique([...remoteAchievements, 'first_session']),
    sessions: makeShortSessions(9),
    dailyGoal: 90,
  });

  const browser = await launchChrome(9400 + Math.floor(Math.random() * 150));

  try {
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createSeedScript({
        email: loginEmail,
        supabaseUrl,
        browserSessionPayload,
        userData: seededUserData,
        activeStudyMode: 'livre',
        plannedFocusDuration: 1,
        weeklyGoalMinutes: 900,
      }),
    });

    await navigate(browser.session, `${baseUrl}/`);
    await openStudyPage(browser.session, 'livre');
    const baselineCount = await getUnlockedAchievementCount(browser.session, dataKey);

    await clickStartButton(browser.session, 'livre');
    await delay(1200);
    await clickStartButton(browser.session, 'livre');
    const pausedSession = await getStorageJson(browser.session, timerKey);
    assert(pausedSession?.status === 'paused', 'Sessao livre nao ficou pausada antes da finalizacao.');

    const nearFinishSession = {
      ...pausedSession,
      status: 'paused',
      accumulatedFocusMs: 61000,
      accumulatedPhaseMs: 61000,
      plannedDurationMs: 3600000,
      lastResumedAt: null,
      lastPausedAt: new Date().toISOString(),
      lastRestoredAt: null,
      updatedAt: new Date(Date.now() - 5000).toISOString(),
    };

    await setStorageJson(browser.session, timerKey, nearFinishSession);
    await reloadPage(browser.session);
    await openStudyPage(browser.session, 'livre');
    await waitForTimerDisplay(browser.session, 'livre', (value) => value !== '00:00:00', {
      timeoutMs: 10000,
      label: 'timer pronto para finalizar',
    });

    await clickSelector(browser.session, '[data-testid="study-free-finish-button"]');
    await confirmDialogAction(browser.session, 'Finalizar');
    await waitForUnlockMeta(browser.session, metaKey, targetAchievement);
    await waitForLocalAchievement(browser.session, dataKey, targetAchievement);
    await waitForUnlockFeedback(browser.session);
    await waitForUnlockFeedbackToDisappear(browser.session);

    await navigate(browser.session, `${baseUrl}/`);
    await openAchievementsPage(browser.session);
    const ui = await verifyAchievementUi(browser.session, targetAchievement, targetTitle);
    await screenshot(browser.session, 'achievements-smoke-session');

    const afterUnlockCount = await getUnlockedAchievementCount(browser.session, dataKey);
    assert(afterUnlockCount >= baselineCount + 1, 'Unlock por sessao nao aumentou a contagem de conquistas.');

    await reloadPage(browser.session);
    await openAchievementsPage(browser.session);
    await waitForUnlockMeta(browser.session, metaKey, targetAchievement);
    const afterRefreshCount = await getUnlockedAchievementCount(browser.session, dataKey);
    assert(afterRefreshCount === afterUnlockCount, 'Refresh alterou a contagem de conquistas apos unlock de sessao.');

    return {
      targetAchievement,
      baselineCount,
      afterUnlockCount,
      afterRefreshCount,
      latestSection: ui.latestText,
      hasNewBadge: ui.hasNewBadge,
    };
  } finally {
    await browser.close();
  }
};

const runWeeklyGoalScenario = async ({
  baseUrl,
  loginEmail,
  supabaseUrl,
  serviceRoleKey,
  userId,
  browserSessionPayload,
}) => {
  const targetAchievement = 'weekly_goal_1';
  const targetTitle = 'Meta da semana';
  const dataKey = getUserDataKey(loginEmail);
  const timerKey = getStudyTimerKey(loginEmail);
  const metaKey = getAchievementMetaKey(loginEmail);
  const seededSessions = [buildSession(new Date().toISOString(), 119)];

  await deleteRemoteAchievement(supabaseUrl, serviceRoleKey, userId, targetAchievement);
  await deleteRemoteStudySessions(supabaseUrl, serviceRoleKey, userId);
  await upsertRemoteStudyPreferences(supabaseUrl, serviceRoleKey, userId, {
    weeklyGoalMinutes: 120,
  });
  const remoteAchievements = await fetchRemoteAchievements(supabaseUrl, serviceRoleKey, userId);
  const seededUserData = buildSeededUserData({
    achievements: getUnique([...remoteAchievements, 'first_session', 'time_1h', 'speedster']),
    sessions: seededSessions,
    dailyGoal: 200,
  });

  const browser = await launchChrome(9550 + Math.floor(Math.random() * 150));

  try {
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createSeedScript({
        email: loginEmail,
        supabaseUrl,
        browserSessionPayload,
        userData: seededUserData,
        activeStudyMode: 'livre',
        plannedFocusDuration: 1,
        weeklyGoalMinutes: 120,
      }),
    });

    await navigate(browser.session, `${baseUrl}/`);
    await openStudyPage(browser.session, 'livre');
    const baselineCount = await getUnlockedAchievementCount(browser.session, dataKey);

    await clickStartButton(browser.session, 'livre');
    await delay(1200);
    await clickStartButton(browser.session, 'livre');
    const pausedSession = await getStorageJson(browser.session, timerKey);
    assert(pausedSession?.status === 'paused', 'Sessao da meta semanal nao pausou corretamente.');

    const nearFinishSession = {
      ...pausedSession,
      status: 'paused',
      accumulatedFocusMs: 61000,
      accumulatedPhaseMs: 61000,
      plannedDurationMs: 3600000,
      lastResumedAt: null,
      lastPausedAt: new Date().toISOString(),
      lastRestoredAt: null,
      updatedAt: new Date(Date.now() - 5000).toISOString(),
    };

    await setStorageJson(browser.session, timerKey, nearFinishSession);
    await reloadPage(browser.session);
    await openStudyPage(browser.session, 'livre');
    await waitForTimerDisplay(browser.session, 'livre', (value) => value !== '00:00:00', {
      timeoutMs: 10000,
      label: 'timer pronto para fechar meta semanal',
    });

    await clickSelector(browser.session, '[data-testid="study-free-finish-button"]');
    await confirmDialogAction(browser.session, 'Finalizar');
    await waitForUnlockMeta(browser.session, metaKey, targetAchievement);
    await waitForLocalAchievement(browser.session, dataKey, targetAchievement);

    await navigate(browser.session, `${baseUrl}/`);
    await openAchievementsPage(browser.session);
    const ui = await verifyAchievementUi(browser.session, targetAchievement, targetTitle);
    await screenshot(browser.session, 'achievements-smoke-weekly-goal');

    const afterUnlockCount = await getUnlockedAchievementCount(browser.session, dataKey);
    assert(afterUnlockCount >= baselineCount + 1, 'Unlock por meta semanal nao aumentou a contagem de conquistas.');

    await reloadPage(browser.session);
    await openAchievementsPage(browser.session);
    await waitForUnlockMeta(browser.session, metaKey, targetAchievement);
    const afterRefreshCount = await getUnlockedAchievementCount(browser.session, dataKey);
    assert(afterRefreshCount === afterUnlockCount, 'Refresh alterou a contagem de conquistas apos unlock de meta.');

    return {
      targetAchievement,
      baselineCount,
      afterUnlockCount,
      afterRefreshCount,
      latestSection: ui.latestText,
      hasNewBadge: ui.hasNewBadge,
    };
  } finally {
    await browser.close();
  }
};

const runExamUnlockScenario = async ({
  baseUrl,
  loginEmail,
  supabaseUrl,
  serviceRoleKey,
  userId,
  browserSessionPayload,
}) => {
  const targetAchievement = 'exam_first';
  const targetTitle = 'Primeiro simulado';
  const dataKey = getUserDataKey(loginEmail);
  const metaKey = getAchievementMetaKey(loginEmail);

  await deleteRemoteAchievement(supabaseUrl, serviceRoleKey, userId, targetAchievement);
  const remoteAchievements = await fetchRemoteAchievements(supabaseUrl, serviceRoleKey, userId);
  const seededUserData = buildSeededUserData({
    achievements: remoteAchievements.filter((id) => id !== targetAchievement),
    sessions: [],
    dailyGoal: 90,
  });

  const browser = await launchChrome(9700 + Math.floor(Math.random() * 150));

  try {
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createSeedScript({
        email: loginEmail,
        supabaseUrl,
        browserSessionPayload,
        userData: seededUserData,
        activeStudyMode: 'livre',
        plannedFocusDuration: 1,
        weeklyGoalMinutes: 900,
        mockExamHistory: [],
      }),
    });

    await navigate(browser.session, `${baseUrl}/`);
    const baselineCount = await getUnlockedAchievementCount(browser.session, dataKey);

    await startRecommendedExam(browser.session);
    const totalQuestions = await deliverExamWithStrategy(browser.session);
    assert(totalQuestions > 0, 'Simulado nao abriu com questoes validas.');
    await waitForSelector(browser.session, '[data-testid="mock-exam-results-ready"]', { timeoutMs: 20000 });
    await waitForUnlockMeta(browser.session, metaKey, targetAchievement);
    await waitForLocalAchievement(browser.session, dataKey, targetAchievement);

    await navigate(browser.session, `${baseUrl}/`);
    await openAchievementsPage(browser.session);
    const ui = await verifyAchievementUi(browser.session, targetAchievement, targetTitle);
    await screenshot(browser.session, 'achievements-smoke-exam');

    const afterUnlockCount = await getUnlockedAchievementCount(browser.session, dataKey);
    assert(afterUnlockCount >= baselineCount + 1, 'Unlock por simulado nao aumentou a contagem de conquistas.');

    await reloadPage(browser.session);
    await openAchievementsPage(browser.session);
    await waitForUnlockMeta(browser.session, metaKey, targetAchievement);
    const afterRefreshCount = await getUnlockedAchievementCount(browser.session, dataKey);
    assert(afterRefreshCount === afterUnlockCount, 'Refresh alterou a contagem de conquistas apos unlock do simulado.');

    return {
      targetAchievement,
      baselineCount,
      afterUnlockCount,
      afterRefreshCount,
      latestSection: ui.latestText,
      hasNewBadge: ui.hasNewBadge,
      totalQuestions,
    };
  } finally {
    await browser.close();
  }
};

const runScenario = async (report, name, fn) => {
  try {
    const details = await fn();
    report.steps.push({ name, status: 'passed', details });
  } catch (error) {
    report.steps.push({
      name,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
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
    throw new Error('Credenciais/config E2E ausentes para o smoke de Conquistas.');
  }

  const baseUrl = (process.env.ACHIEVEMENTS_QA_BASE_URL || 'https://zero-base-three.vercel.app').replace(/\/+$/, '');
  const browserSessionPayload = await createBrowserSessionPayload(
    supabaseUrl,
    publishableKey,
    loginEmail,
    loginPassword,
  );
  const userId = browserSessionPayload?.user?.id;

  if (!userId) {
    throw new Error('Sessao E2E nao retornou user.id para o smoke de Conquistas.');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    steps: [],
    summary: { passed: 0, failed: 0 },
  };

  try {
    await runScenario(report, 'session_unlock', () =>
      runSessionUnlockScenario({
        baseUrl,
        loginEmail,
        supabaseUrl,
        serviceRoleKey,
        userId,
        browserSessionPayload,
      }),
    );
    await runScenario(report, 'weekly_goal_unlock', () =>
      runWeeklyGoalScenario({
        baseUrl,
        loginEmail,
        supabaseUrl,
        serviceRoleKey,
        userId,
        browserSessionPayload,
      }),
    );
    await runScenario(report, 'exam_unlock', () =>
      runExamUnlockScenario({
        baseUrl,
        loginEmail,
        supabaseUrl,
        serviceRoleKey,
        userId,
        browserSessionPayload,
      }),
    );
  } finally {
    report.summary = {
      passed: report.steps.filter((step) => step.status === 'passed').length,
      failed: report.steps.filter((step) => step.status === 'failed').length,
    };
    await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify(report.summary));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
