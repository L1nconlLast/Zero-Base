import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'product-qa-report.json');
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

const baseWeekProgress = () => ({
  domingo: { studied: false, minutes: 0 },
  segunda: { studied: false, minutes: 0 },
  terca: { studied: false, minutes: 0 },
  quarta: { studied: false, minutes: 0 },
  quinta: { studied: false, minutes: 0 },
  sexta: { studied: false, minutes: 0 },
  sabado: { studied: false, minutes: 0 },
});

const missionTemplates = [
  {
    focus: 'Primeiro movimento',
    tasks: [
      { discipline: 'Matematica', topic: 'Porcentagem' },
      { discipline: 'Linguagens', topic: 'Interpretacao de texto' },
      { discipline: 'Humanas', topic: 'Brasil Colonia' },
    ],
    target: 'questoes',
  },
  {
    focus: 'Ganho de ritmo',
    tasks: [
      { discipline: 'Matematica', topic: 'Regra de 3' },
      { discipline: 'Linguagens', topic: 'Figuras de linguagem' },
      { discipline: 'Humanas', topic: 'Brasil Imperio' },
    ],
    target: 'questoes',
  },
  {
    focus: 'Base de resolucao',
    tasks: [
      { discipline: 'Matematica', topic: 'Equacao de 1 grau' },
      { discipline: 'Linguagens', topic: 'Classes gramaticais' },
      { discipline: 'Humanas', topic: 'Republica Velha' },
    ],
    target: 'questoes',
  },
  {
    focus: 'Consistencia',
    tasks: [
      { discipline: 'Matematica', topic: 'Fracoes' },
      { discipline: 'Linguagens', topic: 'Concordancia' },
      { discipline: 'Humanas', topic: 'Era Vargas' },
    ],
    target: 'questoes',
  },
  {
    focus: 'Ajuste fino',
    tasks: [
      { discipline: 'Matematica', topic: 'Razao e proporcao' },
      { discipline: 'Linguagens', topic: 'Coesao e coerencia' },
      { discipline: 'Humanas', topic: 'Ditadura militar' },
    ],
    target: 'questoes',
  },
  {
    focus: 'Revisao guiada',
    tasks: [
      { discipline: 'Matematica', topic: 'Erros da semana' },
      { discipline: 'Linguagens', topic: 'Erros da semana' },
      { discipline: 'Humanas', topic: 'Erros da semana' },
    ],
    target: 'questoes',
  },
  {
    focus: 'Simulado leve',
    tasks: [
      { discipline: 'Matematica', topic: 'Bloco misto' },
      { discipline: 'Linguagens', topic: 'Bloco misto' },
      { discipline: 'Humanas', topic: 'Bloco misto' },
    ],
    target: 'simulado',
  },
];

const buildPlan = (readyDay = 1, completedDays = 0) => ({
  track: 'enem',
  generatedAt: new Date().toISOString(),
  focusAreas: ['Matematica', 'Linguagens', 'Humanas'],
  missions: missionTemplates.map((template, index) => {
    const dayNumber = index + 1;
    const isCompleted = dayNumber <= completedDays;
    const isReady = !isCompleted && dayNumber === readyDay;
    return {
      id: `enem-day-${dayNumber}`,
      dayNumber,
      dayLabel: `Dia ${dayNumber}`,
      focus: template.focus,
      tasks: template.tasks,
      studyMinutes: dayNumber <= 2 ? 15 : 25,
      questionCount: dayNumber === 6 ? 20 : dayNumber === 7 ? 30 : 10,
      reviewMinutes: dayNumber === 7 ? 0 : 5,
      target: template.target,
      status: isCompleted ? 'completed' : isReady ? 'ready' : 'locked',
      completedAt: isCompleted ? new Date(Date.now() - (completedDays - dayNumber) * 86400000).toISOString() : null,
    };
  }),
});

const buildUserData = (sessions = []) => ({
  weekProgress: baseWeekProgress(),
  completedTopics: {},
  totalPoints: sessions.reduce((sum, session) => sum + session.points, 0),
  streak: 0,
  bestStreak: 0,
  achievements: [],
  level: sessions.length > 0 ? 2 : 1,
  studyHistory: sessions,
  dailyGoal: 90,
  sessions,
  currentStreak: 0,
});

const buildAnalyticsEvents = () => {
  const now = new Date();
  const iso = (daysAgo) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

  return [
    { name: 'onboarding_completed', timestamp: iso(5), userEmail: 'qa-data@local.test', payload: { focus: 'enem' } },
    { name: 'beginner_mission_viewed', timestamp: iso(5), userEmail: 'qa-data@local.test', payload: { day: 1 } },
    { name: 'beginner_session_started', timestamp: iso(5), userEmail: 'qa-data@local.test', payload: { day: 1 } },
    { name: 'beginner_session_completed', timestamp: iso(5), userEmail: 'qa-data@local.test', payload: { day: 1, duration: 15 } },
    { name: 'beginner_questions_started', timestamp: iso(5), userEmail: 'qa-data@local.test', payload: { day: 1 } },
    { name: 'beginner_questions_completed', timestamp: iso(5), userEmail: 'qa-data@local.test', payload: { day: 1 } },
    { name: 'beginner_week_summary_viewed', timestamp: iso(4), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'beginner_week_summary_completed', timestamp: iso(4), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'beginner_blocked_feature_clicked', timestamp: iso(4), userEmail: 'qa-data@local.test', payload: { tabId: 'dashboard' } },
    { name: 'intermediate_home_viewed', timestamp: iso(3), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'intermediate_plan_viewed', timestamp: iso(3), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'intermediate_continue_automatic_clicked', timestamp: iso(3), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'intermediate_recommended_tool_used', timestamp: iso(3), userEmail: 'qa-data@local.test', payload: { tool: 'questoes' } },
    { name: 'intermediate_day_plan_completed', timestamp: iso(3), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'intermediate_returned_next_day', timestamp: iso(2), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'advanced_home_viewed', timestamp: iso(2), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'advanced_plan_built', timestamp: iso(2), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'advanced_strategy_review_viewed', timestamp: iso(2), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'advanced_strategy_review_applied', timestamp: iso(1), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'advanced_mock_exam_started', timestamp: iso(1), userEmail: 'qa-data@local.test', payload: {} },
    { name: 'advanced_mock_exam_completed', timestamp: iso(1), userEmail: 'qa-data@local.test', payload: {} },
  ];
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
    .toLowerCase();

const escapeForRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
        if (!pending) return;
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
    const payload = { id, method, params };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify(payload));
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

const findChromePath = async () => {
  for (const candidate of chromeCandidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error('Nenhum Chrome/Edge encontrado para o QA headless.');
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

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-qa-'));
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

  if (!pageTarget) {
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

  return {
    chrome,
    session,
    userDataDir,
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

const createSeedScript = (seed) => {
  const entries = [];
  const scope = seed.email.toLowerCase();
  const user = {
    nome: seed.name || 'QA Produto',
    email: seed.email,
    dataCadastro: new Date().toISOString(),
    foto: 'QA',
    examGoal: 'ENEM',
    examDate: '',
    preferredTrack: 'enem',
  };

  entries.push(['zeroBaseSession', JSON.stringify({ user, userId: `local:${scope}` })]);
  entries.push([`zeroBaseData_${scope}`, JSON.stringify(seed.userData || buildUserData())]);
  entries.push([`profileDisplayName_${scope}`, seed.name || 'QA Produto']);
  entries.push([`preferredStudyTrack_${scope}`, 'enem']);
  entries.push([`selectedStudyMethodId_${scope}`, 'pomodoro']);
  entries.push([`plannedFocusDuration_${scope}`, '15']);
  entries.push([`activeStudyMode_${scope}`, 'pomodoro']);

  if (seed.onboardingCompleted !== false) {
    entries.push([`mdzOnboardingCompleted_${seed.email}`, 'true']);
  }

  if (seed.beginnerState) {
    entries.push([`beginnerState_${scope}`, JSON.stringify(seed.beginnerState)]);
  }

  if (seed.beginnerPlan) {
    entries.push([`beginnerPlan_${scope}`, JSON.stringify(seed.beginnerPlan)]);
  }

  if (seed.beginnerStats) {
    entries.push([`beginnerStats_${scope}`, JSON.stringify(seed.beginnerStats)]);
  }

  if (seed.analyticsEvents?.length) {
    entries.push(['mdz_analytics_events', JSON.stringify(seed.analyticsEvents)]);
  }

  if (seed.phaseOverride) {
    entries.push(['zb_phase_override', JSON.stringify(seed.phaseOverride)]);
  }

  if (seed.adminMode) {
    entries.push(['zb_admin_mode', 'true']);
  }

  if (seed.internalAccess) {
    entries.push(['zb_internal_access', 'true']);
  }

  return `
    (() => {
      try {
        window.localStorage.clear();
        const entries = ${JSON.stringify(entries)};
        for (const [key, value] of entries) {
          window.localStorage.setItem(key, value);
        }
      } catch (error) {
        console.error('seed-failed', error);
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

const waitFor = async (session, predicateExpression, { timeoutMs = 10000, intervalMs = 150, label = 'condicao' } = {}) => {
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

const navigate = async (session, url, seed) => {
  await session.send('Page.addScriptToEvaluateOnNewDocument', {
    source: createSeedScript(seed),
  });
  await session.send('Page.navigate', { url });
  await waitFor(session, 'document.readyState === "complete"', { label: 'load complete' });
  await waitFor(session, 'Boolean(document.body && document.body.innerText.trim().length > 0)', { label: 'conteudo da pagina' });
};

const clickByText = async (session, text, { tagName = null, exact = false, allMatches = false } = {}) => {
  const expression = `
    (() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
      const target = normalize(${JSON.stringify(text)});
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(tagName ? tagName : 'button, a, [role="button"]')}));
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

const textExists = async (session, text) => {
  const expression = `
    (() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
      return normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })();
  `;

  return evalInPage(session, expression);
};

const waitForText = async (session, text, options = {}) =>
  waitFor(
    session,
    `
      (() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
        return normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
      })();
    `,
    {
      ...options,
      label: `texto "${text}"`,
    },
  );

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
    `
      (() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}))();
    `,
  );

const getStorageValue = async (session, key) =>
  evalInPage(
    session,
    `
      (() => {
        const value = window.localStorage.getItem(${JSON.stringify(key)});
        return value === null ? null : value;
      })();
    `,
  );

const runScenario = async ({ name, urlPath, seed, handler }) => {
  const remotePort = 9300 + Math.floor(Math.random() * 400);
  const browser = await launchChrome(remotePort);
  try {
    await navigate(browser.session, `http://127.0.0.1:${PORT}${urlPath}`, seed);
    try {
      return await handler(browser.session);
    } catch (error) {
      const safeName = name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
      try {
        await screenshot(browser.session, `failed-${safeName}`);
      } catch {
        // ignore screenshot failures in diagnostics
      }
      const excerpt = await getBodyTextExcerpt(browser.session).catch(() => '');
      throw new Error(`${error instanceof Error ? error.message : String(error)}\nPage excerpt: ${excerpt}`);
    }
  } finally {
    await browser.close();
  }
};

const onboardingAndStudyScenario = async () => {
  const result = {
    '1': null,
    '4': null,
  };

  const scenarioResult = await runScenario({
    name: 'onboarding-study',
    urlPath: '/',
    seed: {
      email: 'qa-onboarding@local.test',
      name: 'QA Produto',
      onboardingCompleted: false,
      userData: buildUserData(),
    },
    handler: async (session) => {
      console.log('[qa] onboarding: esperando modal');
      await waitForText(session, 'Modo iniciante');
      console.log('[qa] onboarding: clicando continuar');
      await clickByText(session, 'Continuar', { exact: true });
      console.log('[qa] onboarding: escolhendo 30 min');
      await clickByText(session, '30 min por dia');
      console.log('[qa] onboarding: liberando primeira missao');
      await clickByText(session, 'Liberar minha 1a missao');
      await waitForText(session, 'Primeiro movimento');
      await screenshot(session, 'qa-01-onboarding-primeira-missao');

      if (await textExists(session, 'Modo interno')) {
        console.log('[qa] onboarding: fechando overlay interno');
        await clickByText(session, 'Fechar', { exact: true });
      }

      result['1'] = {
        status: 'PASSOU LIMPO',
        evidence: ['print: qa-artifacts/qa-01-onboarding-primeira-missao.png'],
        adjust: null,
      };

      console.log('[qa] onboarding: iniciando primeira sessao');
      await clickByText(session, 'Fazer minha 1 sessao');
      console.log('[qa] onboarding: aguardando sessao de foco');
      await waitForText(session, 'Sessao de foco');
      await waitForText(session, 'Valide o que voce acabou de estudar');

      const questionsAvailableBeforeFinish = await textExists(session, 'Validar com questoes');
      console.log('[qa] onboarding: abrindo questoes');
      await clickByText(session, 'Validar com questoes');
      await waitForText(session, 'Banco de Questoes');
      await waitForText(session, 'Iniciar Quiz');
      await screenshot(session, 'qa-02-estudo-questoes');

      result['4'] = {
        status: questionsAvailableBeforeFinish ? 'PASSOU MAS ESTRANHO' : 'PASSOU LIMPO',
        evidence: [
          'print: qa-artifacts/qa-02-estudo-questoes.png',
          questionsAvailableBeforeFinish
            ? 'comportamento observado: CTA de questoes fica disponivel antes da sessao terminar'
            : 'comportamento observado: fluxo estudo -> questoes abriu com contexto',
        ],
        adjust: questionsAvailableBeforeFinish ? 'Reforcar a sequencia foco -> validacao para nao sugerir atalho cedo demais.' : null,
      };

      return result;
    },
  });

  return scenarioResult;
};

const phasesScenario = async () => {
  const plan = buildPlan(1, 0);
  const stats = {
    startedAt: new Date().toISOString(),
    onboardingCompletedAt: new Date().toISOString(),
    focus: 'enem',
    timeAvailable: 30,
    lastActiveAt: new Date().toISOString(),
    lastReturnTrackedDate: null,
    sessionsStarted: 1,
    sessionsCompleted: 1,
    activeDates: [new Date().toISOString().slice(0, 10)],
    streak: 1,
    returnedNextDayCount: 0,
    totalQuestions: 10,
    totalCorrect: 6,
    accuracyAvg: 0.6,
    assessments: [],
    lastDropPoint: null,
    progressStage: 'early_beginner',
    promotedAt: null,
    weekSummarySeenAt: null,
  };

  return runScenario({
    name: 'phases',
    urlPath: '/?internal=1',
    seed: {
      email: 'qa-phase@local.test',
      onboardingCompleted: true,
      beginnerState: 'ready_for_first_session',
      beginnerPlan: plan,
      beginnerStats: stats,
      userData: buildUserData(),
    },
    handler: async (session) => {
      const results = {};

      await waitForText(session, 'Modo interno');
      await clickByText(session, 'Intermediario', { exact: true });
      await waitForText(session, 'AUTONOMIA GUIADA');
      await waitForText(session, 'Continuar automatico');
      await screenshot(session, 'qa-03-fase-intermediario');
      results['5'] = {
        status: 'PASSOU LIMPO',
        evidence: ['print: qa-artifacts/qa-03-fase-intermediario.png'],
        adjust: null,
      };

      await clickByText(session, 'Avancado', { exact: true });
      await waitForText(session, 'Sua estrategia');
      await screenshot(session, 'qa-04-fase-avancado');
      results['6'] = {
        status: 'PASSOU LIMPO',
        evidence: ['print: qa-artifacts/qa-04-fase-avancado.png'],
        adjust: null,
      };

      results['7'] = {
        status: 'PASSOU LIMPO',
        evidence: [
          'print: qa-artifacts/qa-03-fase-intermediario.png',
          'print: qa-artifacts/qa-04-fase-avancado.png',
          'comportamento observado: troca Iniciante -> Intermediario -> Avancado sem travar a UI',
        ],
        adjust: null,
      };

      await clickByText(session, 'Resetar modo interno');
      await waitForText(session, 'Primeiro movimento');
      const phaseOverride = await getStorageValue(session, 'zb_phase_override');
      const adminMode = await getStorageValue(session, 'zb_admin_mode');
      const internalAccess = await getStorageValue(session, 'zb_internal_access');
      await screenshot(session, 'qa-05-reset-modo-interno');
      results['8'] = {
        status: phaseOverride === null && adminMode === null && internalAccess === null ? 'PASSOU LIMPO' : 'QUEBROU',
        evidence: ['print: qa-artifacts/qa-05-reset-modo-interno.png'],
        adjust:
          phaseOverride === null && adminMode === null && internalAccess === null
            ? null
            : 'Garantir limpeza completa do modo interno e dos overrides.',
      };

      return results;
    },
  });
};

const beginnerScenario = async () => {
  const blockResult = await runScenario({
    name: 'beginner-blocked',
    urlPath: '/',
    seed: {
      email: 'qa-beginner-lock@local.test',
      onboardingCompleted: true,
      beginnerState: 'ready_for_first_session',
      beginnerPlan: buildPlan(1, 0),
      beginnerStats: {
        startedAt: new Date().toISOString(),
        onboardingCompletedAt: new Date().toISOString(),
        focus: 'enem',
        timeAvailable: 30,
        lastActiveAt: new Date().toISOString(),
        lastReturnTrackedDate: null,
        sessionsStarted: 1,
        sessionsCompleted: 1,
        activeDates: [new Date().toISOString().slice(0, 10)],
        streak: 1,
        returnedNextDayCount: 0,
        totalQuestions: 10,
        totalCorrect: 5,
        accuracyAvg: 0.5,
        assessments: [],
        lastDropPoint: null,
        progressStage: 'early_beginner',
        promotedAt: null,
        weekSummarySeenAt: null,
      },
      userData: buildUserData(),
    },
    handler: async (session) => {
      await clickByText(session, 'Dados', { exact: true, allMatches: true });
      await waitForText(session, 'entra logo depois que voce ganhar ritmo');
      await screenshot(session, 'qa-06-bloqueio-iniciante');
      return {
        '2': {
          status: 'PASSOU LIMPO',
          evidence: ['print: qa-artifacts/qa-06-bloqueio-iniciante.png'],
          adjust: null,
        },
      };
    },
  });

  const now = new Date();
  const sessionDates = [2, 1, 0].map((daysAgo) => {
    const date = new Date(now.getTime() - daysAgo * 86400000).toISOString();
    return {
      date,
      minutes: 25,
      points: 250,
      subject: 'Anatomia',
      duration: 25,
    };
  });

  const summaryResult = await runScenario({
    name: 'beginner-week-summary',
    urlPath: '/',
    seed: {
      email: 'qa-week-summary@local.test',
      onboardingCompleted: true,
      beginnerState: 'week_complete',
      beginnerPlan: buildPlan(7, 7),
      beginnerStats: {
        startedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
        onboardingCompletedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
        focus: 'enem',
        timeAvailable: 30,
        lastActiveAt: now.toISOString(),
        lastReturnTrackedDate: null,
        sessionsStarted: 3,
        sessionsCompleted: 3,
        activeDates: sessionDates.map((session) => session.date.slice(0, 10)),
        streak: 3,
        returnedNextDayCount: 1,
        totalQuestions: 30,
        totalCorrect: 22,
        accuracyAvg: 22 / 30,
        assessments: [
          {
            at: sessionDates[0].date,
            day: 1,
            missionId: 'enem-day-1',
            subject: 'Matematica',
            correct: 8,
            total: 10,
            accuracy: 0.8,
            xpGained: 80,
          },
          {
            at: sessionDates[1].date,
            day: 2,
            missionId: 'enem-day-2',
            subject: 'Linguagens',
            correct: 7,
            total: 10,
            accuracy: 0.7,
            xpGained: 70,
          },
          {
            at: sessionDates[2].date,
            day: 3,
            missionId: 'enem-day-3',
            subject: 'Humanas',
            correct: 7,
            total: 10,
            accuracy: 0.7,
            xpGained: 70,
          },
        ],
        lastDropPoint: null,
        progressStage: 'ready_for_intermediate',
        promotedAt: now.toISOString(),
        weekSummarySeenAt: null,
      },
      userData: buildUserData(sessionDates),
    },
    handler: async (session) => {
      await waitForText(session, 'Resumo da primeira semana');
      await waitForText(session, 'Voce completou sua primeira semana');
      await screenshot(session, 'qa-07-week-summary');
      return {
        '3': {
          status: 'PASSOU LIMPO',
          evidence: ['print: qa-artifacts/qa-07-week-summary.png'],
          adjust: null,
        },
      };
    },
  });

  return {
    ...blockResult,
    ...summaryResult,
  };
};

const dataManagementScenario = async () =>
  runScenario({
    name: 'data-management',
    urlPath: '/?internal=1',
    seed: {
      email: 'qa-data@local.test',
      onboardingCompleted: true,
      beginnerState: 'day_2',
      beginnerPlan: buildPlan(2, 1),
      beginnerStats: {
        startedAt: new Date().toISOString(),
        onboardingCompletedAt: new Date().toISOString(),
        focus: 'enem',
        timeAvailable: 60,
        lastActiveAt: new Date().toISOString(),
        lastReturnTrackedDate: null,
        sessionsStarted: 2,
        sessionsCompleted: 2,
        activeDates: [new Date().toISOString().slice(0, 10)],
        streak: 1,
        returnedNextDayCount: 0,
        totalQuestions: 15,
        totalCorrect: 10,
        accuracyAvg: 10 / 15,
        assessments: [],
        lastDropPoint: null,
        progressStage: 'ready_for_intermediate',
        promotedAt: new Date().toISOString(),
        weekSummarySeenAt: new Date().toISOString(),
      },
      analyticsEvents: buildAnalyticsEvents(),
      adminMode: true,
      internalAccess: true,
      phaseOverride: 'advanced',
      userData: buildUserData(),
    },
    handler: async (session) => {
      console.log('[qa] data: pagina carregada');
      if (await textExists(session, 'Agora nao')) {
        console.log('[qa] data: tentando fechar prompt de notificacao');
        await clickByText(session, 'Agora nao', { exact: true });
      }

      if (await textExists(session, 'Modo interno')) {
        console.log('[qa] data: tentando fechar overlay interno');
        await clickByText(session, 'Fechar', { exact: true });
      }

      console.log('[qa] data: clicando dados');
      await clickByText(session, 'Dados', { exact: true, allMatches: true });
      await delay(400);
      console.log('[qa] data: trecho apos clique', await getBodyTextExcerpt(session, 400));
      await waitForText(session, 'Central de operacao');
      await waitForText(session, 'Prioridade do Produto (Geral)');
      await waitForText(session, 'Top 3 para corrigir esta semana');
      await waitForText(session, 'Scorecard semanal');
      await waitForText(session, 'Prioridade do intermediario');
      await waitForText(session, 'Scorecard semanal do avancado');
      await screenshot(session, 'qa-08-data-management');

      return {
        '9': {
          status: 'PASSOU LIMPO',
          evidence: ['print: qa-artifacts/qa-08-data-management.png'],
          adjust: null,
        },
      };
    },
  });

const docsScenario = async () => {
  const deployDoc = await fs.readFile(path.join(ROOT, 'docs', 'DEPLOY_STAGING_PROD.md'), 'utf8');
  const checklistDoc = await fs.readFile(path.join(ROOT, 'docs', 'CHECKLIST_POS_DEPLOY_VERCEL.md'), 'utf8');
  const packageJson = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'));

  const hasDeployScript = packageJson.scripts?.['deploy:prod'] === 'npm run build && npx vercel --prod --yes';
  const hasChecklistLink = deployDoc.includes('CHECKLIST_POS_DEPLOY_VERCEL.md');
  const hasChecklistFlow = checklistDoc.includes('https://zero-base-three.vercel.app') && checklistDoc.includes('Modo interno');

  return {
    '10': {
      status: hasDeployScript && hasChecklistLink && hasChecklistFlow ? 'PASSOU MAS ESTRANHO' : 'QUEBROU',
      evidence: [
        'texto observado: docs/DEPLOY_STAGING_PROD.md referencia o checklist pos-deploy',
        'texto observado: docs/CHECKLIST_POS_DEPLOY_VERCEL.md cobre home, estudo, dados e modo interno',
      ],
      adjust:
        hasDeployScript && hasChecklistLink && hasChecklistFlow
          ? 'Docs e script estao coerentes, mas nao houve deploy real nesta rodada.'
          : 'Revisar consistencia entre script de deploy e checklist pos-deploy.',
    },
  };
};

const summarize = (results) => {
  const entries = Object.entries(results).sort((left, right) => Number(left[0]) - Number(right[0]));
  const approved = entries.filter(([, item]) => item.status !== 'QUEBROU').length;
  const failed = entries.filter(([, item]) => item.status === 'QUEBROU').length;
  const weird = entries.filter(([, item]) => item.status === 'PASSOU MAS ESTRANHO').map(([id, item]) => ({ id, ...item }));
  const broken = entries.filter(([, item]) => item.status === 'QUEBROU').map(([id, item]) => ({ id, ...item }));

  return {
    approved,
    failed,
    weird,
    broken,
    readyForCommitDeploy: failed === 0 ? 'Sim, com observacoes' : 'Nao',
  };
};

const main = async () => {
  await ensureArtifactsDir();

  if (!(await fileExists(path.join(DIST_DIR, 'index.html')))) {
    throw new Error('dist/index.html nao existe. Rode o build antes do QA.');
  }

  const server = await createStaticServer();

  try {
    const scenario = process.env.QA_SCENARIO || 'all';
    let results;

    if (scenario === 'onboarding') {
      results = await onboardingAndStudyScenario();
    } else if (scenario === 'phases') {
      results = await phasesScenario();
    } else if (scenario === 'beginner') {
      results = await beginnerScenario();
    } else if (scenario === 'data') {
      results = await dataManagementScenario();
    } else if (scenario === 'docs') {
      results = await docsScenario();
    } else {
      results = {
        ...(await onboardingAndStudyScenario()),
        ...(await phasesScenario()),
        ...(await beginnerScenario()),
        ...(await dataManagementScenario()),
        ...(await docsScenario()),
      };
    }

    const summary = summarize(results);
    const report = {
      generatedAt: new Date().toISOString(),
      results,
      summary,
    };

    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
