import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'qa-artifacts');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'local-shell-runtime-report.json');
const TARGET_URL = process.env.LOCAL_SHELL_BASE_URL || 'http://127.0.0.1:3100';

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

  on(method, listener) {
    const listeners = this.events.get(method) || [];
    listeners.push(listener);
    this.events.set(method, listeners);
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

const ensureArtifactsDir = async () => {
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
};

const findChromePath = async () => {
  for (const candidate of chromeCandidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error('Nenhum Chrome/Edge encontrado para o diagnostico headless.');
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
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-base-local-shell-'));
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
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Log.enable');
  await session.send('Network.enable');

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
        // ignore locked files on Windows
      }
    },
  };
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

const screenshot = async (session, fileName) => {
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });

  await fs.writeFile(path.join(ARTIFACTS_DIR, fileName), Buffer.from(data, 'base64'));
};

const main = async () => {
  await ensureArtifactsDir();

  const report = {
    generatedAt: new Date().toISOString(),
    targetUrl: TARGET_URL,
    console: [],
    exceptions: [],
    requests: [],
    failedRequests: [],
    dom: {},
  };

  const requestsById = new Map();
  const remotePort = 10150 + Math.floor(Math.random() * 100);
  const browser = await launchChrome(remotePort);

  browser.session.on('Runtime.consoleAPICalled', (params) => {
    report.console.push({
      type: params.type,
      args: (params.args || []).map((arg) => arg.value ?? arg.description ?? null),
    });
  });

  browser.session.on('Runtime.exceptionThrown', (params) => {
    report.exceptions.push({
      text: params.exceptionDetails?.text || null,
      url: params.exceptionDetails?.url || null,
      lineNumber: params.exceptionDetails?.lineNumber ?? null,
      columnNumber: params.exceptionDetails?.columnNumber ?? null,
      exception: params.exceptionDetails?.exception?.description || null,
    });
  });

  browser.session.on('Log.entryAdded', (params) => {
    report.console.push({
      type: `log:${params.entry?.level || 'unknown'}`,
      source: params.entry?.source || null,
      text: params.entry?.text || null,
    });
  });

  browser.session.on('Network.requestWillBeSent', (params) => {
    requestsById.set(params.requestId, params.request?.url || '');
  });

  browser.session.on('Network.loadingFailed', (params) => {
    report.failedRequests.push({
      url: requestsById.get(params.requestId) || null,
      errorText: params.errorText,
      canceled: params.canceled,
      type: params.type,
    });
  });

  try {
    await browser.session.send('Page.navigate', { url: TARGET_URL });
    await waitFor(browser.session, 'document.readyState === "complete"', {
      timeoutMs: 45000,
      label: 'load complete',
    });

    await delay(5000);

    report.dom = await evalInPage(
      browser.session,
      `(() => ({
        title: document.title,
        readyState: document.readyState,
        bodyText: (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 1500),
        rootHtmlLength: document.getElementById('root')?.innerHTML.length || 0,
        rootChildren: document.getElementById('root')?.childElementCount || 0,
        location: window.location.href,
      }))()`,
    );

    await screenshot(browser.session, 'local-shell-runtime.png');
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    report.dom = await evalInPage(
      browser.session,
      `(() => ({
        title: document.title,
        readyState: document.readyState,
        bodyText: (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 1500),
        rootHtmlLength: document.getElementById('root')?.innerHTML.length || 0,
        rootChildren: document.getElementById('root')?.childElementCount || 0,
        location: window.location.href,
      }))()`,
    ).catch(() => report.dom);

    await screenshot(browser.session, 'local-shell-runtime-failure.png').catch(() => undefined);
    throw error;
  } finally {
    report.requests = Array.from(requestsById.values());
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    await browser.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
