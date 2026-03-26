import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
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
    .toLowerCase();

const TODAY = new Date();

const getWeekday = (date = TODAY) => {
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
    },
    updatedAt: new Date().toISOString(),
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

const fileExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
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
      if (response.ok) return;
    } catch {
      // keep polling
    }
    await delay(150);
  }

  throw new Error(`Chrome headless nao respondeu na porta ${port}.`);
};

const findChromePath = async () => {
  for (const candidate of chromeCandidates) {
    if (await fileExists(candidate)) return candidate;
  }
  throw new Error('Nenhum Chrome/Edge encontrado para o QA headless.');
};

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-study-loop-'));
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

const createSeedScript = (seed) => {
  const scope = seed.email.toLowerCase();
  const studyExecutionState = seed.studyExecutionState || {
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
  const entries = [
    [
      'zeroBaseSession',
      JSON.stringify({
        user: {
          nome: 'QA Study Loop',
          email: seed.email,
          dataCadastro: new Date().toISOString(),
          foto: 'QA',
          examGoal: 'ENEM',
          examDate: '',
          preferredTrack: 'enem',
        },
        userId: `local:${scope}`,
      }),
    ],
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
    [`profileDisplayName_${scope}`, 'QA Study Loop'],
    [`preferredStudyTrack_${scope}`, 'enem'],
    [`selectedStudyMethodId_${scope}`, 'pomodoro'],
    [`plannedFocusDuration_${scope}`, '25'],
    [`activeStudyMode_${scope}`, JSON.stringify('livre')],
    [`mdzOnboardingCompleted_${seed.email}`, 'true'],
    [`academyCompletedContentIds_${scope}`, JSON.stringify([])],
    [`weeklyStudySchedule_${scope}`, JSON.stringify(buildWeeklySchedule(['Matematica']))],
    ['zb_internal_access', 'true'],
    ['zb_phase_override', JSON.stringify('intermediate')],
    [`studyExecutionState_${scope}`, JSON.stringify(studyExecutionState)],
  ];

  return `
    (() => {
      const nativeSetInterval = window.setInterval.bind(window);
      const nativeSetTimeout = window.setTimeout.bind(window);
      window.__qaTransitionTimeoutCalls = 0;
      window.setInterval = (callback, delay, ...args) => {
        if (delay === 1000) {
          return nativeSetInterval(callback, 15, ...args);
        }
        return nativeSetInterval(callback, delay, ...args);
      };
      window.setTimeout = (callback, delay, ...args) => {
        if (delay === 420) {
          window.__qaTransitionTimeoutCalls += 1;
        }
        return nativeSetTimeout(callback, delay, ...args);
      };
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

const waitFor = async (session, predicateExpression, { timeoutMs = 10000, intervalMs = 100, label = 'condicao' } = {}) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await evalInPage(session, predicateExpression);
    if (value) return value;
    await delay(intervalMs);
  }
  throw new Error(`Timeout aguardando ${label}.`);
};

const waitForText = async (session, text, options = {}) =>
  waitFor(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
      return normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })()`,
    { ...options, label: `texto "${text}"` },
  );

const textExists = async (session, text) =>
  evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
      return normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })()`,
  );

const getBodyTextExcerpt = async (session, limit = 800) =>
  evalInPage(
    session,
    `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}))()`,
  );

const getStorageValue = async (session, key) =>
  evalInPage(
    session,
    `(() => {
      const value = window.localStorage.getItem(${JSON.stringify(key)});
      return value === null ? null : value;
    })()`,
  );

const clickByText = async (session, text, { exact = false } = {}) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
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

const waitForEnabledButton = async (session, text) =>
  waitFor(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
      const target = normalize(${JSON.stringify(text)});
      const nodes = Array.from(document.querySelectorAll('button'));
      const node = nodes.find((candidate) => normalize(candidate.textContent || '').includes(target));
      return Boolean(node && !node.disabled);
    })()`,
    { label: `botao habilitado "${text}"` },
  );

const dismissIfPresent = async (session, text, options = {}) => {
  if (await textExists(session, text)) {
    await clickByText(session, text, options);
    await delay(120);
  }
};

const confirmOpenDialog = async (session) => {
  try {
    await waitFor(
      session,
      `(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return Boolean(dialog && normalize(dialog.textContent || '').includes('finalizar sessao'));
        function normalize(value) {
          return String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
        }
      })()`,
      { label: 'modal de finalizar sessao' },
    );
  } catch (error) {
    const excerpt = await getBodyTextExcerpt(session, 1200);
    throw new Error(`${error.message} | excerpt: ${excerpt}`);
  }

  const clicked = await evalInPage(
    session,
    `(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return false;
      const buttons = Array.from(dialog.querySelectorAll('button'));
      const target = buttons.find((button) => {
        const label = String(button.textContent || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
        return label === 'finalizar';
      });
      if (!target) return false;
      target.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error('Nao encontrei o botao de confirmacao no modal de finalizar sessao');
  }
};

const navigate = async (session, url, seed) => {
  await session.send('Page.addScriptToEvaluateOnNewDocument', { source: createSeedScript(seed) });
  await session.send('Page.navigate', { url });
  await waitFor(session, 'document.readyState === "complete"', { label: 'load complete' });
  await waitFor(session, 'Boolean(document.body && document.body.innerText.trim().length > 0)', { label: 'conteudo da pagina' });
};

const getTransitionTimeoutCount = async (session) => evalInPage(session, 'window.__qaTransitionTimeoutCalls || 0');

const completeFocusSession = async (session) => {
  await waitForText(session, 'Sessao de foco');
  await waitForText(session, 'Iniciar foco');
  await clickByText(session, 'Iniciar foco');
  await waitForEnabledButton(session, 'Finalizar Sessao');
  await clickByText(session, 'Finalizar Sessao');
  await confirmOpenDialog(session);
  await waitForText(session, 'Sessao concluida');
};

const withStudyPage = async (seed, handler) => {
  const remotePort = 9300 + Math.floor(Math.random() * 400);
  const browser = await launchChrome(remotePort);
  try {
    await navigate(browser.session, `http://127.0.0.1:${PORT}/`, seed);
    await dismissIfPresent(browser.session, 'Agora nao');
    await dismissIfPresent(browser.session, 'Fechar', { exact: true });

    if (!(await textExists(browser.session, 'Estudo'))) {
      const excerpt = await getBodyTextExcerpt(browser.session);
      const scope = seed.email.toLowerCase();
      const sessionValue = await getStorageValue(browser.session, 'zeroBaseSession');
      const scopedData = await getStorageValue(browser.session, `zeroBaseData_${scope}`);
      throw new Error(`Nao encontrei elemento clicavel com texto: Estudo | excerpt: ${excerpt} | session: ${sessionValue ? 'present' : 'missing'} | data: ${scopedData ? 'present' : 'missing'}`);
    }
    await clickByText(browser.session, 'Estudo', { exact: true });
    await waitForText(browser.session, 'Sessao de foco');
    return await handler(browser.session);
  } finally {
    await browser.close();
  }
};

const runChecks = async () => {
  const results = [];

  try {
    await withStudyPage({ email: 'qa-loop-1@local.test' }, async (session) => {
      await completeFocusSession(session);
      await waitForText(session, 'Validar agora');
      await clickByText(session, 'Validar agora');
      await waitForText(session, 'Preparando suas questoes');
      await waitForText(session, 'Banco de Questoes', { timeoutMs: 4000 });
      await waitForText(session, 'Questoes de Matematica');
      results.push({ caso: 'concluir foco com contexto que leva para questões', resultado: 'PASSOU' });
    });
  } catch (error) {
    results.push({ caso: 'concluir foco com contexto que leva para questões', resultado: 'QUEBROU', observacao: String(error.message || error).split('\n')[0] });
  }

  try {
    await withStudyPage(
      {
        email: 'qa-loop-2@local.test',
        studyExecutionState: {
          currentBlock: {
            subject: 'Matematica',
            topicName: 'Porcentagem',
            objective: 'Executar o bloco principal do plano de hoje.',
            type: 'focus',
            duration: 25,
            targetQuestions: 0,
          },
          recommendedMethodId: 'pomodoro',
          source: 'ai',
          updatedAt: new Date().toISOString(),
        },
      },
      async (session) => {
        await completeFocusSession(session);
        await waitForText(session, 'Continuar estudando');
        await clickByText(session, 'Continuar estudando');
        await waitForText(session, 'Sessao de foco');
        const stillShowingQuestions = await textExists(session, 'Banco de Questoes');
        results.push({
          caso: 'concluir foco sem contexto para questões',
          resultado: stillShowingQuestions ? 'QUEBROU' : 'PASSOU',
          observacao: stillShowingQuestions ? 'abriu questões mesmo sem recomendação de prática' : undefined,
        });
      },
    );
  } catch (error) {
    results.push({ caso: 'concluir foco sem contexto para questões', resultado: 'QUEBROU', observacao: String(error.message || error).split('\n')[0] });
  }

  try {
    await withStudyPage({ email: 'qa-loop-3@local.test' }, async (session) => {
      await completeFocusSession(session);
      await clickByText(session, 'Validar agora');
      await waitForText(session, 'Preparando suas questoes');
      await delay(700);
      const count = await getTransitionTimeoutCount(session);
      results.push({
        caso: 'garantir que o timeout de questionTransition não dispare duas vezes',
        resultado: count === 1 ? 'PASSOU' : 'QUEBROU',
        observacao: count === 1 ? undefined : `timeout agendado ${count} vez(es)`,
      });
    });
  } catch (error) {
    results.push({ caso: 'garantir que o timeout de questionTransition não dispare duas vezes', resultado: 'QUEBROU', observacao: String(error.message || error).split('\n')[0] });
  }

  try {
    await withStudyPage({ email: 'qa-loop-4@local.test' }, async (session) => {
      await completeFocusSession(session);
      await clickByText(session, 'Validar agora');
      await waitForText(session, 'Preparando suas questoes');
      await clickByText(session, 'Inicio', { exact: true });
      await delay(800);
      const openedQuestions = await textExists(session, 'Banco de Questoes');
      results.push({
        caso: 'trocar de tela no meio da transição e confirmar cleanup',
        resultado: openedQuestions ? 'QUEBROU' : 'PASSOU',
        observacao: openedQuestions ? 'a transição ainda empurra para questões depois de sair da tela' : undefined,
      });
    });
  } catch (error) {
    results.push({ caso: 'trocar de tela no meio da transição e confirmar cleanup', resultado: 'QUEBROU', observacao: String(error.message || error).split('\n')[0] });
  }

  try {
    await withStudyPage({ email: 'qa-loop-5@local.test' }, async (session) => {
      await completeFocusSession(session);
      await clickByText(session, 'Validar agora');
      await waitForText(session, 'Banco de Questoes', { timeoutMs: 4000 });
      const stillShowingBanner = await textExists(session, 'Sessao concluida');
      results.push({
        caso: 'verificar se o banner pós-foco some corretamente ao continuar',
        resultado: stillShowingBanner ? 'ESTRANHO' : 'PASSOU',
        observacao: stillShowingBanner ? 'o texto de pós-foco ainda aparece junto da prática' : undefined,
      });
    });
  } catch (error) {
    results.push({ caso: 'verificar se o banner pós-foco some corretamente ao continuar', resultado: 'QUEBROU', observacao: String(error.message || error).split('\n')[0] });
  }

  return results;
};

const main = async () => {
  if (!(await fileExists(path.join(DIST_DIR, 'index.html')))) {
    throw new Error('dist/index.html nao existe. Rode o build antes da verificacao.');
  }

  const server = await createStaticServer();
  try {
    const results = await runChecks();
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
