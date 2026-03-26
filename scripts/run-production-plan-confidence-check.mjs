import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const BASE_URL = process.env.BASE_URL || 'https://zero-base-three.vercel.app';

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
  throw new Error('Nenhum Chrome/Edge encontrado para a verificacao headless.');
};

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-prod-check-'));
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

const createEmptyWeekProgress = () => ({
  domingo: { studied: false, minutes: 0 },
  segunda: { studied: false, minutes: 0 },
  terca: { studied: false, minutes: 0 },
  quarta: { studied: false, minutes: 0 },
  quinta: { studied: false, minutes: 0 },
  sexta: { studied: false, minutes: 0 },
  sabado: { studied: false, minutes: 0 },
});

const getCurrentWeekKeys = () => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(now.getDate() + diffToMonday);

  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
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

const buildWeeklySchedule = (subjectLabels, weeklyGoalSessions = 10) => {
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
      weeklyGoalSessions,
    },
    updatedAt: new Date().toISOString(),
  };
};

const createSession = (date, subject = 'Matematica', minutes = 25) => ({
  date,
  minutes,
  points: minutes * 10,
  subject,
  duration: minutes,
  methodId: 'pomodoro',
  goalMet: false,
  timestamp: `${date}T12:00:00.000Z`,
});

const buildSeed = ({ email, sessions = [], weeklyGoalSessions = 10 }) => {
  const scope = email.toLowerCase();
  const studyExecutionState = {
    currentBlock: {
      subject: 'Artes',
      topicName: 'Interpretacao',
      objective: 'Executar o bloco principal do plano de hoje.',
      type: 'focus',
      duration: 25,
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
          nome: 'QA Confidence',
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
    [
      `zeroBaseData_${scope}`,
      JSON.stringify({
        weekProgress: createEmptyWeekProgress(),
        completedTopics: {},
        totalPoints: sessions.reduce((sum, session) => sum + session.points, 0),
        streak: 0,
        bestStreak: 0,
        achievements: [],
        level: 1,
        studyHistory: sessions,
        dailyGoal: 90,
        sessions,
        currentStreak: 0,
      }),
    ],
    [`weeklyStudySchedule_${scope}`, JSON.stringify(buildWeeklySchedule(['Artes'], weeklyGoalSessions))],
    [`selectedStudyMethodId_${scope}`, 'pomodoro'],
    [`plannedFocusDuration_${scope}`, '25'],
    [`activeStudyMode_${scope}`, JSON.stringify('pomodoro')],
    [`studyExecutionState_${scope}`, JSON.stringify(studyExecutionState)],
    [`mdzOnboardingCompleted_${email}`, 'true'],
    ['zb_internal_access', 'true'],
    ['zb_phase_override', JSON.stringify('intermediate')],
  ];

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

const waitFor = async (session, predicateExpression, { timeoutMs = 12000, intervalMs = 100, label = 'condicao' } = {}) => {
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

const getBodyTextExcerpt = async (session, limit = 600) =>
  evalInPage(
    session,
    `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}))()`,
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
      const node = Array.from(document.querySelectorAll('button')).find((candidate) =>
        normalize(candidate.textContent || '').includes(target)
      );
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
  await waitFor(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
      const dialog = document.querySelector('[role="dialog"]');
      return Boolean(dialog && normalize(dialog.textContent || '').includes('finalizar sessao'));
    })()`,
    { label: 'modal de finalizar sessao' },
  );

  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return false;
      const target = Array.from(dialog.querySelectorAll('button')).find((button) => normalize(button.textContent || '') === 'finalizar');
      if (!target) return false;
      target.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error('Nao encontrei o botao de confirmacao no modal de finalizar sessao');
  }
};

const navigate = async (session, url, seedScript) => {
  await session.send('Page.addScriptToEvaluateOnNewDocument', { source: seedScript });
  await session.send('Page.navigate', { url });
  await waitFor(session, 'document.readyState === "complete"', { label: 'load complete' });
  await waitFor(session, 'Boolean(document.body && document.body.innerText.trim().length > 0)', { label: 'conteudo da pagina' });
};

const completeFocusSession = async (session) => {
  await waitForText(session, 'Sessao de foco');
  await clickByText(session, 'Iniciar foco');
  await waitForEnabledButton(session, 'Finalizar Sessao');
  await clickByText(session, 'Finalizar Sessao');
  await confirmOpenDialog(session);
  await waitForText(session, 'Sessao concluida');
};

const withStudyPage = async (seed, handler) => {
  const remotePort = 9600 + Math.floor(Math.random() * 300);
  const browser = await launchChrome(remotePort);
  try {
    await navigate(browser.session, BASE_URL, buildSeed(seed));
    await dismissIfPresent(browser.session, 'Agora nao');
    await dismissIfPresent(browser.session, 'Fechar', { exact: true });
    if (!(await textExists(browser.session, 'Estudo'))) {
      const excerpt = await getBodyTextExcerpt(browser.session);
      throw new Error(`Nao encontrei elemento clicavel com texto: Estudo | excerpt: ${excerpt}`);
    }
    await clickByText(browser.session, 'Estudo', { exact: true });
    await waitForText(browser.session, 'Seu cronograma da semana', { timeoutMs: 15000 });
    return await handler(browser.session);
  } finally {
    await browser.close();
  }
};

const ensureStableText = async (session, text) => {
  await waitForText(session, text);
  await delay(500);
  return await textExists(session, text);
};

const runChecks = async () => {
  const weekDates = getCurrentWeekKeys();
  const earlyWeekDates = weekDates.slice(0, 2);
  const strongWeekDates = weekDates.slice(0, 6);

  const results = [];

  try {
    await withStudyPage(
      { email: 'qa-confidence-not-started@local.test', sessions: [], weeklyGoalSessions: 10 },
      async (session) => {
        const topOk = await ensureStableText(session, 'Voce ainda nao comecou essa semana');
        const ctaVisible = await textExists(session, 'Reorganizar minha semana');
        results.push({
          caso: 'estado semanal no topo',
          resultado: topOk ? 'PASSOU' : 'QUEBROU',
          observacao: topOk ? undefined : 'nao manteve a mensagem de not_started de forma estavel',
        });
        results.push({
          caso: 'cta reorganizar no estado not_started',
          resultado: ctaVisible ? 'QUEBROU' : 'PASSOU',
          observacao: ctaVisible ? 'o CTA apareceu em not_started' : undefined,
        });
      },
    );
  } catch (error) {
    results.push({ caso: 'estado semanal no topo', resultado: 'QUEBROU', observacao: String(error.message || error).split('\n')[0] });
  }

  try {
    await withStudyPage(
      {
        email: 'qa-confidence-below-pace@local.test',
        sessions: earlyWeekDates.map((date) => createSession(date)),
        weeklyGoalSessions: 10,
      },
      async (session) => {
        const topOk = await ensureStableText(session, 'Seu ritmo esta abaixo do planejado');
        const ctaVisible = await textExists(session, 'Reorganizar minha semana');
        const todayHint = await textExists(session, 'Comecar hoje pode te colocar de volta no ritmo');
        results.push({
          caso: 'estado semanal below_pace no topo',
          resultado: topOk ? 'PASSOU' : 'QUEBROU',
          observacao: topOk ? undefined : 'nao mostrou below_pace de forma estavel',
        });
        results.push({
          caso: 'cta reorganizar no estado below_pace',
          resultado: ctaVisible ? 'PASSOU' : 'QUEBROU',
          observacao: ctaVisible ? undefined : 'o CTA nao apareceu em below_pace',
        });
        results.push({
          caso: 'consistencia topo e today em below_pace',
          resultado: todayHint ? 'PASSOU' : 'ESTRANHO',
          observacao: todayHint ? undefined : 'o topo mostrou below_pace, mas o Today nao reforcou retomada',
        });
      },
    );
  } catch (error) {
    results.push({ caso: 'estado weekly below_pace e cta', resultado: 'QUEBROU', observacao: String(error.message || error).split('\n')[0] });
  }

  try {
    await withStudyPage(
      {
        email: 'qa-confidence-on-track@local.test',
        sessions: strongWeekDates.map((date) => createSession(date)),
        weeklyGoalSessions: 10,
      },
      async (session) => {
        const topOk = await ensureStableText(session, 'Voce esta no ritmo do seu plano');
        const ctaVisible = await textExists(session, 'Reorganizar minha semana');
        const todayHint = await textExists(session, 'Comecar hoje pode te colocar de volta no ritmo');
        await completeFocusSession(session);
        const postFocusHint = await textExists(session, 'Voce esta seguindo seu plano');
        results.push({
          caso: 'estado semanal on_track no topo',
          resultado: topOk ? 'PASSOU' : 'QUEBROU',
          observacao: topOk ? undefined : 'nao mostrou on_track de forma estavel',
        });
        results.push({
          caso: 'cta reorganizar no estado on_track',
          resultado: ctaVisible ? 'QUEBROU' : 'PASSOU',
          observacao: ctaVisible ? 'o CTA apareceu em on_track' : undefined,
        });
        results.push({
          caso: 'consistencia topo e today em on_track',
          resultado: todayHint ? 'ESTRANHO' : 'PASSOU',
          observacao: todayHint ? 'o Today ainda sugeriu retomada mesmo em on_track' : undefined,
        });
        results.push({
          caso: 'pos-foco reforca o plano sem soar repetitivo',
          resultado: postFocusHint ? 'PASSOU' : 'ESTRANHO',
          observacao: postFocusHint ? undefined : 'o reforco do pos-foco nao apareceu no fluxo on_track',
        });
      },
    );
  } catch (error) {
    results.push({ caso: 'estado weekly on_track e pos-foco', resultado: 'QUEBROU', observacao: String(error.message || error).split('\n')[0] });
  }

  return results;
};

const main = async () => {
  const results = await runChecks();
  console.log(JSON.stringify(results, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
