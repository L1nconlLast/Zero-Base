import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'global-ranking-smoke-report.json');

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
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-ranking-smoke-'));
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
        window.localStorage.setItem(${JSON.stringify(`profileDisplayName_${normalizedEmail}`)}, 'QA Ranking');
        window.localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(browserSessionPayload))});
        window.localStorage.setItem('zb_internal_access', 'true');
        window.localStorage.setItem('zb_phase_override', ${JSON.stringify(JSON.stringify('intermediate'))});
      } catch (error) {
        console.error('ranking-smoke-seed-failed', error);
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

const clickByText = async (session, text, { tagName = null, exact = false } = {}) => {
  const expression = `
    (() => {
      const normalize = (value) => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const target = normalize(${JSON.stringify(text)});
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(tagName ? tagName : 'button, a, [role="button"]')}));
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

const screenshot = async (session, fileName) => {
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  await fs.writeFile(path.join(ARTIFACTS_DIR, `${fileName}.png`), Buffer.from(data, 'base64'));
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

const getBodyTextExcerpt = async (session, limit = 1200) =>
  evalInPage(
    session,
    `(() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, ${limit}))()`,
  );

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

const openRankingPage = async (session) => {
  await closeOptionalOverlays(session);
  await waitForText(session, 'Grupos', { timeoutMs: 30000 });
  await clickByText(session, 'Grupos', { exact: true });
  await waitForText(session, 'Ranking Global', { timeoutMs: 15000 });
  await clickByText(session, 'Ranking Global', { exact: true });
  await waitForText(session, 'Ranking Global por Categoria', { timeoutMs: 20000 });
};

const detectRankingState = async (session) => {
  const hasEmptyPremium = await textExists(session, 'Ranking aguardando dados reais');
  if (hasEmptyPremium) {
    return 'empty';
  }

  const hasSummary = await textExists(session, 'Lider atual');
  if (hasSummary) {
    return 'data';
  }

  const hasInlineEmpty = await textExists(session, 'Categoria sem pontuacao ainda');
  if (hasInlineEmpty) {
    return 'category-empty';
  }

  return 'unknown';
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
    throw new Error('Credenciais/config E2E ausentes para o smoke do Ranking Global.');
  }

  const baseUrl = (process.env.RANKING_QA_BASE_URL || 'https://zero-base-three.vercel.app').replace(/\/+$/, '');
  const browserSessionPayload = await createBrowserSessionPayload(
    supabaseUrl,
    publishableKey,
    loginEmail,
    loginPassword,
  );

  const remotePort = 9500 + Math.floor(Math.random() * 300);
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
    await browser.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: createSeedScript(loginEmail, supabaseUrl, browserSessionPayload),
    });

    await navigate(browser.session, `${baseUrl}/`);
    await openRankingPage(browser.session);
    recordStep('open_ranking_global', 'passed');

    const state = await detectRankingState(browser.session);
    report.state = state;

    if (state === 'empty') {
      await waitForText(browser.session, 'O ranking global ainda nao foi formado.');
      await waitForText(browser.session, 'Atualizar ranking');
      await waitForText(browser.session, 'Ocultar preview');
      await waitForText(browser.session, 'Como o ranking vai aparecer com dados');
      recordStep('empty_state_premium', 'passed');

      await clickByText(browser.session, 'Ocultar preview', { exact: true });
      await waitForText(browser.session, 'Ver preview visual');
      const previewHidden = !(await textExists(browser.session, 'Como o ranking vai aparecer com dados'));
      if (!previewHidden) {
        throw new Error('O preview visual nao foi ocultado pelo CTA.');
      }
      recordStep('preview_toggle_hide', 'passed');

      await clickByText(browser.session, 'Ver preview visual', { exact: true });
      await waitForText(browser.session, 'Como o ranking vai aparecer com dados');
      await waitForText(browser.session, 'Ana Clara');
      await waitForText(browser.session, 'Lucas Melo');
      recordStep('preview_toggle_show', 'passed');
    } else if (state === 'data') {
      await waitForText(browser.session, 'Lider atual');
      await waitForText(browser.session, 'Media de acerto');
      const hasFallbackAvatar = await evalInPage(
        browser.session,
        '(() => Boolean(document.querySelector(".user-avatar--fallback")))()',
      );
      recordStep('real_data_summary', 'passed', { hasFallbackAvatar });
    } else if (state === 'category-empty') {
      await waitForText(browser.session, 'Categoria sem pontuacao ainda');
      await waitForText(browser.session, 'Atualizar categoria');
      recordStep('category_empty_state', 'passed');
    } else {
      throw new Error('Nao foi possivel determinar o estado do Ranking Global.');
    }

    await screenshot(browser.session, 'global-ranking-smoke-desktop');
    recordStep('desktop_capture', 'passed', {
      screenshot: 'qa-artifacts/global-ranking-smoke-desktop.png',
    });

    await setViewport(browser.session, { width: 390, height: 844, mobile: true });
    await waitForText(browser.session, 'Ranking Global por Categoria');
    await screenshot(browser.session, 'global-ranking-smoke-mobile');
    await clearViewport(browser.session);
    recordStep('responsive_mobile', 'passed', {
      screenshot: 'qa-artifacts/global-ranking-smoke-mobile.png',
    });

    report.summary = {
      passed: report.steps.filter((step) => step.status === 'passed').length,
      failed: 0,
    };

    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
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
