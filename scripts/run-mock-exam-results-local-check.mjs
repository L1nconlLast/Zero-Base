import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'mock-exam-results-local-report.json');

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

const normalize = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

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

const launchChrome = async (port) => {
  const chromePath = await findChromePath();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-mock-exam-smoke-'));
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
        // ignore close issues
      }

      chrome.kill();
      await delay(300);

      try {
        await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch {
        // ignore temporary locked files
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

const createSeedScript = (email, supabaseUrl, browserSessionPayload) => {
  const normalizedEmail = email.trim().toLowerCase();
  const authStorageKey = buildAuthStorageKey(supabaseUrl);

  return `
    (() => {
      try {
        window.localStorage.setItem(${JSON.stringify(`mdzOnboardingCompleted_${normalizedEmail}`)}, 'true');
        window.localStorage.setItem(${JSON.stringify(`profileDisplayName_${normalizedEmail}`)}, 'QA Simulados');
        window.localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(browserSessionPayload))});
        window.localStorage.removeItem('zb_internal_access');
        window.localStorage.removeItem('zb_phase_override');
      } catch (error) {
        console.error('mock-exam-smoke-seed-failed', error);
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

const textExists = async (session, text) =>
  evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      return normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })()`,
  );

const waitForTextGone = async (session, text, options = {}) =>
  waitFor(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      return !normalize(document.body?.innerText || '').includes(normalize(${JSON.stringify(text)}));
    })()`,
    { ...options, label: `texto desaparecer "${text}"` },
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

const clickVisibleSelector = async (session, selector) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const element = Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return true;
      });
      if (!element) return false;
      element.scrollIntoView({ block: 'center', inline: 'center' });
      element.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error(`Nao encontrei elemento visivel para o seletor: ${selector}`);
  }
};

const clickByTextWithinText = async (session, containerText, targetText, { exact = false } = {}) => {
  const clicked = await evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const containerTarget = normalize(${JSON.stringify(containerText)});
      const buttonTarget = normalize(${JSON.stringify(targetText)});
      const containers = Array.from(document.querySelectorAll('section, article, div')).filter((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return normalize(candidate.innerText || '').includes(containerTarget);
      });
      const container = containers[0];
      if (!container) return false;
      const button = Array.from(container.querySelectorAll('button, a, [role="button"]')).find((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const text = normalize(candidate.textContent || '');
        return ${exact ? 'text === buttonTarget' : 'text.includes(buttonTarget)'};
      });
      if (!button) return false;
      button.scrollIntoView({ block: 'center', inline: 'center' });
      button.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error(`Nao encontrei "${targetText}" dentro do bloco "${containerText}".`);
  }
};

const screenshot = async (session, fileName) => {
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  await fs.writeFile(path.join(ARTIFACTS_DIR, `${fileName}.png`), Buffer.from(data, 'base64'));
};

const getBodyTextExcerpt = async (session, limit = 1400) =>
  evalInPage(
    session,
    `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}))()`,
  );

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
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let changed = false;

    const hasCloseButton = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'fechar');
      })()`,
    );

    if (hasCloseButton && await textExists(session, 'Modo interno')) {
      await clickByText(session, 'Fechar', { exact: true });
      await delay(250);
      changed = true;
    }

    const hasAgoraNao = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent || '') === 'agora nao');
      })()`,
    );

    if (hasAgoraNao) {
      await clickByText(session, 'Agora nao', { exact: true });
      await delay(250);
      changed = true;
    }

    const dismissedPrompt = await evalInPage(
      session,
      `(() => {
        const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]')).filter((candidate) => {
          const style = window.getComputedStyle(candidate);
          const rect = candidate.getBoundingClientRect();
          if (!rect.width || !rect.height) return false;
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          return true;
        });
        const match = buttons.find((button) => {
          const text = normalize(button.textContent || '');
          return text === 'agora nao' || text.includes('agora nao');
        });
        if (!match) return false;
        match.click();
        return true;
      })()`,
    );

    if (dismissedPrompt) {
      await delay(250);
      changed = true;
    }

    if (!changed) {
      break;
    }
  }
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

const openMockExamPage = async (session) => {
  await closeOptionalOverlays(session);
  await waitForText(session, 'Simulados', { timeoutMs: 30000 });
  await clickByText(session, 'Simulados', { exact: true });
  await waitForText(session, 'Simulado recomendado', { timeoutMs: 20000 });
  await waitForText(session, 'Preview da prova', { timeoutMs: 20000 });
};

const readPrimaryCta = async (session) =>
  evalInPage(
    session,
    `(() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const buttons = Array.from(document.querySelectorAll('button')).filter((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true;
      });
      const match = buttons.find((button) => normalize(button.textContent || '').startsWith('iniciar') || normalize(button.textContent || '').startsWith('comecar'));
      return match ? (match.textContent || '').replace(/\\s+/g, ' ').trim() : null;
    })()`,
  );

const getVisibleSelectOptionCount = async (session) =>
  evalInPage(
    session,
    `(() => {
      const select = Array.from(document.querySelectorAll('select')).find((candidate) => {
        const style = window.getComputedStyle(candidate);
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true;
      });
      return select ? select.options.length : 0;
    })()`,
  );

const waitForSelector = async (session, selector, options = {}) =>
  waitFor(
    session,
    `(() => Boolean(document.querySelector(${JSON.stringify(selector)})))()`,
    { ...options, label: `seletor ${selector}` },
  );

const readMockExamHistoryLength = async (session) =>
  evalInPage(
    session,
    `(() => {
      try {
        const raw = window.localStorage.getItem('mock_exam_history');
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        return 0;
      }
    })()`,
  );

const readReviewedQuestionIdsLength = async (session) =>
  evalInPage(
    session,
    `(() => {
      try {
        const raw = window.localStorage.getItem('mock_exam_reviewed_question_ids');
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        return 0;
      }
    })()`,
  );

const resetMockExamState = async (session) => {
  await evalInPage(
    session,
    `(() => {
      window.localStorage.removeItem('mock_exam_history');
      window.localStorage.removeItem('mock_exam_reviewed_question_ids');
      return true;
    })()`,
  );
};

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
      const normalize = (value) => String(value).replace(/\\s+/g, ' ').trim();
      const text = normalize(document.body?.innerText || '');
      const questionMatch = text.match(/Q(\\d+)\\/(\\d+)/);
      const answeredMatch = text.match(/(\\d+) respondidas/);
      return {
        answered: answeredMatch ? Number(answeredMatch[1]) : 0,
        current: questionMatch ? Number(questionMatch[1]) : 0,
        hasEntregar: /Entregar/.test(text),
        total: questionMatch ? Number(questionMatch[2]) : 0,
      };
    })()`,
  );

const deliverExamWithStrategy = async (session, { answerCount = Infinity } = {}) => {
  let answeredNow = 0;

  for (let attempts = 0; attempts < 140; attempts += 1) {
    const state = await readRunningExamState(session);
    if (!state?.total) {
      throw new Error('Nao consegui ler o estado do simulado em execucao.');
    }

    if (answeredNow < answerCount) {
      await clickFirstOption(session);
      answeredNow += 1;
      await delay(100);
    }

    if (state.hasEntregar) {
      await clickByText(session, 'Entregar', { exact: true });
      await waitForSelector(session, '[data-testid="mock-exam-results-ready"]', { timeoutMs: 20000 });
      return { answeredNow, total: state.total };
    }

    await clickByText(session, 'Proxima');
    await delay(100);
  }

  throw new Error('Nao consegui chegar ao resultado do simulado dentro do limite esperado.');
};

const ensureResultScreen = async (session) => {
  await waitForSelector(session, '[data-testid="mock-exam-results-ready"]', { timeoutMs: 20000 });
  await waitForText(session, 'Resultado do simulado', { timeoutMs: 20000 });
};

const countErrorItems = async (session) =>
  evalInPage(
    session,
    `(() => {
      const list = document.querySelector('[data-testid="mock-exam-results-errors-list"]');
      return list ? list.children.length : 0;
    })()`,
  );

const openFirstErrorAndMarkReviewed = async (session) => {
  const opened = await evalInPage(
    session,
    `(() => {
      const list = document.querySelector('[data-testid="mock-exam-results-errors-list"]');
      if (!list) return false;
      const firstButton = list.querySelector('button');
      if (!firstButton) return false;
      firstButton.click();
      return true;
    })()`,
  );

  if (!opened) {
    throw new Error('Nao consegui abrir o primeiro erro prioritario.');
  }

  await waitForText(session, 'Marcar como revisado', { timeoutMs: 10000 });
  await clickByText(session, 'Marcar como revisado');
  await delay(300);
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
  const supabaseUrl =
    process.env.SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || cypressEnv.SUPABASE_URL
    || envFile.SUPABASE_URL
    || envFile.VITE_SUPABASE_URL;

  if (!loginEmail || !loginPassword || !publishableKey || !supabaseUrl) {
    throw new Error('Credenciais/config E2E ausentes para o smoke de Simulados.');
  }

  const baseUrl = (process.env.MOCK_EXAM_QA_BASE_URL || 'http://127.0.0.1:5173').replace(/\/+$/, '');
  const browserSessionPayload = await createBrowserSessionPayload(
    supabaseUrl,
    publishableKey,
    loginEmail,
    loginPassword,
  );

  const remotePort = 9800 + Math.floor(Math.random() * 150);
  const browser = await launchChrome(remotePort);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    steps: [],
  };

  const recordStep = (name, status, details = {}) => {
    report.steps.push({ name, status, ...details });
  };

  try {
    try {
      await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
        source: createSeedScript(loginEmail, supabaseUrl, browserSessionPayload),
      });

      await navigate(browser.session, `${baseUrl}/`);
      await resetMockExamState(browser.session);
      await openMockExamPage(browser.session);
      recordStep('open_mock_exam', 'passed');

      await waitForText(browser.session, 'Preview da prova');
      await waitForText(browser.session, 'Impacto da sessao');
      const ctaText = await readPrimaryCta(browser.session);
      if (!ctaText) {
        throw new Error('CTA principal do simulado nao apareceu.');
      }
      recordStep('hero_and_cta', 'passed', { ctaText });

      await screenshot(browser.session, 'mock-exam-smoke-desktop');
      recordStep('desktop_capture', 'passed', {
        screenshot: 'qa-artifacts/mock-exam-smoke-desktop.png',
      });

      await setViewport(browser.session, { width: 390, height: 844, mobile: true });
      await waitForText(browser.session, 'Simulado recomendado');
      await screenshot(browser.session, 'mock-exam-smoke-mobile');
      await clearViewport(browser.session);
      recordStep('responsive_mobile', 'passed', {
        screenshot: 'qa-artifacts/mock-exam-smoke-mobile.png',
      });

      await openMockExamPage(browser.session);
      await closeOptionalOverlays(browser.session);
      await clickByText(browser.session, 'Concurso', { exact: true });
      await waitForText(browser.session, 'Concurso Rapido');
      await closeOptionalOverlays(browser.session);
      await clickByText(browser.session, 'Ambos', { exact: true });
      await waitForText(browser.session, 'Misto Rapido');
      await closeOptionalOverlays(browser.session);
      await clickByText(browser.session, 'ENEM', { exact: true });
      await waitForText(browser.session, 'ENEM Rapido');
      recordStep('track_switching', 'passed');

      await openMockExamPage(browser.session);
      await closeOptionalOverlays(browser.session);
      await clickByText(browser.session, 'ENEM Padrao');
      const updatedCta = await readPrimaryCta(browser.session);
      if (!normalize(updatedCta || '').includes('enem padrao')) {
        throw new Error(`CTA nao refletiu o modo selecionado. Texto atual: ${updatedCta || 'vazio'}`);
      }
      recordStep('mode_selection', 'passed', { ctaText: updatedCta });

      await openMockExamPage(browser.session);
      await closeOptionalOverlays(browser.session);
      await clickByTextWithinText(browser.session, 'Simulado recomendado', 'Personalizar simulado', { exact: true });
      await waitForText(browser.session, 'Modo avancado');
      await waitForText(browser.session, 'Modelo oficial');
      const optionCount = await getVisibleSelectOptionCount(browser.session);
      if (optionCount < 2) {
        throw new Error(`Dropdown de modelo oficial apareceu com poucas opcoes (${optionCount}).`);
      }
      await clickVisibleSelector(browser.session, 'select');
      const hasSeeMoreTopics = await textExists(browser.session, 'Ver mais');
      if (hasSeeMoreTopics) {
        await closeOptionalOverlays(browser.session);
        await clickByTextWithinText(browser.session, 'Modo avancado', 'Ver mais');
        await waitForText(browser.session, 'Mostrar menos topicos');
      }
      recordStep('advanced_filters', 'passed', { optionCount, hasSeeMoreTopics });

      await clickByTextWithinText(browser.session, 'Simulado recomendado', 'Ocultar personalizacao', { exact: true });
      await waitForTextGone(browser.session, 'Modo avancado');
      recordStep('advanced_filters_close', 'passed');

      await startRecommendedExam(browser.session);
      recordStep('start_exam', 'passed');

      const historyBeforeCompleted = await readMockExamHistoryLength(browser.session);
      await deliverExamWithStrategy(browser.session, { answerCount: 20 });
      await ensureResultScreen(browser.session);
      await waitForSelector(browser.session, '[data-testid="mock-exam-results-by-discipline"]', { timeoutMs: 20000 });
      await waitForSelector(browser.session, '[data-testid="mock-exam-results-review-cta"]', { timeoutMs: 20000 });
      const completedErrorCount = await countErrorItems(browser.session);
      if (completedErrorCount < 1) {
        throw new Error('Resultado concluido apareceu sem lista de erros prioritarios.');
      }
      const reviewedBefore = await readReviewedQuestionIdsLength(browser.session);
      await openFirstErrorAndMarkReviewed(browser.session);
      await waitFor(
        browser.session,
        `(() => {
          try {
            const raw = window.localStorage.getItem('mock_exam_reviewed_question_ids');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) && parsed.length > ${reviewedBefore};
          } catch {
            return false;
          }
        })()`,
        { timeoutMs: 10000, label: 'persistencia de revisao no localStorage' },
      );
      const reviewedAfter = await readReviewedQuestionIdsLength(browser.session);
      const historyAfterCompleted = await readMockExamHistoryLength(browser.session);
      if (reviewedAfter <= reviewedBefore) {
        throw new Error('Marcar como revisado nao persistiu no armazenamento local.');
      }
      if (historyAfterCompleted !== historyBeforeCompleted + 1) {
        throw new Error(`Fluxo concluido nao gravou historico corretamente. Antes=${historyBeforeCompleted}, depois=${historyAfterCompleted}`);
      }
      recordStep('completed_result_flow', 'passed', {
        errorItems: completedErrorCount,
        historyAfterCompleted,
      });

      await clickByText(browser.session, 'Refazer simulado');
      await waitForText(browser.session, 'respondidas', { timeoutMs: 20000 });
      await waitForText(browser.session, 'Q1/', { timeoutMs: 20000 });
      await waitForText(browser.session, '0 respondidas', { timeoutMs: 20000 });
      recordStep('retry_flow', 'passed');

      await deliverExamWithStrategy(browser.session, { answerCount: 20 });
      await ensureResultScreen(browser.session);
      await clickByText(browser.session, 'Novo simulado');
      await waitForText(browser.session, 'Simulado recomendado', { timeoutMs: 20000 });
      await waitForText(browser.session, 'Preview da prova', { timeoutMs: 20000 });
      recordStep('new_exam_flow', 'passed');

      await startRecommendedExam(browser.session);
      const historyBeforeIncomplete = await readMockExamHistoryLength(browser.session);
      await deliverExamWithStrategy(browser.session, { answerCount: 2 });
      await ensureResultScreen(browser.session);
      await waitForText(browser.session, 'Continuar simulado', { timeoutMs: 20000 });
      const historyAfterIncomplete = await readMockExamHistoryLength(browser.session);
      if (historyAfterIncomplete !== historyBeforeIncomplete) {
        throw new Error(`Entrega incompleta gravou historico antes da hora. Antes=${historyBeforeIncomplete}, depois=${historyAfterIncomplete}`);
      }
      await clickByText(browser.session, 'Continuar simulado');
      await waitForText(browser.session, 'respondidas', { timeoutMs: 20000 });
      await waitForText(browser.session, '2 respondidas', { timeoutMs: 20000 });
      recordStep('incomplete_continue_flow', 'passed', {
        historyAfterIncomplete,
      });

      report.summary = {
        passed: report.steps.filter((step) => step.status === 'passed').length,
        failed: 0,
      };

      await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
      console.log(JSON.stringify(report, null, 2));
    } catch (error) {
      report.debug = {
        excerpt: await getBodyTextExcerpt(browser.session).catch(() => ''),
      };
      await screenshot(browser.session, 'mock-exam-smoke-failure').catch(() => undefined);
      report.failureScreenshot = 'qa-artifacts/mock-exam-smoke-failure.png';
      await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
      throw error;
    }
  } finally {
    await browser.close();
  }
};

main().catch(async (error) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: error.message,
  };
  await ensureArtifactsDir();
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  console.error(error);
  process.exit(1);
});
