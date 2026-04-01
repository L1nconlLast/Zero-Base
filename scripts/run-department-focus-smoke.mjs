import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'department-focus-smoke-report.json');
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

const ENEM_DISPLAY_BY_INTERNAL_SUBJECT = {
  Anatomia: 'Matemática',
  Fisiologia: 'Linguagens',
  Farmacologia: 'Humanas',
  Patologia: 'Natureza',
  'Bioquímica': 'Redação',
  Histologia: 'Atualidades',
  Outra: 'Outras',
};
const KNOWN_DISCIPLINE_LABELS = Object.values(ENEM_DISPLAY_BY_INTERNAL_SUBJECT);

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

  throw new Error('Nenhum Chrome/Edge encontrado para o smoke de departamento.');
};

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-department-focus-'));
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
    close: async () => {
      try {
        await session.close();
      } catch {
        // ignore
      }

      if (chrome.exitCode === null) {
        chrome.kill();
        await waitForChromeExit(2000);
      }

      await delay(300);

      try {
        await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch {
        // ignore
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
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const authStorageKey = buildAuthStorageKey(supabaseUrl);
  const seededUserData = buildSeededUserData();
  const weeklySchedule = buildWeeklySchedule(['Matematica']);
  const smokeSeedKey = '__department_focus_smoke_seeded__';
  const initialStudyExecutionState = {
    currentBlock: {
      subject: 'Matematica',
      topicName: 'Porcentagem',
      objective: 'Executar o bloco principal do plano de hoje.',
      type: 'focus',
      duration: 25,
      targetQuestions: 10,
    },
    recommendedMethodId: 'pomodoro',
    source: 'ai',
    updatedAt: new Date().toISOString(),
  };

  return `
    (() => {
      try {
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
          ${JSON.stringify(`academyCompletedContentIds_${normalizedEmail}`)},
          ${JSON.stringify(`study-timer-session_${normalizedEmail}`)},
          ${JSON.stringify(`pomodoro-session_${normalizedEmail}`)},
          ${JSON.stringify(smokeSeedKey)},
        ];

        removeKeys.forEach((key) => window.localStorage.removeItem(key));

        window.localStorage.setItem(${JSON.stringify(`mdzOnboardingCompleted_${normalizedEmail}`)}, 'true');
        window.localStorage.setItem(${JSON.stringify(`zeroBaseData_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(seededUserData))});
        window.localStorage.setItem(${JSON.stringify(`profileDisplayName_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify('QA Departamento'))});
        window.localStorage.setItem(${JSON.stringify(`preferredStudyTrack_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify('enem'))});
        window.localStorage.setItem(${JSON.stringify(`selectedStudyMethodId_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify('pomodoro'))});
        window.localStorage.setItem(${JSON.stringify(`plannedFocusDuration_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(25))});
        window.localStorage.setItem(${JSON.stringify(`activeStudyMode_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify('livre'))});
        window.localStorage.setItem(${JSON.stringify(`weeklyStudySchedule_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(weeklySchedule))});
        window.localStorage.setItem(${JSON.stringify(`studyExecutionState_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify(initialStudyExecutionState))});
        window.localStorage.setItem(${JSON.stringify(`academyCompletedContentIds_${normalizedEmail}`)}, ${JSON.stringify(JSON.stringify([]))});
        window.localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(browserSessionPayload))});
        window.localStorage.setItem('zb_internal_access', 'true');
        window.localStorage.setItem('zb_phase_override', ${JSON.stringify(JSON.stringify('intermediate'))});
        window.localStorage.setItem(${JSON.stringify(smokeSeedKey)}, 'true');
      } catch (error) {
        console.error('department-focus-smoke-seed-failed', error);
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

const waitForSelector = async (session, selector, options = {}) =>
  waitFor(
    session,
    `(() => Boolean(document.querySelector(${JSON.stringify(selector)})))()`,
    { ...options, label: `selector ${selector}` },
  );

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

const screenshot = async (session, fileName) => {
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  await fs.writeFile(path.join(ARTIFACTS_DIR, `${fileName}.png`), Buffer.from(data, 'base64'));
};

const closeOptionalOverlays = async (session) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let changed = false;

    const hasAgoraNao = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'agora nao');
      })()`,
    );

    if (hasAgoraNao) {
      await evalInPage(
        session,
        `(() => {
          const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
          const button = Array.from(document.querySelectorAll('button')).find((candidate) => normalize(candidate.textContent || '') === 'agora nao');
          if (!button) return false;
          button.click();
          return true;
        })()`,
      );
      await delay(250);
      changed = true;
    }

    const hasFechar = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        const body = normalize(document.body?.innerText || '');
        return body.includes('modo interno')
          && Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'fechar');
      })()`,
    );

    if (hasFechar) {
      await evalInPage(
        session,
        `(() => {
          const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
          const button = Array.from(document.querySelectorAll('button')).find((candidate) => normalize(candidate.textContent || '') === 'fechar');
          if (!button) return false;
          button.click();
          return true;
        })()`,
      );
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

      if (
        body.includes('fluxo principal')
        || body.includes('atalho do dia')
        || body.includes('comecar agora')
        || body.includes('estudar agora')
      ) {
        return true;
      }

      const shellLabels = [
        'configuracoes',
        'inicio',
        'plano',
        'estudo',
        'revisoes',
        'simulados',
        'mentor ia',
        'mais no app',
      ];

      return Array.from(document.querySelectorAll('button, a, [role="button"]')).some((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        const label = normalize(candidate.textContent || '');
        return shellLabels.some((candidateLabel) => label === candidateLabel || label.includes(candidateLabel));
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

const waitForDepartmentPage = async (session) => {
  await waitForText(session, 'Seu foco hoje', { timeoutMs: 20000 });
  await waitForText(session, 'Disciplina em foco', { timeoutMs: 20000 });
};

const clickDepartmentCardByLabel = async (session, disciplineLabel) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(disciplineLabel)});
      const buttons = Array.from(document.querySelectorAll('button'));
      const match = buttons.find((button) => {
        const rect = button.getBoundingClientRect();
        const style = window.getComputedStyle(button);
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return normalize(button.innerText || '').includes(target);
      });

      if (!match) return false;
      match.scrollIntoView({ block: 'center', inline: 'center' });
      match.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error(`Nao encontrei o card clicavel da disciplina ${disciplineLabel}.`);
  }
};

const waitForFocusedDisciplinePanel = async (session, disciplineLabel) =>
  waitFor(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const marker = Array.from(document.querySelectorAll('p')).find((node) => normalize(node.textContent || '') === 'disciplina em foco');
      if (!marker || !marker.parentElement) return false;
      const paragraphs = Array.from(marker.parentElement.querySelectorAll('p'));
      const activeLabel = normalize(paragraphs[1]?.textContent || '');
      return activeLabel === normalize(${JSON.stringify(disciplineLabel)});
    })()`,
    { timeoutMs: 10000, label: `painel da disciplina ${disciplineLabel}` },
  );

const clickLastStudyNowButton = async (session) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const matches = Array.from(document.querySelectorAll('button')).filter((button) => normalize(button.textContent || '') === 'estudar agora');
      const match = matches[matches.length - 1];
      if (!match) return false;
      match.scrollIntoView({ block: 'center', inline: 'center' });
      match.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error('Nao encontrei o CTA final de Estudar agora na disciplina em foco.');
  }
};

const getTimerState = async (session) =>
  evalInPage(
    session,
    `(() => {
      const root = document.querySelector('[data-testid="study-pomodoro-timer-ready"]') || document.querySelector('[data-testid="study-free-timer-ready"]');
      if (!root) {
        return null;
      }

      const timer = root.querySelector('.font-mono');
      return {
        rootTestId: root.getAttribute('data-testid'),
        status: root.getAttribute('data-study-session-status'),
        text: String(root.innerText || '').replace(/\\s+/g, ' ').trim(),
        display: String(timer?.textContent || '').trim(),
      };
    })()`,
  );

const getDisplayedFocusLabel = async (session) =>
  evalInPage(
    session,
    `(() => {
      const root = document.querySelector('[data-testid="study-pomodoro-timer-ready"]') || document.querySelector('[data-testid="study-free-timer-ready"]');
      if (!root) {
        return null;
      }

      const normalize = (value) =>
        String(value || '')
          .normalize('NFD')
          .replace(/[\\u0300-\\u036f]/g, '')
          .toLowerCase()
          .replace(/\\s+/g, ' ')
          .trim();
      const denormalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
      const text = denormalize(root.innerText || '');
      const lines = text
        .split(/\\n+/)
        .map((line) => denormalize(line))
        .filter(Boolean);

      const blockLine = lines.find((line) => /^bloco atual:/i.test(line));
      if (blockLine) {
        return blockLine.replace(/^bloco atual:\\s*/i, '').trim();
      }

      const focusLine = lines.find((line) => /^agora e foco:/i.test(line) || /^agora é foco:/i.test(line));
      if (focusLine) {
        return focusLine
          .replace(/^agora e foco:\\s*/i, '')
          .replace(/^agora é foco:\\s*/i, '')
          .replace(/\\s*\\([^)]*\\)\\s*$/, '')
          .trim();
      }

      const normalizedText = normalize(text);
      const matches = ${JSON.stringify(KNOWN_DISCIPLINE_LABELS)}.filter((label) =>
        normalizedText.includes(normalize(label)),
      );

      if (matches.length > 0) {
        return matches[0];
      }

      const bodyMatches = ${JSON.stringify(KNOWN_DISCIPLINE_LABELS)}.filter((label) => {
        const bodyText = normalize(document.body?.innerText || '');
        return bodyText.includes(normalize(label));
      });

      if (bodyMatches.length > 0) {
        return bodyMatches[0];
      }

      return null;
    })()`,
  );

const getPersistedSessionSnapshot = async (session, email) =>
  evalInPage(
    session,
    `(() => {
      const keys = [
        ${JSON.stringify(`pomodoro-session_${email.toLowerCase()}`)},
        ${JSON.stringify(`study-timer-session_${email.toLowerCase()}`)},
      ];

      for (const key of keys) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          return {
            storageKey: key,
            status: parsed.status,
            source: parsed.source,
            subject: parsed.subject,
            plannedDurationMs: parsed.plannedDurationMs,
          };
        } catch {
          return {
            storageKey: key,
            parseFailed: true,
          };
        }
      }

      return null;
    })()`,
  );

const assertFocusScenario = async ({
  session,
  baseUrl,
  loginEmail,
  supabaseUrl,
  browserSessionPayload,
  disciplineLabel,
  expectedInternalSubject,
}) => {
  await navigate(session, baseUrl);
  await evalInPage(
    session,
    createSeedScript({
      email: loginEmail,
      supabaseUrl,
      browserSessionPayload,
    }),
  );
  await navigate(session, baseUrl);
  await closeOptionalOverlays(session);
  await waitForAuthenticatedShell(session);

  const forced = await forceAppTab(session, 'departamento');
  if (!forced) {
    throw new Error('Nao consegui forcar a aba departamento pela arvore React.');
  }

  await waitForDepartmentPage(session);
  await clickDepartmentCardByLabel(session, disciplineLabel);
  await waitForFocusedDisciplinePanel(session, disciplineLabel);
  await clickLastStudyNowButton(session);

  await waitForSelector(session, '[data-testid="study-focus-container"]', { timeoutMs: 15000 });
  await waitFor(
    session,
    `(() => {
      const root = document.querySelector('[data-testid="study-pomodoro-timer-ready"]') || document.querySelector('[data-testid="study-free-timer-ready"]');
      return root?.getAttribute('data-study-session-status') === 'running';
    })()`,
    { timeoutMs: 10000, label: `timer rodando para ${disciplineLabel}` },
  );

  const initialTimerState = await getTimerState(session);
  if (!initialTimerState) {
    throw new Error(`Nao encontrei o timer apos iniciar ${disciplineLabel}.`);
  }

  if (!normalize(initialTimerState.text).includes(normalize(disciplineLabel))) {
    throw new Error(
      `Foco abriu com label incorreto para ${disciplineLabel}. Texto atual: ${initialTimerState.text}`,
    );
  }

  await waitFor(
    session,
    `(() => {
      const root = document.querySelector('[data-testid="study-pomodoro-timer-ready"]') || document.querySelector('[data-testid="study-free-timer-ready"]');
      const timer = root?.querySelector('.font-mono');
      return Boolean(timer && String(timer.textContent || '').trim() !== ${JSON.stringify(initialTimerState.display)});
    })()`,
    { timeoutMs: 5000, label: `contagem em andamento para ${disciplineLabel}` },
  );

  const finalTimerState = await getTimerState(session);
  const displayedFocusLabel = await getDisplayedFocusLabel(session);
  const persistedSession = await getPersistedSessionSnapshot(session, loginEmail);

  if (!persistedSession) {
    throw new Error(`Nao encontrei sessao persistida apos iniciar ${disciplineLabel}.`);
  }

  const persistedDisplayLabel =
    ENEM_DISPLAY_BY_INTERNAL_SUBJECT[persistedSession.subject] || persistedSession.subject || null;

  if (!displayedFocusLabel || normalize(displayedFocusLabel) !== normalize(disciplineLabel)) {
    throw new Error(
      `Label exibido no foco divergiu para ${disciplineLabel}. Exibido: ${displayedFocusLabel || 'nulo'}.`,
    );
  }

  if (persistedSession.subject !== expectedInternalSubject) {
    throw new Error(
      `Sessao persistiu subject errado para ${disciplineLabel}. Esperado ${expectedInternalSubject}, recebido ${persistedSession.subject}.`,
    );
  }

  if (normalize(persistedDisplayLabel) !== normalize(disciplineLabel)) {
    throw new Error(
      `Subject persistido nao corresponde ao mesmo foco logico de ${disciplineLabel}. Subject: ${persistedSession.subject}, label derivado: ${persistedDisplayLabel}.`,
    );
  }

  return {
    clickedDisciplineLabel: disciplineLabel,
    displayedFocusLabel,
    timerRoot: finalTimerState?.rootTestId || initialTimerState.rootTestId,
    initialDisplay: initialTimerState.display,
    finalDisplay: finalTimerState?.display || null,
    focusText: initialTimerState.text,
    persistedSession,
    persistedDisplayLabel,
  };
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
    throw new Error('dist/index.html nao existe. Rode o build antes do smoke de departamento.');
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
    throw new Error(
      'Credenciais/config E2E ausentes para o smoke de departamento. Verifique E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  const baseUrl = (process.env.DEPARTMENT_FOCUS_QA_BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/+$/, '');
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
    summary: {
      passed: 0,
      failed: 0,
    },
  };

  const server = baseUrl.startsWith('http://127.0.0.1:') || baseUrl.startsWith('http://localhost:')
    ? await createStaticServer()
    : null;

  try {
    await runScenario(report, 'redacao_focus_starts_correctly', async () => {
      const chrome = await launchChrome(9321);
      try {
        return await assertFocusScenario({
          session: chrome.session,
          baseUrl,
          loginEmail,
          supabaseUrl,
          browserSessionPayload,
          disciplineLabel: 'Redação',
          expectedInternalSubject: 'Bioquímica',
        });
      } catch (error) {
        await screenshot(chrome.session, 'department-focus-redacao-failure');
        throw error;
      } finally {
        await chrome.close();
      }
    });

    await runScenario(report, 'linguagens_focus_starts_correctly', async () => {
      const chrome = await launchChrome(9322);
      try {
        return await assertFocusScenario({
          session: chrome.session,
          baseUrl,
          loginEmail,
          supabaseUrl,
          browserSessionPayload,
          disciplineLabel: 'Linguagens',
          expectedInternalSubject: 'Fisiologia',
        });
      } catch (error) {
        await screenshot(chrome.session, 'department-focus-linguagens-failure');
        throw error;
      } finally {
        await chrome.close();
      }
    });

    report.summary = {
      passed: report.steps.filter((step) => step.status === 'passed').length,
      failed: report.steps.filter((step) => step.status === 'failed').length,
    };
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  }

  console.log(JSON.stringify(report, null, 2));

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
};

await main();
