import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'schedule-today-smoke-report.json');
const PORT = Number(process.env.STUDY_HOME_SMOKE_PORT || 3210);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const API_BASE_URL = (process.env.STUDY_HOME_API_BASE_URL || 'https://zero-base-three.vercel.app').replace(/\/+$/, '');
const apiTraffic = [];

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
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-study-home-'));
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
      await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => undefined);
    },
  };
};

const normalize = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
const BROWSER_NORMALIZE = `
  const normalize = (value) => String(value)
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/\\s+/g, ' ')
    .trim();
`;

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
    throw new Error(`Falha ao criar sessao do navegador (${response.status}).`);
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
    throw new Error(`Falha ao criar usuario temporario (${response.status}): ${body.slice(0, 240)}`);
  }

  return response.json();
};

const deleteTempUser = async (supabaseUrl, serviceRoleKey, userId) => {
  if (!userId) {
    return;
  }

  await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  }).catch(() => undefined);
};

const requestJson = async (url, init = {}) => {
  const response = await fetch(url, init);
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { response, payload };
};

const setupOfficialStudyContext = async ({ accessToken }) => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const onboarding = await requestJson(`${API_BASE_URL}/api/onboarding`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      examType: 'enem',
      level: 'iniciante',
      weeklyHours: 6,
      preferredGoal: 'ganhar constancia e subir a primeira sessao real',
      weakestDisciplines: ['matematica'],
    }),
  });

  if (!onboarding.response.ok) {
    throw new Error(`Falha ao preparar onboarding oficial (${onboarding.response.status}).`);
  }

  const recommendation = await requestJson(`${API_BASE_URL}/api/recommendations/current`, {
    method: 'GET',
    headers,
  });

  if (!recommendation.response.ok) {
    throw new Error(`Falha ao carregar recomendacao oficial (${recommendation.response.status}).`);
  }

  const home = await requestJson(`${API_BASE_URL}/api/home`, {
    method: 'GET',
    headers,
  });

  if (!home.response.ok) {
    throw new Error(`Falha ao carregar home oficial (${home.response.status}).`);
  }

  return {
    onboarding: onboarding.payload,
    recommendation: recommendation.payload,
    home: home.payload,
  };
};

const createStaticProxyServer = async () => {
  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', BASE_URL);

      if (requestUrl.pathname.startsWith('/api/')) {
        const upstreamUrl = new URL(requestUrl.pathname + requestUrl.search, API_BASE_URL);
        const bodyChunks = [];
        for await (const chunk of req) {
          bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        const upstream = await fetch(upstreamUrl, {
          method: req.method,
          headers: Object.fromEntries(
            Object.entries(req.headers)
              .filter(([key, value]) => value != null && key.toLowerCase() !== 'host')
              .map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : String(value)]),
          ),
          body: ['GET', 'HEAD'].includes(String(req.method || 'GET').toUpperCase())
            ? undefined
            : bodyChunks.length > 0
              ? Buffer.concat(bodyChunks)
              : undefined,
          duplex: ['GET', 'HEAD'].includes(String(req.method || 'GET').toUpperCase()) ? undefined : 'half',
          redirect: 'manual',
        });

        const upstreamHeaders = Object.fromEntries(upstream.headers.entries());
        const upstreamBodyText = await upstream.text();
        const upstreamBodyBuffer = Buffer.from(upstreamBodyText, 'utf8');
        let parsedPreview = null;

        try {
          parsedPreview = JSON.parse(upstreamBodyText);
        } catch {
          parsedPreview = upstreamBodyText.slice(0, 500);
        }

        apiTraffic.push({
          method: String(req.method || 'GET').toUpperCase(),
          path: requestUrl.pathname,
          status: upstream.status,
          at: new Date().toISOString(),
          preview: parsedPreview,
        });

        delete upstreamHeaders['content-encoding'];
        delete upstreamHeaders['content-length'];
        delete upstreamHeaders['transfer-encoding'];
        upstreamHeaders['content-length'] = String(upstreamBodyBuffer.length);

        res.writeHead(upstream.status, upstreamHeaders);
        res.end(upstreamBodyBuffer);
        return;
      }

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
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: String(error) }));
    }
  });

  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  return server;
};

const buildSeededUserData = () => ({
  weekProgress: {
    domingo: { studied: false, minutes: 0 },
    segunda: { studied: true, minutes: 65 },
    terca: { studied: false, minutes: 0 },
    quarta: { studied: true, minutes: 45 },
    quinta: { studied: false, minutes: 0 },
    sexta: { studied: false, minutes: 0 },
    sabado: { studied: false, minutes: 0 },
  },
  completedTopics: {},
  totalPoints: 1100,
  streak: 2,
  bestStreak: 4,
  achievements: [],
  level: 3,
  studyHistory: [],
  dailyGoal: 90,
  sessions: [],
  currentStreak: 2,
});

const toDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getWeekdayKey = (date = new Date()) => (
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()]
);

const buildSeededWeeklySchedule = ({ subjectLabel, date = new Date() }) => {
  const todayKey = getWeekdayKey(date);
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
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  };

  weekPlan[todayKey] = { subjectLabels: [subjectLabel] };
  availability[todayKey] = true;

  return {
    weekPlan,
    availability,
    preferences: {
      defaultSessionDurationMinutes: 25,
      sessionsPerDay: 1,
      weeklyGoalSessions: 4,
    },
    updatedAt: new Date().toISOString(),
  };
};

const buildSeededScheduleEntries = ({ subject, topic, date = new Date() }) => ([
  {
    id: 'qa-study-home-entry',
    date: toDateKey(date),
    subject,
    topic,
    done: false,
    status: 'pendente',
    studyType: 'questoes',
    source: 'ia',
    note: 'Sessao oficial planejada para o smoke local.',
  },
]);

const createSeedScript = ({
  email,
  supabaseUrl,
  browserSessionPayload,
  displayName,
  weeklySchedule,
  scheduleEntries,
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const authStorageKey = buildAuthStorageKey(supabaseUrl);
  const userDataKey = `zeroBaseData_${normalizedEmail}`;
  const weeklyGoalKey = `weeklyGoalMinutes_${normalizedEmail}`;
  const activeStudyModeKey = `activeStudyMode_${normalizedEmail}`;
  const profileDisplayNameKey = `profileDisplayName_${normalizedEmail}`;
  const weeklyScheduleKey = `weeklyStudySchedule_${normalizedEmail}`;
  const smokeSeedKey = `study-home-contract-seeded_${normalizedEmail}`;
  const phaseOverrideKey = 'zb_phase_override';

  return `
    (() => {
      try {
        if (window.localStorage.getItem(${JSON.stringify(smokeSeedKey)}) === 'true') {
          return;
        }

        window.localStorage.clear();
        window.localStorage.setItem(${JSON.stringify(`mdzOnboardingCompleted_${normalizedEmail}`)}, 'true');
        window.localStorage.setItem(${JSON.stringify(profileDisplayNameKey)}, ${JSON.stringify(displayName)});
        window.localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(browserSessionPayload))});
        window.localStorage.setItem(${JSON.stringify(userDataKey)}, ${JSON.stringify(JSON.stringify(buildSeededUserData()))});
        window.localStorage.setItem(${JSON.stringify(weeklyScheduleKey)}, ${JSON.stringify(JSON.stringify(weeklySchedule))});
        window.localStorage.setItem('mdz_study_schedule', ${JSON.stringify(JSON.stringify(scheduleEntries))});
        window.localStorage.setItem(${JSON.stringify(weeklyGoalKey)}, '900');
        window.localStorage.setItem(${JSON.stringify(activeStudyModeKey)}, 'pomodoro');
        window.localStorage.setItem(${JSON.stringify(phaseOverrideKey)}, ${JSON.stringify(JSON.stringify('intermediate'))});
        window.localStorage.setItem(${JSON.stringify(smokeSeedKey)}, 'true');
      } catch (error) {
        console.error('study-home-smoke-seed-failed', error);
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

const waitFor = async (session, predicateExpression, { timeoutMs = 30000, intervalMs = 150, label = 'condicao' } = {}) => {
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
      ${BROWSER_NORMALIZE}
      const body = normalize(document.body?.innerText || '');
      return body.includes(${JSON.stringify(normalize(text))});
    })()`,
    { ...options, label: `texto "${text}"` },
  );

const waitForAnyText = async (session, texts, options = {}) =>
  waitFor(
    session,
    `(() => {
      ${BROWSER_NORMALIZE}
      const body = normalize(document.body?.innerText || '');
      return ${JSON.stringify(texts.map(normalize))}.some((entry) => body.includes(entry));
    })()`,
    { ...options, label: `um dos textos: ${texts.join(', ')}` },
  );

const textExists = async (session, text) =>
  evalInPage(
    session,
    `(() => {
      ${BROWSER_NORMALIZE}
      const body = normalize(document.body?.innerText || '');
      return body.includes(${JSON.stringify(normalize(text))});
    })()`,
  );

const clickByText = async (session, text, { exact = false } = {}) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      ${BROWSER_NORMALIZE}
      const target = ${JSON.stringify(normalize(text))};
      const nodes = Array.from(document.querySelectorAll('button, a, [role="button"]'));
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

const dismissIfPresent = async (session, text, options = {}) => {
  if (await textExists(session, text)) {
    await clickByText(session, text, options).catch(() => undefined);
    await delay(250);
  }
};

const closeKnownOverlays = async (session) => {
  await evalInPage(
    session,
    `(() => {
      ${BROWSER_NORMALIZE}
      const clickButtonWithin = (root, label) => {
        const target = Array.from(root.querySelectorAll('button'))
          .find((button) => normalize(button.textContent || '') === label);
        target?.click();
        return Boolean(target);
      };

      const phaseOverlay = Array.from(document.querySelectorAll('div, section, aside'))
        .find((element) => normalize(element.textContent || '').includes('modo interno simulacao de fase'));
      if (phaseOverlay) {
        clickButtonWithin(phaseOverlay, 'fechar');
        phaseOverlay.remove();
      }

      const notificationOverlay = Array.from(document.querySelectorAll('[role="alertdialog"], div, section, aside'))
        .find((element) => normalize(element.textContent || '').includes('ativar lembretes de estudo'));
      if (notificationOverlay) {
        clickButtonWithin(notificationOverlay, 'agora nao');
        const closeButton = notificationOverlay.querySelector('button[aria-label="Fechar"]');
        if (closeButton instanceof HTMLElement) {
          closeButton.click();
        }
        notificationOverlay.remove();
      }

      return true;
    })()`,
  );

  await waitFor(
    session,
    `(() => {
      ${BROWSER_NORMALIZE}
      const body = normalize(document.body?.innerText || '');
      return !body.includes('modo interno simulacao de fase')
        && !body.includes('ativar lembretes de estudo');
    })()`,
    { timeoutMs: 5000, intervalMs: 100, label: 'overlays conhecidos fechados' },
  ).catch(() => undefined);

  await delay(250);
};

const getButtonTexts = async (session) =>
  evalInPage(
    session,
    `(() => {
      ${BROWSER_NORMALIZE}
      return Array.from(document.querySelectorAll('button'))
        .map((button) => normalize(button.textContent || ''))
        .filter(Boolean);
    })()`,
  );

const getStudyNowCardButtons = async (session) =>
  evalInPage(
    session,
    `(() => {
      ${BROWSER_NORMALIZE}
      const sections = Array.from(document.querySelectorAll('section'));
      const card = sections.find((section) => {
        const buttons = Array.from(section.querySelectorAll('button'))
          .map((button) => normalize(button.textContent || ''))
          .filter(Boolean);
        return buttons.includes('abrir cronograma')
          && buttons.some((label) => label.includes('estudar agora') || label.includes('continuar agora'));
      });
      if (!card) return [];
      return Array.from(card.querySelectorAll('button'))
        .map((button) => normalize(button.textContent || ''))
        .filter(Boolean);
    })()`,
  );

const getStudyNowCardDiagnostics = async (session) =>
  evalInPage(
    session,
    `(() => {
      ${BROWSER_NORMALIZE}
      return Array.from(document.querySelectorAll('section')).map((section) => ({
        text: normalize(section.textContent || '').slice(0, 240),
        buttons: Array.from(section.querySelectorAll('button'))
          .map((button) => normalize(button.textContent || ''))
          .filter(Boolean),
      })).filter((entry) =>
        entry.text.includes('para estudar agora')
        || entry.text.includes('sessao curta oficial')
        || entry.text.includes('sessao curta em andamento')
        || entry.buttons.includes('abrir cronograma')
        || entry.buttons.some((label) => label.includes('estudar agora') || label.includes('continuar agora'))
      );
    })()`,
  );

const clickStudyNowCardCta = async (session) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      ${BROWSER_NORMALIZE}
      const sections = Array.from(document.querySelectorAll('section'));
      const card = sections.find((section) => {
        const buttons = Array.from(section.querySelectorAll('button'))
          .map((button) => normalize(button.textContent || ''))
          .filter(Boolean);
        return buttons.includes('abrir cronograma')
          && buttons.some((label) => label.includes('estudar agora') || label.includes('continuar agora'));
      });
      if (!card) return false;
      const buttons = Array.from(card.querySelectorAll('button'));
      const target = buttons.find((button) => {
        const label = normalize(button.textContent || '');
        return label.includes('estudar agora') || label.includes('continuar agora');
      });
      if (!target) return false;
      target.scrollIntoView({ block: 'center', inline: 'center' });
      target.click();
      return true;
    })()`,
  );

  if (!clicked) {
    const labels = await getStudyNowCardButtons(session);
    const diagnostics = await getStudyNowCardDiagnostics(session);
    throw new Error(`CTA do card nao encontrado. Botoes do card: ${labels.join(' | ')} | diagnostico: ${JSON.stringify(diagnostics)}`);
  }
};

const clickFirstQuestionOption = async (session) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      ${BROWSER_NORMALIZE}
      const optionButtons = Array.from(document.querySelectorAll('button'))
        .filter((button) => /^[abcde]\\./.test(normalize(button.textContent || '')));
      const target = optionButtons[0];
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      target.scrollIntoView({ block: 'center', inline: 'center' });
      target.click();
      return normalize(target.textContent || '');
    })()`,
  );

  if (!clicked) {
    throw new Error('Nenhuma alternativa clicavel encontrada na sessao oficial.');
  }

  return clicked;
};

const answerEntireOfficialSession = async (session, totalQuestions = 5) => {
  const answers = [];

  for (let index = 0; index < totalQuestions; index += 1) {
    if (await textExists(session, 'Sessao pronta para finalizar')) {
      break;
    }

    await waitForText(session, `Questao ${index + 1} de`, { timeoutMs: 30000 });
    answers.push(await clickFirstQuestionOption(session));
    await delay(700);
  }

  await waitForText(session, 'Sessao pronta para finalizar', { timeoutMs: 30000 });
  return answers;
};

const getLocalScheduleEntries = async (session) =>
  evalInPage(
    session,
    `(() => {
      try {
        return JSON.parse(window.localStorage.getItem('mdz_study_schedule') || '[]');
      } catch {
        return [];
      }
    })()`,
  );

const getLocalStorageJson = async (session, key) =>
  evalInPage(
    session,
    `(() => {
      try {
        const raw = window.localStorage.getItem(${JSON.stringify(key)});
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })()`,
  );

const getPersistedStudyLoopState = async (session, email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const [userData, beginnerState, beginnerPlan, beginnerStats] = await Promise.all([
    getLocalStorageJson(session, `zeroBaseData_${normalizedEmail}`),
    getLocalStorageJson(session, `beginnerState_${normalizedEmail}`),
    getLocalStorageJson(session, `beginnerPlan_${normalizedEmail}`),
    getLocalStorageJson(session, `beginnerStats_${normalizedEmail}`),
  ]);

  return {
    userData,
    beginnerState,
    beginnerPlan,
    beginnerStats,
  };
};

const getBodyTextExcerpt = async (session, limit = 1200) =>
  evalInPage(
    session,
    `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}))()`,
  );

const getSessionPageDiagnostics = async (session) =>
  evalInPage(
    session,
    `(() => {
      ${BROWSER_NORMALIZE}
      const heading = document.querySelector('h1')?.textContent || '';
      const prompts = Array.from(document.querySelectorAll('h2'))
        .map((node) => normalize(node.textContent || ''))
        .filter(Boolean);
      const optionButtons = Array.from(document.querySelectorAll('button'))
        .map((button) => normalize(button.textContent || ''))
        .filter((label) => /^[abcde]\\./.test(label));

      return {
        heading: normalize(heading),
        prompts,
        optionButtons,
      };
    })()`,
  );

const screenshot = async (session, fileName) => {
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });

  await fs.writeFile(path.join(ARTIFACTS_DIR, fileName), Buffer.from(data, 'base64'));
};

const main = async () => {
  await ensureArtifactsDir();

  if (!(await fileExists(path.join(DIST_DIR, 'index.html')))) {
    throw new Error('dist/index.html nao existe. Rode o build antes do smoke.');
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

  if (!publishableKey || !serviceRoleKey || !supabaseUrl) {
    throw new Error('Credenciais Supabase ausentes para o smoke da home oficial.');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    apiBaseUrl: API_BASE_URL,
    apiTraffic,
    steps: [],
  };

  const recordStep = (name, status, details = {}) => {
    report.steps.push({ name, status, ...details });
  };

  const server = await createStaticProxyServer();
  const cleanupUserIds = [];
  let browser = null;

  try {
    const email = `e2e_study_home_${Date.now()}@zerobase.dev`;
    const password = 'StudyHome@2026';
    const displayName = 'QA Study Home';
    const createdUser = await createTempConfirmedUser(
      supabaseUrl,
      serviceRoleKey,
      email,
      password,
      displayName,
    );
    const userId = createdUser.user?.id || createdUser.id || null;
    cleanupUserIds.push(userId);
    const seededWeeklySchedule = buildSeededWeeklySchedule({ subjectLabel: 'Matematica' });
    const seededScheduleEntries = buildSeededScheduleEntries({
      subject: 'Matematica',
      topic: 'Porcentagem',
    });

    const browserSessionPayload = await createBrowserSessionPayload(
      supabaseUrl,
      publishableKey,
      email,
      password,
    );

    const setup = await setupOfficialStudyContext({
      accessToken: browserSessionPayload.access_token,
    });

    recordStep('official_contract_seeded', 'passed', {
      discipline: setup.recommendation?.recommendation?.disciplineName || null,
      topic: setup.recommendation?.recommendation?.topicName || null,
    });

    browser = await launchChrome(10650 + Math.floor(Math.random() * 100));
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createSeedScript({
        email,
        supabaseUrl,
        browserSessionPayload,
        displayName,
        weeklySchedule: seededWeeklySchedule,
        scheduleEntries: [],
      }),
    });

    await browser.session.send('Page.navigate', { url: `${BASE_URL}?tab=cronograma` });
    await waitFor(browser.session, 'document.readyState === "complete"', { label: 'load complete' });
    await waitForAnyText(browser.session, ['Cronograma', 'Organize sua semana', 'Monte sua semana de estudo', 'Hoje em execucao'], { timeoutMs: 30000 });
    await closeKnownOverlays(browser.session);
    await waitForText(browser.session, 'Hoje em execucao', { timeoutMs: 30000 });
    await waitFor(
      browser.session,
      `(() => {
        ${BROWSER_NORMALIZE}
        const sections = Array.from(document.querySelectorAll('section'));
        return sections.some((section) => {
          const content = normalize(section.textContent || '');
          const buttons = Array.from(section.querySelectorAll('button'))
            .map((button) => normalize(button.textContent || ''))
            .filter(Boolean);
          return content.includes('hoje em execucao')
            && content.includes('pendente')
            && buttons.some((label) => label.includes('estudar agora') || label.includes('continuar agora'));
        });
      })()`,
      { timeoutMs: 30000, label: 'card de hoje no cronograma pronto para clique' },
    );
    await screenshot(browser.session, 'schedule-today-card.png');
    recordStep('today_schedule_card_real', 'passed', {
      screenshot: 'qa-artifacts/schedule-today-card.png',
    });

    const scheduleEntriesAfterSync = await getLocalScheduleEntries(browser.session);
    const syncedTodayEntry = scheduleEntriesAfterSync.find((entry) =>
      normalize(entry.subject) === normalize(setup.recommendation?.recommendation?.disciplineName || '')
      && normalize(entry.topic) === normalize(setup.recommendation?.recommendation?.topicName || '')
      && entry.date === toDateKey(),
    ) || null;
    if (!syncedTodayEntry || syncedTodayEntry.status !== 'pendente') {
      throw new Error(`Cronograma nao sincronizou o bloco oficial de hoje: ${JSON.stringify(scheduleEntriesAfterSync)}`);
    }
    recordStep('today_schedule_syncs_official_entry', 'passed', {
      syncedTodayEntry,
    });

    const cronogramaExcerptBeforeStart = await getBodyTextExcerpt(browser.session);
    await clickByText(browser.session, 'Estudar agora', { exact: true });
    await delay(1200);
    const sessionPageDiagnostics = await getSessionPageDiagnostics(browser.session);
    await waitForText(browser.session, 'Sessao oficial', { timeoutMs: 30000 });
    await waitForText(browser.session, 'Questao 1 de', { timeoutMs: 30000 });
    await waitFor(
      browser.session,
      `(() => {
        ${BROWSER_NORMALIZE}
        return Array.from(document.querySelectorAll('button')).some((button) => /^[abcde]\\./.test(normalize(button.textContent || '')));
      })()`,
      { timeoutMs: 30000, label: 'opcoes da questao oficial' },
    );
    await screenshot(browser.session, 'schedule-today-session.png');
    recordStep('today_schedule_cta_opens_real_session', 'passed', {
      screenshot: 'qa-artifacts/schedule-today-session.png',
      cronogramaExcerptBeforeStart,
      sessionPageDiagnostics,
    });

    const answeredOptions = await answerEntireOfficialSession(browser.session, 5);
    await screenshot(browser.session, 'schedule-today-session-complete.png');
    recordStep('official_session_answers_recorded', 'passed', {
      answeredOptions,
      screenshot: 'qa-artifacts/schedule-today-session-complete.png',
    });

    await clickByText(browser.session, 'Ver resultado');
    await waitForText(browser.session, 'Sessao concluida com dados reais', { timeoutMs: 30000 });
    await screenshot(browser.session, 'schedule-today-result.png');
    recordStep('official_session_result_persisted', 'passed', {
      screenshot: 'qa-artifacts/schedule-today-result.png',
    });

    await clickByText(browser.session, 'Voltar para inicio');
    await waitForText(browser.session, 'Para estudar agora', { timeoutMs: 30000 });
    await waitFor(
      browser.session,
      `(() => {
        ${BROWSER_NORMALIZE}
        const body = normalize(document.body?.innerText || '');
        return !body.includes('sessao curta em andamento') && !body.includes('continuar agora');
      })()`,
      { timeoutMs: 30000, label: 'home sem sessao ativa apos conclusao' },
    );
    await waitFor(
      browser.session,
      `(() => {
        ${BROWSER_NORMALIZE}
        const body = normalize(document.body?.innerText || '');
        return body.includes('meta semanal: 1/360 min') && !body.includes('carregando sua sessao oficial');
      })()`,
      { timeoutMs: 30000, label: 'home oficial atualizada apos conclusao' },
    );
    const postFinishHomeExcerpt = await getBodyTextExcerpt(browser.session);
    await screenshot(browser.session, 'schedule-today-home-after-finish.png');
    recordStep('home_reflects_official_completion', 'passed', {
      screenshot: 'qa-artifacts/schedule-today-home-after-finish.png',
      postFinishHomeExcerpt,
    });

    const persistedProgressAfterFinish = await getPersistedStudyLoopState(browser.session, email);
    const persistedSessions =
      persistedProgressAfterFinish.userData?.sessions
      || persistedProgressAfterFinish.userData?.studyHistory
      || [];
    const persistedMinutes = Object.values(persistedProgressAfterFinish.userData?.weekProgress || {})
      .reduce((sum, entry) => sum + (Number(entry?.minutes) || 0), 0);
    const firstMissionStatus = persistedProgressAfterFinish.beginnerPlan?.missions?.[0]?.status || null;
    if (persistedSessions.length < 1 || persistedMinutes < 1) {
      throw new Error(`Progresso local nao refletiu a sessao oficial: ${JSON.stringify(persistedProgressAfterFinish)}`);
    }
    if ((persistedProgressAfterFinish.beginnerStats?.sessionsCompleted || 0) < 1) {
      throw new Error(`Beginner stats nao registraram a sessao oficial: ${JSON.stringify(persistedProgressAfterFinish.beginnerStats)}`);
    }
    if (firstMissionStatus !== 'completed') {
      throw new Error(`Plano guiado nao avancou apos a sessao oficial: ${JSON.stringify(persistedProgressAfterFinish.beginnerPlan)}`);
    }
    recordStep('progress_reflects_official_completion', 'passed', {
      persistedSessions: persistedSessions.length,
      persistedMinutes,
      beginnerState: persistedProgressAfterFinish.beginnerState,
      beginnerSessionsCompleted: persistedProgressAfterFinish.beginnerStats?.sessionsCompleted || 0,
      firstMissionStatus,
    });

    const scheduleEntriesAfterFinish = await getLocalScheduleEntries(browser.session);
    const completedScheduleEntry = scheduleEntriesAfterFinish.find((entry) =>
      normalize(entry.subject) === normalize(setup.recommendation?.recommendation?.disciplineName || '')
      && normalize(entry.topic) === normalize(setup.recommendation?.recommendation?.topicName || '')
      && entry.date === toDateKey(),
    ) || null;
    if (!completedScheduleEntry?.done || completedScheduleEntry.status !== 'concluido') {
      throw new Error(`Cronograma nao refletiu conclusao da sessao: ${JSON.stringify(scheduleEntriesAfterFinish)}`);
    }
    recordStep('schedule_reflects_official_completion', 'passed', {
      completedScheduleEntry,
    });

    await browser.session.send('Page.navigate', { url: `${BASE_URL}?tab=cronograma` });
    await waitFor(browser.session, 'document.readyState === "complete"', { label: 'cronograma reload apos conclusao' });
    await waitForText(browser.session, 'Hoje em execucao', { timeoutMs: 30000 });
    await waitFor(
      browser.session,
      `(() => {
        ${BROWSER_NORMALIZE}
        const body = normalize(document.body?.innerText || '');
        return body.includes('hoje em execucao')
          && body.includes('concluido')
          && body.includes('refletido no cronograma');
      })()`,
      { timeoutMs: 30000, label: 'cronograma com status concluido apos sessao' },
    );
    const cronogramaExcerptAfterFinish = await getBodyTextExcerpt(browser.session);
    await screenshot(browser.session, 'schedule-today-cronograma-after-finish.png');
    recordStep('today_schedule_card_reflects_completion', 'passed', {
      screenshot: 'qa-artifacts/schedule-today-cronograma-after-finish.png',
      cronogramaExcerptAfterFinish,
    });

    await browser.session.send('Page.reload');
    await waitFor(browser.session, 'document.readyState === "complete"', { label: 'reload complete' });
    await waitForAnyText(browser.session, ['Cronograma', 'Hoje em execucao', 'Monte sua semana de estudo'], { timeoutMs: 30000 });
    await waitForText(browser.session, 'Hoje em execucao', { timeoutMs: 30000 });
    await waitFor(
      browser.session,
      `(() => {
        ${BROWSER_NORMALIZE}
        const body = normalize(document.body?.innerText || '');
        return body.includes('hoje em execucao')
          && body.includes('concluido')
          && body.includes('refletido no cronograma');
      })()`,
      { timeoutMs: 30000, label: 'cronograma persistido apos reload' },
    );
    const persistedProgressAfterReload = await getPersistedStudyLoopState(browser.session, email);
    const reloadedSessions =
      persistedProgressAfterReload.userData?.sessions
      || persistedProgressAfterReload.userData?.studyHistory
      || [];
    if (reloadedSessions.length < 1 || (persistedProgressAfterReload.beginnerStats?.sessionsCompleted || 0) < 1) {
      throw new Error(`Reload perdeu o progresso da sessao oficial: ${JSON.stringify(persistedProgressAfterReload)}`);
    }
    const scheduleEntriesAfterReload = await getLocalScheduleEntries(browser.session);
    const persistedScheduleEntry = scheduleEntriesAfterReload.find((entry) =>
      normalize(entry.subject) === normalize(setup.recommendation?.recommendation?.disciplineName || '')
      && normalize(entry.topic) === normalize(setup.recommendation?.recommendation?.topicName || '')
      && entry.date === toDateKey(),
    ) || null;
    if (!persistedScheduleEntry?.done || persistedScheduleEntry.status !== 'concluido') {
      throw new Error(`Reload perdeu o estado concluido do cronograma: ${JSON.stringify(scheduleEntriesAfterReload)}`);
    }
    recordStep('reload_keeps_today_schedule_completion', 'passed', {
      persistedSessions: reloadedSessions.length,
      beginnerState: persistedProgressAfterReload.beginnerState,
      beginnerSessionsCompleted: persistedProgressAfterReload.beginnerStats?.sessionsCompleted || 0,
      persistedScheduleEntry,
    });

    report.summary = {
      passed: report.steps.filter((step) => step.status === 'passed').length,
      failed: 0,
    };
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    report.failureScreenshot = 'qa-artifacts/schedule-today-failure.png';
    if (browser) {
      await screenshot(browser.session, 'schedule-today-failure.png').catch(() => undefined);
    }
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }

    await new Promise((resolve) => server.close(resolve));

    for (const userId of cleanupUserIds) {
      await deleteTempUser(supabaseUrl, serviceRoleKey, userId);
    }
  }
};

main().catch(async (error) => {
  await ensureArtifactsDir();
  console.error(error);
  process.exit(1);
});
